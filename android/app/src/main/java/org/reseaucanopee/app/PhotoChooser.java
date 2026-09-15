package org.reseaucanopee.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import androidx.activity.ComponentActivity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.FileProvider;
import java.io.File;
import java.util.ArrayList;
import java.util.List;

// Android's WebView ships no file picker of its own: it hands onShowFileChooser
// to the app and the app builds the UI. Capacitor's is either/or, so an image
// input reaches the gallery or the camera but never both. This offers the two
// in one sheet, the way WKWebView already does on iOS.
class PhotoChooser {

    private final ComponentActivity activity;
    private final ActivityResultLauncher<Intent> launcher;

    private ValueCallback<Uri[]> pendingCallback;
    private Uri pendingCaptureUri;

    PhotoChooser(ComponentActivity activity) {
        this.activity = activity;
        this.launcher = activity.registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> deliver(result.getResultCode(), result.getData())
        );
    }

    boolean show(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        Uri captureUri = createCaptureUri();
        List<Intent> captureIntents = new ArrayList<>();

        if (captureUri != null) {
            Intent capture = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);

            if (capture.resolveActivity(activity.getPackageManager()) != null) {
                capture.putExtra(MediaStore.EXTRA_OUTPUT, captureUri);
                capture.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                captureIntents.add(capture);
            } else {
                captureUri = null;
            }
        }

        // Nothing to add, so let Capacitor's plain picker handle it.
        if (captureIntents.isEmpty()) {
            return false;
        }

        Intent chooser = Intent.createChooser(params.createIntent(), "Ajouter une photo");
        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, captureIntents.toArray(new Intent[0]));

        pendingCallback = callback;
        pendingCaptureUri = captureUri;

        try {
            launcher.launch(chooser);
        } catch (Exception exception) {
            pendingCallback = null;
            pendingCaptureUri = null;
            return false;
        }

        return true;
    }

    private void deliver(int resultCode, Intent data) {
        ValueCallback<Uri[]> callback = pendingCallback;
        Uri captureUri = pendingCaptureUri;

        pendingCallback = null;
        pendingCaptureUri = null;

        if (callback == null) {
            return;
        }

        callback.onReceiveValue(resultCode == Activity.RESULT_OK ? resolve(data, captureUri) : null);
    }

    private Uri[] resolve(Intent data, Uri captureUri) {
        // A camera app returns no data: the photo went to the URI we handed it.
        if (data == null || (data.getData() == null && data.getClipData() == null)) {
            return captureUri == null ? null : new Uri[] { captureUri };
        }

        ClipData clip = data.getClipData();

        if (clip != null) {
            Uri[] uris = new Uri[clip.getItemCount()];

            for (int index = 0; index < clip.getItemCount(); index++) {
                uris[index] = clip.getItemAt(index).getUri();
            }

            return uris;
        }

        return new Uri[] { data.getData() };
    }

    private Uri createCaptureUri() {
        try {
            File directory = new File(activity.getCacheDir(), "capture");
            directory.mkdirs();

            File file = File.createTempFile("photo-", ".jpg", directory);

            return FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", file);
        } catch (Exception exception) {
            return null;
        }
    }
}
