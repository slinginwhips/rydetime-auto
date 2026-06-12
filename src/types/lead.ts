export type LeadType =
  | "inquiry"
  | "test_drive"
  | "trade"
  | "finance"
  | "hold"
  | "chat"
  | "matchmaker"
  | "price_drop"
  | "carfax";

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
