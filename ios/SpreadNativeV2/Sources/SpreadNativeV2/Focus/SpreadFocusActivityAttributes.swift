#if os(iOS)
import ActivityKit
import Foundation

/// Built into both the native app module and the WidgetKit extension from this
/// single source file. Only an explicit, bounded focus session is represented.
public struct SpreadFocusActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var phase: String
        public var deadline: Date?
        public var remainingSeconds: Int
        /// "focus" or "rest". Nil for a single session.
        public var kind: String?
        public var round: Int?
        public var rounds: Int?
        /// What the Continue control starts once this stretch ends, such as "Start break". Nil when nothing follows.
        public var nextLabel: String?

        public init(phase: String, deadline: Date?, remainingSeconds: Int,
                    kind: String? = nil, round: Int? = nil, rounds: Int? = nil, nextLabel: String? = nil) {
            self.phase = phase
            self.deadline = deadline
            self.remainingSeconds = remainingSeconds
            self.kind = kind
            self.round = round
            self.rounds = rounds
            self.nextLabel = nextLabel
        }
    }

    public let sessionId: String
    public let title: String
    /// The planned day this session works through, as YYYY-MM-DD. Nil for a session started by hand.
    public let day: String?

    public init(sessionId: String, title: String, day: String? = nil) {
        self.sessionId = sessionId
        self.title = title
        self.day = day
    }
}
#endif
