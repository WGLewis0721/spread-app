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
        let view = LifeTextView()
        view.font = .preferredFont(forTextStyle: .body)
        view.adjustsFontForContentSizeCategory = true
        view.backgroundColor = .secondarySystemBackground
        view.accessibilityLabel = "Notes. Start with 1., I., or A. for an outline."
        view.accessibilityIdentifier = "life-rich-notes"
        view.delegate = context.coordinator
        context.coordinator.view = view
        view.outdentAction = { context.coordinator.outdent() }
        if let payload = richText, payload.version == 1,
           let data = Data(base64Encoded: payload.rtf),
           let attributed = try? NSAttributedString(data: data, options: [.documentType: NSAttributedString.DocumentType.rtf], documentAttributes: nil), attributed.string == text {
            view.attributedText = attributed
        } else { view.text = text }
        let toolbar = UIToolbar()
        toolbar.items = [
            context.coordinator.button("Bold", #selector(Coordinator.bold)),
            context.coordinator.button("Italic", #selector(Coordinator.italic)),
            context.coordinator.button("Underline", #selector(Coordinator.underline)),
            context.coordinator.button("Heading", #selector(Coordinator.heading)),
            context.coordinator.button("Body", #selector(Coordinator.body)),
            context.coordinator.button("Link", #selector(Coordinator.link)),
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
        private func replaceAttributes(_ value: NSAttributedString, selection: NSRange) {
            guard let view else { return }
            let previous = NSAttributedString(attributedString: view.attributedText)
            let previousSelection = view.selectedRange
            view.undoManager?.registerUndo(withTarget: self) { target in
                target.replaceAttributes(previous, selection: previousSelection)
            }
            view.attributedText = value
            view.selectedRange = selection
            textViewDidChange(view)
        }
        private func format(_ key: NSAttributedString.Key, _ value: Any) {
            guard let view else { return }
            if view.selectedRange.length == 0 {
                view.typingAttributes[key] = value
            } else {
                let copy = NSMutableAttributedString(attributedString: view.attributedText)
                copy.addAttribute(key, value: value, range: view.selectedRange)
                replaceAttributes(copy, selection: view.selectedRange)
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
        @objc func link() {
            guard let view else { return }
            let selection = view.selectedRange
            guard selection.length > 0 else { return }
            let alert = UIAlertController(title: "Add link", message: "Enter a web address for the selected text.", preferredStyle: .alert)
            alert.addTextField { $0.placeholder = "https://"; $0.keyboardType = .URL; $0.autocapitalizationType = .none }
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
            alert.addAction(UIAlertAction(title: "Add", style: .default) { [weak self, weak alert] _ in
                guard let self, let raw = alert?.textFields?.first?.text,
                      let url = URL(string: raw), ["https", "http", "mailto"].contains(url.scheme?.lowercased() ?? "") else { return }
                view.selectedRange = selection
                self.format(.link, url)
            })
            var controller = view.window?.rootViewController
            while let presented = controller?.presentedViewController { controller = presented }
            controller?.present(alert, animated: true)
        }
        @objc func list() { view?.insertText("• "); if let view { textViewDidChange(view) } }
        @objc func checklist() {
            guard let view else { return }
            let text = view.text as NSString
            let paragraph = text.paragraphRange(for: view.selectedRange)
            let prefix = text.substring(with: paragraph)
            if prefix.hasPrefix("☐ ") || prefix.hasPrefix("☑ ") {
                let replacement = prefix.hasPrefix("☐ ") ? "☑" : "☐"
                view.selectedRange = NSRange(location: paragraph.location, length: 1)
                view.insertText(replacement)
            } else { view.insertText("☐ ") }
            textViewDidChange(view)
        }
        @objc func indent() { changeIndent(24) }
        @objc func outdent() { changeIndent(-24) }
        private func changeIndent(_ delta: CGFloat) {
            let current = view?.typingAttributes[.paragraphStyle] as? NSParagraphStyle ?? .default
            let style = current.mutableCopy() as! NSMutableParagraphStyle
            style.headIndent = max(0, min(120, style.headIndent + delta))
            style.firstLineHeadIndent = style.headIndent
            if let view {
                let selection = view.selectedRange
                let copy = NSMutableAttributedString(attributedString: view.attributedText)
                let range = (view.text as NSString).paragraphRange(for: selection)
                if range.length > 0 {
                    copy.addAttribute(.paragraphStyle, value: style, range: range)
                    replaceAttributes(copy, selection: selection)
                }
                view.typingAttributes[.paragraphStyle] = style
            }
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
            if paragraph.trimmingCharacters(in: .whitespacesAndNewlines) == prefix.trimmingCharacters(in: .whitespacesAndNewlines) {
                textView.selectedRange = NSRange(location: range.location - (prefix as NSString).length, length: (prefix as NSString).length)
                textView.insertText("\n")
                textViewDidChange(textView)
                return false
            }
            var next = prefix
            let numberPattern = #"^(\s*)([0-9]+)\. "#
            if let numbers = try? NSRegularExpression(pattern: numberPattern),
               let number = numbers.firstMatch(in: prefix, range: NSRange(location: 0, length: (prefix as NSString).length)),
               let value = Int((prefix as NSString).substring(with: number.range(at: 2))) {
                next = (prefix as NSString).substring(with: number.range(at: 1)) + "\(value + 1). "
            } else {
                let leading = String(prefix.prefix(while: { $0.isWhitespace }))
                let marker = prefix.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ". ", with: "").replacingOccurrences(of: ".", with: "")
                let roman = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX"]
                if let index = roman.firstIndex(of: marker), index + 1 < roman.count {
                    next = leading + roman[index + 1] + ". "
                } else if marker.count == 1, let scalar = marker.unicodeScalars.first, scalar.value >= 65, scalar.value < 90,
                          let following = UnicodeScalar(scalar.value + 1) {
                    next = leading + String(following) + ". "
                } else if marker == "☑" { next = leading + "☐ " }
            }
            textView.insertText("\n" + next)
            textViewDidChange(textView)
            return false
        }
    }
}
final class LifeTextView: UITextView {
    var outdentAction: (() -> Void)?
    override var keyCommands: [UIKeyCommand]? {
        (super.keyCommands ?? []) + [UIKeyCommand(input: "\t", modifierFlags: .shift, action: #selector(outdent))]
    }
    @objc private func outdent() { outdentAction?() }
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
        file = value("file", NativeManagedFile.self)
    }
    func encode(to encoder: Encoder) throws {
        var values = preserved
        func set<T: Encodable>(_ key: String, _ value: T?) throws {
            guard let value else { values.removeValue(forKey: key); return }
            values[key] = try JSONDecoder().decode(NativeJSON.self, from: JSONEncoder().encode(value))
        }
        try set("id", id); try set("type", type); try set("text", text)
        try set("items", items); try set("cells", cells); try set("src", src)
        try set("richText", richText); try set("file", file)
        for key in ["richText", "file"] {
            if case .object(let original)? = preserved[key], case .object(let edited)? = values[key] {
                values[key] = .object(original.merging(edited) { _, new in new })
            }
        }
        if case .array(let original)? = preserved["items"], case .array(let edited)? = values["items"] {
            values["items"] = .array(edited.map { item in
                guard case .object(let current) = item, let id = current["id"],
                      let previous = original.first(where: {
                          if case .object(let value) = $0 { return value["id"] == id }; return false
                      }), case .object(let fields) = previous else { return item }
                return .object(fields.merging(current) { _, new in new })
            })
        }
        var c = encoder.singleValueContainer()
        try c.encode(values)
    }
}

extension NativeTaskContent {
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        preserved = try c.decode([String: NativeJSON].self)
        guard let value = preserved["blocks"] else { blocks = []; return }
        blocks = try JSONDecoder().decode([NativeContentBlock].self, from: JSONEncoder().encode(value))
    }
    func encode(to encoder: Encoder) throws {
        var values = preserved
        values["blocks"] = try JSONDecoder().decode(NativeJSON.self, from: JSONEncoder().encode(blocks))
        var c = encoder.singleValueContainer()
        try c.encode(values)
    }
}
#endif
