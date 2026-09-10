package org.reseaucanopee.app;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.core.app.NotificationManagerCompat;
import com.capgo.capacitor_background_geolocation.BackgroundGeolocationService;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Android half of the PatrolActivity contract that iOS implements with a Live
// Activity. The notification's buttons cannot end a patrol on their own: ending
// has to flush the queue first, and that queue lives in the WebView. So a button
// only records which command was pressed and the JavaScript layer runs it, the
// same way the iOS intents hand back to the app.
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

    // Survives process death: a button pressed while the app is gone still runs
    // once the WebView is back, rather than being silently dropped.
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
