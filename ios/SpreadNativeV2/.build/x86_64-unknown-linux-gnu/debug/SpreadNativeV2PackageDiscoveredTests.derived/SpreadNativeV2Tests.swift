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
        ("testDialKeepsZeroHourRoleReachable", testDialKeepsZeroHourRoleReachable),
        ("testDialSegmentsUseHoursWithoutChangingData", testDialSegmentsUseHoursWithoutChangingData),
        ("testEmptyDialIsSafe", testEmptyDialIsSafe),
        ("testFiveModesAreOnePresentationEnum", testFiveModesAreOnePresentationEnum),
        ("testHourMathIsProjectedNotPersisted", testHourMathIsProjectedNotPersisted),
        ("testHundredCrownGesturesAndThirtyReversals", testHundredCrownGesturesAndThirtyReversals),
        ("testLegacyOverbookedWeekMatchesJavaScriptHourArithmetic", testLegacyOverbookedWeekMatchesJavaScriptHourArithmetic),
        ("testMonthGridUsesUniqueCellsAndKeepsTheFirstSixDates", testMonthGridUsesUniqueCellsAndKeepsTheFirstSixDates),
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