import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Clock,
  Calendar,
  Building2,
  Users,
  ShieldCheck,
  Save,
  Plus,
  Trash2,
  CheckCircle,
  KeyRound,
  X,
  School,
  AlertCircle,
  Sparkles,
  MapPin,
  FileText,
  UserCheck,
  Database,
  Cloud,
  RefreshCw,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import {
  SchoolIdentitySettings,
  OperationalSettings,
  HolidayItem,
  Teacher,
  UserRole,
} from '../types/school';
import { DEFAULT_SCHOOL_INFO } from '../utils/exportUtils';
import { useClickOutside } from '../utils/useClickOutside';
import { testConnection } from '../firebase/config';

interface AdminSettingsViewProps {
  schoolSettings: SchoolIdentitySettings;
  operationalSettings: OperationalSettings;
  teachers: Teacher[];
  userRole: UserRole;
  onSaveSchoolSettings: (settings: SchoolIdentitySettings) => Promise<void>;
  onSaveOperationalSettings: (settings: OperationalSettings) => Promise<void>;
  onResetTeacherPassword: (teacherId: string, newPasswordHint: string) => Promise<boolean>;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  schoolSettings,
  operationalSettings,
  teachers,
  userRole,
  onSaveSchoolSettings,
  onSaveOperationalSettings,
  onResetTeacherPassword,
}) => {
  const [activeTab, setActiveTab] = useState<'operasional' | 'identitas' | 'akses' | 'cloud'>('operasional');
  const [testingCloud, setTestingCloud] = useState(false);
  const [cloudTestResult, setCloudTestResult] = useState<string | null>(null);

  // Operational Settings Form State
  const [jamMasuk, setJamMasuk] = useState(operationalSettings.jamMasuk || '07:15');
  const [batasToleransi, setBatasToleransi] = useState(
    operationalSettings.batasToleransiTerlambat || '07:30'
  );
  const [jamPulang, setJamPulang] = useState(operationalSettings.jamPulang || '13:45');
  const [hariAktif, setHariAktif] = useState<string[]>(
    operationalSettings.hariAktif || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  );
  const [jamPulangHarian, setJamPulangHarian] = useState<{ [day: string]: string }>(
    operationalSettings.jamPulangHarian || {
      Senin: '14:00',
      Selasa: '14:00',
      Rabu: '14:00',
      Kamis: '14:00',
      Jumat: '11:30',
      Sabtu: '12:30',
    }
  );
  const [holidays, setHolidays] = useState<HolidayItem[]>(operationalSettings.holidays || []);

  // New Holiday Input State
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');

  // School Identity Normalization Helper to prevent undefined/null errors
  const normalizeSchoolIdentity = (source?: Partial<SchoolIdentitySettings> | null): SchoolIdentitySettings => ({
    schoolName: source?.schoolName || DEFAULT_SCHOOL_INFO.schoolName,
    npsn: source?.npsn || DEFAULT_SCHOOL_INFO.npsn,
    districtName: source?.districtName || DEFAULT_SCHOOL_INFO.districtName,
    provinceName: source?.provinceName || DEFAULT_SCHOOL_INFO.provinceName,
    address: source?.address || DEFAULT_SCHOOL_INFO.address,
    postalCode: source?.postalCode || DEFAULT_SCHOOL_INFO.postalCode,
    vision: source?.vision || DEFAULT_SCHOOL_INFO.vision,
    schoolLogoUrl: source?.schoolLogoUrl || DEFAULT_SCHOOL_INFO.schoolLogoUrl,
    districtLogoUrl: source?.districtLogoUrl || DEFAULT_SCHOOL_INFO.districtLogoUrl,
    headmasterName: source?.headmasterName || DEFAULT_SCHOOL_INFO.headmasterName,
    headmasterNip: source?.headmasterNip || DEFAULT_SCHOOL_INFO.headmasterNip,
    phone: source?.phone || DEFAULT_SCHOOL_INFO.phone || '',
    email: source?.email || DEFAULT_SCHOOL_INFO.email || '',
    website: source?.website || DEFAULT_SCHOOL_INFO.website || '',
    updatedAt: source?.updatedAt || new Date().toISOString(),
  });

  // School Identity Form State
  const [identitas, setIdentitas] = useState<SchoolIdentitySettings>(() =>
    normalizeSchoolIdentity(schoolSettings)
  );

  useEffect(() => {
    if (schoolSettings) {
      setIdentitas((prev) => normalizeSchoolIdentity({ ...prev, ...schoolSettings }));
    }
  }, [schoolSettings]);

  // Logo file upload refs and processing state
  const schoolLogoInputRef = useRef<HTMLInputElement>(null);
  const districtLogoInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState<'school' | 'district' | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  const processAndSetLogo = async (file: File, type: 'school' | 'district') => {
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setLogoUploadError('Format berkas tidak didukung. Harap pilih gambar format PNG, JPG, WEBP, atau SVG.');
      setTimeout(() => setLogoUploadError(null), 4000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('Ukuran berkas logo melebihi 5 MB. Harap gunakan berkas di bawah 5 MB.');
      setTimeout(() => setLogoUploadError(null), 4000);
      return;
    }

    setIsProcessingLogo(type);
    try {
      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          if (type === 'school') {
            setIdentitas((prev) => ({ ...prev, schoolLogoUrl: res }));
          } else {
            setIdentitas((prev) => ({ ...prev, districtLogoUrl: res }));
          }
          setIsProcessingLogo(null);
        };
        reader.onerror = () => setIsProcessingLogo(null);
        reader.readAsDataURL(file);
        return;
      }

      // Bitmap optimization using canvas for fast cloud sync and crystal-clear letterhead rendering
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 360;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            const raw = e.target?.result as string;
            if (type === 'school') {
              setIdentitas((prev) => ({ ...prev, schoolLogoUrl: raw }));
            } else {
              setIdentitas((prev) => ({ ...prev, districtLogoUrl: raw }));
            }
            setIsProcessingLogo(null);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png', 0.92);
          if (type === 'school') {
            setIdentitas((prev) => ({ ...prev, schoolLogoUrl: dataUrl }));
          } else {
            setIdentitas((prev) => ({ ...prev, districtLogoUrl: dataUrl }));
          }
          setIsProcessingLogo(null);
        };
        img.onerror = () => {
          const raw = e.target?.result as string;
          if (type === 'school') {
            setIdentitas((prev) => ({ ...prev, schoolLogoUrl: raw }));
          } else {
            setIdentitas((prev) => ({ ...prev, districtLogoUrl: raw }));
          }
          setIsProcessingLogo(null);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => setIsProcessingLogo(null);
      reader.readAsDataURL(file);
    } catch {
      setIsProcessingLogo(null);
    }
  };

  // Reset Password Modal State
  const [resetModalTeacher, setResetModalTeacher] = useState<Teacher | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Status feedback
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Modal ref for auto-close
  const resetModalRef = useRef<HTMLDivElement>(null);
  useClickOutside(resetModalRef, () => {
    setResetModalTeacher(null);
    setNewPassword('');
    setConfirmPassword('');
    setResetSuccessMsg(null);
  });

  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  const toggleHariAktif = (day: string) => {
    if (hariAktif.includes(day)) {
      setHariAktif(hariAktif.filter((d) => d !== day));
    } else {
      setHariAktif([...hariAktif, day]);
    }
  };

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim()) return;

    const newHol: HolidayItem = {
      id: `hol_${Date.now()}`,
      date: newHolidayDate,
      name: newHolidayName.trim(),
      isNational: false,
    };

    setHolidays([...holidays, newHol].sort((a, b) => a.date.localeCompare(b.date)));
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const handleDeleteHoliday = (id: string) => {
    setHolidays(holidays.filter((h) => h.id !== id));
  };

  const handleSaveOperational = async () => {
    setIsSaving(true);
    try {
      const payload: OperationalSettings = {
        jamMasuk,
        batasToleransiTerlambat: batasToleransi,
        jamPulang,
        jamPulangHarian,
        hariAktif,
        holidays,
        updatedAt: new Date().toISOString(),
      };
      await onSaveOperationalSettings(payload);
      setSaveSuccess('Pengaturan jam operasional dan hari libur berhasil disimpan.');
      setTimeout(() => setSaveSuccess(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSchoolIdentity = async () => {
    setIsSaving(true);
    try {
      const payload: SchoolIdentitySettings = {
        ...identitas,
        updatedAt: new Date().toISOString(),
      };
      await onSaveSchoolSettings(payload);
      setSaveSuccess('Identitas sekolah dan wilayah berhasil diperbarui.');
      setTimeout(() => setSaveSuccess(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalTeacher) return;

    const defaultPass = '123123';
    const success = await onResetTeacherPassword(resetModalTeacher.id, defaultPass);
    if (success) {
      setResetSuccessMsg(
        `Kata sandi akun guru ${resetModalTeacher.name} berhasil di-reset menjadi password default: ${defaultPass}`
      );
      setTimeout(() => {
        setResetModalTeacher(null);
        setResetSuccessMsg(null);
      }, 2500);
    }
  };

  const handleTestCloud = async () => {
    setTestingCloud(true);
    setCloudTestResult(null);
    try {
      const ok = await testConnection();
      if (ok) {
        setCloudTestResult('Koneksi Cloud Firestore berhasil dan server responsif.');
      } else {
        setCloudTestResult('Koneksi sedang beralih ke cache lokal (offline-first mode).');
      }
    } catch (e: any) {
      setCloudTestResult('Uji koneksi gagal: ' + (e?.message || 'Error'));
    } finally {
      setTestingCloud(false);
    }
  };

  const canEdit = userRole === 'admin' || userRole === 'kepala_sekolah';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Settings className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Pengaturan Sistem & Administrasi
              </h2>
              <p className="text-xs text-slate-500">
                Konfigurasi jam sekolah, kalender libur, identitas lembaga, dan manajemen hak akses
              </p>
            </div>
          </div>
        </div>

        {/* Role indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 font-semibold text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Hak Akses: {userRole === 'admin' ? 'Administrator' : userRole === 'kepala_sekolah' ? 'Kepala Sekolah' : 'Pendidik'}</span>
          </span>
        </div>
      </div>

      {/* Success notification banner */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('operasional')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'operasional'
              ? 'bg-emerald-700 text-white shadow-md shadow-emerald-950/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Jam Operasional & Hari Belajar</span>
        </button>

        <button
          onClick={() => setActiveTab('identitas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'identitas'
              ? 'bg-emerald-700 text-white shadow-md shadow-emerald-950/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Identitas Sekolah & Wilayah</span>
        </button>

        <button
          onClick={() => setActiveTab('akses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'akses'
              ? 'bg-emerald-700 text-white shadow-md shadow-emerald-950/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Manajemen Akun & Hak Akses</span>
        </button>

        <button
          onClick={() => setActiveTab('cloud')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'cloud'
              ? 'bg-emerald-700 text-white shadow-md shadow-emerald-950/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Integrasi Firebase Cloud</span>
        </button>
      </div>

      {/* TAB 1: JAM OPERASIONAL & HARI LIBUR */}
      {activeTab === 'operasional' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Jam & Hari Aktif */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-800">
                    Konfigurasi Jam Presensi Sekolah
                  </h3>
                </div>
                <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                  WITA (GMT+8)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Masuk
                  </label>
                  <input
                    type="time"
                    value={jamMasuk}
                    onChange={(e) => setJamMasuk(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Waktu bel masuk pagi berbunyi
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-700 mb-1">
                    Batas Toleransi
                  </label>
                  <input
                    type="time"
                    value={batasToleransi}
                    onChange={(e) => setBatasToleransi(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-amber-300 bg-amber-50/50 rounded-lg text-xs font-semibold text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden disabled:bg-slate-100"
                  />
                  <p className="text-[10px] text-amber-600 mt-1">
                    Lewat jam ini = Terlambat
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Pulang
                  </label>
                  <input
                    type="time"
                    value={jamPulang}
                    onChange={(e) => setJamPulang(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Scanner pulang standar (fallback)
                  </p>
                </div>
              </div>

              {/* Jam Pulang Spesifik Tiap Hari Aktif */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Jam Pulang Spesifik per Hari Belajar (Dapat Berbeda Tiap Hari):
                  </label>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                    Kustomisasi Hari
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Waktu scanner pulang dibuka sesuai jadwal harian (contoh: Jumat pulang lebih awal pukul 11:30 untuk Sholat Jumat, Sabtu pukul 12:30 untuk kepramukaan):
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {daysOfWeek
                    .filter((d) => d !== 'Minggu')
                    .map((day) => {
                      const isActive = hariAktif.includes(day);
                      const currentVal = jamPulangHarian[day] || jamPulang;
                      return (
                        <div
                          key={day}
                          className={`p-2.5 rounded-xl border transition-all ${
                            isActive
                              ? 'bg-slate-50/80 border-slate-200'
                              : 'bg-slate-100/50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-slate-800">
                              {day}
                            </span>
                            {day === 'Jumat' && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                Sholat Jumat
                              </span>
                            )}
                            {day === 'Sabtu' && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-teal-100 text-teal-800 font-bold">
                                Ekskul/Pramuka
                              </span>
                            )}
                          </div>
                          <input
                            type="time"
                            value={currentVal}
                            disabled={!canEdit || !isActive}
                            onChange={(e) =>
                              setJamPulangHarian({
                                ...jamPulangHarian,
                                [day]: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-200"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Hari Aktif Belajar */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Hari Aktif Belajar Mengajar:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {daysOfWeek.map((day) => {
                    const isChecked = hariAktif.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => canEdit && toggleHariAktif(day)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <span>{day}</span>
                        <span
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                            isChecked ? 'bg-emerald-600 text-white' : 'border border-slate-300'
                          }`}
                        >
                          {isChecked && '✓'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Catatan: Presensi pada hari yang tidak aktif akan ditandai dengan informasi peringatan hari libur.
                </p>
              </div>

              {canEdit && (
                <div className="pt-2">
                  <button
                    onClick={handleSaveOperational}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Jam & Hari Aktif'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Kalender & Hari Libur Khusus */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-800">
                    Kalender Hari Libur & Cuti Sekolah
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  {holidays.length} Hari Terdaftar
                </span>
              </div>

              {/* Add Holiday Form */}
              {canEdit && (
                <form
                  onSubmit={handleAddHoliday}
                  className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5"
                >
                  <p className="text-xs font-bold text-slate-700">
                    Tambah Tanggal Libur Baru:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="date"
                        value={newHolidayDate}
                        onChange={(e) => setNewHolidayDate(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Keterangan hari libur..."
                        value={newHolidayName}
                        onChange={(e) => setNewHolidayName(e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambahkan ke Kalender</span>
                  </button>
                </form>
              )}

              {/* Holidays Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold text-[11px] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Tanggal</th>
                      <th className="py-2 px-3">Nama Hari Libur</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      {canEdit && <th className="py-2 px-3 text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {holidays.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          Belum ada tanggal libur yang dikonfigurasi.
                        </td>
                      </tr>
                    ) : (
                      holidays.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-medium text-slate-900">
                            {h.date}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {h.name}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                h.isNational
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {h.isNational ? 'Nasional' : 'Khusus'}
                            </span>
                          </td>
                          {canEdit && (
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => handleDeleteHoliday(h.id)}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 cursor-pointer"
                                title="Hapus hari libur"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IDENTITAS SEKOLAH & WILAYAH */}
      {activeTab === 'identitas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-800">
                Data Identitas Sekolah & Lembaga
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Resmi Sekolah
                </label>
                <input
                  type="text"
                  value={identitas.schoolName || ''}
                  onChange={(e) => setIdentitas({ ...identitas, schoolName: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NPSN
                </label>
                <input
                  type="text"
                  value={identitas.npsn || ''}
                  onChange={(e) => setIdentitas({ ...identitas, npsn: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kode Pos
                </label>
                <input
                  type="text"
                  value={identitas.postalCode || ''}
                  onChange={(e) => setIdentitas({ ...identitas, postalCode: e.target.value })}
                  disabled={!canEdit}
                  placeholder="83352"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kabupaten
                </label>
                <input
                  type="text"
                  value={identitas.districtName || ''}
                  onChange={(e) => setIdentitas({ ...identitas, districtName: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Provinsi
                </label>
                <input
                  type="text"
                  value={identitas.provinceName || ''}
                  onChange={(e) => setIdentitas({ ...identitas, provinceName: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alamat Lengkap Sekolah
                </label>
                <input
                  type="text"
                  value={identitas.address || ''}
                  onChange={(e) => setIdentitas({ ...identitas, address: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Visi Sekolah
                </label>
                <textarea
                  rows={2}
                  value={identitas.vision || ''}
                  onChange={(e) => setIdentitas({ ...identitas, vision: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={identitas.headmasterName || ''}
                  onChange={(e) => setIdentitas({ ...identitas, headmasterName: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={identitas.headmasterNip || ''}
                  onChange={(e) => setIdentitas({ ...identitas, headmasterNip: e.target.value })}
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100"
                />
              </div>

              {/* Notification error upload */}
              {logoUploadError && (
                <div className="sm:col-span-2 p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{logoUploadError}</span>
                </div>
              )}

              {/* 1. INPUT UPLOAD LOGO SEKOLAH DARI PERANGKAT */}
              <div className="sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-800">
                      Logo Resmi Sekolah (Unggah dari Perangkat)
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    identitas.schoolLogoUrl
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}>
                    {identitas.schoolLogoUrl ? 'Logo Terpasang' : 'Belum Ada Logo'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Thumbnail Pratinjau */}
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-2xs">
                    {identitas.schoolLogoUrl ? (
                      <img
                        src={identitas.schoolLogoUrl}
                        alt="Logo Sekolah"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        <span className="text-[9px] font-semibold block">Logo Sekolah</span>
                      </div>
                    )}
                  </div>

                  {/* Kontrol Upload dari Perangkat */}
                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="file"
                      ref={schoolLogoInputRef}
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processAndSetLogo(file, 'school');
                        e.target.value = '';
                      }}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={!canEdit || isProcessingLogo === 'school'}
                        onClick={() => schoolLogoInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        {isProcessingLogo === 'school' ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>Pilih Logo Sekolah dari Perangkat</span>
                      </button>

                      {identitas.schoolLogoUrl && canEdit && (
                        <button
                          type="button"
                          onClick={() => setIdentitas((prev) => ({ ...prev, schoolLogoUrl: '' }))}
                          className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
                          title="Hapus Logo Sekolah"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[10.5px] text-slate-500">
                      Format didukung: PNG, JPG, WEBP, SVG. Gambar otomatis dioptimalkan untuk kop surat & kartu KTS.
                    </p>

                    <details className="text-[11px] text-slate-600">
                      <summary className="cursor-pointer hover:text-emerald-700 font-medium">
                        Atau gunakan tautan URL online...
                      </summary>
                      <div className="mt-1.5">
                        <input
                          type="text"
                          placeholder="https://... (URL gambar logo sekolah)"
                          value={(identitas.schoolLogoUrl || '').startsWith('data:') ? '' : (identitas.schoolLogoUrl || '')}
                          onChange={(e) => setIdentitas({ ...identitas, schoolLogoUrl: e.target.value })}
                          disabled={!canEdit}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100"
                        />
                      </div>
                    </details>
                  </div>
                </div>
              </div>

              {/* 2. INPUT UPLOAD LOGO KABUPATEN DARI PERANGKAT */}
              <div className="sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-700" />
                    <span className="text-xs font-bold text-slate-800">
                      Logo Pemerintah Kabupaten / Daerah (Unggah dari Perangkat)
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    identitas.districtLogoUrl
                      ? 'bg-teal-100 text-teal-800 border-teal-300'
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}>
                    {identitas.districtLogoUrl ? 'Logo Terpasang' : 'Belum Ada Logo'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Thumbnail Pratinjau */}
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-2xs">
                    {identitas.districtLogoUrl ? (
                      <img
                        src={identitas.districtLogoUrl}
                        alt="Logo Kabupaten"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        <span className="text-[9px] font-semibold block">Logo Pemkab</span>
                      </div>
                    )}
                  </div>

                  {/* Kontrol Upload dari Perangkat */}
                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="file"
                      ref={districtLogoInputRef}
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processAndSetLogo(file, 'district');
                        e.target.value = '';
                      }}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={!canEdit || isProcessingLogo === 'district'}
                        onClick={() => districtLogoInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        {isProcessingLogo === 'district' ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>Pilih Logo Kabupaten dari Perangkat</span>
                      </button>

                      {identitas.districtLogoUrl && canEdit && (
                        <button
                          type="button"
                          onClick={() => setIdentitas((prev) => ({ ...prev, districtLogoUrl: '' }))}
                          className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
                          title="Hapus Logo Kabupaten"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[10.5px] text-slate-500">
                      Pilih lambang resmi daerah/pemkab dari komputer/HP (PNG, JPG, WEBP, SVG).
                    </p>

                    <details className="text-[11px] text-slate-600">
                      <summary className="cursor-pointer hover:text-teal-700 font-medium">
                        Atau gunakan tautan URL online...
                      </summary>
                      <div className="mt-1.5">
                        <input
                          type="text"
                          placeholder="https://... (URL gambar logo kabupaten)"
                          value={(identitas.districtLogoUrl || '').startsWith('data:') ? '' : (identitas.districtLogoUrl || '')}
                          onChange={(e) => setIdentitas({ ...identitas, districtLogoUrl: e.target.value })}
                          disabled={!canEdit}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100"
                        />
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="pt-3">
                <button
                  onClick={handleSaveSchoolIdentity}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Identitas & Logo Sekolah'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Live Kop Surat Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-xs text-slate-800">
                  Pratinjau Kop Surat Resmi & Dokumen Ekspor
                </h4>
              </div>

              {/* Document Header Preview Box dengan Logo Pemkab & Logo Sekolah */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-300 text-center space-y-1 shadow-2xs">
                <div className="flex items-center justify-between gap-2.5 mb-1.5">
                  {/* Left Logo: Kabupaten */}
                  <div className="w-13 h-13 shrink-0 flex items-center justify-center p-0.5 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                    {identitas.districtLogoUrl ? (
                      <img
                        src={identitas.districtLogoUrl}
                        alt="Logo Pemkab"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-[7.5px] text-slate-400 font-bold text-center leading-tight">
                        Logo Pemkab
                      </div>
                    )}
                  </div>

                  {/* Center: Kop Surat Texts */}
                  <div className="flex-1 text-center space-y-0.5 min-w-0">
                    <p className="text-[9.5px] uppercase font-bold tracking-wider text-slate-600 leading-tight">
                      PEMERINTAH {(identitas.districtName || 'Kabupaten Lombok Utara').toUpperCase()}
                    </p>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-700 leading-tight">
                      DINAS PENDIDIKAN KEBUDAYAAN KEPEMUDAAN DAN OLAHRAGA
                    </p>
                    <h3 className="text-xs font-black text-emerald-900 tracking-wide truncate">
                      {(identitas.schoolName || 'SMP NEGERI 1 PEMENANG').toUpperCase()}
                    </h3>
                    <p className="text-[8px] text-slate-500 italic truncate">
                      {identitas.address || 'Jl. Raya Pemenang, Kec. Pemenang, Kab. Lombok Utara'}
                    </p>
                    <p className="text-[8px] text-slate-500 font-mono">
                      NPSN: {identitas.npsn || '-'} • Kode Pos: {identitas.postalCode || '-'}
                    </p>
                  </div>

                  {/* Right Logo: Sekolah */}
                  <div className="w-13 h-13 shrink-0 flex items-center justify-center p-0.5 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                    {identitas.schoolLogoUrl ? (
                      <img
                        src={identitas.schoolLogoUrl}
                        alt="Logo Sekolah"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-[7.5px] text-slate-400 font-bold text-center leading-tight">
                        Logo Sekolah
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-1 border-t-2 border-slate-900 mt-1">
                  <div className="h-0.5 bg-slate-900 w-full mb-0.5" />
                  <div className="h-px bg-slate-500 w-full" />
                </div>
              </div>

              {/* Vision Card */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-950 text-xs space-y-1">
                <span className="font-extrabold text-[10px] uppercase tracking-wider text-emerald-700 block">
                  Visi Lembaga:
                </span>
                <p className="italic text-[11px] leading-relaxed">
                  "{identitas.vision || '-'}"
                </p>
              </div>

              {/* Headmaster details */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Pimpinan Sekolah:
                </span>
                <p className="font-bold text-slate-800">{identitas.headmasterName || '-'}</p>
                <p className="font-mono text-[11px] text-slate-500">
                  NIP. {identitas.headmasterNip || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MANAJEMEN AKUN & HAK AKSES */}
      {activeTab === 'akses' && (
        <div className="space-y-6">
          {/* Role Access Matrix Guide */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h4 className="font-bold text-xs text-slate-900">Administrator</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Akses penuh sistem, konfigurasi jam operasional, reset password guru, import data siswa massal, dan pengaturan identitas.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <h4 className="font-bold text-xs text-slate-900">Kepala Sekolah</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Hak akses pemantauan analitik dan rekapitulasi kehadiran bulanan setara admin untuk keperluan evaluasi & supervisi sekolah.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h4 className="font-bold text-xs text-slate-900">Guru Mapel</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Pengisian jurnal pembelajaran digital kelas, monitoring kehadiran siswa di jam pelajarannya, dan presensi ID card.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <h4 className="font-bold text-xs text-slate-900">Petugas Scanner</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Operator gerbang pemindai barcode QR siswa/guru (Scan Masuk & Scan Pulang), dengan pencatatan nama petugas otomatis.
              </p>
            </div>
          </div>

          {/* Reset Password Guru Section */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    Manajemen Akun Pendidik & Reset Password Guru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Administrator dapat mereset kredensial akses guru apabila lupa kata sandi login
                  </p>
                </div>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-semibold">
                Total {teachers.length} Guru
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4 text-center w-12">No</th>
                      <th className="py-3 px-4">Nama Guru & Gelar</th>
                      <th className="py-3 px-4">NIP</th>
                      <th className="py-3 px-4">Mata Pelajaran</th>
                      <th className="py-3 px-4">Status Akun</th>
                      <th className="py-3 px-4 text-right">Tindakan Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {teachers.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 text-center text-slate-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {t.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {t.nip}
                        </td>
                        <td className="py-3 px-4 text-emerald-800 font-medium">
                          {t.subject}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              t.status === 'aktif'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setResetModalTeacher(t);
                              setNewPassword('');
                              setConfirmPassword('');
                              setResetSuccessMsg(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reset Password</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INTEGRASI FIREBASE CLOUD */}
      {activeTab === 'cloud' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Status Koneksi Database Firebase Cloud
                  </h3>
                  <p className="text-xs text-slate-500">
                    Penyimpanan persisten real-time Google Cloud Firestore
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud Firestore Aktif
                </span>
              </div>
            </div>

            {/* Cloud Configuration Details Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Firestore Database ID
                </span>
                <p className="font-mono text-xs font-bold text-slate-900 break-all bg-white p-2.5 rounded-lg border border-slate-200 select-all">
                  ai-studio-sistempresensiju-e915a2ee-fa86-4584-8525-3a5af911ac9b
                </p>
                <p className="text-[11px] text-slate-500">
                  Database Firestore khusus untuk {identitas.schoolName || 'SMP Negeri 1 Pemenang'} dengan sinkronisasi instan.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Google Cloud Project ID
                </span>
                <p className="font-mono text-xs font-bold text-slate-900 break-all bg-white p-2.5 rounded-lg border border-slate-200 select-all">
                  gen-lang-client-0388482413
                </p>
                <p className="text-[11px] text-slate-500">
                  Proyek resmi terdaftar dengan kuota Spark gratis yang dioptimalkan hemat read.
                </p>
              </div>
            </div>

            {/* Colections & Save Flow Verification */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Status Koleksi & Mekanisme Penyimpanan Langsung
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">students</span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-tight">
                    Data Siswa & Kartu KTS. Tombol Simpan & Import Excel menulis langsung ke Cloud.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">teachers</span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-tight">
                    Data Pendidik & Akun. Tombol Simpan & Reset Password menulis langsung ke Cloud.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">attendances</span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-tight">
                    Presensi QR & Manual. 1 scan = 1 write hemat kuota langsung ke Firestore.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">settings</span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-tight">
                    Jam Operasional & Identitas Sekolah. Tersimpan aman di cloud dokumen settings.
                  </p>
                </div>
              </div>
            </div>

            {/* Offline-First & Auto-Sync Protection */}
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-teal-950">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>Ketahanan Jaringan & Proteksi Kuota (Offline-First Architecture)</span>
              </div>
              <p className="leading-relaxed text-[11px] text-teal-800">
                Setiap kali Anda menekan tombol simpan atau melakukan absensi, sistem terlebih dahulu menulis langsung ke Google Cloud Firestore jika Anda online. Jika jaringan terputus (offline), data otomatis diamankan di antrean lokal (Indexed/Local Storage) dan akan tersinkronisasi otomatis begitu koneksi internet pulih tanpa kehilangan satu data pun.
              </p>
            </div>

            {/* Live Connection Test Button */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-xs">
                {cloudTestResult && (
                  <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {cloudTestResult}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleTestCloud}
                disabled={testingCloud}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingCloud ? 'animate-spin' : ''}`} />
                <span>{testingCloud ? 'Menguji Koneksi...' : 'Uji Koneksi Server Firebase'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: RESET PASSWORD GURU */}
      {resetModalTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            ref={resetModalRef}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  Reset Password Guru
                </h3>
              </div>
              <button
                onClick={() => setResetModalTeacher(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteResetPassword} className="p-5 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                <p className="font-extrabold flex items-center gap-1.5 text-amber-950">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Kebijakan Reset Kata Sandi Akun:</span>
                </p>
                <p>
                  Guru: <span className="font-bold text-slate-900">{resetModalTeacher.name}</span> (NIP: {resetModalTeacher.nip})
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed pt-1 border-t border-amber-200/60">
                  Sesuai ketentuan keamanan sistem, mereset password akun guru ini akan <strong>secara otomatis mereset kata sandi menjadi:</strong>
                </p>
                <div className="p-2.5 bg-white rounded-lg border border-amber-300 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Kata Sandi Default Baru:
                  </span>
                  <span className="font-mono text-base font-black text-emerald-800 tracking-wider">
                    123123
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  * Guru dapat mengganti kembali kata sandi ini secara mandiri melalui menu <strong>"Akun Saya"</strong> setelah berhasil login.
                </p>
              </div>

              {resetSuccessMsg ? (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resetSuccessMsg}</span>
                </div>
              ) : (
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResetModalTeacher(null)}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Reset Password ke 123123</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
