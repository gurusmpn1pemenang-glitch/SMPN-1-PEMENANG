import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, testConnection } from './firebase/config';
import {
  AppUser,
  Student,
  Teacher,
  Attendance,
  LearningJournal,
  SchoolIdentitySettings,
  OperationalSettings,
} from './types/school';
import {
  getStudents,
  saveStudent,
  saveStudentsBatch,
  deleteStudent,
  getTeachers,
  saveTeacher,
  resetTeacherPassword,
  updateTeacherProfile,
  changeTeacherPassword,
  deleteTeacher,
  getAttendances,
  recordAttendance,
  deleteAttendance,
  getJournals,
  saveJournal,
  deleteJournal,
  getSchoolSettings,
  saveSchoolSettings,
  getOperationalSettings,
  saveOperationalSettings,
  DEFAULT_OPERATIONAL_SETTINGS,
  getOfflineQueue,
  syncPendingQueue,
  subscribeToStudentsRealtime,
  subscribeToAttendancesRealtime,
} from './services/storageService';
import { DEFAULT_SCHOOL_INFO } from './utils/exportUtils';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { Dashboard } from './components/Dashboard';
import { StudentManager } from './components/StudentManager';
import { TeacherManager } from './components/TeacherManager';
import { QRScannerModal } from './components/QRScannerModal';
import { AttendanceTable } from './components/AttendanceTable';
import { LearningJournalView } from './components/LearningJournalView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { TeacherProfileModal } from './components/TeacherProfileModal';
import { LoginPage } from './components/LoginPage';
import { GraduationCap, ShieldCheck, Sparkles, X } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('smpn2tj_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [passwordChangeNotice, setPasswordChangeNotice] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  // Core Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [journals, setJournals] = useState<LearningJournal[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolIdentitySettings>(DEFAULT_SCHOOL_INFO);
  const [operationalSettings, setOperationalSettings] = useState<OperationalSettings>(
    DEFAULT_OPERATIONAL_SETTINGS
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Update offline queue count
  const updateQueueCount = useCallback(() => {
    const queue = getOfflineQueue();
    setPendingSyncCount(queue.length);
  }, []);

  // Initial Load & Auth Listener
  useEffect(() => {
    testConnection();

    // Firebase Auth State
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const isAdmin =
          user.email === 'gurusmpn1pemenang@gmail.com' ||
          user.email?.toLowerCase().includes('admin');
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Pengguna',
          photoURL: user.photoURL,
          role: isAdmin ? 'admin' : 'guru',
        });
      }
    });

    // Load initial data
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        const [stdList, tchList, attList, jrnList, schSet, opSet] = await Promise.all([
          getStudents(),
          getTeachers(),
          getAttendances(),
          getJournals(),
          getSchoolSettings(),
          getOperationalSettings(),
        ]);
        setStudents(stdList);
        setTeachers(tchList);
        setAttendances(attList);
        setJournals(jrnList);
        setSchoolSettings(schSet);
        setOperationalSettings(opSet);
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setIsLoading(false);
        updateQueueCount();
      }
    };

    loadAllData();

    // Real-Time Delta Listeners (1 read per changed document)
    const unsubStudents = subscribeToStudentsRealtime((studentDelta, changeType) => {
      setStudents((prev) => {
        if (changeType === 'removed') {
          return prev.filter((s) => s.id !== studentDelta.id);
        }
        const idx = prev.findIndex((s) => s.id === studentDelta.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = studentDelta;
          return copy;
        }
        return [studentDelta, ...prev];
      });
    });

    const unsubAttendances = subscribeToAttendancesRealtime((attDelta, changeType) => {
      setAttendances((prev) => {
        if (changeType === 'removed') {
          return prev.filter((a) => a.id !== attDelta.id);
        }
        const idx = prev.findIndex((a) => a.id === attDelta.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = attDelta;
          return copy;
        }
        return [attDelta, ...prev];
      });
    });

    // Online / Offline Listeners
    const handleOnline = () => {
      setIsOnline(true);
      updateQueueCount();
    };
    const handleOffline = () => {
      setIsOnline(false);
      updateQueueCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribeAuth();
      unsubStudents();
      unsubAttendances();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateQueueCount]);

  // Sync Offline Queue to Firebase
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setLastSyncMessage(null);
    try {
      const res = await syncPendingQueue();
      updateQueueCount();
      if (res.synced > 0) {
        setLastSyncMessage(`Berhasil menyinkronkan ${res.synced} data ke Cloud Firestore.`);
        const [freshAtt, freshJrn] = await Promise.all([
          getAttendances(true),
          getJournals(true),
        ]);
        setAttendances(freshAtt);
        setJournals(freshJrn);
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Student Actions
  const handleSaveStudent = async (student: Student) => {
    await saveStudent(student);
    const updated = await getStudents();
    setStudents(updated);
    updateQueueCount();
  };

  const handleSaveStudentsBatch = async (batch: Student[]) => {
    const res = await saveStudentsBatch(batch);
    const updated = await getStudents();
    setStudents(updated);
    updateQueueCount();
    return res;
  };

  const handleDeleteStudent = async (id: string) => {
    await deleteStudent(id);
    const updated = await getStudents();
    setStudents(updated);
    updateQueueCount();
  };

  // Teacher Actions
  const handleSaveTeacher = async (teacher: Teacher) => {
    await saveTeacher(teacher);
    const updated = await getTeachers();
    setTeachers(updated);
    updateQueueCount();
  };

  const handleResetTeacherPassword = async (teacherId: string, newPasswordHint: string): Promise<boolean> => {
    const res = await resetTeacherPassword(teacherId, newPasswordHint);
    if (res.success) {
      const updated = await getTeachers();
      setTeachers(updated);
      return true;
    }
    return false;
  };

  const handleDeleteTeacher = async (id: string) => {
    await deleteTeacher(id);
    const updated = await getTeachers();
    setTeachers(updated);
    updateQueueCount();
  };

  const handleUpdateTeacherProfile = async (teacherId: string, data: Partial<Teacher>) => {
    const updated = await updateTeacherProfile(teacherId, data);
    if (updated) {
      const freshTeachers = await getTeachers();
      setTeachers(freshTeachers);
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          displayName: updated.name || currentUser.displayName,
          email: updated.email || currentUser.email,
        });
      }
    }
    return updated;
  };

  const handleChangeTeacherPassword = async (
    teacherId: string,
    oldPass: string,
    newPass: string
  ) => {
    return await changeTeacherPassword(teacherId, oldPass, newPass);
  };

  // Attendance Actions
  const handleRecordAttendance = async (attendance: Attendance) => {
    await recordAttendance(attendance);
    const updated = await getAttendances();
    setAttendances(updated);
    updateQueueCount();
  };

  const handleDeleteAttendance = async (id: string) => {
    await deleteAttendance(id);
    const updated = await getAttendances();
    setAttendances(updated);
    updateQueueCount();
  };

  // Journal Actions
  const handleSaveJournal = async (journal: LearningJournal) => {
    await saveJournal(journal);
    const updated = await getJournals();
    setJournals(updated);
    updateQueueCount();
  };

  const handleDeleteJournal = async (id: string) => {
    await deleteJournal(id);
    const updated = await getJournals();
    setJournals(updated);
    updateQueueCount();
  };

  // Settings Actions
  const handleSaveSchoolSettings = async (settings: SchoolIdentitySettings) => {
    await saveSchoolSettings(settings);
    setSchoolSettings(settings);
  };

  const handleSaveOperationalSettings = async (settings: OperationalSettings) => {
    await saveOperationalSettings(settings);
    setOperationalSettings(settings);
  };

  // Authentication handlers
  const handleLoginSuccess = (user: AppUser, requiresPasswordChange = false) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('smpn2tj_auth_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    if (requiresPasswordChange && user.role === 'guru') {
      setPasswordChangeNotice(true);
      setIsProfileModalOpen(true);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    localStorage.removeItem('smpn2tj_auth_user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <LoginPage
        teachers={teachers}
        schoolSettings={schoolSettings}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-row font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      {/* 1. Dark Modern Navigation Sidebar on the Left */}
      <Sidebar
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
        schoolSettings={schoolSettings}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <TopHeader
          onToggleMobileSidebar={() => setIsOpenMobile(true)}
          activeTab={activeTab}
          onNavigateTab={setActiveTab}
          currentUser={currentUser}
          isOnline={isOnline}
          schoolSettings={schoolSettings}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* First-time Default Password Advisory Banner */}
        {passwordChangeNotice && currentUser?.role === 'guru' && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs border-b border-amber-600">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-900 shrink-0" />
              <span>
                Peringatan Keamanan: Akun Anda masih menggunakan kata sandi default (123123). Silakan perbarui kata sandi Anda demi keamanan data.
              </span>
            </div>
            <button
              onClick={() => setPasswordChangeNotice(false)}
              className="text-slate-950 hover:text-black p-1 rounded hover:bg-amber-600/30 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Offline Sync Banner */}
        <OfflineSyncBanner
          isOnline={isOnline}
          pendingCount={pendingSyncCount}
          onSync={handleTriggerSync}
          isSyncing={isSyncing}
          lastSyncMessage={lastSyncMessage}
        />

        {/* Main Content Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">
                Memuat data presensi {schoolSettings.schoolName}...
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard
                  students={students}
                  teachers={teachers}
                  attendances={attendances}
                  journals={journals}
                  onNavigate={setActiveTab}
                  onOpenScanner={() => setActiveTab('scan-qr')}
                />
              )}

              {activeTab === 'scan-qr' && (
                <QRScannerModal
                  students={students}
                  teachers={teachers}
                  attendances={attendances}
                  onRecordAttendance={handleRecordAttendance}
                  recordedBy={currentUser?.displayName || 'Petugas Scanner'}
                  operationalSettings={operationalSettings}
                />
              )}

              {activeTab === 'jurnal' && (
                <LearningJournalView
                  journals={journals}
                  teachers={teachers}
                  onSaveJournal={handleSaveJournal}
                  onDeleteJournal={handleDeleteJournal}
                  currentUserName={currentUser?.displayName || 'Drs. H. Suhartono, M.Pd.'}
                />
              )}

              {activeTab === 'presensi' && (
                <AttendanceTable
                  attendances={attendances}
                  students={students}
                  teachers={teachers}
                  onRecordAttendance={handleRecordAttendance}
                  onDeleteAttendance={handleDeleteAttendance}
                  recordedBy={currentUser?.displayName || 'Guru / Staf'}
                />
              )}

              {activeTab === 'siswa' && (
                <StudentManager
                  students={students}
                  onSaveStudent={handleSaveStudent}
                  onSaveStudentsBatch={handleSaveStudentsBatch}
                  onDeleteStudent={handleDeleteStudent}
                  userRole={currentUser?.role || 'guru'}
                />
              )}

              {activeTab === 'guru' && (
                <TeacherManager
                  teachers={teachers}
                  onSaveTeacher={handleSaveTeacher}
                  onDeleteTeacher={handleDeleteTeacher}
                  userRole={currentUser?.role || 'guru'}
                />
              )}

              {activeTab === 'evaluasi' && (
                <MonthlyReportView
                  students={students}
                  attendances={attendances}
                  currentUserName={currentUser?.displayName || 'Admin Presensi'}
                />
              )}

              {activeTab === 'pengaturan' && (
                <AdminSettingsView
                  schoolSettings={schoolSettings}
                  operationalSettings={operationalSettings}
                  teachers={teachers}
                  userRole={currentUser?.role || 'guru'}
                  onSaveSchoolSettings={handleSaveSchoolSettings}
                  onSaveOperationalSettings={handleSaveOperationalSettings}
                  onResetTeacherPassword={handleResetTeacherPassword}
                />
              )}
            </>
          )}
        </main>

        {/* Official School Footer */}
        <footer className="mt-auto bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                <span>{schoolSettings.schoolName.toUpperCase()}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 font-normal">
                  NPSN: {schoolSettings.npsn} • {schoolSettings.districtName}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Firebase Spark Safe
                </span>
                <span className="text-slate-600">|</span>
                <span>© {new Date().getFullYear()} Hak Cipta Dilindungi</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Teacher Profile & Password Modal */}
      <TeacherProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        teachers={teachers}
        onUpdateProfile={handleUpdateTeacherProfile}
        onChangePassword={handleChangeTeacherPassword}
      />
    </div>
  );
}
