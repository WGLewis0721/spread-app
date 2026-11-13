import Foundation

/// Builds the Life cards a widget draws from the planner snapshot. It reads the same per-day hours the
/// Life card in the app shows (`LifeCardWeekDistribution`), so a widget card and the app card agree.
/// Foundation only, so it is tested on macOS and off iOS.
enum SpreadLifeCardsWidgetBuilder {
    static func make(from snapshot: PlannerSnapshot, writtenAt: Date = Date()) -> SpreadLifeCardsWidgetSnapshot {
        let cards = snapshot.roles.map { (role: Responsibility) -> SpreadLifeCardWidgetCard in
            let days = LifeCardWeekDistribution.hours(for: role.id, snapshot: snapshot)
            return SpreadLifeCardWidgetCard(
                id: role.id, name: role.name, category: role.category, colorHex: role.color,
                budgetHours: role.hours,
                placedHours: LifeCardWeekDistribution.assigned(days),
                days: days)
        }
        return SpreadLifeCardsWidgetSnapshot(weekKey: snapshot.weekKey, cards: cards, writtenAt: writtenAt)
    }
}
