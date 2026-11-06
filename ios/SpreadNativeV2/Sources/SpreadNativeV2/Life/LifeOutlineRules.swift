import Foundation

/// Pure text-outline arithmetic shared by native keyboard handling and package tests.
enum LifeOutlineRules {
    static func next(_ marker: String) -> String? {
        if let number = Int(marker), number >= 0, number < Int.max { return "\(number + 1)" }
        if let number = romanValue(marker), number < 3999 { return romanMarker(number + 1) }
        if marker == "☑" { return "☐" }
        if marker == "☐" || marker == "•" { return marker }
        guard !marker.isEmpty, marker.count <= 12,
              marker.unicodeScalars.allSatisfy({ $0.value >= 65 && $0.value <= 90 }) else { return nil }
        var value = marker.unicodeScalars.reduce(0) { $0 * 26 + Int($1.value - 64) } + 1
        var label = ""
        while value > 0 {
            value -= 1
            label = String(UnicodeScalar(65 + value % 26)!) + label
            value /= 26
        }
        return label
    }
    private static func romanMarker(_ value: Int) -> String {
        let symbols = [(1000,"M"),(900,"CM"),(500,"D"),(400,"CD"),(100,"C"),(90,"XC"),(50,"L"),(40,"XL"),(10,"X"),(9,"IX"),(5,"V"),(4,"IV"),(1,"I")]
        var remainder = value, result = ""
        for (amount, symbol) in symbols {
            while remainder >= amount { result += symbol; remainder -= amount }
        }
        return result
    }
    private static func romanValue(_ text: String) -> Int? {
        let values: [Character: Int] = ["I":1,"V":5,"X":10,"L":50,"C":100,"D":500,"M":1000]
        var result = 0, previous = 0
        for character in text.reversed() {
            guard let value = values[character] else { return nil }
            result += value < previous ? -value : value
            previous = value
        }
        guard result > 0, result < 4000, romanMarker(result) == text else { return nil }
        return result
    }
}
