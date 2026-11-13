#if os(iOS)
import SwiftUI

/// Backup and restore for modern Spread. The one place that makes and reads a `.spread` file. The file is made and read
/// by the same code as the web planner's More sheet, through the planner's bridge, so a file from either is the same file.
struct BackupRestoreSheet: View {
    @ObservedObject var planner: LivePlanner
    @Environment(\.dismiss) private var dismiss
    @State private var importing = false
    @State private var busy = false
    @State private var message: String?
    @State private var preview: BackupPreview?
    @State private var previewText: String?
    @State private var picked: Set<String> = []

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

                    section("Restore") {
                        Text("Add the profiles from a .spread backup or a plan file (.json) as new profiles. Your current profiles are not changed.")
                            .font(Spread.callout).foregroundStyle(Spread.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                        Button { importing = true } label: {
                            Label("Choose a backup file", systemImage: "square.and.arrow.down")
                                .font(.system(.body, weight: .semibold))
                                .frame(maxWidth: .infinity, minHeight: 50)
                        }
                        .buttonStyle(.bordered)
                        .disabled(busy)
                        .accessibilityIdentifier("backup-choose")
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
                ToolbarItem(placement: .cancellationAction) {
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

    private func previewSection(_ preview: BackupPreview) -> some View {
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
        busy = true
        message = nil
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
