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

        public init(phase: String, deadline: Date?, remainingSeconds: Int) {
            self.phase = phase
            self.deadline = deadline
            self.remainingSeconds = remainingSeconds
        }
    }

    public let sessionId: String
    public let title: String

    public init(sessionId: String, title: String) {
        self.sessionId = sessionId
        self.title = title
    }
}
#endif
