import type { DCLead, DCLeadResult } from "@/types/dealercenter";
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

export class DealerCenterLeadProvider implements LeadProvider {
  name = "dealercenter";

  async pushLead(lead: DCLead): Promise<DCLeadResult> {
    const apiUrl = process.env.DEALERCENTER_LEAD_API_URL;
    const token = process.env.DEALERCENTER_LEAD_ACCESS_TOKEN;
    const adfXml = buildAdfXml(lead);

    if (apiUrl && token && !apiUrl.includes("your_lead_api_url")) {
      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/xml",
            access_token: token,
          },
          body: adfXml,
        });
        if (res.ok) {
          const body = await res.text();
          const idMatch = body.match(/<lead_?id>([^<]+)<\/lead_?id>/i) || body.match(/"lead_?id"\s*:\s*"?([\w-]+)"?/i);
          return { success: true, dc_lead_id: idMatch?.[1], method: "api" };
        }
        return {
          success: false,
          error: `DealerCenter lead API returned ${res.status}`,
          method: "api",
        };
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
        subject: `New ${lead.lead_type} lead from rydetimeauto.com`,
        body: adfXml,
      });
      if (sent) return { success: true, method: "adf_email" };
      return {
        success: false,
        error: "ADF email to DealerCenter failed to send (check RESEND_API_KEY / Resend logs)",
        method: "adf_email",
      };
    }

    // Nothing configured: notify the dealership (best effort) and report the
    // truth — the lead did NOT reach DealerCenter.
    await sendNotification({
      subject: `New ${lead.lead_type} lead: ${lead.first_name} ${lead.last_name || ""}`,
      body: `ADF/XML lead (DealerCenter push not configured — enter manually in DealerCenter):\n\n${adfXml}`,
    });
    return {
      success: false,
      error: "No DealerCenter lead route configured (set DEALERCENTER_ADF_EMAIL or DEALERCENTER_LEAD_API_URL)",
      method: "email_fallback",
    };
  }
}

export function getLeadProvider(): LeadProvider {
  return new DealerCenterLeadProvider();
}
