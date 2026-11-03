#if os(iOS)
import SwiftUI

struct SpreadLayoutsView: View {
    let snapshot: PlannerSnapshot
    @Binding var mode: SpreadLayout
    @Binding var selectedId: String
    var onManage: (Responsibility) -> Void = { _ in }
    @State private var selectedDay: String = ""
    @State private var showModePicker = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var selectedRole: Responsibility? {
        snapshot.roles.first { $0.id == selectedId } ?? snapshot.roles.first
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Responsibilities").font(.title2.weight(.semibold)).foregroundStyle(Chalk.ink)
                        Text("Plan hours, then place them in your week.")
                            .font(.subheadline).foregroundStyle(Chalk.secondary)
                    }
                    Spacer()
                    Button { showModePicker = true } label: {
                        Label(mode.title, systemImage: "square.stack")
                            .font(.subheadline.weight(.medium))
                    }
                    .buttonStyle(.bordered)
                    .accessibilityLabel("View, \(mode.title)")
                }

                switch mode {
                case .stack: stack
                case .fan: fan
                case .dial: dial
                case .tabs: tabs
                case .day: day
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 24)
        }
        .background(Chalk.canvas)
        .onAppear { selectedDay = snapshot.weekKey }
        .onChange(of: snapshot.weekKey) { _, key in selectedDay = key }
        .sheet(isPresented: $showModePicker) {
            NavigationStack {
                List(SpreadLayout.allCases) { item in
                    Button {
                        mode = item
                        showModePicker = false
                    } label: {
                        HStack {
                            Text(item.title)
                            Spacer()
                            if mode == item { Image(systemName: "checkmark") }
                        }
                    }
                    .foregroundStyle(.primary)
                    .frame(minHeight: 44)
                }
                .navigationTitle("View")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { showModePicker = false }
                }}
            }
            .presentationDetents([.medium, .large])
        }
    }

    private var stack: some View {
        VStack(spacing: -12) {
            ForEach(snapshot.roles) { role in
                card(role, expanded: selectedRole?.id == role.id)
                    .zIndex(selectedRole?.id == role.id ? 1 : 0)
            }
        }
    }

    private var fan: some View {
        VStack(spacing: 12) {
            GeometryReader { geo in
                let roles = snapshot.roles
                let selectedIndex = roles.firstIndex(where: { $0.id == selectedRole?.id }) ?? 0
                ZStack {
                    ForEach(Array(roles.enumerated()), id: \.element.id) { index, role in
                        let distance = index - selectedIndex
                        card(role, expanded: distance == 0)
                            .frame(width: min(geo.size.width * 0.78, 300))
                            .rotationEffect(.degrees(Double(distance) * 7), anchor: .bottom)
                            .offset(x: CGFloat(distance) * 40, y: CGFloat(abs(distance)) * 12)
                            .zIndex(Double(roles.count - abs(distance)))
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .contentShape(Rectangle())
                .gesture(DragGesture(minimumDistance: 8).onEnded { value in
                    guard abs(value.translation.width) > 42, !roles.isEmpty else { return }
                    let delta = value.translation.width < 0 ? 1 : -1
                    let next = min(max(0, selectedIndex + delta), roles.count - 1)
                    changeSelection(roles[next].id)
                })
            }
            .frame(height: 290)
            if let role = selectedRole {
                Text("Swipe the fan or select a card · \(role.name)")
                    .font(.caption).foregroundStyle(Chalk.secondary)
            }
        }
    }

    private var dial: some View {
        let arcs = DialGeometry.arcs(for: snapshot.roles)
        return VStack(spacing: 16) {
            GeometryReader { g in
                let side = min(280.0, g.size.width)
                ZStack {
                    ForEach(arcs) { arc in
                        let tint = Color(cssHex: snapshot.roles.first(where: { $0.id == arc.id })?.color ?? "#777777")
                        Circle()
                            .trim(from: arc.from / 360, to: arc.to / 360)
                            .stroke(tint, style: StrokeStyle(lineWidth: 42, lineCap: .butt))
                            .rotationEffect(.degrees(-90))
                            .opacity(selectedRole?.id == arc.id ? 1 : 0.55)
                    }
                    Circle().fill(Chalk.canvas).frame(width: side * 0.57)
                    VStack(spacing: 2) {
                        Text(selectedRole?.name ?? "Spread").font(.headline)
                        Text("\(selectedRole?.hours.formatted() ?? "0")h")
                            .font(.title2.weight(.semibold)).monospacedDigit()
                        Text("planned").font(.caption).foregroundStyle(Chalk.secondary)
                    }
                    .foregroundStyle(Chalk.ink)
                }
                .frame(width: side, height: side)
                .frame(maxWidth: .infinity)
                .contentShape(Circle())
                .gesture(
                    SpatialTapGesture().onEnded { value in
                        let center = CGPoint(x: g.size.width / 2, y: side / 2)
                        let angle = atan2(Double(value.location.x - center.x), Double(center.y - value.location.y))
                            * 180 / Double.pi
                        if let chosen = DialGeometry.roleId(at: angle, arcs: arcs) {
                            changeSelection(chosen)
                        }
                    }
                )
            }
            .frame(height: 300)
            if let role = selectedRole { card(role, expanded: true); Button("Manage \(role.name)") { onManage(role) }.frame(minHeight: 44) }
        }
    }

    private var tabs: some View {
        VStack(alignment: .leading, spacing: 14) {
            ScrollView(.horizontal) {
                HStack {
                    ForEach(snapshot.roles) { role in
                        Button(role.name) { changeSelection(role.id) }
                            .buttonStyle(.bordered)
                            .tint(selectedRole?.id == role.id ? Chalk.yellow : Chalk.secondary)
                            .frame(minHeight: 44)
                    }
                }
            }
            if let role = selectedRole { card(role, expanded: true); Button("Manage \(role.name)") { onManage(role) }.frame(minHeight: 44) }
        }
    }

    private var day: some View {
        VStack(alignment: .leading, spacing: 16) {
            ScrollView(.horizontal) {
                HStack(spacing: 8) {
                    ForEach(0..<7, id: \.self) { index in
                        let iso = PreviewDates.dayISO(weekKey: snapshot.weekKey, index: index)
                        Button {
                            selectedDay = iso
                        } label: {
                            VStack(spacing: 5) {
                                Text(PreviewDates.weekday(weekKey: snapshot.weekKey, index: index)).font(.caption)
                                Text(PreviewDates.dayNumber(weekKey: snapshot.weekKey, index: index))
                                    .font(.headline)
                            }
                            .frame(width: 45, height: 54)
                            .foregroundStyle(selectedDay == iso ? Chalk.canvas : Chalk.ink)
                            .background(selectedDay == iso ? Chalk.yellow : Chalk.surface,
                                        in: RoundedRectangle(cornerRadius: 12))
                        }
                        .accessibilityLabel(iso)
                    }
                }
            }
            let current = snapshot.allocations.filter { $0.day == selectedDay }
            if current.isEmpty {
                Text("No hours placed on this day")
                    .font(.subheadline).foregroundStyle(Chalk.secondary)
                    .frame(maxWidth: .infinity, minHeight: 120)
            } else {
                ForEach(current) { allocation in
                    if let role = snapshot.roles.first(where: { $0.id == allocation.roleId }) {
                        HStack {
                            ChalkIllustration(category: role.category).frame(width: 72, height: 52)
                            VStack(alignment: .leading) {
                                Text(role.name).font(.headline)
                                Text("\(allocation.hours.formatted()) hours allocated")
                                    .font(.caption).foregroundStyle(Chalk.secondary)
                            }
                            Spacer()
                        }
                        .padding(12)
                        .background(Chalk.surface, in: RoundedRectangle(cornerRadius: 16))
                        .overlay(RoundedRectangle(cornerRadius: 16)
                            .stroke(Color(cssHex: role.color).opacity(0.7)))
                    }
                }
            }
            Text("Hours are allocations, not calendar appointments.")
                .font(.caption).foregroundStyle(Chalk.secondary)
        }
    }

    @ViewBuilder
    private func card(_ role: Responsibility, expanded: Bool) -> some View {
        ChalkRoleCard(
            role: role,
            remainingHours: snapshot.remainingHours(for: role.id),
            tasks: snapshot.tasks(for: role.id),
            expanded: expanded,
            onSelect: { if selectedId == role.id { onManage(role) } else { changeSelection(role.id) } }
        )
    }

    private func changeSelection(_ id: String) {
        if reduceMotion {
            selectedId = id
        } else {
            withAnimation(.spring(response: 0.32, dampingFraction: 0.86)) {
                selectedId = id
            }
        }
    }
}
#endif
