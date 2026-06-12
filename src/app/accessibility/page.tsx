import { generatePageMetadata } from "@/lib/seo";
import { DEALERSHIP } from "@/lib/dealership";

export const metadata = generatePageMetadata({
  title: "Accessibility Statement | RydeTime Auto — Suffolk, VA",
  description:
    "RydeTime Auto's commitment to digital accessibility, the standards we work toward, and how to reach us if you encounter a barrier on our website.",
  path: "/accessibility",
});

export default function AccessibilityPage() {
  return (
    <main className="bg-background">
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Accessibility Statement
          </h1>
          <p className="mt-3 text-sm text-text-muted">Last updated: June 2026</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-8 px-4 py-12 text-sm leading-relaxed text-text-secondary sm:px-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-text-primary">
        <div>
          <h2>Our Commitment</h2>
          <p className="mt-2">
            RydeTime Auto wants every customer in Suffolk and Hampton Roads —
            including customers with disabilities — to be able to shop for a
            vehicle on our website comfortably and independently. We are
            committed to providing a website that is accessible to the widest
            possible audience, and we treat accessibility as an ongoing effort
            rather than a one-time project.
          </p>
        </div>

        <div>
          <h2>Standards We Work Toward</h2>
          <p className="mt-2">
            We aim to conform to the Web Content Accessibility Guidelines
            (WCAG) 2.1, Level AA. Practical measures on this site include:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Semantic HTML structure with proper headings and landmarks</li>
            <li>Text alternatives for meaningful images, including vehicle photos</li>
            <li>Sufficient color contrast on our dark theme, designed and tested for readability</li>
            <li>Keyboard operability for navigation, forms, galleries, and the chat widget</li>
            <li>Visible focus indicators and logical focus order</li>
            <li>Form labels and error messages that work with screen readers</li>
            <li>Responsive layouts that support zoom up to 200% and mobile screen readers</li>
          </ul>
        </div>

        <div>
          <h2>AI Chat Assistant</h2>
          <p className="mt-2">
            Our AI chat assistant is an optional convenience — every task it
            performs can also be completed by phone, email, standard web forms,
            or in person. If the chat widget is difficult to use with your
            assistive technology, you are never required to use it.
          </p>
        </div>

        <div>
          <h2>Known Limitations</h2>
          <p className="mt-2">
            Some content comes from third parties — such as embedded maps,
            vehicle history reports, the hosted credit application, and the
            payment processor — and may not fully meet the same standards. We
            choose reputable providers and pass along accessibility feedback
            when we receive it.
          </p>
        </div>

        <div>
          <h2>Need Help or Found a Barrier?</h2>
          <p className="mt-2">
            If you have difficulty using any part of this website, or you&apos;d
            simply rather work with a person, contact us and we will gladly
            assist you directly or provide the information you need in another
            format:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Phone:{" "}
              <a href={DEALERSHIP.phoneHref} className="text-accent hover:underline">
                {DEALERSHIP.phone}
              </a>
            </li>
            <li>
              Email:{" "}
              <a href={`mailto:${DEALERSHIP.email}`} className="text-accent hover:underline">
                {DEALERSHIP.email}
              </a>
            </li>
            <li>In person: {DEALERSHIP.address.full}</li>
          </ul>
          <p className="mt-2">
            When reporting an issue, it helps to include the page address and a
            short description of the problem. We take reports seriously and
            work to fix verified issues promptly.
          </p>
        </div>
      </section>
    </main>
  );
}
