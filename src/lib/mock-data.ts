import { User, Branch, Attendance, HotelVisit, WorkSchedule, DashboardStats } from "@/types";

// ============================================================
// Mock Branches
// ============================================================
export const mockBranches: Branch[] = [
  {
    id: "branch-001",
    name: "Kantor Pusat Surabaya",
    address: "Jl. Raya Darmo No. 45, Surabaya",
    latitude: -7.257472,
    longitude: 112.752090,
    radius_meters: 100,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "branch-002",
    name: "Cabang Jakarta",
    address: "Jl. Sudirman No. 12, Jakarta Pusat",
    latitude: -6.2088,
    longitude: 106.8456,
    radius_meters: 150,
    is_active: true,
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "branch-003",
    name: "Cabang Semarang",
    address: "Jl. Pemuda No. 78, Semarang",
    latitude: -6.9666,
    longitude: 110.4196,
    radius_meters: 100,
    is_active: true,
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
  },
];

// ============================================================
// Mock Users
// ============================================================
export const mockCurrentUser: User = {
  id: "user-001",
  nik: "TKP-001",
  full_name: "Ahmad Rizki Pratama",
  email: "ahmad.rizki@transkp.com",
  phone: "081234567890",
  jabatan: "Driver",
  role: "karyawan",
  branch_id: "branch-001",
  branch_name: "Kantor Pusat Surabaya",
  is_active: true,
  created_at: "2024-01-10T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
};

export const mockCurrentAdmin: User = {
  id: "user-999",
  nik: "TKP-999",
  full_name: "Super Administrator",
  email: "admin@transkp.com",
  phone: "081234567899",
  jabatan: "IT Administrator",
  role: "super_admin",
  branch_id: "branch-001",
  branch_name: "Kantor Pusat Surabaya",
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
};

export const mockUsers: User[] = [
  mockCurrentUser,
  mockCurrentAdmin,
  {
    id: "user-002",
    nik: "TKP-002",
    full_name: "Siti Nurhaliza",
    email: "siti.nur@transkp.com",
    phone: "081234567891",
    jabatan: "Admin Operasional",
    role: "admin_cabang",
    branch_id: "branch-001",
    branch_name: "Kantor Pusat Surabaya",
    is_active: true,
    created_at: "2024-01-10T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "user-003",
    nik: "TKP-003",
    full_name: "Budi Santoso",
    email: "budi.s@transkp.com",
    phone: "081234567892",
    jabatan: "Driver",
    role: "karyawan",
    branch_id: "branch-001",
    branch_name: "Kantor Pusat Surabaya",
    is_active: true,
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "user-004",
    nik: "TKP-004",
    full_name: "Dewi Kartika",
    email: "dewi.k@transkp.com",
    phone: "081234567893",
    jabatan: "Driver",
    role: "karyawan",
    branch_id: "branch-002",
    branch_name: "Cabang Jakarta",
    is_active: true,
    created_at: "2024-02-15T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "user-005",
    nik: "TKP-005",
    full_name: "Eko Prasetyo",
    email: "eko.p@transkp.com",
    phone: "081234567894",
    jabatan: "Mekanik",
    role: "karyawan",
    branch_id: "branch-001",
    branch_name: "Kantor Pusat Surabaya",
    is_active: true,
    created_at: "2024-03-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "user-006",
    nik: "TKP-006",
    full_name: "Fitri Handayani",
    email: "fitri.h@transkp.com",
    phone: "081234567895",
    jabatan: "HRD",
    role: "karyawan",
    branch_id: "branch-002",
    branch_name: "Cabang Jakarta",
    is_active: false,
    created_at: "2024-01-20T00:00:00Z",
    updated_at: "2024-05-01T00:00:00Z",
  },
  {
    id: "user-007",
    nik: "TKP-007",
    full_name: "Gunawan Wibowo",
    email: "gunawan.w@transkp.com",
    phone: "081234567896",
    jabatan: "Driver",
    role: "karyawan",
    branch_id: "branch-003",
    branch_name: "Cabang Semarang",
    is_active: true,
    created_at: "2024-04-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "user-008",
    nik: "TKP-008",
    full_name: "Hendra Kusuma",
    email: "hendra.k@transkp.com",
    phone: "081234567897",
    jabatan: "Supervisor",
    role: "admin_cabang",
    branch_id: "branch-002",
    branch_name: "Cabang Jakarta",
    is_active: true,
    created_at: "2024-01-15T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
  },
];

// ============================================================
// Mock Schedules
// ============================================================
export const mockSchedules: WorkSchedule[] = [
  {
    id: "sched-001",
    branch_id: "branch-001",
    name: "Shift Pagi",
    start_time: "07:00",
    end_time: "15:00",
    days_of_week: [1, 2, 3, 4, 5],
    is_active: true,
  },
  {
    id: "sched-002",
    branch_id: "branch-001",
    name: "Shift Siang",
    start_time: "14:00",
    end_time: "22:00",
    days_of_week: [1, 2, 3, 4, 5],
    is_active: true,
  },
  {
    id: "sched-003",
    branch_id: "branch-001",
    name: "Shift Malam",
    start_time: "22:00",
    end_time: "06:00",
    days_of_week: [1, 2, 3, 4, 5, 6],
    is_active: true,
  },
];

// ============================================================
// Mock Attendances (last 7 days)
// ============================================================
function generateAttendances(): Attendance[] {
  const records: Attendance[] = [];
  const users = mockUsers.filter((u) => u.role === "karyawan");
  const statuses: Array<{ status: Attendance["status"]; gps: Attendance["gps_flag"] }> = [
    { status: "present", gps: "valid" },
    { status: "late", gps: "valid" },
    { status: "present", gps: "valid" },
    { status: "present", gps: "suspect" },
    { status: "absent", gps: undefined },
    { status: "present", gps: "valid" },
    { status: "permission", gps: undefined },
  ];

  for (let d = 0; d < 7; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split("T")[0];

    users.forEach((user, idx) => {
      const combo = statuses[(d + idx) % statuses.length];
      const isAbsent = combo.status === "absent" || combo.status === "permission" || combo.status === "sick";
      const checkInHour = combo.status === "late" ? 8 : 7;
      const checkInMin = combo.status === "late" ? Math.floor(Math.random() * 30) + 10 : Math.floor(Math.random() * 15);

      records.push({
        id: `att-${dateStr}-${user.id}`,
        user_id: user.id,
        user_name: user.full_name,
        user_nik: user.nik,
        branch_id: user.branch_id,
        branch_name: user.branch_name,
        date: dateStr,
        check_in_time: isAbsent ? undefined : `${dateStr}T${String(checkInHour).padStart(2, "0")}:${String(checkInMin).padStart(2, "0")}:00Z`,
        check_in_lat: isAbsent ? undefined : -7.257472 + (Math.random() - 0.5) * 0.001,
        check_in_lng: isAbsent ? undefined : 112.752090 + (Math.random() - 0.5) * 0.001,
        check_in_photo_url: isAbsent ? undefined : "/placeholder-selfie.jpg",
        check_in_accuracy: isAbsent ? undefined : Math.random() * 15 + 3,
        check_out_time: isAbsent || d === 0 ? undefined : `${dateStr}T${String(15 + Math.floor(Math.random() * 2)).padStart(2, "0")}:${String(Math.floor(Math.random() * 30)).padStart(2, "0")}:00Z`,
        check_out_lat: isAbsent || d === 0 ? undefined : -7.257472 + (Math.random() - 0.5) * 0.001,
        check_out_lng: isAbsent || d === 0 ? undefined : 112.752090 + (Math.random() - 0.5) * 0.001,
        check_out_photo_url: isAbsent || d === 0 ? undefined : "/placeholder-selfie.jpg",
        check_out_accuracy: isAbsent || d === 0 ? undefined : Math.random() * 15 + 3,
        status: combo.status,
        gps_flag: combo.gps,
        notes: combo.status === "permission" ? "Izin keluarga" : combo.status === "sick" ? "Sakit demam" : undefined,
        created_at: `${dateStr}T07:00:00Z`,
      });
    });
  }

  return records;
}

export const mockAttendances: Attendance[] = generateAttendances();

// ============================================================
// Mock Hotel Visits
// ============================================================
export const mockHotelVisits: HotelVisit[] = [
  {
    id: "hotel-001",
    user_id: "user-001",
    user_name: "Ahmad Rizki Pratama",
    hotel_name: "Hotel Bintang 3 - Luminor",
    check_in_time: "2024-05-30T21:10:00Z",
    check_in_lat: -7.2575,
    check_in_lng: 112.7521,
    hotel_photo_url: "/placeholder-hotel.jpg",
    selfie_check_in_url: "/placeholder-selfie.jpg",
    check_out_time: "2024-05-31T05:30:00Z",
    check_out_lat: -7.2575,
    check_out_lng: 112.7521,
    selfie_check_out_url: "/placeholder-selfie.jpg",
    duration_minutes: 500,
    notes: "Perjalanan Surabaya - Jakarta",
    created_at: "2024-05-30T21:10:00Z",
  },
  {
    id: "hotel-002",
    user_id: "user-003",
    user_name: "Budi Santoso",
    hotel_name: "Hotel Ibis Budget",
    check_in_time: "2024-05-29T22:00:00Z",
    check_in_lat: -6.9175,
    check_in_lng: 107.6191,
    hotel_photo_url: "/placeholder-hotel.jpg",
    selfie_check_in_url: "/placeholder-selfie.jpg",
    check_out_time: "2024-05-30T06:00:00Z",
    check_out_lat: -6.9175,
    check_out_lng: 107.6191,
    selfie_check_out_url: "/placeholder-selfie.jpg",
    duration_minutes: 480,
    created_at: "2024-05-29T22:00:00Z",
  },
  {
    id: "hotel-003",
    user_id: "user-007",
    user_name: "Gunawan Wibowo",
    hotel_name: "RedDoorz Plus Semarang",
    check_in_time: "2024-05-31T20:30:00Z",
    check_in_lat: -6.9666,
    check_in_lng: 110.4196,
    hotel_photo_url: "/placeholder-hotel.jpg",
    selfie_check_in_url: "/placeholder-selfie.jpg",
    duration_minutes: undefined,
    created_at: "2024-05-31T20:30:00Z",
  },
];

// ============================================================
// Mock Dashboard Stats
// ============================================================
export const mockDashboardStats: DashboardStats = {
  total_employees: 45,
  present_today: 38,
  late_today: 3,
  absent_today: 2,
  on_permission: 2,
};

// ============================================================
// Mock Chart Data
// ============================================================
export const mockWeeklyChartData = [
  { day: "Sen", hadir: 42, terlambat: 2, absen: 1 },
  { day: "Sel", hadir: 40, terlambat: 3, absen: 2 },
  { day: "Rab", hadir: 43, terlambat: 1, absen: 1 },
  { day: "Kam", hadir: 41, terlambat: 2, absen: 2 },
  { day: "Jum", hadir: 39, terlambat: 4, absen: 2 },
  { day: "Sab", hadir: 20, terlambat: 1, absen: 0 },
  { day: "Min", hadir: 0, terlambat: 0, absen: 0 },
];

export const mockMonthlyChartData = [
  { month: "Jan", hadir: 95, terlambat: 3, absen: 2 },
  { month: "Feb", hadir: 92, terlambat: 5, absen: 3 },
  { month: "Mar", hadir: 96, terlambat: 2, absen: 2 },
  { month: "Apr", hadir: 90, terlambat: 6, absen: 4 },
  { month: "Mei", hadir: 94, terlambat: 4, absen: 2 },
  { month: "Jun", hadir: 38, terlambat: 3, absen: 2 },
];
