import React from 'react';
import {
  Users,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  QrCode,
  FileSpreadsheet,
  TrendingUp,
  Award,
  Shield,
  ArrowRight,
  Sparkles,
  CalendarDays,
  Zap,
} from 'lucide-react';
import { Student, Teacher, Attendance, LearningJournal, SchoolIdentitySettings } from '../types/school';

interface DashboardProps {
  students: Student[];
  teachers: Teacher[];
  attendances: Attendance[];
  journals: LearningJournal[];
  onNavigate: (tab: string) => void;
  onOpenScanner: () => void;
  schoolSettings?: SchoolIdentitySettings;
}

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  teachers,
  attendances,
  journals,
  onNavigate,
  onOpenScanner,
  schoolSettings,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter today's attendances
  const todayAttendances = attendances.filter((a) => a.date === todayStr);
  const todayStudentAtts = todayAttendances.filter((a) => a.targetType === 'siswa');
  const todayTeacherAtts = todayAttendances.filter((a) => a.targetType === 'guru');

  const hadirCount = todayStudentAtts.filter((a) => a.status === 'hadir').length;
  const sakitCount = todayStudentAtts.filter((a) => a.status === 'sakit').length;
  const izinCount = todayStudentAtts.filter((a) => a.status === 'izin').length;
  const alpaCount = todayStudentAtts.filter((a) => a.status === 'alpa').length;
  const totalRecordedStudents = todayStudentAtts.length;

  const attendancePercentage =
    totalRecordedStudents > 0
      ? Math.round((hadirCount / totalRecordedStudents) * 100)
      : 100;

  // Journals today
  const todayJournals = journals.filter((j) => j.date === todayStr);

  // Group attendance per class dynamically based on registered and imported students
  const dynamicClasses = Array.from(
    new Set(
      students
        .map((s) => s.className?.trim())
        .filter((c): c is string => Boolean(c && c.length > 0))
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const classList = dynamicClasses.length > 0 ? dynamicClasses : ['7A', '7B', '8A', '8B', '9A', '9B'];
  const classStats = classList.map((cls) => {
    const classTotal = students.filter((s) => s.className === cls).length;
    const classAtt = todayStudentAtts.filter((a) => a.className === cls);
    const classHadir = classAtt.filter((a) => a.status === 'hadir').length;
    const classPercent =
      classTotal > 0 ? Math.round((classHadir / classTotal) * 100) : 0;
    return {
      className: cls,
      total: classTotal,
      recorded: classAtt.length,
      hadir: classHadir,
      percentage: classPercent,
    };
  });

  return (
    <div className="space-y-6">
      {/* Welcome & School Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-6 sm:p-8 shadow-md">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-60 h-60 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Sistem Informasi Presensi & Jurnal Mengajar Digital</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Portal Akademik
            </h1>
            <p className="text-emerald-100 text-sm leading-relaxed">
              Memudahkan monitoring kehadiran siswa dan guru secara real-time dengan kartu QR pintar,
              pencatatan jurnal kelas terintegrasi, dan laporan evaluasi otomatis bulanan.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenScanner}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <QrCode className="w-5 h-5 text-slate-900" />
              <span>Scan QR Sekarang</span>
            </button>
            <button
              onClick={() => onNavigate('jurnal')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white font-semibold text-sm border border-emerald-500/40 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Tulis Jurnal</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Total Siswa Terdaftar
            </span>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-800">
              {students.length}
            </span>
            <span className="text-xs text-slate-500">siswa aktif</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>6 Rombongan Belajar</span>
            <button
              onClick={() => onNavigate('siswa')}
              className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
            >
              Lihat Siswa <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Total Teachers */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Guru & Tenaga Pendidik
            </span>
            <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-800">
              {teachers.length}
            </span>
            <span className="text-xs text-slate-500">guru & staf</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Hadir hari ini: {todayTeacherAtts.filter((t) => t.status === 'hadir').length} guru
            </span>
            <button
              onClick={() => onNavigate('guru')}
              className="text-teal-700 font-semibold hover:underline flex items-center gap-1"
            >
              Lihat Guru <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Today Attendance Rate */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Persentase Kehadiran
            </span>
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">
              {attendancePercentage}%
            </span>
            <span className="text-xs text-slate-500">hari ini</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{hadirCount} Hadir • {sakitCount + izinCount + alpaCount} Tidak Hadir</span>
            <button
              onClick={() => onNavigate('presensi')}
              className="text-indigo-700 font-semibold hover:underline flex items-center gap-1"
            >
              Rekap <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 4: Learning Journals */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Jurnal Pembelajaran
            </span>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-800">
              {todayJournals.length}
            </span>
            <span className="text-xs text-slate-500">tercatat hari ini</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total arsip: {journals.length} sesi</span>
            <button
              onClick={() => onNavigate('jurnal')}
              className="text-amber-700 font-semibold hover:underline flex items-center gap-1"
            >
              Buka Jurnal <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Two-Column Section: Real-Time Breakdown & Class Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Status Breakdown Box */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-800 text-base">
                Status Kehadiran Siswa Hari Ini
              </h2>
              <p className="text-xs text-slate-500">
                Data presensi per tanggal {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
              </p>
            </div>
            <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>

          <div className="space-y-3">
            {/* Hadir */}
            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm font-semibold text-emerald-950">Hadir</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-emerald-800">{hadirCount} Siswa</span>
                <span className="text-[11px] text-emerald-600 block">
                  {totalRecordedStudents > 0
                    ? `${Math.round((hadirCount / totalRecordedStudents) * 100)}%`
                    : '100%'}
                </span>
              </div>
            </div>

            {/* Sakit */}
            <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm font-semibold text-amber-950">Sakit (Keterangan Dokter)</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-amber-800">{sakitCount} Siswa</span>
              </div>
            </div>

            {/* Izin */}
            <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm font-semibold text-blue-950">Izin (Dispensasi / Keperluan)</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-blue-800">{izinCount} Siswa</span>
              </div>
            </div>

            {/* Alpa */}
            <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-sm font-semibold text-rose-950">Alpa (Tanpa Keterangan)</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-rose-800">{alpaCount} Siswa</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate('presensi')}
              className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Buka Tabel Presensi Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Class Attendance Roster Progress */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-800 text-base">
                Tingkat Kehadiran Per Rombel / Kelas
              </h2>
              <p className="text-xs text-slate-500">
                Monitoring keaktifan presensi kelas 7, 8, dan 9 {schoolSettings?.schoolName || 'SMP Negeri 1 Pemenang'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('evaluasi')}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
            >
              Evaluasi Bulanan <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {classStats.map((item) => (
              <div
                key={item.className}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
                      {item.className}
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        Kelas {item.className}
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        {item.total} Siswa Terdata
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-extrabold px-2 py-0.5 rounded ${
                      item.percentage >= 90
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.percentage >= 75
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.percentage}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.percentage >= 90
                        ? 'bg-emerald-600'
                        : item.percentage >= 75
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Hadir: {item.hadir} siswa</span>
                  <span>Tercatat: {item.recorded}/{item.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Logs & Learning Journals Today */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Check-ins */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-slate-800 text-sm">
                Aktivitas Presensi Terkini
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              {todayAttendances.length} aktivitas hari ini
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {todayAttendances.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada presensi tercatat untuk hari ini. Gunakan Scan QR untuk memulai presensi.
              </div>
            ) : (
              todayAttendances.slice(0, 6).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                      {item.targetName[0]}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {item.targetName}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {item.targetType === 'siswa' ? `Siswa Kelas ${item.className}` : item.className} • NISN/NIP: {item.nisnOrNip}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        item.status === 'hadir'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'sakit'
                          ? 'bg-amber-100 text-amber-800'
                          : item.status === 'izin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {item.time} WITA
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Learning Journals */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-700" />
              <h3 className="font-bold text-slate-800 text-sm">
                Jurnal Pembelajaran Guru Terkini
              </h3>
            </div>
            <button
              onClick={() => onNavigate('jurnal')}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Lihat Semua
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {journals.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada jurnal pembelajaran terisi.
              </div>
            ) : (
              journals.slice(0, 4).map((j) => (
                <div key={j.id} className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      {j.subject} • Kelas {j.className}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {j.period}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 line-clamp-1 font-medium">
                    {j.topic}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Pengampu: {j.teacherName}</span>
                    <span>{j.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
