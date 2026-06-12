import type { Metadata } from "next";
import { DEALERSHIP } from "@/lib/dealership";
import type { Vehicle } from "@/types/vehicle";

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}

export function generatePageMetadata(input: PageMetaInput): Metadata {
  const url = `${DEALERSHIP.siteUrl}${input.path}`;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: input.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: DEALERSHIP.name,
      type: "website",
      locale: "en_US",
      images: input.image ? [{ url: input.image }] : undefined,
    },
    twitter: {
      card: input.image ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      images: input.image ? [input.image] : undefined,
    },
  };
}

export function vehicleTitle(v: Pick<Vehicle, "year" | "make" | "model" | "trim">): string {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
}

export function generateVehicleMetadata(vehicle: Vehicle): Metadata {
  const name = vehicleTitle(vehicle);
  const title = `${name} | ${DEALERSHIP.name} — Suffolk VA`;
  const description =
    vehicle.meta_description ||
    `${name} with ${vehicle.mileage.toLocaleString()} miles for $${vehicle.price.toLocaleString()} at ${DEALERSHIP.name} in Suffolk, VA. Serving Hampton Roads.`;
  const image = vehicle.vehicle_photos?.find((p) => p.is_primary)?.url || vehicle.vehicle_photos?.[0]?.url;
  return generatePageMetadata({
    title,
    description,
    path: `/inventory/${vehicle.slug}`,
    image,
  });
}

/* ---------- JSON-LD schema builders ---------- */

export function autoDealerSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: DEALERSHIP.name,
    url: DEALERSHIP.siteUrl,
    telephone: DEALERSHIP.phone,
    email: DEALERSHIP.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: DEALERSHIP.address.street,
      addressLocality: DEALERSHIP.address.city,
      addressRegion: DEALERSHIP.address.state,
      postalCode: DEALERSHIP.address.zip,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: DEALERSHIP.geo.latitude,
      longitude: DEALERSHIP.geo.longitude,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "10:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "10:00",
        closes: "17:00",
      },
    ],
    areaServed: DEALERSHIP.serviceAreas.map((a) => ({ "@type": "City", name: a })),
  };
}

export function vehicleSchema(vehicle: Vehicle) {
  const name = vehicleTitle(vehicle);
  return {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name,
    vehicleIdentificationNumber: vehicle.vin,
    brand: { "@type": "Brand", name: vehicle.make },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    bodyType: vehicle.body_style || undefined,
    color: vehicle.exterior_color || undefined,
    vehicleInteriorColor: vehicle.interior_color || undefined,
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: vehicle.mileage,
      unitCode: "SMI",
    },
    vehicleTransmission: vehicle.transmission || undefined,
    driveWheelConfiguration: vehicle.drivetrain || undefined,
    fuelType: vehicle.fuel_type || undefined,
    vehicleEngine: vehicle.engine ? { "@type": "EngineSpecification", name: vehicle.engine } : undefined,
    image: vehicle.vehicle_photos?.map((p) => p.url),
    offers: {
      "@type": "Offer",
      price: vehicle.price,
      priceCurrency: "USD",
      availability:
        vehicle.status === "sold"
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
      url: `${DEALERSHIP.siteUrl}/inventory/${vehicle.slug}`,
      seller: { "@type": "AutoDealer", name: DEALERSHIP.name },
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${DEALERSHIP.siteUrl}${item.path}`,
    })),
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
