"use client";

import { DEALERSHIP } from "@/lib/dealership";
import { SMS_CONSENT_DISCLOSURE } from "@/types/lead";

export default function SmsConsentFormPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">SMS Consent Form</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Print a blank copy for customers completing paperwork in person.
            The consent box must stay unchecked/blank until the customer
            checks it themselves — never pre-mark it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Print
        </button>
      </div>

      {/* Printable sheet */}
      <div className="mx-auto max-w-2xl rounded-lg border border-border-subtle bg-background-card p-8 text-text-primary print:max-w-none print:rounded-none print:border-0 print:p-0 print:text-black">
        <div className="border-b border-border-subtle pb-4 print:border-black">
          <p className="text-lg font-bold">{DEALERSHIP.name}</p>
          <p className="text-sm text-text-secondary print:text-black">
            {DEALERSHIP.address.full} · {DEALERSHIP.phone}
          </p>
        </div>

        <h2 className="mt-6 text-base font-bold">
          Text Message (SMS) Consent — Optional
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary print:text-black">
          {SMS_CONSENT_DISCLOSURE}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary print:text-black">
          Mobile information and SMS opt-in consent will not be shared with
          third parties or affiliates for marketing or promotional purposes.
          See our Privacy Policy (rydetimeauto.com/privacy) and Terms &amp;
          Conditions (rydetimeauto.com/terms) for details.
        </p>

        <div className="mt-6 flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-text-primary print:border-black"
          />
          <p className="text-sm">
            I consent to receive text messages as described above. (Check this
            box only if you agree. Leaving it blank means you are declining
            text messages — this does not affect your application or
            purchase.)
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <div className="border-b border-text-primary print:border-black">&nbsp;</div>
            <p className="mt-1 text-xs text-text-secondary print:text-black">
              Customer printed name
            </p>
          </div>
          <div>
            <div className="border-b border-text-primary print:border-black">&nbsp;</div>
            <p className="mt-1 text-xs text-text-secondary print:text-black">
              Mobile phone number
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <div className="border-b border-text-primary print:border-black">&nbsp;</div>
            <p className="mt-1 text-xs text-text-secondary print:text-black">
              Customer signature
            </p>
          </div>
          <div>
            <div className="border-b border-text-primary print:border-black">&nbsp;</div>
            <p className="mt-1 text-xs text-text-secondary print:text-black">
              Date
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
