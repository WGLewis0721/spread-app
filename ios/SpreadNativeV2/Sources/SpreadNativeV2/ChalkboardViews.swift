#if os(iOS)
import SwiftUI
import UIKit
import ImageIO

/// One fixed visual language. No Studio, wallpapers, appearance editor, or theme choices.
enum Chalk {
    static let canvas = Color(cssHex: "#0D1016")
    static let surface = Color(cssHex: "#131B2C")
    static let inset = Color(cssHex: "#161D2E")
    static let ink = Color(cssHex: "#F5F0E5")
    static let secondary = Color(cssHex: "#BDBFCA")
    static let yellow = Color(cssHex: "#F4CD58")
}

extension View {
    /// A Button's hit region is its label. A `.frame(minHeight: 44)` placed *outside* the Button
    /// leaves the real target at the text's own height. Apply this inside the label instead.
    func tapTarget(minWidth: CGFloat = 44, minHeight: CGFloat = 44, alignment: Alignment = .center) -> some View {
        frame(minWidth: minWidth, minHeight: minHeight, alignment: alignment).contentShape(Rectangle())
    }
}

extension Color {
    init(cssHex: String) {
        let cleaned = cssHex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var number: UInt64 = 0
        guard cleaned.count == 6, Scanner(string: cleaned).scanHexInt64(&number) else {
            self = .gray
            return
        }
        self = Color(
            .sRGB,
            red: Double((number >> 16) & 0xff) / 255,
            green: Double((number >> 8) & 0xff) / 255,
            blue: Double(number & 0xff) / 255,
            opacity: 1
        )
    }
}

/// Apple ImageIO decodes the original static WebP files without regenerating their strokes.
/// Exact binary assets were copied from spread-studio; missing assets never hide the text.
private enum ChalkImageLoader {
    static let cache = NSCache<NSString, UIImage>()

    static func image(category: String) -> UIImage? {
        let key = ChalkArtwork.category(for: category) as NSString
        if let loaded = cache.object(forKey: key) { return loaded }
        guard let url = ChalkArtwork.resourceURL(for: category),
              let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
            return nil
        }
        let decoded = UIImage(cgImage: cgImage)
        cache.setObject(decoded, forKey: key)
        return decoded
    }
}

struct ChalkIllustration: View {
    let category: String

    var body: some View {
        Group {
            if let image = ChalkImageLoader.image(category: category) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
            } else {
                // The card's accessible textual content remains visible.
                Color.clear
            }
        }
        .frame(maxWidth: 135, maxHeight: 96)
        .accessibilityHidden(true)
    }
}

struct ChalkRoleCard: View {
    let role: Responsibility
    let remainingHours: Double
    let tasks: [PlannerTask]
    let expanded: Bool
    /// The fan shows a few tasks and links to the rest, so its card never outgrows the stack.
    var taskLimit: Int? = nil
    let onSelect: () -> Void
    var onTask: (PlannerTask) -> Void = { _ in }
    var onToggle: (PlannerTask) -> Void = { _ in }
    var onMore: () -> Void = {}

    var body: some View {
        let tint = Color(cssHex: role.color)
        VStack(alignment: .leading, spacing: 10) {
            // Not a Button: a Button claims the touch and the Stack/Fan swipe on the card never fires.
            // The tap gesture, button trait and action keep the same tap and VoiceOver behavior.
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 10)
                    .fill(tint.gradient)
                    .overlay(Text(String(role.name.prefix(1))).font(.headline).foregroundStyle(.white))
                    .frame(width: 38, height: 38)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 3) {
                    Text(role.name)
                        .font(.headline)
                        .foregroundStyle(Chalk.ink)
                    Text("\(role.hours.formatted())h planned · \(remainingHours.formatted())h left")
                        .font(.caption)
                        .foregroundStyle(Chalk.secondary)
                }
                Spacer(minLength: 4)
                ChalkIllustration(category: role.category)
                    .frame(width: expanded ? 92 : 72, height: 56)
            }
            .contentShape(Rectangle())
            .onTapGesture(perform: onSelect)
            .frame(minHeight: 56)
            .accessibilityElement(children: .ignore)
            .accessibilityAddTraits(.isButton)
            .accessibilityAction(.default, onSelect)
            .accessibilityLabel("\(role.name), \(role.hours.formatted()) hours planned, \(remainingHours.formatted()) hours remaining")
            .accessibilityHint("Shows tasks for this responsibility")
            if expanded {
                Rectangle().fill(Chalk.ink.opacity(0.13)).frame(height: 1)
                if tasks.isEmpty {
                    Text("No tasks in this responsibility")
                        .font(.subheadline).foregroundStyle(Chalk.secondary)
                } else {
                    let shown = taskLimit.map { Array(tasks.prefix($0)) } ?? tasks
                    ForEach(shown) { task in
                        HStack(spacing: 12) {
                            Button { onToggle(task) } label: {
                                Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(task.done ? Chalk.yellow : Chalk.secondary)
                                    .frame(width: 44, height: 44)
                            }.accessibilityLabel(task.done ? "Reopen \(task.text)" : "Complete \(task.text)")
                            Button { onTask(task) } label: {
                                Text(task.text).font(.body).foregroundStyle(Chalk.ink)
                                    .strikethrough(task.done).multilineTextAlignment(.leading)
                                    .lineLimit(taskLimit == nil ? nil : 2)
                                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                                    .contentShape(Rectangle())
                            }
                            .accessibilityIdentifier("card-task-\(task.id)")
                            Spacer()
                        }
                        .frame(minHeight: 44)
                    }
                    if tasks.count > shown.count {
                        Button { onMore() } label: {
                            Text("\(tasks.count - shown.count) more · Manage").font(.subheadline)
                                .foregroundStyle(Chalk.yellow).tapTarget(alignment: .leading).frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .accessibilityIdentifier("card-more-tasks")
                    }
                }
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 22)
                .fill(
                    LinearGradient(
                        colors: [Chalk.surface, tint.opacity(0.17), Chalk.canvas],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        )
        .background(Chalk.surface, in: RoundedRectangle(cornerRadius: 22))
        .overlay(
            RoundedRectangle(cornerRadius: 22).stroke(tint.opacity(0.7), lineWidth: 1.5)
        )
        .shadow(color: tint.opacity(0.13), radius: 8, y: 3)
    }
}

#endif
