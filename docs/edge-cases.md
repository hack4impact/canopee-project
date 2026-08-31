# Edge case audit

A pass over the map, patrol, reports and export flows, looking for empty data,
failed requests, poor connectivity and invalid input. This records what the app
already handled, what was missing, and what is deliberately left open.

## Already handled

Most flows were in good shape. Every list has an empty state, and every client
fetch on the map already distinguishes "no data" from "the request failed".

| Flow              | Empty state                                       | Failure state                                                | File                                         |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| Report pins       | Aucun signalement trouvé.                         | Impossible d'afficher les signalements.                      | src/components/report-pins-layer.tsx         |
| Patrol heatmap    | Layer stays hidden                                | Impossible d'afficher la fréquentation des patrouilles.      | src/components/heatmap-layer.tsx             |
| Fauna and flora   | Layer stays hidden                                | Impossible d'afficher les observations de faune et de flore. | src/components/observations-layer.tsx        |
| Patrol route      | Route is not drawn                                | failed state on the map                                      | src/components/patrol-route-map.tsx          |
| Active patrol     | idle state                                        | unavailable state, controls hidden                           | src/components/patrol-provider.tsx           |
| Patrol history    | Vous n'avez pas encore de patrouille enregistrée. | Bubbles to the route boundary                                | src/app/patrouilles/historique/page.tsx      |
| Patrol detail     | Aucun signalement pendant cette patrouille.       | Bubbles to the route boundary                                | src/app/patrouilles/[id]/page.tsx            |
| Admin issues      | Aucun signalement pour le moment.                 | Bubbles to the route boundary                                | src/app/admin/issues/issue-list.tsx          |
| Members           | Aucun autre compte approuvé                       | Bubbles to the route boundary                                | src/app/admin/membres/member-list.tsx        |
| Volunteer queue   | Aucune demande en attente                         | Bubbles to the route boundary                                | src/app/admin/volunteers/volunteer-queue.tsx |
| Report submission | n/a                                               | Queued in IndexedDB and retried later                        | src/lib/reports/report-queue.ts              |

Server actions return a message in their state rather than throwing, so form
level failures already reach the user without a crash. The root layout wraps its
patrol lookup in a try/catch and falls back to no active patrol, so a database
problem does not take down every page.

## Missing, now fixed

The gap was uncaught exceptions. The app had no error boundary of any kind, so
a server component that threw fell through to the Next.js default error screen,
which is unstyled and in English.

| Problem                                                     | Fix                      |
| ----------------------------------------------------------- | ------------------------ |
| No route error boundary                                     | src/app/error.tsx        |
| No boundary for a root layout failure                       | src/app/global-error.tsx |
| Unknown URLs rendered the default English 404               | src/app/not-found.tsx    |
| forbidden.tsx was in English on a palette used nowhere else | Rewritten in French      |

The boundaries use the `unstable_retry` prop, added in Next.js 16.2. It re-fetches
and re-renders the segment, unlike `reset`, which only clears the error state.

## Left open

| Item                                                          | Reason                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| CSV export has no failure UI                                  | The export is API only so far. The failure state belongs with the export UI.    |
| The point seeding fetch in patrol-controls.tsx fails silently | Intentional. The route redraws from live GPS, so a failed seed is invisible.    |
| src/app/users/page copy.tsx                                   | Dead file. Not routable, since the name is not page.tsx, but still in the repo. |
