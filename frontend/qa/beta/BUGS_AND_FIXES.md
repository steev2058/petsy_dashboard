# Bugs and Fixes (Beta)

Date: 2026-02-12

## Fixed

1. **Build/lint blocker: unresolved import in root layout**
   - File: `frontend/app/_layout.tsx`
   - Issue: `expo-updates` imported but not available/used; lint error `import/no-unresolved`.
   - Fix: removed unused `expo-updates` import.
   - Impact: unblocks lint and CI quality gate.

2. **Web/JSX text rendering lint blockers (`react/no-unescaped-entities`)**
   - Files:
     - `app/(auth)/verify.tsx`
     - `app/(tabs)/home.tsx`
     - `app/admin/sponsorships.tsx`
     - `app/cart.tsx`
     - `app/health-records.tsx`
     - `app/sponsor/[petId].tsx`
     - `src/components/LoyaltyPointsCard.tsx`
   - Issue: unescaped apostrophes/quotes caused lint hard-fail.
   - Fix: escaped entities (`&apos;`, `&ldquo;`, `&rdquo;`).
   - Impact: lint pass and safer JSX text rendering.

3. **Telegram/mobile webview safe viewport**
   - File: `app/+html.tsx`
   - Issue: viewport meta lacked `viewport-fit=cover`, risky on notch devices/webviews.
   - Fix: added `viewport-fit=cover`.
   - Impact: better edge inset handling in mobile-web/Telegram webview.

4. **Potential runtime misuse of Reanimated `runOnJS` in splash**
   - File: `app/index.tsx`
   - Issue: `runOnJS` used inside normal JS `setTimeout` path; unnecessary and risk-prone.
   - Fix: replaced with direct callbacks (`setTimeout(navigateToApp, ...)`) and removed unused imports/state.
   - Impact: cleaner startup path and reduced runtime fragility.

## Validation
- `npm run lint` -> **pass** (exit 0)

## Deferred (non-blocking)
- Remaining warning-level lint issues (unused vars, hook deps) can be cleaned in a dedicated hygiene pass.
