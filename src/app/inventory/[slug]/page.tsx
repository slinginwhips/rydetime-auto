import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import VehicleGallery from "@/components/VehicleGallery";
import VehiclePrepBadges from "@/components/VehiclePrepBadges";
import PaymentEstimator from "@/components/PaymentEstimator";
import RyansTake from "@/components/RyansTake";
import SimilarVehicles from "@/components/SimilarVehicles";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import StickySentinel from "@/components/StickySentinel";
import Reveal from "@/components/Reveal";
import VDPActions from "@/components/VDPActions";
import { getVehicleBySlug, getSimilarVehicles } from "@/lib/vehicles";
import { estimateMonthlyPayment } from "@/types/vehicle";
import {
  generateVehicleMetadata,
  vehicleTitle,
  vehicleSchema,
  breadcrumbSchema,
} from "@/lib/seo";
import {
  HOW_WE_PREPARE_COPY,
  PAYMENT_DISCLAIMER,
  VEHICLE_INFO_DISCLAIMER,
} from "@/lib/dealership";

export const dynamic = "force-dynamic";

interface VDPProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: VDPProps): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) return { title: "Vehicle Not Found" };
  return generateVehicleMetadata(vehicle);
}

export default async function VehicleDetailPage({ params }: VDPProps) {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) notFound();

  const title = vehicleTitle(vehicle);
  const similar = await getSimilarVehicles(vehicle, 6);
  const monthly = estimateMonthlyPayment(vehicle.price);

  const specs: { label: string; value: string | null }[] = [
    { label: "Year", value: String(vehicle.year) },
    { label: "Make", value: vehicle.make },
    { label: "Model", value: vehicle.model },
    { label: "Trim", value: vehicle.trim },
    { label: "Mileage", value: `${vehicle.mileage.toLocaleString()} mi` },
    { label: "Body Style", value: vehicle.body_style },
    { label: "Exterior Color", value: vehicle.exterior_color },
    { label: "Interior Color", value: vehicle.interior_color },
    { label: "Transmission", value: vehicle.transmission },
    { label: "Drivetrain", value: vehicle.drivetrain },
    { label: "Fuel Type", value: vehicle.fuel_type },
    { label: "Engine", value: vehicle.engine },
    { label: "Doors", value: vehicle.doors ? String(vehicle.doors) : null },
    { label: "Seats", value: vehicle.seats ? String(vehicle.seats) : null },
    { label: "VIN", value: vehicle.vin },
    { label: "Stock #", value: vehicle.stock_number },
  ];

  // Group features by category
  const featureGroups = new Map<string, string[]>();
  for (const f of vehicle.vehicle_features ?? []) {
    const cat = f.category || "Other Features";
    if (!featureGroups.has(cat)) featureGroups.set(cat, []);
    featureGroups.get(cat)!.push(f.feature_name);
  }

  const description = vehicle.description_ai || vehicle.description_dc;
  const photos = vehicle.vehicle_photos ?? [];
  const badges = vehicle.vehicle_prep_badges ?? [];

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vehicleSchema(vehicle)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Inventory", path: "/inventory" },
              { name: title, path: `/inventory/${vehicle.slug}` },
            ])
          ),
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 md:pb-8 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-text-secondary">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/inventory" className="hover:text-text-secondary">Inventory</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-text-secondary">{title}</li>
          </ol>
        </nav>

        {/* Title (mobile-first, shows above gallery) */}
        <div className="mt-4 lg:hidden">
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="tabular text-3xl font-bold text-text-primary">
              ${vehicle.price.toLocaleString()}
            </span>
            {vehicle.price_reduced && vehicle.original_price && vehicle.original_price > vehicle.price && (
              <span className="tabular text-base text-text-muted line-through">
                ${vehicle.original_price.toLocaleString()}
              </span>
            )}
            <span className="tabular text-sm text-text-secondary">
              Est. ${monthly.toLocaleString()}/mo
            </span>
          </div>
        </div>

        <StickySentinel targetId="vdp-sticky-column" />
        <div className="mt-5 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          {/* ============ Main column ============ */}
          <div className="min-w-0 space-y-10">
            <VehicleGallery photos={photos} alt={title} />

            {/* Video */}
            {vehicle.video_url && (
              <section>
                <h2 className="text-lg font-semibold text-text-primary">Video Walkaround</h2>
                <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-border-subtle bg-background-card">
                  <iframe
                    src={vehicle.video_url}
                    title={`${title} video walkaround`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </section>
            )}

            {/* Specs */}
            <Reveal variant="up" as="section">
              <h2 className="text-lg font-semibold text-text-primary">Specifications</h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {specs
                  .filter((s) => s.value)
                  .map((s) => (
                    <div key={s.label} className="border-b border-border-subtle pb-2">
                      <dt className="text-xs uppercase tracking-wide text-text-muted">{s.label}</dt>
                      <dd className="tabular mt-0.5 break-all text-sm font-medium text-text-primary">
                        {s.value}
                      </dd>
                    </div>
                  ))}
              </dl>
            </Reveal>

            {/* Features */}
            {featureGroups.size > 0 && (
              <Reveal variant="up" delay={60} as="section">
                <h2 className="text-lg font-semibold text-text-primary">Features & Options</h2>
                <div className="mt-4 space-y-5">
                  {[...featureGroups.entries()].map(([category, features]) => (
                    <div key={category}>
                      <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
                        {category}
                      </h3>
                      <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                        {features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                            <svg className="flex-shrink-0 text-accent" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Reveal>
            )}

            {/* Prep badges */}
            {badges.length > 0 && (
              <Reveal variant="up" as="section">
                <h2 className="text-lg font-semibold text-text-primary">
                  What We Did Before Listing It
                </h2>
                <div className="mt-4">
                  <VehiclePrepBadges badges={badges} />
                </div>
              </Reveal>
            )}

            {/* How we prepare (expandable) */}
            <Reveal variant="up">
            <details className="group rounded-lg border border-border-subtle bg-background-card">
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-base font-semibold text-text-primary">
                How We Prepare Our Vehicles
                <svg className="flex-shrink-0 text-text-muted transition-transform group-open:rotate-180" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-text-secondary">
                {HOW_WE_PREPARE_COPY}
              </p>
            </details>
            </Reveal>

            {/* Description */}
            {description && (
              <Reveal variant="up" as="section">
                <h2 className="text-lg font-semibold text-text-primary">About This {vehicle.make} {vehicle.model}</h2>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-text-secondary">
                  {description.split(/\n\n+/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </Reveal>
            )}

            {/* Ryan's Take */}
            {vehicle.ryans_take && (
              <Reveal variant="up">
                <RyansTake text={vehicle.ryans_take} />
              </Reveal>
            )}

            {/* Best fit for */}
            {vehicle.best_fit_for && (
              <Reveal variant="up" as="section" className="rounded-lg border border-border-subtle bg-background-card p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
                  Best Fit For
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-text-primary">{vehicle.best_fit_for}</p>
              </Reveal>
            )}

            {/* What to know */}
            {vehicle.what_to_know && (
              <Reveal variant="up" delay={60} as="section" className="rounded-lg border border-border-subtle bg-background-card p-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
                  What To Know
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-text-primary">{vehicle.what_to_know}</p>
              </Reveal>
            )}

            {/* Similar vehicles */}
            {similar.length > 0 && (
              <Reveal variant="up" as="section">
                <h2 className="text-lg font-semibold text-text-primary">Similar Vehicles</h2>
                <div className="mt-4">
                  <SimilarVehicles vehicles={similar} />
                </div>
              </Reveal>
            )}

            {/* Disclaimers */}
            <div className="space-y-2 border-t border-border-subtle pt-5">
              <p className="text-xs leading-relaxed text-text-muted">{PAYMENT_DISCLAIMER}</p>
              <p className="text-xs leading-relaxed text-text-muted">{VEHICLE_INFO_DISCLAIMER}</p>
            </div>
          </div>

          {/* ============ Right column (sticky) ============ */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div id="vdp-sticky-column" className="sticky-shadow space-y-5 rounded-lg">
              {/* Title + price (desktop) */}
              <div className="hidden lg:block">
                <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="tabular text-4xl font-bold text-text-primary">
                    ${vehicle.price.toLocaleString()}
                  </span>
                  {vehicle.price_reduced && vehicle.original_price && vehicle.original_price > vehicle.price && (
                    <span className="tabular text-lg text-text-muted line-through">
                      ${vehicle.original_price.toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="tabular mt-1 text-sm text-text-secondary">
                  Est. ${monthly.toLocaleString()}/mo · {vehicle.mileage.toLocaleString()} miles ·
                  Stock #{vehicle.stock_number}
                </p>
              </div>

              <PaymentEstimator price={vehicle.price} compact />

              <VDPActions
                vehicle={{
                  id: vehicle.id,
                  label: title,
                  price: vehicle.price,
                  vin: vehicle.vin,
                  carfax_url: vehicle.carfax_url,
                  status: vehicle.status,
                }}
              />
            </div>
          </aside>
        </div>
      </div>

      <StickyMobileCTA vehicleId={vehicle.id} />
    </>
  );
}
