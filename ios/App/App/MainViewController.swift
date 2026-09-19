import Capacitor
import UIKit

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PatrolActivityPlugin())
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        guard let scrollView = webView?.scrollView else {
            return
        }

        scrollView.pinchGestureRecognizer?.isEnabled = false
        scrollView.bouncesZoom = false

        if scrollView.zoomScale != 1 {
            scrollView.setZoomScale(1, animated: false)
        }
    }
}
