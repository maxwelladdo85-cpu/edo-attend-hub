# Offline-first attendance (Native app)

Goal: a teacher can open the Android/iOS app, mark attendance for days with no internet, and have everything upload automatically the next time the device is online. Verification status on the server may be overwritten by the teacher's offline edit; sync will then clear `head_verified` so the head teacher re-approves.

## What changes for the user

- First time they open the app **online**, the app downloads their school's students and the current term's attendance into the phone.
- Going forward, every action (mark present/late/absent, sign-in, sign-out) is saved on the phone instantly — no spinner, no network needed.
- A small banner shows connection state and "N changes pending sync".
- When the phone gets internet, pending changes upload in the background. The banner clears when the queue is empty.
- If the teacher edits an attendance row that the head teacher already verified on the server, the teacher's value wins and the row goes back to "unverified" for the head teacher to re-approve.

## Architecture

```text
   UI (React)
      │  reads/writes
      ▼
  localDb (SQLite via @capacitor-community/sqlite)
      │  every write also appends to ▼
      ▼
   outbox table  ──► syncEngine  ──► Supabase
      ▲                  │
      └── server pulls ──┘  (on reconnect + periodic when online)
```

Single source of truth in the UI is **localDb**, never Supabase directly. The sync engine is the only code that talks to Supabase for attendance/student data.

## Work breakdown

### 1. Native storage layer
- Add `@capacitor-community/sqlite` and initialize in `src/lib/native-init.ts`.
- New `src/lib/local-db/` with:
  - `schema.sql` — mirror of `students`, `student_attendance`, `teacher_attendance`, `schools`, plus an `outbox` table (`id`, `op`, `table`, `row_id`, `payload_json`, `created_at`, `attempts`, `last_error`).
  - `localDb.ts` — typed wrappers: `getStudents()`, `upsertStudentAttendance()`, etc. Every mutation runs in a transaction that writes the domain row AND appends an outbox entry.
- Web fallback (for the in-browser preview / non-native builds): same interface backed by `localforage`/IndexedDB so the app still works in the Lovable preview. Web build will not promise multi-day offline.

### 2. Initial cache (online bootstrap)
- New `src/lib/sync/bootstrap.ts`: on login, if local DB is empty, pull:
  - the teacher's school row,
  - all students for that school (paginated 1000 at a time),
  - `student_attendance` and `teacher_attendance` rows for the **current academic period** (looked up from `academic_periods`).
- Store a `last_pulled_at` timestamp per table.

### 3. Refactor write paths to go through localDb
- `StudentAttendancePanel.tsx` and any teacher sign-in/out component currently call Supabase directly — switch them to `localDb.upsertStudentAttendance(...)` etc. UI stays optimistic by default since the local write is synchronous.
- Read paths (`useStudents`, today's attendance) also read from localDb; a thin React-Query layer wraps localDb so existing components don't need big rewrites.

### 4. Sync engine
- New `src/lib/sync/syncEngine.ts`:
  - **Push**: drain `outbox` in FIFO order. For each entry, perform the corresponding Supabase upsert. On success, delete the outbox row. On 4xx (validation), mark `last_error` and skip; on 5xx/network, leave for retry.
  - **Conflict rule (teacher wins, re-verify)**: when pushing a `student_attendance` update, include `head_verified=false, head_verified_by=null, head_verified_at=null, arrival_verified=false, departure_verified=false` so any prior server-side verification is cleared. Head teacher gets the row back in their queue.
  - **Pull**: after push, fetch `student_attendance` and `teacher_attendance` rows with `updated_at > last_pulled_at` for the teacher's school and merge into localDb (server row wins only if no pending outbox entry for the same `row_id`).
- Triggers:
  - `@capacitor/network` listener — when status flips to online, run a sync.
  - App resume (`App.addListener('appStateChange')`) — sync on foreground.
  - Light interval (every 60s) while online and app is foregrounded.

### 5. RLS / server-side
- The current `prevent_teacher_self_verify` trigger already blocks teachers from setting `head_verified=true`. Setting it to `false` is allowed, so the "clear verification" behavior works without schema changes.
- No new tables on the server. All offline state lives on the device.

### 6. UI affordances
- New `src/components/SyncStatusBar.tsx` mounted in `DashboardShell`: shows `Online`, `Offline — N pending`, or `Syncing…`. Tappable to force a sync. Uses `@capacitor/network` + a `useOutboxCount()` hook.
- Login screen: allow login while online only (we need a fresh session). Once logged in, cache the Supabase session in Capacitor Preferences so the app opens offline next time.
- Head teacher dashboard: surface rows whose verification was cleared by a teacher edit (filter `head_verified=false AND updated_at > head_verified_at`).

### 7. Capacitor wiring
- `capacitor.config.ts`: keep current config, remove the `server.url` hot-reload block for production builds (it makes the app require internet on first run). Keep it for dev only.
- Update Android `AndroidManifest.xml` and iOS `Info.plist` for SQLite permissions (mostly default; SQLite plugin docs cover it).
- Document for the user: `npm install`, `npx cap sync`, then `npx cap run android` / `ios`.

## Out of scope (for this pass)
- Offline image/file uploads (none today).
- Multi-device merge for the same teacher (rare; last-write-wins per field is acceptable).
- True background sync while the app is fully closed (would need a native background task plugin; can add later if needed).

## Rollout
1. Land schema + localDb + bootstrap behind a feature flag.
2. Migrate `StudentAttendancePanel` write path; verify online behavior is unchanged.
3. Add sync engine + status bar.
4. Flip flag on for native builds only; PWA stays online-only.
5. Test scenarios: airplane mode for an hour, mark 30 students, re-enable network → all rows appear server-side and verification on previously-verified rows is cleared.

## Estimated size
~12 new files, ~6 edited files, 1 new dependency (`@capacitor-community/sqlite`), 1 optional (`localforage` for web parity). No database migrations required.
