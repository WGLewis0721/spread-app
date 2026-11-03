#if os(iOS)
import SwiftUI

struct WeekPreviewView: View {
    let snapshot: PlannerSnapshot
    @State private var selectedTask: PlannerTask?
    @State private var showingMonth = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Your week").font(.title2.weight(.semibold))
                    Spacer()
                    Button(showingMonth ? "Week" : "Month") { showingMonth.toggle() }
                        .buttonStyle(.bordered)
                }
                .foregroundStyle(Chalk.ink)

                HStack(spacing: 10) {
                    metric("Planned", snapshot.roles.reduce(0) { $0 + $1.hours })
                    metric("Placed", snapshot.allocations.reduce(0) { $0 + $1.hours })
                    metric("Left", snapshot.roles.reduce(0) { $0 + snapshot.remainingHours(for: $1.id) })
                }
                if !snapshot.unplacedTasks.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Label("To place", systemImage: "tray")
                            .font(.headline).foregroundStyle(Chalk.ink)
                        ForEach(snapshot.unplacedTasks) { task in
                            Button {
                                selectedTask = task
                            } label: {
                                HStack {
                                    Text(task.text).font(.subheadline)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                }
                                .foregroundStyle(Chalk.ink)
                                .frame(minHeight: 44)
                            }
                        }
                    }
                    .padding(16)
                    .background(RoundedRectangle(cornerRadius: 20)
                        .strokeBorder(Chalk.secondary.opacity(0.5), style: StrokeStyle(lineWidth: 1, dash: [6, 5])))
                }
                if showingMonth {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Month").font(.headline)
                        Text("Month grid will reuse the existing week's dates after the live bridge is connected.")
                            .font(.subheadline).foregroundStyle(Chalk.secondary)
                    }
                    .padding(18).frame(maxWidth: .infinity)
                    .background(Chalk.surface, in: RoundedRectangle(cornerRadius: 18))
                } else {
                    ForEach(0..<7, id: \.self) { index in
                        let iso = PreviewDates.dayISO(weekKey: snapshot.weekKey, index: index)
                        let items = snapshot.allocations.filter { $0.day == iso }
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Text(PreviewDates.weekday(weekKey: snapshot.weekKey, index: index))
                                    .font(.headline)
                                Text(PreviewDates.dayNumber(weekKey: snapshot.weekKey, index: index))
                                    .foregroundStyle(Chalk.secondary)
                                Spacer()
                                Text("\(items.reduce(0) { $0 + $1.hours }.formatted())h")
                                    .font(.subheadline).monospacedDigit()
                                    .foregroundStyle(Chalk.secondary)
                            }
                            if items.isEmpty {
                                Text("Nothing planned").font(.subheadline)
                                    .foregroundStyle(Chalk.secondary)
                            }
                            ForEach(items) { item in
                                if let role = snapshot.roles.first(where: { $0.id == item.roleId }) {
                                    HStack(spacing: 8) {
                                        Capsule().fill(Color(cssHex: role.color))
                                            .frame(width: 4, height: 26)
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(role.name).font(.subheadline.weight(.medium))
                                            Text("\(item.hours.formatted())h").font(.caption)
                                                .foregroundStyle(Chalk.secondary)
                                        }
                                        Spacer()
                                    }
                                    .frame(minHeight: 44)
                                }
                            }
                        }
                        .foregroundStyle(Chalk.ink)
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Chalk.surface, in: RoundedRectangle(cornerRadius: 22))
                    }
                }
            }
            .padding(20)
        }
        .background(Chalk.canvas)
        .sheet(item: $selectedTask) { task in
            NavigationStack {
                VStack(alignment: .leading, spacing: 18) {
                    Text(task.text).font(.title3.weight(.semibold))
                    Text("This is a read-only SwiftUI design preview. Task placement will call the existing React planner store through the typed bridge in the next implementation gate.")
                        .font(.subheadline).foregroundStyle(.secondary)
                    Spacer()
                }
                .padding(20)
                .navigationTitle("Task")
                .toolbar { ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { selectedTask = nil }
                }}
            }
            .presentationDetents([.medium])
        }
    }

    private func metric(_ label: String, _ value: Double) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label).font(.caption).foregroundStyle(Chalk.secondary)
            Text("\(value.formatted())h")
                .font(.title3.weight(.semibold)).monospacedDigit()
                .foregroundStyle(Chalk.ink)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Chalk.surface, in: RoundedRectangle(cornerRadius: 16))
    }
}
#endif
