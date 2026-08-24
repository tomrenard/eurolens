import type { MetadataRoute } from "next";
import { getInProgressProcedures, getCompletedProcedures } from "@/lib/europarl";
import { getStoredReferences } from "@/lib/store";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

// /me is a private record and is deliberately not listed.
const STATIC_PATHS = ["", "/learn", "/meps", "/national"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));

  // Procedure pages carry the long-tail search value: people look for a
  // specific file by reference or title, so every one we know about is listed.
  // The mirror holds far more than the live API's per-request cap, so prefer it.
  const stored = await getStoredReferences();

  const references = new Set(stored ?? []);

  if (!stored) {
    const [inProgress, completed] = await Promise.all([
      getInProgressProcedures(),
      getCompletedProcedures(),
    ]);

    for (const procedure of [...inProgress.data, ...completed.data]) {
      if (procedure.reference) references.add(procedure.reference);
    }
  }

  const procedureEntries: MetadataRoute.Sitemap = [...references].map(
    (reference) => ({
      url: `${base}/procedure/${encodeURIComponent(reference)}`,
      changeFrequency: "weekly",
      priority: 0.8,
    })
  );

  return [...staticEntries, ...procedureEntries];
}
