# Full Device Product QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a safe, repeatable Android-device QA environment, audit the complete 0.01 product on a real phone, then turn the evidence into a bounded remediation plan.

**Architecture:** A fresh backend snapshot on port 8011 isolates all writes from production. ADB installs and controls the debug APK, captures screenshots/UI state/logcat/gfxinfo, and records evidence under ignored artifacts. Static and Node tests cover deterministic client behavior; device checks cover WebView, touch, layout, lifecycle, network, and performance.

**Tech Stack:** PowerShell, Python/FastAPI fixture, ADB, Android dumpsys/logcat/uiautomator, JavaScript ES modules, node:test, Capacitor 8.

## Global Constraints

- Test device is vivo V2068A, Android 11, 720×1600, arm64-v8a.
- Destructive CRUD, moderation, upload, and delete checks use only the isolated database on port 8011.
- Production port 8000 receives health and public read-only requests only.
- Do not inspect or operate unrelated phone apps or personal files.
- Every reproducible defect needs evidence and a regression check before its fix.
- No known P0/P1 may remain at handoff; reproducible P2 issues are fixed or explicitly reported with a blocker.

---

### Task 1: Make the isolated backend reachable from the test phone

**Files:**
- Modify: `scripts/test-backend.py`
- Modify: `scripts/start-test-backend.ps1`
- Evidence: `artifacts/device-qa/backend-probe.txt`

**Interfaces:**
- Consumes: `KIRAMEKU_BACKEND_SOURCE`, existing fixture generator, backend `.venv`.
- Produces: loopback contract URL `http://127.0.0.1:8011` and phone URL `http://192.168.10.83:8011`, both backed by the same isolated fixture database.

- [ ] Stop only a verified prior isolated process listening on 8011; never stop port 8000.
- [ ] Start the current fixture and verify that a LAN request to `http://192.168.10.83:8011/api/health` fails while the server is loopback-only.
- [ ] Add `TEST_BACKEND_HOST` with default `127.0.0.1`; have the device launcher set it to `0.0.0.0`.
- [ ] Include `http://localhost` in the isolated CORS origins so the Capacitor WebView can call it.
- [ ] Start a fresh fixture and verify loopback health, LAN health, and an `Origin: http://localhost` preflight all return 200.
- [ ] Run `python tests/backend-contracts.py` and require all 17 checks to pass against the isolated database.

### Task 2: Install and instrument the debug APK

**Files:**
- Create: `scripts/device-qa.ps1`
- Evidence: `artifacts/device-qa/device-info.txt`
- Evidence: `artifacts/device-qa/install.txt`
- Evidence: `artifacts/device-qa/logcat-baseline.txt`

**Interfaces:**
- Consumes: `release/掌上小站-v0.01-debug.apk`, ADB serial `310531544000093`.
- Produces: installed package `cn.kirameku.pocket`, deterministic app reset/launch/capture commands, timestamped evidence directory.

- [ ] Record device model, Android SDK, resolution, density, ABI, battery, and available storage.
- [ ] Write `device-qa.ps1` with explicit actions `install`, `reset`, `launch`, `screenshot`, `ui`, `logs`, and `perf`; reject zero or multiple devices.
- [ ] Run the script installation action and verify `pm path cn.kirameku.pocket` returns the installed APK path.
- [ ] Clear app data for a true first-run baseline, clear logcat, launch the main activity, and capture the first screen.
- [ ] Verify the process is alive and logcat has no fatal exception, ANR, or WebView load failure.

### Task 3: Connect the app to the isolated backend and verify entry flows

**Files:**
- Evidence: `artifacts/device-qa/entry/`
- Report: `artifacts/device-qa/findings.md`

**Interfaces:**
- Consumes: fixture credentials from `artifacts/test-backend/fixture.json` and phone URL `http://192.168.10.83:8011`.
- Produces: verified first-run, connection, guest, login, logout, relaunch, and error-state findings.

- [ ] Capture first launch and verify the login screen fits above the Android navigation bar.
- [ ] Exercise guest mode and verify the login overlay closes without authentication.
- [ ] Navigate to connection settings, enter the isolated phone URL, run connection test, save, and verify the status becomes connected.
- [ ] Log in with fixture credentials, verify the main navigation becomes usable, then log out and verify the login screen returns.
- [ ] Relaunch the app and verify the server address persists and login immediately uses the saved address.
- [ ] Temporarily enter an unreachable address, verify the error identifies connectivity rather than credentials, then restore the isolated URL.

### Task 4: Traverse product functionality and interaction states

**Files:**
- Evidence: `artifacts/device-qa/product/`
- Update: `artifacts/device-qa/findings.md`

**Interfaces:**
- Consumes: authenticated fixture session and isolated data.
- Produces: one finding record per defect with ID, priority, screen, steps, expected, actual, evidence, and suspected owner.

- [ ] Traverse all five bottom tabs and record clipped, overlapped, unreachable, stale, fake, or inconsistent content.
- [ ] Exercise drawer open/close with slow drag, flick, cancellation, first mask tap, and repeated cycles; capture state after each action.
- [ ] Exercise Android back from drawer, modal, subpage, keyboard, and root; record every incorrect exit or trapped state.
- [ ] Verify article create/draft/edit/publish/search/delete against the isolated database.
- [ ] Verify chatter, album/photo, category, tag, project, friend-link, bookmark, visitor, moderation, image, and music flows where the UI exposes them.
- [ ] Verify theme, wallpaper, panel, rename, and custom-module local persistence across process restart.
- [ ] Verify empty, loading, 401, 403, 404, 409, timeout, and offline feedback does not present demo data as live data.

### Task 5: Measure stability and performance

**Files:**
- Evidence: `artifacts/device-qa/performance/`
- Update: `artifacts/device-qa/findings.md`

**Interfaces:**
- Consumes: repeatable ADB actions from `device-qa.ps1`.
- Produces: cold-start timing, frame statistics, memory snapshot, logcat error summary, and reproduction captures for jank.

- [ ] Force-stop and cold-launch the app five times; record launch timing and failures.
- [ ] Reset `dumpsys gfxinfo`, perform drawer and long-list interactions, then record total, slow, frozen, and percentile frame data.
- [ ] Record `dumpsys meminfo` before and after ten navigation cycles and flag unbounded growth.
- [ ] Background/foreground the app, lock/unlock manually-independent via lifecycle commands, rotate if the activity permits, and verify state recovery.
- [ ] Collect filtered logcat for `AndroidRuntime`, `chromium`, `Capacitor`, `WebView`, `StrictMode`, and the package PID.
- [ ] Rank all findings P0–P3 and deduplicate symptoms that share one root cause.

### Task 6: Freeze audit results and create the remediation plan

**Files:**
- Create: `docs/qa/device-audit-2026-09-06.md`
- Create: `docs/superpowers/plans/2026-09-06-device-audit-remediation.md`

**Interfaces:**
- Consumes: all screenshots, UI dumps, logs, metrics, and `findings.md`.
- Produces: evidence-backed product audit plus exact TDD implementation tasks for every accepted P0–P2 issue.

- [ ] Convert each finding into a concise audit row with priority, root cause, affected flow, evidence path, and disposition.
- [ ] Separate product defects from expected debug limitations and environment-only observations.
- [ ] Write a remediation plan naming exact source-of-truth, generated, test, and Android files for each accepted issue.
- [ ] Define one failing test or reproducible device check before each code change, followed by build and device verification.
- [ ] Self-review both documents for missing evidence, duplicate findings, placeholders, unsafe production writes, and untestable completion claims.
- [ ] Commit only the audit, plan, scripts, and relevant source/test files; keep credentials, screenshots, logs, databases, and APKs ignored.
