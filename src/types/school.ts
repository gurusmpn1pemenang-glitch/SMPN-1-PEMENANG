export type Gender = 'L' | 'P';
export type StudentStatus = 'aktif' | 'mutasi' | 'lulus';
export type TeacherStatus = 'aktif' | 'nonaktif';
export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpa';
export type TargetType = 'siswa' | 'guru';
export type UserRole = 'admin' | 'kepala_sekolah' | 'guru' | 'petugas';

export interface Student {
  id: string;
  nisn: string;
  nis?: string;
  name: string;
  gender: Gender;
  className: string; // e.g. "7A", "7B", "8A", "8B", "9A", "9B"
  birthPlaceDate?: string; // Tempat & Tanggal Lahir, e.g. "Tanjung, 12 Mei 2011"
  address?: string;
  parentPhone?: string; // No HP Orang Tua
  parentName?: string; // Nama Orang Tua
  drivePhotoUrl?: string; // Link Drive Foto Siswa
  phone?: string;
  status: StudentStatus;
  qrCode: string; // format: "SMPN2TJ-SISWA-{nisn}"
  photoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Teacher {
  id: string;
  nip: string;
  name: string;
  subject: string;
  phone?: string;
  email?: string;
  status: TeacherStatus;
  qrCode: string; // format: "SMPN2TJ-GURU-{nip}"
  photoUrl?: string;
  password?: string;
  lastPasswordReset?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Attendance {
  id: string;
  targetType: TargetType;
  targetId: string;
  targetName: string;
  nisnOrNip: string;
  className: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  status: AttendanceStatus;
  notes?: string;
  recordedBy: string; // Nama Petugas yang merekam presensi
  type?: 'masuk' | 'pulang'; // Scan Masuk atau Scan Pulang
  isLate?: boolean; // Menandai jika terlambat melewati batas toleransi
  lateMinutes?: number; // Jumlah menit terlambat
  isEarlyDeparture?: boolean; // Pulang mendahului jam operasional
  syncStatus?: 'synced' | 'pending';
  createdAt: string;
}

export interface LearningJournal {
  id: string;
  teacherId?: string;
  teacherName: string;
  subject: string;
  className: string;
  date: string; // "YYYY-MM-DD"
  period: string; // e.g. "Jam 1-2 (07.30 - 09.00)"
  topic: string; // Materi pokok / Capaian Pembelajaran
  activities: string; // Rincian kegiatan pembelajaran
  studentAttendanceSummary?: string; // e.g. "Hadir: 30, Sakit: 1, Izin: 1, Alpa: 0"
  notes?: string; // Catatan evaluasi / hambatan kelas
  syncStatus?: 'synced' | 'pending';
  createdAt: string;
}

export interface MonthlyReport {
  id: string;
  monthYear: string; // e.g. "November 2026"
  className: string;
  totalStudents: number;
  totalDays: number;
  averageAttendanceRate: number; // e.g. 96.5
  hadirCount: number;
  sakitCount: number;
  izinCount: number;
  alpaCount: number;
  generatedAt: string;
  generatedBy: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  isCustomAdmin?: boolean;
}

// Pengaturan Jam Operasional & Hari Aktif Belajar
export interface HolidayItem {
  id: string;
  date: string; // "YYYY-MM-DD"
  name: string;
  isNational: boolean;
}

export interface OperationalSettings {
  jamMasuk: string; // Default "07:15"
  batasToleransiTerlambat: string; // Default "07:30"
  jamPulang: string; // Default "13:45"
  jamPulangHarian?: { [dayName: string]: string }; // e.g. { Senin: "14:00", Jumat: "11:30", Sabtu: "12:30" }
  hariAktif: string[]; // ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
  holidays: HolidayItem[];
  updatedAt: string;
}

// Pengaturan Identitas Sekolah & Wilayah
export interface SchoolIdentitySettings {
  schoolName: string; // "SMP Negeri 2 Tanjung"
  npsn: string; // "50205566"
  districtName: string; // "Kabupaten Lombok Utara"
  provinceName: string; // "Nusa Tenggara Barat"
  address: string; // "Jl. Raya Tanjung - Bayan, Sokong, Kec. Tanjung, Kab. Lombok Utara"
  postalCode: string; // "83352"
  vision: string; // Visi sekolah
  schoolLogoUrl: string; // Logo sekolah
  districtLogoUrl: string; // Logo kabupaten
  headmasterName: string; // Nama Kepala Sekolah
  headmasterNip: string; // NIP Kepala Sekolah
  phone?: string;
  email?: string;
  website?: string;
  updatedAt: string;
}
