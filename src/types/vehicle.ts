export type VehicleStatus = "active" | "sold" | "hold_pending" | "fresh_arrival";

export interface Vehicle {
  id: string;
  vin: string;
  stock_number: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  body_style: string | null;
  exterior_color: string | null;
  interior_color: string | null;
  mileage: number;
  price: number;
  msrp: number | null;
  status: VehicleStatus;
  transmission: string | null;
  drivetrain: string | null;
  fuel_type: string | null;
  engine: string | null;
  doors: number | null;
  seats: number | null;
  description_dc: string | null;
  description_ai: string | null;
  meta_description: string | null;
  slug: string;
  carfax_url: string | null;
  carfax_badge_one_owner: boolean;
  carfax_badge_accident_free: boolean;
  carfax_badge_service_records: boolean;
  carfax_badge_great_value: boolean;
  dc_vehicle_url: string | null;
  featured: boolean;
  ryans_pick: boolean;
  best_fit_for: string | null;
  ryans_take: string | null;
  what_to_know: string | null;
  video_url: string | null;
  days_in_inventory: number;
  price_reduced: boolean;
  original_price: number | null;
  created_at: string;
  updated_at: string;
  sold_at: string | null;
  dc_last_synced: string | null;
  // Relations (populated by joined queries)
  vehicle_photos?: VehiclePhoto[];
  vehicle_features?: VehicleFeature[];
  vehicle_prep_badges?: VehiclePrepBadge[];
}

export interface VehiclePhoto {
  id: string;
  vehicle_id: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface VehicleFeature {
  id: string;
  vehicle_id: string;
  feature_name: string;
  category: string | null;
}

export type PrepBadgeType =
  | "state_inspection"
  | "oil_change"
  | "new_tires"
  | "new_brakes"
  | "detailed"
  | "multi_point_review"
  | "battery_checked"
  | "fluids_topped";

export interface VehiclePrepBadge {
  id: string;
  vehicle_id: string;
  badge_type: PrepBadgeType;
  created_at: string;
}

/** Lighter shape for listing grids and strips */
export interface VehicleCard {
  id: string;
  vin: string;
  stock_number: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  body_style: string | null;
  mileage: number;
  price: number;
  status: VehicleStatus;
  slug: string;
  carfax_url: string | null;
  featured: boolean;
  ryans_pick: boolean;
  price_reduced: boolean;
  original_price: number | null;
  days_in_inventory: number;
  fuel_type: string | null;
  transmission: string | null;
  drivetrain: string | null;
  primary_photo_url: string | null;
}

export const VEHICLE_CARD_COLUMNS =
  "id, vin, stock_number, year, make, model, trim, body_style, mileage, price, status, slug, carfax_url, featured, ryans_pick, price_reduced, original_price, days_in_inventory, fuel_type, transmission, drivetrain, vehicle_photos(url, is_primary, sort_order)";

/** Standard payment estimate assumptions used site-wide */
export const PAYMENT_DEFAULTS = {
  termMonths: 72,
  apr: 8.9,
  downPayment: 0,
} as const;

export function estimateMonthlyPayment(
  price: number,
  downPayment: number = PAYMENT_DEFAULTS.downPayment,
  termMonths: number = PAYMENT_DEFAULTS.termMonths,
  apr: number = PAYMENT_DEFAULTS.apr
): number {
  const principal = Math.max(price - downPayment, 0);
  if (principal === 0) return 0;
  const monthlyRate = apr / 100 / 12;
  if (monthlyRate === 0) return Math.round(principal / termMonths);
  const payment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment);
}
