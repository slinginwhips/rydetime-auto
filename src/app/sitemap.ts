import type { MetadataRoute } from "next";
import { DEALERSHIP } from "@/lib/dealership";
import { getAllActiveVehicles } from "@/lib/vehicles";

const STATIC_ROUTES = [
  "",
  "/inventory",
  "/finance",
  "/credit-application",
  "/trade-in",
  "/sell-us-your-car",
  "/about",
  "/contact",
  "/faq",
  "/reviews",
  "/fresh-arrivals",
  "/under-15000",
  "/under-20000",
  "/privacy",
  "/terms",
  "/accessibility",
];

const LOCAL_SEO_SLUGS = [
  "used-cars-suffolk-va",
  "used-cars-virginia-beach-va",
  "used-cars-chesapeake-va",
  "used-cars-norfolk-va",
  "used-cars-portsmouth-va",
  "used-car-financing-suffolk-va",
  "bad-credit-car-loans-suffolk-va",
  "first-time-buyer-car-loans-va",
  "reliable-used-cars-suffolk-va",
  "used-cars-under-15000-suffolk-va",
  "used-cars-under-20000-suffolk-va",
  "used-suvs-suffolk-va",
  "used-trucks-suffolk-va",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = DEALERSHIP.siteUrl;
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/inventory" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/inventory" ? 0.9 : 0.7,
  }));

  const localEntries: MetadataRoute.Sitemap = LOCAL_SEO_SLUGS.map((slug) => ({
    url: `${base}/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  let vehicleEntries: MetadataRoute.Sitemap = [];
  try {
    const vehicles = await getAllActiveVehicles();
    vehicleEntries = vehicles.map((v) => ({
      url: `${base}/inventory/${v.slug}`,
      lastModified: v.updated_at ? new Date(v.updated_at) : now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    vehicleEntries = [];
  }

  return [...staticEntries, ...localEntries, ...vehicleEntries];
}
