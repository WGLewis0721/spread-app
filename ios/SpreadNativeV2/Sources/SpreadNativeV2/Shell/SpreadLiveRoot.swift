#if os(iOS)
import SwiftUI

/// The native planner shell. SwiftUI owns every visible pixel; the WebKit planner stays headless and is the
/// only writer (every change is an awaited intent through `LivePlanner.send`).
///
/// Hierarchy, top to bottom, follows `WeekScreen` in the pre-migration `spread-app.tsx`:
/// brand row (folds to the mark), profile chip, the Week control, the Spread/Week rail, then the surface.
/// The floating glass dock sits over the bottom edge and holds Done, the Week/Month morph, Edit, and Settings.
public struct SpreadLiveRoot: View {
    @ObservedObject var planner: LivePlanner
    @StateObject private var focusTimer = SpreadFocusTimer()
    let recovery: () -> Void

    // OD18: Life is the default root for new installs. The key is unchanged, so a stored choice still wins.
    @AppStorage("native.weekMonth.previewEnabled") private var weekFocusEnabled = true
    @State private var destination: SpreadDestination = .spread
    @State private var monthPlane = false
    @State private var monthAnchor = PlannerDates.date(PlannerDates.currentWeekKey())
    @State private var weekDirection = 0
    @State private var layout: SpreadLayout = .stack
    @State private var appearance: SpreadAppearance = SpreadAppearancePreference.read()
    @State private var selectedRole: String?
    @State private var focusDay: String?
    @State private var sheet: LiveSheet?
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
    @State private var editing = false
    @State private var gearTurn = false
    // Labels fold into their icons once after the planner first appears.
    @State private var headerLabelsCollapsed = false
    @State private var dismissedNotice: String?
    @State private var loadedProfile: String?
    /// Counts week moves the store has acknowledged. The selection haptic listens to it, so it never fires at launch.
    @State private var weekTick = 0
    @State private var pendingWeekMoves = 0
    @State private var weekMoveRunning = false
    @State private var classicNavigationOpen = false
    @State private var classicHoursExpanded = false
    @State private var usableWidth: CGFloat = 0
    @AppStorage("native.classic.navigationExpanded") private var navigationExpanded = false

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dynamicTypeSize) private var typeSize

    public init(planner: LivePlanner, recovery: @escaping () -> Void) {
        self.planner = planner
        self.recovery = recovery
    }

    // The body is split into three short layers. One long modifier chain with closures in it exceeds the Swift
    // type-checker's budget ("unable to type-check this expression in reasonable time").
    public var body: some View {
        Group {
            if weekFocusEnabled {
                LifeRoot(
                    planner: planner,
                    focusTimer: focusTimer,
                    onMore: { sheet = .more },
                    onOpenTask: { sheet = .task($0, $1) },
                    onNewRole: { sheet = .newRole }
                )
                .onChange(of: appearance) { _, value in SpreadAppearancePreference.write(value) }
                // Reuse the exact existing More, profile, editor and confirmation sheets.
                .sheet(item: $sheet) { current in sheetContent(current) }
                .alert("Spread", isPresented: errorShown) {
                    errorActions
                } message: { Text(planner.error ?? "") }
            } else {
                presented // Classic keeps its original destination and planner semantics.
            }
        }
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
        .onChange(of: planner.state?.envelope.profileId) { old, new in
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
        .onAppear {
            if UserDefaults.standard.bool(forKey: "native.widget.openToday") ||
                UserDefaults.standard.bool(forKey: "native.widget.openFocus") ||
                UserDefaults.standard.string(forKey: "native.widget.openLifeCard") != nil {
                weekFocusEnabled = true
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("SpreadOpenLifeCard"))) { _ in
            weekFocusEnabled = true
        }
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("SpreadOpenToday"))) { _ in
            weekFocusEnabled = true
        }
        .onReceive(NotificationCenter.default.publisher(for: Notification.Name("SpreadOpenFocus"))) { _ in
            weekFocusEnabled = true
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
            // Show only when the real planner is ready, not over its launch screen.
            guard planner.snapshot != nil, sheet == nil, whatsNew == nil else { return }
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

    /// The planner layers and the standing accessibility identity.
    private var layers: some View {
        GeometryReader { geometry in
        ZStack(alignment: .leading) {
            Spread.canvas.ignoresSafeArea()
            HStack(spacing: 0) {
            if geometry.size.width >= 820 { classicNavigation }
            VStack(spacing: 0) {
                if let snapshot = planner.snapshot {
                    content(snapshot)
                } else {
                    opening
                }
                dock
            }
            }
            .accessibilityHidden(classicNavigationOpen && geometry.size.width < 820)
            if classicNavigationOpen && geometry.size.width < 820 {
                ZStack(alignment: .leading) {
                    Spread.scrim.ignoresSafeArea().onTapGesture { closeClassicNavigation() }.accessibilityHidden(true)
                    VStack(spacing: 0) {
                        HStack {
                            Text("Spread").font(.headline); Spacer()
                            Button(action: closeClassicNavigation) {
                                SpreadIcon(name: "lucide-x", size: 20).frame(width: Spread.minimumTarget, height: Spread.minimumTarget)
                            }.accessibilityLabel("Close navigation")
                        }.padding(.horizontal, Spread.space3)
                        classicNavigation
                    }
                    .frame(width: min(300, max(0, geometry.size.width - 32)))
                    .background(Spread.elevated)
                    .transition(reduceMotion ? .opacity : .move(edge: .leading))
                    .accessibilityAddTraits(.isModal)
                }
                .accessibilityAction(.escape) { closeClassicNavigation() }
            }
        }
        .onAppear { usableWidth = geometry.size.width }
        .onChange(of: geometry.size.width) { _, width in
            usableWidth = width; classicNavigationOpen = false
        }
        }
        .foregroundStyle(Spread.ink)
        .tint(Spread.accent)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("native-content")
        .modifier(PlannerAccessibilityState())
    }

    /// Everything that reacts to the planner or the system: refresh, the Undo window, profile and view memory.
    private var observed: some View {
        layers
            .task { await planner.refresh() }
            .task(id: planner.snapshot != nil) {
                // Don't start the 2.5s introduction until the planner appears.
                guard planner.snapshot != nil, !headerLabelsCollapsed else { return }
                do { try await Task.sleep(nanoseconds: 2_500_000_000) }
                catch { return }
                withAnimation(reduceMotion ? nil : .easeInOut(duration: SpreadMotion.normalSeconds)) {
                    headerLabelsCollapsed = true
                }
            }
            .task(id: planner.undoId) { await expireUndo() }
            .onChange(of: scenePhase) { _, phase in refreshWhenActive(phase) }
            // Entering Edit gets a distinct Home-screen-like impact; leaving
            // Edit gives a softer acknowledgement. Long press uses this same
            // binding, so there is exactly one impact per transition.
            .onChange(of: editing) { _, active in SpreadHaptics.editMode(entering: active) }
            .onChange(of: planner.state?.envelope.profileId) { _, profile in
                openProfile(profile)
                if let profile {
                    focusTimer.noteActiveProfile(profile)
                    focusTimer.pauseForProfileSwitch(to: profile)
                }
            }
            .task(id: planner.state?.envelope.profileId) {
                // The first profile loads after launch, which onChange does not see. Record it here too.
                if let profile = planner.state?.envelope.profileId { focusTimer.noteActiveProfile(profile) }
            }
            .onChange(of: destination) { _, _ in
                persistView()
                SpreadHaptics.selection()
            }
            .onChange(of: monthPlane) { _, _ in
                persistView()
                SpreadHaptics.selection()
            }
            .onChange(of: layout) { _, value in SpreadLayoutPreference.write(value) }
            .onChange(of: appearance) { _, value in SpreadAppearancePreference.write(value) }
            .onChange(of: planner.snapshot?.weekKey) { _, _ in weekChanged() }
    }

    /// Sheets, the error alert, the week tick and the keyboard/first-touch hooks.
    private var presented: some View {
        observed
            .sheet(item: $sheet) { current in sheetContent(current) }
            .alert("Spread", isPresented: errorShown) { errorActions } message: { Text(planner.error ?? "") }
            // A light tick for an accepted week change only: not at launch, and not when a profile opens on its own week.
            .onChange(of: weekTick) { _, _ in SpreadHaptics.selection() }
            .onKeyPress(.leftArrow) { keyWeek(-1) }
            .onKeyPress(.rightArrow) { keyWeek(1) }
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

    /// The Undo notice is offered for six seconds (the store keeps its own rule for what can be undone).
    private func expireUndo() async {
        guard planner.undoId != nil else { return }
        try? await Task.sleep(nanoseconds: UInt64(SpreadUndo.seconds * 1_000_000_000))
        if !Task.isCancelled { planner.undoId = nil }
    }

    private func refreshWhenActive(_ phase: ScenePhase) {
        if phase == .active { Task { await planner.refresh() } }
        else { classicNavigationOpen = false }
    }

    /// Each profile opens where its own person left off, and nothing from the last profile carries over.
    private func openProfile(_ profile: String?) {
        let remembered = SpreadViewMemory.read(profileId: profile)
        destination = remembered.destination
        monthPlane = remembered.monthPlane
        selectedRole = nil
        focusDay = nil
        editing = false
        sheet = nil
        classicNavigationOpen = false
        classicHoursExpanded = false
        loadedProfile = profile
    }

    // MARK: Opening and engine state

    private var opening: some View {
        VStack(spacing: Spread.space4) {
            SpreadBrandMark(size: 56)
            ProgressView("Opening your plan…")
            Button { Task { await planner.refresh() } } label: { Text("Try again").tapTarget() }
            Button { recovery() } label: { Text("Open existing planner").tapTarget() }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: Main content

    private func content(_ snapshot: PlannerSnapshot) -> some View {
        let isMonth = destination == .week && monthPlane
        return VStack(spacing: 0) {
            // The header is sticky, as the web header was: it stays put while the surface scrolls under it.
            if !typeSize.isAccessibilitySize { header(snapshot, isMonth: isMonth) }
            ScrollViewReader { proxy in
            ScrollView {
            VStack(spacing: 0) {
                // Large text and long profile names must remain reachable instead of consuming
                // the entire viewport in a sticky header.
                if typeSize.isAccessibilitySize { header(snapshot, isMonth: isMonth) }
                notices
                    .padding(.horizontal, Spread.space4)
                if snapshot.roles.isEmpty {
                    emptyPlan
                } else if destination == .week {
                    if isMonth {
                        MonthSurface(planner: planner, snapshot: snapshot, anchor: monthAnchor, onPick: pickDay)
                            .transition(.opacity)
                    } else {
                        WeekSurface(
                            planner: planner,
                            snapshot: snapshot,
                            selectedRole: $selectedRole,
                            focusDay: $focusDay,
                            direction: weekDirection,
                            onOpenRole: { sheet = .role($0) },
                            onOpenTask: { sheet = .task($0, $1) },
                            onReview: { sheet = .review },
                            onSwipeWeek: { goWeek($0) }
                        )
                        .transition(.opacity)
                    }
                } else {
                    SpreadSurface(
                        planner: planner,
                        snapshot: snapshot,
                        layout: $layout,
                        editing: $editing,
                        selectedRole: $selectedRole,
                        onOpenRole: { sheet = .role($0) },
                        onOpenTask: { sheet = .task($0, $1) },
                        onNewRole: { sheet = .newRole },
                        onRollover: { Task { await rollover() } },
                        onReview: { sheet = .review },
                        summaryExpanded: $classicHoursExpanded
                    )
                    .id(planner.state?.envelope.profileId)
                    .transition(.opacity)
                }
                Color.clear.frame(height: 16)
            }
            // iOS 27 resizable scenes: Wallet responsibility cards use the *available*
            // window width, including iPad and Duo. Only the more text-dense Week
            // timeline keeps a readable column cap. Never size from UIScreen.main.
            .frame(maxWidth: destination == .spread ? .infinity : 1120)
            .frame(maxWidth: .infinity)
            // Without this the week's slide transition never plays: a changed week would just swap in place.
            .animation(reduceMotion ? nil : SpreadTactile.glide, value: snapshot.weekKey)
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: focusDay) { _, day in
                // Picking a day in Month scrolls its card into view, once.
                guard let day else { return }
                withAnimation(reduceMotion ? nil : SpreadMotion.curve) { proxy.scrollTo(day, anchor: .top) }
                focusDay = nil
            }
            }
        }
    }

    /// An illustrated empty state: the notebook drawing, one sentence, one lit action.
    private var emptyPlan: some View {
        VStack(spacing: 14) {
            ChalkMotionArt(category: "custom", size: 230)
            Text("Make room for what matters")
                .font(.system(.title2, weight: .bold)).multilineTextAlignment(.center)
            Text("Name a responsibility, give it hours, then place those hours in your week.")
                .font(.system(.subheadline)).foregroundStyle(Spread.secondary).multilineTextAlignment(.center)
            Button { sheet = .newRole } label: {
                Text("Add responsibility")
                    .font(.system(.headline, weight: .semibold)).foregroundStyle(Spread.onAccent)
                    .padding(.horizontal, 28).frame(minHeight: 50)
                    .background(Capsule().fill(Spread.accentGradient))
            }
            .buttonStyle(.spreadPress)
            .padding(.top, 6)
            .accessibilityIdentifier("create-first-spread")
        }
        .padding(.horizontal, Spread.space8)
        .padding(.top, 28)
        .frame(maxWidth: .infinity)
    }

    // MARK: Header

    /// Labels fold left into their associated icon while the icon remains
    /// tappable. Crown, dates, and sheet controls do not participate.
    private var headerTextExit: AnyTransition {
        .offset(x: -20)
            .combined(with: .scale(scale: 0.45, anchor: .leading))
            .combined(with: .opacity)
    }

    /// Compact and stable: the brand and the one Spread/Week switch share a row, the Week control sits below, and
    /// nothing in here changes size after launch. When large text no longer fits one row, the switch drops below.
    private func header(_ snapshot: PlannerSnapshot, isMonth: Bool) -> some View {
        let isCurrent = snapshot.weekKey == PlannerDates.currentWeekKey()
        let now = Date()
        let onThisMonth = Calendar.current.isDate(monthAnchor, equalTo: now, toGranularity: .month)
        let range = PlannerDates.weekRange(base: snapshot.weekKey, offset: 0)
        // The readout's title, detail, and the tap action are chosen once here, so each stays a plain typed value.
        let title: String = isMonth ? PlannerDates.label(monthAnchor, pattern: "MMMM yyyy") : (isCurrent ? "This week" : range)
        let detail: String? = isMonth ? (onThisMonth ? nil : "Back to this month") : (isCurrent ? range : "Back to this week")
        let detailAction: (() -> Void)?
        if isMonth {
            detailAction = onThisMonth ? nil : { jumpMonth(to: now) }
        } else {
            detailAction = isCurrent ? nil : { Task { await moveToToday() } }
        }
        let move: (Int) -> Void = { delta in
            if isMonth { changeMonth(delta) } else { goWeek(delta) }
        }
        return VStack(spacing: 10) {
            ViewThatFits(in: .horizontal) {
                HStack(spacing: Spread.space3) {
                    navigationButton
                    brandButton
                    Spacer(minLength: 8)
                    destinationRail
                }
                VStack(spacing: Spread.space2) {
                    HStack { navigationButton; brandButton; Spacer(minLength: 0) }
                    destinationRail
                }
            }
            WeekCrownView(title: title, detail: detail, onDetail: detailAction, onMove: move, isMonth: isMonth)
        }
        .padding(.horizontal, Spread.space4)
        .padding(.top, 6)
        .padding(.bottom, 6)
        .background(reduceTransparency ? Spread.canvas : Spread.canvas.opacity(0.94))
        .accessibilityElement(children: .contain)
        .accessibilityValue(headerLabelsCollapsed ? "Compact navigation" : "Labeled navigation")
        .accessibilityIdentifier("top-header")
    }

    private var activeProfileName: String? {
        planner.profiles.first(where: { $0.id == planner.state?.envelope.profileId })?.name
    }

    private var navigationButton: some View {
        Button {
            SpreadHaptics.selection()
            withAnimation(reduceMotion ? nil : SpreadTactile.glide) {
                if usableWidth >= 820 { navigationExpanded.toggle() }
                else { classicNavigationOpen.toggle() }
            }
        } label: { SpreadIcon(name: "lucide-panel-left", size: 20).frame(width: Spread.minimumTarget, height: Spread.minimumTarget) }
        .buttonStyle(.spreadPress)
        .accessibilityLabel("Open navigation")
        .accessibilityIdentifier("classic-navigation")
    }
    private var classicNavigation: some View {
        PlannerNavigationRail(items: [
            PlannerNavigationItem(id: "spread", title: "Spread", icon: "icon-spread-list"),
            PlannerNavigationItem(id: "hours", title: "Hours", icon: "icon-rollover"),
            PlannerNavigationItem(id: "week", title: "Week", icon: "icon-week")
        ], selected: destination == .week ? "week" : classicHoursExpanded ? "hours" : "spread",
           expanded: $navigationExpanded) { item in
            withAnimation(reduceMotion ? nil : SpreadTactile.glide) {
                classicNavigationOpen = false
                classicHoursExpanded = item == "hours"
                destination = item == "week" ? .week : .spread
            }
        }
    }
    private func closeClassicNavigation() {
        withAnimation(reduceMotion ? nil : SpreadTactile.glide) { classicNavigationOpen = false }
    }

    /// The brand: the folded-card blue icon and "Spread" in the system face. With more than one profile the open
    /// profile's name sits under it, and the whole block returns home. It is the same on every screen.
    private var brandButton: some View {
        Button { goHome() } label: {
            HStack(spacing: 10) {
                SpreadBrandMark(size: 36)
                if !headerLabelsCollapsed || typeSize.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Spread")
                            .font(.system(.headline, weight: .semibold))
                            .foregroundStyle(Spread.ink)
                            .accessibilityIdentifier("header-brand-title")
                        if planner.profiles.count > 1, let active = activeProfileName {
                            Text(active)
                                .font(.system(.caption))
                                .foregroundStyle(Spread.secondary)
                                .lineLimit(typeSize.isAccessibilitySize ? nil : 2)
                                .frame(maxWidth: 160, alignment: .leading)
                                .fixedSize(horizontal: false, vertical: true)
                                .accessibilityIdentifier("active-profile-name")
                        }
                    }
                    .transition(headerTextExit)
                }
            }
            .frame(minWidth: Spread.minimumTarget, minHeight: Spread.minimumTarget, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.spreadPress)
        .accessibilityLabel(planner.profiles.count > 1 ? "Spread, home. Profile \(activeProfileName ?? "")" : "Spread, home")
        .accessibilityIdentifier("brand-home")
    }

    /// The Spread/Week switch: a recessed trough with one lit segment. Month is a mode inside Week, so there are
    /// two segments only. After the intro, their text folds into the icons.
    /// The actual buttons keep their VoiceOver labels and 44pt targets.
    private var destinationRail: some View {
        let arrangement = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: 2)) : AnyLayout(HStackLayout(spacing: 2))
        return arrangement {
            ForEach(SpreadDestination.allCases) { item in
                let selected = destination == item
                Button {
                    guard destination != item else { return }
                    if item == .spread { monthPlane = false }
                    editing = false
                    withAnimation(reduceMotion ? nil : SpreadMotion.curve) { destination = item }
                } label: {
                    HStack(spacing: 6) {
                        SpreadIcon(name: item.iconName, size: 20)
                        if !headerLabelsCollapsed || typeSize.isAccessibilitySize {
                            Text(item.label)
                                .font(.system(.subheadline, weight: .semibold))
                                .accessibilityIdentifier(item == .week ? "header-label-week" : "header-label-spread")
                                .transition(headerTextExit)
                        }
                    }
                    .foregroundStyle(selected ? Spread.onAccent : Spread.secondary)
                    .padding(.horizontal, 14)
                    .frame(minHeight: Spread.minimumTarget)
                    .background {
                        if selected { Capsule().fill(Spread.accentGradient) }
                    }
                    .contentShape(Capsule())
                }
                .buttonStyle(.spreadPress)
                .accessibilityLabel(item.label)
                .accessibilityAddTraits(selected ? .isSelected : [])
                .accessibilityIdentifier(item == .week ? "native-week" : "native-spread")
            }
        }
        .padding(3)
        .background(Capsule().fill(Spread.inset))
        .overlay(Capsule().strokeBorder(Spread.line, lineWidth: 0.5))
        .fixedSize(horizontal: !typeSize.isAccessibilitySize, vertical: false)
    }

    // MARK: Notices

    @ViewBuilder private var notices: some View {
        if let notice = planner.recoveryNotice, dismissedNotice != notice {
            VStack(alignment: .leading, spacing: Spread.space2) {
                Label(notice, systemImage: "exclamationmark.shield").foregroundStyle(Spread.caution)
                HStack {
                    Button { sheet = .backup } label: { Text("Backup and restore").tapTarget() }
                    Button { dismissedNotice = notice } label: { Text("Got it").tapTarget() }
                }
            }
            .padding(Spread.space3)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
            .padding(.top, Spread.space2)
        }
        if let failure = planner.saveFailure {
            VStack(alignment: .leading, spacing: Spread.space2) {
                Label(failure == "newer" ? "Update Spread to edit this plan" : "Changes are not saved on this device",
                      systemImage: "exclamationmark.triangle")
                    .font(.headline).foregroundStyle(Spread.danger)
                HStack {
                    if failure != "newer" {
                        Button { Task { planner.error = nil; await planner.send(["type": "retrySave"]) } } label: { Text("Retry saving").tapTarget() }
                            .accessibilityIdentifier("retry-saving")
                    }
                    Button { sheet = .backup } label: { Text("Back up").tapTarget() }
                        .accessibilityIdentifier("back-up")
                }
            }
            .padding(Spread.space3)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
            .padding(.top, Spread.space2)
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("save-failure-banner")
        }
    }

    // MARK: Dock

    /// The floating chrome: one capsule holding Done / Edit, the Week-Month morph and Settings. It never carries a
    /// second copy of a command that is already on screen, and Done is the only lit control in it.
    private var dock: some View {
        VStack(spacing: Spread.space2) {
            if let undo = planner.undoId {
                undoNotice(undo)
            }
            HStack(spacing: 0) {
                if destination == .week && !monthPlane && selectedRole != nil {
                    doneButton { selectedRole = nil }
                        .padding(.trailing, Spread.space1)
                    dockDivider
                }
                if destination == .week && !weekFocusEnabled {
                    Button {
                        if monthPlane { closeMonth() } else { openMonth() }
                    } label: {
                        ViewMorphIcon(boxes: !monthPlane, size: 24).frame(width: Spread.minimumTarget, height: Spread.minimumTarget).contentShape(Rectangle())
                    }
                    .buttonStyle(.spreadPress)
                    .accessibilityLabel(monthPlane ? "Week" : "Month")
                    .accessibilityIdentifier("week-month-toggle")
                    .accessibilityValue(monthPlane ? "Month" : "Week")
                    dockDivider
                }
                if destination == .spread {
                    if editing {
                        doneButton { editing = false }
                    } else {
                        Button { editing = true } label: {
                            HStack(spacing: 6) {
                                SpreadIcon(name: "icon-edit", size: 22)
                                Text("Edit").font(.system(.subheadline, weight: .semibold))
                            }
                            .foregroundStyle(Spread.accent)
                            .padding(.horizontal, 14).frame(minHeight: Spread.minimumTarget)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.spreadPress)
                        .accessibilityIdentifier("edit-spreads")
                    }
                }
                if !(destination == .spread && editing) {
                    Button { openSettingsFromDock() } label: {
                        SettingsGears(turn: gearTurn, size: 30).frame(width: Spread.minimumTarget, height: Spread.minimumTarget).contentShape(Rectangle())
                    }
                    .buttonStyle(.spreadPress)
                    .accessibilityLabel("More")
                    .accessibilityIdentifier("open-more")
                }
            }
            .padding(6)
            .background {
                // iOS 27 refresh: the floating *control* dock may use system
                // Liquid Glass; responsibility cards and task content never do.
                // The accessibility fallback is fully opaque and high-contrast.
                if reduceTransparency {
                    Capsule().fill(Spread.elevated)
                } else {
                    // Keep Liquid Glass with modern SDKs while allowing older
                    // Swift toolchains to compile the native archive.
                    #if compiler(>=6.2)
                    if #available(iOS 26.0, *) {
                        Capsule().fill(Color.clear)
                            .glassEffect(.regular, in: Capsule())
                    } else {
                        Capsule().fill(.regularMaterial)
                    }
                    #else
                    Capsule().fill(.regularMaterial)
                    #endif
                }
            }
            .overlay {
                // System glass draws its own edge. Adding a second border makes
                // the dock look cheap and lowers contrast over busy cards.
                if reduceTransparency {
                    Capsule().strokeBorder(Spread.line, lineWidth: 1)
                } else if #unavailable(iOS 26.0) {
                    Capsule().strokeBorder(Spread.glassStroke, lineWidth: 0.5)
                }
            }
            .shadow(color: Spread.shadow, radius: 14, y: 6)
        }
        .padding(.horizontal, Spread.space4)
        .padding(.bottom, Spread.space2)
    }

    /// The one lit control in the dock.
    private func doneButton(_ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text("Done").font(.system(.subheadline, weight: .semibold)).foregroundStyle(Spread.onAccent)
                .padding(.horizontal, Spread.space5).frame(minHeight: Spread.minimumTarget)
                .background(Capsule().fill(Spread.accentGradient))
        }
        .buttonStyle(.spreadPress)
        .accessibilityIdentifier("dock-done")
    }

    private var dockDivider: some View {
        Rectangle().fill(Spread.glassLine).frame(width: 1, height: 24).padding(.horizontal, Spread.space1)
    }

    /// Quiet Undo: one line, the last change, dismissed after six seconds.
    private func undoNotice(_ editId: String) -> some View {
        Button { Task { await planner.send(["type": "undo", "editId": editId]) } } label: {
            HStack(spacing: Spread.space2) {
                SpreadIcon(name: "lucide-rotate-ccw", size: 16)
                Text("Undo last change").font(.system(.subheadline, weight: .semibold))
            }
            .foregroundStyle(Spread.accent)
            .padding(.horizontal, 18).frame(minHeight: Spread.minimumTarget)
            .background(Capsule().fill(Spread.elevated))
            .overlay(Capsule().strokeBorder(Spread.line, lineWidth: 0.5))
            .shadow(color: Spread.shadow, radius: 10, y: 4)
        }
        .buttonStyle(.spreadPress)
        .accessibilityIdentifier("undo-last-change")
    }

    // MARK: Navigation intents

    private func persistView() {
        SpreadViewMemory.write(.init(destination: destination, monthPlane: monthPlane), profileId: planner.state?.envelope.profileId)
    }

    private func weekChanged() {
        if editing { editing = false }
    }

    private func goHome() {
        editing = false
        selectedRole = nil
        monthPlane = false
        withAnimation(reduceMotion ? nil : SpreadMotion.curve) { destination = .spread }
    }

    /// A long press may request new weeks faster than bridge saves complete.
    /// Queue and coalesce those requests against the current acknowledged week.
    private func goWeek(_ delta: Int) {
        guard delta != 0 else { return }
        pendingWeekMoves += delta
        guard !weekMoveRunning else { return }
        weekMoveRunning = true
        Task {
            defer { weekMoveRunning = false }
            while pendingWeekMoves != 0 {
                let move = pendingWeekMoves
                pendingWeekMoves = 0
                guard let week = planner.snapshot?.weekKey,
                      let target = PlannerDates.calendar.date(byAdding: .weekOfYear,
                                                               value: move, to: PlannerDates.date(week)) else {
                    pendingWeekMoves = 0
                    return
                }
                guard await planner.send(["type": "openWeek", "weekKey": PlannerDates.weekKey(for: target)]) else {
                    pendingWeekMoves = 0
                    return
                }
                weekTick += 1
            }
        }
    }

    private func moveToToday() async {
        pendingWeekMoves = 0
        weekDirection = 0
        if await planner.send(["type": "changeWeek", "direction": "today"]) { weekTick += 1 }
    }

    private func keyWeek(_ delta: Int) -> KeyPress.Result {
        guard sheet == nil else { return .ignored }
        if destination == .week && monthPlane { changeMonth(delta) } else if destination == .week { goWeek(delta) } else { return .ignored }
        return .handled
    }

    private func changeMonth(_ delta: Int) {
        monthAnchor = Calendar.current.date(byAdding: .month, value: delta, to: monthAnchor) ?? monthAnchor
    }

    private func jumpMonth(to date: Date) {
        monthAnchor = PlannerDates.calendar.date(from: PlannerDates.calendar.dateComponents([.year, .month], from: date)) ?? date
    }

    private func openMonth() {
        if let snapshot = planner.snapshot {
            monthAnchor = PlannerDates.calendar.date(from: PlannerDates.calendar.dateComponents([.year, .month], from: PlannerDates.date(snapshot.weekKey))) ?? monthAnchor
        }
        withAnimation(reduceMotion ? nil : SpreadMotion.morph) { monthPlane = true }
    }

    private func closeMonth() {
        withAnimation(reduceMotion ? nil : SpreadMotion.morph) { monthPlane = false }
    }

    /// Choosing a day opens its week and returns to the Week surface, as the React month did.
    private func pickDay(_ iso: String) {
        Task {
            let monday = PlannerDates.weekKey(for: PlannerDates.date(iso))
            if await planner.send(["type": "openWeek", "weekKey": monday]) {
                focusDay = iso
                withAnimation(reduceMotion ? nil : SpreadMotion.morph) { monthPlane = false }
            }
        }
    }

    private func rollover() async {
        // A previous confirmation must never be reused if this request fails.
        planner.rolloverOutcome = nil
        guard await planner.send(["type": "rollover", "force": false]) else { return }
        if planner.rolloverOutcome == "confirm" { sheet = .confirmRollover }
    }

    private func openSettingsFromDock() {
        gearTurn = false
        Task {
            gearTurn = true
            try? await Task.sleep(nanoseconds: 380_000_000)
            gearTurn = false
        }
        sheet = .more
    }

    // MARK: Sheets

    @ViewBuilder private func sheetContent(_ current: LiveSheet) -> some View {
        switch current {
        case .newRole:
            NewSpreadSheet(planner: planner)
        case .role(let roleId):
            RoleSheet(planner: planner, roleId: roleId, onOpenTask: { sheet = .task(roleId, $0) })
        case .task(let roleId, let taskId):
            TaskSheet(planner: planner, roleId: roleId, taskId: taskId, lifeMode: weekFocusEnabled)
        case .review:
            CarryOverSheet(planner: planner)
        case .more:
            MoreSheet(planner: planner, focusTimer: focusTimer, backup: { sheet = .backup }, showProfiles: { sheet = .profiles }, appearance: $appearance, weekFocusEnabled: $weekFocusEnabled)
        case .profiles:
            ProfilesSheet(planner: planner)
        case .backup:
            BackupRestoreSheet(planner: planner)
        case .confirmRollover:
            RolloverConfirm(planner: planner)
        }
    }
}

// Sheet-level confirmation for "replace next week" (rollover) and role deletion. Kept as small sheets so
// they inherit the same presentation, grabber, and dismissal as every other sheet.
private struct RolloverConfirm: View {
    @ObservedObject var planner: LivePlanner
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: Spread.space4) {
            Text("Replace next week?").font(Spread.sheetTitle)
            Text("Next week already has tasks or days. Copying this week replaces them. This week stays as it is.")
                .font(Spread.callout).foregroundStyle(Spread.secondary).multilineTextAlignment(.center)
            Button("Replace") {
                Task {
                    _ = await planner.send(["type": "rollover", "force": true])
                    dismiss()
                }
            }
            .buttonStyle(.borderedProminent).tint(Spread.danger)
            .frame(minHeight: Spread.minimumTarget)
            Button("Cancel") { dismiss() }.frame(minHeight: Spread.minimumTarget)
        }
        .padding(Spread.space6)
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }
}

/// Reports the environment inside the appearance override, so acceptance tests verify what rendered.
private struct PlannerAccessibilityState: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorScheme) private var scheme

    func body(content: Content) -> some View {
        content.accessibilityValue("\(reduceMotion ? "reduce-motion" : "motion");\(scheme == .dark ? "dark" : "light")")
    }
}
#endif
