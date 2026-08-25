# Discord notification bot

Posts GitHub activity to Discord. Runs as a GitHub Actions workflow — there is no
server, no hosting, and no npm dependencies.

| What happens on GitHub | What lands in Discord |
| --- | --- |
| An issue's last blocker closes | 🟢 Pings the assignees: "#43 is unblocked, you can start on it" |
| Someone is assigned an unblocked issue | 🔵 Pings them: "ready to work" |
| Someone is assigned a *blocked* issue | ⚪ "blocked, nothing to do yet — I'll ping you when it clears" |
| A review is requested | 🟡 Pings the reviewer, with the diff size |
| A review is approved / changes requested | Pings the PR author |
| A PR is merged | 🟣 Pings the author, lists the issues it closes |

## How "blocked" is detected

Three sources, unioned:

1. **GitHub's native "Blocked by" field** — what this repo already uses. Resolves
   instantly with no lag.
2. **Text in the issue body**: `Blocked by #12`, `blocked-by: #12, #13 and #14`,
   `Depends on other-org/api#99`, or a checklist under a `### Blocked by` heading.
   A casual `see also #99` elsewhere is *not* treated as a blocker.
3. **A label** named in `BLOCKED_LABELS` (default `blocked`).

An issue is unblocked once every linked blocker is closed and no blocking label
remains.

## Files

```
.github/workflows/discord-notify.yml   the workflow — triggers and secrets
.github/discord-bot/
  notify.js          entry point; reads the event Actions hands it
  config.js          secrets, user map, mention rendering
  github.js          GitHub API over plain fetch (no dependencies)
  blocking.js        blocker parsing and block-state resolution
  discord.js         webhook sender, embed colours, mention safety
  handlers/
    issues.js        assigned / closed / unlabeled / edited
    pull_request.js  review requested / merged / review submitted
```

## Configuration

Set these under **Settings → Secrets and variables → Actions**:

| Secret | Required | Purpose |
| --- | --- | --- |
| `DISCORD_WEBHOOK_URL` | yes | Channel webhook the messages go to |
| `DISCORD_USER_MAP` | recommended | JSON of GitHub login → Discord user id, so people are actually pinged |
| `DISCORD_REVIEW_WEBHOOK_URL` | no | Send review pings to a separate channel |

`GITHUB_TOKEN` is provided by Actions automatically — nothing to create.

`DISCORD_USER_MAP` looks like:

```json
{ "anis022": "852321692952952852", "marccsaada": "1412198960109719572" }
```

Anyone not in the map still appears in the message as `**@their-login**` — they
just don't get a notification. Keeping the map in a secret rather than a committed
file keeps teammates' Discord ids out of a public repo.

## Adding a teammate

Edit the `DISCORD_USER_MAP` secret and add one line. No code change, no deploy.
To get someone's id: Discord → User Settings → Advanced → Developer Mode on, then
right-click their name → Copy User ID.

## Testing changes

From the repo root:

```bash
npm test          # parser unit checks + all nine notification scenarios
npm run audit hack4impact/canopee-project   # what is blocked vs ready right now
```

`npm run test:local` invokes `notify.js` through the same
`GITHUB_EVENT_NAME` / `GITHUB_EVENT_PATH` contract Actions uses, against a fake
Discord endpoint. No credentials, nothing posted anywhere real.

## Known limits

- **Simultaneous unblocks.** If two blockers on the same issue close within seconds
  of each other, both workflow runs can see the issue as clear and post twice. The
  `concurrency` group in the workflow makes this rare; it is not impossible.
- **Text-linked blockers lag.** Blockers written as body prose are found through
  GitHub's search index, which trails writes by a minute or two. The native
  "Blocked by" field has no such delay — prefer it.
- **Fork PRs.** The workflow uses `pull_request_target` so PRs from forks still get
  notifications; it never checks out PR code, only the base branch.
- **A failed notification never fails your build.** `notify.js` catches its own
  errors and exits 0, so a Discord outage cannot turn the repo's checks red.
