import Foundation

/// An immutable *projection* of the React planner state. Never persist this object as a
/// replacement for Spread's live localStorage profile, backup, or cloud data.
public struct PlannerSnapshot: Codable, Equatable, Sendable {
    public var weekKey: String
    public var roles: [Responsibility]
    public var allocations: [DayAllocation]
    public var tasks: [PlannerTask]
    /** Optional presentation ordering; absent from Classic/older snapshots. */
    public var dayTaskOrder: [String: [String]]? = nil
    /// Optional per-week Life metadata. Missing means capacity was never configured.
    public var life: LifeWeekSnapshot? = nil
    public var recurringPlans: [NativeRecurringPlan]? = nil
    public var recurrenceIssue: String? = nil
    /// Read-only forecast of the weeks after this one. Absent unless the native host requests it.
    public var outlook: [NativeOutlookWeek]? = nil

    public init(weekKey: String, roles: [Responsibility], allocations: [DayAllocation], tasks: [PlannerTask]) {
        self.weekKey = weekKey
        self.roles = roles
        self.allocations = allocations
        self.tasks = tasks
    }

    public func placedHours(for roleId: String) -> Double {
        allocations.filter { $0.roleId == roleId }.reduce(0) { $0 + $1.hours }
    }

    public func remainingHours(for roleId: String) -> Double {
        guard let role = roles.first(where: { $0.id == roleId }) else { return 0 }
        // Match model.ts remainingHours exactly, including overbooked legacy weeks.
        // JavaScript Math.round breaks .5 ties toward +infinity.
        return floor((role.hours - placedHours(for: roleId)) * 2 + 0.5) / 2
    }

    public func tasks(for roleId: String) -> [PlannerTask] {
        tasks.filter { $0.roleId == roleId }
    }

    /// The equivalent of the web planner's "To place" tray: no allocation ID.
    public var unplacedTasks: [PlannerTask] {
        tasks.filter { $0.allocationId == nil && !$0.done }
    }

    /// A task is eligible only for an allocation of its own responsibility.
    public func eligibleAllocations(for task: PlannerTask) -> [DayAllocation] {
        guard !task.done else { return [] }
        return allocations.filter { $0.roleId == task.roleId && $0.hours > 0 }
            .sorted { $0.day == $1.day ? $0.order < $1.order : $0.day < $1.day }
    }
}

/// One future week in the Plan Ahead outlook. Mirrors projectOutlook in native-v2-projection.ts.
/// View-only: nothing here is written back to the planner.
public struct NativeOutlookWeek: Codable, Equatable, Identifiable, Sendable {
    public let weekKey: String
    /// True for a stored week that a schedule would not regenerate (edited, or made before it).
    public let kept: Bool
    public let hours: [NativeOutlookHours]
    public let placed: [NativeOutlookPlacement]
    public var id: String { weekKey }
}

public struct NativeOutlookHours: Codable, Equatable, Sendable {
    public let roleId: String
    public let hours: Double
}

public struct NativeOutlookPlacement: Codable, Equatable, Sendable {
    public let roleId: String
    public let day: String
    public let hours: Double
}

public struct NativeRecurringPlan: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public let roleId: String
    public let startWeek: String
    public let managedFromWeek: String?
    public let everyWeeks: Int
    public let hours: Double
    public let endWeek: String?
    public let terminatedWeek: String?
    public let capacityHours: Double
}

public struct LifeWeekSnapshot: Codable, Equatable, Sendable {
    public let version: Int
    public let capacityHours: Double?
    public let priorityRoleId: String?
    public let priorityGoalHours: Double?
    public let priorityDay: String?
}

public struct Responsibility: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public let name: String
    public let category: String
    public let color: String
    public let hours: Double

    public init(id: String, name: String, category: String, color: String, hours: Double) {
        self.id = id
        self.name = name
        self.category = category
        self.color = color
        self.hours = hours
    }
}

public struct DayAllocation: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public let roleId: String
    public let day: String // ISO date YYYY-MM-DD, never a guessed calendar time
    public let hours: Double
    public let order: Int

    public init(id: String, roleId: String, day: String, hours: Double, order: Int = 0) {
        self.id = id
        self.roleId = roleId
        self.day = day
        self.hours = hours
        self.order = order
    }
}

public struct PlannerTask: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public let roleId: String
    public let text: String
    public let done: Bool
    public let allocationId: String?
    public let estimateMinutes: Int?
    public let important: Bool?

    public init(id: String, roleId: String, text: String, done: Bool, allocationId: String?, estimateMinutes: Int? = nil, important: Bool? = nil) {
        self.id = id
        self.roleId = roleId
        self.text = text
        self.done = done
        self.allocationId = allocationId
        self.estimateMinutes = estimateMinutes
        self.important = important
    }
}

/// Versioned identity envelope, shared by native-v2-projection.ts and its JSON fixture.
/// This is a view-only transport; it must never be persisted as a planner record.
public struct NativeV2Envelope: Codable, Equatable, Sendable {
    public let protocolVersion: Int
    public let profileId: String
    public let snapshot: PlannerSnapshot

    public var isSupported: Bool { protocolVersion == 1 && !profileId.isEmpty }

    public init(protocolVersion: Int = 1, profileId: String, snapshot: PlannerSnapshot) {
        self.protocolVersion = protocolVersion
        self.profileId = profileId
        self.snapshot = snapshot
    }
}

/// Commands describe intents, not a second scheduling engine. An adapter must execute the
/// corresponding action in src/lib/spread/store.ts and return a fresh authoritative snapshot.
public enum PlannerCommand: Equatable, Sendable {
    case changeWeek(Int)
    case setHours(roleId: String, hours: Double)
    case allocate(roleId: String, day: String, hours: Double)
    case addTask(roleId: String, text: String)
    case toggleTask(roleId: String, taskId: String)
    case assignTask(roleId: String, taskId: String, allocationId: String?)
    case undo(editId: String)
    case carryOver(taskIds: [String])
}

/// No production implementation is supplied in the first slice. This intentionally avoids
/// introducing a second editable source of truth or touching existing user's stored records.
@MainActor
public protocol SpreadPlannerAdapter: AnyObject {
    func snapshot() async throws -> PlannerSnapshot
    func execute(_ command: PlannerCommand) async throws -> PlannerSnapshot
}

public enum SpreadLayout: String, CaseIterable, Codable, Sendable, Identifiable {
    case stack, fan, dial, tabs, day
    public var id: String { rawValue }
    public var title: String { rawValue.capitalized }
}

public enum ChalkArtwork {
    public static let categories: [String] = [
        "work", "school", "home", "health", "family", "fitness",
        "business", "project", "church", "personal", "custom"
    ]
    public static func category(for raw: String) -> String {
        categories.contains(raw) ? raw : "custom"
    }

    /// Categories that have an original category glyph (`category-glyph-*`). "custom" uses the list mark.
    static let categoryGlyphNames: Set<String> = [
        "work", "school", "home", "health", "family", "fitness", "business", "project", "church", "personal"
    ]

    /// Resource URL is resolved from this package, not the host app or a network URL.
    public static func resourceURL(for categoryName: String) -> URL? {
        Bundle.module.url(forResource: category(for: categoryName),
                          withExtension: "webp", subdirectory: "Chalk")
    }
}

/// The fixture is deliberately unmistakable: it is only for Debug preview and cannot
/// overwrite localStorage or appear in the normal shipped app.
public enum SpreadV2Fixture {
    public static let week = PlannerSnapshot(
        weekKey: "2026-11-02",
        roles: [
            Responsibility(id: "work", name: "Work", category: "work", color: "#A86975", hours: 8),
            Responsibility(id: "home", name: "Home", category: "home", color: "#9074AE", hours: 4),
            Responsibility(id: "health", name: "Health", category: "health", color: "#6F9B76", hours: 3)
        ],
        allocations: [
            DayAllocation(id: "a-work", roleId: "work", day: "2026-11-02", hours: 2),
            DayAllocation(id: "a-home", roleId: "home", day: "2026-11-04", hours: 1),
            DayAllocation(id: "a-health", roleId: "health", day: "2026-11-06", hours: 1)
        ],
        tasks: [
            PlannerTask(id: "t-1", roleId: "work", text: "Prepare weekly review", done: false, allocationId: "a-work"),
            PlannerTask(id: "t-2", roleId: "work", text: "Send project update", done: false, allocationId: nil),
            PlannerTask(id: "t-3", roleId: "home", text: "Organize the kitchen", done: false, allocationId: "a-home"),
            PlannerTask(id: "t-4", roleId: "health", text: "Walk after work", done: true, allocationId: "a-health")
        ]
    )
}

/// Role dots for one calendar day, as the original Month view drew them: up to three responsibility colours and
/// a count of any further ones. It is a read-only answer from the planner; it is never written back.
public struct NativeDayMark: Codable, Equatable, Sendable {
    public let colors: [String]
    public let extra: Int

    public init(colors: [String], extra: Int) {
        self.colors = colors
        self.extra = extra
    }

    /// How many responsibilities are on the day (the dots shown plus the ones folded into "+N").
    public var count: Int { colors.count + extra }
}
