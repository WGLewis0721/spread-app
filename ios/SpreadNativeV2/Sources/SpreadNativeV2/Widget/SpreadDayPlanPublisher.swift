#if os(iOS)
import Foundation
import WidgetKit

/// Writes what the planner says about today into the shared store, so the widgets and the island can offer
/// today's planned block. Read-only: the planner is never changed here. It keeps the current week only, and it
/// is off and cleared with the Today widgets switch.
enum SpreadDayPlanPublisher {
    private static let showNameKey = "native.focus.showNameOutsideApp"

    static func publish(snapshot: PlannerSnapshot, profileId: String) {
        guard UserDefaults.standard.bool(forKey: SpreadWidgetShared.todayEnabledKey) else {
            clear()
            return
        }
        // A week the person is browsing must not replace today's record.
        guard snapshot.weekKey == PlannerDates.currentWeekKey() else { return }
        let record = SpreadDayPlanBuilder.make(
            snapshot: snapshot, day: PlannerDates.localISO(), profileId: profileId,
            showNames: UserDefaults.standard.bool(forKey: showNameKey), writtenAt: Date())
        SpreadDayPlanStore.save(record)
        WidgetCenter.shared.reloadTimelines(ofKind: SpreadWidgetShared.timerKind)
    }

    static func clear() {
        guard SpreadDayPlanStore.load() != nil else { return }
        SpreadDayPlanStore.save(nil)
        WidgetCenter.shared.reloadTimelines(ofKind: SpreadWidgetShared.timerKind)
    }
}
#endif
