import Capacitor
import UIKit

class MainViewController: CAPBridgeViewController, UIScrollViewDelegate {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PatrolActivityPlugin())
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        lockZoom()
    }

    func viewForZooming(in scrollView: UIScrollView) -> UIView? {
        return nil
    }

    func scrollViewWillBeginZooming(_ scrollView: UIScrollView, with view: UIView?) {
        scrollView.pinchGestureRecognizer?.isEnabled = false
    }

    func scrollViewDidZoom(_ scrollView: UIScrollView) {
        resetZoom(scrollView)
    }

    private func lockZoom() {
        guard let scrollView = webView?.scrollView else {
            return
        }

        if scrollView.delegate !== self {
            scrollView.delegate = self
        }

        scrollView.pinchGestureRecognizer?.isEnabled = false
        scrollView.bouncesZoom = false
        scrollView.minimumZoomScale = 1
        scrollView.maximumZoomScale = 1
        resetZoom(scrollView)
    }

    private func resetZoom(_ scrollView: UIScrollView) {
        if scrollView.zoomScale != 1 {
            scrollView.setZoomScale(1, animated: false)
        }
    }
}
