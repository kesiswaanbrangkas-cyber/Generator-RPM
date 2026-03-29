import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Download, 
  Loader2, 
  CheckCircle2, 
  School, 
  BookOpen, 
  Users, 
  Clock, 
  Target, 
  Lightbulb,
  Sparkles,
  FileDown,
  Lock,
  Settings,
  ShieldCheck,
  X,
  Key
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

// --- Types ---
interface RPMData {
  namaSekolah: string;
  mataPelajaran: string;
  faseKelas: string;
  alokasiWaktu: string;
  identifikasiPesertaDidik: string;
  capaianPembelajaran: string;
  topikPembelajaran: string;
  tujuanPembelajaran: string;
  modelPembelajaran: string;
}

const MATA_PELAJARAN = [
  "Pendidikan Pancasila", "Pendidikan Agama Islam", "Kimia", "Fisika", 
  "Matematika", "Bahasa Indonesia", "Bahasa Inggris", "Pendidikan Al-Qur'an", 
  "Sejarah", "Ekonomi", "Geografi", "Seni Budaya", "Sosiologi", 
  "Biologi", "Pendidikan jasmani dan Kesehatan"
];

const FASE_KELAS = [
  "E - Kelas X", "F - Kelas XI", "F - Kelas XII"
];

const MODEL_PEMBELAJARAN = [
  "Model Pembelajaran Berbasis Masalah", 
  "Model Pembelajaran Kooperatif", 
  "Model Pembelajaran Kontekstual", 
  "Model Pembelajaran Langsung", 
  "Discovery Learning", 
  "Model Pembelajaran Berbasis Proyek", 
  "Model Pembelajaran Berdasarkan Pengalaman Sendiri (Self Directed Learning/SDL)", 
  "Bermain Peran dan Simulasi", 
  "Model Pembelajaran Kolaboratif", 
  "Diskusi Kelompok Kecil"
];

export default function App() {
  const [formData, setFormData] = useState<RPMData>({
    namaSekolah: '',
    mataPelajaran: MATA_PELAJARAN[0],
    faseKelas: FASE_KELAS[0],
    alokasiWaktu: '',
    identifikasiPesertaDidik: '',
    capaianPembelajaran: '',
    topikPembelajaran: '',
    tujuanPembelajaran: '',
    modelPembelajaran: MODEL_PEMBELAJARAN[0],
  });

  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [usageCount, setUsageCount] = useState<number>(() => {
    const saved = localStorage.getItem('rpm_usage_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('rpm_is_unlocked') === 'true';
  });
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [newAccessCodeInput, setNewAccessCodeInput] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  const resultRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const incrementUsage = () => {
    const newCount = usageCount + 1;
    setUsageCount(newCount);
    localStorage.setItem('rpm_usage_count', newCount.toString());
  };

  const handleVerifyCode = async () => {
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCodeInput })
      });
      const data = await response.json();
      if (data.success) {
        setIsUnlocked(true);
        localStorage.setItem('rpm_is_unlocked', 'true');
        setShowUnlockModal(false);
        setAccessCodeInput('');
      } else {
        alert(data.message || "Kode salah.");
      }
    } catch (error) {
      console.error("Verify error:", error);
      alert("Gagal memverifikasi kode.");
    }
  };

  const handleAdminAuth = async () => {
    try {
      const response = await fetch('/api/admin/get-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterKey: masterKeyInput })
      });
      const data = await response.json();
      if (data.success) {
        setIsAdminAuthenticated(true);
        setAdminError('');
      } else {
        setAdminError(data.message || "Master key salah.");
      }
    } catch (error) {
      setAdminError("Gagal terhubung ke server.");
    }
  };

  const handleUpdateAccessCode = async () => {
    try {
      const response = await fetch('/api/admin/update-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterKey: masterKeyInput, newCode: newAccessCodeInput })
      });
      const data = await response.json();
      if (data.success) {
        setAdminSuccess(data.message);
        setAdminError('');
        setNewAccessCodeInput('');
        setTimeout(() => setAdminSuccess(''), 3000);
      } else {
        setAdminError(data.message || "Gagal mengubah kode.");
      }
    } catch (error) {
      setAdminError("Gagal terhubung ke server.");
    }
  };

  const resetUsage = () => {
    setUsageCount(0);
    setIsUnlocked(false);
    localStorage.removeItem('rpm_usage_count');
    localStorage.removeItem('rpm_is_unlocked');
    setAdminSuccess("Penggunaan berhasil direset.");
    setTimeout(() => setAdminSuccess(''), 3000);
  };

  const generateRPM = async () => {
    if (usageCount >= 2 && !isUnlocked) {
      setShowUnlockModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const model = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          Buatkan Rencana Pelaksanaan Menarik (RPM) berdasarkan data berikut:
          Nama Sekolah: ${formData.namaSekolah}
          Mata Pelajaran: ${formData.mataPelajaran}
          Fase/Kelas: ${formData.faseKelas}
          Alokasi Waktu: ${formData.alokasiWaktu}
          Identifikasi Peserta Didik: ${formData.identifikasiPesertaDidik}
          Capaian Pembelajaran: ${formData.capaianPembelajaran}
          Topik Pembelajaran: ${formData.topikPembelajaran}
          Tujuan Pembelajaran: ${formData.tujuanPembelajaran}
          Model Pembelajaran: ${formData.modelPembelajaran}

          ATURAN FORMATTING (SANGAT PENTING):
          1. JANGAN gunakan tanda bintang (*) sama sekali.
          2. JANGAN gunakan tag HTML (seperti <b> atau </b>) atau Markdown (seperti **).
          3. Gunakan format "Judul: Isi" untuk setiap item utama.
          4. Berikan jarak dua baris (double newline) antar item utama agar mudah dibaca.
          5. Gunakan penomoran bullet yang rapi (contoh: - atau 1.) untuk sub-item.
          6. Urutan hasil harus sebagai berikut:
             - Nama Sekolah
             - Mata Pelajaran
             - Fase/Kelas
             - Alokasi Waktu
             - Identifikasi Peserta Didik
             - Dimensi Profil Lulusan (Pilih yang relevan dari: Keimanan dan ketaqwaan terhadap tuhan YME, kewargaan, Penalaran Kritis, Kreativitas, kolaborasi, kemandirian, kesehatan, komunikasi)
             - Capaian Pembelajaran
             - Topik Pembelajaran
             - Tujuan Pembelajaran
             - Model Pembelajaran
             - Metode Pembelajaran (Berikan contoh relevan seperti diskusi kelompok, proyek, presentasi, dll)
             - Mitra Pembelajaran (Rekomendasi mitra yang relevan)
             - Lingkungan Pembelajaran (Lingkungan yang digunakan)
             - Pemanfaatan Digital (Perencanaan, Pelaksanaan, dan Asesmen)
             - Langkah Pembelajaran (Detail kegiatan: Pendahuluan, Inti). 
               PENTING: Beri keterangan teks kecil mana yang (memahami, mengaplikasi, merefleksi) serta tambahan teks kecil dalam kurung mana yang (berkesadaran, bermakna, menggembirakan) HANYA pada bagian Inti. JANGAN sertakan keterangan ini pada bagian Pendahuluan.
             - Penutup (Kegiatan akhir)
             - Asesmen (Setelah kegiatan penutup)

          Tuliskan dalam Bahasa Indonesia yang profesional dan inspiratif.
        `,
      });

      const response = model;
      // Remove any remaining asterisks just in case
      const cleanText = response.text.replace(/\*/g, '');
      setResult(cleanText);
      incrementUsage();
    } catch (error) {
      console.error("Error generating RPM:", error);
      setResult("Gagal menghasilkan RPM. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDocx = async () => {
    if (!result) return;
    
    setIsLoading(true);
    try {
      const lines = result.split('\n');
      const children: Paragraph[] = [];
      
      // Add Title
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "RENCANA PELAKSANAAN MENARIK (RPM)",
              bold: true,
              size: 28, // 14pt
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );

      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          return;
        }

        // Check if it's a main heading (Label: Content)
        const isMainHeading = /^[A-Z][a-zA-Z\s/]+:/.test(trimmedLine);
        
        if (isMainHeading) {
          const colonIndex = trimmedLine.indexOf(':');
          const label = trimmedLine.substring(0, colonIndex).trim();
          const content = trimmedLine.substring(colonIndex + 1).trim();
          
          const isSubHeading = ['Pendahuluan', 'Inti'].includes(label);
          
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: label.toUpperCase(),
                  bold: true,
                  size: isSubHeading ? 22 : 24, // 11pt for sub, 12pt for main
                }),
              ],
              spacing: { 
                before: isSubHeading ? 120 : 240, 
                after: 80 
              },
              border: !isSubHeading ? {
                bottom: { color: "auto", space: 1, style: "single", size: 6 }
              } : undefined
            })
          );
          
          if (content) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: content,
                    size: 22, // 11pt
                  }),
                ],
                indent: { left: 360 },
                spacing: { after: 120 },
              })
            );
          }
        } else {
          // Check if it's a bullet point or numbered list
          const isBullet = trimmedLine.startsWith('-') || trimmedLine.startsWith('•');
          const isNumbered = /^\d+\./.test(trimmedLine);

          if (isBullet || isNumbered) {
            const text = trimmedLine.replace(/^[-•\d.]*\s*/, '');
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: text,
                    size: 22,
                  }),
                ],
                bullet: {
                  level: 0,
                },
                indent: { left: 720, hanging: 360 },
                spacing: { after: 100 },
              })
            );
          } else {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: trimmedLine,
                    size: 22,
                  }),
                ],
                indent: { left: 360 },
                spacing: { after: 100 },
              })
            );
          }
        }
      });

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `RPM_${formData.mataPelajaran}_${formData.namaSekolah}.docx`);
    } catch (error) {
      console.error("DOCX Generation Error:", error);
      alert("Gagal mengunduh file Word. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-600" />
              Generator RPM Mata Pelajaran Ala Pak GR
            </h1>
            <p className="text-slate-500 text-sm font-medium italic">
              “saya yang bantu, anda yang kembangkan”
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</span>
              <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> AI Ready
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Formulir Input RPM
                </h2>
              </div>
              
              <div className="p-6 space-y-5">
                {/* Nama Sekolah */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <School className="w-4 h-4" /> Nama Sekolah
                  </label>
                  <input 
                    type="text" 
                    name="namaSekolah"
                    value={formData.namaSekolah}
                    onChange={handleInputChange}
                    placeholder="Masukkan nama sekolah..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mata Pelajaran */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Mata Pelajaran
                    </label>
                    <select 
                      name="mataPelajaran"
                      value={formData.mataPelajaran}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                    >
                      {MATA_PELAJARAN.map(mp => <option key={mp} value={mp}>{mp}</option>)}
                    </select>
                  </div>

                  {/* Fase/Kelas */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Fase/Kelas
                    </label>
                    <select 
                      name="faseKelas"
                      value={formData.faseKelas}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                    >
                      {FASE_KELAS.map(fk => <option key={fk} value={fk}>{fk}</option>)}
                    </select>
                  </div>
                </div>

                {/* Alokasi Waktu */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Alokasi Waktu
                  </label>
                  <input 
                    type="text" 
                    name="alokasiWaktu"
                    value={formData.alokasiWaktu}
                    onChange={handleInputChange}
                    placeholder="Contoh: 2 x 45 Menit"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                {/* Identifikasi Peserta Didik */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Identifikasi Peserta Didik
                  </label>
                  <textarea 
                    name="identifikasiPesertaDidik"
                    value={formData.identifikasiPesertaDidik}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="Deskripsikan karakteristik peserta didik..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
                  />
                </div>

                {/* Capaian Pembelajaran */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Capaian Pembelajaran
                  </label>
                  <textarea 
                    name="capaianPembelajaran"
                    value={formData.capaianPembelajaran}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
                  />
                </div>

                {/* Topik & Tujuan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Topik Pembelajaran</label>
                    <input 
                      type="text" 
                      name="topikPembelajaran"
                      value={formData.topikPembelajaran}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Tujuan Pembelajaran</label>
                    <input 
                      type="text" 
                      name="tujuanPembelajaran"
                      value={formData.tujuanPembelajaran}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Model Pembelajaran */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> Model Pembelajaran
                  </label>
                  <select 
                    name="modelPembelajaran"
                    value={formData.modelPembelajaran}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                  >
                    {MODEL_PEMBELAJARAN.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Submit Button */}
                <button
                  onClick={generateRPM}
                  disabled={isLoading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Sedang Meracik RPM...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      Buat RPM Sekarang
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>

          {/* Right Column: Result */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[600px] flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Hasil RPM
                </h2>
                {result && (
                  <button 
                    onClick={downloadDocx}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    Download DOCX
                  </button>
                )}
              </div>

              <div className="flex-1 p-8 overflow-auto">
                <AnimatePresence mode="wait">
                  {!result && !isLoading ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="h-full flex flex-col items-center justify-center text-center space-y-4"
                    >
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                        <FileText className="w-10 h-10 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-slate-500 font-medium">Belum ada RPM yang dihasilkan.</p>
                        <p className="text-slate-400 text-sm">Isi formulir di sebelah kiri dan klik "Buat RPM".</p>
                      </div>
                    </motion.div>
                  ) : isLoading ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center space-y-6"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                        <Sparkles className="w-6 h-6 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <div className="text-center">
                        <p className="text-slate-600 font-medium animate-pulse">Kecerdasan Buatan sedang bekerja...</p>
                        <p className="text-slate-400 text-sm">Menyusun langkah pembelajaran yang bermakna.</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      ref={resultRef}
                      className="prose prose-slate max-w-none bg-white p-4"
                      style={{ color: '#1e293b' }}
                    >
                      <div className="space-y-2 whitespace-pre-wrap leading-relaxed">
                        {result.split('\n').map((line, i) => {
                          const trimmedLine = line.trim();
                          if (!trimmedLine) return <div key={i} className="h-4" />;

                          // Check if it's a main heading (Label: Content)
                          // Matches "Word Word: " or "Word/Word: "
                          const isMainHeading = /^[A-Z][a-zA-Z\s/]+:/.test(trimmedLine);
                          
                          if (isMainHeading) {
                            const colonIndex = trimmedLine.indexOf(':');
                            const label = trimmedLine.substring(0, colonIndex);
                            const content = trimmedLine.substring(colonIndex + 1);
                            
                            // Special handling for sub-headings within Langkah Pembelajaran
                            const isSubHeading = ['Pendahuluan', 'Inti'].includes(label.trim());
                            const spacing = isSubHeading ? '0.25em' : '0.5em';
                            
                            return (
                              <div key={i} className="first:mt-0" style={{ marginTop: spacing, marginBottom: spacing }}>
                                <h3 
                                  className={`${isSubHeading ? 'font-bold text-md' : 'font-extrabold text-lg'} border-l-4 pl-3 mb-1 uppercase tracking-tight`}
                                  style={{ 
                                    color: '#0f172a', 
                                    borderColor: isSubHeading ? '#10b98188' : '#10b981', 
                                    fontSize: '11pt' 
                                  }}
                                >
                                  {label}
                                </h3>
                                {content && <p className="pl-4" style={{ color: '#334155', fontSize: '11pt', lineHeight: '1.0' }}>{content}</p>}
                              </div>
                            );
                          }

                          // Check if it's a bullet point or numbered list
                          const isBullet = trimmedLine.startsWith('-') || trimmedLine.startsWith('•');
                          const isNumbered = /^\d+\./.test(trimmedLine);

                          if (isBullet || isNumbered) {
                            const bulletChar = isBullet ? '•' : trimmedLine.match(/^\d+\./)?.[0];
                            const text = trimmedLine.replace(/^[-•\d.]*\s*/, '');
                            
                            return (
                              <div key={i} className="ml-6 mb-1 flex gap-3 items-start" style={{ color: '#334155', fontSize: '11pt', lineHeight: '1.0' }}>
                                <span className="font-bold mt-0.5 shrink-0" style={{ color: '#059669' }}>{bulletChar}</span>
                                <span className="flex-1">{text}</span>
                              </div>
                            );
                          }

                          return <p key={i} className="mb-1 pl-4" style={{ color: '#334155', fontSize: '11pt', lineHeight: '1.0' }}>{trimmedLine}</p>;
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4">
          <p className="text-slate-400 text-sm">
            © 2026 Generator RPM Pak GR. Ditenagai oleh Google Gemini AI.
          </p>
          <button 
            onClick={() => setShowAdminModal(true)}
            className="text-slate-300 hover:text-slate-500 transition-colors p-2"
            title="Admin Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Unlock Modal */}
      <AnimatePresence>
        {showUnlockModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowUnlockModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-10 h-10 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">Batas Penggunaan Tercapai</h3>
                  <p className="text-slate-500">
                    Anda telah menggunakan generator sebanyak 2 kali. Silakan masukkan kode akses untuk terus menggunakan aplikasi ini.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text"
                      value={accessCodeInput}
                      onChange={(e) => setAccessCodeInput(e.target.value)}
                      placeholder="Masukkan Kode Akses..."
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono tracking-widest text-center text-lg"
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                    />
                  </div>
                  <button 
                    onClick={handleVerifyCode}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 transition-all"
                  >
                    Buka Akses Sekarang
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Hubungi pemilik aplikasi untuk mendapatkan kode akses.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                setShowAdminModal(false);
                setIsAdminAuthenticated(false);
                setMasterKeyInput('');
                setAdminError('');
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold flex items-center gap-2 text-slate-800">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Panel Admin
                </h3>
                <button 
                  onClick={() => {
                    setShowAdminModal(false);
                    setIsAdminAuthenticated(false);
                    setMasterKeyInput('');
                    setAdminError('');
                  }}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8">
                {!isAdminAuthenticated ? (
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <p className="text-slate-500 text-sm">Masukkan Master Key untuk mengakses pengaturan.</p>
                    </div>
                    <div className="space-y-4">
                      <input 
                        type="password"
                        value={masterKeyInput}
                        onChange={(e) => setMasterKeyInput(e.target.value)}
                        placeholder="Master Key..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-center"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdminAuth()}
                      />
                      {adminError && <p className="text-red-500 text-xs text-center">{adminError}</p>}
                      <button 
                        onClick={handleAdminAuth}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
                      >
                        Login Admin
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-slate-700">Ubah Kode Akses Aplikasi</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={newAccessCodeInput}
                          onChange={(e) => setNewAccessCodeInput(e.target.value)}
                          placeholder="Kode Baru..."
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono"
                        />
                        <button 
                          onClick={handleUpdateAccessCode}
                          className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all"
                        >
                          Simpan
                        </button>
                      </div>
                      {adminSuccess && <p className="text-emerald-600 text-xs font-medium">{adminSuccess}</p>}
                      {adminError && <p className="text-red-500 text-xs font-medium">{adminError}</p>}
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <label className="text-sm font-bold text-slate-700 block mb-4">Statistik & Kontrol</label>
                      <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Penggunaan Anda:</span>
                          <span className="font-bold text-slate-900">{usageCount} kali</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Status Akses:</span>
                          <span className={`font-bold ${isUnlocked ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {isUnlocked ? 'Terbuka (Premium)' : 'Terbatas (Gratis)'}
                          </span>
                        </div>
                        <button 
                          onClick={resetUsage}
                          className="w-full mt-2 py-2 text-xs font-bold text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-all"
                        >
                          Reset Semua Data Penggunaan
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
