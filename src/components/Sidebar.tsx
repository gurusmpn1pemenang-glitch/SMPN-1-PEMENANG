import React, { useState, useRef } from 'react';
import {
  LayoutDashboard,
  QrCode,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Users,
  BarChart3,
  Wifi,
  WifiOff,
  RefreshCw,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Database,
  ChevronDown,
  X,
  School,
  ChevronRight,
  Settings,
  Eye,
  ScanLine,
  User,
  KeyRound,
} from 'lucide-react';
import { AppUser, UserRole, SchoolIdentitySettings } from '../types/school';
import { auth, googleProvider } from '../firebase/config';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useClickOutside } from '../utils/useClickOutside';

interface SidebarProps {
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOnline: boolean;
  pendingSyncCount: number;
  onTriggerSync: () => void;
  isSyncing: boolean;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  schoolSettings?: SchoolIdentitySettings;
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  setCurrentUser,
  activeTab,
  setActiveTab,
  isOnline,
  pendingSyncCount,
  onTriggerSync,
  isSyncing,
  isOpenMobile,
  setIsOpenMobile,
  schoolSettings,
  onOpenProfile,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  // Auto-close role dropdown when clicking outside
  const roleMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(roleMenuRef, () => setShowRoleMenu(false));

  const handleGoogleSignIn = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const isOwnerAdmin =
        res.user.email === 'gurusmpn1pemenang@gmail.com' ||
        res.user.email?.toLowerCase().includes('admin');
      const newUser: AppUser = {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName || 'Guru / Staf',
        photoURL: res.user.photoURL,
        role: isOwnerAdmin ? 'admin' : 'guru',
      };
      setCurrentUser(newUser);
    } catch (err) {
      console.warn('Google popup error, switching to demo mode:', err);
      setCurrentUser({
        uid: 'user_admin_demo',
        email: 'gurusmpn1pemenang@gmail.com',
        displayName: 'Ahmad Fauzi, S.Kom. (Admin)',
        photoURL: null,
        role: 'admin',
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    localStorage.removeItem('smpn2tj_auth_user');
    setCurrentUser(null);
  };

  const userRole = currentUser?.role || 'guru';

  // Navigation Items
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dasbor Presensi',
      icon: LayoutDashboard,
      badge: null,
      visibleTo: ['admin', 'kepala_sekolah', 'guru', 'petugas'],
    },
    {
      id: 'scan-qr',
      label: 'Pos Scan QR',
      icon: QrCode,
      badge: 'LIVE',
      isHighlight: true,
      visibleTo: ['admin', 'kepala_sekolah', 'guru', 'petugas'],
    },
    {
      id: 'jurnal',
      label: 'Jurnal Pelajaran',
      icon: BookOpen,
      badge: null,
      visibleTo: ['admin', 'kepala_sekolah', 'guru'],
    },
    {
      id: 'presensi',
      label: 'Tabel Presensi',
      icon: ClipboardCheck,
      badge: pendingSyncCount > 0 ? `${pendingSyncCount}` : null,
      visibleTo: ['admin', 'kepala_sekolah', 'guru', 'petugas'],
    },
    {
      id: 'siswa',
      label: 'Data Siswa & KTS',
      icon: GraduationCap,
      badge: null,
      visibleTo: ['admin', 'kepala_sekolah', 'guru'],
    },
    {
      id: 'guru',
      label: 'Data Guru',
      icon: Users,
      badge: null,
      visibleTo: ['admin', 'kepala_sekolah', 'guru'],
    },
    {
      id: 'evaluasi',
      label: 'Rekap & Evaluasi',
      icon: BarChart3,
      badge: null,
      visibleTo: ['admin', 'kepala_sekolah', 'guru'],
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan Sistem',
      icon: Settings,
      badge: null,
      visibleTo: ['admin', 'kepala_sekolah'],
    },
    {
      id: 'profil',
      label: 'Akun Saya (Profil)',
      icon: User,
      badge: null,
      visibleTo: ['admin', 'kepala_sekolah', 'guru', 'petugas'],
    },
  ];

  const handleMenuClick = (id: string) => {
    if (id === 'profil' && onOpenProfile) {
      onOpenProfile();
    } else {
      setActiveTab(id);
    }
    setIsOpenMobile(false);
  };

  const roleLabels: { [key in UserRole]: { label: string; badgeClass: string; icon: any } } = {
    admin: {
      label: 'Administrator',
      badgeClass: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
      icon: ShieldCheck,
    },
    kepala_sekolah: {
      label: 'Kepala Sekolah',
      badgeClass: 'bg-indigo-400/20 text-indigo-300 border-indigo-400/30',
      icon: Eye,
    },
    guru: {
      label: 'Guru Mapel',
      badgeClass: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
      icon: UserCheck,
    },
    petugas: {
      label: 'Petugas Scanner',
      badgeClass: 'bg-teal-400/20 text-teal-300 border-teal-400/30',
      icon: ScanLine,
    },
  };

  const currentRoleInfo = roleLabels[userRole] || roleLabels.guru;

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col border-r border-slate-800/80 shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 1. App Name & School Branding Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-lg shadow-emerald-950 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950/40 rounded-[10px] flex items-center justify-center">
                <School className="w-5 h-5 text-emerald-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-sm tracking-wider text-white">
                  {schoolSettings?.schoolName ? schoolSettings.schoolName.toUpperCase() : 'SMPN 2 TANJUNG'}
                </h1>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[11px] font-medium text-emerald-400/90 leading-tight">
                SIM Presensi & Jurnal Digital
              </p>
              <p className="text-[9px] text-slate-400">
                {schoolSettings?.districtName || 'Kabupaten Lombok Utara, NTB'}
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setIsOpenMobile(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. User Profile Section with Click-Outside Dropdown */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40" ref={roleMenuRef}>
          {currentUser ? (
            <div className="relative">
              <div
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || ''}
                      className="w-9 h-9 rounded-full object-cover border border-emerald-500/50 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0 border border-emerald-400/30">
                      {currentUser.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div className="overflow-hidden leading-tight text-left">
                    <span className="block font-bold text-xs text-slate-100 truncate group-hover:text-white">
                      {currentUser.displayName}
                    </span>
                    <span className="block text-[10px] text-slate-400 truncate mt-0.5">
                      {currentUser.email || 'Akun Pendidik Terverifikasi'}
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border tracking-wide ${currentRoleInfo.badgeClass}`}
                      >
                        {currentRoleInfo.label}
                      </span>
                    </div>
                  </div>
                </div>

                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-white transition-transform" />
              </div>

              {/* Role Dropdown Menu */}
              {showRoleMenu && (
                <div className="absolute left-0 right-0 mt-2 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 py-2 text-slate-200 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-slate-800">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Ubah Peran Akses Login:
                    </p>
                  </div>

                  <div className="p-1 space-y-1">
                    {/* Role: Admin */}
                    <button
                      onClick={() => {
                        setCurrentUser({ ...currentUser, role: 'admin' });
                        setShowRoleMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left cursor-pointer ${
                        currentUser.role === 'admin'
                          ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/60'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        Administrator Sistem
                      </span>
                      {currentUser.role === 'admin' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>

                    {/* Role: Kepala Sekolah */}
                    <button
                      onClick={() => {
                        setCurrentUser({ ...currentUser, role: 'kepala_sekolah' });
                        setShowRoleMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left cursor-pointer ${
                        currentUser.role === 'kepala_sekolah'
                          ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/60'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-indigo-400" />
                        Kepala Sekolah (Analitik)
                      </span>
                      {currentUser.role === 'kepala_sekolah' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>

                    {/* Role: Guru Mapel */}
                    <button
                      onClick={() => {
                        setCurrentUser({ ...currentUser, role: 'guru' });
                        setShowRoleMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left cursor-pointer ${
                        currentUser.role === 'guru'
                          ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/60'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                        Guru Mata Pelajaran
                      </span>
                      {currentUser.role === 'guru' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>

                    {/* Role: Petugas Scanner */}
                    <button
                      onClick={() => {
                        setCurrentUser({ ...currentUser, role: 'petugas' });
                        setShowRoleMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left cursor-pointer ${
                        currentUser.role === 'petugas'
                          ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/60'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ScanLine className="w-4 h-4 text-teal-400" />
                        Petugas Scanner / Piket
                      </span>
                      {currentUser.role === 'petugas' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  </div>

                  <div className="border-t border-slate-800 mt-1 pt-1 px-1">
                    <button
                      onClick={() => {
                        handleSignOut();
                        setShowRoleMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar Akun</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Direct Profile & Password Management Button */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenProfile) onOpenProfile();
                  else setActiveTab('profil');
                }}
                className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 text-[11px] font-bold transition-all cursor-pointer shadow-xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>Akun Saya & Ubah Sandi</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Login Akun Guru / Admin</span>
            </button>
          )}
        </div>

        {/* 3. Main Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Menu Utama
              </span>
              <Sparkles className="w-3 h-3 text-emerald-500/80" />
            </div>

            <nav className="space-y-1">
              {menuItems
                .filter((item) => item.visibleTo.includes(userRole))
                .map((item) => {
                  const isActive = activeTab === item.id;
                  const IconComponent = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-lg shadow-emerald-950/60 font-bold border border-emerald-500/40'
                          : item.isHighlight
                          ? 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-800/60'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-white/10 text-white'
                              : item.isHighlight
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-left leading-tight tracking-wide">
                          {item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.badge && (
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-white text-emerald-900'
                                : item.isHighlight
                                ? 'bg-amber-400 text-slate-950 animate-pulse'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {isActive && (
                          <ChevronRight className="w-3.5 h-3.5 text-emerald-200 opacity-80" />
                        )}
                      </div>
                    </button>
                  );
                })}
            </nav>
          </div>
        </div>

        {/* 4. Bottom Connectivity & Quota Card */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 space-y-2.5">
          {/* Status Online/Offline */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="font-semibold text-slate-300 text-[11px]">
                {isOnline ? 'Koneksi Terhubung' : 'Mode Offline'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {isOnline ? 'Real-Time' : 'Lokal'}
            </span>
          </div>

          {/* Pending Sync trigger */}
          {pendingSyncCount > 0 && (
            <button
              onClick={onTriggerSync}
              disabled={isSyncing || !isOnline}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Antrean Sync ({pendingSyncCount})</span>
              </span>
              <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-black">
                SYNC
              </span>
            </button>
          )}

          {/* Spark Free Tier Safe Indicator */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Firebase Spark Safe</span>
            </span>
            <span className="text-emerald-400 font-mono">Anti-Loop</span>
          </div>
        </div>
      </aside>
    </>
  );
};
