export interface ChatSession {
  id: string;
  session_token: string;
  vehicle_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

export type ChatMode =
  | "find_car"
  | "ask_about_car"
  | "estimate_payment"
  | "test_drive"
  | "value_trade"
  | "get_approved"
  | "carfax"
  | "hold_vehicle"
  | "talk_to_ryan";

export interface ChatModeOption {
  mode: ChatMode;
  emoji: string;
  label: string;
  starter: string;
  vdpOnly?: boolean;
}

export const CHAT_MODES: ChatModeOption[] = [
  { mode: "find_car", emoji: "🔍", label: "Find me a car", starter: "I'm looking for a car. Can you help me find a good match?" },
  { mode: "ask_about_car", emoji: "💬", label: "Ask about this car", starter: "I have some questions about this vehicle.", vdpOnly: true },
  { mode: "estimate_payment", emoji: "💰", label: "Estimate my payment", starter: "Can you help me estimate a monthly payment?" },
  { mode: "test_drive", emoji: "📅", label: "Schedule a test drive", starter: "I'd like to schedule a test drive." },
  { mode: "value_trade", emoji: "🔄", label: "Value my trade", starter: "I have a vehicle I'd like to trade in. How does that work?" },
  { mode: "get_approved", emoji: "✅", label: "Get approved", starter: "I'd like to get pre-approved for financing." },
  { mode: "carfax", emoji: "📋", label: "Send me the Carfax", starter: "Can I get the Carfax report for a vehicle?" },
  { mode: "hold_vehicle", emoji: "🔒", label: "Hold this vehicle", starter: "I'd like to put a hold on a vehicle. How does that work?" },
  { mode: "talk_to_ryan", emoji: "📞", label: "Talk to Ryan", starter: "I'd like to talk to Ryan directly." },
];

/** Request body for POST /api/chat */
export interface ChatRequest {
  messages: { role: ChatRole; content: string }[];
  session_token: string;
  vehicle_id?: string;
}
