import { COLORS, clamp, sendDiscord } from "../discord.mjs";
import { mention } from "../config.mjs";

function prEmbed(pr, repository, color, extraFields = []) {
  return {
    title: `#${pr.number} ${clamp(pr.title, 200)}`,
    url: pr.html_url,
    color,
    author: pr.user ? { name: pr.user.login, icon_url: pr.user.avatar_url } : undefined,
    fields: [
      { name: "Branch", value: `\`${pr.head?.ref}\` → \`${pr.base?.ref}\``, inline: true },
      { name: "Repo", value: repository.full_name, inline: true },
      ...extraFields,
    ],
    timestamp: new Date().toISOString(),
  };
}

const size = (pr) =>
  `+${pr.additions ?? "?"} / -${pr.deletions ?? "?"} across ${pr.changed_files ?? "?"} files`;

/** Someone was put on the hook for a review. */
async function onReviewRequested(payload) {
  const { pull_request: pr, repository } = payload;
  const reviewer = payload.requested_reviewer?.login;
  const team = payload.requested_team?.name;
  const author = pr.user?.login ?? "someone";

  await sendDiscord({
    review: true,
    content: `${reviewer ? mention(reviewer) : `**@${team}**`} — code review requested by ${mention(author)} on #${pr.number}.`,
    pingLogins: reviewer ? [reviewer] : [],
    embed: prEmbed(pr, repository, COLORS.review, [
      { name: "Size", value: size(pr), inline: true },
      { name: "Reviewer", value: reviewer ? mention(reviewer) : `team @${team}`, inline: true },
    ]),
  });
}

/** Merged, not merely closed — an abandoned PR is not worth a celebration. */
async function onClosed(payload) {
  const { pull_request: pr, repository } = payload;
  if (!pr.merged) return;

  const author = pr.user?.login;
  const merger = payload.sender?.login;
  const closes = (pr.body ?? "").match(/(?:close[sd]?|fixe?[sd]?|resolve[sd]?)\s+#(\d+)/gi) ?? [];

  await sendDiscord({
    content: `${mention(author)} — your PR #${pr.number} was merged into \`${pr.base?.ref}\` by ${mention(merger)}. 🎉`,
    pingLogins: [...new Set([author, merger].filter(Boolean))],
    embed: prEmbed(pr, repository, COLORS.merged, [
      ...(closes.length ? [{ name: "Closes", value: closes.join(", ") }] : []),
      { name: "Merged", value: size(pr), inline: true },
    ]),
  });
}

export async function handlePullRequest(payload) {
  switch (payload.action) {
    case "review_requested":
      return onReviewRequested(payload);
    case "closed":
      return onClosed(payload);
    default:
      return;
  }
}

/** A submitted review is news for the PR author, not the reviewer. */
export async function handlePullRequestReview(payload) {
  if (payload.action !== "submitted") return;

  const { review, pull_request: pr, repository } = payload;
  const author = pr.user?.login;
  const reviewer = review.user?.login;

  const line = {
    approved: {
      text: `${mention(author)} — ${mention(reviewer)} approved #${pr.number}. Good to merge.`,
      color: COLORS.unblocked,
    },
    changes_requested: {
      text: `${mention(author)} — ${mention(reviewer)} requested changes on #${pr.number}.`,
      color: COLORS.review,
    },
  }[String(review.state ?? "").toLowerCase()];

  if (!line) return; // plain comments would just be noise

  await sendDiscord({
    review: true,
    content: line.text,
    pingLogins: [author],
    embed: prEmbed(pr, repository, line.color, [
      { name: "Review", value: clamp(review.body, 500) || "_No comment left._" },
    ]),
  });
}
