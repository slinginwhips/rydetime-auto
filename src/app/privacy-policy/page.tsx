import { generatePageMetadata } from "@/lib/seo";
import { DEALERSHIP } from "@/lib/dealership";

export const metadata = generatePageMetadata({
  title: "Privacy Policy | RydeTime Auto — Suffolk, VA",
  description:
    "How RydeTime Auto collects, uses, and protects your personal information across our website, lead forms, AI chat assistant, and deposit payments.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-background">
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            Last updated: June 2026
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-8 px-4 py-12 text-sm leading-relaxed text-text-secondary sm:px-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text-primary">
        <div>
          <h2>Who We Are</h2>
          <p className="mt-2">
            RydeTime Auto (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
            is an independent used car dealership located at{" "}
            {DEALERSHIP.address.full}. This policy explains what information we
            collect through our website, how we use it, and the choices you
            have. By using this website, you agree to the practices described
            here.
          </p>
        </div>

        <div>
          <h2>Information We Collect</h2>
          <p className="mt-2">
            <strong className="text-text-primary">Information you provide.</strong>{" "}
            When you submit a contact form, financing inquiry, trade-in or
            sell-your-car form, test drive request, or vehicle hold request, we
            collect the information you enter — typically your name, phone
            number, email address, message, and details about your vehicle or
            the vehicle you&apos;re interested in (such as VIN, year, make,
            model, mileage, condition, and loan payoff estimates). Trade-in
            forms may also include photos of your vehicle that you choose to
            upload.
          </p>
          <p className="mt-2">
            <strong className="text-text-primary">AI chat assistant.</strong>{" "}
            Our website includes an AI-powered chat assistant. Messages you
            send in the chat are processed by a third-party AI provider
            (Anthropic) to generate responses, and chat transcripts are stored
            so our team can follow up on your questions. Please do not enter
            Social Security numbers, dates of birth, financial account numbers,
            or other sensitive personal information into the chat — the
            assistant does not need it and we do not want it.
          </p>
          <p className="mt-2">
            <strong className="text-text-primary">Payments.</strong> Vehicle
            hold deposits are processed by Stripe, a third-party payment
            processor. Your card number is transmitted directly to Stripe and
            is never stored on our servers. We retain only the transaction
            reference, deposit amount, and status. Stripe&apos;s handling of
            your information is governed by Stripe&apos;s own privacy policy.
          </p>
          <p className="mt-2">
            <strong className="text-text-primary">Credit applications.</strong>{" "}
            Credit applications are completed through DealerCenter&apos;s
            secure hosted application. Sensitive application data — including
            Social Security numbers and dates of birth — is collected and
            processed by DealerCenter, not by this website. We never collect or
            store that data here.
          </p>
          <p className="mt-2">
            <strong className="text-text-primary">Automatic information.</strong>{" "}
            Like most websites, we and our service providers may automatically
            collect technical information such as IP address, browser type,
            device type, pages visited, and referring URLs, including through
            cookies and similar technologies used for analytics and
            advertising measurement.
          </p>
        </div>

        <div>
          <h2>How We Use Your Information</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To respond to your inquiries and follow up on leads you submit</li>
            <li>To process trade-in appraisals, test drive appointments, and vehicle holds</li>
            <li>To connect you with financing options through our lender network and DealerCenter</li>
            <li>To operate and improve the website, the AI assistant, and our inventory listings</li>
            <li>To send you communications you have requested, such as updates on a vehicle</li>
            <li>To comply with legal obligations that apply to motor vehicle dealers</li>
          </ul>
          <p className="mt-2">We do not sell your personal information.</p>
        </div>

        <div>
          <h2>How We Share Information</h2>
          <p className="mt-2">
            We share information only as needed to run the business: with
            DealerCenter (our dealership management and lead system), with
            lenders when you pursue financing, with Stripe for deposit
            payments, with Anthropic for AI chat processing, with our website
            hosting and database providers (Vercel and Supabase), and with
            analytics providers. We may also disclose information when required
            by law, to enforce our terms, or to protect the rights and safety
            of our customers and business.
          </p>
        </div>

        <div>
          <h2>Text Messages and Calls</h2>
          <p className="mt-2">
            If you provide your phone number, you consent to us contacting you
            by phone or text message about your inquiry. Message and data rates
            may apply. You can opt out of texts at any time by replying STOP or
            by letting us know.
          </p>
        </div>

        <div>
          <h2>Data Retention and Security</h2>
          <p className="mt-2">
            We retain lead, appointment, and transaction records for as long as
            reasonably necessary for business and legal purposes. We use
            reputable hosting providers with industry-standard security
            controls, and access to customer data is limited to dealership
            staff. No method of transmission or storage is 100% secure, so we
            cannot guarantee absolute security.
          </p>
        </div>

        <div>
          <h2>Your Choices and Rights</h2>
          <p className="mt-2">
            Depending on your state of residence, you may have rights to
            access, correct, or delete personal information we hold about you
            — Virginia residents have such rights under the Virginia Consumer
            Data Protection Act. To make a request, contact us at{" "}
            <a
              href={`mailto:${DEALERSHIP.email}`}
              className="text-accent hover:underline"
            >
              {DEALERSHIP.email}
            </a>{" "}
            or call {DEALERSHIP.phone}. We will verify your identity before
            fulfilling a request and respond within the time required by
            applicable law.
          </p>
        </div>

        <div>
          <h2>Children</h2>
          <p className="mt-2">
            This website is not directed to children under 13, and we do not
            knowingly collect personal information from them. If you believe a
            child has provided us information, contact us and we will delete
            it.
          </p>
        </div>

        <div>
          <h2>Changes to This Policy</h2>
          <p className="mt-2">
            We may update this policy from time to time. The &quot;last
            updated&quot; date above reflects the most recent revision.
            Continued use of the website after changes means you accept the
            updated policy.
          </p>
        </div>

        <div>
          <h2>Contact Us</h2>
          <p className="mt-2">
            RydeTime Auto, {DEALERSHIP.address.full}
            <br />
            Phone: {DEALERSHIP.phone} · Email:{" "}
            <a
              href={`mailto:${DEALERSHIP.email}`}
              className="text-accent hover:underline"
            >
              {DEALERSHIP.email}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
