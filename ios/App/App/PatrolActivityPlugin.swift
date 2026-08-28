import ActivityKit
import Capacitor
import Foundation

@objc(PatrolActivityPlugin)
public class PatrolActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PatrolActivityPlugin"
    public let jsName = "PatrolActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    override public func load() {
        CFNotificationCenterAddObserver(
            CFNotificationCenterGetDarwinNotifyCenter(),
            Unmanaged.passUnretained(self).toOpaque(),
            { _, observer, _, _, _ in
                guard let observer else { return }

                let plugin = Unmanaged<PatrolActivityPlugin>
                    .fromOpaque(observer)
                    .takeUnretainedValue()

                plugin.deliverPendingCommand()
            },
            PatrolActivityBridge.darwinNotification as CFString,
            nil,
            .deliverImmediately
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(deliverPendingCommand),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }

    @objc func deliverPendingCommand() {
        guard let command = PatrolActivityBridge.takeCommand() else { return }

        notifyListeners("command", data: ["action": command])
    }

    @objc func isSupported(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            return call.resolve(["supported": false])
        }

        call.resolve(["supported": ActivityAuthorizationInfo().areActivitiesEnabled])
    }

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            return call.resolve(["started": false])
        }

        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            return call.resolve(["started": false])
        }

        endAll()

        let startedMs = call.getDouble("startedAt") ?? Date().timeIntervalSince1970 * 1000
        let attributes = PatrolAttributes(startedAt: Date(timeIntervalSince1970: startedMs / 1000))
        let state = PatrolAttributes.ContentState(
            distanceMetres: call.getInt("distanceMetres") ?? 0,
            paused: call.getBool("paused") ?? false,
            elapsedSeconds: call.getInt("elapsedSeconds") ?? 0
        )

        do {
            _ = try Activity.request(
                attributes: attributes,
                content: ActivityContent(state: state, staleDate: nil)
            )
            call.resolve(["started": true])
        } catch {
            call.resolve(["started": false, "error": error.localizedDescription])
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            return call.resolve()
        }

        let state = PatrolAttributes.ContentState(
            distanceMetres: call.getInt("distanceMetres") ?? 0,
            paused: call.getBool("paused") ?? false,
            elapsedSeconds: call.getInt("elapsedSeconds") ?? 0
        )

        Task {
            for activity in Activity<PatrolAttributes>.activities {
                await activity.update(ActivityContent(state: state, staleDate: nil))
            }
            call.resolve()
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            return call.resolve()
        }

        Task {
            await endAllAsync()
            call.resolve()
        }
    }

    private func endAll() {
        guard #available(iOS 16.2, *) else { return }

        Task { await endAllAsync() }
    }

    @available(iOS 16.2, *)
    private func endAllAsync() async {
        for activity in Activity<PatrolAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}
