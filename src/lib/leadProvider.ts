import type { DCLead, DCLeadResult } from "@/types/dealercenter";
import { sendNotification } from "@/lib/notificationProvider";

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

    // Email fallback: send the ADF/XML to the notification email so no lead is lost.
    await sendNotification({
      subject: `New ${lead.lead_type} lead: ${lead.first_name} ${lead.last_name || ""}`,
      body: `ADF/XML lead (DealerCenter API not configured — manual entry may be required):\n\n${adfXml}`,
    });
    return { success: true, method: "email_fallback" };
  }
}

export function getLeadProvider(): LeadProvider {
  return new DealerCenterLeadProvider();
}
