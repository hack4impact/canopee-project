package com.capgo.capacitor_background_geolocation;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;

/**
 * Drops the fixes nobody walked to.
 *
 * GPS wanders while a patroller stands still and every wandered metre lands in
 * the patrol total. The step counter is the second opinion. If it has not moved
 * between two fixes then the phone did not go anywhere, so the fix is drift.
 *
 * Only small moves are ever dropped. A jump longer than drift explains is let
 * through untouched, so a refused activity permission or a phone with no step
 * sensor can never eat a real walk.
 */
class PatrolStepFilter implements SensorEventListener {

    /**
     * A move no longer than this, with no steps behind it, is drift. Anything
     * longer is past what standing still produces, and dropping it on a sensor
     * that might merely be lagging would cost a real walk. Matches the accuracy
     * ceiling the recorder already applies to a single fix.
     */
    static final float DRIFT_CEILING_METRES = 50f;

    /** Stands for "the sensor has told us nothing yet". */
    private static final float NO_READING = -1f;

    private final SensorManager sensors;

    private Sensor stepCounter;
    private boolean listening;

    /** The last fix let through, and the counter reading when it was. */
    private Location lastAccepted;

    private float stepsAtLastAccepted = NO_READING;

    /** Written on the sensor thread, read on the location thread. */
    private volatile float latestSteps = NO_READING;

    PatrolStepFilter(Context context) {
        sensors = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
    }

    /**
     * Begins a new patrol. The first fix of one is always kept.
     *
     * The watchdog restarts location updates mid patrol, so this runs more than
     * once per walk. Only a real registration clears the live reading. The step
     * counter reports on change, so a patroller standing still sends nothing,
     * and throwing the reading away on every restart would leave the filter
     * blind exactly when it is supposed to be working.
     */
    void start() {
        lastAccepted = null;
        stepsAtLastAccepted = NO_READING;

        if (listening) {
            return;
        }

        latestSteps = NO_READING;
        attach();
    }

    /**
     * Tries to pick the step counter up.
     *
     * The activity permission is asked for while the first patrol is already
     * starting, and Android hides the sensor until it is granted, so the
     * counter can turn up some way into a walk. Every fix asks again until it
     * does, and a phone that simply has no such sensor keeps answering no.
     */
    private void attach() {
        if (listening || sensors == null) {
            return;
        }

        if (stepCounter == null) {
            stepCounter = sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        }

        if (stepCounter == null) {
            return;
        }

        listening = sensors.registerListener(this, stepCounter, SensorManager.SENSOR_DELAY_NORMAL);
    }

    void stop() {
        if (listening && sensors != null) {
            sensors.unregisterListener(this);
        }

        listening = false;
        stepCounter = null;
        lastAccepted = null;
        stepsAtLastAccepted = NO_READING;
        latestSteps = NO_READING;
    }

    /** True for the fixes worth keeping. */
    boolean admit(Location location) {
        attach();

        float steps = latestSteps;
        Location previous = lastAccepted;

        // Nothing to compare against, no reading to compare with, or a move too
        // long to be drift. Let it through untouched.
        if (
            previous == null ||
            steps == NO_READING ||
            stepsAtLastAccepted == NO_READING ||
            location.distanceTo(previous) > DRIFT_CEILING_METRES
        ) {
            return accept(location, steps);
        }

        // The counter is cumulative since boot, so it only stays put when
        // nobody walked. A reboot mid patrol makes it drop instead, which
        // counts as movement and is let through.
        if (steps != stepsAtLastAccepted) {
            return accept(location, steps);
        }

        // Dropped. The last accepted fix stays put so the next window still
        // covers every step taken since it.
        return false;
    }

    private boolean accept(Location location, float steps) {
        lastAccepted = location;
        stepsAtLastAccepted = steps;
        return true;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_STEP_COUNTER && event.values.length > 0) {
            latestSteps = event.values[0];
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}
}
