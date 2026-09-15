package org.reseaucanopee.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Built with the activity: an ActivityResultLauncher has to be registered
    // before the activity reaches STARTED.
    private final PhotoChooser photoChooser = new PhotoChooser(this);

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PatrolActivityPlugin.class);
        super.onCreate(savedInstanceState);

        getBridge().getWebView().setWebChromeClient(new CanopeeWebChromeClient(getBridge(), photoChooser));
    }
}
