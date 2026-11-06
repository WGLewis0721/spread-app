#if os(iOS)
import SwiftUI
import UIKit

/// Versioned native formatting payload. Plain text remains available to older readers.
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
            let pattern = #"^(\s*)([0-9]+|[IVXLCDM]+|[A-Z]+)\. |^(\s*)([•☐☑]) "#
            guard let regex = try? NSRegularExpression(pattern: pattern),
                  let match = regex.firstMatch(in: paragraph, range: NSRange(location: 0, length: (paragraph as NSString).length)) else { return true }
            let prefix = (paragraph as NSString).substring(with: match.range)
            let paragraphStart = text.paragraphRange(for: NSRange(location: range.location, length: 0)).location
            guard range.location >= paragraphStart + (prefix as NSString).length else { return true }
            if paragraph.trimmingCharacters(in: .whitespacesAndNewlines) == prefix.trimmingCharacters(in: .whitespacesAndNewlines) {
                textView.selectedRange = NSRange(location: range.location - (prefix as NSString).length, length: (prefix as NSString).length)
                textView.insertText("\n")
                textViewDidChange(textView)
                return false
            }
            let leading = String(prefix.prefix(while: { $0.isWhitespace }))
            let marker = prefix.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ". ", with: "").replacingOccurrences(of: ".", with: "")
            guard let following = LifeOutlineRules.next(marker) else { return true }
            let suffix = ["•", "☐", "☑"].contains(marker) ? " " : ". "
            let next = leading + following + suffix
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

#endif
