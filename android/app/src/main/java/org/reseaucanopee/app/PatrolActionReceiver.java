package org.reseaucanopee.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// Receives the taps on the patrol notification's two buttons. It only records
// the command, see PatrolActivityPlugin for why the work itself belongs to the
// JavaScript layer.
public class PatrolActionReceiver extends BroadcastReceiver {

    static final String TOGGLE = "org.reseaucanopee.app.PATROL_TOGGLE";
    static final String STOP = "org.reseaucanopee.app.PATROL_STOP";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        if (TOGGLE.equals(action)) {
            PatrolActivityPlugin.enqueue(context, PatrolActivityPlugin.ACTION_TOGGLE);
        } else if (STOP.equals(action)) {
            PatrolActivityPlugin.enqueue(context, PatrolActivityPlugin.ACTION_STOP);
        }
    }
}
