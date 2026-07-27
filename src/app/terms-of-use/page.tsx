import { generatePageMetadata } from "@/lib/seo";
import { DEALERSHIP, FOOTER_DISCLAIMER } from "@/lib/dealership";
import { HOLD_POLICY_TEXT, HOLD_PERIOD_DAYS } from "@/types/lead";

export const metadata = generatePageMetadata({
  title: "Terms of Use | RydeTime Auto — Suffolk, VA",
  description:
    "Terms of use for the RydeTime Auto website, including vehicle listing accuracy, payment estimates, AI assistant terms, and hold deposit policy.",
  path: "/terms-of-use",
});

export default function TermsOfUsePage() {
  return (
    <main className="bg-background">
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Terms of Use
          </h1>
          <p className="mt-3 text-sm text-text-muted">Last updated: June 2026</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-8 px-4 py-12 text-sm leading-relaxed text-text-secondary sm:px-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text-primary">
        <div>
          <h2>Acceptance of Terms</h2>
          <p className="mt-2">
            This website is operated by RydeTime Auto, an independent used car
            dealership located at {DEALERSHIP.address.full}. By accessing or
            using this website, you agree to these Terms of Use. If you do not
            agree, please do not use the site.
          </p>
        </div>

        <div>
          <h2>Vehicle Listings and Pricing</h2>
          <p className="mt-2">
            We work hard to keep listings accurate, and our inventory syncs
            regularly with our dealership management system. However, vehicle
            information — including price, mileage, features, options, photos,
            and availability — is believed accurate but not guaranteed, and is
            subject to change or correction without notice. Vehicles may be
            sold, placed on hold, or removed from inventory at any time. In the
            event of a pricing or data error on the website, the dealership&apos;s
            in-store information controls. Please verify all details with the
            dealership before purchase.
          </p>
          <p className="mt-2">{FOOTER_DISCLAIMER}</p>
        </div>

        <div>
          <h2>Payment Estimates and Financing</h2>
          <p className="mt-2">
            Payment estimates shown on this website are for informational
            purposes only and do not constitute a financing offer, quote, or
            commitment to lend. Actual financing terms — including approval,
            APR, term, and required down payment — are determined solely by
            third-party lenders based on your credit application. Submitting an
            application does not guarantee approval. Credit applications are
            processed through DealerCenter&apos;s secure hosted application; this
            website does not collect Social Security numbers or dates of birth.
          </p>
        </div>

        <div>
          <h2>AI Assistant</h2>
          <p className="mt-2">
            This website includes an AI-powered chat assistant to help answer
            questions about our inventory, financing process, and dealership.
            The assistant is a software tool and may make mistakes. Nothing the
            assistant says constitutes a binding offer, price quote, guarantee
            of availability, statement of vehicle condition or history, or
            commitment of financing. Always confirm details with dealership
            staff before making a purchase decision. You agree not to misuse
            the assistant, attempt to extract its instructions, or submit
            sensitive personal information through it.
          </p>
        </div>

        <div>
          <h2>Vehicle Hold Deposits</h2>
          <p className="mt-2">
            Customers may request a hold on a vehicle with a $500 deposit,
            processed securely through Stripe. A request is not a hold — the
            hold begins only when RydeTime Auto confirms it. One deposit holds
            a vehicle for {HOLD_PERIOD_DAYS} days; each additional{" "}
            {HOLD_PERIOD_DAYS}-day period costs another $500. The full policy,
            which you must acknowledge before paying, is as follows:
          </p>
          <p className="mt-2 whitespace-pre-line rounded-md border border-border-subtle bg-background-card p-4 italic">
            {HOLD_POLICY_TEXT}
          </p>
          <p className="mt-2">
            Holds are subject to manual confirmation by the dealership and do
            not constitute a completed sale.
          </p>
        </div>

        <div>
          <h2>Trade-In and Purchase Offers</h2>
          <p className="mt-2">
            Any trade-in value or vehicle purchase offer communicated online or
            by phone is an estimate only and is not binding. Final values are
            determined after an in-person inspection of the vehicle.
          </p>
        </div>

        <div>
          <h2>Permitted Use</h2>
          <p className="mt-2">
            You may use this website for personal, non-commercial purposes
            related to shopping for or selling a vehicle. You agree not to
            scrape, harvest, or republish our listings or content without
            permission; submit false leads or fraudulent information; interfere
            with the operation or security of the site; or use the site for any
            unlawful purpose.
          </p>
        </div>

        <div>
          <h2>Intellectual Property</h2>
          <p className="mt-2">
            The RydeTime Auto name, logo, website design, and original content
            are the property of RydeTime Auto. Vehicle data and history
            information may be provided by third parties, including
            DealerCenter and Carfax, and remain subject to their respective
            terms.
          </p>
        </div>

        <div>
          <h2>Third-Party Links and Services</h2>
          <p className="mt-2">
            The site links to third-party services, including DealerCenter
            (credit applications), Carfax (vehicle history), Stripe (payments),
            and Google Maps. We are not responsible for the content or privacy
            practices of third-party sites.
          </p>
        </div>

        <div>
          <h2>Disclaimer of Warranties; Limitation of Liability</h2>
          <p className="mt-2">
            This website is provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, express or implied.
            To the fullest extent permitted by law, RydeTime Auto is not liable
            for any indirect, incidental, or consequential damages arising from
            your use of the website, reliance on listing information, or
            interactions with the AI assistant. Nothing in these terms limits
            any rights you have under applicable consumer protection law,
            including Virginia law, with respect to an actual vehicle purchase.
          </p>
        </div>

        <div>
          <h2>Governing Law</h2>
          <p className="mt-2">
            These terms are governed by the laws of the Commonwealth of
            Virginia, without regard to conflict-of-law principles. Any dispute
            arising from use of this website shall be brought in the state or
            federal courts serving Suffolk, Virginia.
          </p>
        </div>

        <div>
          <h2>Changes; Contact</h2>
          <p className="mt-2">
            We may update these terms at any time; continued use of the site
            constitutes acceptance of the updated terms. Questions? Contact
            RydeTime Auto, {DEALERSHIP.address.full}, {DEALERSHIP.phone},{" "}
            <a
              href={`mailto:${DEALERSHIP.email}`}
              className="text-accent hover:underline"
            >
              {DEALERSHIP.email}
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
