import React, { useState, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  FileCheck,
} from 'lucide-react';
import { LearningJournal, Teacher, UserRole, SchoolIdentitySettings } from '../types/school';
import { exportJournalsToExcel, exportJournalsToPDF } from '../utils/exportUtils';
import { useClickOutside } from '../utils/useClickOutside';
import { ClassDropdown } from './ClassDropdown';

interface LearningJournalViewProps {
  journals: LearningJournal[];
  teachers: Teacher[];
  onSaveJournal: (journal: LearningJournal) => Promise<void>;
  onDeleteJournal: (id: string) => Promise<void>;
  currentUserName: string;
  schoolSettings?: SchoolIdentitySettings;
}

export const LearningJournalView: React.FC<LearningJournalViewProps> = ({
  journals,
  teachers,
  onSaveJournal,
  onDeleteJournal,
  currentUserName,
  schoolSettings,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('SEMUA');
  const [filterTeacher, setFilterTeacher] = useState('SEMUA');

  const journalModalRef = useRef<HTMLDivElement>(null);
  useClickOutside(journalModalRef, () => setIsModalOpen(false));

  // Form state
  const [formData, setFormData] = useState<{
    teacherName: string;
    subject: string;
    className: string;
    date: string;
    period: string;
    topic: string;
    activities: string;
    studentAttendanceSummary: string;
    notes: string;
  }>({
    teacherName: currentUserName || (teachers[0]?.name ?? 'Drs. H. Suhartono, M.Pd.'),
    subject: teachers[0]?.subject ?? 'Matematika',
    className: '7A',
    date: todayStr,
    period: 'Jam 1-2 (07.30 - 09.00)',
    topic: '',
    activities: '',
    studentAttendanceSummary: 'Hadir: 31, Sakit: 0, Izin: 0, Alpa: 0',
    notes: '',
  });

  const classList = ['7A', '7B', '8A', '8B', '9A', '9B'];
  const periodOptions = [
    'Jam 1-2 (07.30 - 09.00)',
    'Jam 3-4 (09.15 - 10.45)',
    'Jam 5-6 (11.00 - 12.30)',
    'Jam 7-8 (13.00 - 14.30)',
  ];

  const handleTeacherChange = (teacherName: string) => {
    const matched = teachers.find((t) => t.name === teacherName);
    setFormData({
      ...formData,
      teacherName,
      subject: matched ? matched.subject : formData.subject,
    });
  };

  const handleOpenAdd = () => {
    setFormData({
      teacherName: currentUserName || (teachers[0]?.name ?? 'Drs. H. Suhartono, M.Pd.'),
      subject: teachers[0]?.subject ?? 'Matematika',
      className: '7A',
      date: todayStr,
      period: 'Jam 1-2 (07.30 - 09.00)',
      topic: '',
      activities: '',
      studentAttendanceSummary: 'Hadir: 31, Sakit: 0, Izin: 0, Alpa: 0',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic || !formData.activities) return;

    const newJournal: LearningJournal = {
      id: `jrn_${Date.now()}`,
      teacherName: formData.teacherName,
      subject: formData.subject,
      className: formData.className,
      date: formData.date,
      period: formData.period,
      topic: formData.topic.trim(),
      activities: formData.activities.trim(),
      studentAttendanceSummary: formData.studentAttendanceSummary.trim(),
      notes: formData.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    await onSaveJournal(newJournal);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, topic: string) => {
    if (window.confirm(`Hapus arsip jurnal "${topic}"?`)) {
      await onDeleteJournal(id);
    }
  };

  const filteredJournals = journals.filter((j) => {
    const matchSearch =
      j.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.activities.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = filterClass === 'SEMUA' || j.className === filterClass;
    const matchTeacher = filterTeacher === 'SEMUA' || j.teacherName === filterTeacher;
    return matchSearch && matchClass && matchTeacher;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-teal-700" />
            <span>Jurnal Agenda Pembelajaran Guru</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dokumentasi digital proses belajar mengajar, materi pokok, dan catatan evaluasi kelas {schoolSettings?.schoolName || 'SMP Negeri 1 Pemenang'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() =>
              exportJournalsToExcel(
                filteredJournals,
                `Jurnal_Pembelajaran_${(schoolSettings?.schoolName || 'SMPN1Pemenang').replace(/\s+/g, '_')}.xlsx`
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={() =>
              exportJournalsToPDF(
                filteredJournals,
                filterTeacher === 'SEMUA' ? 'Semua Guru' : filterTeacher,
                schoolSettings
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold border border-indigo-300 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Ekspor PDF</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jurnal Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari materi, aktivitas, atau mata pelajaran..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Filter Class with Interactive Auto-Closing Dropdown */}
        <ClassDropdown
          selectedClass={filterClass}
          onSelectClass={setFilterClass}
          classList={classList}
        />

        {/* Filter Teacher */}
        <select
          value={filterTeacher}
          onChange={(e) => setFilterTeacher(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-teal-500"
        >
          <option value="SEMUA">Semua Guru Pengampu</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* List of Learning Journals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredJournals.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            Tidak ada jurnal pembelajaran yang cocok dengan filter yang dipilih.
          </div>
        ) : (
          filteredJournals.map((j) => (
            <div
              key={j.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200 mb-1">
                      Kelas {j.className} • {j.period}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {j.subject}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleDelete(j.id, j.topic)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Hapus Jurnal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Materi Pokok / Capaian Pembelajaran:
                    </span>
                    <p className="font-semibold text-slate-800 leading-snug">
                      {j.topic}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Rincian Aktivitas Pembelajaran:
                    </span>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {j.activities}
                    </p>
                  </div>

                  {j.studentAttendanceSummary && (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-800 font-medium">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Rekap Kelas: {j.studentAttendanceSummary}</span>
                    </div>
                  )}

                  {j.notes && (
                    <div className="text-[11px] text-amber-800 bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                      <strong>Refleksi / Catatan:</strong> {j.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">
                  Guru: {j.teacherName}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {j.date}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Journal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div ref={journalModalRef} className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-teal-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-300" />
                <span>Tulis Jurnal Pembelajaran Baru</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-teal-700 text-teal-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Guru Pengampu
                  </label>
                  <select
                    value={formData.teacherName}
                    onChange={(e) => handleTeacherChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kelas
                  </label>
                  <select
                    value={formData.className}
                    onChange={(e) =>
                      setFormData({ ...formData, className: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {classList.map((c) => (
                      <option key={c} value={c}>
                        Kelas {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jam Ke-
                  </label>
                  <select
                    value={formData.period}
                    onChange={(e) =>
                      setFormData({ ...formData, period: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {periodOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Materi Pokok / Capaian Pembelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Operasi Aljabar dan Persamaan Linier Satu Variabel"
                  value={formData.topic}
                  onChange={(e) =>
                    setFormData({ ...formData, topic: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rincian Aktivitas Pembelajaran <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan metode mengajar, kegiatan diskusi kelompok, praktikum, atau latihan soal..."
                  value={formData.activities}
                  onChange={(e) =>
                    setFormData({ ...formData, activities: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ringkasan Kehadiran Siswa
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Hadir: 30, Sakit: 1, Izin: 0, Alpa: 0"
                  value={formData.studentAttendanceSummary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      studentAttendanceSummary: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Hambatan / Refleksi Kelas (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Siswa perlu pendalaman materi perkalian aljabar di pertemuan berikutnya"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
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
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-600 text-white shadow-xs"
                >
                  Simpan Jurnal Pembelajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
