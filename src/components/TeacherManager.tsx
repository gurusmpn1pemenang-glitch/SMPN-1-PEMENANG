import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  QrCode,
  Printer,
  Download,
  Search,
  BookOpen,
  X,
  Phone,
  Mail,
  School,
  CheckCircle,
} from 'lucide-react';
import { Teacher, TeacherStatus, UserRole, SchoolIdentitySettings } from '../types/school';
import { SCHOOL_INFO } from '../utils/exportUtils';
import { useClickOutside } from '../utils/useClickOutside';

interface TeacherManagerProps {
  teachers: Teacher[];
  onSaveTeacher: (teacher: Teacher) => Promise<void>;
  onDeleteTeacher: (id: string) => Promise<void>;
  userRole: UserRole;
  schoolSettings?: SchoolIdentitySettings;
}

export const TeacherManager: React.FC<TeacherManagerProps> = ({
  teachers,
  onSaveTeacher,
  onDeleteTeacher,
  userRole,
  schoolSettings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Card modal state
  const [cardTeacher, setCardTeacher] = useState<Teacher | null>(null);
  const [teacherQrUrl, setTeacherQrUrl] = useState<string>('');

  const formModalRef = useRef<HTMLDivElement>(null);
  useClickOutside(formModalRef, () => setIsModalOpen(false));

  const cardModalRef = useRef<HTMLDivElement>(null);
  useClickOutside(cardModalRef, () => setCardTeacher(null));

  const [formData, setFormData] = useState<{
    nip: string;
    name: string;
    subject: string;
    phone: string;
    email: string;
    status: TeacherStatus;
  }>({
    nip: '',
    name: '',
    subject: 'Matematika',
    phone: '',
    email: '',
    status: 'aktif',
  });

  const subjectList = [
    'Matematika',
    'Bahasa Indonesia',
    'Ilmu Pengetahuan Alam (IPA)',
    'Ilmu Pengetahuan Sosial (IPS)',
    'Bahasa Inggris',
    'Pendidikan Agama Islam (PAI)',
    'Pendidikan Agama Hindu',
    'Pendidikan Pancasila & Kewarganegaraan (PPKn)',
    'PJOK / Penjasorkes',
    'Seni Budaya & Prakarya',
    'Informatika / TIK',
    'Bimbingan Konseling (BK)',
  ];

  useEffect(() => {
    if (cardTeacher) {
      QRCode.toDataURL(cardTeacher.qrCode, {
        width: 200,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setTeacherQrUrl(url))
        .catch((err) => console.error(err));
    }
  }, [cardTeacher]);

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormData({
      nip: '',
      name: '',
      subject: 'Matematika',
      phone: '',
      email: '',
      status: 'aktif',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setFormData({
      nip: t.nip,
      name: t.name,
      subject: t.subject,
      phone: t.phone || '',
      email: t.email || '',
      status: t.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nip || !formData.name) return;

    const qrCode = `SMPN2TJ-GURU-${formData.nip}`;
    const newTeacher: Teacher = {
      id: editingTeacher ? editingTeacher.id : `tch_${Date.now()}`,
      nip: formData.nip.trim(),
      name: formData.name.trim(),
      subject: formData.subject,
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      status: formData.status,
      qrCode,
      createdAt: editingTeacher ? editingTeacher.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveTeacher(newTeacher);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus data guru ${name}?`)) {
      await onDeleteTeacher(id);
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    return (
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.nip.includes(searchTerm) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-700" />
            <span>Data Guru & Tenaga Kependidikan</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Data tenaga pendidik {schoolSettings?.schoolName || 'SMP Negeri 1 Pemenang'}, kartu ID QR presensi mandiri, dan pengampu mata pelajaran
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Guru Baru</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama guru, NIP, atau mata pelajaran..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total Terdata: <strong className="text-teal-800">{teachers.length} Guru</strong>
        </div>
      </div>

      {/* Teachers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher) => (
          <div
            key={teacher.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-teal-800 text-sm">
                  {teacher.name[0]}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(teacher)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-teal-700 transition-colors"
                    title="Edit Data Guru"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(teacher.id, teacher.name)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Hapus Guru"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm leading-snug">
                  {teacher.name}
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  NIP. {teacher.nip}
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="font-semibold text-slate-800">
                    {teacher.subject}
                  </span>
                </div>
                {teacher.phone && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{teacher.phone}</span>
                  </div>
                )}
                {teacher.email && (
                  <div className="flex items-center gap-2 text-slate-500 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{teacher.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  teacher.status === 'aktif'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {teacher.status}
              </span>

              <button
                onClick={() => setCardTeacher(teacher)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 transition-colors cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-teal-700" />
                <span>Kartu ID QR</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Teacher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div ref={formModalRef} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-teal-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-300" />
                <span>{editingTeacher ? 'Edit Data Guru' : 'Tambah Guru Baru'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-teal-700 text-teal-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP (Nomor Induk Pegawai) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 198204152006042018"
                  value={formData.nip}
                  onChange={(e) =>
                    setFormData({ ...formData, nip: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Hj. Rohana, S.Pd."
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran yang Diampu
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {subjectList.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081907654321"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as TeacherStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="aktif">Aktif Mengajar</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Akun
                </label>
                <input
                  type="email"
                  placeholder="Contoh: guru@smpn1pemenang.sch.id"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-600 text-white shadow-xs"
                >
                  Simpan Data Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher ID Card Modal */}
      {cardTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div ref={cardModalRef} className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <School className="w-4 h-4 text-teal-400" />
                <span>Kartu Identitas Guru {schoolSettings?.schoolName || 'SMP Negeri 1 Pemenang'}</span>
              </h3>
              <button
                onClick={() => setCardTeacher(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-slate-100 flex flex-col items-center">
              <div className="w-full max-w-[340px] rounded-2xl bg-white shadow-lg overflow-hidden border border-slate-300 text-slate-800">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-teal-900 text-white p-3.5 text-center relative border-b-2 border-amber-400">
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

                {/* Details */}
                <div className="p-4 space-y-3">
                  <div className="text-xs space-y-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">
                      Nama Pendidik
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm block">
                      {cardTeacher.name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-600 block">
                      NIP. {cardTeacher.nip}
                    </span>
                    <div className="pt-1">
                      <span className="inline-block px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold text-[11px] border border-teal-200">
                        {cardTeacher.subject}
                      </span>
                    </div>
                  </div>

                  {/* QR */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-center">
                      {teacherQrUrl && (
                        <img
                          src={teacherQrUrl}
                          alt="QR Code"
                          className="w-20 h-20 rounded-md border border-slate-300 bg-white p-0.5"
                        />
                      )}
                      <span className="text-[8px] font-mono text-slate-400 block mt-0.5">
                        QR Presensi Guru
                      </span>
                    </div>

                    <div className="text-right text-[9px] space-y-0.5">
                      <span className="text-slate-400 block">Mengetahui,</span>
                      <span className="font-semibold block text-slate-700">
                        Kepala Sekolah
                      </span>
                      <div className="h-7 flex items-center justify-end">
                        <span className="text-[8px] italic text-teal-700 font-serif">
                          [Tanda Tangan Digital]
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 block">
                        {schoolSettings?.headmasterName || SCHOOL_INFO.headmasterName}
                      </span>
                      <span className="text-[8px] text-slate-500 block font-mono">
                        {schoolSettings?.headmasterNip || SCHOOL_INFO.headmasterNip}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-teal-950 text-teal-300 text-[8px] py-1 text-center font-medium">
                  Kartu ini sah untuk presensi harian pendidik {schoolSettings?.schoolName || 'SMP Negeri 1 Pemenang'}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <a
                href={teacherQrUrl}
                download={`QR_Guru_${cardTeacher.name.replace(/\s+/g, '_')}.png`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Unduh Gambar QR</span>
              </a>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu Guru</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
