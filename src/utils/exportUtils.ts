import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Attendance, LearningJournal, Student, MonthlyReport, SchoolIdentitySettings } from '../types/school';

// Default official school letterhead info
export const DEFAULT_SCHOOL_INFO: SchoolIdentitySettings = {
  schoolName: 'SMP NEGERI 1 TANJUNG',
  npsn: '50205566',
  districtName: 'Kabupaten Lombok Utara',
  provinceName: 'Nusa Tenggara Barat',
  address: 'Jl. Pariwisata Tanjung - Sire, Sokong, Kec. Tanjung, Kab. Lombok Utara, NTB',
  postalCode: '83352',
  vision: 'Terwujudnya Peserta Didik yang Beriman, Cerdas, Terampil, Mandiri, Berkarakter, dan Berwawasan Lingkungan',
  schoolLogoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=120&q=80',
  districtLogoUrl: 'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=120&q=80',
  headmasterName: 'Drs. H. Suhartono, M.Pd.',
  headmasterNip: '19760812 200212 1 003',
  phone: '(0370) 6123456',
  email: 'smpn1tanjung@gmail.com',
  website: 'https://smpn1tanjung.sch.id',
  updatedAt: new Date().toISOString(),
};

export const SCHOOL_INFO = DEFAULT_SCHOOL_INFO;

// ================= EXCEL TEMPLATE FOR STUDENT IMPORT =================
/**
 * Generates and downloads the official Excel template for bulk student import
 * with mandatory column structure specified by SMPN 1 Tanjung:
 * NISN, NIS, Nama, Kelas, Jenis Kelamin, Tempat & Tanggal Lahir, Alamat, No HP Orang Tua, Nama Orang Tua, Link Drive Foto Siswa
 */
export function downloadStudentImportTemplate(filename = 'Template_Import_Siswa_SMPN1Tanjung.xlsx') {
  const sampleData = [
    {
      'NISN': '0098765431',
      'NIS': '21001',
      'Nama': 'Ahmad Fauzan Pratama',
      'Kelas': '7A',
      'Jenis Kelamin': 'L',
      'Tempat & Tanggal Lahir': 'Tanjung, 12 Mei 2011',
      'Alamat': 'Dusun Sire, Desa Sigar Penjalin, Tanjung',
      'No HP Orang Tua': '081987654321',
      'Nama Orang Tua': 'Baharuddin',
      'Link Drive Foto Siswa': 'https://drive.google.com/uc?id=contoh1',
    },
    {
      'NISN': '0098765432',
      'NIS': '21002',
      'Nama': 'Baiq Nurul Hidayati',
      'Kelas': '7A',
      'Jenis Kelamin': 'P',
      'Tempat & Tanggal Lahir': 'Medana, 24 Agustus 2011',
      'Alamat': 'Dusun Karang Bajo, Tanjung',
      'No HP Orang Tua': '087812345678',
      'Nama Orang Tua': 'Lalu Munawar',
      'Link Drive Foto Siswa': '',
    },
    {
      'NISN': '0098765433',
      'NIS': '21003',
      'Nama': 'Dimas Bagus Saputra',
      'Kelas': '7B',
      'Jenis Kelamin': 'L',
      'Tempat & Tanggal Lahir': 'Pemenang, 03 Februari 2011',
      'Alamat': 'Jl. Raya Tanjung Km 3',
      'No HP Orang Tua': '085934567890',
      'Nama Orang Tua': 'I Made Widiarta',
      'Link Drive Foto Siswa': '',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 15 }, // NISN
    { wch: 12 }, // NIS
    { wch: 28 }, // Nama
    { wch: 10 }, // Kelas
    { wch: 14 }, // Jenis Kelamin
    { wch: 28 }, // TTL
    { wch: 38 }, // Alamat
    { wch: 18 }, // No HP Ortu
    { wch: 24 }, // Nama Ortu
    { wch: 35 }, // Link Drive Foto
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Siswa_Import');
  XLSX.writeFile(workbook, filename);
}

// ================= EXCEL EXPORTS =================
export function exportAttendanceToExcel(
  attendances: Attendance[],
  filename = 'Rekap_Presensi_SMPN1Tanjung.xlsx'
) {
  const data = attendances.map((att, index) => ({
    'No': index + 1,
    'Tanggal': att.date,
    'Waktu Scan': att.time,
    'Jenis Scan': att.type === 'pulang' ? 'Scan Pulang' : 'Scan Masuk',
    'Tipe': att.targetType === 'siswa' ? 'Siswa' : 'Guru / Staf',
    'Nama Lengkap': att.targetName,
    'NISN / NIP': att.nisnOrNip,
    'Kelas / Mapel': att.className,
    'Status Kehadiran': att.status.toUpperCase(),
    'Keterlambatan': att.isLate ? `Terlambat (${att.lateMinutes || 0} menit)` : 'Tepat Waktu',
    'Petugas Scan': att.recordedBy || 'Petugas Scanner',
    'Keterangan': att.notes || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Presensi');
  XLSX.writeFile(workbook, filename);
}

export function exportJournalsToExcel(
  journals: LearningJournal[],
  filename = 'Jurnal_Pembelajaran_SMPN1Tanjung.xlsx'
) {
  const data = journals.map((j, index) => ({
    'No': index + 1,
    'Tanggal': j.date,
    'Nama Guru': j.teacherName,
    'Mata Pelajaran': j.subject,
    'Kelas': j.className,
    'Jam Ke-': j.period,
    'Materi / Topik Pembelajaran': j.topic,
    'Aktivitas Belajar': j.activities,
    'Kehadiran Siswa': j.studentAttendanceSummary || '-',
    'Catatan / Evaluasi': j.notes || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jurnal_Mengajar');
  XLSX.writeFile(workbook, filename);
}

export function exportStudentsToExcel(
  students: Student[],
  filename = 'Data_Siswa_SMPN1Tanjung.xlsx'
) {
  const data = students.map((s, index) => ({
    'No': index + 1,
    'NISN': s.nisn,
    'NIS': s.nis || '-',
    'Nama Siswa': s.name,
    'Jenis Kelamin': s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
    'Kelas': s.className,
    'Tempat & Tanggal Lahir': s.birthPlaceDate || '-',
    'Nama Orang Tua': s.parentName || '-',
    'No HP Orang Tua': s.parentPhone || s.phone || '-',
    'Alamat': s.address || '-',
    'Status': s.status.toUpperCase(),
    'Kode QR': s.qrCode,
    'Link Foto': s.drivePhotoUrl || s.photoUrl || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Siswa');
  XLSX.writeFile(workbook, filename);
}

// ================= PDF EXPORTS =================
export function exportAttendanceToPDF(
  attendances: Attendance[],
  titleFilter = 'Semua Kelas',
  targetDate = '',
  schoolInfo: SchoolIdentitySettings = DEFAULT_SCHOOL_INFO
) {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Letterhead (Kop Surat)
  if (schoolInfo.districtLogoUrl && schoolInfo.districtLogoUrl.startsWith('data:image')) {
    try {
      doc.addImage(schoolInfo.districtLogoUrl, 16, 14, 20, 20);
    } catch {}
  }
  if (schoolInfo.schoolLogoUrl && schoolInfo.schoolLogoUrl.startsWith('data:image')) {
    try {
      doc.addImage(schoolInfo.schoolLogoUrl, 174, 14, 20, 20);
    } catch {}
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`PEMERINTAH ${schoolInfo.districtName.toUpperCase()}`, 105, 14, { align: 'center' });
  doc.text('DINAS PENDIDIKAN KEBUDAYAAN KEPEMUDAAN DAN OLAHRAGA', 105, 19, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.schoolName.toUpperCase(), 105, 26, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(schoolInfo.address, 105, 31, { align: 'center' });
  doc.text(`Email: ${schoolInfo.email || 'smpn1tanjung@gmail.com'} | NPSN: ${schoolInfo.npsn}`, 105, 35, { align: 'center' });

  // Divider lines
  doc.setLineWidth(0.8);
  doc.line(14, 38, 196, 38);
  doc.setLineWidth(0.3);
  doc.line(14, 39.5, 196, 39.5);

  // Title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN REKAPITULASI PRESENSI REAL-TIME', 105, 47, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const dateInfo = targetDate
    ? `Tanggal: ${targetDate}`
    : `Dicetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`;
  doc.text(`${dateInfo} | Filter: ${titleFilter}`, 105, 52, { align: 'center' });

  // Table Data
  const tableRows = attendances.map((att, idx) => [
    idx + 1,
    att.date,
    att.time,
    att.targetName,
    att.nisnOrNip,
    att.className,
    att.status.toUpperCase(),
    att.recordedBy || 'Petugas',
    att.notes || (att.isLate ? `Terlambat (${att.lateMinutes}m)` : '-'),
  ]);

  autoTable(doc, {
    startY: 56,
    head: [['No', 'Tgl', 'Jam', 'Nama Lengkap', 'NISN / NIP', 'Kelas', 'Status', 'Petugas', 'Keterangan']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110], // Emerald dark
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 17, halign: 'center' },
      2: { cellWidth: 13, halign: 'center' },
      3: { cellWidth: 38 },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 25 },
      8: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount} - ${schoolInfo.schoolName}`,
        105,
        290,
        { align: 'center' }
      );
    },
  });

  // Signature section at bottom
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  if (finalY < 240) {
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    doc.setFontSize(8.5);
    doc.text(`Tanjung, ${today}`, 145, finalY);
    doc.text('Mengetahui,', 145, finalY + 4);
    doc.text('Kepala Sekolah', 145, finalY + 8);

    doc.setFont('helvetica', 'bold');
    doc.text(schoolInfo.headmasterName, 145, finalY + 28);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${schoolInfo.headmasterNip}`, 145, finalY + 32);

    doc.text('Petugas Kesiswaan / Piket,', 25, finalY + 8);
    doc.setFont('helvetica', 'bold');
    doc.text('( ......................................... )', 25, finalY + 28);
    doc.setFont('helvetica', 'normal');
    doc.text('NIP. -', 25, finalY + 32);
  }

  doc.save(`Presensi_${schoolInfo.schoolName.replace(/\s+/g, '_')}_${targetDate || 'Rekap'}.pdf`);
}

export function exportJournalsToPDF(
  journals: LearningJournal[],
  filterInfo = 'Semua Guru',
  schoolInfo: SchoolIdentitySettings = DEFAULT_SCHOOL_INFO
) {
  const doc = new jsPDF('l', 'mm', 'a4');

  // Letterhead
  if (schoolInfo.districtLogoUrl && schoolInfo.districtLogoUrl.startsWith('data:image')) {
    try {
      doc.addImage(schoolInfo.districtLogoUrl, 18, 10, 18, 18);
    } catch {}
  }
  if (schoolInfo.schoolLogoUrl && schoolInfo.schoolLogoUrl.startsWith('data:image')) {
    try {
      doc.addImage(schoolInfo.schoolLogoUrl, 260, 10, 18, 18);
    } catch {}
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`PEMERINTAH ${schoolInfo.districtName.toUpperCase()}`, 148, 12, { align: 'center' });
  doc.text('DINAS PENDIDIKAN KEBUDAYAAN KEPEMUDAAN DAN OLAHRAGA', 148, 16, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.schoolName.toUpperCase(), 148, 22, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`${schoolInfo.address} | NPSN: ${schoolInfo.npsn}`, 148, 27, { align: 'center' });

  doc.setLineWidth(0.6);
  doc.line(14, 30, 283, 30);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('JURNAL AGENDA PEMBELAJARAN GURU', 148, 37, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Filter / Unit: ${filterInfo} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`,
    148,
    42,
    { align: 'center' }
  );

  const tableRows = journals.map((j, idx) => [
    idx + 1,
    j.date,
    j.teacherName,
    j.subject,
    j.className,
    j.period,
    j.topic,
    j.activities,
    j.studentAttendanceSummary || '-',
  ]);

  autoTable(doc, {
    startY: 46,
    head: [['No', 'Tanggal', 'Guru Pengampu', 'Mata Pelajaran', 'Kelas', 'Jam', 'Materi Pokok / KD', 'Aktivitas Belajar', 'Kehadiran']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 64, 175], // Deep indigo
      textColor: 255,
      fontSize: 8,
      halign: 'center',
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 38 },
      3: { cellWidth: 32 },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 26, halign: 'center' },
      6: { cellWidth: 45 },
      7: { cellWidth: 55 },
      8: { cellWidth: 'auto' },
    },
  });

  doc.save(`Jurnal_Pembelajaran_${schoolInfo.schoolName.replace(/\s+/g, '_')}.pdf`);
}

export function exportMonthlyReportToPDF(
  report: MonthlyReport,
  classStudents: Student[],
  attendances: Attendance[],
  schoolInfo: SchoolIdentitySettings = DEFAULT_SCHOOL_INFO
) {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Letterhead
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`PEMERINTAH ${schoolInfo.districtName.toUpperCase()}`, 105, 13, { align: 'center' });
  doc.text('DINAS PENDIDIKAN KEBUDAYAAN KEPEMUDAAN DAN OLAHRAGA', 105, 17, { align: 'center' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.schoolName.toUpperCase(), 105, 23, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.text(schoolInfo.address, 105, 28, { align: 'center' });

  doc.setLineWidth(0.6);
  doc.line(14, 31, 196, 31);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN EVALUASI PRESENSI BULANAN KELAS', 105, 38, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${report.monthYear} | Kelas: ${report.className}`, 105, 43, { align: 'center' });

  // Evaluation summary box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 47, 182, 22, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Ringkasan Evaluasi Kehadiran Kelas ${report.className}:`, 18, 53);

  doc.setFont('helvetica', 'normal');
  doc.text(`• Total Siswa: ${report.totalStudents} orang`, 18, 59);
  doc.text(`• Rata-rata Kehadiran: ${report.averageAttendanceRate}%`, 18, 64);

  doc.text(`• Hadir: ${report.hadirCount}x`, 95, 59);
  doc.text(`• Sakit: ${report.sakitCount}x`, 95, 64);

  doc.text(`• Izin: ${report.izinCount}x`, 145, 59);
  doc.text(`• Alpa / Tanpa Ket: ${report.alpaCount}x`, 145, 64);

  // Student list table for this class
  const studentRows = classStudents.map((s, idx) => {
    const studentAtts = attendances.filter((a) => a.targetId === s.id);
    const h = studentAtts.filter((a) => a.status === 'hadir').length;
    const sk = studentAtts.filter((a) => a.status === 'sakit').length;
    const iz = studentAtts.filter((a) => a.status === 'izin').length;
    const al = studentAtts.filter((a) => a.status === 'alpa').length;
    const totalRecorded = h + sk + iz + al;
    const rate = totalRecorded > 0 ? Math.round((h / totalRecorded) * 100) : 100;
    const statusEvaluasi = rate < 85 ? 'Perlu Pembinaan' : rate < 95 ? 'Cukup Baik' : 'Sangat Baik';

    return [
      idx + 1,
      s.nisn,
      s.name,
      s.gender,
      h,
      sk,
      iz,
      al,
      `${rate}%`,
      statusEvaluasi,
    ];
  });

  autoTable(doc, {
    startY: 72,
    head: [['No', 'NISN', 'Nama Siswa', 'L/P', 'H', 'S', 'I', 'A', 'Presensi', 'Catatan Evaluasi']],
    body: studentRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110],
      fontSize: 8,
      halign: 'center',
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 1.6,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 50 },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 10, halign: 'center' },
      7: { cellWidth: 10, halign: 'center' },
      8: { cellWidth: 16, halign: 'center' },
      9: { cellWidth: 'auto' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFontSize(8.5);
  doc.text(`Tanjung, ${today}`, 145, finalY);
  doc.text('Kepala Sekolah,', 145, finalY + 4);

  doc.setFont('helvetica', 'bold');
  doc.text(schoolInfo.headmasterName, 145, finalY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${schoolInfo.headmasterNip}`, 145, finalY + 28);

  doc.text(`Wali Kelas ${report.className},`, 25, finalY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text('( ......................................... )', 25, finalY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text('NIP. -', 25, finalY + 28);

  doc.save(`Evaluasi_Bulanan_${report.className}_${report.monthYear.replace(' ', '_')}.pdf`);
}

// ================= MASS EXPORT KTS TO PDF (CR-80, QR CODE 3x3 CM) =================
/**
 * Exports multiple Student Identity Cards (KTS) to a printable/downloadable PDF (A4 sheet).
 * Conforms to standard CR-80 card dimensions (85.6 mm x 54.0 mm).
 * Strictly renders QR code at exactly 3 x 3 cm (30 mm x 30 mm) positioned to the right of student identity.
 */
export async function exportKtsBatchToPdf(
  students: Student[],
  options?: {
    filterClass?: string;
    searchTerm?: string;
    schoolInfo?: SchoolIdentitySettings;
    qrMap?: { [nisn: string]: string };
  }
): Promise<void> {
  if (students.length === 0) return;

  const school = options?.schoolInfo || DEFAULT_SCHOOL_INFO;
  const filterClass = options?.filterClass || 'Semua';
  const searchTerm = options?.searchTerm || '';
  const qrMap = options?.qrMap || {};

  // Create A4 PDF (210 mm x 297 mm, Portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const cardW = 85.6; // Standar CR-80 width in mm (8.56 cm)
  const cardH = 54.0; // Standar CR-80 height in mm (5.4 cm)

  const leftMargin = 14.0;
  const colGap = 10.8;
  const topMargin = 18.0;
  const rowGap = 12.0;

  const cardsPerPage = 8; // 2 columns x 4 rows = 8 cards per A4 page

  // Pre-generate any missing QR codes
  const resolvedQrMap: { [nisn: string]: string } = { ...qrMap };
  for (const s of students) {
    if (!resolvedQrMap[s.nisn]) {
      try {
        const qrContent = s.qrCode || `SMPN2TJ-SISWA-${s.nisn}`;
        resolvedQrMap[s.nisn] = await QRCode.toDataURL(qrContent, {
          width: 200,
          margin: 1,
          color: { dark: '#064e3b', light: '#ffffff' },
        });
      } catch (err) {
        console.error('Failed to generate QR for PDF:', s.nisn, err);
      }
    }
  }

  students.forEach((student, index) => {
    const pageIndex = Math.floor(index / cardsPerPage);
    const cardIndexOnPage = index % cardsPerPage;

    if (index > 0 && cardIndexOnPage === 0) {
      doc.addPage('a4', 'portrait');
    }

    // Page Header / Running Head
    if (cardIndexOnPage === 0) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Lembar KTS Massal (CR-80 • 8,56 × 5,4 cm) • ${school.schoolName} • Filter: ${
          filterClass === 'SEMUA' ? 'Semua Kelas' : `Kelas ${filterClass}`
        }${searchTerm ? ` • Pencarian: "${searchTerm}"` : ''} • Hal. ${pageIndex + 1}`,
        leftMargin,
        10
      );
    }

    const col = cardIndexOnPage % 2; // 0 or 1
    const row = Math.floor(cardIndexOnPage / 2); // 0, 1, 2, 3

    const cardX = leftMargin + col * (cardW + colGap);
    const cardY = topMargin + row * (cardH + rowGap);

    // 1. Outer Card Box with rounded corners and border
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, cardY, cardW, cardH, 2.5, 2.5, 'FD');

    // 2. Kop Kartu (Header bar)
    doc.setFillColor(6, 78, 59); // emerald-900
    doc.roundedRect(cardX, cardY, cardW, 11, 2.5, 2.5, 'F');
    doc.rect(cardX, cardY + 8, cardW, 3, 'F'); // square bottom of kop

    // Gold accent line under kop
    doc.setFillColor(251, 191, 36); // amber-400
    doc.rect(cardX, cardY + 11, cardW, 0.8, 'F');

    // Text & Logo in Kop
    let textStartX = cardX + 3;
    if (school.schoolLogoUrl && school.schoolLogoUrl.startsWith('data:image')) {
      try {
        doc.addImage(school.schoolLogoUrl, cardX + 2.5, cardY + 2, 7, 7);
        textStartX = cardX + 10.5;
      } catch {}
    }

    doc.setTextColor(204, 251, 241); // teal-100
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${(school.districtName || 'PEMKAB LOMBOK UTARA').toUpperCase()} • DISDIKPORA`, textStartX, cardY + 4);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.text(school.schoolName || 'SMP NEGERI 1 TANJUNG', textStartX, cardY + 8);

    doc.setTextColor(251, 191, 36); // gold
    doc.setFontSize(5.5);
    doc.text('KTS DIGITAL', cardX + cardW - 3, cardY + 5, { align: 'right' });
    doc.setTextColor(204, 251, 241);
    doc.setFontSize(4.8);
    doc.text(`NPSN: ${school.npsn || '50205566'}`, cardX + cardW - 3, cardY + 8.5, { align: 'right' });

    // 3. Middle Section:
    // LEFT: Foto Siswa (3x4 aspect ratio, 14.5 mm x 19.5 mm)
    const fotoX = cardX + 2.8;
    const fotoY = cardY + 13.5;
    const fotoW = 14.5;
    const fotoH = 19.5;

    doc.setDrawColor(6, 78, 59); // border
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(fotoX, fotoY, fotoW, fotoH, 1, 1, 'FD');

    doc.setFontSize(5);
    doc.setTextColor(148, 163, 184);
    doc.text('FOTO 3x4', fotoX + fotoW / 2, fotoY + fotoH / 2, { align: 'center' });

    // CENTER: Identitas Siswa
    const identX = cardX + 19.5;
    const identY = cardY + 14.5;

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(4.5);
    doc.setFont('helvetica', 'normal');
    doc.text('NAMA SISWA', identX, identY);

    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(student.name.length > 21 ? student.name.substring(0, 20) + '...' : student.name, identX, identY + 3.2);

    doc.setFontSize(4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('NISN / NIS', identX, identY + 7.5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 78, 59); // emerald
    doc.text(`${student.nisn}${student.nis ? ' / ' + student.nis : ''}`, identX, identY + 10.5);

    doc.setFontSize(4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('KELAS / JK', identX, identY + 14.5);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Kelas ${student.className} (${student.gender === 'L' ? 'L' : 'P'})`, identX, identY + 17.5);

    doc.setFontSize(4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('TEMPAT, TGL LAHIR', identX, identY + 21.5);

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const ttlText = student.birthPlaceDate || 'Tanjung, Lombok Utara';
    doc.text(ttlText.length > 24 ? ttlText.substring(0, 23) + '...' : ttlText, identX, identY + 24.5);

    doc.setFontSize(4.5);
    doc.setTextColor(100, 116, 139);
    doc.text('ORANG TUA / WALI', identX, identY + 28);
    doc.setFontSize(5.5);
    doc.setTextColor(30, 41, 59);
    const ortuText = student.parentName || '-';
    doc.text(ortuText.length > 24 ? ortuText.substring(0, 23) + '...' : ortuText, identX, identY + 31);

    // RIGHT: QR CODE (EXACTLY 3 x 3 cm = 30 x 30 mm, POSITIONED TO THE RIGHT OF IDENTITAS)
    const qrSize = 30.0; // 3.0 cm = 30 mm
    const qrX = cardX + cardW - qrSize - 2.2; // ~53.4 mm from card left
    const qrY = cardY + 14.0;

    // Background box for QR Code
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrX - 0.5, qrY - 0.5, qrSize + 1, qrSize + 1, 1, 1, 'FD');

    const qrData = resolvedQrMap[student.nisn];
    if (qrData) {
      doc.addImage(qrData, 'PNG', qrX, qrY, qrSize, qrSize);
    } else {
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text('QR 3x3 cm', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' });
    }

    // Label under QR Code
    doc.setFontSize(4.5);
    doc.setTextColor(100, 116, 139);
    doc.text('QR Code (3 × 3 cm)', qrX + qrSize / 2, qrY + qrSize + 2.5, { align: 'center' });

    // 4. Card Footer
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(cardX, cardY + cardH - 5.5, cardW, 3.5, 'F');
    doc.roundedRect(cardX, cardY + cardH - 5.5, cardW, 5.5, 2.5, 2.5, 'F');

    doc.setTextColor(52, 211, 153); // emerald-400
    doc.setFontSize(4.8);
    doc.setFont('helvetica', 'bold');
    doc.text('CR-80 • 8,56 cm × 5,4 cm • QR 3 × 3 cm', cardX + 3, cardY + cardH - 1.8);

    doc.setTextColor(148, 163, 184);
    doc.text('KTS DIGITAL RESMI', cardX + cardW - 3, cardY + cardH - 1.8, { align: 'right' });
  });

  const classSlug = filterClass === 'SEMUA' ? 'Semua_Kelas' : `Kelas_${filterClass}`;
  const filename = `KTS_Massal_${classSlug}_${students.length}_Siswa.pdf`;
  doc.save(filename);
}
