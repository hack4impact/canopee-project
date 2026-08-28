import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

extension Color {
    static let canopeeForest = Color(red: 0.0, green: 0.271, blue: 0.137)
    static let canopeeGreen = Color(red: 0.090, green: 0.667, blue: 0.333)
    static let canopeeCream = Color(red: 0.965, green: 0.957, blue: 0.874)
    static let canopeeLime = Color(red: 0.780, green: 0.871, blue: 0.208)
}

struct PatrolElapsed: View {
    let startedAt: Date
    let paused: Bool
    let elapsedSeconds: Int
    var font: Font = .system(size: 30, weight: .semibold, design: .rounded)

    var body: some View {
        Group {
            if paused {
                Text(PatrolActivityBridge.formattedElapsed(elapsedSeconds))
            } else {
                Text(startedAt, style: .timer)
            }
        }
        .font(font)
        .monospacedDigit()
        .foregroundStyle(Color.canopeeCream)
    }
}

struct PatrolLockScreenView: View {
    let context: ActivityViewContext<PatrolAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .center, spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.canopeeGreen.opacity(context.state.paused ? 0.25 : 1))
                        .frame(width: 38, height: 38)
                    Image(systemName: context.state.paused ? "pause.fill" : "figure.walk")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(context.state.paused ? Color.canopeeCream : .white)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.paused ? "Patrouille en pause" : "Patrouille en cours")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.canopeeCream.opacity(0.7))

                    PatrolElapsed(
                        startedAt: context.attributes.startedAt,
                        paused: context.state.paused,
                        elapsedSeconds: context.state.elapsedSeconds
                    )
                }

                Spacer(minLength: 8)

                VStack(alignment: .trailing, spacing: 2) {
                    Text("Distance")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Color.canopeeCream.opacity(0.55))
                    Text(PatrolActivityBridge.formattedDistance(context.state.distanceMetres))
                        .font(.system(size: 17, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(Color.canopeeCream)
                }
            }

            if #available(iOS 17.0, *) {
                PatrolControlsView(paused: context.state.paused)
            }
        }
        .padding(16)
        .activityBackgroundTint(Color.canopeeForest)
        .activitySystemActionForegroundColor(Color.canopeeCream)
    }
}

@available(iOS 17.0, *)
struct PatrolControlsView: View {
    let paused: Bool

    var body: some View {
        HStack(spacing: 8) {
            Button(intent: TogglePatrolIntent()) {
                Label(
                    paused ? "Reprendre" : "Pause",
                    systemImage: paused ? "play.fill" : "pause.fill"
                )
                .font(.system(size: 13, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
            }
            .tint(Color.canopeeCream.opacity(0.15))
            .foregroundStyle(Color.canopeeCream)

            Link(destination: URL(string: "canopee://signaler")!) {
                Label("Signaler", systemImage: "exclamationmark.bubble.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .background(Color.canopeeLime.opacity(0.2), in: Capsule())
                    .foregroundStyle(Color.canopeeLime)
            }

            Button(intent: StopPatrolIntent()) {
                Label("Terminer", systemImage: "stop.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
            }
            .tint(Color.canopeeGreen)
            .foregroundStyle(.white)
        }
        .buttonStyle(.borderedProminent)
        .buttonBorderShape(.capsule)
    }
}

struct PatrolActivityLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PatrolAttributes.self) { context in
            PatrolLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        Text(PatrolActivityBridge.formattedDistance(context.state.distanceMetres))
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                    } icon: {
                        Image(systemName: "figure.walk")
                            .foregroundStyle(Color.canopeeGreen)
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    PatrolElapsed(
                        startedAt: context.attributes.startedAt,
                        paused: context.state.paused,
                        elapsedSeconds: context.state.elapsedSeconds,
                        font: .system(size: 15, weight: .semibold, design: .rounded)
                    )
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    if #available(iOS 17.0, *) {
                        PatrolControlsView(paused: context.state.paused)
                            .padding(.top, 4)
                    } else {
                        Text(context.state.paused ? "Patrouille en pause" : "Patrouille en cours")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Color.canopeeCream.opacity(0.7))
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.paused ? "pause.fill" : "figure.walk")
                    .foregroundStyle(Color.canopeeGreen)
            } compactTrailing: {
                PatrolElapsed(
                    startedAt: context.attributes.startedAt,
                    paused: context.state.paused,
                    elapsedSeconds: context.state.elapsedSeconds,
                    font: .system(size: 13, weight: .semibold, design: .rounded)
                )
                .frame(maxWidth: 52)
            } minimal: {
                Image(systemName: context.state.paused ? "pause.fill" : "figure.walk")
                    .foregroundStyle(Color.canopeeGreen)
            }
            .widgetURL(URL(string: "canopee://"))
            .keylineTint(Color.canopeeGreen)
        }
    }
}
