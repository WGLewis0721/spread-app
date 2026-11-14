#if os(iOS)
import SwiftUI

/// One optional focus session at a time, independently of hour budgets and task status. The person starts each
/// focus round, and each break, by tapping. Spread never starts one for them.
struct SpreadFocusTimerSheet: View {
    // The large clock digits scale with Dynamic Type (board: Dynamic Type supported), at the same 56 and 52 pt default.
    @ScaledMetric(relativeTo: .largeTitle) private var countdownSize: CGFloat = 56
    @ScaledMetric(relativeTo: .largeTitle) private var planSize: CGFloat = 52
    @ObservedObject var timer: SpreadFocusTimer
    let profileId: String
    let roles: [Responsibility]
    @Environment(\.dismiss) private var dismiss
    @AppStorage("native.focus.notifyWhenDone") private var notifyWhenDone = false
    @AppStorage("native.focus.liveActivityEnabled") private var showLiveTimer = false
    @AppStorage("native.focus.showNameOutsideApp") private var showNameOutsideApp = false
    @State private var roleId: String
    @State private var focusMinutes = SpreadFocusPlan.standard.focusMinutes
    @State private var breakMinutes = SpreadFocusPlan.standard.breakMinutes
    @State private var rounds = SpreadFocusPlan.standard.rounds
    @State private var message: String?
    @State private var customFocusExpanded = false
    @State private var outsideSettingsExpanded = false

    init(timer: SpreadFocusTimer, profileId: String, roles: [Responsibility],
         preferredRoleId: String?) {
        self.timer = timer
        self.profileId = profileId
        self.roles = roles
        _roleId = State(initialValue: preferredRoleId ?? roles.first?.id ?? "")
    }

    private var current: SpreadFocusSession? { timer.visibleSession(for: profileId) }
    private var roleName: String {
        roles.first(where: { $0.id == roleId })?.name ?? "Life area"
    }
    private var plan: SpreadFocusPlan {
        SpreadFocusPlan(focusMinutes: focusMinutes, breakMinutes: breakMinutes, rounds: rounds)
    }

    /// Today's planned block: what it is, how it splits into rounds, and one start. Only the planner's hours are
    /// used, and the plan is never changed.
    @ViewBuilder private func todaysBlockRows(_ offered: SpreadOfferedBlock) -> some View {
        let name = roles.first(where: { $0.id == offered.entry.roleId })?.name ?? offered.entry.label
        VStack(alignment: .leading, spacing: 8) {
            Text("\(name) · \(SpreadBlockText.hours(offered.entry.hours)) planned")
                .font(.headline)
                .foregroundStyle(Spread.ink)
            Text(SpreadBlockText.summary(offered.entry.plan))
                .font(.subheadline)
                .foregroundStyle(Spread.secondary)
            Button("Start today's block") {
                if timer.startBlock(offered, notify: notifyWhenDone) {
                    message = nil
                } else {
                    message = "Finish your other active focus session before starting a new one."
                }
            }
            .buttonStyle(.borderedProminent)
            .frame(maxWidth: .infinity, minHeight: 50)
            .accessibilityIdentifier("focus-start-block")
        }
        .padding(.vertical, 4)
    }

    /// "Focus · round 2 of 4", "Break", or "Focus session" for a single stretch.
    private func stageText(_ session: SpreadFocusSession) -> String {
        let name = session.currentKind == .rest ? "Break" : "Focus"
        return session.roundCount > 1 ? "\(name) · round \(session.roundNumber) of \(session.roundCount)" : "\(name) session"
    }

    /// True when a stretch ended and something may follow it once the person taps for it.
    private func isWaiting(_ session: SpreadFocusSession) -> Bool {
        session.phase == .finished && SpreadFocusMachine.nextLabel(after: session) != nil
    }


    /// Group primary transport separately from session-ending controls.
    /// Native ViewThatFits keeps large-text layouts from crowding the targets.
    @ViewBuilder private func transportRow(_ session: SpreadFocusSession) -> some View {
        let next = SpreadFocusMachine.nextLabel(after: session)
        if session.phase == .finished {
            HStack(spacing: 8) {
                Button {
                    timer.forward(profileId: profileId, notify: notifyWhenDone)
                } label: {
                    Label(next ?? "Start next step", systemImage: "play.fill")
                        .frame(maxWidth: .infinity, minHeight: 50)
                }
                .buttonStyle(.borderedProminent)
                .disabled(next == nil)
                .accessibilityIdentifier("focus-play-next")
                Button {
                    timer.cancel(profileId: profileId)
                } label: {
                    Image(systemName: "xmark").frame(minWidth: 44, minHeight: 44)
                }
                .buttonStyle(.bordered)
                .tint(Spread.danger)
                .accessibilityLabel("Cancel session")
                .accessibilityHint("Ends the entire focus session")
                .accessibilityIdentifier("focus-cancel")
            }
            .accessibilityIdentifier("focus-media-controls")
        } else {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 8) {
                    mediaActions(session, next: next)
                    Spacer(minLength: 12)
                    endingActions()
                }
                VStack(spacing: 8) {
                    mediaActions(session, next: next)
                    endingActions()
                }
            }
            .frame(maxWidth: .infinity)
            .accessibilityIdentifier("focus-media-controls")
        }
    }

    private func mediaActions(_ session: SpreadFocusSession, next: String?) -> some View {
        HStack(spacing: 8) {
            Button {
                if session.phase == .running {
                    timer.pause(profileId: profileId)
                } else {
                    timer.resume(profileId: profileId, notify: notifyWhenDone)
                }
            } label: {
                Image(systemName: session.phase == .running ? "pause.fill" : "play.fill")
                    .frame(minWidth: 44, minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            .accessibilityLabel(session.phase == .running ? "Pause" : "Resume")
            .accessibilityIdentifier(session.phase == .running ? "focus-pause" : "focus-resume")
            Button {
                timer.forward(profileId: profileId, notify: notifyWhenDone)
            } label: {
                Image(systemName: "forward.fill").frame(minWidth: 44, minHeight: 44)
            }
            .buttonStyle(.bordered)
            .disabled(next == nil)
            .accessibilityLabel(next.map { "Forward: " + $0 } ?? "Forward unavailable, no next step")
            .accessibilityIdentifier("focus-forward")
        }
        .font(.title3.weight(.semibold))
    }

    private func endingActions() -> some View {
        HStack(spacing: 8) {
            Button {
                timer.stop(profileId: profileId)
            } label: {
                Image(systemName: "stop.fill").frame(minWidth: 44, minHeight: 44)
            }
            .buttonStyle(.bordered)
            .accessibilityLabel("Stop this stretch")
            .accessibilityHint("Keeps any following round waiting for you")
            .accessibilityIdentifier("focus-stop")
            Button {
                timer.cancel(profileId: profileId)
            } label: {
                Image(systemName: "xmark").frame(minWidth: 44, minHeight: 44)
            }
            .buttonStyle(.bordered)
            .tint(Spread.danger)
            .accessibilityLabel("Cancel session")
            .accessibilityHint("Ends the entire focus session")
            .accessibilityIdentifier("focus-cancel")
        }
        .font(.title3.weight(.semibold))
    }

    /// The custom timer remains a genuine alternative to today's planned block.
    @ViewBuilder private var customFocusFields: some View {
        Picker("Life area", selection: $roleId) {
            ForEach(roles) { role in
                Text(role.name).tag(role.id)
            }
        }
        Stepper(value: $focusMinutes, in: 5...240, step: 5) {
            Text("Focus \(focusMinutes) minutes")
        }
        Stepper(value: $rounds, in: 1...8) {
            Text(rounds == 1 ? "One focus session, no break" : "\(rounds) focus rounds with breaks")
        }
        .accessibilityIdentifier("focus-rounds")
        if rounds > 1 {
            Stepper(value: $breakMinutes, in: 1...60) {
                Text("Break \(breakMinutes) minutes")
            }
            .accessibilityIdentifier("focus-break-minutes")
        }
        Text(SpreadFocusClock.display(focusMinutes * 60))
            .font(.system(size: planSize, weight: .medium, design: .rounded))
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.65)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
        Button(rounds > 1 ? "Start round 1" : "Start focus session") {
            if !timer.startPlan(profileId: profileId, roleId: roleId, roleName: roleName,
                                plan: plan, notify: notifyWhenDone) {
                message = "Finish your other active focus session before starting a new one."
            } else {
                message = nil
            }
        }
        .buttonStyle(.borderedProminent)
        .frame(maxWidth: .infinity, minHeight: 50)
        .disabled(roleId.isEmpty || !plan.isValid)
        .accessibilityIdentifier("focus-start")
        Text("Focus time never changes scheduled hours or completes tasks. Breaks start only when tapped.")
            .font(.footnote)
            .foregroundStyle(Spread.secondary)
    }

    var body: some View {
        SpreadSheetStack {
            Form {
                if let current, current.phase != .finished {
                    Section("Focus timer") {
                        HStack(spacing: 8) {
                            Text("Life area")
                            Spacer(minLength: 8)
                            Text(current.roleName)
                                .foregroundStyle(Spread.secondary)
                                .multilineTextAlignment(.trailing)
                        }
                        Text(stageText(current))
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Spread.secondary)
                            .accessibilityIdentifier("focus-stage")
                        TimelineView(.periodic(from: .now, by: 1)) { context in
                            Text(SpreadFocusClock.display(current.remaining(at: context.date)))
                                .font(.system(size: countdownSize, weight: .medium, design: .rounded))
                                .monospacedDigit()
                                .lineLimit(1)
                                .minimumScaleFactor(0.65)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .accessibilityLabel("Time remaining")
                                .accessibilityValue(SpreadFocusClock.display(current.remaining(at: context.date)))
                        }
                        .accessibilityIdentifier("focus-time-remaining")
                        transportRow(current)
                    }
                } else if let current, isWaiting(current) {
                    Section("Next step") {
                        Text(current.stoppedEarly == true
                             ? "Stopped. Start the next step when you're ready."
                             : (current.currentKind == .rest
                                ? "Break is over. Start the next focus round when you're ready."
                                : "Round \(current.roundNumber) is done. Start your break when you're ready."))
                            .font(.subheadline)
                            .foregroundStyle(Spread.secondary)
                            .accessibilityIdentifier("focus-waiting")
                        transportRow(current)
                    }
                } else {
                    if let offered = SpreadDayPlanStore.nextBlock(now: Date()) {
                        Section("Today's block") {
                            todaysBlockRows(offered)
                        }
                        Section {
                            DisclosureGroup("Set your own focus session", isExpanded: $customFocusExpanded) {
                                customFocusFields
                            }
                        }
                    } else {
                        if SpreadDayPlanStore.allDoneToday(now: Date()) {
                            Section {
                                Text("Today's planned blocks are done. Nothing else is started for you.")
                                    .font(.subheadline)
                                    .foregroundStyle(Spread.secondary)
                                    .accessibilityIdentifier("focus-blocks-done")
                            }
                        }
                        Section("Custom focus") {
                            customFocusFields
                        }
                    }
                }
                Section("Outside Spread") {
                    DisclosureGroup("Display & reminders", isExpanded: $outsideSettingsExpanded) {
                        Toggle("Notify when a stretch ends", isOn: $notifyWhenDone)
                            .accessibilityIdentifier("focus-notification-toggle")
                        Toggle("Show active timer on Lock Screen and Dynamic Island", isOn: $showLiveTimer)
                            .accessibilityIdentifier("focus-live-activity-toggle")
                        Toggle("Show Life area name outside Spread", isOn: $showNameOutsideApp)
                            .disabled(current?.phase == .running)
                            .accessibilityIdentifier("focus-live-activity-name")
                        Text("Notifications are optional and only requested when you turn them on. Life area names appear on the Lock Screen, the Dynamic Island and the timer widget only while the name switch is on. It can't change during a session.")
                            .font(.footnote)
                            .foregroundStyle(Spread.secondary)
                    }
                    .accessibilityIdentifier("focus-outside-settings")
                }
                if let message {
                    Section {
                        Label(message, systemImage: "info.circle")
                            .foregroundStyle(Spread.secondary)
                    }
                }
            }
            .spreadListSurface()
            .navigationTitle("Focus Timer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }.frame(minHeight: 44)
                }
            }
        }
        .onChange(of: showLiveTimer) { _, enabled in
            SpreadFocusPreferences.publishFromApp()
            if enabled {
                if let current, SpreadFocusMachine.isOnScreen(current) {
                    SpreadFocusLiveActivityController.refresh(current)
                }
            } else {
                SpreadFocusLiveActivityController.end()
            }
        }
        .onChange(of: notifyWhenDone) { _, enabled in
            SpreadFocusPreferences.publishFromApp()
            if enabled {
                Task {
                    if await SpreadLocalAlerts.authorized() {
                        if let current, current.phase == .running {
                            await SpreadLocalAlerts.scheduleFocus(current)
                        }
                    } else {
                        notifyWhenDone = false
                        message = "Notifications are disabled in iOS Settings."
                    }
                }
            } else {
                SpreadLocalAlerts.cancelFocus()
            }
        }
        .onChange(of: showNameOutsideApp) { _, _ in
            SpreadFocusPreferences.publishFromApp()
            SpreadFocusWidgetPublisher.republishFromStore()
        }
    }
}

/// A local calendar reminder, not an invented time from a day allocation.
struct SpreadReminderSettingsSheet: View {
    @AppStorage("native.reminder.enabled") private var enabled = false
    @AppStorage("native.reminder.hour") private var hour = 8
    @AppStorage("native.reminder.minute") private var minute = 0
    @State private var message: String?
    @Environment(\.dismiss) private var dismiss

    private var reminderTime: Binding<Date> {
        Binding(
            get: {
                let midnight = Calendar.current.startOfDay(for: Date())
                return Calendar.current.date(byAdding: .minute, value: hour * 60 + minute, to: midnight) ?? Date()
            },
            set: { date in
                let components = Calendar.current.dateComponents([.hour, .minute], from: date)
                hour = components.hour ?? 8
                minute = components.minute ?? 0
                if enabled { Task { await updateSchedule() } }
            }
        )
    }
    private func updateSchedule() async {
        if enabled {
            let ok = await SpreadLocalAlerts.scheduleDailyReminder(hour: hour, minute: minute)
            if !ok {
                enabled = false
                message = "Notifications were not enabled. Check iOS Settings."
            } else { message = nil }
        } else {
            SpreadLocalAlerts.cancelDailyReminder()
        }
    }

    var body: some View {
        SpreadSheetStack {
            Form {
                Section {
                    Toggle("Remind me to plan each day", isOn: $enabled)
                        .accessibilityIdentifier("daily-reminder-toggle")
                    if enabled {
                        DatePicker("Reminder time", selection: reminderTime, displayedComponents: .hourAndMinute)
                            .accessibilityIdentifier("daily-reminder-time")
                    }
                } footer: {
                    Text("Spread reminds you to review your day. Hours placed on a day do not imply a start time.")
                }
                if let message {
                    Section { Text(message).foregroundStyle(Spread.secondary) }
                }
            }
            .spreadListSurface()
            .navigationTitle("Daily Reminder")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) {
                Button("Done") { dismiss() }.frame(minHeight: 44)
            } }
        }
        .onChange(of: enabled) { _, _ in Task { await updateSchedule() } }
    }
}
#endif
