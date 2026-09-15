package org.reseaucanopee.app;

import android.net.Uri;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.Arrays;
import java.util.List;

class CanopeeWebChromeClient extends BridgeWebChromeClient {

    private final PhotoChooser photoChooser;

    CanopeeWebChromeClient(Bridge bridge, PhotoChooser photoChooser) {
        super(bridge);
        this.photoChooser = photoChooser;
    }

    @Override
    public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams params) {
        List<String> acceptTypes = Arrays.asList(params.getAcceptTypes());

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
