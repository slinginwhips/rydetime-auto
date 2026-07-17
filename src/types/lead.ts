export type LeadType =
  | "inquiry"
  | "test_drive"
  | "trade"
  | "finance"
  | "hold"
  | "chat"
  | "matchmaker"
  | "price_drop"
  | "carfax"
  | "credit_app";

export interface Lead {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  vehicle_id: string | null;
  vin: string | null;
  stock_number: string | null;
  message: string | null;
  lead_type: LeadType;
  budget: string | null;
  down_payment: string | null;
  monthly_payment_goal: string | null;
  trade_vin: string | null;
  trade_year: number | null;
  trade_make: string | null;
  trade_model: string | null;
  trade_mileage: number | null;
  trade_payoff: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  source_url: string | null;
  chat_summary: string | null;
  dc_pushed: boolean;
  dc_pushed_at: string | null;
  created_at: string;
}

export interface LeadEvent {
  id: string;
  lead_id: string;
  event_type: string;
  notes: string | null;
  created_at: string;
}

/** Request body for POST /api/leads */
export interface LeadSubmission {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  vehicle_id?: string;
  vin?: string;
  stock_number?: string;
  message?: string;
  lead_type: LeadType;
  budget?: string;
  down_payment?: string;
  monthly_payment_goal?: string;
  preferred_date?: string;
  preferred_time?: string;
  source_url?: string;
  chat_summary?: string;
}

export interface AppointmentRequest {
  id: string;
  lead_id: string;
  vehicle_id: string | null;
  preferred_date: string;
  preferred_time: string;
  confirmed: boolean;
  notes: string | null;
  created_at: string;
}

/** Request body for POST /api/appointments */
export interface AppointmentSubmission {
  first_name: string;
  last_name?: string;
  email?: string;
  phone: string;
  vehicle_id?: string;
  preferred_date: string;
  preferred_time: string;
  notes?: string;
  source_url?: string;
}

export type TradeCondition = "Excellent" | "Good" | "Fair" | "Poor";
export type TitleStatus = "Clean" | "Salvage" | "Rebuilt" | "Unknown";

export interface TradeRequest {
  id: string;
  lead_id: string;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  mileage: number | null;
  condition: TradeCondition | null;
  payoff_amount: string | null;
  lender: string | null;
  warning_lights: boolean | null;
  accident_history: boolean | null;
  title_status: TitleStatus | null;
  photos_urls: string[] | null;
  notes: string | null;
  created_at: string;
}

/** Request body for POST /api/trade */
export interface TradeSubmission {
  first_name: string;
  last_name?: string;
  email?: string;
  phone: string;
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  mileage?: number;
  condition?: TradeCondition;
  payoff_amount?: string;
  lender?: string;
  warning_lights?: boolean;
  accident_history?: boolean;
  title_status?: TitleStatus;
  photos_urls?: string[];
  notes?: string;
  vehicle_of_interest_id?: string;
  preferred_date?: string;
  preferred_time?: string;
  intent?: "trade" | "sell";
  source_url?: string;
}

export type HoldDepositStatus = "pending" | "confirmed" | "released" | "forfeited";

export interface HoldDeposit {
  id: string;
  lead_id: string;
  vehicle_id: string;
  amount: number;
  stripe_payment_intent_id: string | null;
  status: HoldDepositStatus;
  acknowledged_policy: boolean;
  created_at: string;
}

/** Request body for POST /api/hold-deposit */
export interface HoldDepositSubmission {
  first_name: string;
  last_name?: string;
  email: string;
  phone: string;
  vehicle_id: string;
  acknowledged_policy: boolean;
  signature_name: string;
  source_url?: string;
}

export const HOLD_DEPOSIT_AMOUNT = 500;

export const HOLD_POLICY_TEXT =
  "The $500 hold deposit is non-refundable if you choose not to move forward with the purchase. The deposit applies toward your purchase price if the sale is completed. Holding this vehicle removes it from active availability and RydeTime Auto may turn away other buyers during the hold period. This deposit does not guarantee financing approval, lender terms, insurance eligibility, or final sale. Final sale requires completed paperwork, full payment or lender approval, and dealership confirmation.";

// ---------------------------------------------------------------------------
// Credit application
// ---------------------------------------------------------------------------

export type HousingStatus = "own" | "rent" | "other";
export type EmploymentStatus =
  | "employed"
  | "self_employed"
  | "retired"
  | "military"
  | "other";

/**
 * Request body for POST /api/credit-application.
 * NOTE: `ssn` and `co_ssn` are FULL numbers, transmitted to DealerCenter and
 * then discarded — they are never stored in our database (only the last 4) and
 * never logged. Everything else may be persisted (redacted) for the dealership.
 */
export interface CreditApplicationSubmission {
  // applicant
  first_name: string;
  middle_name?: string;
  last_name: string;
  dob?: string; // YYYY-MM-DD
  ssn?: string; // FULL — pass-through only, never stored
  drivers_license?: string;
  email?: string;
  phone: string;

  // current residence
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  housing_status?: HousingStatus;
  years_at_address?: string;
  months_at_address?: string;
  monthly_housing_payment?: string;
  prev_address?: string;

  // employment & income
  employment_status?: EmploymentStatus;
  employer_name?: string;
  job_title?: string;
  work_phone?: string;
  years_employed?: string;
  months_employed?: string;
  gross_monthly_income?: string;
  other_income?: string;
  other_income_source?: string;

  // co-applicant (optional)
  has_co_applicant?: boolean;
  co_first_name?: string;
  co_last_name?: string;
  co_dob?: string;
  co_ssn?: string; // FULL — pass-through only, never stored
  co_email?: string;
  co_phone?: string;
  co_employer_name?: string;
  co_gross_monthly_income?: string;
  co_relationship?: string;

  // deal
  vehicle_id?: string;
  vin?: string;
  stock_number?: string;
  requested_down_payment?: string;
  desired_monthly_payment?: string;

  // e-signature / consent
  signature_name: string;
  consent_credit_pull: boolean;
  source_url?: string;

  // honeypot
  website?: string;
}

/** Redacted credit-application record as stored/read from Supabase. */
export interface CreditApplication {
  id: string;
  lead_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  dob: string | null;
  ssn_last4: string | null;
  drivers_license: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  housing_status: string | null;
  years_at_address: number | null;
  months_at_address: number | null;
  monthly_housing_payment: string | null;
  prev_address: string | null;
  employment_status: string | null;
  employer_name: string | null;
  job_title: string | null;
  work_phone: string | null;
  years_employed: number | null;
  months_employed: number | null;
  gross_monthly_income: string | null;
  other_income: string | null;
  other_income_source: string | null;
  co_first_name: string | null;
  co_last_name: string | null;
  co_dob: string | null;
  co_ssn_last4: string | null;
  co_email: string | null;
  co_phone: string | null;
  co_employer_name: string | null;
  co_gross_monthly_income: string | null;
  co_relationship: string | null;
  vehicle_id: string | null;
  vin: string | null;
  stock_number: string | null;
  requested_down_payment: string | null;
  desired_monthly_payment: string | null;
  signature_name: string;
  consent_credit_pull: boolean;
  signer_ip: string | null;
  signer_user_agent: string | null;
  signed_at: string;
  dc_pushed: boolean;
  dc_pushed_at: string | null;
  created_at: string;
}

export const CREDIT_APP_AUTHORIZATION_TEXT =
  "By typing my name below and submitting this application, I certify that the information provided is true and complete, and I authorize RydeTime Auto and its lending/financing partners to obtain my consumer credit report and to verify the information in this application for the purpose of evaluating my creditworthiness for a vehicle financing transaction. I understand this is an application only and does not guarantee financing approval or any particular terms. This authorization is a legally binding electronic signature under the federal E-SIGN Act and applicable state law.";
