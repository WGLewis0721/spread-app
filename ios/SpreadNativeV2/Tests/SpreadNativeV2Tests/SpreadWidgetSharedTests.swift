import XCTest
@testable import SpreadNativeV2

final class SpreadWidgetSharedTests: XCTestCase {
    private let chicago = TimeZone(identifier: "America/Chicago")!

    // MARK: Focus mirror

    private func running(endingIn seconds: TimeInterval, from now: Date, duration: Int = 1500) -> SpreadFocusWidgetState {
        SpreadFocusWidgetState(sessionId: "s", phase: .running, endAt: now.addingTimeInterval(seconds),
                               pausedSeconds: duration, durationSeconds: duration,
                               title: "Focus session", writtenAt: now)
    }

    func testRunningSessionCountsDownToItsDeadlineAndRoundsUp() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let state = running(endingIn: 90, from: now)
        XCTAssertEqual(state.remaining(at: now), 90)
        XCTAssertEqual(state.remaining(at: now.addingTimeInterval(30.2)), 60)
        XCTAssertEqual(state.remaining(at: now.addingTimeInterval(89.5)), 1)
        XCTAssertEqual(state.remaining(at: now.addingTimeInterval(500)), 0)
    }

    func testPausedSessionIsFrozenWhateverTheClockSays() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let state = SpreadFocusWidgetState(sessionId: "s", phase: .paused, endAt: nil, pausedSeconds: 612,
                                           durationSeconds: 1500, title: "Focus session", writtenAt: now)
        XCTAssertEqual(state.remaining(at: now), 612)
        XCTAssertEqual(state.remaining(at: now.addingTimeInterval(86_400)), 612)
        XCTAssertFalse(state.isFinished(at: now.addingTimeInterval(86_400)))
    }

    func testRunningPastItsDeadlineReadsAsFinished() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let state = running(endingIn: 60, from: now)
        XCTAssertFalse(state.isFinished(at: now))
        XCTAssertTrue(state.isFinished(at: now.addingTimeInterval(61)))
    }

    func testElapsedFractionStaysInsideZeroToOne() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let state = running(endingIn: 750, from: now, duration: 1500)
        XCTAssertEqual(state.elapsedFraction(at: now), 0.5, accuracy: 0.001)
        XCTAssertEqual(state.elapsedFraction(at: now.addingTimeInterval(10_000)), 1, accuracy: 0.001)
        XCTAssertEqual(state.elapsedFraction(at: now.addingTimeInterval(-10_000)), 0, accuracy: 0.001)
    }

    func testTimelineHasAnEntryAtTheDeadlineSoTheFaceFlipsByItself() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let state = running(endingIn: 300, from: now)
        XCTAssertEqual(state.timelineDates(from: now), [now, now.addingTimeInterval(300)])
        XCTAssertEqual(state.timelineDates(from: now.addingTimeInterval(301)), [now.addingTimeInterval(301)])
        let paused = SpreadFocusWidgetState(sessionId: "s", phase: .paused, endAt: nil, pausedSeconds: 60,
                                            durationSeconds: 1500, title: "Focus session", writtenAt: now)
        XCTAssertEqual(paused.timelineDates(from: now), [now])
    }

    func testClockTextAndSpokenText() {
        XCTAssertEqual(SpreadFocusWidgetState.clockText(0), "0:00")
        XCTAssertEqual(SpreadFocusWidgetState.clockText(59), "0:59")
        XCTAssertEqual(SpreadFocusWidgetState.clockText(1499), "24:59")
        XCTAssertEqual(SpreadFocusWidgetState.clockText(3900), "1:05:00")
        XCTAssertEqual(SpreadFocusWidgetState.clockText(-5), "0:00")
        XCTAssertEqual(SpreadFocusWidgetState.spokenText(1499), "24 minutes 59 seconds")
        XCTAssertEqual(SpreadFocusWidgetState.spokenText(3900), "1 hour 5 minutes")
        XCTAssertEqual(SpreadFocusWidgetState.spokenText(60), "1 minute")
        XCTAssertEqual(SpreadFocusWidgetState.spokenText(0), "0 seconds")
    }

    func testFocusStateSurvivesTheAppGroupRoundTrip() throws {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let state = running(endingIn: 600, from: now)
        let data = try JSONEncoder().encode(state)
        XCTAssertEqual(try JSONDecoder().decode(SpreadFocusWidgetState.self, from: data), state)
    }

    // MARK: Dates

    func testWeekKeyMatchesThePlannersOwnWeekMathInAnyTimeZone() {
        let zones = [chicago, TimeZone(identifier: "UTC")!, TimeZone(identifier: "Pacific/Auckland")!]
        for zone in zones {
            var calendar = Calendar(identifier: .gregorian)
            calendar.timeZone = zone
            // Every day for six weeks, including late evenings that are already tomorrow in UTC.
            for offset in 0..<42 {
                for hour in [0, 9, 23] {
                    let start = DateComponents(year: 2026, month: 11, day: 1, hour: hour, minute: 30)
                    let date = calendar.date(byAdding: .day, value: offset, to: calendar.date(from: start)!)!
                    let planner = PlannerDates.weekKey(for: PlannerDates.date(PlannerDates.localISO(date, in: zone)))
                    XCTAssertEqual(SpreadWidgetDates.weekKey(for: date, in: zone), planner,
                                   "\(zone.identifier) day +\(offset) hour \(hour)")
                }
            }
        }
    }

    func testSundayBelongsToTheWeekThatStartedOnMonday() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = chicago
        let sunday = calendar.date(from: DateComponents(year: 2027, month: 1, day: 17, hour: 22, minute: 14))!
        XCTAssertEqual(SpreadWidgetDates.dayISO(sunday, in: chicago), "2027-01-17")
        XCTAssertEqual(SpreadWidgetDates.weekKey(for: sunday, in: chicago), "2027-01-11")
    }

    // MARK: Life cards

    private func card(_ id: String, hours: Double = 2) -> SpreadLifeCardWidgetCard {
        SpreadLifeCardWidgetCard(id: id, name: id.capitalized, category: "fitness", colorHex: "#485B4E",
                                 budgetHours: hours, placedHours: 0, days: [0, 0, 0, 0, 0, 0, 0])
    }

    func testSteppingWrapsAtBothEnds() {
        let cards = [card("a"), card("b"), card("c")]
        XCTAssertEqual(SpreadLifeCardsNav.stepped(.next, from: "a", in: cards), "b")
        XCTAssertEqual(SpreadLifeCardsNav.stepped(.next, from: "c", in: cards), "a")
        XCTAssertEqual(SpreadLifeCardsNav.stepped(.previous, from: "a", in: cards), "c")
        XCTAssertEqual(SpreadLifeCardsNav.stepped(.previous, from: "b", in: cards), "a")
    }

    func testSteppingFromAMissingOrNilSelectionStartsAtTheFirstCard() {
        let cards = [card("a"), card("b"), card("c")]
        XCTAssertEqual(SpreadLifeCardsNav.stepped(.next, from: nil, in: cards), "b")
        XCTAssertEqual(SpreadLifeCardsNav.stepped(.next, from: "deleted", in: cards), "b")
        XCTAssertNil(SpreadLifeCardsNav.stepped(.next, from: "a", in: []))
    }

    func testResolvedFallsBackToTheFirstCardWhenTheSelectionIsGone() {
        let cards = [card("a"), card("b")]
        XCTAssertEqual(SpreadLifeCardsNav.resolved(selectedId: "b", in: cards)?.id, "b")
        XCTAssertEqual(SpreadLifeCardsNav.resolved(selectedId: "gone", in: cards)?.id, "a")
        XCTAssertNil(SpreadLifeCardsNav.resolved(selectedId: "a", in: []))
    }

    func testPositionIsOneBased() {
        let cards = [card("a"), card("b"), card("c")]
        let position = SpreadLifeCardsNav.position(of: "c", in: cards)
        XCTAssertEqual(position.index, 3)
        XCTAssertEqual(position.count, 3)
    }

    func testSnapshotIsCurrentOnlyInItsOwnWeek() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = chicago
        let tuesday = calendar.date(from: DateComponents(year: 2026, month: 11, day: 10, hour: 12))!
        let nextMonday = calendar.date(from: DateComponents(year: 2026, month: 11, day: 16, hour: 0, minute: 5))!
        let snapshot = SpreadLifeCardsWidgetSnapshot(weekKey: "2026-11-09", cards: [card("a")], writtenAt: tuesday)
        XCTAssertTrue(snapshot.isCurrent(at: tuesday, in: chicago))
        XCTAssertFalse(snapshot.isCurrent(at: nextMonday, in: chicago))
    }

    func testBuilderMirrorsTheLifeCardHoursAndOrder() {
        let snapshot = PlannerSnapshot(
            weekKey: "2026-11-09",
            roles: [
                Responsibility(id: "fitness", name: "Fitness", category: "fitness", color: "#485B4E", hours: 6),
                Responsibility(id: "school", name: "School", category: "school", color: "#665178", hours: 3)
            ],
            allocations: [
                DayAllocation(id: "f1", roleId: "fitness", day: "2026-11-10", hours: 2),
                DayAllocation(id: "f2", roleId: "fitness", day: "2026-11-12", hours: 1.5),
                DayAllocation(id: "elsewhere", roleId: "fitness", day: "2026-11-17", hours: 4)
            ],
            tasks: [])
        let built = SpreadLifeCardsWidgetBuilder.make(from: snapshot, writtenAt: Date(timeIntervalSince1970: 1))
        XCTAssertEqual(built.weekKey, "2026-11-09")
        XCTAssertEqual(built.cards.map(\.id), ["fitness", "school"])
        XCTAssertEqual(built.cards[0].days, [0, 2, 0, 1.5, 0, 0, 0])
        XCTAssertEqual(built.cards[0].placedHours, 3.5)
        XCTAssertEqual(built.cards[0].budgetHours, 6)
        XCTAssertEqual(built.cards[0].colorHex, "#485B4E")
        XCTAssertEqual(built.cards[1].placedHours, 0)
    }

    func testBuilderCarriesNoTaskText() throws {
        let snapshot = PlannerSnapshot(
            weekKey: "2026-11-09",
            roles: [Responsibility(id: "r", name: "R", category: "work", color: "#111111", hours: 1)],
            allocations: [],
            tasks: [PlannerTask(id: "t", roleId: "r", text: "Call the lawyer about the settlement",
                                done: false, allocationId: nil)])
        let built = SpreadLifeCardsWidgetBuilder.make(from: snapshot)
        let json = String(data: try JSONEncoder().encode(built), encoding: .utf8) ?? ""
        XCTAssertFalse(json.contains("lawyer"))
        XCTAssertFalse(json.contains("settlement"))
    }

    // MARK: Colors

    func testHexColorsParseWithAndWithoutTheHashAndInShortForm() throws {
        let long = try XCTUnwrap(SpreadWidgetColor.rgb(hex: "#485B4E"))
        XCTAssertEqual(long.red, 72.0 / 255, accuracy: 0.0001)
        XCTAssertEqual(long.green, 91.0 / 255, accuracy: 0.0001)
        XCTAssertEqual(long.blue, 78.0 / 255, accuracy: 0.0001)
        let bare = try XCTUnwrap(SpreadWidgetColor.rgb(hex: "FF3470"))
        XCTAssertEqual(bare.red, 1, accuracy: 0.0001)
        let short = try XCTUnwrap(SpreadWidgetColor.rgb(hex: "#0F0"))
        XCTAssertEqual(short.green, 1, accuracy: 0.0001)
        XCTAssertEqual(short.red, 0, accuracy: 0.0001)
    }

    func testBadColorTextIsRejectedSoTheWidgetUsesItsFallback() {
        for bad in ["", "#", "#12", "#GGGGGG", "#1234567", "red"] {
            XCTAssertNil(SpreadWidgetColor.rgb(hex: bad), bad)
        }
    }

    // MARK: Links

    func testLinksRoundTripIncludingAwkwardIds() {
        let links: [SpreadWidgetLink] = [
            .today, .focus, .lifeCard("fitness"),
            .lifeCard("a b&c=d?e#f"), .lifeCard("ünï-cødé"), .lifeCard("9F2B-77")
        ]
        for link in links {
            XCTAssertEqual(SpreadWidgetLink.parse(link.url), link, link.url.absoluteString)
        }
        XCTAssertEqual(SpreadWidgetLink.today.url.absoluteString, "spread://today")
        XCTAssertEqual(SpreadWidgetLink.focus.url.absoluteString, "spread://focus")
        XCTAssertEqual(SpreadWidgetLink.lifeCard("fitness").url.absoluteString, "spread://life?card=fitness")
    }

    func testParsingRejectsForeignOrIncompleteLinks() {
        XCTAssertNil(SpreadWidgetLink.parse(URL(string: "https://life?card=a")!))
        XCTAssertNil(SpreadWidgetLink.parse(URL(string: "spread://unknown")!))
        XCTAssertNil(SpreadWidgetLink.parse(URL(string: "spread://life")!))
        XCTAssertNil(SpreadWidgetLink.parse(URL(string: "spread://life?card=")!))
        XCTAssertNil(SpreadWidgetLink.parse(URL(string: "spread://life?other=a")!))
    }
}
