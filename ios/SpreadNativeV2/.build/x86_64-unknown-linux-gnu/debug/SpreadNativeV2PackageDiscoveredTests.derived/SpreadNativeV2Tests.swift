import XCTest
@testable import SpreadNativeV2Tests

fileprivate extension NativeContractsTests {
    @available(*, deprecated, message: "Not actually deprecated. Marked as deprecated to allow inclusion of deprecated tests (which test deprecated functionality) without warnings")
    static nonisolated(unsafe) let __allTests__NativeContractsTests = [
        ("testAllOriginalChalkAssetsAreBundledOffline", testAllOriginalChalkAssetsAreBundledOffline),
        ("testCalendarWeekMappingAtYearBoundaryAndLeapMonth", testCalendarWeekMappingAtYearBoundaryAndLeapMonth),
        ("testCrownCapsLargeGesturesAndResetsOnRelease", testCrownCapsLargeGesturesAndResetsOnRelease),
        ("testCrownCrossingsAndReversalsAreExact", testCrownCrossingsAndReversalsAreExact),
        ("testCrownSubDetentNeverChangesWeek", testCrownSubDetentNeverChangesWeek),
        ("testCrownThatIsNotReleasedAfterACancelEmitsAPhantomOppositeWeek", testCrownThatIsNotReleasedAfterACancelEmitsAPhantomOppositeWeek),
        ("testDialKeepsZeroHourRoleReachable", testDialKeepsZeroHourRoleReachable),
        ("testDialSegmentsUseHoursWithoutChangingData", testDialSegmentsUseHoursWithoutChangingData),
        ("testEmptyDialIsSafe", testEmptyDialIsSafe),
        ("testFiveModesAreOnePresentationEnum", testFiveModesAreOnePresentationEnum),
        ("testHourMathIsProjectedNotPersisted", testHourMathIsProjectedNotPersisted),
        ("testHourStripFallsBackToEqualWidthsWhenNoSplitCanReachTheMinimum", testHourStripFallsBackToEqualWidthsWhenNoSplitCanReachTheMinimum),
        ("testHourStripHandlesEmptyZeroAndBrokenInput", testHourStripHandlesEmptyZeroAndBrokenInput),
        ("testHourStripIsProportionalWhenEverySegmentIsWideEnough", testHourStripIsProportionalWhenEverySegmentIsWideEnough),
        ("testHourStripKeepsEverySegmentAtTheTouchMinimumAndFillsTheRow", testHourStripKeepsEverySegmentAtTheTouchMinimumAndFillsTheRow),
        ("testHundredCrownGesturesAndThirtyReversals", testHundredCrownGesturesAndThirtyReversals),
        ("testLegacyOverbookedWeekMatchesJavaScriptHourArithmetic", testLegacyOverbookedWeekMatchesJavaScriptHourArithmetic),
        ("testMonthGridUsesUniqueCellsAndKeepsTheFirstSixDates", testMonthGridUsesUniqueCellsAndKeepsTheFirstSixDates),
        ("testNativeDayMarkDecodesThePlannersMonthAnswerAndCountsFoldedRoles", testNativeDayMarkDecodesThePlannersMonthAnswerAndCountsFoldedRoles),
        ("testOriginalElevenChalkMappingsAndFallback", testOriginalElevenChalkMappingsAndFallback),
        ("testReadOnlyProjectionJSONHasExactTypeScriptWireShape", testReadOnlyProjectionJSONHasExactTypeScriptWireShape),
        ("testSixtySharedPlannerVectors", testSixtySharedPlannerVectors),
        ("testSnapshotJSONRoundTripDoesNotMutateRecords", testSnapshotJSONRoundTripDoesNotMutateRecords),
        ("testTaskCanOnlyTargetItsOwnResponsibilityAllocation", testTaskCanOnlyTargetItsOwnResponsibilityAllocation)
    ]
}
@available(*, deprecated, message: "Not actually deprecated. Marked as deprecated to allow inclusion of deprecated tests (which test deprecated functionality) without warnings")
func __SpreadNativeV2Tests__allTests() -> [XCTestCaseEntry] {
    return [
        testCase(NativeContractsTests.__allTests__NativeContractsTests)
    ]
}