export type Env = Cloudflare.Env;

export type VehicleType =
  | "Tractor"
  | "Straight Truck"
  | "Trailer"
  | "Pickup / Service Truck"
  | "Other";

export type TruckStatus = "Active" | "In Shop" | "Inactive";

export type SafetyStatus = "overdue" | "due_soon" | "good" | "no_date";

export interface TruckRow {
  id: string;
  unit_number: string;
  vehicle_type: string;
  gvwr: string;
  license_plate: string;
  vin: string;
  year: number | null;
  make: string;
  model: string;
  equipment_type: string;
  last_inspection_date: string;
  next_due_date: string;
  interval_months: number;
  shop_name: string;
  sticker_number: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AttachmentRow {
  id: string;
  truck_id: string;
  inspection_id: string | null;
  file_name: string;
  content_type: string;
  size_bytes: number;
  r2_key: string;
  created_at: string;
}

export interface InspectionRow {
  id: string;
  truck_id: string;
  inspection_date: string;
  expiration_date: string;
  shop_name: string;
  sticker_number: string;
  notes: string;
  created_at: string;
  attachments?: AttachmentRow[];
}

export interface EnrichedTruck extends TruckRow {
  days_remaining: number | null;
  safety_status: SafetyStatus;
  attachment_count: number;
  latest_attachment?: AttachmentRow | null;
}

export interface AppSettings {
  warning_days: number;
  webhook_url: string;
  webhook_type: "auto" | "ntfy" | "discord" | "slack" | "generic";
  notify_days: string;
}
