package org.reseaucanopee.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.capgo.capacitor_background_geolocation.BackgroundGeolocationService;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PatrolActivity")
public class PatrolActivityPlugin extends Plugin {

    static final String ACTION_TOGGLE = "toggle";
    static final String ACTION_STOP = "stop";

    private static final String PREFS = "patrol-activity";
    private static final String KEY_PENDING = "pendingCommand";

    private static PatrolActivityPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @Override
    protected void handleOnResume() {
        deliverPendingCommand();
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) {
            instance = null;
        }
    }

    static void enqueue(Context context, String action) {
        prefs(context).edit().putString(KEY_PENDING, action).apply();

        if (instance != null) {
            instance.deliverPendingCommand();
        }
    }

    private void deliverPendingCommand() {
        SharedPreferences prefs = prefs(getContext());
        String action = prefs.getString(KEY_PENDING, null);

        if (action == null) {
            return;
        }

        prefs.edit().remove(KEY_PENDING).apply();

        JSObject data = new JSObject();
        data.put("action", action);
        notifyListeners("command", data, true);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Context context = getContext();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && launch(notificationSettings(context))) {
            call.resolve();
            return;
        }

        launch(appDetails(context));
        call.resolve();
    }

    private boolean launch(Intent intent) {
        try {
            getContext().startActivity(intent);
            return true;
        } catch (Exception exception) {
            return false;
        }
    }

    private Intent notificationSettings(Context context) {
        return new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName())
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    }

    private Intent appDetails(Context context) {
        return new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .setData(Uri.fromParts("package", context.getPackageName(), null))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    }

    @PluginMethod
    public void start(PluginCall call) {
        BackgroundGeolocationService.setPatrolPaused(getContext(), call.getBoolean("paused", false));

        JSObject result = new JSObject();
        result.put("started", true);
        call.resolve(result);
    }

    @PluginMethod
    public void update(PluginCall call) {
        BackgroundGeolocationService.setPatrolPaused(getContext(), call.getBoolean("paused", false));
        call.resolve();
    }

    @PluginMethod
    public void end(PluginCall call) {
        BackgroundGeolocationService.setPatrolPaused(getContext(), false);
        call.resolve();
    }
}
