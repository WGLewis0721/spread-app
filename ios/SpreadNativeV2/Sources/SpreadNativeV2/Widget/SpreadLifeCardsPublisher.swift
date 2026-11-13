#if os(iOS)
import Foundation
import WidgetKit

/// Life cards on a widget show Life area names, colors and weekly hours on the Home Screen, so they
/// have their own switch (off by default) apart from the Today counters. The data is a disposable,
/// local-only projection. It is written only while the planner shows today's week, and it is deleted
/// when the switch goes off or the profile changes.
enum SpreadLifeCardsPublisher {
    static let enabledKey = "native.widget.lifeCardsEnabled"

    static func publish(snapshot: PlannerSnapshot) {
        guard UserDefaults.standard.bool(forKey: enabledKey) else {
            revoke()
            return
        }
        // Never overwrite this week's cards with a selected future or past week.
        guard snapshot.weekKey == PlannerDates.currentWeekKey() else { return }
        guard let shared = UserDefaults(suiteName: SpreadWidgetShared.appGroup) else { return }
        let record = SpreadLifeCardsWidgetBuilder.make(from: snapshot)
        guard let data = try? JSONEncoder().encode(record) else { return }
        shared.set(data, forKey: SpreadWidgetShared.lifeCardsKey)
        WidgetCenter.shared.reloadTimelines(ofKind: SpreadWidgetShared.lifeCardsKind)
    }

    static func revoke() {
        guard let shared = UserDefaults(suiteName: SpreadWidgetShared.appGroup),
              shared.object(forKey: SpreadWidgetShared.lifeCardsKey) != nil else { return }
        shared.removeObject(forKey: SpreadWidgetShared.lifeCardsKey)
        shared.removeObject(forKey: SpreadWidgetShared.lifeCardSelectedKey)
        WidgetCenter.shared.reloadTimelines(ofKind: SpreadWidgetShared.lifeCardsKind)
    }
}
#endif
