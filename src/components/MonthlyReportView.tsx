import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Calendar,
  AlertTriangle,
  Award,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Users,
  Printer,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Student, Attendance, MonthlyReport } from '../types/school';
import { exportMonthlyReportToPDF, exportAttendanceToExcel } from '../utils/exportUtils';
import { ClassDropdown } from './ClassDropdown';

interface MonthlyReportViewProps {
  students: Student[];
  attendances: Attendance[];
  currentUserName: string;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  students,
  attendances,
  currentUserName,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('11'); // November
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedClass, setSelectedClass] = useState<string>('7A');

  const monthNames: { [key: string]: string } = {
    '01': 'Januari',
    '02': 'Februari',
    '03': 'Maret',
    '04': 'April',
    '05': 'Mei',
    '06': 'Juni',
    '07': 'Juli',
    '08': 'Agustus',
    '09': 'September',
    '10': 'Oktober',
    '11': 'November',
    '12': 'Desember',
  };

  const classList = ['7A', '7B', '8A', '8B', '9A', '9B'];
  const currentMonthYearName = `${monthNames[selectedMonth]} ${selectedYear}`;

  // Filter students for selected class
  const classStudents = students.filter((s) => s.className === selectedClass);

  // Filter attendances for selected month & year
  const prefix = `${selectedYear}-${selectedMonth}`;
  const monthAttendances = attendances.filter((a) => a.date.startsWith(prefix));
  const classMonthAtts = monthAttendances.filter(
    (a) => a.targetType === 'siswa' && a.className === selectedClass
  );

  // Calculate statistics
  const totalHadir = classMonthAtts.filter((a) => a.status === 'hadir').length;
  const totalSakit = classMonthAtts.filter((a) => a.status === 'sakit').length;
  const totalIzin = classMonthAtts.filter((a) => a.status === 'izin').length;
  const totalAlpa = classMonthAtts.filter((a) => a.status === 'alpa').length;
  const totalRecorded = totalHadir + totalSakit + totalIzin + totalAlpa;

  const averageAttendanceRate =
    totalRecorded > 0 ? Math.round((totalHadir / totalRecorded) * 100) : 98;

  // Identify students with low attendance (< 85%) for evaluation alert
  const studentStats = classStudents.map((student) => {
    const studentAtts = monthAttendances.filter((a) => a.targetId === student.id);
    const h = studentAtts.filter((a) => a.status === 'hadir').length;
    const s = studentAtts.filter((a) => a.status === 'sakit').length;
    const i = studentAtts.filter((a) => a.status === 'izin').length;
    const a = studentAtts.filter((a) => a.status === 'alpa').length;
    const count = h + s + i + a;
    const rate = count > 0 ? Math.round((h / count) * 100) : 100;
    return {
      student,
      h,
      s,
      i,
      a,
      rate,
      needsAttention: rate < 85,
    };
  });

  const lowAttendanceStudents = studentStats.filter((st) => st.needsAttention);

  const reportObject: MonthlyReport = {
    id: `rep_${selectedClass}_${selectedYear}_${selectedMonth}`,
    monthYear: currentMonthYearName,
    className: selectedClass,
    totalStudents: classStudents.length,
    totalDays: 24, // Typical school days per month
    averageAttendanceRate,
    hadirCount: totalHadir,
    sakitCount: totalSakit,
    izinCount: totalIzin,
    alpaCount: totalAlpa,
    generatedAt: new Date().toISOString(),
    generatedBy: currentUserName,
  };

  const handleExportPDF = () => {
    exportMonthlyReportToPDF(reportObject, classStudents, monthAttendances);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-700" />
            <span>Sistem Laporan Otomatis & Evaluasi Bulanan</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Evaluasi kehadiran per kelas, monitoring siswa berisiko (BP/BK), dan cetak laporan resmi berformat dinas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() =>
              exportAttendanceToExcel(
                monthAttendances,
                `Rekap_Presensi_Bulanan_${selectedClass}_${selectedMonth}_${selectedYear}.xlsx`
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Rekap Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen Resmi PDF</span>
          </button>
        </div>
      </div>

      {/* Period & Class Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Month */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              {Object.entries(monthNames).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Tahun:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          {/* Class Dropdown with Auto-Close */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Kelas:</span>
            <ClassDropdown
              selectedClass={selectedClass}
              onSelectClass={setSelectedClass}
              classList={classList}
              showAllOption={false}
            />
          </div>
        </div>

        <div className="text-xs font-bold text-slate-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
          Periode Evaluasi: <span className="text-indigo-900">{currentMonthYearName}</span>
        </div>
      </div>

      {/* Summary Scorecard Box */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Rata-rata Kehadiran Kelas
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-3xl font-black ${
                averageAttendanceRate >= 90
                  ? 'text-emerald-600'
                  : averageAttendanceRate >= 80
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            >
              {averageAttendanceRate}%
            </span>
            <span className="text-xs text-slate-500">kehadiran</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Target standar sekolah: ≥ 85%
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Hadir Terakumulasi
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700">
              {totalHadir}
            </span>
            <span className="text-xs text-slate-500">kali hadir</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium block mt-1">
            Keaktifan belajar optimal
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Sakit & Izin Tercatat
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-700">
              {totalSakit + totalIzin}
            </span>
            <span className="text-xs text-slate-500">kali absen</span>
          </div>
          <span className="text-[11px] text-amber-600 font-medium block mt-1">
            {totalSakit} Sakit • {totalIzin} Izin
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500 block">
            Alpa (Tanpa Keterangan)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-700">
              {totalAlpa}
            </span>
            <span className="text-xs text-slate-500">kali alpa</span>
          </div>
          <span className="text-[11px] text-rose-600 font-medium block mt-1">
            Perlu pemanggilan wali
          </span>
        </div>
      </div>

      {/* Early Warning Alert for Low Attendance */}
      {lowAttendanceStudents.length > 0 ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <h3 className="font-bold text-sm">
              Peringatan Dini: {lowAttendanceStudents.length} Siswa Memerlukan Pembinaan Khusus (&lt; 85%)
            </h3>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Siswa berikut memiliki tingkat kehadiran di bawah ambang batas minimal sekolah.
            Disarankan untuk dikoordinasikan dengan Guru Bimbingan Konseling (BK) dan Wali Kelas {selectedClass}.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {lowAttendanceStudents.map(({ student, rate }) => (
              <span
                key={student.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-amber-300 text-xs font-semibold text-amber-900"
              >
                <span>{student.name}</span>
                <span className="font-mono text-rose-700 font-bold">({rate}%)</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold block">Seluruh Siswa Memenuhi Standar Kehadiran</span>
            <span>Semua siswa di Kelas {selectedClass} memiliki persentase kehadiran di atas 85% pada periode ini.</span>
          </div>
        </div>
      )}

      {/* Detailed Student Evaluation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">
            Rincian Evaluasi Kehadiran Siswa Kelas {selectedClass}
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Total: {classStudents.length} Siswa Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4 text-center w-12">No</th>
                <th className="py-3 px-4">NISN</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4 text-center">L/P</th>
                <th className="py-3 px-4 text-center font-bold text-emerald-800">Hadir</th>
                <th className="py-3 px-4 text-center font-bold text-amber-800">Sakit</th>
                <th className="py-3 px-4 text-center font-bold text-blue-800">Izin</th>
                <th className="py-3 px-4 text-center font-bold text-rose-800">Alpa</th>
                <th className="py-3 px-4 text-center font-bold">Persentase</th>
                <th className="py-3 px-4 text-right">Rekomendasi / Evaluasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {studentStats.map((st, idx) => (
                <tr key={st.student.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-center text-slate-400 font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-800">
                    {st.student.nisn}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {st.student.name}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500 font-semibold">
                    {st.student.gender}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-700">
                    {st.h}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-amber-700">
                    {st.s}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-blue-700">
                    {st.i}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-rose-700">
                    {st.a}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        st.rate >= 90
                          ? 'bg-emerald-100 text-emerald-800'
                          : st.rate >= 85
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {st.rate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {st.rate < 85 ? (
                      <span className="text-rose-600 font-bold text-[11px]">
                        Perlu Pendampingan BK
                      </span>
                    ) : st.rate < 95 ? (
                      <span className="text-slate-600 text-[11px]">
                        Cukup Aktif
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold text-[11px]">
                        Sangat Memuaskan
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
