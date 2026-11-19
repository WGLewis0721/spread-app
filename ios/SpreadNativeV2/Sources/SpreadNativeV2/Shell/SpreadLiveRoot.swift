#if os(iOS)
import SwiftUI

/// The native planner shell. SwiftUI owns every visible pixel; the WebKit planner stays headless and is the
/// only writer (every change is an awaited intent through `LivePlanner.send`).
///
/// Life is the app. This root hosts it, presents the sheets every Life screen shares, keeps the widgets and
/// the Focus session in step with the open profile, and shows What's New once per update.
public struct SpreadLiveRoot: View {
    @ObservedObject var planner: LivePlanner
    @StateObject private var focusTimer = SpreadFocusTimer()
    let recovery: () -> Void
    // Capture eligibility before the launch task records the current release as seen.
    private let canOfferFirstWeek: Bool

    @State private var appearance: SpreadAppearance = SpreadAppearancePreference.read()
    @State private var sheet: LiveSheet?
    @State private var firstWeekReplay = 0
    @State private var countedLaunch = false
    /// The launch What's New splash. It carries its own notes, so the sheet is built from exactly the notes that
    /// caused it to open, rather than from a separate value that may not have been set yet.
    @State private var whatsNew: WhatsNewPresentation?
    private struct WhatsNewPresentation: Identifiable {
        let id = UUID()
        let notes: [SpreadReleaseNote]
    }
    @AppStorage(SpreadReleaseNotes.lastSeenKey) private var lastSeenReleaseID = ""
    /// The "Show Life area name outside Spread" switch in the focus sheet. Block labels are written with it.
    @AppStorage("native.focus.showNameOutsideApp") private var showNamesOutsideApp = false

    @Environment(\.scenePhase) private var scenePhase

    public init(planner: LivePlanner, recovery: @escaping () -> Void) {
        self.planner = planner
        self.recovery = recovery
        #if DEBUG && targetEnvironment(simulator)
        // Reset only the guide and release-note preferences for an isolated UI test install.
        if ProcessInfo.processInfo.environment["SPREAD_RITUAL_AUDIT_FIXTURE"] != nil,
           ProcessInfo.processInfo.arguments.contains("-SpreadResetFirstWeekGuide") {
            UserDefaults.standard.removeObject(forKey: LifeFirstWeekStep.handledKey)
            UserDefaults.standard.removeObject(forKey: LifeFirstWeekStep.pendingProfileKey)
            UserDefaults.standard.removeObject(forKey: LifeFirstWeekStep.launchCountKey)
            UserDefaults.standard.removeObject(forKey: SpreadReleaseNotes.lastSeenKey)
        }
        #endif
        let defaults = UserDefaults.standard
        canOfferFirstWeek = !defaults.bool(forKey: LifeFirstWeekStep.handledKey)
            && (defaults.integer(forKey: LifeFirstWeekStep.launchCountKey) == 0
                || defaults.string(forKey: LifeFirstWeekStep.pendingProfileKey) != nil)
    }

    public var body: some View {
        LifeRoot(
            planner: planner,
            focusTimer: focusTimer,
            onMore: { sheet = .more },
            onOpenTask: { sheet = .task($0, $1) },
            onNewRole: { sheet = .newRole },
            canOfferFirstWeek: canOfferFirstWeek,
            firstWeekReplay: firstWeekReplay
        )
        .onChange(of: appearance) { _, value in SpreadAppearancePreference.write(value) }
        .sheet(item: $sheet) { current in sheetContent(current) }
        .alert("Spread", isPresented: errorShown) {
            errorActions
        } message: { Text(planner.error ?? "") }
        .task(id: planner.state?.revision) {
            if let snapshot = planner.snapshot {
                SpreadWidgetPublisher.publish(snapshot: snapshot)
                SpreadLifeCardsPublisher.publish(snapshot: snapshot)
                if let profile = planner.state?.envelope.profileId {
                    SpreadDayPlanPublisher.publish(snapshot: snapshot, profileId: profile)
                }
            }
        }
        .onChange(of: showNamesOutsideApp) { _, _ in
            SpreadFocusPreferences.publishFromApp()
            // Block labels and the focus title are written with the names setting, so write them again now.
            guard let snapshot = planner.snapshot, let profile = planner.state?.envelope.profileId else { return }
            SpreadDayPlanPublisher.publish(snapshot: snapshot, profileId: profile)
            SpreadFocusWidgetPublisher.republishFromStore()
        }
        // The widgets and the island validate a Focus session against the profile recorded here.
        .task(id: planner.state?.envelope.profileId) {
            if let profile = planner.state?.envelope.profileId { focusTimer.noteActiveProfile(profile) }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .background { focusTimer.finishWidgetRefreshOnBackground() }
        }
        .onChange(of: planner.state?.envelope.profileId) { old, new in
            if let new { focusTimer.noteActiveProfile(new) }
            if old != nil && old != new {
                // Never show a previous profile's counts or Life cards after switching profiles.
                SpreadWidgetPublisher.revoke()
                SpreadLifeCardsPublisher.revoke()
                SpreadDayPlanPublisher.clear()
                if let snapshot = planner.snapshot {
                    SpreadWidgetPublisher.publish(snapshot: snapshot)
                    SpreadLifeCardsPublisher.publish(snapshot: snapshot)
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: SpreadFocusControls.didChange)) { _ in
            focusTimer.reloadFromStore()
        }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                if Task.isCancelled { break }
                // The island and the widgets may have changed the session while the app was not running.
                focusTimer.reloadFromStore()
            }
        }
        .task(id: planner.snapshot != nil) {
            // Count a launch only once the plan is on screen, so a launch that dies while loading is not spent.
            if planner.snapshot != nil, !countedLaunch {
                countedLaunch = true
                let defaults = UserDefaults.standard
                defaults.set(defaults.integer(forKey: LifeFirstWeekStep.launchCountKey) + 1,
                             forKey: LifeFirstWeekStep.launchCountKey)
            }
            // Show only when the real planner is ready, not over its launch screen.
            guard let snapshot = planner.snapshot, sheet == nil, whatsNew == nil else { return }
            // A brand-new plan has nothing to catch up on. Its first launch marks the current notes as seen, so
            // What's New waits for the next update rather than covering the empty plan.
            if lastSeenReleaseID.isEmpty, snapshot.isUntouchedFirstRun {
                lastSeenReleaseID = SpreadReleaseNotes.newest(for: SpreadReleaseNotes.appVersion)?.id ?? ""
                return
            }
            let unseen = SpreadReleaseNotes.unseen(
                for: SpreadReleaseNotes.appVersion, lastSeenID: lastSeenReleaseID)
            // One assignment: the item carries the notes, so the sheet cannot open with an empty list.
            if !unseen.isEmpty { whatsNew = WhatsNewPresentation(notes: unseen) }
        }
        .sheet(item: $whatsNew, onDismiss: {
            if let latest = SpreadReleaseNotes.newest(for: SpreadReleaseNotes.appVersion) {
                lastSeenReleaseID = latest.id
            }
        }) { presentation in
            WhatsNewSheet(current: presentation.notes)
        }
    }

    private var errorShown: Binding<Bool> {
        Binding(get: { planner.error != nil }, set: {
            if !$0 {
                planner.error = nil
                planner.hoursShortage = nil
            }
        })
    }

    @ViewBuilder private var errorActions: some View {
        Button("OK") {
            planner.error = nil
            planner.hoursShortage = nil
        }
        if let shortage = planner.hoursShortage {
            Button("Adjust hours") {
                planner.error = nil
                planner.hoursShortage = nil
                sheet = .role(shortage.roleId)
            }
        }
        if planner.errorOffersRetry {
            Button("Retry saving") { Task { planner.error = nil; await planner.send(["type": "retrySave"]) } }
        }
        if planner.errorOffersBackup {
            Button("Backup and restore") { sheet = .backup }
        }
    }

    // MARK: Sheets

    @ViewBuilder private func sheetContent(_ current: LiveSheet) -> some View {
        switch current {
        case .newRole:
            NewSpreadSheet(planner: planner)
        case .role(let roleId):
            RoleSheet(planner: planner, roleId: roleId, onOpenTask: { sheet = .task(roleId, $0) })
        case .task(let roleId, let taskId):
            TaskSheet(planner: planner, roleId: roleId, taskId: taskId)
        case .more:
            MoreSheet(planner: planner, focusTimer: focusTimer, backup: { sheet = .backup },
                      showProfiles: { sheet = .profiles }, replayFirstWeek: {
                          sheet = nil
                          firstWeekReplay += 1
                      }, appearance: $appearance)
        case .profiles:
            ProfilesSheet(planner: planner)
        case .backup:
            BackupRestoreSheet(planner: planner)
        }
    }
}
#endif
