import type { MetadataRoute } from "next";
import { repository } from "@/data/repository";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const beys = await repository.listBeyblades();
  const pages = ["", "/battle", "/database", "/compare", "/history", "/about"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
  return [
    ...pages,
    ...beys.map((b) => ({ url: `${SITE_URL}/database/${b.id}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
