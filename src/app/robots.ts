import type { MetadataRoute } from "next";
import { DEALERSHIP } from "@/lib/dealership";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${DEALERSHIP.siteUrl}/sitemap.xml`,
  };
}
