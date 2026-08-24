import type { MetadataRoute } from "next";
import { getInProgressProcedures, getCompletedProcedures } from "@/lib/europarl";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

const STATIC_PATHS = ["", "/learn", "/meps", "/national", "/leaderboard"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));

  // Procedure pages carry the long-tail search value: people look for a
  // specific file by reference or title, so every one we know about is listed.
  const [inProgress, completed] = await Promise.all([
    getInProgressProcedures(),
    getCompletedProcedures(),
  ]);

  const references = new Set(
    [...inProgress.data, ...completed.data]
      .map((procedure) => procedure.reference)
      .filter(Boolean)
  );

  const procedureEntries: MetadataRoute.Sitemap = [...references].map(
    (reference) => ({
      url: `${base}/procedure/${encodeURIComponent(reference)}`,
      changeFrequency: "weekly",
      priority: 0.8,
    })
  );

  return [...staticEntries, ...procedureEntries];
}
