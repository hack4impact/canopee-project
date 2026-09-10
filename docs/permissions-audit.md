# Permissions audit

Role × feature grid, verified by reading each route handler's and Server
Action's server-side check directly, not the UI.

## Roles

Code has three roles: `volunteer` < `pro` < `admin`
(`src/lib/auth/roles.ts`). "Citizen" isn't a DB role, it means no account,
or an account still `pending`/`rejected`. `canAccess()` requires an approved
status and the right role rank.

## Grid

| Feature                              | Enforced by                                      | Citizen         | Volunteer | Pro    | Admin |
| ------------------------------------ | ------------------------------------------------ | --------------- | --------- | ------ | ----- |
| View map / heatmap                   | `(map)/layout.tsx`, `/api/heatmap`               | ❌              | ✅        | ✅     | ✅    |
| View report pins                     | `/api/reports`                                   | ❌              | ✅        | ✅     | ✅    |
| View flora/fauna observations        | `/api/observations` (min role `pro`)             | ❌              | ❌        | ✅     | ✅    |
| Export observations CSV              | `/api/fauna-flora/export`                        | ❌              | ❌        | ✅     | ✅    |
| Export reports CSV                   | `/api/reports/export`                            | ❌              | ❌        | ✅     | ✅    |
| Submit a report (in-app)             | `signaler/actions.ts`                            | ❌              | ✅        | ✅     | ✅    |
| Submit a report (public form)        | `/api/public/reports`                            | ✅ rate-limited | ✅        | ✅     | ✅    |
| Resolve a report                     | `reports/actions.ts`                             | ❌              | ❌        | ✅     | ✅    |
| View all reports (issues list)       | `/admin/issues`                                  | ❌              | ❌        | ✅     | ✅    |
| Start/end patrol                     | `patrouilles/actions.ts`                         | ❌              | ✅        | ✅     | ✅    |
| Submit patrol GPS points (web)       | `/api/patrol-points`                             | ❌              | ✅        | ✅     | ✅    |
| Submit patrol GPS points (native)    | `/api/patrol-points/native`, signed 1h token     | ❌              | ✅        | ✅     | ✅    |
| List/view own patrols                | `/api/patrols`, `/patrouilles/*`, owner or admin | ❌              | ✅ own    | ✅ own | ✅any |
| Change password / delete own account | `profil/actions.ts`                              | ❌              | ✅        | ✅     | ✅    |
| Approve/reject signups               | `admin/volunteers/actions.ts`                    | ❌              | ❌        | ❌     | ✅    |
| Change roles, delete members         | `admin/membres/actions.ts`                       | ❌              | ❌        | ❌     | ✅    |

No lower role can reach a higher role's endpoint directly, every `pro`/
`admin` action re-checks the role server-side. The two exceptions below are
missing auth entirely, not role escalation.

## Gaps

1. **Anyone can spam the map-usage counter.** `POST /api/map-loads` doesn't
   check who's calling. A script that just calls this URL over and over
   inflates the Mapbox usage number the team watches for billing.
2. **The usage-monitoring endpoint can be wide open by accident.**
   `GET /api/cron/mapbox-usage` only checks its secret key if that key is
   actually set in the environment. If it's ever missing, the endpoint
   answers anyone, no key needed.
3. **A leftover file would leak every user's email if ever turned back on.**
   `src/app/users/page copy.tsx` lists every user's email and role with no
   login check. It's harmless right now only because of its odd file name
   (Next.js won't serve a page unless it's exactly named `page.tsx`). Rename
   it back and it goes live, unprotected, for anyone.
4. **One admin page checks for admin, its twin doesn't.**
   `admin/membres/page.tsx` checks "is this an admin?" right at the top.
   `admin/volunteers/page.tsx` doesn't, it happens to be safe today only
   because a function it calls further down does the check instead. Fragile:
   if that function ever changes, this page loses its protection silently.
5. **Almost nothing tests that these checks actually work.** Only one route
   (`fauna-flora/export`) has a test that tries calling it as each role and
   confirms the right ones get blocked. Every other route in the grid above
   is unverified by any automated test, a future code change could break a
   check and nothing would catch it.
6. **A citizen report's ID can be chosen by whoever submits it, not just the
   system.** Normally the database assigns each report a random ID. This
   endpoint lets the sender specify their own ID instead, probably so a
   phone with bad signal can safely retry the same submission without
   creating a duplicate. But since this endpoint has no login at all, anyone
   could submit using an ID that's already taken. When that happens, nothing
   gets saved, but the response still says "success." Likely intentional for
   the retry case; worth confirming with whoever built it. (**Authered completely by Claude AI**)

## Fixes in #151

1. `POST /api/map-loads` requires an approved volunteer (same gate as heatmap).
2. `GET /api/cron/mapbox-usage` returns 401 if `CRON_SECRET` is missing or the Bearer token is wrong.
3. `src/app/users/page copy.tsx` is deleted.
4. `/admin/volunteers` calls `requireAdmin()` at the page, matching `/admin/membres`.
5. Permission tests live under `tests/app/api/` for reports, heatmap, export, patrols, patrol-points, upload-token, public reports, map-loads, and cron.
6. Public and authenticated report POST: same author + category + lat/lng is treated as a retry (200). A different payload with the same id returns 409. The phone queue deletes 409 items so it does not loop.

# Follow-up issues for gaps

## Issue #1

Title:
[Issue]: POST /api/map-loads has no authentication check

Body:
Branch Name
fix/<issue-number>-map-loads-auth

Description
`src/app/api/map-loads/route.ts` never checks who's calling. It's meant to
track Mapbox usage from signed-in, approved users viewing the map, but as
written it accepts a POST from anyone, including a caller with no session
at all. Anyone can script repeated calls to inflate the Mapbox usage
counter the team watches for the free-tier billing threshold
(`/api/cron/mapbox-usage`), triggering false usage warnings or masking
real ones.

Found during the permissions audit, #150.

Acceptance Criteria

- [ ] `POST /api/map-loads` returns 401 for a caller with no session, same
      as every other map-related route (`getCurrentUserProfile()` check)
- [ ] An approved user's normal map usage still increments the counter as
      before

Checklist

- [ ] I have checked for duplicate issues.
- [ ] I have assigned the issue to the correct project board.
- [ ] I have tagged the issue properly.

Code of Conduct

- [ ] I agree to follow this project's Code of Conduct

## Issue #2

Title:
[Issue]: GET /api/cron/mapbox-usage is unprotected when CRON_SECRET is unset

Body:
Branch Name
fix/<issue-number>-cron-mapbox-usage-auth

Description
`src/app/api/cron/mapbox-usage/route.ts` only checks the secret key like this:

```ts
if (process.env.CRON_SECRET) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
}
```

The check only runs if `CRON_SECRET` happens to be set. If it's ever
missing, a misconfigured deploy, a forgotten env var in a new
environment, the route fails open and answers anyone, no key needed. It
returns internal Mapbox usage numbers and threshold status, not something
that should be public.

Found during the permissions audit, #150.

Acceptance Criteria

- [ ] The route requires a valid `CRON_SECRET` unconditionally, if the env
      var is missing, the route refuses every request (fails closed)
      instead of allowing every request
- [ ] The scheduled cron job that calls this route still works with its
      configured secret

Checklist

- [ ] I have checked for duplicate issues.
- [ ] I have assigned the issue to the correct project board.
- [ ] I have tagged the issue properly.

Code of Conduct

- [ ] I agree to follow this project's Code of Conduct

## Issue #3

Title:
[Issue]: Delete orphaned src/app/users/page copy.tsx, unguarded user list

Body:  
Branch Name
chore/<issue-number>-remove-orphaned-users-page

Description
`src/app/users/page copy.tsx` is a leftover file that lists every user's
email and role, with no login check at all. It's inert today only because
of its file name, Next.js requires the exact filename `page.tsx` to treat
something as a route, and this one is named `page copy.tsx`, so nothing
currently serves it at `/users`.

If it's ever renamed back to `page.tsx` (an easy accident, e.g. a "fix
this typo" commit), it becomes a live, fully public page leaking every
user's email and role to anyone, including unauthenticated visitors.

Found during the permissions audit, #150.

Acceptance Criteria

- [ ] `src/app/users/page copy.tsx` is deleted
- [ ] Confirm no other code imports or references it before removing

Checklist

- [ ] I have checked for duplicate issues.
- [ ] I have assigned the issue to the correct project board.
- [ ] I have tagged the issue properly.

Code of Conduct

- [ ] I agree to follow this project's Code of Conduct

## Issue #4

Title:
[Issue]: admin/volunteers/page.tsx has no direct role guard

Body:
Branch Name
fix/<issue-number>-volunteers-page-guard

Description
`src/app/admin/volunteers/page.tsx` doesn't check the caller's role itself.
It's protected today only indirectly: the page calls `getPendingUsers()`,
and that function happens to call `requireAdmin()` before returning data.
If the page's data-fetching ever changes, a refactor that fetches
something else first, or renders other content before that call, the
route could lose its only protection without anyone noticing.

Its sibling page, `src/app/admin/membres/page.tsx`, does this correctly:

```ts
export default async function AdminMembersPage() {
const admin = await requireAdmin()
...
```

`admin/volunteers/page.tsx` should follow the same pattern.

Found during the permissions audit, #150.

Acceptance Criteria

- [ ] `admin/volunteers/page.tsx` calls `requireAdmin()` directly at the
      top of the page component, matching `admin/membres/page.tsx`
- [ ] A non-admin (or unauthenticated) request to `/admin/volunteers`
      is refused even if `getPendingUsers()` were changed to skip its
      own check

Checklist

- [ ] I have checked for duplicate issues.
- [ ] I have assigned the issue to the correct project board.
- [ ] I have tagged the issue properly.

Code of Conduct

- [ ] I agree to follow this project's Code of Conduct

## Issue #5

Title:
[Issue]: No integration tests verify role access on API routes

Body:
Branch Name
chore/<issue-number>-route-permission-tests

Description
Only one route has a test that exercises it as each role and checks the
response codes: `src/app/api/fauna-flora/export/route.test.ts` (mocks
`getCurrentUserProfile`, asserts 401 for anonymous, 403 for a volunteer,
403 for a pending pro, 200 for an approved pro/admin).

Every other route in the permissions audit grid (#150) has no equivalent
test:

- `/api/reports`
- `/api/observations`
- `/api/heatmap`
- `/api/reports/export`
- `/api/patrols`
- `/api/patrols/active`
- `/api/patrols/[id]/points`
- `/api/patrol-points`
- `/api/patrol-points/native`
- `/api/patrols/upload-token`
- `/api/public/reports`
- `/api/map-loads`

Today, the only thing verifying these role checks is the current
audit, a manual, one-time read of the code. Nothing would catch it if a
future change accidentally loosened or removed one of these checks.

Found during the permissions audit, #150.

Acceptance Criteria

- [ ] Each route above has a test file following the pattern in
      `fauna-flora/export/route.test.ts`: mock the current user, assert the
      right status code (401 anonymous, 403 insufficient role, 200/2xx for
      an allowed role)
- [ ] Continuous integration runs these tests on every PR

Checklist

- [ ] I have checked for duplicate issues.
- [ ] I have assigned the issue to the correct project board.
- [ ] I have tagged the issue properly.

Code of Conduct

- [ ] I agree to follow this project's Code of Conduct

## Issue #6 (entirely authered by Claude)

Title:
[Issue]: Confirm client-supplied report ID on /api/public/reports is intentional

Body:
Branch Name
chore/<issue-number>-public-report-id-review

Description
Reports normally get their ID assigned by the database
(`uuid('id').primaryKey().defaultRandom()` in `schema.ts`). But
`submitReport`/`createCitizenReport` in `src/lib/reports/submit.ts` will
use a client-supplied `id` instead, if one is sent in the form:

```ts
const id = readReportId(formData)
...
.values({ ...(id ? { id } : {}), ... })
.onConflictDoNothing()
...
return { submittedId: created?.id ?? id ?? undefined }
```

This looks intentional: it lets a client with a dropped connection retry
the same submission without creating a duplicate report (same ID, insert
is skipped, but the response still reports success).

`/api/public/reports` has no login at all, so this mechanism is reachable
by anyone, not just a client retrying its own request. A caller can submit
using an ID that's already taken by an unrelated report. When that
happens, nothing is saved, but the response still says success, so a
citizen could be told their report went through when it didn't.

Not a break-in, but worth the original author confirming the retry
behavior is intentional and deciding whether the false-success response
on an ID collision needs handling.

Found during the permissions audit, #150.

Acceptance Criteria

- [ ] Confirm with whoever built citizen reporting whether the
      client-supplied `id` is intended as an offline-retry mechanism
- [ ] Decide whether an ID collision from an unrelated caller should
      return a different response than a genuine retry success

Checklist

- [ ] I have checked for duplicate issues.
- [ ] I have assigned the issue to the correct project board.
- [ ] I have tagged the issue properly.

Code of Conduct

- [ ] I agree to follow this project's Code of Conduct
