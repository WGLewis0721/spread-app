# Original provenance, sanitation and exclusions

## Preserved without alteration

The completed `Astra-Spread-iCloud-Review-PR31-39.md` was located and copied from the original deliverable. Its bytes also match the copy inside the original ZIP. SHA-256:

```text
b8c1bd31ddfeb0dbe8c706058cef8aa96c0d71f8cdbdb4b7078867e62c38df25
```

All three original reproduction/helper scripts, all nine PR diffs and metadata files, and the original archive README are preserved byte-for-byte. Scripts are stored as `.mjs.txt` documentary artifacts so publishing them does not add executable application tests or change application lint discovery. The handoff README explains restoring their exact original filenames in scratch space. The archive's inner `evidence/` prefix is flattened into this directory's `evidence/` folder; every source-to-published mapping is recorded in [EVIDENCE-INVENTORY.json](EVIDENCE-INVENTORY.json).

## Sanitized evidence copies

Only log copies needed sanitation. Original local files and the original ZIP were not changed. The inventory records per-file transformations and both original and published SHA-256 hashes.

- Local Windows account name in absolute filesystem paths replaced with `[REDACTED_USER]`, including escaped paths.
- Email addresses replaced with `[REDACTED_EMAIL]`.
- ANSI terminal styling escape sequences removed from transformed log copies. When transformed, UTF-8 BOM is omitted; log messages, ordering and line boundaries are preserved.
- GitHub Actions already-masked credential placeholders such as `token: ***` and `AUTHORIZATION: basic ***` remain masked. Scanning found no unmasked private keys, common GitHub/API/AWS token patterns, or additional credential values in the inspected credential-bearing lines.

Public repository/PR/Actions identifiers, commit hashes, generic CI runner paths, synthetic test data, test fixture identifiers, and technical error names are retained because they identify the reviewed evidence. This is a targeted sanitation review, not a claim that regex scanning can prove arbitrary data secret-free.

## Exclusions

- **Original ZIP container:** not committed. It redundantly packages the extracted files and contains unsanitized paths/email addresses. Its original SHA-256 is preserved in the inventory; all 39 archive file members are accounted for.
- **Duplicate review within the archive:** consolidated into the byte-identical review one level above `evidence/`; no review content was omitted.
- **Dependencies, build products, scratch checkouts and temporary publishing tools:** not committed. They are not part of the original archive and are unnecessary generated materials.
- **Sensitive substrings and terminal styling:** excluded only through the transformations above; no test failure, diagnostic section, reproduction case or finding ID was dropped.

## Materials that never existed in the original evidence

There were no local native Swift/CloudKit executable reproduction tests for A03, A07 or A12, no physical iPhone/iPad recordings, no signed TestFlight proof, and no completed production schema or rollback evidence. A06 has a TypeScript no-reseed probe but no native account-switch execution. These boundaries are stated in the original review and manifest; source-pinned inspection and reproduction recipes are accessible, but hardware verification remains outstanding. No findings or missing execution results were reconstructed or fabricated for publication.
