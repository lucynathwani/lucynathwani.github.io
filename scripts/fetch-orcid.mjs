// Fetches recent publications from the ORCID public API and writes them
// to publications.json, which the site reads at page-load time.
//
// Runs in a scheduled GitHub Actions job (see .github/workflows/
// update-publications.yml). The public API needs no auth for public
// records, so there are no secrets to configure.

import { writeFileSync } from "node:fs";

const ORCID_ID = process.env.ORCID_ID || "0009-0001-5002-3812";
const MAX_WORKS = 6;

async function getWorks() {
  const res = await fetch(`https://pub.orcid.org/v3.0/${ORCID_ID}/works`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Works request failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function extractWork(group) {
  // A group bundles the same work from multiple sources (e.g. a journal
  // article and its arXiv preprint). work-summary[0] is ORCID's preferred one.
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

const data = await getWorks();

const works = (data.group ?? [])
  .map(extractWork)
  .filter(Boolean)
  .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
  .slice(0, MAX_WORKS);

writeFileSync(
  "publications.json",
  JSON.stringify({ updated: new Date().toISOString(), works }, null, 2) + "\n"
);

console.log(`Wrote ${works.length} publications to publications.json`);
