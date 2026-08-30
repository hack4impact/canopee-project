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

enum SVGPath {
    static func path(from commands: [String], viewBox: CGSize, in rect: CGRect) -> Path {
        let scale = min(rect.width / viewBox.width, rect.height / viewBox.height)
        let dx = rect.minX + (rect.width - viewBox.width * scale) / 2
        let dy = rect.minY + (rect.height - viewBox.height * scale) / 2

        var path = Path()

        for command in commands {
            append(command, to: &path, scale: scale, dx: dx, dy: dy)
        }

        return path
    }

    private static func tokenize(_ source: String) -> [(op: Character, values: [CGFloat])] {
        var result: [(Character, [CGFloat])] = []
        var op: Character?
        var values: [CGFloat] = []
        var number = ""

        func flushNumber() {
            if !number.isEmpty, let value = Double(number) {
                values.append(CGFloat(value))
            }

            number = ""
        }

        func flushOp() {
            flushNumber()

            if let op {
                result.append((op, values))
            }

            values = []
        }

        for character in source {
            if character.isLetter {
                flushOp()
                op = character
            } else if character == "-" || character == "+" {
                if number.isEmpty || number.hasSuffix("e") || number.hasSuffix("E") {
                    number.append(character)
                } else {
                    flushNumber()
                    number.append(character)
                }
            } else if character == "." {
                if number.contains(".") {
                    flushNumber()
                }

                number.append(character)
            } else if character.isNumber || character == "e" || character == "E" {
                number.append(character)
            } else {
                flushNumber()
            }
        }

        flushOp()

        return result
    }

    private static func append(
        _ source: String,
        to path: inout Path,
        scale: CGFloat,
        dx: CGFloat,
        dy: CGFloat
    ) {
        var current = CGPoint.zero
        var start = CGPoint.zero
        var lastControl: CGPoint?

        func placed(_ point: CGPoint) -> CGPoint {
            CGPoint(x: dx + point.x * scale, y: dy + point.y * scale)
        }

        for (op, values) in tokenize(source) {
            let relative = op.isLowercase
            var cursor = 0

            func take(_ count: Int) -> [CGFloat]? {
                guard cursor + count <= values.count else { return nil }

                defer { cursor += count }

                return Array(values[cursor..<(cursor + count)])
            }

            func shifted(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
                relative ? CGPoint(x: current.x + x, y: current.y + y) : CGPoint(x: x, y: y)
            }

            switch Character(op.uppercased()) {
            case "M":
                var first = true

                while let v = take(2) {
                    let target = shifted(v[0], v[1])

                    if first {
                        path.move(to: placed(target))
                        start = target
                        first = false
                    } else {
                        path.addLine(to: placed(target))
                    }

                    current = target
                }

                lastControl = nil

            case "L":
                while let v = take(2) {
                    let target = shifted(v[0], v[1])
                    path.addLine(to: placed(target))
                    current = target
                }

                lastControl = nil

            case "H":
                while let v = take(1) {
                    let target = CGPoint(x: relative ? current.x + v[0] : v[0], y: current.y)
                    path.addLine(to: placed(target))
                    current = target
                }

                lastControl = nil

            case "V":
                while let v = take(1) {
                    let target = CGPoint(x: current.x, y: relative ? current.y + v[0] : v[0])
                    path.addLine(to: placed(target))
                    current = target
                }

                lastControl = nil

            case "C":
                while let v = take(6) {
                    let control1 = shifted(v[0], v[1])
                    let control2 = shifted(v[2], v[3])
                    let target = shifted(v[4], v[5])

                    path.addCurve(
                        to: placed(target),
                        control1: placed(control1),
                        control2: placed(control2)
                    )

                    lastControl = control2
                    current = target
                }

            case "S":
                while let v = take(4) {
                    let control1 = lastControl.map {
                        CGPoint(x: 2 * current.x - $0.x, y: 2 * current.y - $0.y)
                    } ?? current
                    let control2 = shifted(v[0], v[1])
                    let target = shifted(v[2], v[3])

                    path.addCurve(
                        to: placed(target),
                        control1: placed(control1),
                        control2: placed(control2)
                    )

                    lastControl = control2
                    current = target
                }

            case "Z":
                path.closeSubpath()
                current = start
                lastControl = nil

            default:
                break
            }
        }
    }
}

struct PatrolHiker: Shape {
    private static let viewBox = CGSize(width: 52, height: 52)

    private static let commands = [
        "M27.8,2c3.3,0,5.9,2.6,5.9,5.9s-2.7,5.9-5.9,5.9s-5.9-2.6-5.9-5.9S24.5,2,27.8,2z",
        "M43,18.1c-1.2-0.1-2.3,0.7-2.4,1.8L40,25.7c-0.2,0-0.3,0.3-0.5,0.3h-5.5l-3.8-6.7c-0.3-0.6-0.9-1.1-1.6-1.2 l-5.8-0.8c-1-0.1-2,0.4-2.4,1.4l-4.4,11.3c-0.3,0.9,0.1,1.8,0.9,2.3l10.8,7.4l0.9,8.4c0.1,1.1,1.1,1.9,2.2,1.9l0,0 c1.3,0,2.3-1,2.2-2.2L32,37.5c0-0.5-0.3-1-0.8-1.4l-5.9-6.6l2.2-5.4l2.6,4.5c0.4,0.6,1.1,1.3,1.9,1.3h7.6l-2.2,18 c-0.1,1.1,0.7,2,1.9,2.1c0.1,0,0.2-0.1,0.2-0.1c1.1,0,2-0.8,2.2-1.9L45,20.2C45.1,19.2,44.2,18.2,43,18.1z",
        "M12.2,27.7l3.7-9.5c0.2-0.6,0.5-1.2,0.9-1.8l-0.5-0.1c-3.2-0.4-6.2,1.5-7.2,4.4l-2,5.2 c-0.4,1.1,0.2,2.4,1.4,2.7l0.9,0.2C10.6,29.3,11.8,28.7,12.2,27.7z",
        "M13.6,35.2L9.1,48.6c-0.2,0.7,0.3,1.3,1,1.3h2.5c0.9,0,1.8-0.6,2.1-1.4l4.4-9.7l-5-3.1 C14,35.5,13.8,35.3,13.6,35.2z",
    ]

    func path(in rect: CGRect) -> Path {
        SVGPath.path(from: PatrolHiker.commands, viewBox: PatrolHiker.viewBox, in: rect)
    }
}

struct PatrolBadge: View {
    let paused: Bool
    var size: CGFloat = 22

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.canopeeCream.opacity(0.2))

            PatrolHiker()
                .fill(paused ? Color.canopeeCream.opacity(0.45) : Color.canopeeLime)
                .frame(width: size * 0.6, height: size * 0.6)
        }
        .frame(width: size, height: size)
    }
}

struct RouteTrace: View {
    let route: [Double]
    var paused: Bool = false
    var lineWidth: CGFloat = 2.4
    var inset: CGFloat = 10

    private var points: [CGPoint] {
        stride(from: 0, to: max(route.count - 1, 0), by: 2).map { index in
            CGPoint(x: route[index], y: route[index + 1])
        }
    }

    var body: some View {
        GeometryReader { proxy in
            let scaled = RouteTrace.fitted(points, in: proxy.size, inset: inset)

            ZStack {
                Path { path in
                    guard let first = scaled.first else { return }

                    path.move(to: first)

                    for point in scaled.dropFirst() {
                        path.addLine(to: point)
                    }
                }
                .stroke(
                    paused ? Color.canopeeCream.opacity(0.4) : Color.canopeeLime,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round)
                )

                if let last = scaled.last {
                    Circle()
                        .fill(Color.canopeeCream)
                        .frame(width: lineWidth * 2.4, height: lineWidth * 2.4)
                        .position(last)
                }
            }
        }
    }

    private static func fitted(
        _ points: [CGPoint],
        in size: CGSize,
        inset: CGFloat
    ) -> [CGPoint] {
        guard points.count > 1 else { return [] }

        let xs = points.map(\.x)
        let ys = points.map(\.y)
        let minX = xs.min() ?? 0
        let maxX = xs.max() ?? 1
        let minY = ys.min() ?? 0
        let maxY = ys.max() ?? 1
        let spanX = max(maxX - minX, 0.0001)
        let spanY = max(maxY - minY, 0.0001)

        let scale = min(
            max(size.width - inset * 2, 1) / spanX,
            max(size.height - inset * 2, 1) / spanY
        )
        let originX = (size.width - spanX * scale) / 2
        let originY = (size.height - spanY * scale) / 2

        return points.map { point in
            CGPoint(
                x: originX + (point.x - minX) * scale,
                y: originY + (maxY - point.y) * scale
            )
        }
    }
}

struct PatrolRoutePanel: View {
    let route: [Double]
    let paused: Bool
    var cornerRadius: CGFloat = 14
    var lineWidth: CGFloat = 2.4
    var inset: CGFloat = 10

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(Color.canopeeCream.opacity(0.07))

            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .strokeBorder(Color.canopeeCream.opacity(0.16), lineWidth: 1)

            if route.count >= 4 {
                RouteTrace(
                    route: route,
                    paused: paused,
                    lineWidth: lineWidth,
                    inset: inset
                )
            } else {
                ZStack {
                    Circle()
                        .stroke(Color.canopeeCream.opacity(0.22), lineWidth: 1.5)
                        .frame(width: 20, height: 20)

                    Circle()
                        .fill(paused ? Color.canopeeCream.opacity(0.4) : Color.canopeeLime)
                        .frame(width: 6, height: 6)
                }
            }
        }
    }
}

struct PatrolPulse: View {
    let refreshedAt: Date
    let paused: Bool
    var height: CGFloat = 4
    var window: TimeInterval = 60

    var body: some View {
        Group {
            if paused {
                Capsule()
                    .fill(Color.canopeeCream.opacity(0.12))
            } else {
                ProgressView(
                    timerInterval: refreshedAt...refreshedAt.addingTimeInterval(window),
                    countsDown: false
                ) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
                .progressViewStyle(.linear)
                .tint(Color.canopeeLime)
            }
        }
        .frame(height: height)
    }
}

struct PatrolStatusLine: View {
    let paused: Bool
    var badge: CGFloat = 22

    var body: some View {
        HStack(spacing: 8) {
            PatrolBadge(paused: paused, size: badge)

            Text(paused ? "Patrouille en pause" : "Patrouille en cours")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color.canopeeCream.opacity(0.65))
                .lineLimit(1)
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
        .foregroundStyle(Color.canopeeCream)
    }
}

struct PatrolDistance: View {
    let metres: Int
    var size: CGFloat = 15

    var body: some View {
        Text(PatrolActivityBridge.formattedDistance(metres))
            .font(.system(size: size, weight: .semibold, design: .rounded))
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .foregroundStyle(Color.canopeeCream.opacity(0.85))
    }
}

struct PatrolReportLink: View {
    var height: CGFloat = 40
    var cornerRadius: CGFloat = 13

    var body: some View {
        Link(destination: URL(string: "canopee://signaler")!) {
            HStack(spacing: 6) {
                Image(systemName: "exclamationmark.bubble.fill")
                    .font(.system(size: 12, weight: .bold))

                Text("Signaler")
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(1)
            }
            .foregroundStyle(Color.canopeeCream)
            .frame(maxWidth: .infinity, minHeight: height)
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(Color.canopeeCream.opacity(0.16))
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(Color.canopeeCream.opacity(0.22), lineWidth: 1)
            )
        }
    }
}

@available(iOS 17.0, *)
struct PatrolRoundButton<Content: View>: View {
    let tint: Color
    var rim: Color = .clear
    var size: CGFloat = 40
    let content: Content

    init(
        tint: Color,
        rim: Color = .clear,
        size: CGFloat = 40,
        @ViewBuilder content: () -> Content
    ) {
        self.tint = tint
        self.rim = rim
        self.size = size
        self.content = content()
    }

    var body: some View {
        content
            .font(.system(size: size * 0.34, weight: .bold))
            .foregroundStyle(Color.canopeeCream)
            .frame(width: size, height: size)
            .background(tint, in: Circle())
            .overlay(Circle().strokeBorder(rim, lineWidth: 1))
    }
}

@available(iOS 17.0, *)
struct PatrolControls: View {
    let paused: Bool
    var size: CGFloat = 40

    var body: some View {
        HStack(spacing: 8) {
            Button(intent: TogglePatrolIntent()) {
                PatrolRoundButton(
                    tint: Color.canopeeCream.opacity(0.16),
                    rim: Color.canopeeCream.opacity(0.22),
                    size: size
                ) {
                    Image(systemName: paused ? "play.fill" : "pause.fill")
                }
            }
            .buttonStyle(.plain)

            Button(intent: StopPatrolIntent()) {
                PatrolRoundButton(tint: Color.canopeeCoral, size: size) {
                    Image(systemName: "stop.fill")
                }
            }
            .buttonStyle(.plain)
        }
    }
}

struct PatrolLockScreenView: View {
    let context: ActivityViewContext<PatrolAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 8) {
                PatrolStatusLine(paused: context.state.paused)

                Spacer(minLength: 8)

                PatrolDistance(metres: context.state.distanceMetres)
            }

            PatrolPulse(
                refreshedAt: context.state.refreshedAt,
                paused: context.state.paused
            )

            HStack(spacing: 14) {
                PatrolTimer(
                    startedAt: context.attributes.startedAt,
                    paused: context.state.paused,
                    elapsedSeconds: context.state.elapsedSeconds,
                    size: 36
                )
                .layoutPriority(1)

                PatrolRoutePanel(
                    route: context.state.route,
                    paused: context.state.paused
                )
            }
            .frame(height: 50)

            HStack(spacing: 8) {
                PatrolReportLink()

                if #available(iOS 17.0, *) {
                    PatrolControls(paused: context.state.paused)
                }
            }
            .frame(height: 40)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .activityBackgroundTint(.black)
        .activitySystemActionForegroundColor(Color.canopeeLime)
    }
}

struct PatrolActivityLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PatrolAttributes.self) { context in
            PatrolLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 0) {
                        PatrolTimer(
                            startedAt: context.attributes.startedAt,
                            paused: context.state.paused,
                            elapsedSeconds: context.state.elapsedSeconds,
                            size: 19
                        )

                        Text("temps")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Color.canopeeCream.opacity(0.5))
                    }
                    .padding(.leading, 4)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 0) {
                        PatrolDistance(metres: context.state.distanceMetres, size: 19)

                        Text("distance")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(Color.canopeeCream.opacity(0.5))
                    }
                    .padding(.trailing, 4)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 8) {
                        PatrolPulse(
                            refreshedAt: context.state.refreshedAt,
                            paused: context.state.paused,
                            height: 3
                        )

                        PatrolRoutePanel(
                            route: context.state.route,
                            paused: context.state.paused,
                            cornerRadius: 12,
                            lineWidth: 2,
                            inset: 8
                        )
                        .frame(height: 34)

                        HStack(spacing: 8) {
                            PatrolReportLink(height: 36, cornerRadius: 12)

                            if #available(iOS 17.0, *) {
                                PatrolControls(paused: context.state.paused, size: 36)
                            }
                        }
                        .frame(height: 36)
                    }
                    .padding(.top, 4)
                }
            } compactLeading: {
                PatrolHiker()
                    .fill(context.state.paused
                        ? Color.canopeeCream.opacity(0.45)
                        : Color.canopeeLime)
                    .frame(width: 14, height: 14)
            } compactTrailing: {
                PatrolTimer(
                    startedAt: context.attributes.startedAt,
                    paused: context.state.paused,
                    elapsedSeconds: context.state.elapsedSeconds,
                    size: 13
                )
                .frame(width: 46, alignment: .trailing)
            } minimal: {
                PatrolHiker()
                    .fill(context.state.paused
                        ? Color.canopeeCream.opacity(0.45)
                        : Color.canopeeLime)
                    .frame(width: 14, height: 14)
            }
            .keylineTint(Color.canopeeLime)
        }
    }
}
