# R3F Stage Release Checklist

Use this checklist before proposing a merge, tag, release, or stage acceptance note. Tags, GitHub releases, PR creation, branch protection changes, deployments, and production monitoring changes require explicit user approval at execution time.

## Stage Record

- [ ] Stage name:
- [ ] Commit or PR reference:
- [ ] Approval date:
- [ ] Reviewers or review notes:
- [ ] Known gaps:

## Commands Run

- [ ] `npm run verify:security`
- [ ] `node scripts/verify-r3f-dashboard.mjs`
- [ ] `npm run verify`
- [ ] `git diff --check`

## Browser Proof Artifacts

- [ ] `artifacts/r3f-dashboard-desktop.png`
- [ ] `artifacts/r3f-dashboard-mobile.png`
- [ ] `artifacts/r3f-dashboard-desktop-canvas.png`
- [ ] `artifacts/r3f-dashboard-mobile-canvas.png`
- [ ] `artifacts/r3f-dashboard-mobile-overlays.png`
- [ ] `artifacts/r3f-dashboard-webgl-off.png`
- [ ] `artifacts/r3f-dashboard-details.json`

## Required Boundaries

- [ ] Truth source label is visible and matches the details JSON.
- [ ] The stage does not claim real signal control.
- [ ] Asset license and provenance check passed.
- [ ] Generated-output hygiene was checked and unrelated artifacts were not promoted.
- [ ] Remaining blocked tooling, if any, is named with exact missing commands.
