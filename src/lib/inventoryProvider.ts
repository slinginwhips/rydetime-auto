import type { DCVehicle, DCFeedResponse } from "@/types/dealercenter";

/**
 * Inventory provider abstraction. DealerCenter is the current implementation;
 * swap providers by implementing InventoryProvider and changing getInventoryProvider().
 */
export interface InventoryProvider {
  name: string;
  fetchInventory(): Promise<DCFeedResponse>;
}

/* ---------------- DealerCenter adapter ---------------- */

function text(node: string | undefined | null): string {
  return (node ?? "").trim();
}

function num(node: string | undefined | null): number {
  const n = parseFloat(text(node).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Extract the inner text of the first occurrence of any of the given tags. */
function xmlTag(block: string, ...tags: string[]): string {
  for (const tag of tags) {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (m) {
      return m[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    }
  }
  return "";
}

function yes(v: string): boolean {
  return /^(true|yes|y|1)$/i.test(v.trim());
}

export function parseXmlFeed(xml: string): DCVehicle[] {
  const blocks = xml.match(/<(vehicle|item|unit|listing)[\s>][\s\S]*?<\/\1>/gi) || [];
  const vehicles: DCVehicle[] = [];
  for (const block of blocks) {
    const vin = xmlTag(block, "vin", "VIN");
    if (!vin || vin.length < 11) continue;
    const photos = (block.match(/<(photo_url|photourl|image_url|imageurl|photo|image)[^>]*>([\s\S]*?)<\/\1>/gi) || [])
      .map((p) => p.replace(/<[^>]+>/g, "").replace(/<!\[CDATA\[|\]\]>/g, "").trim())
      .filter((u) => /^https?:\/\//i.test(u));
    const featuresRaw = xmlTag(block, "options", "features", "equipment");
    const features = featuresRaw
      ? featuresRaw.split(/[,|;\n]/).map((f) => f.trim()).filter(Boolean)
      : [];
    vehicles.push({
      vin,
      stock_number: xmlTag(block, "stock_number", "stocknumber", "stock") || vin.slice(-6),
      year: num(xmlTag(block, "year", "modelyear")),
      make: xmlTag(block, "make"),
      model: xmlTag(block, "model"),
      trim: xmlTag(block, "trim") || undefined,
      body_style: xmlTag(block, "body_style", "bodystyle", "body") || undefined,
      exterior_color: xmlTag(block, "exterior_color", "exteriorcolor", "color") || undefined,
      interior_color: xmlTag(block, "interior_color", "interiorcolor") || undefined,
      mileage: num(xmlTag(block, "mileage", "miles", "odometer")),
      price: num(xmlTag(block, "price", "selling_price", "sellingprice", "internet_price")),
      msrp: num(xmlTag(block, "msrp")) || undefined,
      transmission: xmlTag(block, "transmission") || undefined,
      drivetrain: xmlTag(block, "drivetrain", "drive_type", "drivetype") || undefined,
      fuel_type: xmlTag(block, "fuel_type", "fueltype", "fuel") || undefined,
      engine: xmlTag(block, "engine") || undefined,
      doors: num(xmlTag(block, "doors")) || undefined,
      description: xmlTag(block, "description", "comments") || undefined,
      photo_urls: photos,
      features,
      carfax_url: xmlTag(block, "carfax_url", "carfaxurl") || undefined,
      carfax_one_owner: yes(xmlTag(block, "carfax_one_owner", "oneowner")),
      carfax_accident_free: yes(xmlTag(block, "carfax_accident_free", "accidentfree", "no_accidents")),
      carfax_service_records: yes(xmlTag(block, "carfax_service_records", "servicerecords")),
      carfax_great_value: yes(xmlTag(block, "carfax_great_value", "greatvalue")),
      dc_vehicle_url: xmlTag(block, "vehicle_url", "vdp_url", "url") || undefined,
      video_url: xmlTag(block, "video_url", "videourl") || undefined,
      status: xmlTag(block, "status") || undefined,
      date_in_stock: xmlTag(block, "date_in_stock", "dateinstock", "stock_date") || undefined,
    });
  }
  return vehicles;
}

/** Minimal CSV parser handling quoted fields. */
function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (inQuotes) {
      if (c === '"') {
        if (csv[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && csv[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((f) => f.trim() !== "")) rows.push(row); }
  return rows;
}

export function parseCsvFeed(csv: string): DCVehicle[] {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const col = (row: string[], ...names: string[]): string => {
    for (const name of names) {
      const idx = headers.indexOf(name);
      if (idx >= 0 && row[idx] !== undefined) return row[idx].trim();
    }
    return "";
  };
  const vehicles: DCVehicle[] = [];
  for (const row of rows.slice(1)) {
    const vin = col(row, "vin");
    if (!vin || vin.length < 11) continue;
    const photosRaw = col(row, "photourls", "photos", "imageurls", "images");
    vehicles.push({
      vin,
      stock_number: col(row, "stocknumber", "stock") || vin.slice(-6),
      year: num(col(row, "year", "modelyear")),
      make: col(row, "make"),
      model: col(row, "model"),
      trim: col(row, "trim") || undefined,
      body_style: col(row, "bodystyle", "body") || undefined,
      exterior_color: col(row, "exteriorcolor", "color") || undefined,
      interior_color: col(row, "interiorcolor") || undefined,
      mileage: num(col(row, "mileage", "miles", "odometer")),
      price: num(col(row, "price", "sellingprice", "internetprice")),
      msrp: num(col(row, "msrp")) || undefined,
      transmission: col(row, "transmission") || undefined,
      drivetrain: col(row, "drivetrain", "drivetype") || undefined,
      fuel_type: col(row, "fueltype", "fuel") || undefined,
      engine: col(row, "engine") || undefined,
      doors: num(col(row, "doors")) || undefined,
      description: col(row, "description", "comments") || undefined,
      photo_urls: photosRaw.split(/[|;]/).map((u) => u.trim()).filter((u) => /^https?:\/\//i.test(u)),
      features: col(row, "options", "features", "equipment").split(/[,|;]/).map((f) => f.trim()).filter(Boolean),
      carfax_url: col(row, "carfaxurl") || undefined,
      carfax_one_owner: yes(col(row, "carfaxoneowner", "oneowner")),
      carfax_accident_free: yes(col(row, "carfaxaccidentfree", "accidentfree", "noaccidents")),
      carfax_service_records: yes(col(row, "carfaxservicerecords", "servicerecords")),
      carfax_great_value: yes(col(row, "carfaxgreatvalue", "greatvalue")),
      dc_vehicle_url: col(row, "vehicleurl", "vdpurl", "url") || undefined,
      video_url: col(row, "videourl") || undefined,
      status: col(row, "status") || undefined,
      date_in_stock: col(row, "dateinstock", "stockdate") || undefined,
    });
  }
  return vehicles;
}

export class DealerCenterInventoryProvider implements InventoryProvider {
  name = "dealercenter";

  async fetchInventory(): Promise<DCFeedResponse> {
    const feedUrl = process.env.DEALERCENTER_INVENTORY_FEED_URL;
    const fetched_at = new Date().toISOString();

    if (feedUrl && !feedUrl.includes("your_feed_url")) {
      const res = await fetch(feedUrl, {
        headers: { "User-Agent": "RydeTimeAuto-Sync/1.0" },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`DealerCenter feed returned ${res.status} ${res.statusText}`);
      }
      const body = await res.text();
      const trimmed = body.trimStart();
      if (trimmed.startsWith("<")) {
        const vehicles = parseXmlFeed(body);
        if (vehicles.length > 0) return { vehicles, source: "xml", fetched_at };
      }
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const json = JSON.parse(body);
          const arr = Array.isArray(json) ? json : json.vehicles || [];
          if (arr.length > 0) return { vehicles: arr as DCVehicle[], source: "json_mock", fetched_at };
        } catch {
          // fall through to CSV
        }
      }
      const csvVehicles = parseCsvFeed(body);
      if (csvVehicles.length > 0) return { vehicles: csvVehicles, source: "csv", fetched_at };
      throw new Error("DealerCenter feed could not be parsed as XML, JSON, or CSV");
    }

    // Dev fallback: no feed configured — return empty so sync is a no-op rather than inventing data.
    return { vehicles: [], source: "json_mock", fetched_at };
  }
}

export function getInventoryProvider(): InventoryProvider {
  return new DealerCenterInventoryProvider();
}
