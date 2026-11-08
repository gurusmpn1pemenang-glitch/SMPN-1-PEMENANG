import React, { useState } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  User,
  KeyRound,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  School,
  Lock,
  ChevronRight,
  UserCheck,
  ArrowRight,
  Building,
} from 'lucide-react';
import { AppUser, Teacher, UserRole, SchoolIdentitySettings } from '../types/school';
import { auth, googleProvider } from '../firebase/config';
import { signInWithPopup } from 'firebase/auth';

interface LoginPageProps {
  teachers: Teacher[];
  schoolSettings?: SchoolIdentitySettings;
  onLoginSuccess: (user: AppUser, requiresPasswordChange?: boolean) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  teachers,
  schoolSettings,
  onLoginSuccess,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('guru');
  const [identifier, setIdentifier] = useState<string>(''); // NIP or email/username
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto-fill sample for quick testing
  const handleQuickSelectTeacher = (t: Teacher) => {
    setSelectedRole('guru');
    setIdentifier(t.nip);
    setPassword(t.password || '123123');
    setErrorMsg(null);
  };

  const handleRoleTabChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg(null);
    setPassword('');
    if (role === 'guru') {
      setIdentifier(teachers[0]?.nip || '197608122002121003');
      setPassword('123123');
    } else if (role === 'kepala_sekolah') {
      setIdentifier('kepsek');
      setPassword('123123');
    } else if (role === 'admin') {
      setIdentifier('admin');
      setPassword('123123');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      setErrorMsg('Mohon isi Username / NIP dan Kata Sandi.');
      setIsSubmitting(false);
      return;
    }

    if (selectedRole === 'guru') {
      // Find teacher by NIP, email, or name
      const matchedTeacher = teachers.find(
        (t) =>
          t.nip === cleanId ||
          t.email?.toLowerCase() === cleanId.toLowerCase() ||
          t.name.toLowerCase().includes(cleanId.toLowerCase())
      );

      if (!matchedTeacher) {
        setErrorMsg(
          `NIP "${cleanId}" tidak ditemukan dalam daftar guru SMPN 2 Tanjung. Pastikan NIP sudah terdaftar di Manajemen Akun.`
        );
        setIsSubmitting(false);
        return;
      }

      // Check teacher password (default 123123 if not set)
      const validPass = matchedTeacher.password || '123123';
      if (cleanPass !== validPass) {
        setErrorMsg(
          'Kata sandi salah. Kata sandi default guru adalah "123123", atau hubungi Admin jika telah di-reset.'
        );
        setIsSubmitting(false);
        return;
      }

      const isDefaultPassword = validPass === '123123';
      const appUser: AppUser = {
        uid: matchedTeacher.id,
        email: matchedTeacher.email || `${matchedTeacher.nip}@guru.smpn2tanjung.sch.id`,
        displayName: matchedTeacher.name,
        photoURL: matchedTeacher.photoUrl || null,
        role: 'guru',
      };

      onLoginSuccess(appUser, isDefaultPassword);
      setIsSubmitting(false);
      return;
    }

    if (selectedRole === 'kepala_sekolah') {
      // Validate Kepala Sekolah
      const isKepsekId =
        cleanId.toLowerCase() === 'kepsek' ||
        cleanId.toLowerCase() === 'kepalasekolah' ||
        cleanId === '197001011995011001' ||
        cleanId.toLowerCase().includes('kepsek');

      if (!isKepsekId && cleanPass !== '123123') {
        setErrorMsg('Username atau kata sandi Kepala Sekolah tidak sesuai.');
        setIsSubmitting(false);
        return;
      }

      if (cleanPass !== '123123' && cleanPass !== 'admin123') {
        setErrorMsg('Kata sandi Kepala Sekolah salah. Sandi default: 123123.');
        setIsSubmitting(false);
        return;
      }

      const kepsekUser: AppUser = {
        uid: 'user_kepsek_01',
        email: 'kepsek@smpn2tanjung.sch.id',
        displayName: schoolSettings?.headmasterName || 'Drs. H. Ahmad Dahlan, M.Pd. (Kepsek)',
        photoURL: null,
        role: 'kepala_sekolah',
      };

      onLoginSuccess(kepsekUser, cleanPass === '123123');
      setIsSubmitting(false);
      return;
    }

    if (selectedRole === 'admin') {
      // Validate Admin
      const isAdminId =
        cleanId.toLowerCase() === 'admin' ||
        cleanId.toLowerCase() === 'gurusmpn1pemenang@gmail.com' ||
        cleanId.toLowerCase() === 'operator';

      if (!isAdminId && cleanPass !== '123123') {
        setErrorMsg('Username atau kata sandi Administrator tidak sesuai.');
        setIsSubmitting(false);
        return;
      }

      if (cleanPass !== '123123' && cleanPass !== 'admin123') {
        setErrorMsg('Kata sandi Administrator salah. Sandi default: 123123.');
        setIsSubmitting(false);
        return;
      }

      const adminUser: AppUser = {
        uid: 'demo_admin_user',
        email: 'gurusmpn1pemenang@gmail.com',
        displayName: 'Ahmad Fauzi, S.Kom. (Admin Presensi)',
        photoURL: null,
        role: 'admin',
      };

      onLoginSuccess(adminUser, false);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const isAdmin =
        user.email === 'gurusmpn1pemenang@gmail.com' ||
        user.email?.toLowerCase().includes('admin');

      const appUser: AppUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Pengguna',
        photoURL: user.photoURL,
        role: isAdmin ? 'admin' : 'guru',
      };

      onLoginSuccess(appUser, false);
    } catch (err: any) {
      console.warn('Google sign-in canceled or failed:', err);
      setErrorMsg('Login dengan Akun Google dibatalkan atau gagal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      {/* Background Decorative glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10 space-y-6">
        {/* School Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-950/40 border border-emerald-400/30 p-2 mx-auto">
            <School className="w-9 h-9 text-white" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
              {schoolSettings?.districtName || 'KABUPATEN LOMBOK UTARA'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {schoolSettings?.schoolName || 'SMP NEGERI 2 TANJUNG'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Sistem Informasi Kehadiran QR & Jurnal Pembelajaran Digital
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Role Selector Tabs */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Pilih Peran Akun untuk Masuk:
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleRoleTabChange('guru')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRole === 'guru'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4 mb-1" />
                <span>Guru Mapel</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleTabChange('kepala_sekolah')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRole === 'kepala_sekolah'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Building className="w-4 h-4 mb-1" />
                <span>Kepala Sekolah</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleTabChange('admin')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRole === 'admin'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 mb-1" />
                <span>Administrator</span>
              </button>
            </div>
          </div>

          {/* Role Guide Notice */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              {selectedRole === 'guru' && (
                <span>
                  <strong>Login Guru:</strong> Masukkan <strong>NIP</strong> sebagai User ID dan
                  kata sandi default <code className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono font-bold">123123</code>.
                </span>
              )}
              {selectedRole === 'kepala_sekolah' && (
                <span>
                  <strong>Login Kepala Sekolah:</strong> Hak akses pemantauan analitik kehadiran,
                  laporan bulanan, dan evaluasi setara admin. Sandi default: <code className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono font-bold">123123</code>.
                </span>
              )}
              {selectedRole === 'admin' && (
                <span>
                  <strong>Login Admin:</strong> Akses penuh pengaturan sekolah, konfigurasi jam,
                  dan manajemen akun guru. Sandi default: <code className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-mono font-bold">123123</code>.
                </span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {selectedRole === 'guru' ? 'Nomor Induk Pegawai (NIP)' : 'Username / Email'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    selectedRole === 'guru'
                      ? 'Contoh: 197608122002121003'
                      : selectedRole === 'kepala_sekolah'
                      ? 'kepsek atau NIP Kepala Sekolah'
                      : 'admin atau gurusmpn1pemenang@gmail.com'
                  }
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ketik kata sandi (default: 123123)..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Kata sandi awal bagi pendidik baru atau setelah reset adalah: <span className="font-mono text-emerald-400 font-bold">123123</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black tracking-wider uppercase shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Memverifikasi Akun...' : 'Masuk ke Aplikasi'}</span>
            </button>
          </form>

          {/* Quick Demo Selector for Guru */}
          {selectedRole === 'guru' && teachers.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                Pilih Cepat Akun Guru untuk Pengujian:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {teachers.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleQuickSelectTeacher(t)}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-emerald-500 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <User className="w-3 h-3 text-emerald-400" />
                    <span>{t.name.split(',')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Google Sign In option */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Masuk dengan Akun Google</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>
            NPSN: {schoolSettings?.npsn || '50205566'} • {schoolSettings?.address || 'Kec. Tanjung, Kab. Lombok Utara'}
          </p>
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Terintegrasi Database Cloud Firestore & Akses Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};
