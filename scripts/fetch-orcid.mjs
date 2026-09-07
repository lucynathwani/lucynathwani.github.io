// Fetches recent publications from the ORCID public API and writes
// them to publications.json, which the site reads at page-load time.
//
// This runs server-side (inside a GitHub Actions job), not in the
// visitor's browser, because getting an ORCID access token requires
// a client secret that must never be exposed in client-side code.

import { writeFileSync } from "node:fs";

// TODO: replace with your own ORCID iD, e.g. "0000-0002-1825-0097"
const ORCID_ID = process.env.ORCID_ID || "0000-0000-0000-0000";

const CLIENT_ID = process.env.ORCID_CLIENT_ID;
const CLIENT_SECRET = process.env.ORCID_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error(
    "Missing ORCID_CLIENT_ID / ORCID_CLIENT_SECRET environment variables."
  );
}

async function getAccessToken() {
  const res = await fetch("https://orcid.org/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "/read-public",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function getWorks(token) {
  const res = await fetch(`https://pub.orcid.org/v3.0/${ORCID_ID}/works`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Works request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function extractWork(group) {
  const summary = group["work-summary"]?.[0];
  if (!summary) return null;

  const title = summary.title?.title?.value ?? "Untitled";
  const year = summary["publication-date"]?.year?.value
    ? Number(summary["publication-date"].year.value)
    : null;
  const journal = summary["journal-title"]?.value ?? null;

  const doi = summary["external-ids"]?.["external-id"]?.find(
    (id) => id["external-id-type"] === "doi"
  )?.["external-id-value"];

  const url = doi ? `https://doi.org/${doi}` : summary.url?.value ?? null;

  return { title, year, journal, url };
}

const token = await getAccessToken();
const data = await getWorks(token);

const works = (data.group ?? [])
  .map(extractWork)
  .filter(Boolean)
  .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
  .slice(0, 6);

writeFileSync(
  "publications.json",
  JSON.stringify({ updated: new Date().toISOString(), works }, null, 2)
);

console.log(`Wrote ${works.length} publications to publications.json`);
