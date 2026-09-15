package org.reseaucanopee.app;

import android.net.Uri;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.Arrays;
import java.util.List;

// Extends rather than replaces Capacitor's client so geolocation prompts, console
// forwarding and JS dialogs keep working; only the image picker is taken over.
class CanopeeWebChromeClient extends BridgeWebChromeClient {

    private final PhotoChooser photoChooser;

    CanopeeWebChromeClient(Bridge bridge, PhotoChooser photoChooser) {
        super(bridge);
        this.photoChooser = photoChooser;
    }

    @Override
    public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams params) {
        List<String> acceptTypes = Arrays.asList(params.getAcceptTypes());

        // An explicit capture attribute still means "camera now", which Capacitor
        // already does correctly. Only the plain image input gets the joint sheet.
        boolean combinable =
            acceptTypes.contains("image/*") &&
            !params.isCaptureEnabled() &&
            params.getMode() != FileChooserParams.MODE_OPEN_MULTIPLE;

        if (combinable && photoChooser.show(filePathCallback, params)) {
            return true;
        }

        return super.onShowFileChooser(webView, filePathCallback, params);
    }
}
