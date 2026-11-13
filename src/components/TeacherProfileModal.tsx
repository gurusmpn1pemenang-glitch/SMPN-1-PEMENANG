import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  User,
  KeyRound,
  ShieldCheck,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  BookOpen,
  QrCode,
  Printer,
  Download,
  School,
  Sparkles,
} from 'lucide-react';
import { AppUser, Teacher, SchoolIdentitySettings } from '../types/school';
import { useClickOutside } from '../utils/useClickOutside';

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  teachers: Teacher[];
  schoolSettings?: SchoolIdentitySettings;
  onUpdateProfile: (teacherId: string, data: Partial<Teacher>) => Promise<Teacher | null>;
  onChangePassword: (
    teacherId: string,
    oldPass: string,
    newPass: string
  ) => Promise<{ success: boolean; message: string }>;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  teachers,
  schoolSettings,
  onUpdateProfile,
  onChangePassword,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useClickOutside(modalRef, onClose, isOpen);

  const [activeTab, setActiveTab] = useState<'profil' | 'password' | 'kartu'>('profil');

  // Match current teacher from teachers list by email or displayName or fallback to first
  const currentTeacher =
    teachers.find(
      (t) =>
        t.email === currentUser?.email ||
        t.name.toLowerCase().includes((currentUser?.displayName || '').toLowerCase())
    ) || teachers[0];

  // Profile Form States
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');

  // Password Form States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Feedback states
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  // QR Code preview
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (currentTeacher) {
      setName(currentTeacher.name || '');
      setNip(currentTeacher.nip || '');
      setPhone(currentTeacher.phone || '');
      setEmail(currentTeacher.email || currentUser?.email || '');
      setSubject(currentTeacher.subject || 'Matematika');

      QRCode.toDataURL(currentTeacher.qrCode || `SMPN2TJ-GURU-${currentTeacher.nip}`, {
        width: 180,
        margin: 2,
        color: { dark: '#064e3b', light: '#ffffff' },
      })
        .then((url) => setQrDataUrl(url))
        .catch((e) => console.error(e));
    }
  }, [currentTeacher, currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeacher) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const updated = await onUpdateProfile(currentTeacher.id, {
        name: name.trim(),
        nip: nip.trim(),
        phone: phone.trim(),
        email: email.trim(),
        subject: subject.trim(),
      });
      if (updated) {
        setFeedback({
          type: 'success',
          message: 'Identitas profil guru berhasil diperbarui!',
        });
      } else {
        setFeedback({
          type: 'error',
          message: 'Gagal memperbarui profil guru.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeacher) return;
    setFeedback(null);

    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Konfirmasi kata sandi baru tidak cocok.' });
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'Kata sandi baru minimal harus 6 karakter.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await onChangePassword(currentTeacher.id, oldPassword, newPassword);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Gagal mengubah kata sandi.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95"
      >
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <User className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">
                Akun Saya — Profil Pendidik
              </h3>
              <p className="text-[11px] text-emerald-200">
                Kelola identitas pendidik, kontak, dan kata sandi login mandiri
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profil');
              setFeedback(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'profil'
                ? 'border-emerald-700 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Identitas Guru</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setFeedback(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'border-emerald-700 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Ubah Password</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('kartu');
              setFeedback(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'kartu'
                ? 'border-emerald-700 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Kartu ID Guru</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* TAB 1: EDIT IDENTITAS GURU */}
          {activeTab === 'profil' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap & Gelar Pendidik *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Drs. H. Suhartono, M.Pd."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIP (Nomor Induk Pegawai) *
                  </label>
                  <input
                    type="text"
                    required
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Contoh: 197608122002121003"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Pelajaran yang Diampu
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Contoh: Matematika"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. WhatsApp / Kontak
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081907654321"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Akun
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@guru.smpn1pemenang.sch.id"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Identitas'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: UBAH PASSWORD MANDIRI */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Petunjuk Keamanan Akun Pendidik:</span>
                </div>
                <p className="text-[11px]">
                  Jika belum pernah mengubah kata sandi atau akun Anda baru saja di-reset oleh Admin, kata sandi bawaan sementara adalah: <code className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold font-mono">123123</code>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Lama *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Ketik kata sandi saat ini (default: 123123)..."
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Baru *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Baru *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Ketik ulang kata sandi baru..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Perbarui Kata Sandi'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: KARTU IDENTITAS GURU */}
          {activeTab === 'kartu' && currentTeacher && (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-full max-w-[340px] rounded-2xl bg-white shadow-lg overflow-hidden border border-slate-300 text-slate-800">
                <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-3.5 text-center relative border-b-2 border-amber-400">
                  <div className="font-black tracking-wider text-xs">
                    {schoolSettings?.schoolName ? schoolSettings.schoolName.toUpperCase() : 'SMP NEGERI 1 PEMENANG'}
                  </div>
                  <p className="text-[9px] uppercase tracking-widest text-teal-200 font-semibold">
                    KARTU IDENTITAS GURU & PEGAWAI
                  </p>
                  <p className="text-[8px] text-teal-300">
                    {schoolSettings?.address || 'Kec. Pemenang, Kab. Lombok Utara, NTB'}
                  </p>
                </div>

                <div className="p-4 space-y-3">
                  <div className="text-xs space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">
                      Nama Pendidik
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm block">
                      {name || currentTeacher.name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-600 block">
                      NIP. {nip || currentTeacher.nip}
                    </span>
                    <div className="pt-1">
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[11px] border border-emerald-200">
                        {subject || currentTeacher.subject}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-center">
                      {qrDataUrl && (
                        <img
                          src={qrDataUrl}
                          alt="QR Code"
                          className="w-20 h-20 rounded-md border border-slate-300 bg-white p-0.5"
                        />
                      )}
                      <span className="text-[8px] font-mono text-slate-400 block mt-0.5">
                        QR Presensi Guru
                      </span>
                    </div>

                    <div className="text-right text-[9px] space-y-0.5">
                      <span className="text-slate-400 block">Status Akun:</span>
                      <span className="font-bold text-emerald-700 block">
                        Aktif Terverifikasi
                      </span>
                      <span className="text-[8px] text-slate-400 block">
                        {schoolSettings?.schoolName || 'SMP Negeri 1 Pemenang'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-950 text-emerald-300 text-[8px] py-1 text-center font-medium">
                  Kartu ini sah untuk presensi harian pendidik {schoolSettings?.schoolName || 'SMP Negeri 1 Pemenang'}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <a
                  href={qrDataUrl}
                  download={`QR_Guru_${(name || currentTeacher.name).replace(/\s+/g, '_')}.png`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Unduh Gambar QR</span>
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Kartu</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
