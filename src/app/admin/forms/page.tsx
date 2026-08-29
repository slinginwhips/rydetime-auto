import Link from "next/link";

export const dynamic = "force-dynamic";

const FORMS = [
  {
    href: "/admin/forms/sms-consent",
    title: "SMS Consent Form",
    description:
      "Printable written SMS consent for customers who complete paperwork in person instead of the online credit application.",
  },
];

export default function AdminFormsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Printable Forms</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Buyer/customer paperwork for in-store use. Print a blank copy for each
        signature needed.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {FORMS.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="block rounded-lg border border-border-subtle bg-background-card p-6 transition-colors hover:border-accent"
          >
            <h2 className="text-sm font-bold text-text-primary">{f.title}</h2>
            <p className="mt-2 text-sm text-text-secondary">{f.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
