/**
 * Vehicle slug format: {year}-{make}-{model}-{trim}-{stock-number}
 * All lowercase, spaces to hyphens, special chars stripped.
 * Example: 2021-honda-cr-v-ex-rt4521
 */
export function slugifyPart(part: string): string {
  return part
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateVehicleSlug(input: {
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  stock_number: string;
}): string {
  const parts = [
    String(input.year),
    input.make,
    input.model,
    input.trim || "",
    input.stock_number,
  ]
    .map((p) => slugifyPart(String(p)))
    .filter(Boolean);
  return parts.join("-");
}
