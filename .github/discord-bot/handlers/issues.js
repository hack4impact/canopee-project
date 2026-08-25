import { COLORS, clamp, sendDiscord } from "../discord.js";
import { getIssue } from "../github.js";
import { findDependents, formatBlockerList, getBlockState, parseBlockerRefs } from "../blocking.js";
import { config, mention } from "../config.js";

const assigneeLogins = (issue) => (issue.assignees ?? []).map((u) => u.login).filter(Boolean);

/** The headline feature: an issue that was waiting on something is now workable. */
async function announceUnblocked(owner, repo, issue, { trigger, block }) {
  if (issue.state !== "open") return;

  block ??= await getBlockState(owner, repo, issue);
  if (block.blocked) return;

  const assignees = assigneeLogins(issue);
  const who = assignees.length
    ? assignees.map(mention).join(" ")
    : "**Up for grabs** — nobody is assigned";

  await sendDiscord({
    content: `${who} — issue #${issue.number} is unblocked. You can start on it.`,
    pingLogins: assignees,
    embed: {
      title: `#${issue.number} ${clamp(issue.title, 200)}`,
      url: issue.html_url,
      color: COLORS.unblocked,
      description: trigger ? `Unblocked by ${trigger}.` : "All blockers are resolved.",
      fields: [
        {
          name: "Was blocked by",
          value: block.blockers.length
            ? clamp(formatBlockerList(block.blockers), 800)
            : "a blocking label",
        },
        {
          name: "Assigned to",
          value: assignees.length ? assignees.join(", ") : "nobody",
          inline: true,
        },
        { name: "Repo", value: `${owner}/${repo}`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    },
  });
}

/** Someone got assigned — tell them whether they can actually start. */
async function onAssigned(owner, repo, issue, payload) {
  const target = payload.assignee?.login;
  const block = await getBlockState(owner, repo, issue);

  if (!block.blocked) {
    await sendDiscord({
      content: `${mention(target)} — you're assigned to #${issue.number} and nothing is blocking it. Ready to work.`,
      pingLogins: [target],
      embed: {
        title: `#${issue.number} ${clamp(issue.title, 200)}`,
        url: issue.html_url,
        color: COLORS.ready,
        description: clamp(issue.body, 300) || "_No description._",
        fields: [{ name: "Repo", value: `${owner}/${repo}`, inline: true }],
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  await sendDiscord({
    content: `${mention(target)} — you're assigned to #${issue.number}, but it's blocked. Nothing to do yet; I'll ping you the moment it clears.`,
    pingLogins: [target],
    embed: {
      title: `#${issue.number} ${clamp(issue.title, 200)}`,
      url: issue.html_url,
      color: COLORS.blocked,
      fields: [
        {
          name: "Waiting on",
          value: block.openBlockers.length
            ? clamp(formatBlockerList(block.openBlockers), 800)
            : "a blocking label",
        },
        { name: "Repo", value: `${owner}/${repo}`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    },
  });
}

/** A closed issue can free everything downstream of it. */
async function onClosed(owner, repo, issue) {
  const dependents = await findDependents(owner, repo, issue.number);
  console.log(`[issues] #${issue.number} closed; ${dependents.length} dependent(s) to re-check`);

  for (const dep of dependents) {
    const full = await getIssue(dep.owner, dep.repo, dep.number);
    if (!full || full.state !== "open") continue;
    await announceUnblocked(dep.owner, dep.repo, full, {
      trigger: `[#${issue.number}](${issue.html_url}) closing`,
    });
  }
}

export async function handleIssues(payload) {
  const { action, issue, repository } = payload;
  const owner = repository.owner.login;
  const repo = repository.name;

  switch (action) {
    case "assigned":
      return onAssigned(owner, repo, issue, payload);

    case "closed":
      return onClosed(owner, repo, issue);

    case "unlabeled":
    case "edited": {
      // Blocked-ness can change in place: a `blocked` label removed, or
      // "Blocked by #12" edited out of the body.
      const block = await getBlockState(owner, repo, issue);
      if (block.blocked) return;

      // Only announce when this edit is what removed the block — otherwise an
      // unrelated typo fix on a never-blocked issue would read as good news.
      const removedLabel =
        action === "unlabeled" &&
        config.blockedLabels.includes(String(payload.label?.name ?? "").toLowerCase());
      const removedText =
        action === "edited" &&
        parseBlockerRefs(payload.changes?.body?.from, { owner, repo, number: issue.number })
          .length > 0;

      if (!removedLabel && !removedText) return;

      return announceUnblocked(owner, repo, issue, {
        block,
        trigger: removedLabel
          ? `the \`${payload.label.name}\` label being removed`
          : "its blockers being edited out",
      });
    }

    default:
      return;
  }
}
