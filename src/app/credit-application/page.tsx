import { generatePageMetadata } from "@/lib/seo";
import { DEALERSHIP } from "@/lib/dealership";
import { getVehicleById } from "@/lib/vehicles";
import CreditApplicationForm from "@/components/CreditApplicationForm";

export const metadata = generatePageMetadata({
  title: "Secure Credit Application | RydeTime Auto — Suffolk, VA",
  description:
    "Apply for used car financing at RydeTime Auto. Fill out and sign your secure credit application online in minutes. First-time buyers and rebuilding credit welcome.",
  path: "/credit-application",
});

export const dynamic = "force-dynamic";

export default async function CreditApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string }>;
}) {
  const { vehicle: vehicleId } = await searchParams;
  const vehicle = vehicleId ? await getVehicleById(vehicleId) : null;
  const vehicleLabel = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${
        vehicle.trim ? ` ${vehicle.trim}` : ""
      } · Stock ${vehicle.stock_number}`
    : undefined;

  return (
    <main className="bg-background">
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 md:py-16">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            Secure Credit Application
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Get Approved — On Your Terms.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
            Fill out and sign your application right here in a few minutes — day
            or night. It goes straight to our financing office over an encrypted
            connection, and we&apos;ll come back to you with real options.
            Applying doesn&apos;t obligate you to anything.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* The application */}
          <div className="lg:col-span-3">
            <CreditApplicationForm vehicleId={vehicleId} vehicleLabel={vehicleLabel} />
          </div>

          {/* Side info */}
          <aside className="lg:col-span-2">
            <div className="lg:sticky lg:top-6 space-y-4">
              <div className="rounded-lg border border-border-subtle bg-background-card p-6">
                <h2 className="text-base font-bold text-text-primary">First-Time Buyer?</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  No credit history isn&apos;t the same as bad credit. Several of
                  our lenders have programs built for first-time buyers — steady
                  income and a reasonable down payment are usually the keys.
                </p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-background-card p-6">
                <h2 className="text-base font-bold text-text-primary">Rebuilding Credit?</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  Past credit problems don&apos;t automatically disqualify you. We
                  work with lenders who look at your whole picture — income,
                  stability, and down payment — not just a score. We&apos;ll be
                  honest with you about what&apos;s realistic.
                </p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface p-6">
                <h2 className="text-base font-bold text-text-primary">Rather talk to a person?</h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Call or text us at{" "}
                  <a href={DEALERSHIP.phoneHref} className="font-semibold text-accent hover:underline">
                    {DEALERSHIP.phone}
                  </a>{" "}
                  and we&apos;ll walk you through it.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-text-muted">
          Submitting a credit application does not guarantee approval. Financing
          is subject to lender credit approval, and final terms — including APR,
          term length, and required down payment — are determined by the lender
          based on your application. RydeTime Auto transmits your application
          securely to its lending partners and does not retain your full Social
          Security number on this website.
        </p>
      </section>
    </main>
  );
}
