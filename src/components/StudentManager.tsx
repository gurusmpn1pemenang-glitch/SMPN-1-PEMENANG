import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  QrCode,
  Printer,
  Download,
  Filter,
  GraduationCap,
  FileSpreadsheet,
  Upload,
  X,
  Check,
  User,
  School,
  AlertCircle,
  FileUp,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Student, Gender, StudentStatus, UserRole } from '../types/school';
import {
  exportStudentsToExcel,
  downloadStudentImportTemplate,
  exportKtsBatchToPdf,
  DEFAULT_SCHOOL_INFO,
} from '../utils/exportUtils';
import { useClickOutside } from '../utils/useClickOutside';
import { ClassDropdown } from './ClassDropdown';

interface StudentManagerProps {
  students: Student[];
  onSaveStudent: (student: Student) => Promise<void>;
  onSaveStudentsBatch: (students: Student[]) => Promise<{ added: number; updated: number }>;
  onDeleteStudent: (id: string) => Promise<void>;
  onDeleteStudentsBatch?: (ids: string[]) => Promise<void>;
  userRole: UserRole;
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  onSaveStudent,
  onSaveStudentsBatch,
  onDeleteStudent,
  onDeleteStudentsBatch,
  userRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('SEMUA');

  // Modals visibility
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [cardModalStudent, setCardModalStudent] = useState<Student | null>(null);
  const [cardQrUrl, setCardQrUrl] = useState<string>('');
  const [batchPrintClass, setBatchPrintClass] = useState<string | null>(null);

  // Excel Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importedPreview, setImportedPreview] = useState<Student[]>([]);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Form states for manual student add/edit
  const [formData, setFormData] = useState<{
    nisn: string;
    nis: string;
    name: string;
    gender: Gender;
    className: string;
    birthPlaceDate: string;
    parentName: string;
    parentPhone: string;
    address: string;
    drivePhotoUrl: string;
    status: StudentStatus;
  }>({
    nisn: '',
    nis: '',
    name: '',
    gender: 'L',
    className: '7A',
    birthPlaceDate: '',
    parentName: '',
    parentPhone: '',
    address: '',
    drivePhotoUrl: '',
    status: 'aktif',
  });

  // Modal Refs for auto-close via useClickOutside
  const studentFormModalRef = useRef<HTMLDivElement>(null);
  useClickOutside(studentFormModalRef, () => setIsModalOpen(false));

  const importModalRef = useRef<HTMLDivElement>(null);
  useClickOutside(importModalRef, () => {
    if (!isImporting) {
      setIsImportModalOpen(false);
      setImportedPreview([]);
      setImportErrors([]);
      setImportFeedback(null);
    }
  });

  const cardModalRef = useRef<HTMLDivElement>(null);
  useClickOutside(cardModalRef, () => setCardModalStudent(null));

  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);
  const [batchQrCodes, setBatchQrCodes] = useState<{ [nisn: string]: string }>({});
  const [isGeneratingBatchQr, setIsGeneratingBatchQr] = useState(false);

  const batchPrintModalRef = useRef<HTMLDivElement>(null);
  useClickOutside(batchPrintModalRef, () => setIsBatchPrintOpen(false));

  // Bulk Delete Modal States
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [batchDeleteSuccess, setBatchDeleteSuccess] = useState<string | null>(null);

  const batchDeleteModalRef = useRef<HTMLDivElement>(null);
  useClickOutside(batchDeleteModalRef, () => {
    if (!isDeletingBatch) {
      setIsBatchDeleteModalOpen(false);
    }
  });

  // Dynamic class options derived from master students data
  const classOptions = useMemo(() => {
    const set = new Set(['7A', '7B', '8A', '8B', '9A', '9B']);
    students.forEach((s) => {
      if (s.className && s.className.trim()) {
        set.add(s.className.trim());
      }
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [students]);

  // Dynamic student counts per class for dropdown
  const classCounts = useMemo(() => {
    const map: { [key: string]: number } = {};
    students.forEach((s) => {
      if (s.className) {
        map[s.className] = (map[s.className] || 0) + 1;
      }
    });
    return map;
  }, [students]);

  // Detected classes / rombel in the uploaded Excel preview
  const detectedRombels = useMemo(() => {
    const counts: { [cls: string]: number } = {};
    importedPreview.forEach((s) => {
      const c = s.className || '7A';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [importedPreview]);

  // Filter students based on active search term and class filter
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        !searchTerm.trim() ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        s.nisn.includes(searchTerm.trim()) ||
        (s.nis && s.nis.includes(searchTerm.trim()));
      const matchClass = selectedClass === 'SEMUA' || s.className === selectedClass;
      return matchSearch && matchClass;
    });
  }, [students, searchTerm, selectedClass]);

  // Execute bulk deletion of filtered students
  const handleExecuteBatchDelete = async () => {
    if (filteredStudents.length === 0) return;
    setIsDeletingBatch(true);
    setBatchDeleteSuccess(null);
    try {
      const idsToDelete = filteredStudents.map((s) => s.id);
      if (onDeleteStudentsBatch) {
        await onDeleteStudentsBatch(idsToDelete);
      } else {
        await Promise.all(idsToDelete.map((id) => onDeleteStudent(id)));
      }
      setBatchDeleteSuccess(`Berhasil menghapus ${idsToDelete.length} data siswa secara massal.`);
      setTimeout(() => {
        setIsBatchDeleteModalOpen(false);
        setBatchDeleteSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Error batch deleting students:', err);
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Generate QR for preview modal
  useEffect(() => {
    if (cardModalStudent) {
      QRCode.toDataURL(cardModalStudent.qrCode, {
        width: 180,
        margin: 1,
        color: {
          dark: '#064e3b',
          light: '#ffffff',
        },
      })
        .then((url) => setCardQrUrl(url))
        .catch((err) => console.error(err));
    }
  }, [cardModalStudent]);

  const handleOpenBatchPrint = async () => {
    setIsBatchPrintOpen(true);
    setIsGeneratingBatchQr(true);
    try {
      const qrMap: { [nisn: string]: string } = {};
      await Promise.all(
        filteredStudents.map(async (s) => {
          try {
            const url = await QRCode.toDataURL(s.qrCode, {
              width: 140,
              margin: 1,
              color: { dark: '#064e3b', light: '#ffffff' },
            });
            qrMap[s.nisn] = url;
          } catch {
            // ignore
          }
        })
      );
      setBatchQrCodes(qrMap);
    } finally {
      setIsGeneratingBatchQr(false);
    }
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Directly download mass KTS .pdf file matching active name and class filter
  const handleDirectDownloadKtsPdf = async () => {
    if (filteredStudents.length === 0) return;
    setIsDownloadingPdf(true);
    try {
      await exportKtsBatchToPdf(filteredStudents, {
        filterClass: selectedClass,
        searchTerm: searchTerm,
        qrMap: batchQrCodes,
      });
    } catch (err) {
      console.error('Error generating KTS PDF:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      nisn: '',
      nis: '',
      name: '',
      gender: 'L',
      className: '7A',
      birthPlaceDate: '',
      parentName: '',
      parentPhone: '',
      address: '',
      drivePhotoUrl: '',
      status: 'aktif',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    setFormData({
      nisn: s.nisn,
      nis: s.nis || '',
      name: s.name,
      gender: s.gender,
      className: s.className,
      birthPlaceDate: s.birthPlaceDate || '',
      parentName: s.parentName || '',
      parentPhone: s.parentPhone || s.phone || '',
      address: s.address || '',
      drivePhotoUrl: s.drivePhotoUrl || s.photoUrl || '',
      status: s.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nisn || !formData.name) return;

    const qrCode = `SMPN2TJ-SISWA-${formData.nisn.trim()}`;
    const newStudent: Student = {
      id: editingStudent ? editingStudent.id : `std_${Date.now()}`,
      nisn: formData.nisn.trim(),
      nis: formData.nis.trim() || '',
      name: formData.name.trim(),
      gender: formData.gender,
      className: formData.className,
      birthPlaceDate: formData.birthPlaceDate.trim() || '',
      parentName: formData.parentName.trim() || '',
      parentPhone: formData.parentPhone.trim() || '',
      phone: formData.parentPhone.trim() || '',
      address: formData.address.trim() || '',
      drivePhotoUrl: formData.drivePhotoUrl.trim() || '',
      photoUrl: formData.drivePhotoUrl.trim() || '',
      status: formData.status,
      qrCode,
      createdAt: editingStudent ? editingStudent.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveStudent(newStudent);
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus data siswa ${name}?`)) {
      await onDeleteStudent(id);
    }
  };

  // ================= EXCEL BULK IMPORT PARSER =================
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportErrors([]);
    setImportFeedback(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          setImportErrors(['File Excel kosong atau tidak memiliki baris data.']);
          return;
        }

        const parsedList: Student[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2; // header is row 1
          // Helper to get case-insensitive and flexible key lookup with punctuation stripping
          const getVal = (candidateKeys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const ck of candidateKeys) {
              const cleanCandidate = ck.toLowerCase().replace(/[\s_\-\/\.]/g, '');
              const matchedKey = rowKeys.find((rk) => {
                const cleanRk = rk.toLowerCase().replace(/[\s_\-\/\.]/g, '');
                return cleanRk === cleanCandidate;
              });
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
                let val = String(row[matchedKey]).trim();
                // Clean trailing floating point notation from Excel numbers e.g. "123456.0" -> "123456"
                val = val.replace(/\.0+$/, '').trim();
                return val;
              }
            }
            return '';
          };

          const nisnRaw = getVal([
            'NISN',
            'Nomor NISN',
            'No NISN',
            'No. NISN',
            'NISN Siswa',
            'NISN / NIPD',
            'NISN/NIPD',
            'Nomor Induk Siswa Nasional',
            'No Peserta Didik',
            'Nomor Peserta Didik',
            'NISN/NIS',
            'NISN / NIS',
          ]);
          const nis = getVal([
            'NIS',
            'Nomor Induk',
            'No Induk',
            'No. Induk',
            'NIPD',
            'Nomor Induk Siswa',
            'No. Induk Siswa',
            'NIS Lokal',
            'NIPD / NIS',
            'NIPD/NIS',
          ]);
          const name = getVal([
            'Nama',
            'Nama Siswa',
            'Nama Lengkap',
            'Nama Peserta Didik',
            'Peserta Didik',
            'Nama Murid',
            'Nama Siswa/i',
            'Nama Anak',
          ]);
          const classNameRaw = getVal([
            'Kelas',
            'Rombel',
            'Rombongan Belajar',
            'Tingkat',
            'Class',
            'Nama Kelas',
            'Kelompok Kelas',
            'Rombel / Kelas',
            'Kelas / Rombel',
            'Tingkat / Kelas',
            'Kelompok',
            'Tingkat Rombel',
            'Nama Rombel',
            'Tingkat Pendidikan',
            'Kelas Saat Ini',
            'Rombel Saat Ini',
          ]);
          const genderRaw = getVal([
            'Jenis Kelamin',
            'JK',
            'Gender',
            'L/P',
            'J.K.',
            'Sex',
            'Kelamin',
          ]).toUpperCase();

          // Handle single combined TTL column or separate Tempat & Tanggal Lahir columns
          const tempatLahir = getVal(['Tempat Lahir', 'Tempat']);
          const tanggalLahir = getVal(['Tanggal Lahir', 'Tgl Lahir', 'Tanggal', 'Tgl. Lahir']);
          let ttl = getVal(['Tempat & Tanggal Lahir', 'Tempat Tanggal Lahir', 'TTL', 'Tempat, Tanggal Lahir']);
          if (!ttl && (tempatLahir || tanggalLahir)) {
            ttl = [tempatLahir, tanggalLahir].filter(Boolean).join(', ');
          }

          const alamat = getVal([
            'Alamat',
            'Alamat Lengkap',
            'Alamat Tempat Tinggal',
            'Alamat Siswa',
            'Alamat Peserta Didik',
            'Dusun',
            'Desa/Kelurahan',
            'Desa',
            'Kelurahan',
          ]);
          const noHpOrtu = getVal([
            'No HP Orang Tua',
            'HP Orang Tua',
            'No Telepon',
            'Telepon Ortu',
            'No HP',
            'Nomor HP',
            'No. HP',
            'No. HP Ortu',
            'No Telp',
            'Telepon',
            'HP',
            'Nomor Telepon',
            'No. Telepon',
            'Kontak Ortu',
            'No WA',
            'WhatsApp',
          ]);
          const namaOrtu = getVal([
            'Nama Orang Tua',
            'Orang Tua',
            'Wali',
            'Nama Ayah',
            'Nama Ibu',
            'Nama Wali',
            'Orang Tua / Wali',
            'Nama Orang Tua / Wali',
            'Nama Ayah/Ibu',
            'Ayah/Ibu',
          ]);
          const drivePhoto = getVal([
            'Link Drive Foto Siswa',
            'Link Foto',
            'Foto',
            'Link Foto Siswa',
            'URL Foto',
            'Foto Siswa',
            'Link Drive',
            'Link',
          ]);

          // If row is completely empty (e.g. blank rows at the end of Excel), skip silently
          if (!name && !nisnRaw && !nis && !classNameRaw) {
            return;
          }

          // If name is missing, skip and log error
          if (!name) {
            errors.push(`Baris ${rowNum}: Nama Siswa kosong, baris dilewati.`);
            return;
          }

          // If NISN is missing, fallback gracefully to NIS or generate a unique identifier so the student is NOT lost
          let nisn = nisnRaw;
          if (!nisn || nisn === '-' || nisn === '0') {
            if (nis && nis !== '-' && nis !== '0') {
              nisn = nis;
            } else {
              nisn = `NISN${Date.now().toString().slice(-6)}${idx + 1}`;
            }
          }

          const isFemale =
            genderRaw.startsWith('P') ||
            genderRaw.startsWith('W') ||
            genderRaw === 'PEREMPUAN' ||
            genderRaw === 'WANITA';
          const gender: Gender = isFemale ? 'P' : 'L';

          let className = classNameRaw ? classNameRaw.toUpperCase().trim() : '7A';
          className = className.replace(/^(KELAS|ROMBEL)\s+/i, '').trim();
          if (!className) className = '7A';

          const uniqueId = `std_imp_${nisn.replace(/[^a-zA-Z0-9]/g, '')}_${idx}_${Date.now()}`;

          parsedList.push({
            id: uniqueId,
            nisn,
            nis: nis || '',
            name,
            className,
            gender,
            birthPlaceDate: ttl || '',
            address: alamat || '',
            parentPhone: noHpOrtu || '',
            phone: noHpOrtu || '',
            parentName: namaOrtu || '',
            drivePhotoUrl: drivePhoto || '',
            photoUrl: drivePhoto || '',
            status: 'aktif',
            qrCode: `SMPN2TJ-SISWA-${nisn}`,
            createdAt: new Date().toISOString(),
          });
        });

        if (errors.length > 0 && parsedList.length === 0) {
          setImportErrors(errors);
        } else {
          setImportedPreview(parsedList);
          if (errors.length > 0) {
            setImportErrors(errors.slice(0, 5)); // show first few
          }
        }
      } catch (err: any) {
        setImportErrors([`Gagal membaca file Excel: ${err?.message || 'Format tidak valid'}`]);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleCommitImport = async () => {
    if (importedPreview.length === 0) return;
    setIsImporting(true);
    try {
      const res = await onSaveStudentsBatch(importedPreview);
      setImportFeedback(
        `Berhasil menyimpan seluruh ${importedPreview.length} data siswa (${res.added} siswa baru ditambahkan, ${res.updated} siswa diperbarui).`
      );
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportedPreview([]);
        setImportFeedback(null);
      }, 2000);
    } catch (err: any) {
      setImportErrors([`Terjadi kesalahan saat menyimpan ke database: ${err?.message || ''}`]);
    } finally {
      setIsImporting(false);
    }
  };

  const canEdit = userRole === 'admin' || userRole === 'kepala_sekolah';

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-700" />
            <span>Data Siswa & Kartu Pelajar (KTS)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manajemen master data siswa, cetak kartu pelajar QR digital, dan import data massal Excel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Unduh Format Template */}
          <button
            onClick={() => downloadStudentImportTemplate()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
            title="Unduh format template Excel resmi untuk impor siswa"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Unduh Format Excel</span>
          </button>

          {/* Import Excel */}
          {canEdit && (
            <button
              onClick={() => {
                setImportedPreview([]);
                setImportErrors([]);
                setImportFileName('');
                setImportFeedback(null);
                setIsImportModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>Import Excel Massal</span>
            </button>
          )}

          {/* Ekspor Excel */}
          <button
            onClick={() => exportStudentsToExcel(filteredStudents)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          {/* Ekspor Massal KTS.pdf Berdasarkan Filter Aktif */}
          <button
            type="button"
            onClick={handleOpenBatchPrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold border border-indigo-300 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Buka pratinjau dan ekspor massal KTS.pdf sesuai filter Nama & Kelas yang aktif"
          >
            <Printer className="w-4 h-4 text-indigo-700" />
            <span>Ekspor Massal KTS.pdf ({selectedClass === 'SEMUA' ? 'Semua' : `Kelas ${selectedClass}`} - {filteredStudents.length} Siswa)</span>
          </button>

          {/* Tombol Unduh Langsung PDF KTS Sesuai Filter */}
          <button
            type="button"
            onClick={handleDirectDownloadKtsPdf}
            disabled={filteredStudents.length === 0 || isDownloadingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            title="Unduh langsung file PDF hasil ekspor massal KTS sesuai filter aktif"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloadingPdf ? 'Mengunduh...' : 'Unduh'}</span>
          </button>

          {/* Tambah Siswa Baru */}
          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Siswa</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, NISN, atau NIS siswa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Class Filter Dropdown and Bulk Delete Button */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Filter Kelas:</span>
            <ClassDropdown
              selectedClass={selectedClass}
              onSelectClass={setSelectedClass}
              classList={classOptions}
              counts={classCounts}
              allLabel={`Semua Kelas (${students.length})`}
            />
          </div>

          {/* Bulk Delete Button matching Active Filter / Search */}
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsBatchDeleteModalOpen(true)}
              disabled={filteredStudents.length === 0}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                filteredStudents.length === 0
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 shadow-2xs active:scale-95'
              }`}
              title="Hapus massal seluruh siswa yang tampil pada hasil pencarian / filter ini"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>
                Hapus Massal (
                {searchTerm || selectedClass !== 'SEMUA'
                  ? `${filteredStudents.length} Terfilter`
                  : `${filteredStudents.length} Siswa`}
                )
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Table of Students */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 text-center w-12">No</th>
                <th className="py-3 px-4">NISN / NIS</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4 text-center">L/P</th>
                <th className="py-3 px-4 text-center">Kelas</th>
                <th className="py-3 px-4">TTL & Orang Tua</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Kartu KTS</th>
                {canEdit && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Tidak ada siswa yang cocok dengan kriteria pencarian atau kelas ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, index) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-medium text-slate-400">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-900">{s.nisn}</div>
                      {s.nis && <div className="text-[10px] text-slate-400">NIS: {s.nis}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        {s.drivePhotoUrl ? (
                          <img
                            src={s.drivePhotoUrl}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-slate-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block w-5 h-5 rounded-full text-[10px] font-bold leading-5 ${
                          s.gender === 'L'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {s.gender}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-emerald-800">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                        {s.className}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-medium text-slate-800 truncate max-w-[200px]">
                        {s.birthPlaceDate || '-'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        Ortu: {s.parentName || '-'} {s.parentPhone ? `(${s.parentPhone})` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          s.status === 'aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setCardModalStudent(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-xs"
                      >
                        <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                        <span>KTS</span>
                      </button>
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Edit Data Siswa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Siswa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL 1: EXCEL BULK IMPORT ================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            ref={importModalRef}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95"
          >
            {/* Modal Header */}
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-bold text-sm">
                    Import Data Siswa Massal (Excel .xlsx)
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Struktur kolom: NISN, NIS, Nama, Kelas, Jenis Kelamin, Tempat & Tanggal Lahir, Alamat, No HP Orang Tua, Nama Orang Tua, Link Drive Foto Siswa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {importFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importFeedback}</span>
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Peringatan Format Data:</span>
                  </div>
                  {importErrors.map((err, i) => (
                    <p key={i} className="text-[11px] text-rose-700">
                      • {err}
                    </p>
                  ))}
                </div>
              )}

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center bg-slate-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  <div className="p-3 rounded-full bg-emerald-100 text-emerald-700">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-emerald-700">
                      Klik atau seret file Excel ke sini
                    </span>{' '}
                    <span className="text-slate-500">untuk mengunggah</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Format file yang didukung: .xlsx, .xls
                  </p>
                  {importFileName && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mt-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{importFileName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Table */}
              {importedPreview.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">
                      Pratinjau Data ({importedPreview.length} Siswa Terbaca):
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Siap dimasukkan ke basis data & cloud
                    </span>
                  </div>

                  {/* Detected Classes / Rombels Banner */}
                  {detectedRombels.length > 0 && (
                    <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Rombel / Kelas Terdeteksi ({detectedRombels.length} Kelas):
                        </span>
                        <span className="text-[10px] text-emerald-700 font-medium">
                          Otomatis sinkron ke grafik & analitik kehadiran
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {detectedRombels.map(([clsName, count]) => (
                          <span
                            key={clsName}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-[11px] font-bold shadow-2xs"
                          >
                            <span>Kelas {clsName}</span>
                            <span className="text-emerald-600 font-normal">({count} siswa)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold text-[11px] sticky top-0">
                        <tr>
                          <th className="py-2 px-3">No</th>
                          <th className="py-2 px-3">NISN</th>
                          <th className="py-2 px-3">NIS</th>
                          <th className="py-2 px-3">Nama Lengkap</th>
                          <th className="py-2 px-3">Kelas</th>
                          <th className="py-2 px-3">L/P</th>
                          <th className="py-2 px-3">TTL</th>
                          <th className="py-2 px-3">Nama Ortu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {importedPreview.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-1.5 px-3 font-mono font-semibold text-slate-900">
                              {row.nisn}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-slate-500">
                              {row.nis || '-'}
                            </td>
                            <td className="py-1.5 px-3 font-semibold text-slate-800">
                              {row.name}
                            </td>
                            <td className="py-1.5 px-3 text-emerald-700 font-bold">
                              {row.className}
                            </td>
                            <td className="py-1.5 px-3">{row.gender}</td>
                            <td className="py-1.5 px-3 text-slate-500 truncate max-w-[150px]">
                              {row.birthPlaceDate || '-'}
                            </td>
                            <td className="py-1.5 px-3 text-slate-500 truncate max-w-[150px]">
                              {row.parentName || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => downloadStudentImportTemplate()}
                className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Format Template Resmi</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCommitImport}
                  disabled={importedPreview.length === 0 || isImporting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isImporting
                      ? 'Menyimpan...'
                      : `Impor ${importedPreview.length} Siswa Sekarang`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ADD / EDIT STUDENT ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            ref={studentFormModalRef}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95"
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NISN *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    placeholder="Contoh: 0098765431"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIS (Nomor Induk Siswa)
                  </label>
                  <input
                    type="text"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    placeholder="Contoh: 21001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nama sesuai akta lahir..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rombel / Kelas
                  </label>
                  <select
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {classOptions.map((c) => (
                      <option key={c} value={c}>
                        Kelas {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tempat & Tanggal Lahir
                  </label>
                  <input
                    type="text"
                    value={formData.birthPlaceDate}
                    onChange={(e) => setFormData({ ...formData, birthPlaceDate: e.target.value })}
                    placeholder="Contoh: Tanjung, 12 Mei 2011"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Orang Tua / Wali
                  </label>
                  <input
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    placeholder="Nama ayah/ibu/wali..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. HP Orang Tua
                  </label>
                  <input
                    type="tel"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    placeholder="0819..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Tempat Tinggal
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Dusun, Desa, Kecamatan..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Link Drive Foto Siswa (Opsional)
                  </label>
                  <input
                    type="url"
                    value={formData.drivePhotoUrl}
                    onChange={(e) => setFormData({ ...formData, drivePhotoUrl: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Kesiswaan
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="mutasi">Mutasi</option>
                    <option value="lulus">Lulus</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  Simpan Data Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: KARTU TANDA SISWA (KTS) STANDAR CR-80 (8.56cm x 5.4cm) ================= */}
      {cardModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            ref={cardModalRef}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 flex flex-col"
          >
            {/* Modal Header */}
            <div className="bg-slate-900 p-3.5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4 text-emerald-400" />
                <span className="font-extrabold text-xs">
                  Pratinjau KTS Standar CR-80 (8,56 cm × 5,4 cm)
                </span>
              </div>
              <button
                onClick={() => setCardModalStudent(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Card Preview */}
            <div className="p-6 flex flex-col items-center justify-center bg-slate-100/80">
              <div
                className="w-full max-w-[390px] aspect-[85.6/54] bg-white rounded-xl shadow-xl border border-slate-300 overflow-hidden flex flex-col justify-between"
                style={{ minHeight: '230px' }}
              >
                {/* Kop Surat KTS */}
                <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-3 py-1.5 flex items-center justify-between border-b-2 border-amber-400">
                  <div className="flex items-center gap-2">
                    <School className="w-5 h-5 text-emerald-300 shrink-0" />
                    <div className="leading-tight">
                      <div className="text-[7.5px] font-bold uppercase tracking-wider text-teal-200">
                        PEMKAB LOMBOK UTARA • DISDIKPORA
                      </div>
                      <div className="text-[11px] font-black tracking-tight text-white">
                        SMP NEGERI 2 TANJUNG
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[7.5px] uppercase tracking-wider">
                      KTS DIGITAL
                    </span>
                    <div className="text-[7px] text-teal-200 font-mono">NPSN: 50205566</div>
                  </div>
                </div>

                {/* Card Main Body: Left Foto 3x4 | Center Identitas | Right QR 3x3 cm */}
                <div className="p-3 flex-1 flex items-center justify-between gap-2.5 bg-white text-slate-800">
                  {/* Left Column: Photo 3x4 */}
                  <div className="flex flex-col items-center justify-center shrink-0 w-16">
                    {cardModalStudent.drivePhotoUrl ? (
                      <img
                        src={cardModalStudent.drivePhotoUrl}
                        alt={cardModalStudent.name}
                        className="w-16 h-22 rounded-md object-cover border border-emerald-700 shadow-xs"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-22 rounded-md bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                        <User className="w-6 h-6 text-slate-400" />
                        <span className="text-[7px] font-bold mt-1">FOTO 3x4</span>
                      </div>
                    )}
                  </div>

                  {/* Center Column: Student Data / Identitas */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-1 text-[9px] pr-1">
                    <div>
                      <span className="text-[7px] text-slate-400 font-semibold uppercase block">
                        Nama Siswa
                      </span>
                      <span className="font-black text-xs text-slate-900 block truncate">
                        {cardModalStudent.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <span className="text-[6.5px] text-slate-400 font-semibold block">NISN / NIS</span>
                        <span className="font-mono font-bold text-emerald-800 text-[9px] block truncate">
                          {cardModalStudent.nisn} {cardModalStudent.nis ? `/ ${cardModalStudent.nis}` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-[6.5px] text-slate-400 font-semibold block">Kelas / JK</span>
                        <span className="font-bold text-slate-800 text-[9px] block">
                          Kelas {cardModalStudent.className} ({cardModalStudent.gender === 'L' ? 'L' : 'P'})
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[6.5px] text-slate-400 font-semibold block">Tempat, Tgl Lahir</span>
                      <span className="text-slate-700 text-[8px] block truncate font-medium">
                        {cardModalStudent.birthPlaceDate || 'Tanjung, Lombok Utara'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[6.5px] text-slate-400 font-semibold block">Nama Orang Tua</span>
                      <span className="text-slate-700 text-[8px] block truncate">
                        {cardModalStudent.parentName || '-'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[6.5px] text-slate-400 font-semibold block">Alamat</span>
                      <span className="text-slate-600 text-[7.5px] block truncate">
                        {cardModalStudent.address || 'Kec. Tanjung, Kab. Lombok Utara'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: QR Code (Exact 3 x 3 cm on right of identity) */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <div
                      className="bg-white p-0.5 rounded border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden"
                      style={{ width: '3cm', height: '3cm', minWidth: '3cm', minHeight: '3cm' }}
                    >
                      {cardQrUrl ? (
                        <img
                          src={cardQrUrl}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-[7.5px] text-slate-400 font-mono">
                          <QrCode className="w-6 h-6 text-slate-300 mb-0.5" />
                          <span>3 x 3 cm</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[6.5px] text-slate-400 font-mono font-bold mt-0.5">QR 3 × 3 cm</span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="bg-slate-900 text-slate-300 text-[7px] px-3 py-1 flex items-center justify-between border-t border-slate-200">
                  <span className="font-mono text-emerald-400 font-semibold">
                    Ukuran Standar ID Card: 8,56 cm × 5,4 cm
                  </span>
                  <span className="text-slate-400">SMPN 2 TANJUNG</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-3 text-center">
                Dimensi kartu sesuai standar kartu pelajar nasional (CR-80 / ID-1: 85,60 mm × 53,98 mm).
              </p>
            </div>

            {/* Card Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <a
                href={cardQrUrl}
                download={`KTS_${cardModalStudent.nisn}_${cardModalStudent.name.replace(/\s+/g, '_')}.png`}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Unduh Gambar QR</span>
              </a>
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-950/20 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: EKSPOR MASSAL KTS BERDASARKAN FILTER ================= */}
      {isBatchPrintOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div
            ref={batchPrintModalRef}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-4 text-white flex items-center justify-between border-b border-indigo-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-800/80 border border-indigo-700 flex items-center justify-center text-indigo-300">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    Ekspor Massal Kartu Tanda Siswa (KTS.pdf)
                  </h3>
                  <p className="text-[11px] text-indigo-200">
                    Filter Dinamis: <strong className="text-white">{selectedClass === 'SEMUA' ? 'Semua Kelas' : `Kelas ${selectedClass}`}</strong> {searchTerm ? `• Pencarian: "${searchTerm}"` : ''} • Total <strong>{filteredStudents.length} Siswa</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchPrintOpen(false)}
                className="text-indigo-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction & Action Banner */}
            <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-900">
              <div>
                <p className="font-semibold">
                  Sesuai Filter Aktif: {filteredStudents.length} siswa siap diekspor ke format PDF atau dicetak.
                </p>
                <p className="text-[11px] text-indigo-700">
                  Layout kartu KTS standar CR-80 dengan QR Code presensi <strong>3 × 3 cm</strong> di sebelah kanan identitas siswa.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  disabled={isDownloadingPdf || filteredStudents.length === 0}
                  onClick={handleDirectDownloadKtsPdf}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-950/20 active:scale-95"
                >
                  {isDownloadingPdf ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Unduh File KTS.pdf</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-950/20 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Browser (A4)</span>
                </button>
              </div>
            </div>

            {/* Cards Grid Preview (Printable Area) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100">
              {isGeneratingBatchQr ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-indigo-300 border-t-indigo-700 rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    Menyiapkan kode QR presensi (3 × 3 cm) untuk {filteredStudents.length} siswa...
                  </p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500">
                  Tidak ada data siswa untuk diekspor pada filter yang aktif.
                </div>
              ) : (
                <div
                  id="printable-kts-area"
                  className="grid grid-cols-1 lg:grid-cols-2 gap-4 place-items-center"
                >
                  {filteredStudents.map((std) => (
                    <div
                      key={std.id}
                      className="w-[390px] h-[225px] sm:w-[420px] sm:h-[238px] bg-white rounded-xl shadow-md border border-slate-300 overflow-hidden flex flex-col justify-between cr80-card-print"
                      style={{
                        aspectRatio: '85.6/54',
                      }}
                    >
                      {/* Kop KTS */}
                      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-2.5 py-1.5 flex items-center justify-between border-b-2 border-amber-400">
                        <div className="flex items-center gap-1.5">
                          <School className="w-4 h-4 text-emerald-300 shrink-0" />
                          <div className="leading-tight">
                            <div className="text-[6.5px] font-bold uppercase tracking-wider text-teal-200">
                              PEMKAB LOMBOK UTARA • DISDIKPORA
                            </div>
                            <div className="text-[9.5px] font-black tracking-tight text-white">
                              SMP NEGERI 2 TANJUNG
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[7px] uppercase tracking-wider">
                            KTS DIGITAL
                          </span>
                          <div className="text-[6.5px] text-teal-200 font-mono">NPSN: 50205566</div>
                        </div>
                      </div>

                      {/* Content: 3-column layout (Left: Photo, Center: Biodata, Right: QR Code 3x3 cm) */}
                      <div className="p-2 flex-1 flex items-center justify-between gap-2 bg-white text-slate-800">
                        {/* 1. Left: Foto Siswa 3x4 */}
                        <div className="flex flex-col items-center justify-center shrink-0">
                          {std.drivePhotoUrl ? (
                            <img
                              src={std.drivePhotoUrl}
                              alt={std.name}
                              className="w-13 h-17 rounded object-cover border border-emerald-700 shadow-2xs"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-13 h-17 rounded bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                              <User className="w-5 h-5 text-slate-400" />
                              <span className="text-[6.5px] font-bold mt-0.5">3x4</span>
                            </div>
                          )}
                        </div>

                        {/* 2. Center: Identitas Siswa */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-0.5 text-[8.5px] px-1">
                          <div>
                            <span className="text-[6.5px] text-slate-400 font-semibold uppercase block">
                              Nama Siswa
                            </span>
                            <span className="font-black text-[10px] text-slate-900 block truncate">
                              {std.name}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1">
                            <div>
                              <span className="text-[6px] text-slate-400 font-semibold block">NISN / NIS</span>
                              <span className="font-mono font-bold text-emerald-800 text-[8.5px] block truncate">
                                {std.nisn} {std.nis ? `/ ${std.nis}` : ''}
                              </span>
                            </div>
                            <div>
                              <span className="text-[6px] text-slate-400 font-semibold block">Kelas / JK</span>
                              <span className="font-bold text-slate-800 text-[8.5px] block truncate">
                                Kelas {std.className} ({std.gender})
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[6px] text-slate-400 font-semibold block">Tempat, Tgl Lahir</span>
                            <span className="text-slate-700 text-[7.5px] block truncate font-medium">
                              {std.birthPlaceDate || 'Tanjung, Lombok Utara'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[6px] text-slate-400 font-semibold block">Orang Tua / Wali</span>
                            <span className="text-slate-700 text-[7.5px] block truncate">
                              {std.parentName || '-'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[6px] text-slate-400 font-semibold block">Alamat</span>
                            <span className="text-slate-600 text-[7px] block truncate">
                              {std.address || 'Kec. Tanjung, Kab. Lombok Utara'}
                            </span>
                          </div>
                        </div>

                        {/* 3. Right: QR Code at exact 3 x 3 cm */}
                        <div className="flex flex-col items-center justify-center shrink-0">
                          <div
                            className="bg-white p-0.5 rounded border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden"
                            style={{ width: '3cm', height: '3cm', minWidth: '3cm', minHeight: '3cm' }}
                          >
                            {batchQrCodes[std.nisn] ? (
                              <img
                                src={batchQrCodes[std.nisn]}
                                alt="QR"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-[7px] text-slate-400 font-mono">
                                <QrCode className="w-5 h-5 text-slate-300 mb-0.5" />
                                <span>3 × 3 cm</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[6px] text-slate-400 font-mono font-bold mt-0.5">QR 3 × 3 cm</span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="bg-slate-900 text-slate-300 text-[6.5px] px-2.5 py-0.5 flex items-center justify-between border-t border-slate-200">
                        <span className="font-mono text-emerald-400 font-semibold">
                          CR-80 • 8,56 cm × 5,4 cm
                        </span>
                        <span className="text-slate-400">SMPN 2 TANJUNG</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-slate-600 font-medium">
                {filteredStudents.length} kartu KTS terpilih
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchPrintOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={isDownloadingPdf || filteredStudents.length === 0}
                  onClick={handleDirectDownloadKtsPdf}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-950/20 active:scale-95"
                >
                  {isDownloadingPdf ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Unduh File KTS.pdf</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-950/20 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Lembar KTS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: BULK DELETE CONFIRMATION ================= */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            ref={batchDeleteModalRef}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95"
          >
            {/* Modal Header */}
            <div className="p-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-200" />
                <h3 className="font-bold text-sm">Konfirmasi Hapus Siswa Massal</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingBatch) setIsBatchDeleteModalOpen(false);
                }}
                disabled={isDeletingBatch}
                className="text-rose-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {batchDeleteSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-bold animate-in fade-in">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{batchDeleteSuccess}</span>
                </div>
              ) : (
                <>
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-900 space-y-1">
                      <p className="font-bold">
                        Peringatan: Tindakan ini bersifat permanen!
                      </p>
                      <p className="text-rose-700 leading-relaxed">
                        Data siswa yang sesuai dengan filter pencarian aktif di bawah ini akan dihapus dari sistem dan cloud Firestore secara massal.
                      </p>
                    </div>
                  </div>

                  {/* Summary of active filters */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                    <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                      Ringkasan Target Penghapusan:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">Pencarian Teks</span>
                        <span className="font-bold text-slate-800 truncate block">
                          {searchTerm.trim() ? `"${searchTerm.trim()}"` : 'Semua (Tanpa kata kunci)'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">Filter Kelas</span>
                        <span className="font-bold text-slate-800 truncate block">
                          {selectedClass === 'SEMUA' ? 'Semua Kelas' : `Kelas ${selectedClass}`}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-rose-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Total Siswa yang akan dihapus:</span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold text-sm font-mono">
                        {filteredStudents.length} Siswa
                      </span>
                    </div>
                  </div>

                  {/* Student List Preview */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-700">
                      Daftar Siswa Terfilter ({filteredStudents.length} Siswa):
                    </span>
                    <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                      {filteredStudents.slice(0, 50).map((s, idx) => (
                        <div key={s.id} className="p-2 flex items-center justify-between hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-400 w-5 text-right">{idx + 1}.</span>
                            <div>
                              <div className="font-bold text-slate-800">{s.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">NISN: {s.nisn}</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                            {s.className}
                          </span>
                        </div>
                      ))}
                      {filteredStudents.length > 50 && (
                        <div className="p-2 text-center text-[11px] text-slate-400 italic bg-slate-50">
                          ... dan {filteredStudents.length - 50} siswa lainnya
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isDeletingBatch}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchDelete}
                disabled={isDeletingBatch || filteredStudents.length === 0 || !!batchDeleteSuccess}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {isDeletingBatch
                    ? 'Sedang Menghapus...'
                    : `Hapus Permanen ${filteredStudents.length} Siswa`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
