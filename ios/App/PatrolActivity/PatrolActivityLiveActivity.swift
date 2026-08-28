import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

extension Color {
    static let canopeeForest = Color(red: 0.0, green: 0.271, blue: 0.137)
    static let canopeeGreen = Color(red: 0.090, green: 0.667, blue: 0.333)
    static let canopeeCream = Color(red: 0.965, green: 0.957, blue: 0.874)
    static let canopeeLime = Color(red: 0.780, green: 0.871, blue: 0.208)
    static let canopeeCoral = Color(red: 0.941, green: 0.376, blue: 0.325)
    static let canopeeBark = Color(red: 0.0, green: 0.106, blue: 0.051)
}

struct RouteTrace: View {
    let route: [Double]
    var lineWidth: CGFloat = 2

    private var points: [CGPoint] {
        stride(from: 0, to: max(route.count - 1, 0), by: 2).map { index in
            CGPoint(x: route[index], y: 1 - route[index + 1])
        }
    }

    var body: some View {
        GeometryReader { proxy in
            let scaled = points.map {
                CGPoint(x: $0.x * proxy.size.width, y: $0.y * proxy.size.height)
            }

            ZStack {
                Path { path in
                    guard let first = scaled.first else { return }

                    path.move(to: first)

                    for point in scaled.dropFirst() {
                        path.addLine(to: point)
                    }
                }
                .stroke(
                    Color.canopeeCream.opacity(0.85),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round)
                )

                if let last = scaled.last {
                    Circle()
                        .fill(Color.canopeeCream)
                        .frame(width: lineWidth * 2.2, height: lineWidth * 2.2)
                        .position(last)
                }
            }
        }
    }
}

struct PatrolTimer: View {
    let startedAt: Date
    let paused: Bool
    let elapsedSeconds: Int
    var size: CGFloat

    var body: some View {
        Group {
            if paused {
                Text(PatrolActivityBridge.formattedElapsed(elapsedSeconds))
            } else {
                Text(startedAt, style: .timer)
            }
        }
        .font(.system(size: size, weight: .semibold, design: .rounded))
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
}

@available(iOS 17.0, *)
struct PatrolRoundButton<Content: View>: View {
    let tint: Color
    var size: CGFloat = 50
    let content: Content

    init(tint: Color, size: CGFloat = 50, @ViewBuilder content: () -> Content) {
        self.tint = tint
        self.size = size
        self.content = content()
    }

    var body: some View {
        content
            .font(.system(size: size * 0.36, weight: .bold))
            .foregroundStyle(Color.canopeeCream)
            .frame(width: size, height: size)
            .background(tint, in: Circle())
    }
}

@available(iOS 17.0, *)
struct PatrolReportLink: View {
    var body: some View {
        Link(destination: URL(string: "canopee://signaler")!) {
            HStack(spacing: 5) {
                Image(systemName: "exclamationmark.bubble.fill")
                    .font(.system(size: 11, weight: .bold))
                Text("Signaler")
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)
            }
            .foregroundStyle(Color.canopeeCream)
            .padding(.horizontal, 14)
            .padding(.vertical, 7)
            .background(Color.canopeeCream.opacity(0.14), in: Capsule())
        }
    }
}

struct PatrolLockScreenView: View {
    let context: ActivityViewContext<PatrolAttributes>

    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            VStack(alignment: .leading, spacing: 9) {
                HStack(spacing: 7) {
                    Circle()
                        .fill(context.state.paused ? Color.canopeeCream.opacity(0.35) : Color.canopeeGreen)
                        .frame(width: 7, height: 7)

                    Text(context.state.paused ? "Patrouille en pause" : "Patrouille en cours")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.canopeeCream.opacity(0.7))
                        .lineLimit(1)
                }

                PatrolTimer(
                    startedAt: context.attributes.startedAt,
                    paused: context.state.paused,
                    elapsedSeconds: context.state.elapsedSeconds,
                    size: 36
                )
                .foregroundStyle(Color.canopeeCream)

                HStack(spacing: 10) {
                    Text(PatrolActivityBridge.formattedDistance(context.state.distanceMetres))
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .lineLimit(1)
                        .foregroundStyle(Color.canopeeCream.opacity(0.75))

                    if context.state.route.count >= 4 {
                        RouteTrace(route: context.state.route)
                            .frame(width: 62, height: 22)
                    }
                }

                if #available(iOS 17.0, *) {
                    PatrolReportLink()
                        .padding(.top, 2)
                }
            }

            Spacer(minLength: 0)

            if #available(iOS 17.0, *) {
                VStack(spacing: 10) {
                    Button(intent: TogglePatrolIntent()) {
                        PatrolRoundButton(tint: Color.canopeeCream.opacity(0.16)) {
                            Image(systemName: context.state.paused ? "play.fill" : "pause.fill")
                        }
                    }
                    .buttonStyle(.plain)

                    Button(intent: StopPatrolIntent()) {
                        PatrolRoundButton(tint: Color.canopeeCoral) {
                            Image(systemName: "stop.fill")
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .activityBackgroundTint(Color.canopeeBark)
        .activitySystemActionForegroundColor(Color.canopeeCream)
    }
}

struct PatrolActivityLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PatrolAttributes.self) { context in
            PatrolLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 5) {
                        Image(systemName: context.state.paused ? "pause.fill" : "figure.walk")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color.canopeeGreen)
                        Text(PatrolActivityBridge.formattedDistance(context.state.distanceMetres))
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .monospacedDigit()
                            .lineLimit(1)
                            .foregroundStyle(Color.canopeeCream)
                    }
                    .padding(.leading, 4)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    PatrolTimer(
                        startedAt: context.attributes.startedAt,
                        paused: context.state.paused,
                        elapsedSeconds: context.state.elapsedSeconds,
                        size: 15
                    )
                    .foregroundStyle(Color.canopeeCream)
                    .padding(.trailing, 4)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    if #available(iOS 17.0, *) {
                        HStack(spacing: 10) {
                            PatrolReportLink()

                            Spacer(minLength: 0)

                            if context.state.route.count >= 4 {
                                RouteTrace(route: context.state.route, lineWidth: 1.6)
                                    .frame(width: 52, height: 26)
                            }

                            Button(intent: TogglePatrolIntent()) {
                                PatrolRoundButton(
                                    tint: Color.canopeeCream.opacity(0.16),
                                    size: 38
                                ) {
                                    Image(systemName: context.state.paused ? "play.fill" : "pause.fill")
                                }
                            }
                            .buttonStyle(.plain)

                            Button(intent: StopPatrolIntent()) {
                                PatrolRoundButton(tint: Color.canopeeCoral, size: 38) {
                                    Image(systemName: "stop.fill")
                                }
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.top, 6)
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.paused ? "pause.fill" : "figure.walk")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Color.canopeeGreen)
            } compactTrailing: {
                PatrolTimer(
                    startedAt: context.attributes.startedAt,
                    paused: context.state.paused,
                    elapsedSeconds: context.state.elapsedSeconds,
                    size: 13
                )
                .foregroundStyle(Color.canopeeCream)
                .frame(width: 46, alignment: .trailing)
            } minimal: {
                Image(systemName: context.state.paused ? "pause.fill" : "figure.walk")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Color.canopeeGreen)
            }
            .keylineTint(Color.canopeeGreen)
        }
    }
}
