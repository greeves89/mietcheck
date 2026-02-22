export interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "member";
  is_active: boolean;
  address_street?: string;
  address_zip?: string;
  address_city?: string;
  subscription_tier: "free" | "premium";
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RentalContract {
  id: number;
  user_id: number;
  landlord_name: string;
  landlord_address?: string;
  property_address: string;
  apartment_size_sqm: string;
  apartment_floor?: string;
  monthly_advance_payment?: string;
  tenants_count: number;
  heating_type: string;
  contract_start_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillPosition {
  id: number;
  bill_id: number;
  category: string;
  name: string;
  total_amount: string;
  distribution_key?: string;
  tenant_share_percent?: string;
  tenant_amount?: string;
  is_allowed: boolean;
  reference_value_low?: string;
  reference_value_high?: string;
  is_plausible?: boolean;
  notes?: string;
  created_at: string;
}

export interface CheckResult {
  id: number;
  bill_id: number;
  check_type: string;
  severity: "ok" | "warning" | "error";
  title: string;
  description: string;
  recommendation?: string;
  created_at: string;
}

export interface UtilityBill {
  id: number;
  user_id: number;
  contract_id: number;
  billing_year: number;
  billing_period_start: string;
  billing_period_end: string;
  received_date?: string;
  total_costs?: string;
  total_advance_paid?: string;
  result_amount?: string;
  status: "pending" | "checked" | "objection_sent";
  check_score?: number;
  notes?: string;
  document_path?: string;
  created_at: string;
  updated_at: string;
  positions: BillPosition[];
  check_results: CheckResult[];
}

export interface ObjectionLetter {
  id: number;
  bill_id: number;
  content: string;
  objection_reasons?: string[];
  sent_date?: string;
  sent_via?: string;
  pdf_path?: string;
  created_at: string;
}

export interface Feedback {
  id: number;
  user_id: number;
  type: "bug" | "feature" | "general";
  title: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  admin_response?: string;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

export interface AdminStats {
  total_users: number;
  premium_users: number;
  total_bills: number;
  total_objections: number;
  total_feedback: number;
  pending_feedback: number;
  total_errors: number;
}
