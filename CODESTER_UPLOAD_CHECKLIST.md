# Codester Upload Checklist — SN Editor

Official guide: https://www.codester.com/info/upload  
Rejection FAQ: https://support.codester.com/hc/en-us/articles/115000017365-My-item-has-been-rejected-what-now

Codester staff make the final decision. This package is structured to match their documented requirements (English docs, working install, demo logins, marketplace images).

## A. Before you zip

- [x] Documentation set: Installation, Usage, Support, Changelog, License, Reviewer notes
- [x] Demo logins in README + Installation + REVIEWER.txt
- [x] UI brand: **SN Editor** (admin can change name + logo at `/admin`)
- [x] Host a **live demo** URL: https://sn-editor.sajeebit.com/
- [x] No private API keys in `.env.example` (do not ship `.env.local`)
- [x] Preview, icon, and screenshots in `codester-assets/`

## B. Main download ZIP (required)

Run from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pack-codester.ps1
```

Output:

- `dist-codester/SN-Editor-v1.0.0-main.zip` — source + Documentation (no node_modules / .next / secrets)
- `dist-codester/SN-Editor-screenshots.zip` — marketplace screenshots

Must be **.zip** (not .rar). Documentation inside the main zip is mandatory.

## C. Marketplace media (upload separately on the form)

| Asset | File |
|-------|------|
| Preview (1600×800 / 16:9) | `codester-assets/preview/sn-editor-preview.png` |
| Icon (400×400) | `codester-assets/icon/sn-editor-icon.png` |
| Screenshots ZIP | `dist-codester/SN-Editor-screenshots.zip` |

## D. Listing fields

- [x] Paste text from `CODESTER_LISTING.txt`
- [x] **Live demo URL:** https://sn-editor.sajeebit.com/
- [ ] Optional YouTube walkthrough
- [ ] Complete Codester **seller profile** (photo + bio)

## E. Reviewer demo

| Email | Password |
|-------|----------|
| user@gmail.com | 12345678 |
| admin@gmail.com | 12345678 |

## F. After submit

- Review usually **1–3 business days**
- If soft-rejected: read the email, fix the exact issue, resubmit
