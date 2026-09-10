# Performance pass

Measurements were taken against the production database and a production build,
not the dev server. Query timings come from EXPLAIN ANALYZE, bundle sizes from
the emitted chunks, and stylesheet sizes from the HTML actually served.

## Database

At the current scale, 20 users, 215 reports, 191 patrols and 9920 patrol points,
every query the app runs is well inside budget.

| Query                  | Time    | Plan                                      |
| ---------------------- | ------- | ----------------------------------------- |
| Heatmap zones, 30 days | 18.1 ms | Seq scan on patrol_points, then aggregate |
| Observations layer     | 0.1 ms  | Bitmap index scan on reports_category_idx |
| Report pins, open      | 0.3 ms  | Seq scan on reports                       |
| Reports export         | 0.8 ms  | Nested loop, index scans                  |
| Patrol route points    | 1.9 ms  | Index scan on patrol_points               |

The heatmap is the only sequential scan on a table that grows quickly. An index
on recorded_at was considered and rejected. The 30 day window currently covers
63.6 percent of the rows, so the planner would ignore the index and every GPS
insert would pay to maintain it. This becomes worth revisiting once the window
selects roughly 10 percent or less of the table, which happens after about a
year of patrols at the present rate.

## Session lookups

The largest fixable cost was authentication, not SQL. `getCurrentUserProfile`
calls the Supabase Auth API over the network and then queries the users table.
It ran three times per page render, once in the proxy, once in the root layout
and once in the page's own role check. A round trip to the auth endpoint measures
100 to 120 ms from a development machine.

The function is now wrapped in React's `cache`, which is what the Next.js
authentication guide recommends for a session lookup. That collapses the two
render pass calls into one. The proxy runs in a separate process and still makes
its own call, which is unavoidable.

## Stylesheets

The root layout imported mapbox-gl.css, so 39 KB of map styling was render
blocking on every page, including login and signup where no map exists. The
import moved to base-map.tsx, the only component that instantiates a map, so it
now loads with the routes that draw one.

| Page   | Before | After |
| ------ | ------ | ----- |
| /login | 115 KB | 76 KB |

## JavaScript

Client JavaScript totals 3.3 MB across all chunks. Mapbox GL accounts for
1.78 MB of that in a single chunk, and it is already route split, so pages
without a map never download it. Shared JavaScript loaded on every route is
446 KB, which is mostly React and the Next.js runtime.

## Images

No changes needed. There is no raw img tag anywhere in the app, every image goes
through next/image and so is lazy loaded by default, report photos are downscaled
in the browser before upload, and next.config.ts restricts remote images to the
Supabase storage host.

## Left open

| Item                                               | Reason                                                                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Every route is dynamic, including login and signup | The root layout reads cookies to resolve the session. Making public pages static means moving that lookup out of the root layout. |
| src/components/mapbox-map.tsx                      | Nothing imports it. BaseMap is the component actually used.                                                                       |
| Heatmap index on recorded_at                       | Premature. See the reasoning above.                                                                                               |
