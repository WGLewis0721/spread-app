import Foundation
import SwiftData

@Model
final class DeckContact {
    var id: UUID = UUID()
    var sourceIdentifier: String = ""
    var name: String = ""
    var role: String = ""
    var company: String = ""
    var phone: String = ""
    var email: String = ""
    var city: String = ""
    @Attribute(.externalStorage) var portrait: Data?
    var favorite: Bool = false
    var note: String = ""
    var deckIDs: [String] = []
    var createdAt: Date = Date()
    var lastReachedOut: Date?
    var snoozedUntil: Date?
    var removedAt: Date?
    var isSample: Bool = false

    init(name: String, role: String = "", company: String = "", phone: String = "", email: String = "", city: String = "", favorite: Bool = false, isSample: Bool = false) {
        self.name = name; self.role = role; self.company = company
        self.phone = phone; self.email = email; self.city = city
        self.favorite = favorite; self.isSample = isSample
    }
    var initials: String { name.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined() }
    func matches(_ query: String) -> Bool {
        let query = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return query.isEmpty || [name, role, company, phone, email, city].contains { $0.localizedStandardContains(query) }
    }
    func reconnectDue(now: Date) -> Bool {
        guard removedAt == nil, snoozedUntil.map({ $0 <= now }) ?? true else { return false }
        return now.timeIntervalSince(lastReachedOut ?? createdAt) >= (favorite ? 7 : 30) * 86_400
    }
}

@Model
final class ContactDeck {
    var id: String = UUID().uuidString
    var name: String = ""
    init(name: String) { self.name = name }
}

enum BrowseMode: String, CaseIterable, Identifiable {
    case stack, fan, flow
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var symbol: String { switch self { case .stack: "rectangle.stack"; case .fan: "hand.draw"; case .flow: "rectangle.on.rectangle.angled" } }
}

struct DeckPhysics {
    static func stride(for mode: BrowseMode, width: CGFloat) -> CGFloat {
        mode == .stack ? 150 : min(180, width * 0.42)
    }
    static func destination(position: Double, translation: Double, predicted: Double, stride: Double, count: Int) -> Int {
        guard count > 0 else { return 0 }
        let projected = min(3, max(-3, -(translation + (predicted - translation) * 0.3) / stride))
        return min(count - 1, max(0, Int((position + projected).rounded())))
    }
    static func rubberBand(_ value: Double, count: Int) -> Double {
        guard count > 0 else { return 0 }
        let bound = min(Double(count - 1), max(0, value))
        return bound + (value - bound) * 0.18
    }
}

enum SampleContacts {
    static func make() -> [DeckContact] {
        let values = [
            ("Marcus Carter", "Software Engineer", "Apex Solutions", "3345550123", true),
            ("Alyssa Parker", "Brand Strategist", "Studio North", "2055550137", true),
            ("Andre Brooks", "Creative Director", "Brightside", "4045550161", false),
            ("Naomi Ellis", "Architect", "Form & Field", "6155550195", true),
            ("Jordan Rivera", "Product Designer", "Independent", "3125550144", false),
            ("Sophia Bennett", "Photographer", "Maison Studio", "2125550185", false),
            ("Darius Moore", "Founder", "Northstar Labs", "5135550168", false),
            ("Elena Martinez", "Physician", "Mercy Health", "5025550182", true)
        ]
        return values.map { name, role, company, phone, favorite in
            let contact = DeckContact(name: name, role: role, company: company, phone: phone, email: name.lowercased().replacingOccurrences(of: " ", with: ".") + "@example.com", favorite: favorite, isSample: true)
            contact.createdAt = Date().addingTimeInterval(-35 * 86_400)
            return contact
        }
    }
}
