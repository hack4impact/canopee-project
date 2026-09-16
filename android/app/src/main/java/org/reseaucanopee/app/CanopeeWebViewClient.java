package org.reseaucanopee.app;

import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;

class CanopeeWebViewClient extends BridgeWebViewClient {

    private static final String ASSET_DIR = "public";

    private final Bridge bridge;
    private final Uri errorUri;

    CanopeeWebViewClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;

        String errorUrl = bridge.getErrorUrl();
        this.errorUri = errorUrl != null ? Uri.parse(errorUrl) : null;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        if (request.isForMainFrame() && isErrorPage(request.getUrl())) {
            view.loadUrl(bridge.getAppUrl());
            return true;
        }

        return super.shouldOverrideUrlLoading(view, request);
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        WebResourceResponse asset = errorPageAsset(request.getUrl());

        return asset != null ? asset : super.shouldInterceptRequest(view, request);
    }

    private boolean isSameOrigin(Uri uri) {
        return (
            errorUri != null &&
            errorUri.getScheme().equals(uri.getScheme()) &&
            errorUri.getAuthority().equals(uri.getAuthority())
        );
    }

    private boolean isErrorPage(Uri uri) {
        return isSameOrigin(uri) && errorUri.getPath().equals(uri.getPath());
    }

    private WebResourceResponse errorPageAsset(Uri uri) {
        if (!isSameOrigin(uri) || isErrorPage(uri) || uri.getPath() == null) {
            return null;
        }

        try {
            InputStream stream = bridge.getContext().getAssets().open(ASSET_DIR + uri.getPath());
            return new WebResourceResponse(mimeType(uri.getPath()), null, stream);
        } catch (IOException e) {
            return null;
        }
    }

    private String mimeType(String path) {
        if (path.endsWith(".woff2")) {
            return "font/woff2";
        }
        if (path.endsWith(".otf")) {
            return "font/otf";
        }

        String mimeType = URLConnection.guessContentTypeFromName(path);

        return mimeType != null ? mimeType : "application/octet-stream";
    }
}
