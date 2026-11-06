import Foundation

public struct NativeManagedFile: Codable, Equatable, Identifiable {
    public let id: String
    public let name: String
    public let mimeType: String
    public let byteCount: Int
    public let checksum: String
    public init(id: String, name: String, mimeType: String, byteCount: Int, checksum: String) {
        self.id = id; self.name = name; self.mimeType = mimeType
        self.byteCount = byteCount; self.checksum = checksum
    }
}

struct NativeRichText: Codable, Equatable {
    let version: Int
    let rtf: String
}

struct NativeOutlineItem: Codable, Identifiable, Equatable {
    var id: String
    var text: String
    var level: Double
}

struct NativeContentBlock: Codable, Identifiable, Equatable {
    var id = UUID().uuidString
    var type: String
    var text: String?
    var items: [NativeOutlineItem]?
    var cells: [[String]]?
    var src: String?
    var richText: NativeRichText?
    var file: NativeManagedFile?
    var preserved: [String: NativeJSON] = [:]
}

struct NativeTaskContent: Codable, Equatable {
    var blocks: [NativeContentBlock] = []
    var preserved: [String: NativeJSON] = [:]
}

struct NativeTaskDetail: Decodable {
    let taskId: String
    let content: NativeTaskContent
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
        let raw = try c.decode([String: NativeJSON].self)
        preserved = raw
        func value<T: Decodable>(_ key: String, _ type: T.Type) -> T? {
            guard let value = raw[key], let data = try? JSONEncoder().encode(value) else { return nil }
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
