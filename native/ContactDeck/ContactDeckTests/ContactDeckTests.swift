import XCTest
import SwiftData
@testable import ContactDeck

final class ContactDeckTests: XCTestCase {
    func testProjectedSwipeIsBoundedAndHasInertia() {
        XCTAssertEqual(DeckPhysics.destination(position: 3, translation: -45, predicted: -600, stride: 150, count: 8), 4)
        XCTAssertEqual(DeckPhysics.destination(position: 7, translation: -600, predicted: -1600, stride: 150, count: 8), 7)
        XCTAssertEqual(DeckPhysics.destination(position: 0, translation: 600, predicted: 1600, stride: 150, count: 8), 0)
        XCTAssertEqual(DeckPhysics.destination(position: 0, translation: 0, predicted: 0, stride: 150, count: 0), 0)
    }
    func testReconnectWaitsForThresholdAndRespectsSnoozeAndRemoval() {
        let now = Date()
        let c = DeckContact(name: "Test", favorite: true)
        c.createdAt = now.addingTimeInterval(-8 * 86_400)
        XCTAssertTrue(c.reconnectDue(now: now))
        c.snoozedUntil = now.addingTimeInterval(100)
        XCTAssertFalse(c.reconnectDue(now: now))
        c.snoozedUntil = nil; c.lastReachedOut = now
        XCTAssertFalse(c.reconnectDue(now: now))
        c.lastReachedOut = nil; c.removedAt = now
        XCTAssertFalse(c.reconnectDue(now: now))
    }
    @MainActor func testSavedNoteAndSoftRemovalSurviveReopeningStore() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".store")
        defer { for suffix in ["", "-shm", "-wal"] { try? FileManager.default.removeItem(atPath: url.path + suffix) } }
        let configuration = ModelConfiguration(url: url, cloudKitDatabase: .none)
        let id: UUID
        do {
            let store = try ModelContainer(for: DeckContact.self, ContactDeck.self, configurations: configuration)
            let c = DeckContact(name: "Saved", phone: "5550123")
            id = c.id; c.note = "Ask about the workshop"; c.removedAt = Date()
            store.mainContext.insert(c); try store.mainContext.save()
        }
        let reopened = try ModelContainer(for: DeckContact.self, ContactDeck.self, configurations: configuration)
        let c = try XCTUnwrap(reopened.mainContext.fetch(FetchDescriptor<DeckContact>()).first)
        XCTAssertEqual(c.id, id); XCTAssertEqual(c.note, "Ask about the workshop"); XCTAssertNotNil(c.removedAt)
        c.removedAt = nil; try reopened.mainContext.save()
        XCTAssertNil(c.removedAt)
    }
    func testSearchAndSamplesAreExplicit() {
        let c = SampleContacts.make()[0]
        XCTAssertTrue(c.isSample)
        XCTAssertTrue(c.matches("334555")); XCTAssertTrue(c.matches("APEX")); XCTAssertFalse(c.matches("no-match"))
    }
}
