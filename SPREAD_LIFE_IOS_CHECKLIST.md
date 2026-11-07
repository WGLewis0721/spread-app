# Life on iPhone: implementation checklist

> Part of the Spread design brain. Start at [docs/design/README.md](docs/design/README.md). The [Life iOS spec](SPREAD_LIFE_IOS_SPEC.md) owns behavior, copy and acceptance criteria.
>
> Summary: Work through the steps in order. Preserve More and Classic, connect Life to the real planner, prove persistence and accessibility, then build and upload the exact reviewed candidate through Codemagic for internal iPhone 15 testing.

Status: planning handoff. No native implementation, Codemagic run, signed upload or installed-device verification has been performed in this task. Unchecked items remain work to do.

## 1. Record the starting build

Owner: release engineer and product owner.

- [ ] Record the installed app version/build from TestFlight and the iPhone's iOS version from Settings > General > About. Record the date and device model.
- [ ] Confirm current GitHub main and compare it with the inspected baseline `b074b881ff6b1134d745ce1697f841069d92cf4b`. Recheck relevant source if it moved.
- [ ] Export a real planner backup through the current More menu. Keep it outside the app. Use a disposable profile for early gesture/content tests.
- [ ] Capture Classic, the existing preview and every section/action in More. Record the current preview choice and appearance preference.
- [ ] Save the approved browser screenshots and compare them at matching content width and text settings. Keep their sample values out of the actual planner.

Finish when the source commit, phone build, screenshots and protected backup are recorded together.

## 2. Create focused implementation work

Owner: engineering lead.

- [ ] Create a feature branch such as `feature/ios-life-preview` from verified main. Keep main and golden branches untouched.
- [ ] Open traceable implementation issues for presentation, planning/data, task content/files, haptics/accessibility, and Codemagic/device acceptance. Link the spec from each.
- [ ] Use focused draft PRs. Assign the native engineer the screens/gestures, planner engineer the guarded store/content changes, QA the acceptance evidence, and release engineer the signed build.
- [ ] List required data/storage exceptions from spec section 4 in the relevant PR. Do not label capacity, priority, Redo or attachment persistence as cosmetic work.
- [ ] Keep cloud backup/sync disabled and preserve the current no-account/offline behavior.

Finish when every required feature has an owner, acceptance evidence and a rollback path. These are proposed roles; no people or remote issues have been assigned by this document.

## 3. Freeze More and Classic

Owner: native engineer and QA.

- [ ] Reuse `native.weekMonth.previewEnabled`. Keep its default false.
- [ ] Leave `MoreSheet`, the existing Calendar design picker, `Classic (current)` and `Week + Month (preview)` unchanged. Do not add Life-specific settings there.
- [ ] Put the new Life root only behind the existing true branch in `SpreadLiveRoot`. Keep the false branch's layout, controls and routing.
- [ ] Verify both picker choices remain available and switching makes no planner-data edits.
- [ ] Capture More from each mode with the same settings. Compare visible copy, sections, order, fonts, controls and action outcomes against the baseline. Check Share, profiles and backup/restore access, not just the first viewport.

Finish when the owner can choose Life and return to Classic through the existing menu without losing work.

## 4. Build the native Life shell

Owner: native engineer and designer.

- [ ] Add Life, Hours and Week navigation inside the flagged experience. Match the approved compact drawer and bottom control arrangement.
- [ ] Reuse the existing metallic Crown and accepted-week behavior. Add Life-local left/right placement actions and persist that presentation preference.
- [ ] Match approved light/dark Life surfaces with scoped values. Preserve shared theme values that paint Classic and More.
- [ ] Use actual safe areas and available width. Avoid fixed screen-model dimensions, simulated browser status bars and duplicate home indicators.
- [ ] Keep original icons and artwork resources. Keep card faces and separate detail fields distinct.

Finish when all three native screens render real projected data and More still opens the existing sheet. This visual slice is not yet the complete testing build.

## 5. Connect Life cards and editing

Owner: native and planner engineers.

- [ ] Build the overlapping Wallet stack and sole-card focus behavior. Move accessibility focus into the selected card/details, then restore it on return.
- [ ] Connect real tasks below the card. Preserve task completion, eligible-day placement, unscheduled work and task Undo.
- [ ] Only pencil/Edit enables editing. Manage/Delete are invisible at rest, including translucent card backgrounds. Left swipe reveals Manage and right reveals Delete; BOTH must be tappable and execute their action. Preserve rigid card geometry. Life's Edit halo must be perceptibly pulsing at **75% greater stroke width/outer glow radius than the last merged Life version**, with no text motion; capture both phases and the Reduce Motion static state.
- [ ] Keep tap, keyboard and VoiceOver alternatives for edit-only swipe actions. Verify no actions show in normal mode, even after press-and-hold, selection, relaunch or gesture cancellation.
- [ ] Keep production management scope explicit. Use the current global delete only with a confirmation that says it affects all weeks. Create a separate guarded week-only operation if that behavior is later chosen; do not disguise global deletion.
- [ ] Add grouped, guarded edit Undo/Redo to the authoritative store. Preserve tasks, budgets, allocations and relevant metadata together. Refuse stale history after unrelated edits/profile/week changes.

Finish when editing, deletion and history work on real data and their scope matches the confirmation.

## 6. Add planning capacity and weekly priority

Owner: planner engineer.

- [ ] Design optional versioned week metadata for planning capacity and one weekly priority. Keep old profiles loadable without invented values.
- [ ] Ask for an initial weekly capacity when absent. Keep the user's existing hours visible. Handle over-capacity and legacy totals above 168 without truncation.
- [ ] Update normalization, projection, dispatch validation, Swift models, local persistence and full backup round trips together. Preserve new fields in all week-copy/rebuild paths.
- [ ] Add a week-only Life budget operation that preserves reserved hours and does not silently change global default hours. Keep Classic's current operations intact.
- [ ] Add priority goal preview, shortage text and atomic Apply/Undo. Use that area's unused bank before unassigned capacity; never take another area's hours.
- [ ] Test independent weeks/profiles, zero values, half-hour arithmetic, failed writes, stale revisions and mode changes. Confirm Classic changes cannot cause silent data repair when returning to Life.

Finish when the real planner can enforce the Hours and priority rules in spec sections 5 and 9.

## 7. Implement the time orbit

Owner: native engineer.

- [ ] Draw arcs in proportion to acknowledged weekly budgets and capacity. Keep the center, assigned total and unassigned total consistent.
- [ ] Add the slow orbit. Pause at the current angle and separate arcs when the center is tapped. Regroup without jumping.
- [ ] Implement one-hour flicks and the approved accelerated vertical hold/drag. Cancel safely if interrupted or the active week/profile changes.
- [ ] Implement counterclockwise add and clockwise return at half-hour detents. Track correctly across the circle's angle seam and on direction reversal.
- [ ] Update a local draft during the gesture. Commit one guarded final operation on release, with one Undo step. Do not flood the bridge with frame-by-frame writes.
- [ ] Provide an editable capacity field, add/return buttons, keyboard actions and VoiceOver adjustment actions.
- [ ] Test a full circle, reserved-hours floor, zero-capacity circle, maximum capacity and corrective edits after a Classic over-capacity change.

Finish when the circle agrees with the real bank before, during and after a gesture, including failed/canceled commits.

## 8. Adapt Week and Month

Owner: native engineer.

- [ ] Reuse current calendar/date rules and month components where suitable. Morph one selected date surface between seven-day and full-month layouts.
- [ ] Preserve selected date, week, scroll/focus context and actual task placement across the morph.
- [ ] Show each day's Life areas as Wallet cards with daily reserved hours and a separate task field.
- [ ] Retain Today, month/day arrows, Crown week movement, unscheduled tasks and allocation Undo. Avoid conflicting horizontal/vertical gestures.
- [ ] Test leap days, year boundaries, adjacent-month dates, empty weeks and profile switches.

Finish when calendar navigation and the real task/day data stay connected.

## 9. Extend native task notes and local files

Owner: native and planner engineers.

- [ ] Define a compatible content format before implementing formatting controls. Preserve existing notes, outlines, tables, photos and unknown future content.
- [ ] Add optional task estimates using the demo's minute choices. Keep old unestimated tasks unset, default new tasks to 30 minutes, and verify estimates survive every persistence path without reserving time automatically.
- [ ] Connect headings, emphasis, underline, links, lists, checklists, nesting and note Undo/Redo. Recognize conventional outline prefixes without converting ordinary prose unexpectedly.
- [ ] Preserve autocorrection, dictation, selection, copy/paste, hardware keyboard and text-size behavior. Protect drafts during task switching, backgrounding and dismissal.
- [ ] Use native photo/file pickers and native media/document preview. Copy imports to managed local storage and retain stable identifiers and checksums.
- [ ] Enforce file/task limits, validate types safely, report unavailable provider items and low storage, and clean canceled imports. Retain bytes required by Undo/recovery.
- [ ] Keep old inline photos readable. Do not mass-convert them before a compatible migration and recovery path is verified.
- [ ] Extend full local export/import to include new attachment bytes without changing the More interface. Prove the round trip with real files and actual checksums.
- [ ] Route all task entry points in Life, Hours and Week to the same editor. Keep Classic's existing content readable and its current user interface intact.

Finish when formatted notes and real files survive reopen, restart, in-place upgrade and backup/restore. A filename-only attachment or temporary picker URL does not pass.

## 10. Apply direct copy and readable typography

Owner: designer/native engineer.

- [ ] Apply the approved copy table in spec section 6. Keep More's wording untouched.
- [ ] Review new copy with the pinned Humanizer guide. Preserve facts, remove filler, name the action and describe limits directly.
- [ ] Use system semantic type styles, readable instruction sizes, correct singular/plural and localized numbers. Scale the center number with Dynamic Type.
- [ ] Test long Life names, long task titles, dark appearance, Bold Text, large accessibility sizes and VoiceOver readings. Wrap or scroll instead of shrinking essential instructions.
- [ ] Compare standard-size native captures against the approved browser. Record deliberate differences needed for native safe areas and accessibility.

Finish when the owner can explain capacity, assigned hours and reserved hours without reading a separate guide.

## 11. Add and tune teaching haptics

Owner: native engineer and product owner.

- [ ] Implement the event map in spec section 6 with one event owner. Reuse the existing feedback APIs.
- [ ] Distinguish draft detent ticks from successful stored changes. Trigger completion/priority success only after acknowledgement.
- [ ] Limit rapid detent ticks and issue one boundary warning per continuous gesture. Suppress duplicate Crown, system-control and nested-view feedback.
- [ ] Put optional Touch feedback and Show tips again in Life's Gesture help. Leave More unchanged.
- [ ] Stop repeated animation in reduced-motion/background/offscreen states. Keep all information available with haptics off.
- [ ] Tune actual strength, cadence and timing on the iPhone 15. Simulator events alone do not prove the phone's feel.

Finish when a new user can learn each gesture with its visible instruction and recognize success or a limit without repeated buzzing.

## 12. Run automated checks and preserve evidence

Owner: QA and engineers.

- [ ] Register new test files in the repository's explicit test lists and raise minimum counts as required.
- [ ] Run the current checks from a clean candidate on the Codemagic Mac. Preserve complete logs, failing artifacts and screenshots.

```sh
npm ci
npm run typecheck
npm run lint
npm run test:spread
npm run test:scripts
npm run docs:check
swift test --package-path ios/SpreadNativeV2
swift test --package-path ios/App/SpreadCloudCore
python3 scripts/app-store-preflight.py
npm run ios:sync
python3 scripts/app-store-preflight.py --bundle dist-ios
```

- [ ] List installed simulator runtimes/devices. Use the existing selector for available matching widths; do not hard-code an unavailable iPhone 15 simulator.
- [ ] Run `SpreadNativeUITests` on the selected simulator, including new Life cases, existing Classic/More journeys and required persistence/recovery checks. Use the real `NATIVE_UDID` selected by the workflow.

```sh
xcodebuild test -project ios/App/App.xcodeproj -scheme SpreadNativeUITests \
  -destination "platform=iOS Simulator,id=$NATIVE_UDID" \
  -parallel-testing-enabled NO \
  -resultBundlePath artifacts/Life.xcresult CODE_SIGNING_ALLOWED=NO
```

- [ ] Capture light/dark, compact width, 390/820/1024/1366-point regressions, largest accessibility text, reduced motion/transparency and contrast. Keep a separate record for the actual physical iPhone.
- [ ] Mark each spec acceptance criterion with the commit, evidence and outcome. Do not reuse old browser counts as native results.

Finish when the exact candidate passes its checks and unresolved failures are visible. No native check was run while writing these documents.

## 13. Prepare Codemagic without changing current release workflows

Owner: release engineer.

- [ ] Add a manual-only `spread-life-verify` workflow for the new Life branch. Build/test/archive and retain artifacts; omit publishing from this workflow.
- [ ] Add a separate manual-only `spread-life-internal-upload` workflow for the reviewed candidate. Keep existing main and old-branch workflows unchanged.
- [ ] Match the current integration `Spread`, bundle `com.graymatter.spread`, App Store Apple ID `6821191009`, project `ios/App/App.xcodeproj` and scheme `App`.
- [ ] Pin Node 22 and the current verified Xcode 27.1 image. Record `xcodebuild -version` and actual runtime inventory in each run. Keep the deployment minimum at iOS 17.
- [ ] Keep `VITE_SPREAD_CLOUD_BACKUP=0` and `VITE_SPREAD_CLOUD_SYNC=0`. Preserve existing entitlement/signing and preflight steps; change no credentials in source.
- [ ] Guard the intended Life branch, refuse PR/automatic upload runs, and verify `CM_COMMIT` against the checked-out commit and remote branch before building and again before upload.
- [ ] Keep the existing build-number helper. Query Apple's latest number across versions, choose an unused greater build, and recheck immediately before upload. Fail if the query fails.
- [ ] Preserve original release settings and collect the signed IPA, dSYMs, source commit, version/build record, logs and test results.

Finish when the verification workflow produces a reviewable artifact and the upload workflow can only publish the intended reviewed candidate.

## 14. Build and upload the reviewed candidate

Owner: release engineer; release authority remains with the owner.

- [ ] Finish implementation and checks, freeze the candidate commit, and review the artifact/evidence before starting the upload workflow.
- [ ] In Codemagic, select the Life branch and manual verification workflow. Confirm the displayed source commit is the intended one.
- [ ] Inspect all checks and native screenshots. Stop on a failure; do not disable checks to obtain an IPA.
- [ ] Select the separate internal-upload workflow only when the signed candidate is ready for the owner's internal test.
- [ ] Apply distribution profiles with the existing signing integration, build with `xcode-project build-ipa --project "$CM_BUILD_DIR/ios/App/App.xcodeproj" --scheme App`, and run the current signed-IPA/build-number preflights.
- [ ] Upload that exact candidate to App Store Connect. Keep `submit_to_testflight: false` and `submit_to_app_store: false` for the existing manual internal-testing approach.
- [ ] Verify upload, Apple's processing result and the internal group assignment separately. In Codemagic, `submit_to_testflight: false` disables beta-review submission; it does not disable upload when App Store Connect publishing is configured.

Finish when Apple shows the expected version/build and commit record. A green Codemagic run alone does not establish installation or device acceptance. See [Codemagic publishing](https://docs.codemagic.io/yaml-publishing/app-store-connect/).

## 15. Install and test on iPhone 15

Owner: product owner and QA.

- [ ] Wait for Apple to finish processing. Resolve any reported compliance/processing issue. Add the processed build to the existing authorized internal TestFlight group; do not invent a group name or enable external review.
- [ ] Open TestFlight on the iPhone 15, confirm the version/build and update the existing app in place. Keep its data and the protected backup; do not delete the installed app.
- [ ] Open More and confirm it is unchanged. Use the existing Week + Month choice to open Life.
- [ ] Focus/restore every card. Change its weekly area budget by 0.5h from its details or Manage sheet and verify relaunch persistence and full-capacity explanation. Edit name/color, reveal and ACTIVATE both swipe actions, cancel a deletion, and verify Undo/Redo.
- [ ] Flick capacity, hold/drag slowly and quickly, turn an arc both directions and across the angle seam, fill the circle, hit a reservation limit and undo a committed change.
- [ ] Set a priority, review its funded and unfunded cases, reserve time, and verify the week without moving unrelated work.
- [ ] Morph Week/Month, cross month/year boundaries, open day cards and edit tasks from all three destinations.
- [ ] Create formatted notes and a nested outline; import a photo, document, audio and video; cancel an import; verify supported previews and unsupported-format fallback.
- [ ] Test VoiceOver, large text, haptics off, Reduce Motion, Reduce Transparency, Increase Contrast, both Crown sides, keyboard/dictation and portrait/landscape.
- [ ] Enable airplane mode, background/force-quit/relaunch, and confirm edits and file bytes persist. Round-trip a local backup using a disposable profile before trusting new attachment recovery with real data.
- [ ] Return to Classic and inspect the same real plan. Return to Life. Verify More, profiles and all existing core actions remain available.
- [ ] Record any mismatch with build number, OS, exact steps and a screenshot/video. Keep haptic observations separate from visual screenshots.

Finish when the owner can test every acceptance criterion on the installed phone and the evidence identifies the exact build.

## 16. Keep rollback usable

Owner: release and planner engineers.

- [ ] Use the unchanged Classic choice for an immediate presentation fallback.
- [ ] Preserve new content when changing modes. Do not clear Life metadata, task formatting or attachments when Classic opens.
- [ ] Verify binary downgrade compatibility before offering an older build. Classic mode inside a new binary is not the same as installing old code that may discard new fields.
- [ ] Keep a verified previous build and the protected backup available. Restore only through the existing safe recovery flow after checking the candidate's data compatibility.
- [ ] Leave merge, production deployment, external beta review and public App Store submission to a separate explicit release decision.

## Completion record

Fill in this record for each phone-testing candidate:

| Field | Value |
| --- | --- |
| Source branch and commit | To record |
| Codemagic verification and upload run links | To record |
| Xcode/macOS and simulator inventory | To record |
| App version/build and IPA checksum | To record |
| iPhone model and installed iOS version | To record |
| Internal TestFlight processing/group/install result | To record |
| Acceptance criteria passed/failed/owed | To record |
| Classic and More comparison evidence | To record |
| Persistence, upgrade and file recovery evidence | To record |
| Haptic observations and remaining issues | To record |
| Owner's next testing/release decision | To record |
