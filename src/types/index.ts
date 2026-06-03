// ============================================================
// Trans KP App — Type Definitions
// ============================================================

export type Role = "super_admin" | "admin_cabang" | "karyawan";

export type AttendanceStatus =
  | "present"
  | "late"
  | "early_leave"
  | "absent"
  | "permission"
  | "sick";

export type GPSFlag = "valid" | "suspect" | "outside_geofence";

// ---- User / Profile ----
export interface User {
  id: string;
  nik: string;
  full_name: string;
  email: string;
  phone?: string;
  jabatan: string;
  role: Role;
  branch_id: string;
  branch_name?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Branch ----
export interface Branch {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Work Schedule ----
export interface WorkSchedule {
  id: string;
  branch_id: string;
  name: string;
  start_time: string; // "08:00"
  end_time: string; // "17:00"
  days_of_week: number[]; // [1,2,3,4,5]
  is_active: boolean;
}

// ---- Attendance ----
export interface Attendance {
  id: string;
  user_id: string;
  user_name?: string;
  user_nik?: string;
  branch_id: string;
  branch_name?: string;
  date: string;

  // Check In
  check_in_time?: string;
  check_in_lat?: number;
  check_in_lng?: number;
  check_in_photo_url?: string;
  check_in_accuracy?: number;

  // Check Out
  check_out_time?: string;
  check_out_lat?: number;
  check_out_lng?: number;
  check_out_photo_url?: string;
  check_out_accuracy?: number;

  // Status
  status: AttendanceStatus;
  gps_flag?: GPSFlag;
  notes?: string;

  created_at: string;
}

// ---- Hotel Visit ----
export interface HotelVisit {
  id: string;
  user_id: string;
  user_name?: string;
  hotel_name: string;

  // Check In
  check_in_time: string;
  check_in_lat?: number;
  check_in_lng?: number;
  hotel_photo_url?: string;
  selfie_check_in_url?: string;

  // Check Out
  check_out_time?: string;
  check_out_lat?: number;
  check_out_lng?: number;
  selfie_check_out_url?: string;

  // Duration
  duration_minutes?: number;
  notes?: string;

  created_at: string;
}

// ---- Location History ----
export interface LocationHistory {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

// ---- Device Fingerprint ----
export interface DeviceFingerprint {
  id: string;
  user_id: string;
  fingerprint_hash: string;
  user_agent: string;
  screen_resolution: string;
  timezone: string;
  language: string;
  platform: string;
  first_seen: string;
  last_seen: string;
}

// ---- Dashboard Stats ----
export interface DashboardStats {
  total_employees: number;
  present_today: number;
  late_today: number;
  absent_today: number;
  on_permission: number;
}

// ---- Geofence Check Result ----
export interface GeofenceResult {
  is_within: boolean;
  distance_meters: number;
  branch_name: string;
}

// ---- GPS Validation Result ----
export interface GPSValidation {
  accuracy_ok: boolean;
  accuracy_meters: number;
  mock_detected: boolean;
  server_time_ok: boolean;
  fingerprint_ok: boolean;
  velocity_ok: boolean;
  overall_valid: boolean;
  flags: string[];
}
