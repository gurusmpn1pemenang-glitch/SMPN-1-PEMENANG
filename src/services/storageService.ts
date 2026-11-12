import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  query,
  limit,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import {
  Student,
  Teacher,
  Attendance,
  LearningJournal,
  SchoolIdentitySettings,
  OperationalSettings,
  Gender,
  StudentStatus,
} from '../types/school';
import {
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_ATTENDANCES,
  INITIAL_JOURNALS,
} from './seedData';
import { DEFAULT_SCHOOL_INFO } from '../utils/exportUtils';

// Local storage cache keys
const STORAGE_KEYS = {
  STUDENTS: 'smpn2tj_students_cache',
  TEACHERS: 'smpn2tj_teachers_cache',
  ATTENDANCES: 'smpn2tj_attendances_cache',
  JOURNALS: 'smpn2tj_journals_cache',
  OFFLINE_QUEUE: 'smpn2tj_offline_queue',
  LAST_FETCH: 'smpn2tj_last_fetch_time',
  CUSTOM_ADMINS: 'smpn2tj_custom_admins',
  SCHOOL_SETTINGS: 'smpn2tj_school_settings_cache',
  OPERATIONAL_SETTINGS: 'smpn2tj_operational_settings_cache',
};

export const DEFAULT_OPERATIONAL_SETTINGS: OperationalSettings = {
  jamMasuk: '07:15',
  batasToleransiTerlambat: '07:30',
  jamPulang: '13:45',
  jamPulangHarian: {
    Senin: '14:00',
    Selasa: '14:00',
    Rabu: '14:00',
    Kamis: '14:00',
    Jumat: '11:30',
    Sabtu: '12:30',
  },
  hariAktif: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  holidays: [
    {
      id: 'hol_1',
      date: '2026-01-01',
      name: 'Tahun Baru Masehi',
      isNational: true,
    },
    {
      id: 'hol_2',
      date: '2026-03-20',
      name: 'Hari Raya Idul Fitri 1447 H',
      isNational: true,
    },
    {
      id: 'hol_3',
      date: '2026-05-01',
      name: 'Hari Buruh Internasional',
      isNational: true,
    },
    {
      id: 'hol_4',
      date: '2026-08-17',
      name: 'HUT Kemerdekaan RI ke-81',
      isNational: true,
    },
    {
      id: 'hol_5',
      date: '2026-07-21',
      name: 'HUT Kabupaten Lombok Utara',
      isNational: false,
    },
  ],
  updatedAt: new Date().toISOString(),
};

export interface QueuedOperation {
  id: string;
  type: 'attendance' | 'journal' | 'student' | 'teacher' | 'setting';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

// Helper to check online status
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

// ================= OFFLINE QUEUE MANAGEMENT =================
export const getOfflineQueue = (): QueuedOperation[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addToOfflineQueue = (operation: Omit<QueuedOperation, 'id' | 'timestamp'>) => {
  const queue = getOfflineQueue();
  const newItem: QueuedOperation = {
    ...operation,
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  queue.push(newItem);
  localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  return newItem;
};

export const clearOfflineQueue = () => {
  localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
};

// ================= STUDENTS =================
export async function getStudents(forceRefresh = false): Promise<Student[]> {
  const cached = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  let localStudents: Student[] = [];
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStudents = parsed;
      }
    } catch {
      localStudents = [];
    }
  }

  // If offline, return cached data immediately
  if (!isOnline()) {
    return localStudents.length > 0 ? localStudents : INITIAL_STUDENTS;
  }

  // When online, fetch fresh master data from Cloud Firestore to sync across all devices
  try {
    const colRef = collection(db, 'students');
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      const seedList = localStudents.length > 0 ? localStudents : INITIAL_STUDENTS;
      for (const s of seedList) {
        try {
          await setDoc(doc(db, 'students', s.id), s);
        } catch {
          // ignore seeding fail
        }
      }
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(seedList));
      return seedList;
    }

    const students: Student[] = [];
    snapshot.forEach((d) => {
      students.push(d.data() as Student);
    });

    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    return students;
  } catch (error) {
    console.warn('Falling back to local students:', error);
    return localStudents.length > 0 ? localStudents : INITIAL_STUDENTS;
  }
}

/**
 * Sanitizes student payload before sending to Firestore, ensuring no field is `undefined`
 * (Firestore throws an error if any field is undefined).
 * Specifically converts parentPhone, phone, nis, etc. to clean string "" if undefined or null.
 */
export function sanitizeStudentForFirestore(student: Partial<Student>): Student {
  const cleanStr = (val: unknown): string => {
    if (val === undefined || val === null) return '';
    return String(val).trim();
  };

  const nisn = cleanStr(student.nisn);
  const parentPhone = cleanStr(student.parentPhone ?? student.phone);
  const photo = cleanStr(student.drivePhotoUrl ?? student.photoUrl);

  const sanitized: Student = {
    id: cleanStr(student.id) || `std_${Date.now()}`,
    nisn,
    nis: cleanStr(student.nis),
    name: cleanStr(student.name),
    gender: (student.gender === 'P' ? 'P' : 'L') as Gender,
    className: cleanStr(student.className) || '7A',
    birthPlaceDate: cleanStr(student.birthPlaceDate),
    parentName: cleanStr(student.parentName),
    parentPhone: parentPhone,
    phone: parentPhone,
    address: cleanStr(student.address),
    drivePhotoUrl: photo,
    photoUrl: photo,
    status: (student.status || 'aktif') as StudentStatus,
    qrCode: cleanStr(student.qrCode) || `SMPN2TJ-SISWA-${nisn}`,
    createdAt: cleanStr(student.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return sanitized;
}

export async function saveStudent(rawStudent: Student): Promise<void> {
  // Sanitize student data to ensure parentPhone and other fields are never undefined
  const student = sanitizeStudentForFirestore(rawStudent);

  const students = await getStudents();
  const existingIdx = students.findIndex((s) => s.id === student.id || s.nisn === student.nisn);
  if (existingIdx >= 0) {
    students[existingIdx] = { ...students[existingIdx], ...student };
  } else {
    students.unshift(student);
  }
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));

  if (!isOnline()) {
    addToOfflineQueue({
      type: 'student',
      action: 'create',
      data: student,
    });
    return;
  }

  try {
    await setDoc(doc(db, 'students', student.id), student, { merge: true });
  } catch (error) {
    addToOfflineQueue({
      type: 'student',
      action: 'create',
      data: student,
    });
    handleFirestoreError(error, OperationType.WRITE, `students/${student.id}`);
  }
}

/**
 * Bulk import multiple students from Excel with exact columns
 */
export async function saveStudentsBatch(
  newStudents: Student[]
): Promise<{ added: number; updated: number }> {
  // 1. Sanitize all incoming student payloads
  const sanitizedIncoming = newStudents.map((s) => sanitizeStudentForFirestore(s));
  const currentStudents = await getStudents();
  let added = 0;
  let updated = 0;

  // Collision-free key generator: does not collapse students who have missing or '-' NISN
  const getKey = (s: { nisn?: string; nis?: string; id?: string; name?: string; className?: string }) => {
    const cleanNisn = s.nisn ? String(s.nisn).trim() : '';
    if (cleanNisn && cleanNisn !== '-' && cleanNisn !== '0') {
      return `nisn:${cleanNisn}`;
    }
    const cleanNis = s.nis ? String(s.nis).trim() : '';
    if (cleanNis && cleanNis !== '-' && cleanNis !== '0') {
      return `nis:${cleanNis}`;
    }
    if (s.id && s.id.trim()) {
      return `id:${s.id.trim()}`;
    }
    return `name:${(s.name || '').trim().toLowerCase()}_${(s.className || '').trim().toLowerCase()}`;
  };

  const studentMap = new Map<string, Student>();
  currentStudents.forEach((s) => {
    studentMap.set(getKey(s), s);
  });

  const studentsToPersist: Student[] = [];

  sanitizedIncoming.forEach((ns) => {
    const key = getKey(ns);
    if (studentMap.has(key)) {
      const existing = studentMap.get(key)!;
      const merged: Student = {
        ...existing,
        ...ns,
        id: existing.id, // Preserve consistent Firestore document ID
        updatedAt: new Date().toISOString(),
      };
      studentMap.set(key, merged);
      studentsToPersist.push(merged);
      updated++;
    } else {
      studentMap.set(key, ns);
      studentsToPersist.push(ns);
      added++;
    }
  });

  const finalStudents = Array.from(studentMap.values());
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(finalStudents));

  // Sync to Firestore using writeBatch and AWAIT so all records are committed before returning
  if (!isOnline()) {
    studentsToPersist.forEach((s) => {
      addToOfflineQueue({
        type: 'student',
        action: 'create',
        data: s,
      });
    });
  } else {
    // Write in chunks of 400 (Firestore batch limit is 500)
    const CHUNK_SIZE = 400;
    for (let i = 0; i < studentsToPersist.length; i += CHUNK_SIZE) {
      const chunk = studentsToPersist.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((std) => {
        const docRef = doc(db, 'students', std.id);
        batch.set(docRef, std, { merge: true });
      });

      try {
        await batch.commit();
      } catch (batchErr) {
        console.warn('Batch commit failed, falling back to individual writes:', batchErr);
        // Fallback: save individually
        for (const std of chunk) {
          try {
            await setDoc(doc(db, 'students', std.id), std, { merge: true });
          } catch (individualErr) {
            addToOfflineQueue({
              type: 'student',
              action: 'create',
              data: std,
            });
            console.error('Failed to write student to Firestore:', std.nisn, individualErr);
          }
        }
      }
    }
  }

  return { added, updated };
}

export async function deleteStudent(studentId: string): Promise<void> {
  const students = await getStudents();
  const filtered = students.filter((s) => s.id !== studentId);
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(filtered));

  if (!isOnline()) {
    addToOfflineQueue({
      type: 'student',
      action: 'delete',
      data: { id: studentId },
    });
    return;
  }

  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `students/${studentId}`);
  }
}

/**
 * Bulk delete multiple students based on active search or filter criteria
 */
export async function deleteStudentsBatch(studentIds: string[]): Promise<number> {
  if (studentIds.length === 0) return 0;
  const idSet = new Set(studentIds);
  const students = await getStudents();
  const remaining = students.filter((s) => !idSet.has(s.id));
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(remaining));

  if (!isOnline()) {
    studentIds.forEach((id) => {
      addToOfflineQueue({
        type: 'student',
        action: 'delete',
        data: { id },
      });
    });
    return studentIds.length;
  }

  // Parallel delete in batches from Cloud Firestore
  await Promise.all(
    studentIds.map((id) =>
      deleteDoc(doc(db, 'students', id)).catch((err) => {
        addToOfflineQueue({
          type: 'student',
          action: 'delete',
          data: { id },
        });
        console.warn('Queued student deletion due to network error:', err);
      })
    )
  );

  return studentIds.length;
}

// ================= TEACHERS =================
export async function getTeachers(forceRefresh = false): Promise<Teacher[]> {
  const cached = localStorage.getItem(STORAGE_KEYS.TEACHERS);
  let localTeachers: Teacher[] = [];
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localTeachers = parsed;
      }
    } catch {
      localTeachers = [];
    }
  }

  if (!isOnline()) {
    return localTeachers.length > 0 ? localTeachers : INITIAL_TEACHERS;
  }

  try {
    const colRef = collection(db, 'teachers');
    const snapshot = await getDocs(query(colRef, limit(100)));

    if (snapshot.empty) {
      const seedList = localTeachers.length > 0 ? localTeachers : INITIAL_TEACHERS;
      for (const t of seedList) {
        try {
          await setDoc(doc(db, 'teachers', t.id), t);
        } catch {
          // ignore
        }
      }
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(seedList));
      return seedList;
    }

    const teachers: Teacher[] = [];
    snapshot.forEach((d) => {
      teachers.push(d.data() as Teacher);
    });
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
    return teachers;
  } catch (error) {
    console.warn('Falling back to local teachers:', error);
    return localTeachers.length > 0 ? localTeachers : INITIAL_TEACHERS;
  }
}

export async function saveTeacher(teacher: Teacher): Promise<void> {
  const teachers = await getTeachers();
  const existingIdx = teachers.findIndex((t) => t.id === teacher.id);
  if (existingIdx >= 0) {
    teachers[existingIdx] = teacher;
  } else {
    teachers.unshift(teacher);
  }
  localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));

  if (!isOnline()) {
    addToOfflineQueue({
      type: 'teacher',
      action: 'create',
      data: teacher,
    });
    return;
  }

  try {
    await setDoc(doc(db, 'teachers', teacher.id), teacher);
  } catch (error) {
    addToOfflineQueue({
      type: 'teacher',
      action: 'create',
      data: teacher,
    });
    handleFirestoreError(error, OperationType.WRITE, `teachers/${teacher.id}`);
  }
}

export async function resetTeacherPassword(
  teacherId: string,
  newPassword = '123123'
): Promise<{ success: boolean; defaultPassword: string }> {
  const teachers = await getTeachers();
  const idx = teachers.findIndex((t) => t.id === teacherId);
  if (idx >= 0) {
    teachers[idx].password = newPassword;
    teachers[idx].lastPasswordReset = new Date().toISOString();
    teachers[idx].updatedAt = new Date().toISOString();
    await saveTeacher(teachers[idx]);
    return { success: true, defaultPassword: newPassword };
  }
  return { success: false, defaultPassword: newPassword };
}

export async function updateTeacherProfile(
  teacherId: string,
  updatedData: Partial<Teacher>
): Promise<Teacher | null> {
  const teachers = await getTeachers();
  const idx = teachers.findIndex((t) => t.id === teacherId);
  if (idx >= 0) {
    teachers[idx] = {
      ...teachers[idx],
      ...updatedData,
      updatedAt: new Date().toISOString(),
    };
    await saveTeacher(teachers[idx]);
    return teachers[idx];
  }
  return null;
}

export async function changeTeacherPassword(
  teacherId: string,
  oldPass: string,
  newPass: string
): Promise<{ success: boolean; message: string }> {
  const teachers = await getTeachers();
  const idx = teachers.findIndex((t) => t.id === teacherId);
  if (idx === -1) {
    return { success: false, message: 'Data akun guru tidak ditemukan.' };
  }
  const teacher = teachers[idx];
  // Default password is 123123 if not yet set
  const currentPass = teacher.password || '123123';
  if (oldPass !== currentPass) {
    return { success: false, message: 'Kata sandi lama yang Anda masukkan salah.' };
  }
  teacher.password = newPass;
  teacher.updatedAt = new Date().toISOString();
  await saveTeacher(teacher);
  return { success: true, message: 'Kata sandi berhasil diperbarui!' };
}

export async function deleteTeacher(teacherId: string): Promise<void> {
  const teachers = await getTeachers();
  const filtered = teachers.filter((t) => t.id !== teacherId);
  localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(filtered));

  if (!isOnline()) {
    addToOfflineQueue({
      type: 'teacher',
      action: 'delete',
      data: { id: teacherId },
    });
    return;
  }

  try {
    await deleteDoc(doc(db, 'teachers', teacherId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `teachers/${teacherId}`);
  }
}

// ================= ATTENDANCES =================
export async function getAttendances(forceRefresh = false): Promise<Attendance[]> {
  const cached = localStorage.getItem(STORAGE_KEYS.ATTENDANCES);
  let localList: Attendance[] = [];
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localList = parsed;
      }
    } catch {
      localList = [];
    }
  }

  if (!isOnline()) {
    return localList.length > 0 ? localList : INITIAL_ATTENDANCES;
  }

  try {
    const colRef = collection(db, 'attendances');
    const snapshot = await getDocs(query(colRef, limit(300)));

    if (snapshot.empty) {
      const seedList = localList.length > 0 ? localList : INITIAL_ATTENDANCES;
      for (const a of seedList) {
        try {
          await setDoc(doc(db, 'attendances', a.id), a);
        } catch {
          // ignore
        }
      }
      localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(seedList));
      return seedList;
    }

    const list: Attendance[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as Attendance);
    });
    localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(list));
    return list;
  } catch (error) {
    console.warn('Falling back to local attendances:', error);
    return localList.length > 0 ? localList : INITIAL_ATTENDANCES;
  }
}

export async function recordAttendance(attendance: Attendance): Promise<void> {
  const isCurrentlyOnline = isOnline();
  const itemToSave: Attendance = {
    ...attendance,
    syncStatus: isCurrentlyOnline ? 'synced' : 'pending',
  };

  const attendances = await getAttendances();
  // Check if attendance already recorded today for this target and type (masuk/pulang)
  const existingIdx = attendances.findIndex(
    (a) =>
      a.date === attendance.date &&
      a.targetId === attendance.targetId &&
      (a.type || 'masuk') === (attendance.type || 'masuk')
  );

  if (existingIdx >= 0) {
    attendances[existingIdx] = itemToSave;
  } else {
    attendances.unshift(itemToSave);
  }
  localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(attendances));

  if (!isCurrentlyOnline) {
    addToOfflineQueue({
      type: 'attendance',
      action: 'create',
      data: itemToSave,
    });
    return;
  }

  try {
    await setDoc(doc(db, 'attendances', itemToSave.id), itemToSave);
  } catch (error) {
    addToOfflineQueue({
      type: 'attendance',
      action: 'create',
      data: { ...itemToSave, syncStatus: 'pending' },
    });
    console.warn('Attendance queued for sync due to network error');
  }
}

export async function deleteAttendance(attendanceId: string): Promise<void> {
  const attendances = await getAttendances();
  const filtered = attendances.filter((a) => a.id !== attendanceId);
  localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(filtered));

  if (!isOnline()) {
    addToOfflineQueue({
      type: 'attendance',
      action: 'delete',
      data: { id: attendanceId },
    });
    return;
  }

  try {
    await deleteDoc(doc(db, 'attendances', attendanceId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `attendances/${attendanceId}`);
  }
}

// ================= LEARNING JOURNALS =================
export async function getJournals(forceRefresh = false): Promise<LearningJournal[]> {
  const cached = localStorage.getItem(STORAGE_KEYS.JOURNALS);
  let localList: LearningJournal[] = [];
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localList = parsed;
      }
    } catch {
      localList = [];
    }
  }

  if (!isOnline()) {
    return localList.length > 0 ? localList : INITIAL_JOURNALS;
  }

  try {
    const colRef = collection(db, 'learning_journals');
    const snapshot = await getDocs(query(colRef, limit(150)));

    if (snapshot.empty) {
      const seedList = localList.length > 0 ? localList : INITIAL_JOURNALS;
      for (const j of seedList) {
        try {
          await setDoc(doc(db, 'learning_journals', j.id), j);
        } catch {
          // ignore
        }
      }
      localStorage.setItem(STORAGE_KEYS.JOURNALS, JSON.stringify(seedList));
      return seedList;
    }

    const list: LearningJournal[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as LearningJournal);
    });
    localStorage.setItem(STORAGE_KEYS.JOURNALS, JSON.stringify(list));
    return list;
  } catch (error) {
    console.warn('Falling back to local journals:', error);
    return localList.length > 0 ? localList : INITIAL_JOURNALS;
  }
}

export async function saveJournal(journal: LearningJournal): Promise<void> {
  const isCurrentlyOnline = isOnline();
  const itemToSave: LearningJournal = {
    ...journal,
    syncStatus: isCurrentlyOnline ? 'synced' : 'pending',
  };

  const journals = await getJournals();
  const existingIdx = journals.findIndex((j) => j.id === journal.id);
  if (existingIdx >= 0) {
    journals[existingIdx] = itemToSave;
  } else {
    journals.unshift(itemToSave);
  }
  localStorage.setItem(STORAGE_KEYS.JOURNALS, JSON.stringify(journals));

  if (!isCurrentlyOnline) {
    addToOfflineQueue({
      type: 'journal',
      action: 'create',
      data: itemToSave,
    });
    return;
  }

  try {
    await setDoc(doc(db, 'learning_journals', itemToSave.id), itemToSave);
  } catch (error) {
    addToOfflineQueue({
      type: 'journal',
      action: 'create',
      data: { ...itemToSave, syncStatus: 'pending' },
    });
    console.warn('Journal queued for sync');
  }
}

export async function deleteJournal(journalId: string): Promise<void> {
  const journals = await getJournals();
  const filtered = journals.filter((j) => j.id !== journalId);
  localStorage.setItem(STORAGE_KEYS.JOURNALS, JSON.stringify(filtered));

  if (!isOnline()) {
    addToOfflineQueue({
      type: 'journal',
      action: 'delete',
      data: { id: journalId },
    });
    return;
  }

  try {
    await deleteDoc(doc(db, 'learning_journals', journalId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `learning_journals/${journalId}`);
  }
}

// ================= SCHOOL IDENTITY & OPERATIONAL SETTINGS =================
export async function getSchoolSettings(): Promise<SchoolIdentitySettings> {
  const cached = localStorage.getItem(STORAGE_KEYS.SCHOOL_SETTINGS);
  let localSettings: SchoolIdentitySettings = DEFAULT_SCHOOL_INFO;
  if (cached) {
    try {
      localSettings = JSON.parse(cached);
    } catch {
      localSettings = DEFAULT_SCHOOL_INFO;
    }
  }

  if (!isOnline()) {
    return localSettings;
  }

  try {
    const colRef = collection(db, 'settings');
    const snap = await getDocs(query(colRef, limit(10)));
    for (const d of snap.docs) {
      if (d.id === 'school_identity') {
        const data = d.data() as SchoolIdentitySettings;
        localStorage.setItem(STORAGE_KEYS.SCHOOL_SETTINGS, JSON.stringify(data));
        return data;
      }
    }
    // Seed default if empty in cloud
    await setDoc(doc(db, 'settings', 'school_identity'), localSettings);
    return localSettings;
  } catch (e) {
    console.warn('Could not fetch cloud school settings:', e);
    return localSettings;
  }
}

export async function saveSchoolSettings(settings: SchoolIdentitySettings): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.SCHOOL_SETTINGS, JSON.stringify(settings));

  if (isOnline()) {
    try {
      await setDoc(doc(db, 'settings', 'school_identity'), settings);
    } catch (e) {
      console.warn('Could not persist school settings to Firestore:', e);
    }
  }
}

export async function getOperationalSettings(): Promise<OperationalSettings> {
  const cached = localStorage.getItem(STORAGE_KEYS.OPERATIONAL_SETTINGS);
  let localSettings: OperationalSettings = DEFAULT_OPERATIONAL_SETTINGS;
  if (cached) {
    try {
      localSettings = JSON.parse(cached);
    } catch {
      localSettings = DEFAULT_OPERATIONAL_SETTINGS;
    }
  }

  if (!isOnline()) {
    return localSettings;
  }

  try {
    const colRef = collection(db, 'settings');
    const snap = await getDocs(query(colRef, limit(10)));
    for (const d of snap.docs) {
      if (d.id === 'operational') {
        const data = d.data() as OperationalSettings;
        localStorage.setItem(STORAGE_KEYS.OPERATIONAL_SETTINGS, JSON.stringify(data));
        return data;
      }
    }
    // Seed default if empty in cloud
    await setDoc(doc(db, 'settings', 'operational'), localSettings);
    return localSettings;
  } catch (e) {
    console.warn('Could not fetch cloud operational settings:', e);
    return localSettings;
  }
}

export async function saveOperationalSettings(settings: OperationalSettings): Promise<void> {
  localStorage.setItem(STORAGE_KEYS.OPERATIONAL_SETTINGS, JSON.stringify(settings));

  if (isOnline()) {
    try {
      await setDoc(doc(db, 'settings', 'operational'), settings);
    } catch (e) {
      console.warn('Could not persist operational settings to Firestore:', e);
    }
  }
}

// ================= SYNC OFFLINE QUEUE =================
export async function syncPendingQueue(): Promise<{ synced: number; failed: number }> {
  if (!isOnline()) {
    return { synced: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let syncedCount = 0;
  let failedCount = 0;
  const remainingQueue: QueuedOperation[] = [];

  for (const item of queue) {
    try {
      if (item.type === 'attendance') {
        if (item.action === 'create' || item.action === 'update') {
          const syncedData = { ...item.data, syncStatus: 'synced' };
          await setDoc(doc(db, 'attendances', item.data.id), syncedData);
        } else if (item.action === 'delete') {
          await deleteDoc(doc(db, 'attendances', item.data.id));
        }
      } else if (item.type === 'journal') {
        if (item.action === 'create' || item.action === 'update') {
          const syncedData = { ...item.data, syncStatus: 'synced' };
          await setDoc(doc(db, 'learning_journals', item.data.id), syncedData);
        } else if (item.action === 'delete') {
          await deleteDoc(doc(db, 'learning_journals', item.data.id));
        }
      } else if (item.type === 'student') {
        if (item.action === 'create' || item.action === 'update') {
          const sanitizedStudent = sanitizeStudentForFirestore(item.data);
          await setDoc(doc(db, 'students', item.data.id), sanitizedStudent, { merge: true });
        } else if (item.action === 'delete') {
          await deleteDoc(doc(db, 'students', item.data.id));
        }
      } else if (item.type === 'teacher') {
        if (item.action === 'create' || item.action === 'update') {
          await setDoc(doc(db, 'teachers', item.data.id), item.data);
        } else if (item.action === 'delete') {
          await deleteDoc(doc(db, 'teachers', item.data.id));
        }
      }
      syncedCount++;
    } catch (err) {
      console.error('Failed to sync queue item:', item, err);
      remainingQueue.push(item);
      failedCount++;
    }
  }

  localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(remainingQueue));
  return { synced: syncedCount, failed: failedCount };
}

// ================= REAL-TIME DELTA LISTENERS (1 READ PER CHANGE) =================
export function subscribeToStudentsRealtime(
  onDelta: (student: Student, changeType: 'added' | 'modified' | 'removed') => void
): () => void {
  if (!isOnline()) {
    return () => {};
  }

  const path = 'students';
  try {
    const colRef = collection(db, path);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        // Only process documents that actually changed to avoid wasteful full-collection re-reads
        snapshot.docChanges().forEach((change) => {
          const studentData = change.doc.data() as Student;
          onDelta(studentData, change.type);
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

export function subscribeToAttendancesRealtime(
  onDelta: (attendance: Attendance, changeType: 'added' | 'modified' | 'removed') => void
): () => void {
  if (!isOnline()) {
    return () => {};
  }

  const path = 'attendances';
  try {
    const colRef = collection(db, path);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const attData = change.doc.data() as Attendance;
          onDelta(attData, change.type);
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

export function subscribeToTeachersRealtime(
  onDelta: (teacher: Teacher, changeType: 'added' | 'modified' | 'removed') => void
): () => void {
  if (!isOnline()) return () => {};
  const path = 'teachers';
  try {
    const colRef = collection(db, path);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          onDelta(change.doc.data() as Teacher, change.type);
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

export function subscribeToJournalsRealtime(
  onDelta: (journal: LearningJournal, changeType: 'added' | 'modified' | 'removed') => void
): () => void {
  if (!isOnline()) return () => {};
  const path = 'learning_journals';
  try {
    const colRef = collection(db, path);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          onDelta(change.doc.data() as LearningJournal, change.type);
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

export function subscribeToSettingsRealtime(
  onUpdate: (type: 'identity' | 'operational', data: any) => void
): () => void {
  if (!isOnline()) return () => {};
  const path = 'settings';
  try {
    const colRef = collection(db, path);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.doc.id === 'school_identity') {
            onUpdate('identity', change.doc.data());
          } else if (change.doc.id === 'operational') {
            onUpdate('operational', change.doc.data());
          }
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

