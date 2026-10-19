import { generatePageMetadata } from "@/lib/seo";
import { DEALERSHIP } from "@/lib/dealership";

export const metadata = {
  ...generatePageMetadata({
    title: "Dealertrack Helper Privacy | RydeTime Auto",
    description:
      "What the RydeTime Dealertrack Helper browser extension does with credit application information.",
    path: "/dealertrack-helper-privacy",
  }),
  robots: { index: false, follow: false },
};

export default function DealertrackHelperPrivacyPage() {
  return (
    <main className="bg-background">
      <section className="mx-auto max-w-3xl space-y-6 px-4 py-14 text-sm leading-relaxed text-text-secondary sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          RydeTime Dealertrack Helper — Privacy
        </h1>
        <p>
          The RydeTime Dealertrack Helper is a private browser extension used by
          the staff of {DEALERSHIP.name} to copy a credit application that is
          already in our dealer management system into the Dealertrack form on
          the same computer, so it does not have to be retyped.
        </p>
        <h2 className="text-lg font-bold text-text-primary">What it handles</h2>
        <p>
          When a staff member clicks &quot;Send to Dealertrack&quot; in our
          system, the helper receives that one application (name, contact
          details, address, employment, and vehicle information) and holds it in
          the browser&apos;s temporary memory until the browser closes or the
          staff member clears it. A Social Security number is included only if
          the staff member explicitly asks for it.
        </p>
        <h2 className="text-lg font-bold text-text-primary">What it does not do</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>It does not send any information to us, to the developer, or to any third party.</li>
          <li>It does not sell, share, or use information for advertising or any other purpose.</li>
          <li>It does not read other pages, track browsing, or run anywhere except our dealer system and Dealertrack.</li>
          <li>It never submits an application. A person reviews and submits it.</li>
          <li>It does not store customer information on disk.</li>
        </ul>
        <h2 className="text-lg font-bold text-text-primary">Contact</h2>
        <p>
          Questions: {DEALERSHIP.email} · {DEALERSHIP.phone} ·{" "}
          {DEALERSHIP.address.full}
        </p>
      </section>
    </main>
  );
}
