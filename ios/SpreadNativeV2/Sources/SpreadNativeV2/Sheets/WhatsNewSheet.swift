#if os(iOS)
import SwiftUI

/// One calm, readable release-note surface for both Classic and Life.
/// It is informational only: no account, tracking, update polling or planner writes.
struct WhatsNewSheet: View {
    var showHistory = false
    @Environment(\.dismiss) private var dismiss
    @State private var historyExpanded = false

    private var releases: [SpreadReleaseNote] {
        if showHistory || historyExpanded { return SpreadReleaseNotes.entries }
        return SpreadReleaseNotes.newest(for: SpreadReleaseNotes.appVersion)
            .map { [$0] } ?? []
    }

    var body: some View {
        SpreadSheetStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 10) {
                        Image(systemName: "sparkles.rectangle.stack")
                            .font(.system(size: 28, weight: .medium))
                            .foregroundStyle(Spread.accent)
                            .frame(width: 54, height: 54)
                            .background(Spread.inset, in: RoundedRectangle(cornerRadius: 16))
                            .accessibilityHidden(true)
                        Text("What's New")
                            .font(.largeTitle.weight(.bold))
                            .foregroundStyle(Spread.ink)
                            .accessibilityAddTraits(.isHeader)
                        Text("A quick look at what has changed in Spread.")
                            .font(.subheadline)
                            .foregroundStyle(Spread.secondary)
                    }
                    .padding(.bottom, 4)

                    if releases.isEmpty {
                        ContentUnavailableView("No release notes yet", systemImage: "doc.text",
                                               description: Text("Future updates will appear here."))
                            .frame(minHeight: 160)
                    } else {
                        ForEach(releases) { release in
                            releaseCard(release)
                        }
                    }
                    if !showHistory && !historyExpanded && SpreadReleaseNotes.entries.count > 1 {
                        Button {
                            historyExpanded = true
                        } label: {
                            Label("See past updates", systemImage: "clock.arrow.circlepath")
                                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                        }
                        .foregroundStyle(Spread.accent)
                        .accessibilityIdentifier("whats-new-history")
                    }
                }
                .frame(maxWidth: 620, alignment: .leading)
                .padding(20)
                .frame(maxWidth: .infinity)
            }
            .background(Spread.canvas)
            .scrollIndicators(.hidden)
            .navigationTitle("What's New")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .accessibilityIdentifier("whats-new-done")
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .accessibilityIdentifier("whats-new-sheet")
    }

    private func releaseCard(_ release: SpreadReleaseNote) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Version " + release.version)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Spread.accent)
                Spacer(minLength: 8)
                Text(formattedDate(release.date))
                    .font(.footnote)
                    .foregroundStyle(Spread.secondary)
            }
            Text(release.title)
                .font(.title3.weight(.semibold))
                .foregroundStyle(Spread.ink)
                .accessibilityAddTraits(.isHeader)
            ForEach(Array(release.changes.enumerated()), id: \.offset) { index, change in
                HStack(alignment: .top, spacing: 12) {
                    Text(String(format: "%02d", index + 1))
                        .font(.caption.monospacedDigit().weight(.semibold))
                        .foregroundStyle(Spread.accent)
                        .frame(width: 28, alignment: .leading)
                        .accessibilityHidden(true)
                    Text(change)
                        .font(.body)
                        .foregroundStyle(Spread.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .accessibilityElement(children: .combine)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Spread.elevated, in: RoundedRectangle(cornerRadius: Spread.radiusCard))
        .overlay(RoundedRectangle(cornerRadius: Spread.radiusCard)
            .strokeBorder(Spread.line, lineWidth: 1))
        .accessibilityIdentifier("whats-new-release-" + release.id)
    }

    private func formattedDate(_ iso: String) -> String {
        let input = DateFormatter()
        input.dateFormat = "yyyy-MM-dd"
        input.locale = Locale(identifier: "en_US_POSIX")
        guard let date = input.date(from: iso) else { return iso }
        return date.formatted(date: .abbreviated, time: .omitted)
    }
}
#endif
