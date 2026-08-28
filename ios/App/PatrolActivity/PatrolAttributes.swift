import ActivityKit
import CoreFoundation
import Foundation

public struct PatrolAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var distanceMetres: Int
        public var paused: Bool
        public var elapsedSeconds: Int
        public var route: [Double]
        /// Stamped every time the app pushes new numbers. The lock screen
        /// sweeps a bar from here so the card visibly moves on its own
        /// between updates.
        public var refreshedAt: Date

        public init(
            distanceMetres: Int,
            paused: Bool,
            elapsedSeconds: Int,
            route: [Double] = [],
            refreshedAt: Date = Date()
        ) {
            self.distanceMetres = distanceMetres
            self.paused = paused
            self.elapsedSeconds = elapsedSeconds
            self.route = route
            self.refreshedAt = refreshedAt
        }
    }

    public var startedAt: Date

    public init(startedAt: Date) {
        self.startedAt = startedAt
    }
}

public enum PatrolActivityBridge {
    public static let appGroup = "group.org.reseaucanopee.org"
    public static let commandKey = "patrol.command"
    public static let commandAtKey = "patrol.commandAt"
    public static let darwinNotification = "org.reseaucanopee.app.patrol.command"

    public static func write(_ command: String) {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }

        defaults.set(command, forKey: commandKey)
        defaults.set(Date().timeIntervalSince1970, forKey: commandAtKey)

        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName(darwinNotification as CFString),
            nil,
            nil,
            true
        )
    }

    public static func takeCommand() -> String? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let command = defaults.string(forKey: commandKey) else {
            return nil
        }

        defaults.removeObject(forKey: commandKey)
        defaults.removeObject(forKey: commandAtKey)

        return command
    }

    public static func formattedDistance(_ metres: Int) -> String {
        if metres < 1000 {
            return "\(metres) m"
        }

        return String(format: "%.2f km", Double(metres) / 1000)
            .replacingOccurrences(of: ".", with: ",")
    }

    public static func formattedElapsed(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        }

        return String(format: "%02d:%02d", minutes, secs)
    }
}
