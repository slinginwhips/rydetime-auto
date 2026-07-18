/** Raw vehicle record as parsed from a DealerCenter inventory feed (XML or CSV). */
export interface DCVehicle {
  vin: string;
  stock_number: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  body_style?: string;
  exterior_color?: string;
  interior_color?: string;
  mileage: number;
  price: number;
  msrp?: number;
  transmission?: string;
  drivetrain?: string;
  fuel_type?: string;
  engine?: string;
  doors?: number;
  seats?: number;
  description?: string;
  photo_urls: string[];
  features: string[];
  carfax_url?: string;
  carfax_one_owner?: boolean;
  carfax_accident_free?: boolean;
  carfax_service_records?: boolean;
  carfax_great_value?: boolean;
  carfax_good_value?: boolean;
  dc_vehicle_url?: string;
  video_url?: string;
  status?: string;
  date_in_stock?: string;
}

export interface DCFeedResponse {
  vehicles: DCVehicle[];
  source: "xml" | "csv" | "json_mock";
  fetched_at: string;
}

/** Lead payload pushed to the DealerCenter lead API (ADF/XML). */
export interface DCLead {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  comments?: string;
  vin?: string;
  stock_number?: string;
  year?: number;
  make?: string;
  model?: string;
  lead_type: string;
  source: string;
}

export interface DCLeadResult {
  success: boolean;
  dc_lead_id?: string;
  error?: string;
  method: "api" | "adf_email" | "email_fallback" | "skipped";
}

export interface SyncSummary {
  added: number;
  updated: number;
  sold: number;
  unchanged: number;
  errors: string[];
}
