#if os(iOS)
import SwiftUI

/// Saturday: a short story based on saved planner facts. Planned time is never called time spent.
struct LifeWeekReviewSheet: View {
    let snapshot: PlannerSnapshot
    let onWeekAhead: () -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var page = 0

    private let lastPage = 4
    private var budget: Double { snapshot.roles.reduce(0) { $0 + $1.hours } }
    private var placed: Double { snapshot.allocations.reduce(0) { $0 + $1.hours } }
    private var completed: Int { snapshot.tasks.filter(\.done).count }
    private var topRole: Responsibility? {
        snapshot.roles.max {
            let a = snapshot.placedHours(for: $0.id)
            let b = snapshot.placedHours(for: $1.id)
            return a == b ? $0.name > $1.name : a < b
        }
    }
    private var weekLabel: String { PlannerDates.weekRange(base: snapshot.weekKey, offset: 0) }

    var body: some View {
        SpreadSheetStack {
            VStack(spacing: 0) {
                HStack(spacing: Spread.space1) {
                    ForEach(0...lastPage, id: \.self) { index in
                        Capsule()
                            .fill(index <= page ? Spread.accent : Spread.fill)
                            .frame(height: 5)
                            .accessibilityHidden(true)
                    }
                }
                .padding(.horizontal, Spread.space4)
                .padding(.top, Spread.space4)

                ScrollView {
                    VStack(alignment: .leading, spacing: Spread.space5) {
                        Text(weekLabel)
                            .font(Spread.callout)
                            .foregroundStyle(Spread.secondary)
                        story
                            .id(page)
                            .transition(.opacity)
                    }
                    .padding(Spread.space5)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .scrollIndicators(.hidden)
                .safeAreaInset(edge: .bottom) {
                    HStack(spacing: Spread.space3) {
                        if page > 0 {
                            Button("Back") { changePage(-1) }
                                .frame(minWidth: 76, minHeight: Spread.minimumTarget)
                                .accessibilityIdentifier("week-review-back")
                        }
                        Button {
                            if page == lastPage { onWeekAhead() }
                            else { changePage(1) }
                        } label: {
                            Text(page == lastPage ? "Plan the week ahead" : "Continue")
                                .font(Spread.headline)
                                .foregroundStyle(Spread.onAccent)
                                .frame(maxWidth: .infinity, minHeight: 52)
                                .background(Spread.accentGradient, in: Capsule())
                        }
                        .buttonStyle(.spreadPress)
                        .accessibilityIdentifier(page == lastPage ? "week-review-plan-next" : "week-review-continue")
                    }
                    .padding(Spread.space4)
                    .background(Spread.canvas)
                }
            }
            .navigationTitle("Week in Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }.frame(minHeight: Spread.minimumTarget)
                }
            }
        }
        .presentationDetents([.large])
        .accessibilityIdentifier("week-in-review-sheet")
    }

    private func changePage(_ delta: Int) {
        withAnimation(reduceMotion ? nil : .easeInOut(duration: SpreadMotion.normalSeconds)) {
            page = min(lastPage, max(0, page + delta))
        }
    }

    @ViewBuilder private var story: some View {
        switch page {
        case 0:
            storyPanel {
                Image(systemName: "sparkles")
                    .font(.system(size: 44, weight: .light))
                    .foregroundStyle(Spread.accent)
                Spacer(minLength: 48)
                Text("A week of your life.")
                    .font(.system(.largeTitle, design: .rounded).weight(.bold))
                    .foregroundStyle(Spread.ink)
                Text("The time you planned, the priorities you chose, and the things you finished.")
                    .font(Spread.body).foregroundStyle(Spread.secondary)
            }
        case 1:
            storyPanel {
                Text("01 / THE TIME YOU MADE ROOM FOR")
                    .font(Spread.footnote).foregroundStyle(Spread.secondary)
                Spacer(minLength: 32)
                Text("\(SpreadHours.text(placed))h")
                    .font(.system(size: 68, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.65)
                    .lineLimit(1)
                    .monospacedDigit()
                Text("placed on days this week")
                    .font(Spread.headline)
                Text("\(SpreadHours.text(budget))h in your weekly budgets. Scheduled time is not measured time spent.")
                    .font(Spread.callout).foregroundStyle(Spread.secondary)
            }
        case 2:
            storyPanel {
                Text("02 / YOUR PRIORITIES")
                    .font(Spread.footnote).foregroundStyle(Spread.secondary)
                Text("Where you made room")
                    .font(.title.bold())
                ForEach(snapshot.roles) { role in
                    HStack(spacing: Spread.space3) {
                        Circle().fill(Color(hex: role.color)).frame(width: 12, height: 12)
                        Text(role.name).font(Spread.body)
                        Spacer()
                        Text(SpreadHours.text(snapshot.placedHours(for: role.id)) + "h")
                            .font(Spread.headline).monospacedDigit()
                    }
                    .padding(Spread.space3)
                    .background(Spread.inset, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                }
                if snapshot.roles.isEmpty {
                    Text("Create a Life area to start building your story.")
                        .foregroundStyle(Spread.secondary)
                }
            }
        case 3:
            storyPanel {
                Text("03 / FOLLOW-THROUGH")
                    .font(Spread.footnote).foregroundStyle(Spread.secondary)
                Spacer(minLength: 32)
                Text("\(completed)")
                    .font(.system(size: 80, weight: .bold, design: .rounded))
                    .monospacedDigit()
                Text(completed == 1 ? "task completed" : "tasks completed")
                    .font(.title2.bold())
                Text("A real action you marked done, not a prediction about your productivity.")
                    .font(Spread.callout).foregroundStyle(Spread.secondary)
            }
        default:
            storyPanel {
                Text("04 / THIS WEEK'S HIGHLIGHT")
                    .font(Spread.footnote).foregroundStyle(Spread.secondary)
                Spacer(minLength: 32)
                if let role = topRole, snapshot.placedHours(for: role.id) > 0 {
                    Circle().fill(Color(hex: role.color)).frame(width: 24, height: 24)
                    Text(role.name).font(.largeTitle.bold())
                    Text("You made room for \(role.name) on your calendar.")
                        .font(.title3)
                } else {
                    Text("Your next chapter is yours to plan.")
                        .font(.largeTitle.bold())
                    Text("There are no reserved hours to highlight this week.")
                        .foregroundStyle(Spread.secondary)
                }
                Spacer(minLength: 16)
                Text("Ready to make room for what matters next?")
                    .font(Spread.callout).foregroundStyle(Spread.secondary)
            }
        }
    }

    private func storyPanel<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: Spread.space4, content: content)
            .frame(maxWidth: .infinity, minHeight: 400, alignment: .topLeading)
            .padding(Spread.space5)
            .spreadCard()
            .accessibilityElement(children: .contain)
    }
}

/// Sunday: guided editing through existing native bridge actions, never a second plan store.
struct LifeWeekAheadSheet: View {
    @ObservedObject var planner: LivePlanner
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var weekChosen = false
    @State private var areaIndex = 0
    @State private var step = 0 // 0 hours, 1 days, 2 tasks
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
    private func day(in snapshot: PlannerSnapshot) -> String {
        let days = LifeCalendarRules.week(snapshot.weekKey)
        return days.contains(selectedDay) ? selectedDay : days.first ?? snapshot.weekKey
    }

    var body: some View {
        SpreadSheetStack {
            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: Spread.space4) {
                        if let snapshot {
                            Text(PlannerDates.weekRange(base: snapshot.weekKey, offset: 0))
                                .font(Spread.callout)
                                .foregroundStyle(Spread.secondary)
                        }
                        if let message {
                            Label(message, systemImage: "exclamationmark.circle")
                                .font(Spread.callout).foregroundStyle(Spread.danger)
                                .accessibilityIdentifier("week-ahead-error")
                        }
                        if let snapshot {
                            if !weekChosen {
                                weekPicker(snapshot)
                            } else if snapshot.roles.isEmpty {
                                ContentUnavailableView("Add a Life area first", systemImage: "calendar.badge.plus",
                                    description: Text("Your responsibilities form the path through the week."))
                            } else if finished {
                                summary(snapshot)
                            } else if let role = role(in: snapshot) {
                                areaPanel(role: role, snapshot: snapshot)
                            }
                        } else {
                            ProgressView("Opening your week…")
                        }
                    }
                    .padding(Spread.space5)
                }
                .scrollDismissesKeyboard(.interactively)
                .safeAreaInset(edge: .bottom) {
                    if let snapshot, weekChosen, !finished, let role = role(in: snapshot),
                       snapshot.life?.capacityHours != nil {
                        actionBar(snapshot: snapshot, role: role)
                    }
                }
            }
            .navigationTitle("Week Ahead")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .disabled(busy)
                        .frame(minHeight: Spread.minimumTarget)
                }
            }
        }
        .presentationDetents([.large])
        .interactiveDismissDisabled(busy)
        .onChange(of: planner.state?.envelope.profileId) { _, _ in reset() }
        .onChange(of: planner.snapshot?.weekKey) { _, _ in
            selectedDay = ""
            areaIndex = 0
            step = 0
            finished = false
        }
        .accessibilityIdentifier("week-ahead-sheet")
    }

    private func reset() {
        weekChosen = false
        areaIndex = 0
        step = 0
        selectedDay = ""
        capacityText = ""
        taskText = ""
        message = nil
        finished = false
    }

    private func weekPicker(_ snapshot: PlannerSnapshot) -> some View {
        VStack(alignment: .leading, spacing: Spread.space4) {
            Image(systemName: "calendar.badge.clock")
                .font(.system(size: 44, weight: .light)).foregroundStyle(Spread.accent)
            Text("Make room for next week.")
                .font(.largeTitle.bold())
            Text("Walk through each Life area. Choose hours, put them on days, and add what you want to do.")
                .font(Spread.body).foregroundStyle(Spread.secondary)
            Button("Plan the week shown") {
                weekChosen = true
                message = nil
            }
            .buttonStyle(SpreadRefinedControlStyle(prominent: true))
            .frame(minHeight: Spread.minimumTarget)
            .accessibilityIdentifier("week-ahead-plan-selected")
            Button {
                submit(["type": "changeWeek", "direction": 1]) { weekChosen = true }
            } label: {
                Label("Plan the following week", systemImage: "arrow.right")
                    .frame(maxWidth: .infinity, minHeight: Spread.minimumTarget)
            }
            .disabled(busy || planner.busy)
            .accessibilityIdentifier("week-ahead-plan-next-week")
        }
        .padding(Spread.space4)
        .spreadCard()
    }

    @ViewBuilder private func areaPanel(role: Responsibility, snapshot: PlannerSnapshot) -> some View {
        HStack {
            Text("LIFE \(areaIndex + 1) OF \(snapshot.roles.count)")
                .font(Spread.footnote).foregroundStyle(Spread.secondary)
            Spacer()
            Text(["Hours", "Days", "Tasks"][step])
                .font(Spread.footnote.weight(.semibold))
                .foregroundStyle(Spread.secondary)
        }
        HStack(spacing: Spread.space1) {
            ForEach(snapshot.roles.indices, id: \.self) { index in
                Capsule().fill(index <= areaIndex ? Spread.accent : Spread.fill).frame(height: 5)
            }
        }
        VStack(alignment: .leading, spacing: Spread.space3) {
            HStack(spacing: Spread.space3) {
                Circle().fill(Color(hex: role.color)).frame(width: 20, height: 20)
                Text(role.name).font(.title.bold())
            }
            if let intention = role.intention {
                Text(intention).font(Spread.callout).foregroundStyle(Spread.secondary)
            }
            Text("\(SpreadHours.text(role.hours))h weekly budget · \(SpreadHours.text(snapshot.placedHours(for: role.id)))h on days")
                .font(Spread.callout).foregroundStyle(Spread.secondary)
        }
        .padding(Spread.space4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .spreadCard(edge: Color(hex: role.color))

        if snapshot.life?.capacityHours == nil {
            capacityEditor()
        } else {
            switch step {
            case 0: hoursEditor(role: role, snapshot: snapshot)
            case 1: daysEditor(role: role, snapshot: snapshot)
            default: tasksEditor(role: role, snapshot: snapshot)
            }
        }
    }

    private func capacityEditor() -> some View {
        VStack(alignment: .leading, spacing: Spread.space3) {
            Text("First, set your available hours.")
                .font(.title3.bold())
            Text("This is your total capacity for the selected week. Nothing will be assigned automatically.")
                .foregroundStyle(Spread.secondary)
            TextField("Weekly hours (0–168)", text: $capacityText)
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
                .accessibilityIdentifier("week-ahead-capacity")
            Button("Set weekly capacity") {
                let text = capacityText.replacingOccurrences(of: ",", with: ".")
                guard let value = Double(text), value > 0, value <= 168,
                      (value * 2).rounded() == value * 2 else {
                    message = "Enter a valid half-hour amount between 0.5 and 168."
                    return
                }
                submit(["type": "setLifeCapacity", "hours": value]) {}
            }
            .buttonStyle(SpreadRefinedControlStyle(prominent: true))
            .disabled(busy || planner.busy)
        }
        .padding(Spread.space4)
        .spreadCard()
    }

    private func hoursEditor(role: Responsibility, snapshot: PlannerSnapshot) -> some View {
        VStack(alignment: .leading, spacing: Spread.space4) {
            Text("How much time will you give \(role.name)?")
                .font(.title3.bold())
            HStack {
                Button {
                    changeBudget(role: role, to: role.hours - 0.5)
                } label: {
                    Image(systemName: "minus").frame(width: 52, height: 52)
                }
                .disabled(role.hours <= snapshot.placedHours(for: role.id) || busy || planner.busy)
                .accessibilityLabel("Decrease \(role.name) by half an hour")

                Spacer()
                Text(SpreadHours.text(role.hours) + "h")
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .monospacedDigit()
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
        let current = day(in: snapshot)
        return VStack(alignment: .leading, spacing: Spread.space4) {
            Text("Where will \(role.name) fit?")
                .font(.title3.bold())
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
                    }
                }
            }
            .scrollIndicators(.hidden)
            Text(SpreadHours.text(max(0, snapshot.remainingHours(for: role.id))) + "h left to place for this area")
                .font(Spread.callout).foregroundStyle(Spread.secondary)
            Button {
                submit(["type": "allocate", "roleId": role.id, "day": current, "hours": 1.0]) {}
            } label: {
                Text("Place 1 hour on this day").frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(SpreadRefinedControlStyle(prominent: true))
            .disabled(snapshot.remainingHours(for: role.id) < 1 || busy || planner.busy)
            .accessibilityIdentifier("week-ahead-place-hour")
            Text("Select another day to place more. The existing planner checks capacity.")
                .font(Spread.footnote).foregroundStyle(Spread.secondary)
        }
        .padding(Spread.space4).spreadCard()
    }

    private func tasksEditor(role: Responsibility, snapshot: PlannerSnapshot) -> some View {
        let chosen = day(in: snapshot)
        let hasHours = snapshot.allocations.contains {
            $0.roleId == role.id && $0.day == chosen && $0.hours > 0
        }
        return VStack(alignment: .leading, spacing: Spread.space3) {
            Text("What will you do for \(role.name)?")
                .font(.title3.bold())
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
            TextField("Add a task", text: $taskText)
                .textFieldStyle(.roundedBorder)
                .submitLabel(.done)
                .onSubmit { addTask(role: role, day: hasHours ? chosen : nil) }
                .accessibilityIdentifier("week-ahead-task-name")
            Button(hasHours ? "Add task to selected day" : "Add task to To place") {
                addTask(role: role, day: hasHours ? chosen : nil)
            }
            .buttonStyle(SpreadRefinedControlStyle(prominent: true))
            .disabled(taskText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || busy || planner.busy)
            .accessibilityIdentifier("week-ahead-add-task")
            if !hasHours {
                Text("No hours on the selected day. This task will stay in To place until you schedule it.")
                    .font(Spread.footnote).foregroundStyle(Spread.secondary)
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

    private func actionBar(snapshot: PlannerSnapshot, role: Responsibility) -> some View {
        VStack(spacing: Spread.space1) {
        HStack(spacing: Spread.space3) {
            Button {
                if step > 0 { step -= 1 }
                else if areaIndex > 0 { areaIndex -= 1; step = 2 }
                else { weekChosen = false }
                message = nil
            } label: {
                Text("Back").frame(minWidth: 56, minHeight: Spread.minimumTarget)
            }
            .disabled(busy || planner.busy)
            Button {
                advance(snapshot)
            } label: {
                Text(step == 2 && areaIndex == snapshot.roles.count - 1 ? "Finish my week" :
                        step == 2 ? "Next Life area" : "Continue")
                    .foregroundStyle(Spread.onAccent)
                    .frame(maxWidth: .infinity, minHeight: 50)
                    .background(Spread.accentGradient, in: Capsule())
            }
            .buttonStyle(.spreadPress)
            .disabled(busy || planner.busy)
            .accessibilityIdentifier("week-ahead-next")
        }
        Button("Skip this Life area") {
            message = nil
            if areaIndex + 1 < snapshot.roles.count {
                areaIndex += 1
                step = 0
                selectedDay = ""
                taskText = ""
            } else {
                finished = true
            }
        }
        .font(Spread.callout)
        .frame(minHeight: Spread.minimumTarget)
        .disabled(busy || planner.busy)
        .accessibilityIdentifier("week-ahead-skip-area")
        }
        .padding(Spread.space4)
        .background(Spread.canvas)
    }

    private func advance(_ snapshot: PlannerSnapshot) {
        message = nil
        withAnimation(reduceMotion ? nil : .easeInOut(duration: SpreadMotion.normalSeconds)) {
            if step < 2 { step += 1 }
            else if areaIndex + 1 < snapshot.roles.count {
                areaIndex += 1
                step = 0
                taskText = ""
                selectedDay = ""
            } else {
                finished = true
            }
        }
    }

    private func summary(_ snapshot: PlannerSnapshot) -> some View {
        VStack(alignment: .leading, spacing: Spread.space4) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 46)).foregroundStyle(Spread.success)
            Text(snapshot.allocations.isEmpty ? "Your Life areas are ready." : "Your week has a plan.")
                .font(.largeTitle.bold())
            Text("\(SpreadHours.text(snapshot.allocations.reduce(0) { $0 + $1.hours }))h reserved on days across \(snapshot.roles.count) Life areas.")
                .font(Spread.body).foregroundStyle(Spread.secondary)
            ForEach(snapshot.roles) { role in
                HStack {
                    Circle().fill(Color(hex: role.color)).frame(width: 12, height: 12)
                    Text(role.name)
                    Spacer()
                    Text(SpreadHours.text(snapshot.placedHours(for: role.id)) + "h")
                        .monospacedDigit()
                }
            }
            Button("Finish for now") { dismiss() }
                .buttonStyle(SpreadRefinedControlStyle(prominent: true))
                .accessibilityIdentifier("week-ahead-finish")
        }
        .padding(Spread.space4)
        .spreadCard()
    }

    private func submit(_ action: [String: Any], afterSuccess: @escaping () -> Void) {
        guard !busy && !planner.busy else { return }
        busy = true
        message = nil
        Task { @MainActor in
            let success = await planner.send(action)
            busy = false
            if success { afterSuccess() }
            else { message = planner.error ?? "The change could not be saved. Your plan is unchanged." }
        }
    }
}

/// Your Journey: numerical scoreboard across saved weeks. No score or time-spent inference.
struct LifeJourneySheet: View {
    let snapshot: PlannerSnapshot
    @Environment(\.dismiss) private var dismiss

    private var history: [NativeWeekHistory] { snapshot.history ?? [] }
    private var placedTotal: Double { history.reduce(0) { $0 + $1.placedHours } }
    private var completedTotal: Int { history.reduce(0) { $0 + $1.completedTasks } }
    private func placed(for id: String) -> Double {
        history.reduce(0) { sum, week in
            sum + (week.byRole.first { $0.roleId == id }?.placedHours ?? 0)
        }
    }
    private func completed(for id: String) -> Int {
        history.reduce(0) { sum, week in
            sum + (week.byRole.first { $0.roleId == id }?.completedTasks ?? 0)
        }
    }

    var body: some View {
        SpreadSheetStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Spread.space5) {
                    VStack(alignment: .leading, spacing: Spread.space2) {
                        Text("THE TIME YOU MADE ROOM FOR")
                            .font(Spread.footnote).foregroundStyle(Spread.secondary)
                        Text("Your Journey")
                            .font(.largeTitle.bold())
                        Text("A scoreboard of saved plans through the selected week, not measured time spent.")
                            .font(Spread.callout).foregroundStyle(Spread.secondary)
                    }

                    if history.isEmpty {
                        ContentUnavailableView("No saved weeks to score yet", systemImage: "chart.bar",
                            description: Text("Schedule time or complete a task to begin your record."))
                    } else {
                        HStack(spacing: Spread.space3) {
                            numberTile(SpreadHours.text(placedTotal) + "h", label: "Hours placed")
                            numberTile("\(completedTotal)", label: "Tasks finished")
                        }
                        numberTile("\(history.count)", label: "Saved weeks represented")

                        Text("By Life area").font(.title2.bold())
                        ForEach(snapshot.roles) { role in
                            VStack(alignment: .leading, spacing: Spread.space2) {
                                HStack {
                                    Circle().fill(Color(hex: role.color)).frame(width: 12, height: 12)
                                    Text(role.name).font(Spread.headline)
                                    Spacer()
                                    Text(SpreadHours.text(placed(for: role.id)) + "h")
                                        .font(Spread.headline).monospacedDigit()
                                }
                                GeometryReader { proxy in
                                    ZStack(alignment: .leading) {
                                        Capsule().fill(Spread.fill)
                                        Capsule().fill(Color(hex: role.color))
                                            .frame(width: max(0, proxy.size.width * CGFloat(
                                                placedTotal > 0 ? placed(for: role.id) / placedTotal : 0)))
                                    }
                                }
                                .frame(height: 8)
                                Text("\(completed(for: role.id)) tasks completed")
                                    .font(Spread.caption).foregroundStyle(Spread.secondary)
                            }
                            .padding(Spread.space3)
                            .spreadCard(edge: Color(hex: role.color))
                            .accessibilityElement(children: .combine)
                        }

                        Text("Week by week").font(.title2.bold())
                        ForEach(history) { week in
                            HStack {
                                Text(PlannerDates.label(PlannerDates.date(week.weekKey), pattern: "MMM d"))
                                    .font(Spread.callout)
                                Spacer()
                                Text(SpreadHours.text(week.placedHours) + "h placed")
                                    .font(Spread.callout).monospacedDigit()
                                Text("· \(week.completedTasks) done")
                                    .font(Spread.caption).foregroundStyle(Spread.secondary)
                            }
                            .padding(Spread.space3)
                            .background(Spread.inset, in: RoundedRectangle(cornerRadius: Spread.radiusRow))
                        }
                    }
                }
                .padding(Spread.space5)
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

    private func numberTile(_ value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: Spread.space2) {
            Text(value)
                .font(.system(.largeTitle, design: .rounded).weight(.bold))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label).font(Spread.callout).foregroundStyle(Spread.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spread.space4)
        .spreadCard()
        .accessibilityElement(children: .combine)
    }
}
#endif
