# Patrols: the clock, the points, and the flush

How a patrol is timed, how its GPS trace is captured, buffered and delivered, and
what happens when the network, the GPS or the app itself goes away.

Every claim below is anchored to `file:line` as of `develop`. Line numbers drift;
the function names next to them are the durable part.

---

## 1. The short version

Everything below this section is the same story with the receipts attached. This
one is meant to stand on its own.

### The clock

- **The app never asks the server for the current time.** There is no time-sync endpoint in the codebase.

- **Postgres sets `patrols.started_at`, not the phone.** The database uses `defaultNow()` in `src/db/schema.ts:116`. The `startPatrol` function inserts the patrol without a timestamp on purpose (`src/app/patrouilles/actions.ts:41`): “Timestamps are left to the database, not the phone’s clock.”

- **The browser receives this value in two ways.** It is included in the root layout when the page first loads (`src/app/layout.tsx:67`). It is also fetched again from `GET /api/patrols/active` after every navigation, when the page regains focus, during `pageshow`, and every two seconds when the app is unavailable (`src/components/patrol-provider.tsx:92`, `:110`, `:98`).

- **The timer is calculated in the browser.** It uses `Date.now() - startedAt` and updates every second (`src/components/patrol-controls.tsx:505`). A single `setInterval(1000)` is shared by all components through `useSyncExternalStore` (`:51-81`). On the server, the timer first displays `--:--:--`, which prevents a hydration mismatch.

- **The timer does not build up drift.** Each update calculates the full difference between the current time and the start time. If a background tab updates less often, the timer will still show the correct value as soon as the user returns. The interval only refreshes the display. It does not add one second to a counter.

- **The timer uses two different clocks.** The start time comes from the server, while the current time comes from the device. Because of this, `formatElapsed` uses `Math.max(0, milliseconds)` (`src/lib/patrols/elapsed.ts:13`). If the phone’s clock is behind the server’s clock, the timer shows `00:00:00` until the phone catches up instead of showing a negative value.

- **Pausing only freezes the displayed timer.** The pause time, `pausedAtMs`, is stored in `sessionStorage` using the patrol’s start time as the key (`patrol-controls.tsx:87`). This means the pause survives navigation and page reloads, but only in the same tab. Pausing also stops GPS recording because `paused` is included in the recorder effect’s dependencies (`use-patrol-recorder.ts:534`).

- **The saved duration is always calculated as `ended_at - started_at`.** Both timestamps come from the server (`actions.ts:64`, `:96`). SQL calculates the duration again for patrol lists and totals using `extract(epoch from (ended_at - started_at))` (`queries.ts:183`). Pausing does not reduce the saved duration.

### The patrol

- **A patrol is a row in the database, not a session on the device.** A patrol is considered active when `ended_at` is `null` (`getActivePatrol`, `src/lib/patrols/queries.ts:37`). There is no status column or client-side recording flag that needs to stay synchronized.

- **Nothing on the device can end the patrol.** If the user closes the app, loses connection, closes the browser, or runs out of battery, the database row remains active. When the user returns, the timer shows the correct time because it is calculated from `started_at`, not from data saved by the device.

- **Only `endPatrol` can close a patrol.** There is no automatic system that closes a forgotten patrol. The timer has no limit, so it can display values such as `26:14:03` (`elapsed.ts:9`).

- **The patrol ID always comes from the user’s session.** It is never taken from the request body (`src/app/api/patrol-points/route.ts:14`).

### The points

- **Points are recorded using `watchPosition` on the web and the background geolocation plugin on native devices** (`use-patrol-recorder.ts:473`). In both cases, `recorded_at` uses the location fix’s timestamp, not `Date.now()` (`points.ts:52`). This means that even if a point waits one minute before being uploaded, it is still saved with the time it was actually recorded.

- **A point must pass four checks before it is saved** (`use-patrol-recorder.ts:312-351`):

  - At least 12 seconds have passed since the last point.
  - Its accuracy is 50 metres or better.
  - The movement is realistic, based on `25 m + 8 m/s × elapsed time`.
  - The point is successfully stored.

  Android adds another check on the native side. It uses the step counter to reject movements under 50 metres when no steps were detected. This prevents GPS drift from adding distance while the user is standing still (`PatrolStepFilter.java:109`).

- **Accepted points are first saved in IndexedDB** (`point-queue.ts:120`). The queue can hold up to 1,000 points. Once it is full, the oldest points are removed. This allows about 3 hours and 20 minutes of fully offline walking before the beginning of the route starts being lost.

- **The app sends points in batches of 200 every 60 seconds** (`use-patrol-recorder.ts:206`). The server response determines what happens to the queue (`classifySyncResponse`, `points.ts:94`):

  - **2xx:** Delete the uploaded points and continue with the next batch.
  - **5xx:** Treat the error as temporary, keep the points, and try again in 60 seconds. The route allows a failed insert to throw an error so the client receives a 500 response (`api/patrol-points/route.ts:44`).
  - **Any other response:** A 400, 409, 401, 403, or `status === 0` is treated as a permanent error. The queue is cleared, recording stops, and the user sees “Rechargez la page.”

- **Duplicate points are ignored.** The combination of `unique (patrol_id, recorded_at)` and `onConflictDoNothing` (`schema.ts:147`) makes it safe to send the same point more than once. This allows failed batches to be retried without checking each point first.

- **The native app can also upload the same location fix through a second path.** It uses a signed HMAC token, and the server matches the point to a patrol using its timestamp instead of a patrol ID (`api/patrol-points/native/route.ts:42`). This is the only upload path that continues working after the WebView closes.

### The flush

- **A flush sends every point in the local queue to the server before an action that cannot be undone.** The important function is `flushAndStop` (`use-patrol-recorder.ts:433`). It stops recording first, then sends batches until the queue is empty. If an upload fails, it keeps the remaining points.

- **The flush finishes before the patrol is closed.** The code runs `await flushAndStop(); return endPatrol()` (`patrol-controls.tsx:201`). This ensures that the server includes the entire route when calculating the patrol’s distance (`actions.ts:68`).

- **The server does not trust the distance shown by the client.** When `endPatrol` runs, it loads all saved points in `recorded_at` order and calculates the distance again on the server (`actions.ts:69-89`). The distance shown on the screen is only for display.

- **`flushNativeQueue` runs whenever a page loads** (`patrol-sync.tsx:6`). On iOS, it sends any points that the background upload session could not deliver.

### The numbers

| Value | Meaning                   | Value        | Meaning                     |
| ----- | ------------------------- | ------------ | --------------------------- |
| 12 s  | between recorded points   | 60 s         | drain cadence               |
| 200   | points per POST           | 1 000        | local queue cap (~3 h 20)   |
| 50 m  | accuracy ceiling          | 25 m + 8 m/s | plausible step              |
| 60 s  | grace before `started_at` | 5 min        | tolerated clock skew ahead  |
| 30 s  | debug heartbeat           | 15 min       | native upload token refresh |

### What survives what

| Event                      | Patrol | Clock             | Trace                                       |
| -------------------------- | ------ | ----------------- | ------------------------------------------- |
| Network drops              | ✓      | ✓                 | ✓ buffered ~3 h 20                          |
| GPS signal lost            | ✓      | ✓                 | ✓ resumes by itself, gap in the line        |
| Page reload / app reopen   | ✓      | ✓ re-derived      | ✓ queue + server                            |
| App closed (native)        | ✓      | ✓                 | ✓ via the native path                       |
| Location permission denied | ✓      | ✓                 | ✗ nothing recorded                          |
| Session expired            | ✓      | — controls hidden | ✗ queue cleared, recorder stopped           |
| Ending a patrol offline    | ✓      | ✓                 | ✗ tail lost, stored distance short (see §9) |

---

## 2. The data model

`src/db/schema.ts:109` (patrols) and `src/db/schema.ts:135` (points):

```ts
export const patrols = pgTable(
  'patrols',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),                                  // schema.ts:116  <- the DB clock
    endedAt: timestamp('ended_at', { withTimezone: true }),  // :119  null == running
    distanceMeters: integer('distance_meters'),             // :120  written once, at endPatrol
    ...
```

```ts
export const patrolPoints = pgTable(
  'patrol_points',
  {
    patrolId: uuid('patrol_id')
      .notNull()
      .references(() => patrols.id, { onDelete: 'cascade' }),
    latitude: decimal('latitude', { precision: 9, scale: 6 }).notNull(),
    longitude: decimal('longitude', { precision: 9, scale: 6 }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('patrol_points_patrol_id_recorded_at_idx').on(
      // schema.ts:147
      table.patrolId,
      table.recordedAt,
    ),
  ],
).enableRLS()
```

Two invariants do a lot of work:

1. **`ended_at is null` is the definition of active** — `getActivePatrol`,
   `src/lib/patrols/queries.ts:37`:

   ```ts
   .where(and(eq(patrols.userId, userId), isNull(patrols.endedAt)))
   .orderBy(desc(patrols.startedAt))
   .limit(1)
   ```

   There is no status column and no client-side "am I recording" flag to keep in
   sync.

2. **`unique (patrol_id, recorded_at)`** plus `onConflictDoNothing` on every
   insert (`src/app/api/patrol-points/route.ts:49`,
   `src/app/api/patrol-points/native/route.ts:79`) means the same point can be
   delivered any number of times by any number of paths. That is not just
   defensive — on native the same fix is genuinely uploaded twice (§6).

Both tables have RLS enabled; all access goes through the server after an
explicit auth check.

---

## 3. The clock

### 3.1 Where the time comes from

**No time-sync endpoint exists** anywhere in the codebase.

| Value                       | Whose clock                  | Where                                                                                     |
| --------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| `patrols.started_at`        | **Postgres** `defaultNow()`  | `src/db/schema.ts:116`, inserted with no timestamp at `src/app/patrouilles/actions.ts:41` |
| `patrols.ended_at`          | **Node server** `new Date()` | `src/app/patrouilles/actions.ts:64`                                                       |
| The ticking `HH:MM:SS`      | **The device** `Date.now()`  | `src/components/patrol-controls.tsx:51`                                                   |
| `patrol_points.recorded_at` | **The GPS fix itself**       | `toRecordedPoint`, `src/lib/patrols/points.ts:52`                                         |

`startPatrol` inserts a row with no timestamp on purpose —
`src/app/patrouilles/actions.ts:27`:

```ts
/** Opens a patrol. Timestamps are left to the database, not the phone's clock. */
export async function startPatrol(): Promise<StartPatrolState> {
  // A Server Action is a POST endpoint, so hiding the button is not the gate.
  const profile = await requireApprovedAccess('volunteer')

  // At most one active patrol per user.
  const active = await getActivePatrol(profile.id)
  if (active) { revalidatePath('/carte'); return {} }

  await db.insert(patrols).values({ userId: profile.id })   // actions.ts:41
```

And a point's timestamp is the fix's own, never `Date.now()` —
`src/lib/patrols/points.ts:52`:

```ts
export function toRecordedPoint(position: GeolocationPosition): RecordedPoint {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    recordedAt: new Date(position.timestamp).toISOString(),
  }
}
```

So a point that sat in a native buffer for a minute still lands at the moment it
was actually taken.

### 3.2 How `startedAt` reaches the browser

Two paths, same ISO string.

**Server-rendered, first paint** — `src/app/layout.tsx:67`:

```ts
async function resolveInitialPatrolStartedAt(): Promise<string | null> {
  try {
    const profile = await getCurrentUserProfile()
    if (!profile) return null

    const activePatrol = await getActivePatrol(profile.id)
    return activePatrol?.startedAt.toISOString() ?? null
  } catch (error) {
    console.warn(
      'Unable to resolve the active patrol in the root layout',
      error,
    )
    return null // a DB problem degrades to "no patrol", not a dead page
  }
}
```

Passed into the provider at `src/app/layout.tsx:100`.

**`GET /api/patrols/active`** — `src/app/api/patrols/active/route.ts:16`:

```ts
const activePatrol = await getActivePatrol(profile.id)

return Response.json({
  id: activePatrol?.id ?? null,
  startedAt: activePatrol?.startedAt.toISOString() ?? null,
})
```

`PatrolProvider` re-anchors to that value on every pathname change
(`src/components/patrol-provider.tsx:92`), on `focus` / `pageshow`
(`:110-122`, covering bfcache restore and auth changing in another tab), and
every 2 s while the state is `unavailable` (`:98`, delay at `:16`).

### 3.3 How it ticks

`src/components/patrol-controls.tsx:51-81` — one module-level interval for the
whole app, exposed as an external store:

```ts
let clockNow = Date.now()
let clockTimer: ReturnType<typeof setInterval> | null = null
const clockSubscribers = new Set<() => void>()

function subscribeToClock(onChange: () => void): () => void {
  clockSubscribers.add(onChange)
  clockNow = Date.now()

  clockTimer ??= setInterval(() => {
    clockNow = Date.now()
    clockSubscribers.forEach((notify) => notify())
  }, TICK_MS) // TICK_MS = 1000, controls.tsx:36

  return () => {
    clockSubscribers.delete(onChange)

    if (clockSubscribers.size === 0 && clockTimer) {
      clearInterval(clockTimer)
      clockTimer = null
    }
  }
}

function getClock(): number {
  return clockNow
}
function getServerClock(): null {
  return null
} // controls.tsx:79
```

Consumed at `src/components/patrol-controls.tsx:501`:

```ts
// Null on the server, a live timestamp in the browser.
const now = useSyncExternalStore(subscribeToClock, getClock, getServerClock)

// While paused the display freezes at the moment the pause began. The pause
// itself still counts toward the patrol
const elapsedMs =
  now === null
    ? null
    : Math.max(
        0,
        (paused && pausedAtMs !== null ? pausedAtMs : now) - startedAtMs,
      )
```

Three things follow:

- **One interval, not one per component** — created on first subscribe, cleared
  when the last subscriber leaves (`:68`).
- **The server snapshot is `null`**, rendered as `NO_READING = '--:--:--'`
  (`:37`, used at `:528`). No hydration mismatch, since the server cannot know
  the client's `Date.now()`.
- **Interval drift is irrelevant.** `elapsedMs` is recomputed from absolute
  timestamps every tick, so a throttled background tab simply repaints less often
  and is instantly correct on return. The interval drives repaints, not the
  count.

Formatting — `src/lib/patrols/elapsed.ts:9`:

```ts
/** A duration as `HH:MM:SS`. Hours are uncapped: a forgotten patrol reads `26:14:03`. */
export function formatElapsed(milliseconds: number): string {
  // Phone and server clocks disagree, so a patrol can look like it starts in
  // the future.
  const total = Math.max(0, milliseconds)      // elapsed.ts:13
```

That clamp is the whole story about skew: the subtraction mixes a **server**
`started_at` with a **device** `Date.now()`, so a phone whose clock is behind
would otherwise render a negative duration. It shows `00:00:00` until the device
catches up. Skew the other way inflates the displayed number only — the stored
duration is unaffected. Covered by `tests/lib/patrols/elapsed.test.ts:36`.

### 3.4 Pause is cosmetic (mostly)

`src/components/patrol-controls.tsx:281`:

```ts
function handleTogglePause() {
  const next = pause.paused
    ? { paused: false, pausedAtMs: null }
    : { paused: true, pausedAtMs: Date.now() } // device clock

  setPause(next)

  if (next.paused || next.pausedAtMs !== null) {
    writeStoredPause(startedAt, next)
  } else {
    clearStoredPause(startedAt)
  }
}
```

Stored in **`sessionStorage`**, keyed by the patrol's own start —
`src/components/patrol-controls.tsx:86`:

```ts
/**
 * The pause survives client-side navigation: a paused patrol must stay paused
 * when the user visits another page and comes back.
 */
const PAUSE_STORAGE_PREFIX = 'canopee-patrol-pause:'
```

Keying by `startedAt` means a stale pause can never leak onto a _different_
patrol; `sessionStorage` means it survives navigation and reload in the tab and
dies with the tab. It is cleared when the patrol ends (`:474`).

Pause also **stops GPS recording**, because `paused` is in the recorder effect's
dependency array (`src/lib/patrols/use-patrol-recorder.ts:534`) and the watch is
only started under `if (!paused)` (`:473`).

Pause does **not** stop the patrol's duration — that is always
`ended_at - started_at`, both server timestamps.

One quiet side effect of that teardown —
`src/lib/patrols/use-patrol-recorder.ts:520`:

```ts
return () => {
  ...
  stopped = true
  releaseWatch()

  lastRecordedAtRef.current = null
  lastAcceptedRef.current = null     // distanceMetresRef and routeRef survive
}
```

Distance accumulated so far is kept, while the plausibility baseline resets — so
the first fix after resuming is accepted unconditionally and the straight-line
jump across the pause is **not** added to the distance (`:357`, the
`previous !== null` guard). Walking away while paused doesn't inflate the total.

### 3.5 The final duration

`src/app/patrouilles/actions.ts:53`:

```ts
/** Closes the patrol and records the distance walked over its stored route. */
export async function endPatrol(): Promise<EndPatrolState> {
  ...
  const endedAt = new Date()                      // actions.ts:64, server clock
  ...
    // Read after the client has flushed, so the distance covers the whole route.
    const points = await db
      .select({ latitude: patrolPoints.latitude, longitude: patrolPoints.longitude })
      .from(patrolPoints)
      .where(eq(patrolPoints.patrolId, active.id))
      .orderBy(asc(patrolPoints.recordedAt))      // actions.ts:69-76

    const distanceMeters = Math.round(totalDistanceMetres(...))    // :78

    await db.update(patrols)
      .set({ endedAt, distanceMeters })           // :89
      .where(eq(patrols.id, active.id))

    summary = {
      durationSeconds: Math.round(
        (endedAt.getTime() - active.startedAt.getTime()) / 1000,   // :96
      ),
      ...
```

For lists and totals it is recomputed in SQL, never trusted from the client —
`src/lib/patrols/queries.ts:183` and `:206`:

```ts
durationSeconds: sql`coalesce(sum(extract(epoch from (${patrols.endedAt} - ${patrols.startedAt}))), 0)::int`
```

Display: `formatDuration` at `src/lib/patrols/format.ts:28` (`45 min`,
`2 h 13 min`, and `En cours` when `ended_at` is null). Dates render in
`America/Toronto` (`format.ts:2`) — Laval is Eastern Time, so UTC storage plus an
explicit zone.

### 3.6 The iOS Live Activity clock

`src/lib/patrols/live-activity.ts:33` takes `startedAt` as an **epoch in
milliseconds**, so the lock-screen widget runs its own timer from that anchor and
does not need the web view alive. Started at
`src/components/patrol-controls.tsx:347`:

```ts
void startLiveActivity({
  startedAt: startedAtMs,
  distanceMetres: getDistanceMetres(),
  paused: false,
  elapsedSeconds: 0,
  route: getRoute(),
})
```

`elapsedSeconds` is only non-zero when paused, to tell the widget where to freeze
(`patrol-controls.tsx:376`). The widget can talk back through
`listenForActivityCommands` (`live-activity.ts:82`) with `'toggle'` / `'stop'`,
routed via a ref (`patrol-controls.tsx:295`) so the handler always sees current
state.

### 3.7 Every clock tolerance in one place

| Constant                | Value       | Purpose                                            | Location                                        |
| ----------------------- | ----------- | -------------------------------------------------- | ----------------------------------------------- |
| `TICK_MS`               | 1 s         | Display repaint rate                               | `patrol-controls.tsx:36`                        |
| `CLOCK_SKEW_MS`         | 5 min       | How far in the _future_ a point may be timestamped | `points.ts:13`                                  |
| `PATROL_START_GRACE_MS` | 60 s        | How far _before_ `started_at` a point may be       | `points.ts:15`                                  |
| `POINT_INTERVAL_MS`     | 12 s        | Minimum spacing between recorded points            | `points.ts:3`                                   |
| `SYNC_INTERVAL_MS`      | 60 s        | Drain cadence                                      | `points.ts:5`                                   |
| `MAX_BATCH_POINTS`      | 200         | Points per POST                                    | `points.ts:7`                                   |
| `MAX_BUFFERED_POINTS`   | 1 000       | Local queue cap                                    | `points.ts:9`                                   |
| `HEARTBEAT_MS`          | 30 s        | Debug heartbeat, also measures timer drift         | `use-patrol-recorder.ts:50`                     |
| `TOKEN_TTL_MS`          | 60 min      | Native upload token lifetime                       | `upload-token.ts:3`                             |
| `TOKEN_REFRESH_MS`      | 15 min      | Native token refresh cadence                       | `native.ts:22`                                  |
| watchdog                | 60 s / 10 s | Android: restart updates after 60 s of silence     | `BackgroundGeolocationService.java:219`, `:211` |

`shouldRecordPoint` handles a **backwards** clock jump explicitly —
`src/lib/patrols/points.ts:37`:

```ts
/** `watchPosition` fires as fast as the device produces fixes. */
export function shouldRecordPoint(
  lastRecordedAtMs: number | null,
  nowMs: number,
): boolean {
  if (lastRecordedAtMs === null) return true

  const sinceLast = nowMs - lastRecordedAtMs

  // A backwards clock jump would otherwise stall recording until time caught up.
  return sinceLast < 0 || sinceLast >= POINT_INTERVAL_MS
}
```

---

## 4. Patrol points: capture

The recorder is `usePatrolRecorder`, `src/lib/patrols/use-patrol-recorder.ts:88`:

```ts
/**
 * Records the patroller's position and syncs it in batches, for as long as it is
 * mounted. Mounting is the on/off switch, so there is no flag to keep in step
 * with the server's view of the patrol.
 */
```

It is mounted by `ActivePatrol` (`patrol-controls.tsx:264`), which
`PatrolControls` renders from the root layout (`layout.tsx:102`). Consequences:

- The controls can be **visually hidden** on the report route
  (`patrol-controls.tsx:396`, `if (hidden) return null`) and the recorder keeps
  running — `hidden` only affects returned JSX, not hooks.
- On a **public/auth route** `PatrolControls` returns `null` before rendering
  `ActivePatrol` (`patrol-controls.tsx:140`), so the recorder unmounts and
  recording stops. The IndexedDB queue survives and the next mount drains it.

### 4.1 Two capture backends

`src/lib/patrols/use-patrol-recorder.ts:473`:

```ts
if (!paused) {
  if (isNativeApp()) {
    native = true

    startNativeWatch(submit, (error) =>
      handleSignalLoss(`GPS signal lost (${error.message})`),
    ).catch((cause) => {
      debugLog('native.start.failed', describeError(cause))
      stop('denied')
    })
  } else {
    watchId = navigator.geolocation.watchPosition(handleFix, handleError, WATCH_OPTIONS)
  }

  syncTimer = setInterval(() => void drain(), SYNC_INTERVAL_MS)      // :493
```

Web options, `use-patrol-recorder.ts:52`:

```ts
const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  // Generous, because walking under tree cover is normal here, not a failure.
  timeout: 30_000,
}
```

Native options, `src/lib/patrols/native.ts:9`:

```ts
const START_OPTIONS = {
  backgroundTitle: 'Patrouille en cours',
  backgroundMessage: 'Enregistrement de votre trajet.',
  requestPermissions: true,
  distanceFilter: 0,
  minIntervalMs: POINT_INTERVAL_MS, // 12 s, enforced natively too
  stale: false,
}
```

### 4.2 The acceptance filters

`record()` applies four gates in order —
`src/lib/patrols/use-patrol-recorder.ts:312-390`:

```ts
if (!shouldRecordPoint(lastRecordedAtRef.current, recordedAtMs)) {
  debugLog('record.throttled', ...); return                    // :322
}

if (!isAccurateEnough(accuracy)) {
  debugLog('record.inaccurate', { accuracy }); return           // :333
}

const previous = lastAcceptedRef.current

if (!isPlausibleStep(previous, point)) {
  debugLog('record.implausible', ...); return                   // :340
}

const depth = await storePoint(point)
if (depth === null) return                                      // :351, store failed twice
```

| Gate                | Rule                                                         | Source                       |
| ------------------- | ------------------------------------------------------------ | ---------------------------- |
| `shouldRecordPoint` | ≥ 12 s since the last point, or a backwards clock jump       | `points.ts:38`               |
| `isAccurateEnough`  | `accuracy ≤ 50 m`; an unknown/non-finite accuracy **passes** | `points.ts:187`              |
| `isPlausibleStep`   | `≤ 25 m + 8 m/s × elapsed` from the previous accepted point  | `points.ts:326`              |
| `storePoint`        | must persist to IndexedDB (one retry, then dropped)          | `use-patrol-recorder.ts:286` |

`src/lib/patrols/points.ts:181` and `:326`:

```ts
export const MAX_ACCURACY_METRES = 50
export const MAX_STEP_SPEED_MPS = 8
export const STEP_NOISE_TOLERANCE_METRES = 25

export function isAccurateEnough(accuracy: number | null | undefined): boolean {
  if (typeof accuracy !== 'number' || !Number.isFinite(accuracy)) return true
  return accuracy <= MAX_ACCURACY_METRES
}

export function isPlausibleStep(
  previous: RecordedPoint | null,
  next: RecordedPoint,
): boolean {
  if (previous === null) return true

  const elapsedMs =
    Date.parse(next.recordedAt) - Date.parse(previous.recordedAt)
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return true

  const allowed =
    STEP_NOISE_TOLERANCE_METRES + (elapsedMs / 1000) * MAX_STEP_SPEED_MPS
  return distanceBetweenMetres(previous, next) <= allowed
}
```

25 m of jitter is forgiven outright; beyond that you may move at up to 8 m/s (a
fast run). Teleports from a bad fix never enter the distance total.

**Android has a fifth, native-side filter.** The intent, from
`plugins/background-geolocation/android/src/main/java/com/capgo/capacitor_background_geolocation/PatrolStepFilter.java:10`:

```java
/**
 * Drops the fixes nobody walked to.
 *
 * GPS wanders while a patroller stands still and every wandered metre lands in
 * the patrol total. The step counter is the second opinion. If it has not moved
 * between two fixes then the phone did not go anywhere, so the fix is drift.
 *
 * Only small moves are ever dropped. A jump longer than drift explains is let
 * through untouched, so a refused activity permission or a phone with no step
 * sensor can never eat a real walk.
 */
```

`PatrolStepFilter.java:109`:

```java
boolean admit(Location location) {
    attach();                       // the sensor may only appear mid-patrol

    float steps = latestSteps;
    Location previous = lastAccepted;

    if (previous == null
        || steps == NO_READING
        || stepsAtLastAccepted == NO_READING
        || location.distanceTo(previous) > DRIFT_CEILING_METRES) {   // 50f, :29
        return accept(location, steps);
    }

    if (steps != stepsAtLastAccepted) {     // :129 counter moved == a real walk
        return accept(location, steps);
    }

    return false;                           // drift, dropped before it reaches JS
}
```

### 4.3 What a stored point updates

`src/lib/patrols/use-patrol-recorder.ts:357-389`:

```ts
if (previous !== null) {
  distanceMetresRef.current += distanceBetweenMetres(previous, point)
}

lastRecordedAtRef.current = recordedAtMs
lastAcceptedRef.current = point
stored += 1

routeRef.current.push({ latitude: point.latitude, longitude: point.longitude })

if (routeRef.current.length > MAX_ROUTE_POINTS) {     // 500, :74
  routeRef.current.shift()
}

void updateLiveActivity({ distanceMetres: ..., route: normalizeRoute(routeRef.current) })

if (Date.now() - lastDrainedAtRef.current >= SYNC_INTERVAL_MS) {
  await drain()                                        // :387 opportunistic drain
}
```

All of these are **refs, not state** — `use-patrol-recorder.ts:109`:

```ts
// Refs, not state: a new point every twelve seconds must not re-render the
// page, and the callbacks below must always see the current values.
```

`routeRef` exists only for the lock-screen widget: `normalizeRoute`
(`src/lib/patrols/route-trace.ts:5`) downsamples to `MAX_TRACE_POINTS = 30`
(`:3`) and rescales into a square 0..1 box, so the widget can draw the shape
without knowing any geography.

`seedRoute` (`use-patrol-recorder.ts:118`) fills that trace once from
`GET /api/patrols/[id]/points` when the controls mount mid-patrol
(`patrol-controls.tsx:313-343`), so the widget isn't blank after a reload:

```ts
const seedRoute = useCallback((points) => {
  if (routeRef.current.length > 0 || points.length === 0) return
  routeRef.current = points.slice(-MAX_ROUTE_POINTS)
}, [])
```

That fetch failing is **silent and intentional** — the route redraws from live
GPS anyway (recorded in `docs/edge-cases.md:52`).

---

## 5. Patrol points: the queue and the drain

### 5.1 The local queue

`src/lib/patrols/point-queue.ts` — IndexedDB `canopee-patrol` v2 (`:3`, `:5`),
two stores: `points` (autoIncrement keys, so insertion order _is_ delivery order)
and `events` (the debug ring buffer, capped at 5 000, `:11`).

`appendPoint` enforces the cap by shedding the **oldest** keys — `:120`:

```ts
export async function appendPoint(point: RecordedPoint): Promise<number> {
  await request(STORE, 'readwrite', (store) => store.add(point))

  const total = await countPoints()
  if (total <= MAX_BUFFERED_POINTS) return total // 1_000, points.ts:9

  const stale = await request(STORE, 'readonly', (store) =>
    store.getAllKeys(null, total - MAX_BUFFERED_POINTS),
  )

  await deletePoints(stale as number[])
  return MAX_BUFFERED_POINTS
}
```

At one point per 12 s that is **~3 h 20 min of completely offline walking**
before the head of the trace starts to be lost.

The queue is deliberately **not** scoped to a patrol id — it is just "points not
yet delivered". The server decides which patrol they belong to (§6.2).

### 5.2 The drain loop

`src/lib/patrols/use-patrol-recorder.ts:206`:

```ts
async function drain() {
  if (stopped || syncing) {
    debugLog('drain.skipped', { stopped, syncing })
    return
  }
  syncing = true

  try {
    while (!stopped) {
      const queued = await readBatch(MAX_BATCH_POINTS) // 200, points.ts:7
      if (queued.length === 0) {
        debugLog('drain.empty')
        return
      }

      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queued.map((entry) => entry.point)),
        redirect: 'manual',
      })

      const outcome = classifySyncResponse(response.status)

      if (outcome === 'accepted') {
        // :243
        await deletePoints(queued.map((entry) => entry.key))
        lastDrainedAtRef.current = Date.now()
        continue
      }

      if (outcome === 'fatal') {
        // :255
        await clearPoints()
        console.warn(
          response.status === 0
            ? 'Patrol point sync rejected: the session is no longer valid'
            : `Patrol point sync refused (${response.status})`,
        )
        stop('stopped')
        return
      }

      console.warn(
        `Patrol point sync failed (${response.status}), keeping the queue`,
      )
      return // 5xx: retry in 60 s
    }
  } catch (cause) {
    console.warn('Patrol point sync failed, keeping the queue', cause) // :280
  } finally {
    syncing = false
  }
}
```

Three triggers: once on mount (`:518`), every `SYNC_INTERVAL_MS` on an interval
(`:493`), and opportunistically after storing a point (`:387`).

The classification — `src/lib/patrols/points.ts:94`:

```ts
export function classifySyncResponse(status: number): SyncOutcome {
  if (status >= 200 && status < 300) return 'accepted'
  if (status >= 500) return 'retry'
  return 'fatal'
}
```

- **5xx is transient** — the server had a problem, the walk is still valid, hold
  the points. The route handler _deliberately lets a failing insert throw_
  rather than catching it (`src/app/api/patrol-points/route.ts:44`): _"A failing
  insert is left to throw: the 500 tells the client to keep its buffer and try
  again, which a caught error would not."_
- **Everything else is fatal** — 400, 409 (no active patrol), 401/403, and
  `status === 0`, which is what `redirect: 'manual'` produces when the request
  was bounced to the login page. Retrying those forever would never succeed, so
  the queue is cleared, the watch released, and the UI shows
  `'Enregistrement du trajet interrompu. Rechargez la page.'`
  (`patrol-controls.tsx:48`).

`redirect: 'manual'` is load-bearing throughout (`use-patrol-recorder.ts:231`,
`patrol-provider.tsx:68`, `native.ts:32`): without it an expired session returns
a 200 HTML login page and the client "succeeds" forever.

### 5.3 The server side

`src/app/api/patrol-points/route.ts:6`:

```ts
/**
 * Receives a batch of GPS points from a running patrol. A Route Handler rather
 * than a Server Action.
 */
export async function POST(request: Request) {
  const profile = await requireApprovedAccess('volunteer')

  // The patrol comes from the session, never from the body.
  const patrol = await getActivePatrol(profile.id)         // route.ts:14

  if (!patrol) {
    return Response.json({ error: 'No active patrol.' }, { status: 409 })
  }
  ...
  const batch = parsePatrolPointBatch(payload, {           // :28
    patrolStartedAt: patrol.startedAt,
    now: new Date(),
  })
  ...
  await db.insert(patrolPoints)
    .values(batch.points.map((point) => ({ ...point, patrolId: patrol.id })))
    .onConflictDoNothing()                                  // :49
```

Validation — `src/lib/patrols/points.ts:106`:

```ts
const earliest = bounds.patrolStartedAt.getTime() - PATROL_START_GRACE_MS // −60 s
const latest = bounds.now.getTime() + CLOCK_SKEW_MS // +5 min

// One bad reading does not invalidate the walk around it, so points are
// dropped individually rather than failing the whole request.
const points = payload
  .map((candidate) => toPatrolPointRow(candidate, earliest, latest))
  .filter((row): row is PatrolPointRow => row !== null)

return { points, dropped: payload.length - points.length }
```

Per-point checks live at `points.ts:134`, including the range guard at `:172`:

```ts
/** Out-of-range values would overflow `decimal(9, 6)` and fail the insert. */
function isCoordinate(value: unknown, limit: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Math.abs(value) <= limit
  )
}
```

Coordinates are stored as `toFixed(6)` strings (`points.ts:166`) — ~11 cm
resolution, matching the column.

---

## 6. Native: the second, independent upload path

On iOS and Android the same fix travels **two** routes at once:

```
                    ┌─ JS callback → record() → IndexedDB → POST /api/patrol-points
GPS fix ── plugin ──┤                                        (cookie session, active patrol)
                    └─ native uploader ──────→ POST /api/patrol-points/native
                                                (Bearer token, patrol matched by time)
```

Why, from `LocationStore.java:18`:

```java
// Persists the configuration for a native location watcher and delivers
// location updates to a configured URL directly from native code. This mirrors
// GeofenceStore and exists so that background location delivery keeps working
// after the WebView (and its JavaScript callback) has been destroyed.
```

The duplication is safe because of `unique (patrol_id, recorded_at)`.

### 6.1 Authenticating a request with no session

`src/lib/patrols/upload-token.ts:28`:

```ts
export function createUploadToken(
  userId: string,
  now = Date.now(),
): string | null {
  const secret = getSecret() // PATROL_UPLOAD_SECRET
  if (!secret) return null

  const body = encode(JSON.stringify({ userId, expiresAt: now + TOKEN_TTL_MS })) // 60 min, :3

  return `${body}.${sign(body, secret)}` // base64url . HMAC-SHA256
}
```

Verified with `timingSafeEqual` plus an expiry check (`upload-token.ts:62`,
`:87`). Served by `src/app/api/patrols/upload-token/route.ts`, which 503s when
the secret is unset — native upload is then simply not configured and the JS path
carries everything.

Refreshed every 15 minutes so a patrol longer than an hour keeps uploading —
`src/lib/patrols/native.ts:59`:

```ts
refreshTimer = setInterval(() => {
  void (async () => {
    const token = await fetchUploadToken()
    if (!token) return

    await BackgroundGeolocation.updateHeaders({
      headers: { Authorization: `Bearer ${token}` },
    })
    debugLog('native.token.refreshed')
  })()
}, TOKEN_REFRESH_MS) // native.ts:22
```

### 6.2 Matching points to a patrol without a patrol id

`POST /api/patrol-points/native` knows _who_ sent the points, not _which patrol_.
It works backwards from time — `src/app/api/patrol-points/native/route.ts:42`:

```ts
const windows = await listPatrolsCovering(
  session.userId,
  new Date(Math.min(...recordedAt)),
  new Date(Math.max(...recordedAt)),
)

if (windows.length === 0) {
  return Response.json({ error: 'No matching patrol.' }, { status: 409 })
}

const { groups, dropped } = groupPointsByPatrol(points, windows, now) // :52
```

The window rule — `src/lib/patrols/points.ts:295`:

```ts
const window = windows.find((candidate) => {
  const earliest = candidate.startedAt.getTime() - PATROL_START_GRACE_MS
  const latest =
    (candidate.endedAt ?? now).getTime() +
    (candidate.endedAt ? 0 : CLOCK_SKEW_MS) // no future slack once closed

  return recordedMs >= earliest && recordedMs <= latest
})
```

A **closed** patrol gets no future tolerance, so points cannot drift into a
finished walk. This is what lets background points arrive _after_ the patrol was
closed and still land on the right one.

`listPatrolsCovering` is `src/lib/patrols/queries.ts:48`; the batch parser
accepts either a single object or an array (`points.ts:241`), because Android
posts one at a time and iOS posts batches.

### 6.3 Android delivery

`LocationStore.java:106` enforces the interval natively:

```java
static boolean shouldPost(Context context, long locationTimeMs) {
    long minIntervalMs = getMinIntervalMs(context);
    if (minIntervalMs <= 0) return true;

    long lastPostTime = prefs(context).getLong(KEY_LAST_POST_TIME, Long.MIN_VALUE);
    if (lastPostTime != Long.MIN_VALUE && locationTimeMs < lastPostTime) return true;
    if (lastPostTime != Long.MIN_VALUE && locationTimeMs - lastPostTime < minIntervalMs) return false;

    return true;
}
```

Config lives in `SharedPreferences` so it survives the service restarting
(`:41`). `sendLocation` (`:127`) POSTs synchronously and **throws** on a non-2xx
(`:156`); the caller only logs it —
`BackgroundGeolocationService.java:261`:

```java
postExecutor.execute(() -> {
    try {
        LocationStore.sendLocation(context, payload);
    } catch (Exception e) {
        Logger.error("Native location POST failed", e);     // :271 — and that is all
    }
});
```

**There is no native retry queue on Android.** A failed POST is gone from _that_
path; the point is still in IndexedDB if the WebView is alive. Android + offline

- killed WebView = those points are lost.

The service does run a **watchdog** —
`BackgroundGeolocationService.java:231`:

```java
private void handleLocationChanged(android.location.Location location) {
    // The watchdog is fed first. A dropped fix is still proof the GPS is
    // alive, and restarting updates over drift would be pointless churn.
    startWatchdog();                                     // 60 s timer, :219

    // The step counter has the last word on whether the phone actually
    // moved, so the drift never reaches the patrol total.
    if (stepFilter != null && !stepFilter.admit(location)) return;
```

On timeout it removes updates and re-requests them 10 s later (`:191-211`), then
re-arms. Silent GPS gets kicked rather than silently ending the trace.

### 6.4 iOS delivery

iOS _does_ have a durable native queue —
`plugins/background-geolocation/ios/Sources/CapgoBackgroundGeolocationPlugin/PatrolPointQueue.swift`:

- Append-only **JSONL file** in Application Support (`points.jsonl`, `:225`), one
  `{id, p}` line per point (`:126`), cap **10 000** (`:13`), trimmed every 500
  appends (`:287`).
- Uploads via a **background `URLSession`** (`:25-33`) in batches of 200 (`:12`),
  one in flight at a time, body staged to a `batch-<first>-<last>.json` file
  (`:157`) so the OS can send it after the app is suspended or relaunched.
- The endpoint is persisted and restored at init (`:45`, `:67`), so a cold launch
  resumes uploading before any JS runs.

Completion handling — `PatrolPointQueue.swift:330`:

```swift
public func urlSession(_ session: URLSession, task: URLSessionTask,
                       didCompleteWithError error: Error?) {
    let status = (task.response as? HTTPURLResponse)?.statusCode ?? 0

    let rejected = status == 400 || status == 413
    let accepted = error == nil && ((200..<300).contains(status) || rejected)

    finish(taskDescription: task.taskDescription, accepted: accepted)
}
```

2xx **or 400/413** count as done — a poison batch is discarded rather than
blocking the queue forever; anything else keeps the range and retries on the next
`drain()` (`:139`), which is kicked by `configure`, `updateHeaders`, `enqueue`
and every successful upload.

---

## 7. The flushes

Four distinct things are called "flush" here.

### 7.1 `flushAndStop` — the important one

`src/lib/patrols/use-patrol-recorder.ts:433`:

```ts
async function flushAndStop() {
  debugLog('flushAndStop.begin', { stored })

  stopped = true       // no new points; drain() becomes a no-op
  releaseWatch()       // clear the GPS watch + sync interval + heartbeat

  while (true) {
    const queued = await readBatch(MAX_BATCH_POINTS)

    if (queued.length === 0) {
      debugLog('flushAndStop.done')
      await flushDebugFile()
      return
    }

    try {
      const response = await fetch(ENDPOINT, { method: 'POST', ..., redirect: 'manual' })

      if (classifySyncResponse(response.status) !== 'accepted') return   // bail, keep queue
    } catch (cause) {
      debugLog('flushAndStop.threw', describeError(cause))
      return
    }

    await deletePoints(queued.map((entry) => entry.key))
  }
}
```

It differs from `drain()` in three ways: it stops recording **first**, it has no
`syncing` guard to defer to, and on failure it just returns — it never clears the
queue, even on a fatal status.

**The ordering is the point** — `src/components/patrol-controls.tsx:201`:

```ts
async function runEndPatrol(flushAndStop: () => Promise<void>) {
  await flushAndStop() // every buffered point is in the DB…
  return endPatrol() // …before the server sums the route
}
```

Without the await, `endPatrol` reads a partial route and stores a short distance
— hence its own comment at `actions.ts:68`: _"Read after the client has flushed,
so the distance covers the whole route."_ The client's running distance
(`distanceMetresRef`) is **never** trusted; it is display only. The server
re-sums with `totalDistanceMetres` (`src/lib/patrols/distance.ts:25`).

The same path serves the lock-screen `stop` command (`patrol-controls.tsx:302`).

### 7.2 `flushNativeQueue` — on every page load

`src/components/patrol-sync.tsx:6` renders `null` and exists only to call it once
on mount, from the root layout (`layout.tsx:104`):

```tsx
export function PatrolSync() {
  useEffect(() => {
    void flushNativeQueue()
  }, [])

  return null
}
```

`src/lib/patrols/native.ts:101`:

```ts
export async function flushNativeQueue(): Promise<void> {
  if (!isNativeApp()) return

  const token = await fetchUploadToken()
  if (!token) return

  await BackgroundGeolocation.updateHeaders({
    headers: { Authorization: `Bearer ${token}` },
  })
  debugLog('native.flush.requested')
}
```

On iOS `updateHeaders` also triggers `PatrolPointQueue.drain()`
(`PatrolPointQueue.swift:101-111`), so **opening the app delivers whatever the
background session couldn't**. On Android it only refreshes credentials — there
is no queue to drain.

### 7.3 `drain` — the routine 60 s sync

§5.2. "flush" in the recorder's debug log means `drain`.

### 7.4 `flushDebugFile` — diagnostics

§8.

---

## 8. Tracking a patrol when things go wrong

| Failure                          | What happens                                                                                                                                                                                                                                                 | Where                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Network drops mid-patrol**     | Points keep landing in IndexedDB; `drain` warns and keeps the queue. ~1 000 points (~3 h 20) buffer before the oldest are shed. Resumes on the next 60 s tick.                                                                                               | `use-patrol-recorder.ts:268`, `point-queue.ts:120`                       |
| **GPS signal lost**              | Status → `signal-lost`; the watch is **not** released, so it recovers by itself. Android's watchdog also restarts updates after 60 s.                                                                                                                        | `use-patrol-recorder.ts:410`, `BackgroundGeolocationService.java:214`    |
| **Permission denied**            | `stop('denied')` — the recorder stops for good. The patrol still runs and still gets a duration; only the trace is missing.                                                                                                                                  | `use-patrol-recorder.ts:424`, notice at `patrol-controls.tsx:44`         |
| **Browser can't record**         | `status: 'unsupported'`, resolved through `useSyncExternalStore` so there's no second render and the server (no `navigator`) doesn't crash.                                                                                                                  | `use-patrol-recorder.ts:100-106`                                         |
| **Page reloaded / app reopened** | The patrol is a DB row, so it returns: SSR gives `startedAt` on first paint, the recorder remounts and immediately `drain()`s, `seedRoute` refills the widget trace. The clock is unaffected — derived from `started_at`, not from anything the client kept. | `layout.tsx:67`, `use-patrol-recorder.ts:518`, `patrol-controls.tsx:313` |
| **App closed on native**         | Foreground service / background session keeps recording and uploading; points land on the right patrol by time window.                                                                                                                                       | §6.2                                                                     |
| **Phone dies mid-patrol**        | The patrol stays open. What reached the server is kept; what was only in IndexedDB survives on the device — but see §9.                                                                                                                                      | —                                                                        |
| **Session expires**              | Fatal path: queue cleared, recording stopped, _"Rechargez la page."_ The provider flips to `unavailable` and polls every 2 s so the controls reappear when auth is back.                                                                                     | `use-patrol-recorder.ts:255`, `patrol-provider.tsx:98`                   |
| **User closes the tab**          | `beforeunload` confirm, mounted only while a patrol is active.                                                                                                                                                                                               | `use-patrol-exit-warning.ts:7`                                           |
| **Patrol never ended**           | Stays active forever; the clock counts past 24 h by design (`26:14:03`) and `getActivePatrol` returns the most recent open row. Nothing auto-closes it.                                                                                                      | `elapsed.ts:9`, `queries.ts:37`                                          |

The notices the user actually sees are the map at `patrol-controls.tsx:39`:

```ts
const RECORDING_NOTICE: Record<RecordingStatus, string | null> = {
  waiting: 'Recherche du signal GPS…',
  recording: null,
  'signal-lost':
    'Signal GPS perdu. L’enregistrement reprendra automatiquement.',
  denied:
    'Localisation refusée : le trajet de cette patrouille ne sera pas enregistré.',
  unsupported:
    'Ce navigateur ne peut pas enregistrer le trajet de la patrouille.',
  stopped: 'Enregistrement du trajet interrompu. Rechargez la page.',
}
```

### The debug trail

`src/lib/patrols/debug.ts` exists because most of these failures happen on a
phone in a forest with no devtools attached.

- Every notable event goes to the console **and** the IndexedDB `events` store
  (`debug.ts:26`, capped at 5 000 in `point-queue.ts:11`).
- On native it is also appended to `patrol-debug.txt` in `Directory.External`
  (`debug.ts:47`), flushed on the heartbeat and on every visibility change
  (`use-patrol-recorder.ts:167`).
- The 30 s heartbeat is how you tell "the OS froze our timers" apart from "the
  GPS went quiet" — `use-patrol-recorder.ts:497`:

  ```ts
  heartbeatTimer = setInterval(() => {
    const now = Date.now()

    debugLog('heartbeat', {
      driftMs: now - lastBeatAt - HEARTBEAT_MS,
      visibility: document.visibilityState,
      online: navigator.onLine,
      stored,
    })

    lastBeatAt = now
    void flushDebugFile()
  }, HEARTBEAT_MS)
  ```

- `installDebugBridge()` (`debug.ts:147`) exposes `window.__patrol` with
  `dump / events / clear / file / flush / clearFile`.

---

## 9. Known edges

- **Points can outlive their patrol.** If `flushAndStop` bails (offline when the
  user presses stop, `use-patrol-recorder.ts:461`), the queue survives and is
  posted by the _next_ recorder mount — but `POST /api/patrol-points` binds to
  whatever patrol is active _then_ (`route.ts:14`), and the old points fall
  outside `[started_at − 60 s, now + 5 min]` (`points.ts:122`) and are dropped.
  The `/native` endpoint would have matched them by time window; the web one has
  no such path. Ending a patrol while offline can therefore lose the tail of the
  trace, and the stored `distance_meters` will be short.
- **Android offline + dead WebView loses points** — no native retry queue there,
  unlike iOS (§6.3).
- **The displayed timer mixes clocks** (server `started_at`, device `now`).
  Clamped at zero (`elapsed.ts:13`), but a phone with a fast clock shows an
  inflated _running_ time. The stored duration is unaffected.
- **Pause is per-tab** (`sessionStorage`, `patrol-controls.tsx:87`) and does not
  pause the recorded duration.
- **`seedRoute` failing is silent** — intentional, `docs/edge-cases.md:52`.

---

## 10. File map

| Concern                                        | File                                                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Open / close a patrol                          | `src/app/patrouilles/actions.ts` (`startPatrol:28`, `endPatrol:54`)                                  |
| Active-patrol state, shared                    | `src/components/patrol-provider.tsx`                                                                 |
| Clock, pause, buttons, Live Activity wiring    | `src/components/patrol-controls.tsx` (clock `:51`, pause `:281`, status `:489`)                      |
| `HH:MM:SS` formatting                          | `src/lib/patrols/elapsed.ts:10`                                                                      |
| Capture, filters, drain, flushAndStop          | `src/lib/patrols/use-patrol-recorder.ts` (`drain:206`, `record:312`, `flushAndStop:433`)             |
| Validation, thresholds, patrol-window matching | `src/lib/patrols/points.ts`                                                                          |
| IndexedDB queue + debug store                  | `src/lib/patrols/point-queue.ts`                                                                     |
| Haversine                                      | `src/lib/patrols/distance.ts:12`                                                                     |
| Native watch, token refresh                    | `src/lib/patrols/native.ts`                                                                          |
| Lock-screen widget bridge                      | `src/lib/patrols/live-activity.ts`                                                                   |
| Widget trace normalisation                     | `src/lib/patrols/route-trace.ts:5`                                                                   |
| Diagnostics                                    | `src/lib/patrols/debug.ts`                                                                           |
| Queries, durations, totals                     | `src/lib/patrols/queries.ts`                                                                         |
| Web ingest                                     | `src/app/api/patrol-points/route.ts`                                                                 |
| Native ingest                                  | `src/app/api/patrol-points/native/route.ts`                                                          |
| Upload token                                   | `src/lib/patrols/upload-token.ts`, `src/app/api/patrols/upload-token/route.ts`                       |
| Active / route / list endpoints                | `src/app/api/patrols/**`                                                                             |
| Android service, drift filter, native POST     | `plugins/background-geolocation/android/src/main/java/com/capgo/capacitor_background_geolocation/`   |
| iOS durable upload queue                       | `plugins/background-geolocation/ios/Sources/CapgoBackgroundGeolocationPlugin/PatrolPointQueue.swift` |
| Schema                                         | `src/db/schema.ts:109`                                                                               |

Tests: `tests/lib/patrols/*.test.ts` (elapsed, points, distance, route-trace,
upload-token, history, access) and `tests/app/api/patrol{s,-points}/**`.
