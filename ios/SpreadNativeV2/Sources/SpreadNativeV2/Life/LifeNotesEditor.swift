#if os(iOS)
import SwiftUI
import UIKit

/// Versioned native formatting payload. Plain text remains available to older readers.
struct NativeRichText: Codable, Equatable {
    let version: Int
    let rtf: String
}

/// UITextView retains system selection, dictation, paste, autocorrection and text undo.
struct LifeNotesEditor: UIViewRepresentable {
    @Binding var text: String
    @Binding var richText: NativeRichText?

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> UITextView {
        let view = UITextView()
        view.font = .preferredFont(forTextStyle: .body)
        view.adjustsFontForContentSizeCategory = true
        view.backgroundColor = .secondarySystemBackground
        view.accessibilityLabel = "Notes. Start with 1., I., or A. for an outline."
        view.accessibilityIdentifier = "life-rich-notes"
        view.delegate = context.coordinator
        context.coordinator.view = view
        if let payload = richText, payload.version == 1,
           let data = Data(base64Encoded: payload.rtf),
           let attributed = try? NSAttributedString(data: data, options: [.documentType: NSAttributedString.DocumentType.rtf], documentAttributes: nil) {
            view.attributedText = attributed
        } else { view.text = text }
        let toolbar = UIToolbar()
        toolbar.items = [
            context.coordinator.button("Bold", #selector(Coordinator.bold)),
            context.coordinator.button("Italic", #selector(Coordinator.italic)),
            context.coordinator.button("Underline", #selector(Coordinator.underline)),
            context.coordinator.button("Heading", #selector(Coordinator.heading)),
            context.coordinator.button("Body", #selector(Coordinator.body)),
            context.coordinator.button("List", #selector(Coordinator.list)),
            context.coordinator.button("Checklist", #selector(Coordinator.checklist)),
            context.coordinator.button("Indent", #selector(Coordinator.indent)),
            context.coordinator.button("Outdent", #selector(Coordinator.outdent)),
            context.coordinator.button("Undo", #selector(Coordinator.undo)),
            context.coordinator.button("Redo", #selector(Coordinator.redo))
        ]
        toolbar.sizeToFit()
        let scroll = UIScrollView(frame: CGRect(x: 0, y: 0, width: 390, height: 48))
        toolbar.frame = CGRect(x: 0, y: 0, width: 960, height: 48)
        scroll.contentSize = toolbar.bounds.size
        scroll.addSubview(toolbar)
        view.inputAccessoryView = scroll
        return view
    }

    func updateUIView(_ view: UITextView, context: Context) {
        context.coordinator.parent = self
        // Never replace text during marked-text composition or overwrite active native undo state.
        if !view.isFirstResponder, view.text != text {
            view.text = text
        }
    }

    final class Coordinator: NSObject, UITextViewDelegate {
        var parent: LifeNotesEditor
        weak var view: UITextView?
        init(_ parent: LifeNotesEditor) { self.parent = parent }
        func button(_ title: String, _ action: Selector) -> UIBarButtonItem {
            UIBarButtonItem(title: title, style: .plain, target: self, action: action)
        }
        func textViewDidChange(_ textView: UITextView) {
            guard textView.markedTextRange == nil else { return }
            parent.text = textView.text
            let range = NSRange(location: 0, length: textView.attributedText.length)
            if let data = try? textView.attributedText.data(from: range, documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf]) {
                parent.richText = NativeRichText(version: 1, rtf: data.base64EncodedString())
            }
        }
        private func format(_ key: NSAttributedString.Key, _ value: Any) {
            guard let view else { return }
            if view.selectedRange.length == 0 {
                view.typingAttributes[key] = value
            } else {
                view.textStorage.addAttribute(key, value: value, range: view.selectedRange)
                textViewDidChange(view)
            }
        }
        private func trait(_ trait: UIFontDescriptor.SymbolicTraits) {
            guard let view else { return }
            let font = view.typingAttributes[.font] as? UIFont ?? .preferredFont(forTextStyle: .body)
            var traits = font.fontDescriptor.symbolicTraits
            if traits.contains(trait) { traits.remove(trait) } else { traits.insert(trait) }
            if let descriptor = font.fontDescriptor.withSymbolicTraits(traits) {
                format(.font, UIFont(descriptor: descriptor, size: font.pointSize))
            }
        }
        @objc func bold() { trait(.traitBold) }
        @objc func italic() { trait(.traitItalic) }
        @objc func underline() {
            let current = view?.typingAttributes[.underlineStyle] as? Int ?? 0
            format(.underlineStyle, current == 0 ? NSUnderlineStyle.single.rawValue : 0)
        }
        @objc func heading() { format(.font, UIFont.preferredFont(forTextStyle: .title2)) }
        @objc func body() { format(.font, UIFont.preferredFont(forTextStyle: .body)) }
        @objc func list() { view?.insertText("• "); if let view { textViewDidChange(view) } }
        @objc func checklist() { view?.insertText("☐ "); if let view { textViewDidChange(view) } }
        @objc func indent() { changeIndent(24) }
        @objc func outdent() { changeIndent(-24) }
        private func changeIndent(_ delta: CGFloat) {
            let current = view?.typingAttributes[.paragraphStyle] as? NSParagraphStyle ?? .default
            let style = current.mutableCopy() as! NSMutableParagraphStyle
            style.headIndent = max(0, min(120, style.headIndent + delta))
            style.firstLineHeadIndent = style.headIndent
            format(.paragraphStyle, style)
        }
        @objc func undo() { view?.undoManager?.undo() }
        @objc func redo() { view?.undoManager?.redo() }
        func textView(_ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText replacement: String) -> Bool {
            if replacement == "\t" { indent(); return false }
            guard replacement == "\n", range.length == 0 else { return true }
            let text = textView.text as NSString
            let paragraph = text.substring(with: text.paragraphRange(for: NSRange(location: range.location, length: 0)))
            let pattern = #"^(\s*)([0-9]+|[IVXLCDM]+|[A-Z])\. |^(\s*)([•☐☑]) "#
            guard let regex = try? NSRegularExpression(pattern: pattern),
                  let match = regex.firstMatch(in: paragraph, range: NSRange(location: 0, length: (paragraph as NSString).length)) else { return true }
            let prefix = (paragraph as NSString).substring(with: match.range)
            var next = prefix
            let numberPattern = #"^(\s*)([0-9]+)\. "#
            if let numbers = try? NSRegularExpression(pattern: numberPattern),
               let number = numbers.firstMatch(in: prefix, range: NSRange(location: 0, length: (prefix as NSString).length)),
               let value = Int((prefix as NSString).substring(with: number.range(at: 2))) {
                next = (prefix as NSString).substring(with: number.range(at: 1)) + "\(value + 1). "
            } else if prefix.trimmingCharacters(in: .whitespaces).hasPrefix("I.") {
                next = prefix.replacingOccurrences(of: "I.", with: "II.")
            } else if prefix.trimmingCharacters(in: .whitespaces).hasPrefix("A.") {
                next = prefix.replacingOccurrences(of: "A.", with: "B.")
            }
            textView.insertText("\n" + next)
            textViewDidChange(textView)
            return false
        }
    }
}
/// Unknown fields are retained byte-for-value across native edits.
enum NativeJSON: Codable, Equatable {
    case string(String), number(Double), bool(Bool), array([NativeJSON]), object([String: NativeJSON]), null
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let v = try? c.decode(Bool.self) { self = .bool(v) }
        else if let v = try? c.decode(Double.self) { self = .number(v) }
        else if let v = try? c.decode(String.self) { self = .string(v) }
        else if let v = try? c.decode([NativeJSON].self) { self = .array(v) }
        else { self = .object(try c.decode([String: NativeJSON].self)) }
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .null: try c.encodeNil()
        case .string(let v): try c.encode(v)
        case .number(let v): try c.encode(v)
        case .bool(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .object(let v): try c.encode(v)
        }
    }
}
extension NativeContentBlock {
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        preserved = try c.decode([String: NativeJSON].self)
        func value<T: Decodable>(_ key: String, _ type: T.Type) -> T? {
            guard let value = preserved[key], let data = try? JSONEncoder().encode(value) else { return nil }
            return try? JSONDecoder().decode(type, from: data)
        }
        id = value("id", String.self) ?? UUID().uuidString
        type = value("type", String.self) ?? "unknown"
        text = value("text", String.self)
        items = value("items", [NativeOutlineItem].self)
        cells = value("cells", [[String]].self)
        src = value("src", String.self)
        richText = value("richText", NativeRichText.self)
    }
    func encode(to encoder: Encoder) throws {
        var values = preserved
        func set<T: Encodable>(_ key: String, _ value: T?) throws {
            guard let value else { values.removeValue(forKey: key); return }
            values[key] = try JSONDecoder().decode(NativeJSON.self, from: JSONEncoder().encode(value))
        }
        try set("id", id); try set("type", type); try set("text", text)
        try set("items", items); try set("cells", cells); try set("src", src)
        try set("richText", richText)
        var c = encoder.singleValueContainer()
        try c.encode(values)
    }
}

#endif
