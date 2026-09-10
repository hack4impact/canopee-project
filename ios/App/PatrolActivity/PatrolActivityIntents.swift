import AppIntents

@available(iOS 17.0, *)
struct TogglePatrolIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Mettre la patrouille en pause ou la reprendre"
    static var isDiscoverable: Bool = false

    func perform() async throws -> some IntentResult {
        PatrolActivityBridge.write("toggle")
        return .result()
    }
}

@available(iOS 17.0, *)
struct StopPatrolIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Terminer la patrouille"
    static var isDiscoverable: Bool = false

    func perform() async throws -> some IntentResult {
        PatrolActivityBridge.write("stop")
        return .result()
    }
}
