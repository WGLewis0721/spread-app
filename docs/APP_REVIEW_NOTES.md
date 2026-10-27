# Spread: App Store Connect review notes template

Copy the text below into **App Review Information → Notes** for the **exact uploaded build**. Verify every claim, replace bracketed text, and remove unsupported features. Do not put reviewer credentials or personal contact details into public GitHub files. Apple limits review notes to 4,000 bytes.

> Spread helps people build realistic weekly plans using Responsibilities → Hours → Week → Tasks. The installed iOS app is local-first and does not require a Spread account, beta approval, login or subscription. The reviewer can open the app directly, including offline. No demo account is required.
>
> To test: (1) Open Spread and use the existing profile or create one. (2) Add a responsibility and allocate hours. (3) View the week and assign that responsibility to a day. (4) Add, edit and complete a task. (5) Close and reopen the app to confirm the plan persists. (6) Under More/Settings, verify local export/backup and Files restore.
>
> The web planner has a **separate private beta allowlist**; that system is not required in the installed iOS app. Core planner data is stored locally. [For flags-off builds only: iCloud backup and iCloud sync are not enabled in this build.]
>
> Verified device models and iOS versions: [from actual physical-device QA]. Key changes in this version: [specific verified changes]. External services/hardware needed for the core workflow: none. Regional differences: [confirm or explain].

## Private submission record — fill in App Store Connect or release ticket

- [ ] Candidate source SHA, IPA/build version and hardware QA results recorded.
- [ ] Screenshot/description/privacy statements reflect the actual IPA; support/privacy URLs open.
- [ ] Review contact details current in App Store Connect.
- [ ] iCloud statement verified against feature flags and installed app.
- [ ] If a later iOS build **actually requires an account**, mark Sign-in required and provide a durable reviewer demo account in **private App Store Connect fields only**; never commit it.

Official sources: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) and [Provide information for a complete review](https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review/).
