import type { DCLead, DCLeadResult } from "@/types/dealercenter";
import type { CreditApplicationSubmission } from "@/types/lead";
import { sendNotification, sendEmailTo } from "@/lib/notificationProvider";

/**
 * Lead provider abstraction. DealerCenter ADF/XML push is the current implementation.
 */
export interface LeadProvider {
  name: string;
  pushLead(lead: DCLead): Promise<DCLeadResult>;
}

function esc(s: string | undefined | null): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildAdfXml(lead: DCLead): string {
  const dcid = process.env.DEALERCENTER_ADF_DCID || "16936663";
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<?adf version="1.0"?>
<adf>
  <prospect status="new">
    <id sequence="1" source="rydetimeauto.com">${esc(dcid)}</id>
    <requestdate>${now}</requestdate>
    ${lead.vin || lead.stock_number ? `<vehicle interest="buy" status="used">
      ${lead.year ? `<year>${lead.year}</year>` : ""}
      ${lead.make ? `<make>${esc(lead.make)}</make>` : ""}
      ${lead.model ? `<model>${esc(lead.model)}</model>` : ""}
      ${lead.vin ? `<vin>${esc(lead.vin)}</vin>` : ""}
      ${lead.stock_number ? `<stock>${esc(lead.stock_number)}</stock>` : ""}
    </vehicle>` : ""}
    <customer>
      <contact>
        <name part="first">${esc(lead.first_name)}</name>
        <name part="last">${esc(lead.last_name || "")}</name>
        ${lead.phone ? `<phone type="voice">${esc(lead.phone)}</phone>` : ""}
        ${lead.email ? `<email>${esc(lead.email)}</email>` : ""}
      </contact>
      ${lead.comments ? `<comments>${esc(lead.comments)}</comments>` : ""}
    </customer>
    <vendor>
      <id source="DealerCenter">${esc(dcid)}</id>
      <vendorname>RydeTime Auto</vendorname>
    </vendor>
    <provider>
      <name part="full">RydeTime Auto Website (${esc(lead.source)})</name>
      <service>${esc(lead.lead_type)}</service>
    </provider>
  </prospect>
</adf>`;
}

/**
 * Ship a prepared ADF/XML document to DealerCenter using whichever route is
 * configured: authenticated API first, then the ADF email intake, else report
 * honestly that it did not reach DealerCenter. Shared by regular leads and the
 * signed credit application.
 *
 * `noFallbackNotify` skips echoing the raw XML into a dealership notification
 * when nothing is configured — used for the credit application so a full SSN
 * never lands in a human inbox as a fallback.
 */
export async function pushAdfToDealerCenter(
  adfXml: string,
  meta: { lead_type: string; label: string; noFallbackNotify?: boolean }
): Promise<DCLeadResult> {
  const apiUrl = process.env.DEALERCENTER_LEAD_API_URL;
  const token = process.env.DEALERCENTER_LEAD_ACCESS_TOKEN;

  if (apiUrl && token && !apiUrl.includes("your_lead_api_url")) {
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/xml", access_token: token },
        body: adfXml,
      });
      if (res.ok) {
        const body = await res.text();
        const idMatch =
          body.match(/<lead_?id>([^<]+)<\/lead_?id>/i) ||
          body.match(/"lead_?id"\s*:\s*"?([\w-]+)"?/i);
        return { success: true, dc_lead_id: idMatch?.[1], method: "api" };
      }
      return { success: false, error: `DealerCenter lead API returned ${res.status}`, method: "api" };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown lead API error",
        method: "api",
      };
    }
  }

  // ADF/XML email to DealerCenter's CRM lead-import address — the standard
  // internet-lead intake route every dealer CRM supports.
  const adfEmail = process.env.DEALERCENTER_ADF_EMAIL;
  if (adfEmail && !adfEmail.includes("your_")) {
    const sent = await sendEmailTo(adfEmail, {
      subject: `${meta.label} from rydetimeauto.com`,
      body: adfXml,
    });
    if (sent) return { success: true, method: "adf_email" };
    return {
      success: false,
      error: "ADF email to DealerCenter failed to send (check RESEND_API_KEY / Resend logs)",
      method: "adf_email",
    };
  }

  // Nothing configured. For ordinary leads we echo the XML to the dealership so
  // it can be keyed in manually; for the credit application we deliberately do
  // NOT, so a full SSN never sits in a human inbox.
  if (!meta.noFallbackNotify) {
    await sendNotification({
      subject: meta.label,
      body: `ADF/XML (DealerCenter push not configured — enter manually in DealerCenter):\n\n${adfXml}`,
    });
  }
  return {
    success: false,
    error: "No DealerCenter route configured (set DEALERCENTER_ADF_EMAIL or DEALERCENTER_LEAD_API_URL)",
    method: "email_fallback",
  };
}

export class DealerCenterLeadProvider implements LeadProvider {
  name = "dealercenter";

  async pushLead(lead: DCLead): Promise<DCLeadResult> {
    return pushAdfToDealerCenter(buildAdfXml(lead), {
      lead_type: lead.lead_type,
      label: `New ${lead.lead_type} lead: ${lead.first_name} ${lead.last_name || ""}`.trim(),
    });
  }
}

export function getLeadProvider(): LeadProvider {
  return new DealerCenterLeadProvider();
}

/** Extra vehicle/deal context resolved server-side, merged into the ADF. */
export interface CreditAppAdfContext {
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  stock_number?: string;
}

/**
 * Build a complete ADF/XML credit application for DealerCenter. Unlike an
 * ordinary lead, this carries the FULL applicant financial data (including SSN
 * and DOB) inside a structured comments block plus an ADF <finance> element —
 * this is the intended, in-flight-only transmission of that data to
 * DealerCenter's CRM. Nothing built here is persisted on our side.
 */
export function buildCreditAppAdfXml(
  app: CreditApplicationSubmission,
  ctx: CreditAppAdfContext = {}
): string {
  const dcid = process.env.DEALERCENTER_ADF_DCID || "16936663";
  const now = new Date().toISOString();
  const year = ctx.year;
  const make = ctx.make ?? undefined;
  const model = ctx.model ?? undefined;
  const vin = ctx.vin ?? app.vin;
  const stock = ctx.stock_number ?? app.stock_number;

  const line = (label: string, v: string | undefined | null) =>
    v && String(v).trim() ? `${label}: ${String(v).trim()}` : null;

  const timeText = (y?: string, m?: string) =>
    [y && `${y} yr`, m && `${m} mo`].filter(Boolean).join(" ");

  const details = [
    "=== SIGNED ONLINE CREDIT APPLICATION (rydetimeauto.com) ===",
    "",
    "APPLICANT",
    line("Name", [app.first_name, app.middle_name, app.last_name].filter(Boolean).join(" ")),
    line("DOB", app.dob),
    line("SSN", app.ssn),
    line("Driver's License", app.drivers_license),
    line("Phone", app.phone),
    line("Email", app.email),
    "",
    "RESIDENCE",
    line("Address", [app.address, app.city, app.state, app.zip].filter(Boolean).join(", ")),
    line("Housing", app.housing_status),
    line("Time at address", timeText(app.years_at_address, app.months_at_address)),
    line("Monthly housing payment", app.monthly_housing_payment),
    line("Previous address", app.prev_address),
    line("Time at previous address", timeText(app.prev_years_at_address, app.prev_months_at_address)),
    "",
    "EMPLOYMENT & INCOME",
    line("Status", app.employment_status),
    line("Employer", app.employer_name),
    line("Title", app.job_title),
    line("Work phone", app.work_phone),
    line("Time on job", timeText(app.years_employed, app.months_employed)),
    app.no_prev_employer
      ? "Previous employer: NONE (applicant checked no previous employer)"
      : line("Previous employer", app.prev_employer_name),
    line("Time at previous employer", timeText(app.prev_years_employed, app.prev_months_employed)),
    line("Gross monthly income", app.gross_monthly_income),
    line("Other income", app.other_income),
    line("Other income source", app.other_income_source),
    app.has_co_applicant
      ? [
          "",
          "CO-APPLICANT",
          line("Name", [app.co_first_name, app.co_last_name].filter(Boolean).join(" ")),
          line("Relationship", app.co_relationship),
          line("DOB", app.co_dob),
          line("Driver's License", app.co_drivers_license),
          line("SSN", app.co_ssn),
          line("Phone", app.co_phone),
          line("Email", app.co_email),
          " ",
          "CO-APPLICANT RESIDENCE",
          line("Address", [app.co_address, app.co_city, app.co_state, app.co_zip].filter(Boolean).join(", ")),
          line("Housing", app.co_housing_status),
          line("Time at address", timeText(app.co_years_at_address, app.co_months_at_address)),
          line("Monthly housing payment", app.co_monthly_housing_payment),
          line("Previous address", app.co_prev_address),
          line("Time at previous address", timeText(app.co_prev_years_at_address, app.co_prev_months_at_address)),
          " ",
          "CO-APPLICANT EMPLOYMENT & INCOME",
          line("Status", app.co_employment_status),
          line("Employer", app.co_employer_name),
          line("Title", app.co_job_title),
          line("Work phone", app.co_work_phone),
          line("Time on job", timeText(app.co_years_employed, app.co_months_employed)),
          app.co_no_prev_employer
            ? "Previous employer: NONE (co-applicant checked no previous employer)"
            : line("Previous employer", app.co_prev_employer_name),
          line("Time at previous employer", timeText(app.co_prev_years_employed, app.co_prev_months_employed)),
          line("Gross monthly income", app.co_gross_monthly_income),
          line("Other income", app.co_other_income),
          line("Other income source", app.co_other_income_source),
        ]
          .filter(Boolean)
          .join("\n")
      : null,
    "",
    "DEAL",
    line("Vehicle", [year, make, model].filter(Boolean).join(" ")),
    line("VIN", vin),
    line("Stock #", stock),
    line("Requested down payment", app.requested_down_payment),
    line("Desired monthly payment", app.desired_monthly_payment),
    "",
    "AUTHORIZATION",
    line("Electronic signature", app.signature_name),
    line("Credit-pull consent", app.consent_credit_pull ? "YES" : "NO"),
    line("SMS opt-in consent", app.sms_consent ? "YES" : "NO"),
    line("Signed at", now),
  ]
    .filter((v) => v !== null && v !== undefined)
    .join("\n");

  const vehicleBlock =
    vin || stock || year || make || model
      ? `<vehicle interest="buy" status="used">
      ${year ? `<year>${year}</year>` : ""}
      ${make ? `<make>${esc(make)}</make>` : ""}
      ${model ? `<model>${esc(model)}</model>` : ""}
      ${vin ? `<vin>${esc(vin)}</vin>` : ""}
      ${stock ? `<stock>${esc(stock)}</stock>` : ""}
    </vehicle>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<?adf version="1.0"?>
<adf>
  <prospect status="new">
    <id sequence="1" source="rydetimeauto.com">${esc(dcid)}</id>
    <requestdate>${now}</requestdate>
    ${vehicleBlock}
    <customer>
      <contact>
        <name part="first">${esc(app.first_name)}</name>
        <name part="last">${esc(app.last_name)}</name>
        ${app.phone ? `<phone type="voice">${esc(app.phone)}</phone>` : ""}
        ${app.email ? `<email>${esc(app.email)}</email>` : ""}
        ${app.address || app.city || app.state || app.zip ? `<address type="home">
          ${app.address ? `<street line="1">${esc(app.address)}</street>` : ""}
          ${app.city ? `<city>${esc(app.city)}</city>` : ""}
          ${app.state ? `<regioncode>${esc(app.state)}</regioncode>` : ""}
          ${app.zip ? `<postalcode>${esc(app.zip)}</postalcode>` : ""}
        </address>` : ""}
      </contact>
      <comments>${esc(details)}</comments>
    </customer>
    <vendor>
      <id source="DealerCenter">${esc(dcid)}</id>
      <vendorname>RydeTime Auto</vendorname>
    </vendor>
    <provider>
      <name part="full">RydeTime Auto Website (credit_app)</name>
      <service>credit application</service>
    </provider>
  </prospect>
</adf>`;
}
