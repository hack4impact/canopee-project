import { config } from "./config.js";

const API = "https://api.github.com";

/**
 * Minimal GitHub client over fetch — deliberately dependency-free so the workflow
 * needs no `npm install` step and cannot break on a transitive update.
 */
async function gh(path, { raw = false } = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "canopee-discord-bot",
      ...(config.githubToken ? { authorization: `Bearer ${config.githubToken}` } : {}),
    },
  });

  if (res.status === 404 || res.status === 403 || res.status === 410) {
    // Expected for issues we cannot see and for endpoints not enabled on this repo.
    return raw ? { ok: false, status: res.status, data: null } : null;
  }

  if (!res.ok) {
    console.warn(`[github] ${res.status} ${res.statusText} on ${path}`);
    return raw ? { ok: false, status: res.status, data: null } : null;
  }

  const data = await res.json();
  return raw ? { ok: true, status: res.status, data } : data;
}

export async function getIssue(owner, repo, number) {
  return gh(`/repos/${owner}/${repo}/issues/${number}`);
}

/** Issues that must close before this one can start (GitHub's native dependencies). */
export async function nativeBlockedBy(owner, repo, number) {
  const data = await gh(`/repos/${owner}/${repo}/issues/${number}/dependencies/blocked_by?per_page=100`);
  return Array.isArray(data) ? data : [];
}

/** The inverse: issues waiting on this one. */
export async function nativeBlocking(owner, repo, number) {
  const data = await gh(`/repos/${owner}/${repo}/issues/${number}/dependencies/blocking?per_page=100`);
  return Array.isArray(data) ? data : [];
}

/** Open issues whose body names this one as a blocker in plain text. */
export async function searchTextDependents(owner, repo, number) {
  const found = new Map();
  for (const phrase of ["blocked by", "depends on"]) {
    const q = encodeURIComponent(
      `repo:${owner}/${repo} is:issue is:open in:body "${phrase} #${number}"`
    );
    const data = await gh(`/search/issues?q=${q}&per_page=50`);
    for (const item of data?.items ?? []) {
      if (item.pull_request) continue;
      found.set(item.number, item);
    }
  }
  return [...found.values()];
}

export async function listOpenIssues(owner, repo) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const data = await gh(`/repos/${owner}/${repo}/issues?state=open&per_page=100&page=${page}`);
    if (!Array.isArray(data) || data.length === 0) break;
    out.push(...data.filter((i) => !i.pull_request));
    if (data.length < 100) break;
  }
  return out;
}
