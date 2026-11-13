import Foundation

// Today's planned blocks, as the widgets and the island read them. The app reads the planner and writes a small
// record here; nothing writes back to the plan. A block is a suggestion the person starts with one tap, and
// finishing a block writes nothing to hours, budgets, tasks or the week. Foundation only, so the same file
// compiles into the app, the WidgetKit extension and the Linux test slice.

/// One Life area's planned hours on a day, and the focus plan that fits those hours.
struct SpreadDayBlockEntry: Codable, Equatable {
    let roleId: String
    /// The Life area's name, or "Planned block" when the person has kept names off the widgets.
    let label: String
    let hours: Double
    let plan: SpreadFocusPlan
}

/// What the app last read from the planner for one day, for the profile on screen.
struct SpreadDayPlanRecord: Codable, Equatable {
    let profileId: String
    /// YYYY-MM-DD on the device's calendar.
    let day: String
    let writtenAt: Date
    /// Largest first. Ties keep the planner's Life area order.
    let blocks: [SpreadDayBlockEntry]
}

/// A block that may be offered right now, with the record it came from.
struct SpreadOfferedBlock: Equatable {
    let record: SpreadDayPlanRecord
    let entry: SpreadDayBlockEntry
}

/// How today's planned blocks are going, for the profile on screen. Counts only, never Life area names.
struct SpreadDayProgress: Equatable {
    let done: Int
    let planned: Int
    var allDone: Bool { planned > 0 && done == planned }
}

/// Fits planned hours into focus rounds. Rule: total focus time matches the planned time as closely as possible.
/// Among equal fits, prefer a focus stretch nearest 45 minutes, then fewer rounds. Stretches are 15 to 90 minutes,
/// so no single stretch runs longer than a deep-work session. A break is 5 minutes after a stretch of 30 minutes
/// or less, and 10 minutes after anything longer.
enum SpreadBlockFit {
    static let minimumMinutes = 15
    static let preferredFocusMinutes = 45
    static let focusCandidates = Array(stride(from: 15, through: 90, by: 5))
    static let roundCandidates = Array(1...8)

    static func plan(hours: Double) -> SpreadFocusPlan? {
        guard hours.isFinite, hours > 0 else { return nil }
        // Planned time in five-minute steps, so an hour and a half is 90 minutes and a quarter of an hour is 15.
        let target = Int((hours * 60 / 5).rounded()) * 5
        guard target >= minimumMinutes else { return nil }
        var best: (focus: Int, rounds: Int)?
        var bestKey: (Int, Int, Int)?
        for focus in focusCandidates {
            for rounds in roundCandidates {
                let key = (abs(focus * rounds - target), abs(focus - preferredFocusMinutes), rounds)
                if bestKey == nil || key < bestKey! {
                    bestKey = key
                    best = (focus, rounds)
                }
            }
        }
        guard let best else { return nil }
        return SpreadFocusPlan(focusMinutes: best.focus, breakMinutes: best.focus <= 30 ? 5 : 10, rounds: best.rounds)
    }

    /// The focus time a plan actually gives, in minutes. It can differ slightly from the planned time.
    static func focusMinutes(of plan: SpreadFocusPlan) -> Int {
        plan.focusMinutes * plan.rounds
    }
}

/// How a block reads on a widget, the island and in the app.
enum SpreadBlockText {
    /// "3 h", or "1.5 h".
    static func hours(_ value: Double) -> String {
        value == value.rounded() ? "\(Int(value)) h" : String(format: "%.1f h", value)
    }

    /// "1 of 3 blocks done today.", "3 planned blocks today.", "All 3 blocks done today.". Counts only.
    static func progress(_ progress: SpreadDayProgress) -> String {
        if progress.allDone {
            return progress.planned == 1 ? "Today's block is done." : "All \(progress.planned) blocks done today."
        }
        if progress.done == 0 {
            return progress.planned == 1 ? "1 planned block today." : "\(progress.planned) planned blocks today."
        }
        return "\(progress.done) of \(progress.planned) blocks done today."
    }

    /// "4 rounds of 45 min, 10 min breaks, 3 h focus", or "One stretch of 60 min, no break".
    static func summary(_ plan: SpreadFocusPlan) -> String {
        guard plan.rounds > 1 else { return "One stretch of \(plan.focusMinutes) min, no break" }
        let focus = SpreadBlockFit.focusMinutes(of: plan)
        let total = focus % 60 == 0 ? "\(focus / 60) h" : "\(focus / 60) h \(focus % 60) min"
        return "\(plan.rounds) rounds of \(plan.focusMinutes) min, \(plan.breakMinutes) min breaks, \(total) focus"
    }
}

/// The record in the shared store, and the rules for which block to offer.
enum SpreadDayPlanStore {
    static let recordKey = "spread.dayplan.v1"
    static let doneKey = "spread.dayplan.done.v1"

    /// Blocks finished on one day, by Life area.
    struct DoneRecord: Codable, Equatable {
        let day: String
        var roleIds: [String]
    }

    static func load(_ defaults: UserDefaults = SpreadFocusStore.shared) -> SpreadDayPlanRecord? {
        guard let data = defaults.data(forKey: recordKey) else { return nil }
        return try? JSONDecoder().decode(SpreadDayPlanRecord.self, from: data)
    }

    /// Nil clears the record, for example when the widgets are turned off or the profile changes.
    static func save(_ record: SpreadDayPlanRecord?, _ defaults: UserDefaults = SpreadFocusStore.shared) {
        guard let record, let data = try? JSONEncoder().encode(record) else {
            defaults.removeObject(forKey: recordKey)
            return
        }
        defaults.set(data, forKey: recordKey)
    }

    static func doneRoles(day: String, _ defaults: UserDefaults = SpreadFocusStore.shared) -> Set<String> {
        guard let data = defaults.data(forKey: doneKey),
              let record = try? JSONDecoder().decode(DoneRecord.self, from: data),
              record.day == day else { return [] }
        return Set(record.roleIds)
    }

    static func markDone(roleId: String, day: String, _ defaults: UserDefaults = SpreadFocusStore.shared) {
        var roleIds = Array(doneRoles(day: day, defaults))
        guard !roleIds.contains(roleId) else { return }
        roleIds.append(roleId)
        if let data = try? JSONEncoder().encode(DoneRecord(day: day, roleIds: roleIds.sorted())) {
            defaults.set(data, forKey: doneKey)
        }
    }

    /// The block to offer now: today's block, for the profile on screen, that is not finished yet. Largest first,
    /// so the most important planned time comes up first. Nil when nothing is left for today.
    static func nextBlock(now: Date, _ defaults: UserDefaults = SpreadFocusStore.shared) -> SpreadOfferedBlock? {
        let today = SpreadWidgetDates.dayISO(now)
        guard let record = load(defaults), record.day == today,
              SpreadFocusStore.activeProfile(defaults) == record.profileId else { return nil }
        let done = doneRoles(day: today, defaults)
        guard let entry = record.blocks.first(where: { !done.contains($0.roleId) }) else { return nil }
        return SpreadOfferedBlock(record: record, entry: entry)
    }

    /// How many of today's planned blocks are finished, for the profile on screen. Nil when today has no plan.
    static func progress(now: Date, _ defaults: UserDefaults = SpreadFocusStore.shared) -> SpreadDayProgress? {
        let today = SpreadWidgetDates.dayISO(now)
        guard let record = load(defaults), record.day == today, !record.blocks.isEmpty,
              SpreadFocusStore.activeProfile(defaults) == record.profileId else { return nil }
        let done = doneRoles(day: today, defaults)
        let finished = record.blocks.filter { done.contains($0.roleId) }.count
        return SpreadDayProgress(done: finished, planned: record.blocks.count)
    }

    /// True when today has planned blocks and every one of them is finished.
    static func allDoneToday(now: Date, _ defaults: UserDefaults = SpreadFocusStore.shared) -> Bool {
        let today = SpreadWidgetDates.dayISO(now)
        guard let record = load(defaults), record.day == today, !record.blocks.isEmpty,
              SpreadFocusStore.activeProfile(defaults) == record.profileId else { return false }
        let done = doneRoles(day: today, defaults)
        return record.blocks.allSatisfy { done.contains($0.roleId) }
    }

    /// Records a block as finished once its final focus round is over, however that happened. Stopping earlier,
    /// during a round that is not the last, does not count, so the block stays on offer for later in the day.
    static func recordCompletion(of session: SpreadFocusSession, _ defaults: UserDefaults = SpreadFocusStore.shared) {
        guard let day = session.blockDay, session.phase == .finished,
              session.currentKind == .focus, session.roundNumber == session.roundCount,
              SpreadFocusMachine.nextLabel(after: session) == nil else { return }
        markDone(roleId: session.roleId, day: day, defaults)
    }
}
