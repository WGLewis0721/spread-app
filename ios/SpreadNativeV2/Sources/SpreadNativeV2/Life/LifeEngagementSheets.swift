#if os(iOS)
import SwiftUI
import UIKit

/// A full-screen retrospective of the selected week's saved planner activity.
struct LifeWeekReviewSheet: View {
    let snapshot: PlannerSnapshot
    let onWeekAhead: () -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
    @Environment(\.dynamicTypeSize) private var typeSize
    @AccessibilityFocusState private var focusedPage: Int?
    @State private var page = 0
    @State private var elapsed = 0.0
    @State private var playbackPreference: Bool?
    @State private var appIsActive = UIApplication.shared.applicationState == .active
    @State private var holding = false
    @State private var didHold = false
    @State private var forward = true

    private enum Scene {
        case opening, hours, area(Responsibility), noAreas, tasks, highlight

        var seconds: Double {
            if case .area = self { return 8 }
            return 6
        }
    }

    private var scenes: [Scene] {
        let areas: [Scene] = snapshot.roles.isEmpty ? [.noAreas] : snapshot.roles.map(Scene.area)
        return [.opening, .hours] + areas + [.tasks, .highlight]
    }

    private var scene: Scene { scenes[page] }
    private var lastPage: Int { scenes.count - 1 }
    private var manualMode: Bool {
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("-SpreadPauseReviewForAudit") { return true }
        #endif
        return voiceOver || reduceMotion || typeSize.isAccessibilitySize
    }
    private var autoplay: Bool { playbackPreference ?? !manualMode }
    private var playing: Bool {
        autoplay && !holding && appIsActive && page < lastPage
    }

    private var placed: Double { snapshot.allocations.reduce(0) { $0 + $1.hours } }
    private var budget: Double { snapshot.roles.reduce(0) { $0 + $1.hours } }
    private var completed: Int { snapshot.tasks.filter(\.done).count }
    private var topRole: Responsibility? {
        snapshot.roles.filter { snapshot.placedHours(for: $0.id) > 0 }.max {
            let a = snapshot.placedHours(for: $0.id)
            let b = snapshot.placedHours(for: $1.id)
            return a == b ? $0.name > $1.name : a < b
        }
    }

    private var artworkRole: Responsibility? {
        switch scene {
        case .opening: topRole ?? snapshot.roles.first
        case .area(let role): role
        case .highlight: topRole
        default: nil
        }
    }

    var body: some View {
        GeometryReader { viewport in
            VStack(spacing: 0) {
                header
                ScrollView {
                    sceneContent
                        .frame(maxWidth: 640, minHeight: max(0, viewport.size.height * 0.57),
                               alignment: .bottomLeading)
                        .padding(.horizontal, Spread.space6)
                        .padding(.vertical, Spread.space4)
                        .frame(maxWidth: .infinity)
                }
                .id(page)
                .transition(.asymmetric(
                    insertion: .offset(x: forward ? 24 : -24, y: 0).combined(with: .opacity),
                    removal: .opacity
                ))
                .clipped()
                .contentShape(Rectangle())
                .onLongPressGesture(minimumDuration: 0.2) {
                    didHold = true
                } onPressingChanged: { pressed in
                    if pressed { didHold = false }
                    holding = pressed
                }
                .simultaneousGesture(SpatialTapGesture().onEnded { tap in
                    guard !didHold, !voiceOver else { return }
                    if tap.location.x < viewport.size.width * 0.22 { move(-1) }
                    if tap.location.x > viewport.size.width * 0.78 { move(1) }
                })
                .safeAreaInset(edge: .bottom, spacing: 0) { controls }
            }
        }
        .background { backdrop }
        .foregroundStyle(.white)
        .statusBarHidden()
        .onAppear { appIsActive = UIApplication.shared.applicationState == .active }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
            appIsActive = true
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.willResignActiveNotification)) { _ in
            appIsActive = false
        }
        .task(id: playing ? page : nil) {
            guard playing else { return }
            let clock = ContinuousClock()
            let start = clock.now
            let initial = elapsed
            let duration = scene.seconds
            let startPage = page
            while !Task.isCancelled && playing {
                do { try await Task.sleep(for: .milliseconds(33)) }
                catch { return }
                guard !Task.isCancelled, playing, page == startPage else { return }
                let time = start.duration(to: clock.now).components
                elapsed = min(duration, initial + Double(time.seconds) + Double(time.attoseconds) / 1e18)
                if elapsed >= duration {
                    move(1)
                    return
                }
            }
        }
        .onChange(of: manualMode) { _, _ in playbackPreference = nil }
        .onChange(of: page) { _, page in focusedPage = page }
    }

    private var backdrop: some View {
        ZStack {
            Spread.artGround
            if let role = artworkRole {
                LifeEditorialArtwork(category: role.category, roleColor: Color(hex: role.color))
                    .overlay(alignment: .bottom) {
                        LinearGradient(colors: [.clear, Spread.artGround],
                                       startPoint: .top, endPoint: .bottom)
                    }
                    .id(role.id)
                    .transition(.opacity)
            }
        }
        .ignoresSafeArea()
        .accessibilityHidden(true)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Spread.space2) {
            HStack(spacing: scenes.count > 24 ? 1 : Spread.space1) {
                ForEach(scenes.indices, id: \.self) { index in
                    GeometryReader { geometry in
                        Capsule().fill(.white.opacity(0.35))
                            .overlay(alignment: .leading) {
                                Capsule().fill(.white)
                                    .frame(width: geometry.size.width * progress(at: index))
                            }
                    }
                }
            }
            .frame(height: 4)
            .accessibilityHidden(true)

            HStack {
                VStack(alignment: .leading, spacing: Spread.space1) {
                    Text("Week in Review").font(Spread.headline)
                    Text(PlannerDates.weekRange(base: snapshot.weekKey, offset: 0))
                        .font(Spread.footnote)
                }
                .accessibilityElement(children: .combine)
                .accessibilityValue("Story \(page + 1) of \(scenes.count)")
                Spacer(minLength: Spread.space2)
                if page < lastPage {
                    Button {
                        playbackPreference = !autoplay
                    } label: {
                        Image(systemName: autoplay ? "pause.fill" : "play.fill")
                            .frame(width: Spread.minimumTarget, height: Spread.minimumTarget)
                            .contentShape(Rectangle())
                    }
                    .accessibilityLabel(autoplay ? "Pause stories" : "Play stories")
                    .accessibilityIdentifier("week-review-playback")
                }
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .frame(width: Spread.minimumTarget, height: Spread.minimumTarget)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Close Week in Review")
                .accessibilityIdentifier("week-review-close")
                .keyboardShortcut(.cancelAction)
            }
        }
        .padding(Spread.space4)
        .background(chrome)
        .buttonStyle(.plain)
    }

    private var controls: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Spread.space3) {
                if page > 0 { back }
                next
            }
            VStack(spacing: Spread.space2) {
                next
                if page > 0 { back }
            }
        }
        .padding(Spread.space4)
        .frame(maxWidth: 680)
        .frame(maxWidth: .infinity)
        .background(chrome)
    }

    private var chrome: Color {
        reduceTransparency ? Spread.artGround : Spread.artGround.opacity(0.88)
    }

    private var back: some View {
        Button { move(-1) } label: {
            Label("Back", systemImage: "chevron.backward")
                .font(Spread.headline)
                .fixedSize(horizontal: true, vertical: false)
                .padding(.horizontal, Spread.space2)
                .frame(minHeight: Spread.minimumTarget)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("week-review-back")
    }

    private var next: some View {
        Button {
            if page == lastPage { onWeekAhead() }
            else { move(1) }
        } label: {
            Text(page == lastPage ? "Plan the week ahead" : "Next")
                .font(Spread.headline)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spread.space3)
                .padding(.vertical, Spread.space2)
                .frame(maxWidth: .infinity, minHeight: 52)
                .foregroundStyle(Spread.onAccent)
                .background(Spread.accentGradient, in: Capsule())
        }
        .buttonStyle(.spreadPress)
        .accessibilityIdentifier(page == lastPage ? "week-review-plan-next" : "week-review-continue")
    }

    private func progress(at index: Int) -> CGFloat {
        if index < page || index == lastPage && index == page { return 1 }
        return index == page ? CGFloat(elapsed / scene.seconds) : 0
    }

    private func move(_ delta: Int) {
        let destination = page + delta
        guard scenes.indices.contains(destination) else { return }
        forward = delta > 0
        elapsed = 0
        withAnimation(SpreadMotion.resolved(SpreadMotion.lifeWeekPage, reduceMotion: reduceMotion)) {
            page = destination
        }
    }

    private var sceneContent: some View {
        VStack(alignment: .leading, spacing: Spread.space3) {
            switch scene {
            case .opening:
                heading("A week of your life.")
                detail("The time you made room for and the things you finished.")
            case .hours:
                heading("You made room for")
                RitualNumber(value: SpreadHours.text(placed), unit: "h", size: 88)
                detail("Hours placed on days · \(SpreadHours.spoken(budget)) budgeted")
            case .area(let role):
                heading(role.name)
                RitualNumber(value: SpreadHours.text(snapshot.placedHours(for: role.id)), unit: "h", size: 84)
                detail("Hours placed · \(SpreadHours.spoken(role.hours)) budgeted")
                let count = snapshot.tasks(for: role.id).filter(\.done).count
                detail(count == 1 ? "1 task finished" : "\(count) tasks finished")
            case .noAreas:
                heading("Your story starts with Life.")
                detail("Add a Life area to see it in your weekly review.")
            case .tasks:
                heading(completed == 0 ? "Room for what’s next." : "You followed through.")
                RitualNumber(value: completed.formatted(), size: 88)
                detail(completed == 1 ? "Task finished this week" : "Tasks finished this week")
            case .highlight:
                if let role = topRole {
                    heading("You made the most room for \(role.name).")
                    RitualNumber(value: SpreadHours.text(snapshot.placedHours(for: role.id)), unit: "h", size: 76)
                    detail("Hours placed on days for \(role.name)")
                } else {
                    heading("The next week is yours.")
                    detail("There were no placed hours to highlight this week.")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func heading(_ title: String) -> some View {
        Text(title)
            .font(.system(.largeTitle, design: .serif).weight(.semibold))
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
            .accessibilityFocused($focusedPage, equals: page)
            .accessibilityIdentifier("week-review-story-heading")
    }

    private func detail(_ text: String) -> some View {
        Text(text).font(Spread.body).fixedSize(horizontal: false, vertical: true)
    }
}

/// Keeps the number and its unit on the same baseline as Dynamic Type scales.
private struct RitualNumber: View {
    let value: String
    let unit: String?
    @ScaledMetric(relativeTo: .largeTitle) private var displaySize: CGFloat = 82
    @ScaledMetric(relativeTo: .title2) private var unitSize: CGFloat = 24

    init(value: String, unit: String? = nil, size: CGFloat) {
        self.value = value
        self.unit = unit
        _displaySize = ScaledMetric(wrappedValue: size, relativeTo: .largeTitle)
    }

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Spread.space1) {
            Text(value)
                .font(.system(size: displaySize, weight: .semibold, design: .serif))
                .monospacedDigit()
                .minimumScaleFactor(0.5)
                .lineLimit(1)
            if let unit {
                Text(unit)
                    .font(.system(size: unitSize, weight: .semibold))
                    .accessibilityLabel(unit == "h" ? "hours" : unit)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

/// Sunday: guided editing through existing native bridge actions, never a second plan store.
struct LifeWeekAheadSheet: View {
    @ObservedObject var planner: LivePlanner
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var chosenWeek: String?
    @AccessibilityFocusState private var questionFocused: Bool
    @State private var areaIndex = 0
    @State private var step = Step.hours

    private enum Step: String, CaseIterable {
        case hours = "Hours"
        case days = "Days"
        case tasks = "Tasks"
    }
    @State private var selectedDay = ""
    @State private var capacityText = ""
    @State private var taskText = ""
    @State private var busy = false
    @State private var message: String?
    @State private var finished = false

    private var snapshot: PlannerSnapshot? { planner.snapshot }
    private func role(in snapshot: PlannerSnapshot) -> Responsibility? {
        guard snapshot.roles.indices.contains(areaIndex) else { return nil }
        return snapshot.roles[areaIndex]
    }
    private var saving: Bool { busy || planner.busy }

    private func day(for role: Responsibility, in snapshot: PlannerSnapshot) -> String {
        let days = LifeCalendarRules.week(snapshot.weekKey)
        if days.contains(selectedDay) { return selectedDay }
        return days.first { day in
            snapshot.allocations.contains { $0.roleId == role.id && $0.day == day && $0.hours > 0 }
        } ?? days.first ?? snapshot.weekKey
    }

    var body: some View {
        SpreadSheetStack {
            Group {
                if let snapshot {
                    ScrollView {
                        VStack(alignment: .leading, spacing: Spread.space4) {
                            Text(PlannerDates.weekRange(base: snapshot.weekKey, offset: 0))
                                .font(Spread.callout.weight(.medium))
                                .foregroundStyle(Spread.secondary)
                            if chosenWeek != snapshot.weekKey {
                                weekIntro
                            } else if snapshot.roles.isEmpty {
                                ContentUnavailableView("Add a Life area first", systemImage: "calendar.badge.plus")
                            } else if finished {
                                summary(snapshot)
                            } else if snapshot.life?.capacityHours == nil {
                                capacityEditor()
                            } else if let role = role(in: snapshot) {
                                areaPanel(role: role, snapshot: snapshot)
                            }
                        }
                        .padding(Spread.space5)
                        .frame(maxWidth: 680)
                        .frame(maxWidth: .infinity)
                    }
                    .id(stage)
                    .scrollDismissesKeyboard(.interactively)
                    .safeAreaInset(edge: .bottom, spacing: 0) {
                        inset(snapshot)
                    }
                } else {
                    ProgressView("Opening your week…")
                }
            }
            .navigationTitle("Week Ahead")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .disabled(saving)
                        .frame(minHeight: Spread.minimumTarget)
                }
            }
        }
        .presentationDetents([.large])
        .interactiveDismissDisabled(saving)
        .onChange(of: planner.state?.envelope.profileId) { _, _ in
            chosenWeek = nil
            resetProgress()
        }
        .onChange(of: planner.snapshot?.weekKey) { _, week in
            if let chosenWeek, chosenWeek != week {
                self.chosenWeek = nil
                resetProgress()
            }
        }
        .onChange(of: stage) { _, _ in questionFocused = true }
        .accessibilityIdentifier("week-ahead-sheet")
    }

    private var stage: String {
        guard let snapshot, chosenWeek == snapshot.weekKey else { return "week" }
        if finished { return "finish" }
        if snapshot.life?.capacityHours == nil { return "capacity" }
        return "\(snapshot.weekKey)-\(areaIndex)-\(step.rawValue)"
    }

    private func resetProgress() {
        areaIndex = 0
        step = .hours
        selectedDay = ""
        capacityText = ""
        taskText = ""
        message = nil
        finished = false
    }

    private var weekIntro: some View {
        VStack(alignment: .leading, spacing: Spread.space4) {
            Image(systemName: "calendar.badge.clock")
                .font(.largeTitle.weight(.light)).foregroundStyle(Spread.accent)
                .accessibilityHidden(true)
            question("Which week are you planning?")
            Text("Start with the hours and days you’ve already saved. Change anything as you go.")
                .font(Spread.body).foregroundStyle(Spread.secondary)
        }
        .padding(Spread.space5)
        .frame(maxWidth: .infinity, alignment: .leading)
        .spreadCard()
    }

    private func areaPanel(role: Responsibility, snapshot: PlannerSnapshot) -> some View {
        VStack(alignment: .leading, spacing: Spread.space4) {
            ViewThatFits(in: .horizontal) {
                HStack {
                    areaPosition.fixedSize()
                    Spacer()
                    stepPosition.fixedSize()
                }
                VStack(alignment: .leading, spacing: Spread.space1) {
                    areaPosition
                    stepPosition
                }
            }
            HStack(spacing: Spread.space1) {
                ForEach(Step.allCases, id: \.self) { item in
                    Capsule()
                        .fill(item == step ? Spread.accent : Spread.fill)
                        .frame(height: 4)
                }
            }
            .accessibilityHidden(true)
            RitualAreaHeader(role: role, caption: role.intention)
            switch step {
            case .hours: hoursEditor(role: role, snapshot: snapshot)
            case .days: daysEditor(role: role, snapshot: snapshot)
            case .tasks: tasksEditor(role: role, snapshot: snapshot)
            }
        }
        .transition(.opacity)
    }

    private var areaPosition: some View {
        Text("Life area \(areaIndex + 1) of \(snapshot?.roles.count ?? 0)")
            .font(Spread.footnote).foregroundStyle(Spread.secondary)
    }

    private var stepPosition: some View {
        Text("\(step.rawValue) · \((Step.allCases.firstIndex(of: step) ?? 0) + 1) of 3")
            .font(Spread.footnote.weight(.semibold)).foregroundStyle(Spread.ink)
    }

    private func question(_ title: String) -> some View {
        Text(title)
            .font(.title2.weight(.semibold))
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
            .accessibilityFocused($questionFocused)
            .accessibilityIdentifier("week-ahead-question")
    }

    private func capacityEditor() -> some View {
        VStack(alignment: .leading, spacing: Spread.space3) {
            question("How many hours are available?")
            Text("This is your total capacity for the selected week. Nothing will be assigned automatically.")
                .foregroundStyle(Spread.secondary)
            TextField("Weekly hours (0–168)", text: $capacityText)
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
                .frame(minHeight: Spread.minimumTarget)
                .accessibilityIdentifier("week-ahead-capacity")
                .disabled(saving)
        }
        .padding(Spread.space4)
        .spreadCard()
    }

    private func hoursEditor(role: Responsibility, snapshot: PlannerSnapshot) -> some View {
        VStack(alignment: .leading, spacing: Spread.space4) {
            question("How much time will you set aside?")
            HStack {
                Button {
                    changeBudget(role: role, to: role.hours - 0.5)
                } label: {
                    Image(systemName: "minus").frame(width: 52, height: 52)
                }
                .disabled(role.hours - 0.5 < max(0, snapshot.placedHours(for: role.id)) || saving)
                .accessibilityLabel("Decrease \(role.name) by half an hour")

                Spacer()
                RitualNumber(value: SpreadHours.text(role.hours), unit: "h", size: 50)
                Spacer()

                Button {
                    changeBudget(role: role, to: role.hours + 0.5)
                } label: {
                    Image(systemName: "plus").frame(width: 52, height: 52)
                }
                .disabled(busy || planner.busy)
                .accessibilityLabel("Increase \(role.name) by half an hour")
            }
            Text("Changes save immediately. Existing hours on days are preserved.")
                .font(Spread.footnote).foregroundStyle(Spread.secondary)
        }
        .padding(Spread.space4).spreadCard()
    }

    private func changeBudget(role: Responsibility, to hours: Double) {
        guard hours >= 0, hours <= 168 else { return }
        submit(["type": "setLifeBudget", "roleId": role.id, "hours": hours]) {}
    }

    private func daysEditor(role: Responsibility, snapshot: PlannerSnapshot) -> some View {
        let current = day(for: role, in: snapshot)
        return VStack(alignment: .leading, spacing: Spread.space4) {
            question("Which days work for you?")
            ScrollView(.horizontal) {
                HStack(spacing: Spread.space2) {
                    ForEach(LifeCalendarRules.week(snapshot.weekKey), id: \.self) { iso in
                        let reserved = snapshot.allocations
                            .filter { $0.roleId == role.id && $0.day == iso }
                            .reduce(0) { $0 + $1.hours }
                        Button {
                            selectedDay = iso
                            message = nil
                        } label: {
                            VStack(spacing: 5) {
                                Text(PlannerDates.label(PlannerDates.date(iso), pattern: "EEE"))
                                    .font(Spread.footnote)
                                Text(PlannerDates.label(PlannerDates.date(iso), pattern: "d"))
                                    .font(Spread.headline)
                                Text(SpreadHours.text(reserved) + "h")
                                    .font(Spread.caption)
                            }
                            .frame(minWidth: 54, minHeight: 76)
                            .foregroundStyle(current == iso ? Spread.onAccent : Spread.ink)
                            .background(current == iso ? Spread.accent : Spread.inset,
                                        in: RoundedRectangle(cornerRadius: Spread.radiusControl))
                        }
                        .buttonStyle(.spreadPress)
                        .accessibilityLabel("\(PlannerDates.label(PlannerDates.date(iso), pattern: "EEEE, MMM d")), \(SpreadHours.spoken(reserved)) reserved")
                        .accessibilityAddTraits(current == iso ? .isSelected : [])
                        .disabled(saving)
                    }
                }
            }
            .scrollIndicators(.hidden)
            Text(SpreadHours.text(max(0, snapshot.remainingHours(for: role.id))) + "h left to place for this area")
                .font(Spread.callout).foregroundStyle(Spread.secondary)
            Button {
                submit(["type": "allocate", "roleId": role.id, "day": current, "hours": 1.0]) {}
            } label: {
                Text("Place 1 hour on \(PlannerDates.label(PlannerDates.date(current), pattern: "EEE"))")
                    .frame(maxWidth: .infinity, minHeight: 48)
            }
            .buttonStyle(SpreadRefinedControlStyle())
            .disabled(snapshot.remainingHours(for: role.id) < 1 || saving)
            .accessibilityIdentifier("week-ahead-place-hour")
        }
        .padding(Spread.space4).spreadCard()
    }

    private func tasksEditor(role: Responsibility, snapshot: PlannerSnapshot) -> some View {
        let chosen = day(for: role, in: snapshot)
        let hasHours = snapshot.allocations.contains {
            $0.roleId == role.id && $0.day == chosen && $0.hours > 0
        }
        return VStack(alignment: .leading, spacing: Spread.space3) {
            question("Anything you’d like to do?")
            let destination = hasHours ? PlannerDates.label(PlannerDates.date(chosen), pattern: "EEEE, MMM d") : "To place"
            Text("New tasks go to \(destination).")
                .font(Spread.callout).foregroundStyle(Spread.secondary)
            TextField("Add an optional task", text: $taskText)
                .textFieldStyle(.roundedBorder)
                .frame(minHeight: Spread.minimumTarget)
                .submitLabel(.done)
                .onSubmit { addTask(role: role, day: hasHours ? chosen : nil) }
                .disabled(saving)
                .accessibilityIdentifier("week-ahead-task-name")
            Button { addTask(role: role, day: hasHours ? chosen : nil) } label: {
                Text("Add task")
                    .padding(.horizontal, Spread.space4)
                    .frame(minHeight: Spread.minimumTarget)
            }
            .buttonStyle(SpreadRefinedControlStyle())
            .disabled(taskText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || saving)
            .accessibilityIdentifier("week-ahead-add-task")
            ForEach(snapshot.tasks(for: role.id)) { task in
                HStack(spacing: Spread.space2) {
                    Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(task.done ? Spread.success : Spread.secondary)
                    Text(task.text).font(Spread.callout).lineLimit(2)
                    Spacer(minLength: 0)
                }
                .padding(Spread.space2)
                .background(Spread.inset, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
            }
        }
        .padding(Spread.space4).spreadCard()
    }

    private func addTask(role: Responsibility, day: String?) {
        let value = taskText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty else { return }
        var action: [String: Any] = [
            "type": day == nil ? "addTask" : "addTaskForDay",
            "roleId": role.id, "text": value, "life": true
        ]
        if let day { action["day"] = day }
        submit(action) { taskText = "" }
    }

    private func inset(_ snapshot: PlannerSnapshot) -> some View {
        VStack(spacing: Spread.space1) {
            if let message {
                Label(message, systemImage: "exclamationmark.circle")
                    .font(Spread.callout).foregroundStyle(Spread.danger)
                    .accessibilityIdentifier("week-ahead-error")
            } else if saving {
                ProgressView("Saving…").font(Spread.callout)
            }

            if chosenWeek != snapshot.weekKey {
                primary("Plan \(PlannerDates.weekRange(base: snapshot.weekKey, offset: 0))",
                        id: "week-ahead-plan-selected") {
                    resetProgress()
                    chosenWeek = snapshot.weekKey
                }
                Button {
                    submit(["type": "changeWeek", "direction": 1]) {
                        resetProgress()
                        chosenWeek = planner.snapshot?.weekKey
                    }
                } label: {
                    Text("Plan the following week")
                        .frame(minHeight: Spread.minimumTarget)
                }
                .disabled(saving)
                .accessibilityIdentifier("week-ahead-plan-next-week")
            } else if finished || snapshot.roles.isEmpty {
                primary("Done", id: "week-ahead-finish") { dismiss() }
            } else if snapshot.life?.capacityHours == nil {
                primary("Set weekly capacity", id: "week-ahead-save-capacity", action: saveCapacity)
                Button {
                    chosenWeek = nil
                    resetProgress()
                } label: {
                    Text("Back").frame(minWidth: Spread.minimumTarget, minHeight: Spread.minimumTarget)
                }
                .disabled(saving)
            } else if let role = role(in: snapshot) {
                actionBar(snapshot: snapshot, role: role)
            }
        }
        .padding(Spread.space4)
        .frame(maxWidth: 680)
        .frame(maxWidth: .infinity)
        .background(Spread.canvas)
    }

    private func primary(_ title: String, id: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(Spread.headline)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spread.space3)
                .padding(.vertical, Spread.space2)
                .frame(maxWidth: .infinity, minHeight: 50)
                .foregroundStyle(Spread.onAccent)
                .background(Spread.accentGradient, in: Capsule())
        }
        .buttonStyle(.spreadPress)
        .disabled(saving)
        .accessibilityIdentifier(id)
    }

    private func saveCapacity() {
        let text = capacityText.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: ",", with: ".")
        guard let value = Double(text), value > 0, value <= 168,
              (value * 2).rounded() == value * 2 else {
            message = "Enter an amount between 0.5 and 168 in half-hour increments."
            return
        }
        submit(["type": "setLifeCapacity", "hours": value]) {}
    }

    private func actionBar(snapshot: PlannerSnapshot, role: Responsibility) -> some View {
        let label: String = switch step {
        case .hours: "Keep \(SpreadHours.spoken(role.hours))"
        case .days: snapshot.placedHours(for: role.id) > 0 ? "Keep current days" : "Continue"
        case .tasks: areaIndex == snapshot.roles.count - 1 ? "Finish my week" : "Next Life area"
        }
        return VStack(spacing: Spread.space1) {
            primary(label, id: "week-ahead-next") { navigate { advance(snapshot) } }
            ViewThatFits(in: .horizontal) {
                HStack {
                    backControl.fixedSize()
                    Spacer()
                    skipControl(snapshot).fixedSize()
                }
                VStack {
                    backControl
                    skipControl(snapshot)
                }
            }
        }
    }

    private var backControl: some View {
        Button {
            navigate {
                switch step {
                case .tasks: step = .days
                case .days: step = .hours
                case .hours:
                    if areaIndex > 0 {
                        areaIndex -= 1
                        step = .tasks
                        selectedDay = ""
                        taskText = ""
                    } else {
                        chosenWeek = nil
                        resetProgress()
                    }
                }
            }
        } label: {
            Label("Back", systemImage: "chevron.backward")
                .frame(minWidth: Spread.minimumTarget, minHeight: Spread.minimumTarget)
        }
        .disabled(saving)
    }

    private func skipControl(_ snapshot: PlannerSnapshot) -> some View {
        Button { navigate { nextArea(snapshot) } } label: {
            Text("Skip this Life area").frame(minHeight: Spread.minimumTarget)
        }
        .disabled(saving)
        .accessibilityIdentifier("week-ahead-skip-area")
    }

    private func navigate(_ change: () -> Void) {
        message = nil
        withAnimation(SpreadMotion.resolved(SpreadMotion.lifeWeekPage, reduceMotion: reduceMotion), change)
    }

    private func advance(_ snapshot: PlannerSnapshot) {
        switch step {
        case .hours: step = .days
        case .days: step = .tasks
        case .tasks: nextArea(snapshot)
        }
    }

    private func nextArea(_ snapshot: PlannerSnapshot) {
        if areaIndex + 1 < snapshot.roles.count {
            areaIndex += 1
            step = .hours
            taskText = ""
            selectedDay = ""
        } else {
            finished = true
        }
    }

    private func summary(_ snapshot: PlannerSnapshot) -> some View {
        let placed = snapshot.allocations.reduce(0) { $0 + $1.hours }
        return VStack(alignment: .leading, spacing: Spread.space4) {
            question(placed > 0 ? "You made room for your week." : "Your week is ready to revisit.")
            RitualNumber(value: SpreadHours.text(placed), unit: "h", size: 72)
            Text("Placed on days").font(Spread.callout).foregroundStyle(Spread.secondary)
            ForEach(snapshot.roles) { role in
                RitualAreaHeader(role: role, caption: "\(SpreadHours.spoken(snapshot.placedHours(for: role.id))) placed")
            }
        }
        .padding(Spread.space4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .spreadCard()
    }

    private func submit(_ action: [String: Any], afterSuccess: @escaping () -> Void) {
        guard !busy && !planner.busy else { return }
        busy = true
        message = nil
        let profile = planner.state?.envelope.profileId
        Task { @MainActor in
            let success = await planner.send(action)
            busy = false
            guard planner.state?.envelope.profileId == profile else { return }
            if success { afterSuccess() }
            else { message = planner.error ?? "The change could not be saved. Try again." }
        }
    }
}

/// Gives each area the same live name and local artwork it has in the Life wallet.
private struct RitualAreaHeader: View {
    let role: Responsibility
    let caption: String?
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    var body: some View {
        VStack(alignment: .leading, spacing: Spread.space1) {
            Text(role.name)
                .font(.system(.title2, design: .serif).weight(.semibold))
                .fixedSize(horizontal: false, vertical: true)
            if let caption, !caption.isEmpty {
                Text(caption)
                    .font(Spread.callout)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .foregroundStyle(.white)
        .padding(Spread.space4)
        .frame(maxWidth: .infinity, minHeight: 104, alignment: .bottomLeading)
        .background {
            LifeEditorialArtwork(category: role.category, roleColor: Color(hex: role.color))
                .overlay {
                    Spread.artGround.opacity(reduceTransparency ? 0.75 : 0.3)
                }
        }
        .clipShape(RoundedRectangle(cornerRadius: Spread.radiusCard))
        .accessibilityElement(children: .combine)
    }
}

/// Your Journey compares saved plans and completed tasks across recorded weeks.
struct LifeJourneySheet: View {
    let snapshot: PlannerSnapshot
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize

    private var history: [NativeWeekHistory] { snapshot.history ?? [] }
    private var placedTotal: Double { history.reduce(0) { $0 + $1.placedHours } }
    private var completedTotal: Int { history.reduce(0) { $0 + $1.completedTasks } }
    private var maxWeek: Double { history.map(\.placedHours).max() ?? 0 }

    var body: some View {
        SpreadSheetStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spread.space6) {
                    if history.isEmpty {
                        ContentUnavailableView("No saved weeks yet", systemImage: "chart.bar",
                            description: Text("Weeks with saved plans will appear here."))
                            .accessibilityIdentifier("journey-empty")
                    } else {
                        scoreboard
                        if !snapshot.roles.isEmpty { roleBreakdown }
                        timeline
                    }
                }
                .padding(Spread.space5)
                .frame(maxWidth: 680)
                .frame(maxWidth: .infinity)
            }
            .navigationTitle("Your Journey")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }.frame(minHeight: Spread.minimumTarget)
                }
            }
        }
        .presentationDetents([.large])
        .accessibilityIdentifier("your-journey-sheet")
    }

    private var scoreboard: some View {
        VStack(alignment: .leading, spacing: Spread.space4) {
            Text("The time you made room for")
                .font(.system(.title2, design: .serif).weight(.semibold))
                .accessibilityAddTraits(.isHeader)
            Text("Saved weeks through \(PlannerDates.weekRange(base: snapshot.weekKey, offset: 0))")
                .font(Spread.callout).foregroundStyle(Spread.secondary)
            metric(SpreadHours.text(placedTotal), unit: "h", label: "Placed on days",
                   size: 82, id: "journey-hours")
            Divider()
            let layout = typeSize.isAccessibilitySize
                ? AnyLayout(VStackLayout(alignment: .leading, spacing: Spread.space4))
                : AnyLayout(HStackLayout(alignment: .top, spacing: Spread.space4))
            layout {
                metric(completedTotal.formatted(), label: "Tasks finished", size: 42, id: "journey-tasks")
                metric(history.count.formatted(), label: "Saved weeks", size: 42, id: "journey-weeks")
            }
        }
        .padding(Spread.space5)
        .frame(maxWidth: .infinity, alignment: .leading)
        .spreadCard()
    }

    private var roleBreakdown: some View {
        VStack(alignment: .leading, spacing: Spread.space3) {
            sectionTitle("By Life area")
            ForEach(snapshot.roles) { role in
                let entries = history.compactMap { week in week.byRole.first { $0.roleId == role.id } }
                let hours = entries.reduce(0) { $0 + $1.placedHours }
                let tasks = entries.reduce(0) { $0 + $1.completedTasks }
                let color = Color(hex: role.color)
                VStack(alignment: .leading, spacing: Spread.space2) {
                    Label {
                        Text(role.name).font(Spread.headline)
                    } icon: {
                        Circle().fill(color).frame(width: 12, height: 12)
                    }
                    bar(value: hours, maximum: placedTotal, color: color)
                    values(hours: hours, tasks: tasks)
                }
                .padding(Spread.space4)
                .spreadCard(edge: color)
                .accessibilityElement(children: .combine)
            }
        }
    }

    private var timeline: some View {
        VStack(alignment: .leading, spacing: Spread.space3) {
            sectionTitle("Week by week")
            ForEach(history) { week in
                VStack(alignment: .leading, spacing: Spread.space2) {
                    Text(PlannerDates.weekRange(base: week.weekKey, offset: 0)).font(Spread.headline)
                    bar(value: week.placedHours, maximum: maxWeek, color: Spread.accent)
                    values(hours: week.placedHours, tasks: week.completedTasks)
                }
                .padding(Spread.space4)
                .background(Spread.inset, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                .accessibilityElement(children: .combine)
            }
        }
        .accessibilityIdentifier("journey-week-history")
    }

    private func sectionTitle(_ label: String) -> some View {
        Text(label).font(.title2.weight(.semibold)).accessibilityAddTraits(.isHeader)
    }

    private func metric(_ value: String, unit: String? = nil, label: String,
                        size: CGFloat, id: String) -> some View {
        VStack(alignment: .leading, spacing: Spread.space1) {
            RitualNumber(value: value, unit: unit, size: size)
            Text(label).font(Spread.callout).foregroundStyle(Spread.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier(id)
    }

    private func values(hours: Double, tasks: Int) -> some View {
        let hoursLabel = Text("\(SpreadHours.spoken(hours)) placed").font(Spread.callout.weight(.semibold))
        let tasksLabel = Text(tasks == 1 ? "1 task finished" : "\(tasks.formatted()) tasks finished")
            .font(Spread.callout).foregroundStyle(Spread.secondary)
        return ViewThatFits(in: .horizontal) {
            HStack {
                hoursLabel.fixedSize()
                Spacer(minLength: Spread.space2)
                tasksLabel.fixedSize()
            }
            VStack(alignment: .leading, spacing: Spread.space1) {
                hoursLabel
                tasksLabel
            }
        }
        .monospacedDigit()
    }

    private func bar(value: Double, maximum: Double, color: Color) -> some View {
        let fraction = maximum > 0 ? CGFloat(min(1, max(0, value / maximum))) : 0
        return GeometryReader { geometry in
            Capsule().fill(Spread.fill)
                .overlay(alignment: .leading) {
                    Capsule().fill(color).frame(width: geometry.size.width * fraction)
                }
        }
        .frame(height: 6)
        .accessibilityHidden(true)
    }
}
#endif
