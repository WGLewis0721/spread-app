"""Summarize an extracted .xcresult (read-only): tests, outcomes, issues, activities near failures, attachments.
Usage: python3 -I xcresult-summary.py <path to X.xcresult> [--activities]"""
import sqlite3, sys, os
path = sys.argv[1]
db = sqlite3.connect("file:" + os.path.join(path, "database.sqlite3") + "?mode=ro", uri=True)
print("== tests")
for name, result, dur in db.execute("""select tc.name, r.result, r.duration from TestCaseRuns r join TestCases tc on tc.rowid = r.testCase_fk order by r.orderInTestSuiteRun"""):
    print(f"{result:10} {dur or 0:8.1f}s  {name}")
print("== issues")
rows = db.execute("""select tc.name, i.compactDescription, i.detailedDescription, i.issueType from TestIssues i left join TestCaseRuns r on r.rowid = i.testCaseRun_fk left join TestCases tc on tc.rowid = r.testCase_fk order by i.timestamp""").fetchall()
for name, compact, detail, kind in rows:
    print(f"[{name}] {kind}: {compact}\n    {detail}")
if not rows: print("(none)")
print("== attachments")
for name, kind in db.execute("select name, uniformTypeIdentifier from Attachments where name not like 'Debug description%' and name != 'kXCTAttachmentScreenRecording' order by timestamp"):
    print(f"{kind:18} {name}")
if "--activities" in sys.argv:
    print("== failing-test activities (last 40)")
    for title, in db.execute("select title from Activities order by startTime desc limit 40"): print(" ", title[:200])
