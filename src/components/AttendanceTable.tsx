import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Filter,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  UserCheck,
  CheckCheck,
  ChevronDown,
  Layers,
  ArrowUpDown,
  RefreshCw,
  X,
  User,
  AlertTriangle,
} from 'lucide-react';
import { Attendance, Student, Teacher, AttendanceStatus, TargetType } from '../types/school';
import { exportAttendanceToExcel, exportAttendanceToPDF } from '../utils/exportUtils';
import { useClickOutside } from '../utils/useClickOutside';
import { ClassDropdown } from './ClassDropdown';

interface AttendanceTableProps {
  attendances: Attendance[];
  students: Student[];
  teachers: Teacher[];
  onRecordAttendance: (att: Attendance) => Promise<void>;
  onDeleteAttendance: (id: string) => Promise<void>;
  recordedBy: string;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  attendances,
  students,
  teachers,
  onRecordAttendance,
  onDeleteAttendance,
  recordedBy,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState<string>(todayStr);
  const [filterClass, setFilterClass] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');
  const [filterType, setFilterType] = useState<string>('SEMUA');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fast Batch Class Attendance Drawer / Modal
  const [isBatchModeOpen, setIsBatchModeOpen] = useState(false);
  const [batchClass, setBatchClass] = useState<string>('7A');
  const [batchSearchTerm, setBatchSearchTerm] = useState<string>('');
  const [batchOfficerName, setBatchOfficerName] = useState<string>(recordedBy || 'Wali Kelas / Guru Piket');
  const [batchStatuses, setBatchStatuses] = useState<{ [studentId: string]: AttendanceStatus }>({});

  const batchModalRef = useRef<HTMLDivElement>(null);
  useClickOutside(batchModalRef, () => setIsBatchModeOpen(false));

  const classList = ['7A', '7B', '8A', '8B', '9A', '9B'];

  // Open fast batch attendance mode
  const handleOpenBatch = (cls = '7A') => {
    setBatchClass(cls);
    setBatchSearchTerm('');
    setBatchOfficerName(recordedBy || 'Wali Kelas / Guru Piket');
    const classStudents = students.filter((s) => s.className === cls);
    const initialMap: { [id: string]: AttendanceStatus } = {};
    classStudents.forEach((s) => {
      const existing = attendances.find((a) => a.date === filterDate && a.targetId === s.id);
      initialMap[s.id] = existing ? existing.status : 'hadir';
    });
    setBatchStatuses(initialMap);
    setIsBatchModeOpen(true);
  };

  const handleBatchClassChange = (newCls: string) => {
    setBatchClass(newCls);
    const classStudents = students.filter((s) => s.className === newCls);
    const initialMap: { [id: string]: AttendanceStatus } = {};
    classStudents.forEach((s) => {
      const existing = attendances.find((a) => a.date === filterDate && a.targetId === s.id);
      initialMap[s.id] = existing ? existing.status : 'hadir';
    });
    setBatchStatuses(initialMap);
  };

  const handleMarkAllClassHadir = () => {
    const classStudents = students.filter((s) => s.className === batchClass);
    const updated = { ...batchStatuses };
    classStudents.forEach((s) => {
      updated[s.id] = 'hadir';
    });
    setBatchStatuses(updated);
  };

  const handleSaveBatchAttendance = async () => {
    const classStudents = students.filter((s) => s.className === batchClass);
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    for (const student of classStudents) {
      const status = batchStatuses[student.id] || 'hadir';
      const existing = attendances.find((a) => a.date === filterDate && a.targetId === student.id);
      const attItem: Attendance = {
        id: existing ? existing.id : `att_${Date.now()}_${student.id}`,
        targetType: 'siswa',
        targetId: student.id,
        targetName: student.name,
        nisnOrNip: student.nisn,
        className: student.className,
        date: filterDate,
        time: existing ? existing.time : nowTimeStr,
        status,
        type: 'masuk',
        notes: `Input Presensi Kolektif Kelas ${batchClass} (Petugas: ${batchOfficerName})`,
        recordedBy: batchOfficerName,
        createdAt: new Date().toISOString(),
      };
      await onRecordAttendance(attItem);
    }

    setIsBatchModeOpen(false);
  };

  // Filter attendances
  const filteredAttendances = attendances.filter((att) => {
    const matchDate = !filterDate || att.date === filterDate;
    const matchClass = filterClass === 'SEMUA' || att.className === filterClass;
    const matchStatus = filterStatus === 'SEMUA' || att.status === filterStatus;
    const matchType = filterType === 'SEMUA' || att.targetType === filterType;
    const matchSearch =
      att.targetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.nisnOrNip.includes(searchTerm);
    return matchDate && matchClass && matchStatus && matchType && matchSearch;
  });

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Hapus catatan presensi untuk ${name}?`)) {
      await onDeleteAttendance(id);
    }
  };

  // Batch students filtered by real-time modal search
  const batchStudents = students
    .filter((s) => s.className === batchClass)
    .filter(
      (s) =>
        s.name.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
        s.nisn.includes(batchSearchTerm) ||
        (s.nis && s.nis.includes(batchSearchTerm))
    );

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-700" />
            <span>Tabel Presensi Real-Time Siswa & Guru</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pantau kehadiran harian, kelola presensi kolektif kelas, dan ekspor data resmi sekolah
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Fast Class Presensi button */}
          <button
            onClick={() => handleOpenBatch(filterClass === 'SEMUA' ? '7A' : filterClass)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>Input Presensi Cepat Kelas</span>
          </button>

          {/* Export to Excel */}
          <button
            onClick={() =>
              exportAttendanceToExcel(
                filteredAttendances,
                `Presensi_SMPN2Tanjung_${filterDate || 'Semua'}.xlsx`
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          {/* Export to PDF */}
          <button
            onClick={() =>
              exportAttendanceToPDF(
                filteredAttendances,
                filterClass === 'SEMUA' ? 'Seluruh Kelas' : `Kelas ${filterClass}`,
                filterDate
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold border border-rose-300 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Ekspor PDF</span>
          </button>
        </div>
      </div>

      {/* Filter and Date Ribbon */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            Tanggal:
          </span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
          />
          {filterDate !== todayStr && (
            <button
              onClick={() => setFilterDate(todayStr)}
              className="text-emerald-700 font-bold hover:underline text-[11px] cursor-pointer"
            >
              Hari Ini
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau NISN/NIP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filter Type (Siswa / Guru) */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="SEMUA">Semua Kategori</option>
          <option value="siswa">Khusus Siswa</option>
          <option value="guru">Khusus Guru / Staf</option>
        </select>

        {/* Filter Class with Auto-Close Dropdown */}
        <ClassDropdown
          selectedClass={filterClass}
          onSelectClass={setFilterClass}
          classList={classList}
          allLabel="Semua Kelas"
        />

        {/* Filter Status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="SEMUA">Semua Status</option>
          <option value="hadir">Hadir</option>
          <option value="sakit">Sakit</option>
          <option value="izin">Izin</option>
          <option value="alpa">Alpa</option>
        </select>
      </div>

      {/* Main Attendance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 text-center w-12">No</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">NISN / NIP</th>
                <th className="py-3 px-4 text-center">Kelas / Mapel</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Petugas / Keterangan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Tidak ada catatan presensi pada tanggal dan filter ini.
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((att, idx) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      <div>{att.time}</div>
                      <div className="text-[10px] text-slate-400">{att.date}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          att.targetType === 'siswa'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {att.targetType === 'siswa' ? 'Siswa' : 'Guru'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {att.targetName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {att.nisnOrNip}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-emerald-800">
                      {att.className}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          att.status === 'hadir'
                            ? 'bg-emerald-100 text-emerald-800'
                            : att.status === 'sakit'
                            ? 'bg-blue-100 text-blue-800'
                            : att.status === 'izin'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-semibold text-slate-800">
                        {att.recordedBy || 'Petugas'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {att.isLate ? (
                          <span className="text-amber-600 font-bold">
                            ⚠️ Terlambat ({att.lateMinutes}m)
                          </span>
                        ) : (
                          att.notes || '-'
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(att.id, att.targetName)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus Presensi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: INPUT PRESENSI KELAS DENGAN SEARCH REAL-TIME & AUTO-CLOSE ================= */}
      {isBatchModeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            ref={batchModalRef}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95"
          >
            {/* Modal Header */}
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-200" />
                <div>
                  <h3 className="font-bold text-sm">
                    Input Presensi Cepat Kelas
                  </h3>
                  <p className="text-[11px] text-teal-200">
                    Pilih kelas, cari siswa real-time, dan tentukan status kehadiran sekaligus
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModeOpen(false)}
                className="text-teal-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Class Dropdown & Search & Officer Ribbon */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Dropdown Kelas */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pilih Kelas:
                  </label>
                  <ClassDropdown
                    selectedClass={batchClass}
                    onSelectClass={handleBatchClassChange}
                    classList={classList}
                    showAllOption={false}
                    className="w-full"
                  />
                </div>

                {/* Nama Pencatat / Petugas */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Petugas / Guru:
                  </label>
                  <input
                    type="text"
                    value={batchOfficerName}
                    onChange={(e) => setBatchOfficerName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                {/* Quick action button */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleMarkAllClassHadir}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition-colors cursor-pointer border border-emerald-300"
                  >
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                    <span>Tandai Semua Hadir</span>
                  </button>
                </div>
              </div>

              {/* Real-time Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Cari nama atau NISN di Kelas ${batchClass}...`}
                  value={batchSearchTerm}
                  onChange={(e) => setBatchSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Students list */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {batchStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Tidak ada siswa yang ditemukan di Kelas {batchClass}.
                </div>
              ) : (
                batchStudents.map((student, idx) => {
                  const currentStatus = batchStatuses[student.id] || 'hadir';
                  return (
                    <div
                      key={student.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 text-center text-xs font-bold text-slate-400">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">
                            {student.name}
                          </h4>
                          <span className="font-mono text-[10px] text-slate-400">
                            NISN: {student.nisn} {student.nis ? `| NIS: ${student.nis}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Status button group */}
                      <div className="flex items-center gap-1">
                        {(['hadir', 'sakit', 'izin', 'alpa'] as AttendanceStatus[]).map(
                          (status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() =>
                                setBatchStatuses({
                                  ...batchStatuses,
                                  [student.id]: status,
                                })
                              }
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase transition-all cursor-pointer ${
                                currentStatus === status
                                  ? status === 'hadir'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : status === 'sakit'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : status === 'izin'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {status}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Menampilkan {batchStudents.length} siswa
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModeOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveBatchAttendance}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-600 text-white shadow-xs cursor-pointer transition-colors"
                >
                  Simpan Presensi Kelas {batchClass}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
