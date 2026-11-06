import XCTest
@testable import SpreadNativeV2

final class LifeTaskContentTests: XCTestCase {
    private func object(_ content: NativeTaskContent) throws -> [String: Any] {
        try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(content)) as? [String: Any])
    }

    func testRichNotesKeepTextTablesPhotosAndFutureValues() throws {
        let json = #"{"schemaExtra":{"nested":[true,null,"future"]},"blocks":[{"id":"notes","type":"notes","text":"old note","richText":{"version":1,"rtf":"payload","futureFormat":true},"futureField":17},{"id":"table","type":"table","cells":[["a","b"]]},{"id":"photo","type":"photo","src":"data:image/jpeg;base64,AA=="},{"id":"future","type":"future-content","payload":{"x":9}}]}"#
        var content = try JSONDecoder().decode(NativeTaskContent.self, from: Data(json.utf8))
        content.blocks[0].text = "edited note"
        let result = try object(content)
        let original = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])
        XCTAssertEqual(result["schemaExtra"] as? NSDictionary, original["schemaExtra"] as? NSDictionary)
        let blocks = try XCTUnwrap(result["blocks"] as? [[String: Any]])
        XCTAssertEqual(blocks[0]["text"] as? String, "edited note")
        XCTAssertEqual(blocks[0]["futureField"] as? Int, 17)
        XCTAssertEqual((blocks[0]["richText"] as? [String: Any])?["futureFormat"] as? Bool, true)
        let originals = try XCTUnwrap(original["blocks"] as? [[String: Any]])
        for index in 1..<4 { XCTAssertEqual(blocks[index] as NSDictionary, originals[index] as NSDictionary) }
    }

    func testOutlineItemMetadataSurvivesNativeTextEdit() throws {
        let json = #"{"blocks":[{"id":"outline","type":"outline","items":[{"id":"item","text":"before","level":1,"future":{"checked":true}}]}]}"#
        var content = try JSONDecoder().decode(NativeTaskContent.self, from: Data(json.utf8))
        content.blocks[0].items?[0].text = "after"
        let blocks = try XCTUnwrap(try object(content)["blocks"] as? [[String: Any]])
        let items = try XCTUnwrap(blocks[0]["items"] as? [[String: Any]])
        XCTAssertEqual(items[0]["text"] as? String, "after")
        XCTAssertEqual((items[0]["future"] as? [String: Any])?["checked"] as? Bool, true)
    }

    func testManagedReferenceRoundTripContainsNoFileBytes() throws {
        let file = NativeManagedFile(id: UUID().uuidString, name: "recording.m4a", mimeType: "audio/mp4", byteCount: 2048, checksum: String(repeating: "a", count: 64))
        let content = NativeTaskContent(blocks: [NativeContentBlock(type: "file", file: file)])
        let bytes = try JSONEncoder().encode(content)
        let restored = try JSONDecoder().decode(NativeTaskContent.self, from: bytes)
        XCTAssertEqual(restored.blocks.first?.file, file)
        XCTAssertFalse(String(decoding: bytes, as: UTF8.self).contains("base64"))
    }
}
