#if os(iOS)
import SwiftUI

/// One optional focus session at a time, independently of hour budgets and task status.
struct SpreadFocusTimerSheet: View {
    @ObservedObject var timer: SpreadFocusTimer
    let profileId: String
    let roles: [Responsibility]
    @Environment(\.dismiss) private var dismiss
    @AppStorage("native.focus.notifyWhenDone") private var notifyWhenDone = false
    @State private var roleId: String
    @State private var minutes = 25
    @State private var message: String?

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

    var body: some View {
        SpreadSheetStack {
            Form {
                Section {
                    if let current, current.phase != .finished {
                        HStack {
                            Text("Life area")
                            Spacer()
                            Text(current.roleName).foregroundStyle(Spread.secondary)
                        }
                        TimelineView(.periodic(from: .now, by: 1)) { context in
                            Text(SpreadFocusClock.display(current.remaining(at: context.date)))
                                .font(.system(size: 56, weight: .medium, design: .rounded))
                                .monospacedDigit()
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .accessibilityLabel("Focus time remaining")
                                .accessibilityValue(SpreadFocusClock.display(current.remaining(at: context.date)))
                        }
                        .accessibilityIdentifier("focus-time-remaining")
                        if current.phase == .running {
                            Button("Pause") { timer.pause(profileId: profileId) }
                                .frame(maxWidth: .infinity, minHeight: 44)
                                .accessibilityIdentifier("focus-pause")
                        } else {
                            Button("Resume") {
                                timer.resume(profileId: profileId, notify: notifyWhenDone)
                            }
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .accessibilityIdentifier("focus-resume")
                        }
                        Button("Finish session") { timer.finish(profileId: profileId) }
                            .foregroundStyle(Spread.danger)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .accessibilityIdentifier("focus-finish")
                    } else {
                        Picker("Life area", selection: $roleId) {
                            ForEach(roles) { role in
                                Text(role.name).tag(role.id)
                            }
                        }
                        Stepper(value: $minutes, in: 5...240, step: 5) {
                            Text("\(minutes) minutes")
                        }
                        Text(SpreadFocusClock.display(minutes * 60))
                            .font(.system(size: 52, weight: .medium, design: .rounded))
                            .monospacedDigit()
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                        Button("Start focus session") {
                            if !timer.start(profileId: profileId, roleId: roleId,
                                            roleName: roleName, minutes: minutes,
                                            notify: notifyWhenDone) {
                                message = "Finish your other active focus session before starting a new one."
                            } else {
                                message = nil
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .frame(maxWidth: .infinity, minHeight: 50)
                        .disabled(roleId.isEmpty)
                        .accessibilityIdentifier("focus-start")
                    }
                } header: {
                    Text("Focus timer")
                } footer: {
                    Text("Focus time is separate from scheduled hours. Finishing a session never checks off tasks or changes weekly budgets.")
                }

                Section("Outside Spread") {
                    Toggle("Notify when the timer finishes", isOn: $notifyWhenDone)
                        .accessibilityIdentifier("focus-notification-toggle")
                    Text("Notifications are optional and only requested when you turn them on.")
                        .font(.footnote).foregroundStyle(Spread.secondary)
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
        .onChange(of: notifyWhenDone) { _, enabled in
            if enabled {
                Task {
                    if await SpreadLocalAlerts.authorized() {
                        if let current = timer.visibleSession(for: profileId) {
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
