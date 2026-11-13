import React, { useState, useEffect } from 'react';
import {
  Menu,
  Clock,
  Calendar,
  QrCode,
  Wifi,
  WifiOff,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Database,
  Eye,
  UserCheck,
  ScanLine,
  User,
  LogOut,
} from 'lucide-react';
import { AppUser, UserRole, SchoolIdentitySettings } from '../types/school';

interface TopHeaderProps {
  onToggleMobileSidebar: () => void;
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  currentUser: AppUser | null;
  isOnline: boolean;
  schoolSettings?: SchoolIdentitySettings;
  onOpenProfile?: () => void;
  onLogout?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onToggleMobileSidebar,
  activeTab,
  onNavigateTab,
  currentUser,
  isOnline,
  schoolSettings,
  onOpenProfile,
  onLogout,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WITA'
      );
      setDateStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabLabels: { [key: string]: { title: string; subtitle: string } } = {
    dashboard: {
      title: 'Dasbor Presensi & Analisis',
      subtitle: 'Statistik kehadiran harian, grafik distribusi kelas, dan insight real-time',
    },
    'scan-qr': {
      title: 'Pos Scan QR Presensi',
      subtitle: 'Pemindai kamera presensi pintar kartu pelajar & ID pendidik',
    },
    jurnal: {
      title: 'Jurnal Pelajaran Guru',
      subtitle: 'Agenda pembelajaran digital harian, materi pokok, dan catatan kelas',
    },
    presensi: {
      title: 'Tabel Presensi Real-Time',
      subtitle: 'Daftar kehadiran harian, input kolektif kelas, dan ekspor resmi',
    },
    siswa: {
      title: 'Data Siswa & Kartu KTS',
      subtitle: 'Master data siswa, import Excel massal, dan kartu digital QR',
    },
    guru: {
      title: 'Data Guru & Tenaga Kependidikan',
      subtitle: 'Daftar pendidik, pengampu mata pelajaran, dan kartu ID QR',
    },
    evaluasi: {
      title: 'Rekap & Evaluasi Bulanan',
      subtitle: 'Laporan otomatis presensi bulanan dan pembinaan kesiswaan (BK)',
    },
    pengaturan: {
      title: 'Pengaturan Sistem & Administrasi',
      subtitle: 'Jam sekolah, kalender libur, identitas lembaga, dan manajemen akun',
    },
  };

  const currentTabInfo = tabLabels[activeTab] || {
    title: 'Portal Presensi Digital',
    subtitle: 'Sistem Informasi Manajemen Sekolah',
  };

  const roleNameMap: { [key in UserRole]: string } = {
    admin: 'Administrator',
    kepala_sekolah: 'Kepala Sekolah',
    guru: 'Guru Mapel',
    petugas: 'Petugas Scanner',
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Active Page Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-xl bg-slate-900 text-slate-100 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            title="Buka Menu Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span>{schoolSettings?.schoolName || 'SMP Negeri 1 Pemenang'}</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-emerald-700 font-bold">{currentTabInfo.title}</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {currentTabInfo.title}
            </h2>
          </div>
        </div>

        {/* Right: Role indicator, Clock & Quick Action */}
        <div className="flex items-center gap-3">
          {/* User Profile & Role Button */}
          {currentUser && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
              title="Buka Akun Saya & Ubah Sandi"
            >
              <User className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline font-bold text-slate-800">
                {currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Akun Saya'}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-200/80 text-emerald-900 font-extrabold uppercase tracking-wider">
                {roleNameMap[currentUser.role] || 'Pengguna'}
              </span>
            </button>
          )}

          {/* Cloud Firestore Status Badge */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              isOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-850 border-amber-200'
            }`}
            title={
              isOnline
                ? 'Terhubung ke Firebase Cloud Firestore (ai-studio-sistempresensiju-e915a2ee-fa86-4584-8525-3a5af911ac9b)'
                : 'Offline - Data disimpan di penyimpanan lokal perangkat'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold">
              {isOnline ? 'Firebase Cloud: Terhubung' : 'Mode Offline'}
            </span>
          </div>

          {/* Real-time Clock Card */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">{dateStr}</span>
            <span className="text-slate-300">•</span>
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-mono font-bold text-slate-900">{timeStr}</span>
          </div>

          {/* Logout Button */}
          {currentUser && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Keluar / Ganti Akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
