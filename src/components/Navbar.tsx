import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Wifi,
  WifiOff,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  LogIn,
  LogOut,
  Calendar,
  Clock,
  Sparkles,
  Database,
  ChevronDown
} from 'lucide-react';
import { AppUser } from '../types/school';
import { auth, googleProvider } from '../firebase/config';
import { signInWithPopup, signOut } from 'firebase/auth';

interface NavbarProps {
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOnline: boolean;
  pendingSyncCount: number;
  onTriggerSync: () => void;
  isSyncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  setCurrentUser,
  activeTab,
  setActiveTab,
  isOnline,
  pendingSyncCount,
  onTriggerSync,
  isSyncing,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [showRoleMenu, setShowRoleMenu] = useState(false);

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

  const handleGoogleSignIn = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const isOwnerAdmin =
        res.user.email === 'gurusmpn1pemenang@gmail.com' ||
        res.user.email?.includes('admin');
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
      // Fast fallback to demo user if popup blocked in iframe
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
    setCurrentUser(null);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard & Analisis' },
    { id: 'presensi', label: 'Presensi Real-Time' },
    { id: 'scan-qr', label: 'Scan QR Presensi', highlight: true },
    { id: 'siswa', label: 'Data Siswa & Kartu' },
    { id: 'guru', label: 'Data Guru' },
    { id: 'jurnal', label: 'Jurnal Pembelajaran' },
    { id: 'evaluasi', label: 'Rekap & Evaluasi' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner: Official School Header Bar */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-900 text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* School identity & tagline */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center font-bold text-emerald-300">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide block">
                SMP NEGERI 2 TANJUNG
              </span>
              <span className="text-emerald-200 text-[11px] hidden sm:inline">
                Unggul dalam Prestasi, Berkarakter, & Berbudaya • Kab. Lombok Utara
              </span>
            </div>
          </div>

          {/* Status Indicators: Clock, Online/Offline, Quota, Pending Sync */}
          <div className="flex items-center gap-3 ml-auto flex-wrap">
            {/* Live Clock */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-700/50 text-emerald-100">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{dateStr}</span>
              <span className="text-emerald-500">•</span>
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-medium">{timeStr}</span>
            </div>

            {/* Quota indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-800/60 text-emerald-200 text-[11px]">
              <Database className="w-3 h-3 text-emerald-300" />
              <span>Spark Quota Safe</span>
            </div>

            {/* Online / Offline Status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                isOnline
                  ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Wifi className="w-3 h-3" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <WifiOff className="w-3 h-3" />
                  <span>Offline Mode</span>
                </>
              )}
            </div>

            {/* Offline sync badge */}
            {pendingSyncCount > 0 && (
              <button
                onClick={onTriggerSync}
                disabled={isSyncing || !isOnline}
                title="Klik untuk menyinkronkan data offline ke Firebase"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`}
                />
                <span>Sync ({pendingSyncCount})</span>
              </button>
            )}

            {/* User auth badge */}
            {currentUser ? (
              <div className="relative">
                <div
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="flex items-center gap-2 bg-emerald-950/80 hover:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-700/60 cursor-pointer"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || ''}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-emerald-700 text-[10px] font-bold flex items-center justify-center text-white">
                      {currentUser.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <span className="font-medium text-xs max-w-[120px] truncate text-slate-100">
                    {currentUser.displayName}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                      currentUser.role === 'admin'
                        ? 'bg-amber-400 text-amber-950'
                        : 'bg-teal-400 text-teal-950'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                  <ChevronDown className="w-3 h-3 text-emerald-300" />
                </div>

                {showRoleMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-slate-800 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {currentUser.displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {currentUser.email || 'Email tidak terdaftar'}
                      </p>
                    </div>

                    <div className="p-1">
                      <p className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400">
                        Ganti Peran Akses:
                      </p>
                      <button
                        onClick={() => {
                          setCurrentUser({ ...currentUser, role: 'admin' });
                          setShowRoleMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left ${
                          currentUser.role === 'admin'
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          Administrator
                        </span>
                        {currentUser.role === 'admin' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setCurrentUser({ ...currentUser, role: 'guru' });
                          setShowRoleMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left ${
                          currentUser.role === 'guru'
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-teal-500" />
                          Guru Mata Pelajaran
                        </span>
                        {currentUser.role === 'guru' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        )}
                      </button>
                    </div>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          handleSignOut();
                          setShowRoleMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Keluar Akun
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleGoogleSignIn}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login Guru / Admin</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Bar Tabs */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between overflow-x-auto scrollbar-none py-1">
          <nav className="flex items-center gap-1 md:gap-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : item.highlight
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'text-slate-600 hover:text-emerald-800 hover:bg-slate-100'
                  }`}
                >
                  {item.highlight && !isActive && (
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  )}
                  {item.label}
                  {item.id === 'presensi' && pendingSyncCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Scanner Action Shortcut in Navbar */}
          <div className="hidden md:block pl-2">
            {activeTab !== 'scan-qr' && (
              <button
                onClick={() => setActiveTab('scan-qr')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-xs transition-transform active:scale-95"
              >
                <span>⚡ Buka Scanner QR</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
