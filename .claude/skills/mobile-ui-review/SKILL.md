---
name: mobile-ui-review
description: Review and improve the Arabic RTL mobile/PWA interface in HUK; use before and after changes to login, executive home, navigation, forms, or responsive CSS.
---

# Mobile UI review

Work from the actual current UI, not a speculative mockup.

1. Read AGENTS.md and the existing layout, mobile CSS, component and role rules. Keep the current governorate identity, Cairo font, navy/gold palette, RTL and clean backgrounds. Do not introduce duplicate portal selection, decorative images, or new dashboard sections without approval.
2. Capture before screenshots at 320, 390, 430 and 768 CSS pixels with a local seeded database. Review governor and assistant side by side; their home should stay compact, consistent in structure, and respect each role's actual permissions and data. Also verify a director and admin land on their own authorized page. Use dummy accounts only.
3. Run the automated audit: install Playwright for the development session (`npm install --no-save --package-lock=false playwright@1.56.1` and `npx playwright install chromium`), start the local app, then `node scripts/ui-audit.mjs`. Set UI_AUDIT_PASSWORD to the test-only seed password to test authenticated pages, and UI_AUDIT_URL if the local port differs. Never use production credentials or production user screenshots.
4. Inspect screenshots, not just the numeric score. Check horizontal overflow, readable text, tap targets of at least 44 CSS pixels for primary controls, spacing, focus, keyboard, dark mode, no unnecessary duplication, and safe-area padding. Preserve content, data and authorization. Prefer small changes to shared components or CSS, avoid blind automated edits or changing business logic.
5. Rerun the audit, compare scores, review any failures, and report before/after results with unresolved issues. Build before publishing. If tests are unavailable, say so; do not invent scores or publish unreviewed automatic fixes.

The script score is a mechanical layout and navigation check, not a subjective design quality rating. Human/agent visual review remains required. Never automatically deploy changes based solely on a score.
