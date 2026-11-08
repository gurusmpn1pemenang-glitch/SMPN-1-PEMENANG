import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  QrCode,
  Camera,
  Keyboard,
  CheckCircle2,
  AlertCircle,
  Volume2,
  RefreshCw,
  X,
  UserCheck,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Clock,
  Calendar,
  AlertTriangle,
  User,
  ShieldCheck,
} from 'lucide-react';
import {
  Student,
  Teacher,
  Attendance,
  AttendanceStatus,
  OperationalSettings,
} from '../types/school';
import { DEFAULT_OPERATIONAL_SETTINGS } from '../services/storageService';
import { ClassDropdown } from './ClassDropdown';
import { Search } from 'lucide-react';

interface QRScannerModalProps {
  students: Student[];
  teachers: Teacher[];
  attendances: Attendance[];
  onRecordAttendance: (att: Attendance) => Promise<void>;
  recordedBy: string;
  operationalSettings?: OperationalSettings;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  students,
  teachers,
  attendances,
  onRecordAttendance,
  recordedBy,
  operationalSettings = DEFAULT_OPERATIONAL_SETTINGS,
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('hadir');
  const [attendanceType, setAttendanceType] = useState<'masuk' | 'pulang'>('masuk');
  const [petugasName, setPetugasName] = useState<string>(recordedBy || 'Petugas Scanner');
  const [notes, setNotes] = useState('');

  // Manual attendance filter states
  const [manualSearchName, setManualSearchName] = useState('');
  const [manualFilterClass, setManualFilterClass] = useState('SEMUA');

  // Scanning states
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedResult, setLastScannedResult] = useState<{
    success: boolean;
    message: string;
    targetName?: string;
    nisnOrNip?: string;
    className?: string;
    status?: AttendanceStatus;
    time?: string;
    isDuplicate?: boolean;
    type?: 'masuk' | 'pulang';
    isLate?: boolean;
    lateMinutes?: number;
    isEarlyDeparture?: boolean;
    officerName?: string;
  } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'qr-reader-container';

  // Camera devices and scan throttle
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const lastScanTextRef = useRef<string>('');

  // Keep state refs so changing scan type / status does not cause camera to restart
  const attendanceTypeRef = useRef(attendanceType);
  attendanceTypeRef.current = attendanceType;
  const selectedStatusRef = useRef(selectedStatus);
  selectedStatusRef.current = selectedStatus;
  const petugasNameRef = useRef(petugasName);
  petugasNameRef.current = petugasName;
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const operationalSettingsRef = useRef(operationalSettings);
  operationalSettingsRef.current = operationalSettings;
  const attendancesRef = useRef(attendances);
  attendancesRef.current = attendances;
  const studentsRef = useRef(students);
  studentsRef.current = students;
  const teachersRef = useRef(teachers);
  teachersRef.current = teachers;

  // Check today's holiday and day name
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayDayName = dayNames[today.getDay()];
  const isTodayActive = operationalSettings.hariAktif.includes(todayDayName);
  const holidayMatch = operationalSettings.holidays.find((h) => h.date === todayStr);

  // Audio feedback helper
  const playBeep = (isSuccess = true) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 330, audioCtx.currentTime);
      if (isSuccess) {
        osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15);
      }

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch {
      // Audio not permitted without user gesture
    }
  };

  // Convert time "HH:mm" to total minutes from midnight
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const handleProcessCode = async (decodedText: string) => {
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const cleanCode = decodedText.trim();
    let targetType: 'siswa' | 'guru' | null = null;
    let studentMatch: Student | undefined;
    let teacherMatch: Teacher | undefined;

    // Check if format is SMPN2TJ-SISWA-{nisn} or direct NISN
    if (cleanCode.includes('SMPN2TJ-SISWA-')) {
      const nisn = cleanCode.replace('SMPN2TJ-SISWA-', '');
      studentMatch = students.find((s) => s.nisn === nisn);
      targetType = 'siswa';
    } else if (cleanCode.includes('SMPN2TJ-GURU-')) {
      const nip = cleanCode.replace('SMPN2TJ-GURU-', '');
      teacherMatch = teachers.find((t) => t.nip === nip);
      targetType = 'guru';
    } else {
      // Fallback check against both students and teachers
      studentMatch = students.find(
        (s) => s.nisn === cleanCode || s.qrCode === cleanCode || s.nis === cleanCode
      );
      if (studentMatch) {
        targetType = 'siswa';
      } else {
        teacherMatch = teachers.find((t) => t.nip === cleanCode || t.qrCode === cleanCode);
        if (teacherMatch) targetType = 'guru';
      }
    }

    if (!studentMatch && !teacherMatch) {
      playBeep(false);
      setLastScannedResult({
        success: false,
        message: `Kode QR "${cleanCode}" tidak terdaftar dalam database SMPN 2 Tanjung!`,
      });
      return;
    }

    const targetId = studentMatch ? studentMatch.id : teacherMatch!.id;
    const targetName = studentMatch ? studentMatch.name : teacherMatch!.name;
    const nisnOrNip = studentMatch ? studentMatch.nisn : teacherMatch!.nip;
    const className = studentMatch ? studentMatch.className : teacherMatch!.subject;

    // Check duplicate today for the same target and scan type
    const existingAtt = attendances.find(
      (a) =>
        a.date === todayStr &&
        a.targetId === targetId &&
        (a.type || 'masuk') === attendanceType
    );

    // Calculate late / early departure
    let isLate = false;
    let lateMinutes = 0;
    let isEarlyDeparture = false;

    const currentMinutes = timeToMinutes(nowTimeStr);

    if (attendanceType === 'masuk') {
      const toleranceMinutes = timeToMinutes(operationalSettings.batasToleransiTerlambat || '07:30');
      if (currentMinutes > toleranceMinutes && selectedStatus === 'hadir') {
        isLate = true;
        lateMinutes = currentMinutes - toleranceMinutes;
      }
    } else if (attendanceType === 'pulang') {
      const scheduledPulang =
        operationalSettings.jamPulangHarian?.[todayDayName] ||
        operationalSettings.jamPulang ||
        '13:45';
      const pulangMinutes = timeToMinutes(scheduledPulang);
      if (currentMinutes < pulangMinutes) {
        isEarlyDeparture = true;
      }
    }

    const typeDesc = attendanceType === 'masuk' ? 'Scan Masuk' : 'Scan Pulang';
    const noteContent = notes
      ? `${typeDesc}: ${notes}`
      : `${typeDesc} via Scanner QR (Petugas: ${petugasName})`;

    const newAttendance: Attendance = {
      id: existingAtt
        ? existingAtt.id
        : `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      targetType: targetType!,
      targetId,
      targetName,
      nisnOrNip,
      className,
      date: todayStr,
      time: nowTimeStr,
      status: selectedStatus,
      type: attendanceType,
      isLate,
      lateMinutes: isLate ? lateMinutes : undefined,
      isEarlyDeparture,
      notes: noteContent,
      recordedBy: petugasName,
      createdAt: new Date().toISOString(),
    };

    await onRecordAttendance(newAttendance);
    playBeep(true);

    let statusMsg = `${typeDesc} ${targetName} berhasil dicatat!`;
    if (isLate) {
      statusMsg += ` (Terlambat ${lateMinutes} menit - Batas ${operationalSettings.batasToleransiTerlambat})`;
    } else if (isEarlyDeparture) {
      statusMsg += ` (Perhatian: Pulang lebih awal sebelum ${operationalSettings.jamPulang})`;
    }

    setLastScannedResult({
      success: true,
      message: existingAtt
        ? `Presensi ${targetName} (${typeDesc}) berhasil diperbarui!`
        : statusMsg,
      targetName,
      nisnOrNip,
      className,
      status: selectedStatus,
      time: nowTimeStr,
      isDuplicate: !!existingAtt,
      type: attendanceType,
      isLate,
      lateMinutes,
      isEarlyDeparture,
      officerName: petugasName,
    });
  };

  // Start live camera with device enumeration & fallback
  const startCamera = async (camId?: string) => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch {
          // ignore
        }
        scannerRef.current = null;
      }

      // Check available cameras if not yet listed
      let targetCamId = camId || selectedCameraId;
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          if (!targetCamId) {
            const backCam = devices.find((d) =>
              /back|rear|belakang|environment/i.test(d.label)
            );
            targetCamId = backCam ? backCam.id : devices[0].id;
            setSelectedCameraId(targetCamId);
          }
        }
      } catch (err) {
        console.warn('Camera device enumeration:', err);
      }

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const cameraConfig = targetCamId ? targetCamId : { facingMode: 'environment' };

      const qrSuccessCallback = (decodedText: string) => {
        const now = Date.now();
        // Prevent rapid double triggering of the same code within 3.5s
        if (decodedText === lastScanTextRef.current && now - lastScanTimeRef.current < 3500) {
          return;
        }
        // General throttle 1.2s
        if (now - lastScanTimeRef.current < 1200) {
          return;
        }
        lastScanTimeRef.current = now;
        lastScanTextRef.current = decodedText;
        handleProcessCode(decodedText);
      };

      try {
        await html5QrCode.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const edge = Math.max(160, Math.min(260, Math.floor(minEdge * 0.72)));
              return { width: edge, height: edge };
            },
          },
          qrSuccessCallback,
          () => {}
        );
        setIsScanning(true);
      } catch (startErr: any) {
        console.warn('Retrying with facingMode user:', startErr);
        await html5QrCode.start(
          { facingMode: 'user' },
          {
            fps: 15,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const edge = Math.max(160, Math.min(260, Math.floor(minEdge * 0.72)));
              return { width: edge, height: edge };
            },
          },
          qrSuccessCallback,
          () => {}
        );
        setIsScanning(true);
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError(
        'Kamera tidak dapat diakses atau izin ditolak. Pastikan izin kamera telah diizinkan pada browser Anda, atau gunakan opsi Absensi Manual.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.warn(e);
      }
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (activeMode === 'camera') {
      const timer = setTimeout(() => {
        startCamera();
      }, 350);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [activeMode]);

  const filteredManualStudents = students.filter((s) => {
    const matchClass = manualFilterClass === 'SEMUA' || s.className === manualFilterClass;
    const matchName =
      s.name.toLowerCase().includes(manualSearchName.toLowerCase()) ||
      s.nisn.includes(manualSearchName) ||
      (s.nis && s.nis.includes(manualSearchName));
    return matchClass && matchName;
  });

  const handleManualStudentCheckIn = async (student: Student, status: AttendanceStatus) => {
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const currentMinutes = timeToMinutes(nowTimeStr);
    let isLate = false;
    let lateMinutes = 0;
    let isEarlyDeparture = false;

    if (attendanceType === 'masuk') {
      const toleranceMinutes = timeToMinutes(operationalSettings.batasToleransiTerlambat || '07:30');
      if (currentMinutes > toleranceMinutes && status === 'hadir') {
        isLate = true;
        lateMinutes = currentMinutes - toleranceMinutes;
      }
    } else if (attendanceType === 'pulang') {
      const pulangMinutes = timeToMinutes(operationalSettings.jamPulang || '13:45');
      if (currentMinutes < pulangMinutes) {
        isEarlyDeparture = true;
      }
    }

    const typeDesc = attendanceType === 'masuk' ? 'Scan Masuk' : 'Scan Pulang';
    const noteContent = notes
      ? `${typeDesc}: ${notes}`
      : `${typeDesc} via Absensi Manual (Petugas: ${petugasName})`;

    const existingAtt = attendances.find(
      (a) =>
        a.date === todayStr &&
        a.targetId === student.id &&
        (a.type || 'masuk') === attendanceType
    );

    const newAttendance: Attendance = {
      id: existingAtt
        ? existingAtt.id
        : `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      targetType: 'siswa',
      targetId: student.id,
      targetName: student.name,
      nisnOrNip: student.nisn,
      className: student.className,
      date: todayStr,
      time: nowTimeStr,
      status,
      type: attendanceType,
      isLate,
      lateMinutes: isLate ? lateMinutes : undefined,
      isEarlyDeparture,
      notes: noteContent,
      recordedBy: petugasName,
      createdAt: new Date().toISOString(),
    };

    await onRecordAttendance(newAttendance);
    playBeep(true);

    let statusMsg = `${typeDesc} ${student.name} [${status.toUpperCase()}] berhasil dicatat!`;
    if (isLate) {
      statusMsg += ` (Terlambat ${lateMinutes}m)`;
    } else if (isEarlyDeparture) {
      statusMsg += ` (Perhatian: Pulang sebelum ${operationalSettings.jamPulang})`;
    }

    setLastScannedResult({
      success: true,
      message: statusMsg,
      targetName: student.name,
      nisnOrNip: student.nisn,
      className: student.className,
      status,
      time: nowTimeStr,
      isDuplicate: !!existingAtt,
      type: attendanceType,
      isLate,
      lateMinutes,
      isEarlyDeparture,
      officerName: petugasName,
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessCode(manualCode.trim());
    setManualCode('');
  };

  return (
    <div className="space-y-6">
      {/* Holiday / Inactive Day Notice Banner */}
      {(!isTodayActive || holidayMatch) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">
              Pemberitahuan Hari Belajar: {holidayMatch ? `Hari Libur (${holidayMatch.name})` : `Hari ${todayDayName} (Bukan Hari Aktif Belajar)`}
            </span>
            <p className="text-amber-700 mt-0.5">
              Pos Scanner tetap dapat digunakan untuk kegiatan ekstrakurikuler atau piket terjadwal.
            </p>
          </div>
        </div>
      )}

      {/* Main Header with Operational Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <QrCode className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Pos Pemindai QR Presensi Real-Time
              </h2>
              <p className="text-xs text-slate-500">
                Arahkan kartu pelajar / ID guru ke kamera untuk merekam kehadiran otomatis
              </p>
            </div>
          </div>
        </div>

        {/* Operating hours indicator */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Masuk: <strong>{operationalSettings.jamMasuk}</strong> (Batas: <strong>{operationalSettings.batasToleransiTerlambat}</strong>)</span>
            <span className="text-slate-300">•</span>
            <span>Pulang: <strong>{operationalSettings.jamPulang}</strong></span>
          </div>
        </div>
      </div>

      {/* Scanner Control Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner Box */}
        <div className="lg:col-span-7 space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveMode('camera')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'camera'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Kamera Langsung Scanner</span>
            </button>
            <button
              onClick={() => setActiveMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'manual'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>Absensi Manual Siswa</span>
            </button>
          </div>

          {/* Scanner Viewport */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-xl overflow-hidden relative min-h-[360px] flex flex-col items-center justify-center">
            {activeMode === 'camera' && (
              <>
                <div
                  id={readerElementId}
                  className="w-full max-w-[360px] aspect-square rounded-xl overflow-hidden bg-black"
                />

                {cameraError && (
                  <div className="absolute inset-4 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6 space-y-3 z-10 rounded-xl">
                    <AlertCircle className="w-10 h-10 text-amber-400" />
                    <p className="text-xs text-slate-300 max-w-sm">{cameraError}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startCamera()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Coba Lagi</span>
                      </button>
                      <button
                        onClick={() => setActiveMode('manual')}
                        className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold"
                      >
                        Gunakan Input Manual
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                  <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Kamera Aktif — Dekatkan Kartu QR ke Kamera</span>
                  </div>

                  {availableCameras.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentIdx = availableCameras.findIndex(
                          (c) => c.id === selectedCameraId
                        );
                        const nextIdx = (currentIdx + 1) % availableCameras.length;
                        const nextCam = availableCameras[nextIdx];
                        setSelectedCameraId(nextCam.id);
                        startCamera(nextCam.id);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500 text-slate-200 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3 h-3 text-emerald-400" />
                      <span>Ganti Kamera</span>
                    </button>
                  )}
                </div>
              </>
            )}

            {activeMode === 'manual' && (
              <div className="w-full p-4 space-y-3.5 text-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="font-extrabold text-xs text-white">
                        Absensi Manual Siswa
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Cari nama siswa atau filter kelas untuk presensi langsung
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                    {filteredManualStudents.length} Siswa Terfilter
                  </span>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari berdasarkan nama siswa atau NISN..."
                      value={manualSearchName}
                      onChange={(e) => setManualSearchName(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Class Dropdown with Auto-Close */}
                  <ClassDropdown
                    selectedClass={manualFilterClass}
                    onSelectClass={setManualFilterClass}
                    className="w-full sm:w-auto"
                  />
                </div>

                {/* Student Attendance Quick List */}
                <div className="max-h-[260px] overflow-y-auto space-y-1.5 pr-1 border border-slate-800 rounded-xl p-2 bg-slate-900/60 scrollbar-thin">
                  {filteredManualStudents.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Tidak ada siswa ditemukan dengan kata kunci atau kelas ini.
                    </div>
                  ) : (
                    filteredManualStudents.slice(0, 30).map((std) => {
                      const todayAtt = attendances.find(
                        (a) =>
                          a.date === todayStr &&
                          a.targetId === std.id &&
                          (a.type || 'masuk') === attendanceType
                      );

                      return (
                        <div
                          key={std.id}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 hover:border-emerald-600/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors"
                        >
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white truncate max-w-[170px]">
                                {std.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                {std.className}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              NISN: {std.nisn} {std.nis ? `| NIS: ${std.nis}` : ''}
                              {todayAtt && (
                                <span className="ml-2 font-bold text-emerald-400">
                                  ✓ Sudah ({todayAtt.status.toUpperCase()} {todayAtt.time})
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick 1-click Attendance Buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleManualStudentCheckIn(std, 'hadir')}
                              className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase shadow-xs transition-colors cursor-pointer"
                              title="Tandai Hadir"
                            >
                              Hadir
                            </button>
                            <button
                              type="button"
                              onClick={() => handleManualStudentCheckIn(std, 'sakit')}
                              className="px-2 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white font-bold text-[10px] uppercase shadow-xs transition-colors cursor-pointer"
                              title="Tandai Sakit"
                            >
                              Sakit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleManualStudentCheckIn(std, 'izin')}
                              className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] uppercase shadow-xs transition-colors cursor-pointer"
                              title="Tandai Izin"
                            >
                              Izin
                            </button>
                            <button
                              type="button"
                              onClick={() => handleManualStudentCheckIn(std, 'alpa')}
                              className="px-2 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold text-[10px] uppercase shadow-xs transition-colors cursor-pointer"
                              title="Tandai Alpa"
                            >
                              Alpa
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Direct NISN / Barcode code fallback */}
                <form
                  onSubmit={handleManualSubmit}
                  className="flex items-center gap-2 pt-1 border-t border-slate-800"
                >
                  <input
                    type="text"
                    placeholder="Atau ketik langsung kode QR / NIP guru..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Proses
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Settings & Live Result Card */}
        <div className="lg:col-span-5 space-y-4">
          {/* Scan Configuration Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
              Pengaturan Pos Scanner
            </h3>

            {/* Nama Petugas Scanner (Mandatory recording) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span>Nama Petugas Scanner (Piket) *</span>
              </label>
              <input
                type="text"
                value={petugasName}
                onChange={(e) => setPetugasName(e.target.value)}
                placeholder="Nama guru / petugas jaga..."
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-emerald-50/30"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Tercatat pada riwayat presensi masuk/pulang
              </p>
            </div>

            {/* Type Selector: Scan Masuk vs Scan Pulang */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jenis Presensi:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAttendanceType('masuk')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    attendanceType === 'masuk'
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🟢 Scan Masuk
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceType('pulang')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    attendanceType === 'pulang'
                      ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🔵 Scan Pulang
                </button>
              </div>
            </div>

            {/* Status Kehadiran Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Status Kehadiran Bawaan:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['hadir', 'sakit', 'izin', 'alpa'] as AttendanceStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStatus(st)}
                    className={`py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                      selectedStatus === st
                        ? st === 'hadir'
                          ? 'bg-emerald-600 text-white'
                          : st === 'sakit'
                          ? 'bg-blue-600 text-white'
                          : st === 'izin'
                          ? 'bg-amber-600 text-white'
                          : 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Khusus (Opsional):
              </label>
              <input
                type="text"
                placeholder="Contoh: Dispensasi lomba, piket, dll..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Last Scanned Result Notification Card */}
          {lastScannedResult && (
            <div
              className={`p-4 rounded-xl border transition-all animate-in fade-in zoom-in-95 ${
                lastScannedResult.success
                  ? lastScannedResult.isLate
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {lastScannedResult.success ? (
                  <CheckCircle2
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      lastScannedResult.isLate ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}

                <div className="space-y-1 text-xs w-full">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold uppercase text-[10px] tracking-wider">
                      {lastScannedResult.success ? 'Presensi Berhasil' : 'Gagal Memindai'}
                    </span>
                    {lastScannedResult.time && (
                      <span className="font-mono text-[10px] font-bold text-slate-500">
                        {lastScannedResult.time} WITA
                      </span>
                    )}
                  </div>

                  <p className="font-bold text-sm">
                    {lastScannedResult.targetName || lastScannedResult.message}
                  </p>

                  {lastScannedResult.targetName && (
                    <div className="pt-1 text-[11px] space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">NISN: {lastScannedResult.nisnOrNip}</span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-800">
                          Kelas {lastScannedResult.className}
                        </span>
                      </div>

                      {/* Late indicator badge */}
                      {lastScannedResult.isLate && (
                        <div className="inline-block px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                          ⚠️ Terlambat: +{lastScannedResult.lateMinutes} menit
                        </div>
                      )}

                      {/* Early departure indicator */}
                      {lastScannedResult.isEarlyDeparture && (
                        <div className="inline-block px-2 py-0.5 rounded bg-blue-200 text-blue-900 text-[10px] font-bold">
                          ℹ️ Pulang Mendahului Jadwal
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500">
                        Petugas Jaga: {lastScannedResult.officerName}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
