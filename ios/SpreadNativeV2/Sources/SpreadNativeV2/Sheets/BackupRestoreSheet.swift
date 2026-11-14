#if os(iOS)
import SwiftUI

/// Backup and restore for modern Spread. The one place that makes and reads a `.spread` file, and that previews and
/// merges a plan file. The files are made and read by the same code as the web planner's More sheet, through the
/// planner's bridge, so a file from either is the same file.
struct BackupRestoreSheet: View {
    @ObservedObject var planner: LivePlanner
    @Environment(\.dismiss) private var dismiss
    @State private var importing = false
    @State private var busy = false
    @State private var message: String?
    @State private var issues: [String] = []
    @State private var preview: BackupPreview?
    @State private var previewText: String?
    @State private var picked: Set<String> = []
    @State private var removeAreas = false
    @State private var removeItems = false

    var body: some View {
        SpreadSheetStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    section("Back up") {
                        Text("Back up Spread makes two files. The .spread backup restores everything, and it can't be edited: a changed file is rejected. The plan file (.json) is your schedule in plain text. You can edit it yourself or give it to an AI tool. It leaves out settings, attachments, rich notes, recurring plans and the recycle bin. Whatever you share goes to whoever receives it.")
                            .font(Spread.callout).foregroundStyle(Spread.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                        Button { makeBackup() } label: {
                            Label("Back up Spread", systemImage: "square.and.arrow.up")
                                .font(.system(.body, weight: .semibold))
                                .frame(maxWidth: .infinity, minHeight: 50)
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(busy || planner.snapshot == nil)
                        .accessibilityIdentifier("backup-make")
                    }

                    section("Restore and merge") {
                        Text("Choose a .spread backup or a plan file (.json). A backup, or a plan that creates a profile, adds it as a new profile. A plan that changes this profile is previewed first, and nothing changes until you choose Merge. Your other profiles are not changed.")
                            .font(Spread.callout).foregroundStyle(Spread.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                        Button { importing = true } label: {
                            Label("Choose a file", systemImage: "square.and.arrow.down")
                                .font(.system(.body, weight: .semibold))
                                .frame(maxWidth: .infinity, minHeight: 50)
                        }
                        .buttonStyle(.bordered)
                        .disabled(busy)
                        .accessibilityIdentifier("backup-choose")
                    }

                    if preview == nil, !issues.isEmpty {
                        noticeCard("Can’t use this file yet", issues, danger: true)
                    }

                    if let preview {
                        previewSection(preview)
                    }

                    if let message {
                        Text(message)
                            .font(Spread.callout).foregroundStyle(Spread.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityIdentifier("backup-message")
                    }
                }
                .padding(20)
                .frame(maxWidth: 620, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
            .navigationTitle("Backup and restore")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .fileImporter(isPresented: $importing, allowedContentTypes: [.data, .item], allowsMultipleSelection: false) { result in
                chooseFile(result)
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private func section<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(.footnote, weight: .semibold))
                .foregroundStyle(Spread.secondary)
                .accessibilityAddTraits(.isHeader)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// A card with a plain title and one line per item. `danger` marks problems; the title says it in words too.
    private func noticeCard(_ title: String, _ lines: [String], danger: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(.body, weight: .semibold))
                .foregroundStyle(danger ? Spread.danger : Spread.secondary)
            ForEach(Array(lines.enumerated()), id: \.offset) { _, line in
                Text("• \(line)")
                    .font(.footnote)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Spread.elevated))
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private func previewSection(_ preview: BackupPreview) -> some View {
        if let merge = preview.merge {
            mergeSection(merge)
        } else {
            profilesSection(preview)
        }
    }

    private func profilesSection(_ preview: BackupPreview) -> some View {
        section("Profiles in this file") {
            Text("\(preview.profiles.count) profiles · \(preview.weeks) weeks · \(preview.tasks) tasks")
                .font(Spread.callout).foregroundStyle(Spread.secondary)
            ForEach(preview.profiles) { profile in
                if profile.readable {
                    Toggle(isOn: binding(profile.id)) {
                        profileLabel(profile)
                    }
                    .accessibilityIdentifier("backup-profile-\(profile.id)")
                } else {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(profile.name).font(.body)
                        Text("Damaged in this file. It cannot be restored.")
                            .font(.footnote).foregroundStyle(Spread.danger)
                    }
                }
            }
            Button { restore() } label: {
                Label("Restore selected profiles", systemImage: "arrow.uturn.down")
                    .font(.system(.body, weight: .semibold))
                    .frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(.borderedProminent)
            .disabled(picked.isEmpty || busy)
            .accessibilityIdentifier("backup-restore")
        }
    }

    /// The merge preview: what the plan would change, the removal choices, and the Merge button. Nothing changes
    /// until Merge is chosen, and Merge stays off while the plan has problems.
    private func mergeSection(_ merge: MergePreview) -> some View {
        section("Merge into \(merge.profileName)") {
            if merge.stale {
                noticeCard("Check before you merge", ["This profile changed after the plan was made. The summary below is against the profile as it is now."])
            }
            if !merge.issues.isEmpty {
                noticeCard("Can’t merge yet", merge.issues, danger: true)
            }
            removalChoices
            if merge.issues.isEmpty {
                countTiles(merge.counts)
                if !merge.areas.isEmpty {
                    areaRows(merge)
                }
            }
            Text("Merging changes only this profile. Rich notes, the recycle bin and settings are kept. A safety copy of this profile is saved first.")
                .font(.footnote).foregroundStyle(Spread.secondary)
                .fixedSize(horizontal: false, vertical: true)
            mergeButton(merge)
        }
    }

    private var removalChoices: some View {
        VStack(alignment: .leading, spacing: 12) {
            Toggle(isOn: Binding(get: { removeAreas }, set: { on in
                removeAreas = on
                reviewMerge()
            })) {
                choiceLabel("Remove areas the file leaves out", "Off keeps them, with their tasks and hours.")
            }
            .accessibilityIdentifier("backup-remove-areas")
            Toggle(isOn: Binding(get: { removeItems }, set: { on in
                removeItems = on
                reviewMerge()
            })) {
                choiceLabel("Remove tasks and day hours the file leaves out", "Off keeps them in their area.")
            }
            .accessibilityIdentifier("backup-remove-items")
        }
    }

    private func choiceLabel(_ title: String, _ detail: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.body)
            Text(detail).font(.footnote).foregroundStyle(Spread.secondary)
        }
    }

    /// One tile per count that is not zero, so a small change shows a small summary.
    private func countTiles(_ counts: MergeCounts) -> some View {
        let tiles: [(String, Int)] = [
            ("Areas added", counts.areasAdded),
            ("Areas changed", counts.areasChanged),
            ("Areas removed", counts.areasRemoved),
            ("Areas kept", counts.areasKept),
            ("Tasks added", counts.tasksAdded),
            ("Tasks changed", counts.tasksChanged),
            ("Tasks moved", counts.tasksMoved),
            ("Tasks removed", counts.tasksRemoved),
            ("Tasks kept", counts.tasksKept),
            ("Hours changed", counts.hoursChanged),
            ("Day hours changed", counts.daysChanged),
            ("Capacity changed", counts.capacityChanged),
            ("Recurring plans stop", counts.plansStopped),
            ("Weeks changed of \(counts.weeks)", counts.weeksChanged),
        ].filter { $0.1 > 0 }
        return VStack(alignment: .leading, spacing: 10) {
            if tiles.isEmpty {
                Text("Nothing in this file changes this profile.")
                    .font(Spread.callout).foregroundStyle(Spread.secondary)
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 132), spacing: 10)], alignment: .leading, spacing: 10) {
                    ForEach(Array(tiles.enumerated()), id: \.offset) { _, tile in
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(tile.1)")
                                .font(.system(.title2, design: .rounded, weight: .semibold))
                            Text(tile.0)
                                .font(.footnote).foregroundStyle(Spread.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(14)
                        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Spread.elevated))
                        .accessibilityElement(children: .combine)
                    }
                }
            }
        }
    }

    private func areaRows(_ merge: MergePreview) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(Array(merge.areas.enumerated()), id: \.offset) { _, area in
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text(changeLabel(area.change))
                        .font(.system(.caption, weight: .semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .overlay(Capsule().stroke(Spread.secondary.opacity(0.5), lineWidth: 1))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(area.name).font(.body)
                        if let detail = areaDetail(area) {
                            Text(detail)
                                .font(.footnote).foregroundStyle(Spread.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .accessibilityElement(children: .combine)
            }
            if merge.areasOmitted > 0 {
                Text("And \(merge.areasOmitted) more areas.")
                    .font(.footnote).foregroundStyle(Spread.secondary)
            }
        }
    }

    private func changeLabel(_ change: String) -> String {
        switch change {
        case "added": return "Added"
        case "changed": return "Changed"
        case "removed": return "Removed"
        default: return "Kept"
        }
    }

    private func areaDetail(_ area: MergeArea) -> String? {
        switch (area.before, area.after) {
        case let (before?, after?): return "\(before) → \(after)"
        case let (before?, nil): return before
        case let (nil, after?): return after
        default: return nil
        }
    }

    private func mergeButton(_ merge: MergePreview) -> some View {
        Button { mergeNow(merge) } label: {
            Label("Merge into \(merge.profileName)", systemImage: "arrow.triangle.merge")
                .font(.system(.body, weight: .semibold))
                .frame(maxWidth: .infinity, minHeight: 50)
        }
        .buttonStyle(.borderedProminent)
        .disabled(!merge.issues.isEmpty || busy)
        .accessibilityIdentifier("backup-merge")
    }

    private func profileLabel(_ profile: BackupProfile) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(profile.name).font(.body)
            Text("\(profile.weeks) weeks · \(profile.tasks) tasks · \(profile.range)")
                .font(.footnote).foregroundStyle(Spread.secondary)
        }
    }

    private func binding(_ id: String) -> Binding<Bool> {
        Binding(
            get: { picked.contains(id) },
            set: { on in
                if on { picked.insert(id) } else { picked.remove(id) }
            })
    }

    private func makeBackup() {
        busy = true
        message = nil
        Task {
            defer { busy = false }
            switch await planner.makeBackupFile() {
            case .success(let file):
                // Both files are written before the share sheet opens, so a failed write shares nothing.
                let folder = FileManager.default.temporaryDirectory
                do {
                    var items: [URL] = []
                    let backupURL = folder.appendingPathComponent(file.name)
                    try Data(file.text.utf8).write(to: backupURL, options: .atomic)
                    items.append(backupURL)
                    if let planName = file.planName, let planText = file.planText {
                        let planURL = folder.appendingPathComponent(planName)
                        try Data(planText.utf8).write(to: planURL, options: .atomic)
                        items.append(planURL)
                    }
                    WeekExport.share(items)
                } catch {
                    message = "The backup could not be saved on this iPhone. Nothing was changed."
                }
            case .failure(let failure):
                message = failure.message
            }
        }
    }

    private func chooseFile(_ result: Result<[URL], Error>) {
        guard case .success(let urls) = result, let url = urls.first else { return }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        // Refuse a large file before reading it, to match the plan file's limit.
        if let size = (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize, size > 5_000_000 {
            message = "This file is larger than 5 MB, so it was not read. Nothing was changed."
            return
        }
        guard let text = try? String(contentsOf: url, encoding: .utf8) else {
            message = "That file could not be read. Nothing was changed."
            return
        }
        removeAreas = false
        removeItems = false
        busy = true
        message = nil
        issues = []
        Task {
            defer { busy = false }
            switch await planner.previewBackup(text) {
            case .success(let found):
                preview = found
                previewText = text
                picked = Set(found.profiles.filter(\.readable).map(\.id))
            case .failure(let failure):
                preview = nil
                previewText = nil
                message = failure.message
                issues = failure.issues
            }
        }
    }

    /// Re-previews the chosen file with the current removal choices. Called when a switch changes.
    private func reviewMerge() {
        guard let text = previewText else { return }
        busy = true
        Task {
            defer { busy = false }
            await loadMerge(text)
        }
    }

    private func loadMerge(_ text: String) async {
        switch await planner.previewBackup(text, removeAreas: removeAreas, removeItems: removeItems) {
        case .success(let found):
            preview = found
            issues = []
        case .failure(let failure):
            message = failure.message
            issues = failure.issues
        }
    }

    private func mergeNow(_ merge: MergePreview) {
        guard let text = previewText else { return }
        busy = true
        message = nil
        issues = []
        Task {
            defer { busy = false }
            switch await planner.mergeBackup(text, removeAreas: removeAreas, removeItems: removeItems, revision: merge.revision) {
            case .success(let outcome):
                preview = nil
                previewText = nil
                removeAreas = false
                removeItems = false
                message = outcome
                await planner.refresh()
            case .failure(let failure):
                message = failure.message
                // Show the profile as it is now, so the next choice is made on current facts.
                await loadMerge(text)
                if !failure.issues.isEmpty { issues = failure.issues }
            }
        }
    }

    private func restore() {
        guard let text = previewText else { return }
        let chosen = Array(picked)
        busy = true
        message = nil
        Task {
            defer { busy = false }
            switch await planner.restoreBackup(text, select: chosen) {
            case .success(let outcome):
                preview = nil
                previewText = nil
                picked = []
                message = outcome
                await planner.refresh()
            case .failure(let failure):
                message = failure.message
            }
        }
    }
}
#endif
