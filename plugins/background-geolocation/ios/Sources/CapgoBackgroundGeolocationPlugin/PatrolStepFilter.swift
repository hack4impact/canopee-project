import CoreLocation
import CoreMotion
import Foundation

/// Drops the fixes nobody walked to.
///
/// GPS wanders while a patroller stands still and every wandered metre lands in
/// the patrol total. The pedometer is the second opinion. If the motion
/// coprocessor counted no steps between two fixes then the phone did not go
/// anywhere, so the fix is drift.
///
/// Only small moves are ever dropped. A jump longer than drift explains is let
/// through untouched, so a lagging sensor, a refused motion permission or a
/// phone with no pedometer at all can never eat a real walk.
final class PatrolStepFilter {
    static let shared = PatrolStepFilter()

    /// A move no longer than this, with no steps behind it, is drift. Anything
    /// longer is past what standing still produces, and dropping it on a sensor
    /// that might merely be lagging would cost a real walk. Matches the accuracy
    /// ceiling the recorder already applies to a single fix.
    static let driftCeilingMetres: CLLocationDistance = 50

    private let pedometer = CMPedometer()
    private let state = DispatchQueue(label: "org.reseaucanopee.patrol.step-filter")

    /// The last fix that was let through. It stays put when one is dropped, so
    /// the next window still covers every step taken since it.
    private var lastAccepted: CLLocation?

    /// The fixes still waiting on a verdict, oldest first. Asking the pedometer
    /// takes a moment and the next fix can land inside it, so they queue up: a
    /// route has to come out in the order it was walked.
    private var waiting: [(location: CLLocation, deliver: (CLLocation) -> Void)] = []

    /// True while a question is out with the pedometer. Only one is ever asked
    /// at a time, so the answers cannot overtake each other.
    private var asking = false

    /// Begins a new patrol. The first fix of one is always kept.
    func reset() {
        state.async {
            self.lastAccepted = nil
            self.waiting.removeAll()
        }
    }

    /// Hands `deliver` the fixes worth keeping, on the main queue and in the
    /// order they arrived, and says nothing about the rest.
    func admit(_ location: CLLocation, deliver: @escaping (CLLocation) -> Void) {
        state.async {
            self.waiting.append((location, deliver))
            self.judgeOldest()
        }
    }

    /// Works out whether the oldest waiting fix was walked to. Runs on `state`.
    private func judgeOldest() {
        guard !asking, let next = waiting.first else { return }

        // Nothing to measure against, no pedometer to ask, a fix that predates
        // the window, or a move too long to be drift: let it through untouched.
        guard let previous = lastAccepted,
              CMPedometer.isStepCountingAvailable(),
              previous.timestamp < next.location.timestamp,
              next.location.distance(from: previous) <= PatrolStepFilter.driftCeilingMetres else {
            settleOldest(keeping: true)
            return
        }

        asking = true

        pedometer.queryPedometerData(
            from: previous.timestamp,
            to: next.location.timestamp
        ) { data, _ in
            self.state.async {
                self.asking = false

                // No reading is not evidence of standing still.
                guard let steps = data?.numberOfSteps.intValue else {
                    self.settleOldest(keeping: true)
                    return
                }

                self.settleOldest(keeping: steps > 0)
            }
        }
    }

    /// Takes the oldest waiting fix off the queue, delivering it or dropping it
    /// in silence, then moves on to the next. Runs on `state`.
    private func settleOldest(keeping keep: Bool) {
        guard !waiting.isEmpty else { return }

        let settled = waiting.removeFirst()

        if keep {
            lastAccepted = settled.location

            DispatchQueue.main.async {
                settled.deliver(settled.location)
            }
        }

        // A dropped fix deliberately leaves `lastAccepted` where it is, so the
        // next window still covers every step taken since it.
        judgeOldest()
    }
}
