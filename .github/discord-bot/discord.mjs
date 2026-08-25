import { config, mentionIds } from "./config.mjs";

export const COLORS = {
  unblocked: 0x2ea043, // green — go
  ready: 0x1f6feb, // blue — assigned and actionable
  review: 0xd29922, // amber — needs a human
  merged: 0x8957e5, // purple — GitHub's merge colour
  blocked: 0x8b949e, // grey — informational
};

/**
 * Post one message to a Discord channel webhook.
 *
 * `pingLogins` are GitHub logins; only their mapped Discord ids end up in
 * allowed_mentions, so an @everyone typed into an issue title stays inert.
 */
export async function sendDiscord({ content, embed, pingLogins = [], review = false }) {
  const url = review ? config.discordReviewWebhookUrl : config.discordWebhookUrl;
  if (!url) return;

  const body = {
    content,
    embeds: embed ? [embed] : undefined,
    allowed_mentions: { parse: [], users: mentionIds(pingLogins) },
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      const retry = Number(res.headers.get("retry-after") || 1);
      console.warn(`[discord] rate limited, waiting ${retry}s`);
      await new Promise((r) => setTimeout(r, retry * 1000 + 250));
      continue;
    }

    if (!res.ok) {
      console.error(`::error::Discord returned ${res.status}: ${await res.text()}`);
      return;
    }

    console.log(`[discord] sent: ${content.slice(0, 90)}`);
    return;
  }
  console.error("::error::Discord kept rate limiting; message dropped.");
}

export function clamp(text, max = 300) {
  const s = String(text ?? "").trim();
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}
