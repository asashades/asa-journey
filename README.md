# 🪐 ASA Journey

[![Framework](https://img.shields.io/badge/Framework-Next.js%2016-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Backend-Firebase%2012-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Language](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-Supported-009688?style=for-the-badge&logo=progressive-web-apps&logoColor=white)](#-progressive-web-app-pwa--mode-offline)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> **ASA Journey** adalah aplikasi *micro-journaling* modern dengan *Gen-Z vibes* yang dirancang untuk membantu Anda merekam momen harian, mimpi, ide, dan refleksi secara cepat, minimalis, dan terstruktur. Terinspirasi oleh filosofi Journalistic, aplikasi ini menggabungkan kesederhanaan menulis dengan kekuatan analitik cerdas untuk pertumbuhan diri.

Aplikasi ini dibangun menggunakan arsitektur **Progressive Web App (PWA)**, memberikan pengalaman menulis jurnal yang *offline-first*, sangat cepat, dan dapat dipasang langsung di perangkat Android, iOS, maupun Desktop layaknya aplikasi native.

---

## ✨ Fitur Utama

Aplikasi ini dirancang modular, memungkinkan Anda untuk mengaktifkan atau menonaktifkan fitur tertentu di pengaturan sesuai kebutuhan pribadi Anda:

### 1. ✍️ Write (Menulis Kilat)
Format *micro-journaling* intuitif yang mendorong Anda untuk mengekspresikan pikiran secara ringkas:
- **Bullet Points**: Pecah entri harian menjadi poin-poin terstruktur.
- **Micro-Tagging & Mentions**: Gunakan `#tag` untuk menandai aktivitas/tema dan `@nama` untuk menyebut orang terdekat layaknya media sosial.
- **Bullet Styles & Highlights**: Siklus jenis bullet menggunakan keyboard shortcut (`Tab`), dan buat highlight instan menggunakan tanda bintang `*` di sekeliling teks untuk menandai momen penting.
- **Clickable Markdown Checkboxes**: Centang/selesaikan item to-do list secara interaktif langsung dari rendering Markdown pada entri harian atau catatan Anda.
- **AI Suggested Tags**: Mendapatkan saran tag secara cerdas saat sedang mengetik entri jurnal.
- **Wisdom Quick Panel**: Mempermudah pencatatan mutiara hikmah secara kategoris langsung dari FAB tulis dengan pewarnaan indah terkoordinasi (Thought, Quote, Fact, Excerpt, Lesson).

### 2. 🪐 Journal (Timeline & Orbit)
Visualisasikan perjalanan hidup Anda secara kronologis yang indah:
- **Chronological Timeline**: Akses seluruh jurnal historis Anda dengan navigasi yang sangat mulus.
- **Weekly Orbit & Streak Metrics**: Monitor konsistensi menulis Anda melalui grafik streak mingguan untuk membangun kebiasaan positif.
- **Calendar & Time Travel**: Lompat ke tanggal mana pun di masa lalu untuk membaca kembali atau menulis entri yang terlewat.

### 3. 💡 Reflect (Refleksi Harian & Cosmic Recap)
Halaman cerdas yang mengurasi memori dan tujuan Anda untuk sesi introspeksi harian:
- **Cosmic Recap (AI Weekly Reflection)**: Menjelajahi pola emosi, tema berulang, pelajaran hidup, serta target mingguan yang disarankan secara otomatis dari catatan Anda menggunakan Google Gemini API.
- **Interactive AI Wisdom & Action Checklists**: Ubah rekomendasi refleksi AI atau rencana aksi hasil Cosmic Recap secara instan menjadi checklist tugas mandiri atau catatan mutiara hikmah yang siap dihubungkan.
- **Use Simulation Option**: Opsi manual berbasis simulasi data apabila koneksi API Key mengalami error atau batas kuota tercapai.
- **Yesterday & Flashback**: Baca kembali apa yang Anda lakukan kemarin atau tepat 1 tahun yang lalu (*throwback*).
- **Gem & Idea of the Day**: Menampilkan kutipan bijak acak dari modul *Wisdom* atau gagasan cemerlang dari modul *Ideas* Anda.
- **Memory Lane**: Temukan kembali entri masa lalu yang dipilih secara acak untuk membangkitkan nostalgia positif.

### 4. 📊 Insights (Analitik & Statistik Pro)
Ubah tulisan Anda menjadi grafik perkembangan diri yang interaktif:
- **Writing Habits**: Analisis total kata per hari, waktu paling produktif untuk menulis, dan statistik produktivitas.
- **Metric Charts**: Visualisasikan frekuensi mimpi, jumlah tag terpopuler, dan orang yang paling sering dihubungi dalam grafik mingguan, bulanan, atau tahunan.

### 5. 🛌 Dreams (Log Mimpi)
Ruang aman untuk mencatat petualangan bawah sadar Anda:
- **Dream Journaling**: Input catatan mimpi secara terintegrasi langsung di dalam entri harian atau secara *on-demand*.
- **Dream Tracker**: Identifikasi mimpi buruk, mimpi berulang, dan cari pola di balik tidur Anda melalui tab khusus *Dreams*.

### 6. ⭐️ Highlights (Sorotan Terbaik)
Ruang kurasi khusus untuk mengumpulkan momen terbaik Anda:
- **Positive Focus**: Simpan sorotan harian untuk melatih rasa bersyukur (*gratitude*).
- **Weekly Highlights**: Direkomendasikan untuk menandai minimal 1 highlight per minggu sebagai pengingat pencapaian pribadi.

### 7. 🏷️ Tags & People Explorer
Analisis hubungan sosial dan kebiasaan pribadi Anda:
- **Theme Analytics**: Halaman detail untuk setiap `#tag` dan `@person` dengan grafik distribusi frekuensi tahunan.
- **Do More / Do Less**: Tandai kebiasaan baik yang ingin ditingkatkan atau kebiasaan buruk yang ingin dikurangi.
- **Tag Aliases & Groups**: Satukan variasi tag (misal: `#kerja` dan `#pekerjaan` menjadi satu alias) atau kelompokkan nama (misal: grup `"Keluarga"` berisi `@ibu`, `@ayah`, `@adik`).

### 8. 📝 Notes (Catatan Fleksibel)
Modul catatan independen yang terpisah dari lini masa jurnal harian:
- **Double Labeling**: Kelompokkan catatan Anda dengan banyak label.
- **Context Linking**: Hubungkan catatan panjang, riset buku, atau rekapan bulanan Anda langsung ke tanggal jurnal tertentu.
- **Notebook UI & Dashboard**: Desain laci dashboard catatan baru yang mempermudah pengelompokan label, dilengkapi modal konfirmasi penghapusan demi keamanan data, serta visualisasi editor yang lebih premium.
- **Light-mode PDF Export**: Ekspor catatan panjang atau draf jurnal Anda ke dokumen PDF berkualitas cetak dengan layout terang (*light-mode*) yang bersih dan profesional.

### 9. 🎯 Goals & Focus (Prioritas Hidup Pro)
Kelola tujuan jangka pendek dan jangka panjang tanpa merasa kewalahan:
- **Goal Priority Levels**: Atur tingkat prioritas target Anda menjadi **High**, **Medium**, atau **Low** untuk pengelompokan fokus.
- **Smart Category Dropdown**: Kelompokkan target dengan memilih kategori dari daftar pintar (Health, Work, Creative, dsb.) atau buat kategori kustom baru.
- **Action Item Conversion**: Konversi item rencana aksi hasil Cosmic Recap secara instan menjadi checklist harian yang terintegrasi pada catatan hari ini, lengkap dengan penentuan tenggat waktu (deadline).
- **Focus Modes**: Pilih visualisasi target Anda menggunakan mode *Hyperfocus* (fokus pada 1 target utama), *Top 3*, atau menggunakan hukum *Pareto* (aturan 80/20).
- **Overload Prevention**: Peringatan otomatis agar tidak membuat terlalu banyak target sekaligus.

### 10. 💎 Wisdom & 💡 Ideas
- **Wisdom (Gems)**: Simpan kutipan favorit, fakta unik, atau pelajaran hidup berharga (*Thought*, *Quote*, *Fact*, *Excerpt*) dan hubungkan ke entri jurnal Anda.
- **Ideas Drawer**: Laci digital tempat membuang seluruh ide mentah Anda sebelum dievaluasi di halaman refleksi.

---

## 🎨 Design System & Estetika

Aplikasi ini menggunakan sistem desain premium yang terinspirasi dari estetika **Journalistic** dengan pendekatan *Gen-Z vibes*:

* **Visual Theme**: Minimalis, elegan, dan menenangkan dengan dominasi warna gelap arang (*Dark Charcoal* `#1A1C1A` / `#2F3331`) berpadu dengan aksen warna hangat (*Warm Yellow* `#FFEEAA`) dan hijau segar (*Vibrant Mint* `#00DC7D`).
* **Typography Hierarchy**: 
  - **Display & Headings**: Menggunakan font serif klasik (**Palatino / Georgia**) untuk kesan editorial, prestisius, dan kontemplatif.
  - **Body & UI**: Menggunakan font sans-serif bersih (**Helvetica / Arial**) yang ringan (`font-weight: 200` & `400`) untuk efisiensi membaca dan estetika bersih.
  - **Accent Labels**: Sentuhan aksen script (**Brush Script MT**) yang hangat dan personal untuk elemen micro-journaling dekoratif.
* **Layout & Spacing**: Konsisten menggunakan grid berbasis kelipatan `8px` dengan margin yang sangat lega demi mencegah kelelahan kognitif (*cognitive overload*).
* **Elevation & Corner**: Konsisten dengan sudut membulat elegan (`border-radius: 10.4px`) dan bayangan lembut (*subtle shadows*) untuk efek kedalaman visual yang premium.
* **Smooth Transitions**: Animasi mikro yang sangat halus pada FAB speed-dial menggunakan transform dan dynamic `max-height` transition untuk merespon reflow mobile tanpa patah-patah.
* **Bottom Bar Morph Animation**: Efek transisi bilah navigasi bawah (bottom bar) yang bermetamorfosis (*morph*) secara sangat halus dan interaktif untuk menghadirkan pengalaman pengguna yang dinamis dan premium.

---

## 🛠️ Tech Stack & Arsitektur

- **Frontend Framework**: [Next.js 16 (App Router)](https://nextjs.org/) dengan [TypeScript](https://www.typescriptlang.org/)
- **UI & Styling**: [Tailwind CSS v4](https://tailwindcss.com/) dengan modul `@tailwindcss/postcss`
- **Icon Packs**: `@fortawesome/react-fontawesome` (FontAwesome 7), `@heroicons/react`, & `@mingcute/react`
- **Date Utilities**: `date-fns`
- **Backend Service**: [Firebase Suite](https://firebase.google.com/)
  - **Firebase Authentication**: Sistem masuk pengguna yang aman (Google Sign-In & Email/Password).
  - **Cloud Firestore**: Database NoSQL *real-time* dengan fitur *Offline Persistence* agar data tetap dapat dibaca/ditulis tanpa internet.
  - **Firebase Hosting**: Pengiriman PWA ultra-cepat dengan protokol HTTPS otomatis.
- **AI Integrations**: Google Gemini API (`gemini-flash-latest` & `gemini-3.5-flash`) untuk Cosmic Recap, dengan rantai fallback model otomatis (model fallback chain) dan perlindungan server-only key.

---

## 🚀 Panduan Memulai (Getting Started)

### Prasyarat (Prerequisites)
Ensure you have the following installed on your machine:
- **Node.js**: Version 22 or later
- **NPM** or **Yarn**
- An active **Firebase Console** account

---

### Langkah 1: Kloning & Instalasi
```bash
git clone https://github.com/asashades/asa-journey.git
cd asa-journey
npm install
```

---

### Langkah 2: Konfigurasi Environment Variables
Rename `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Input your Firebase credentials and Gemini API configurations inside `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here

# AI configuration resolver settings
AI_DEFAULT_PROVIDER=gemini
AI_DEFAULT_MODEL=gemini-flash-latest
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

---

### Langkah 3: Setup Firebase di Console
1. Buka [Firebase Console](https://console.firebase.google.com/) dan buat proyek baru bernama **ASA Journey**.
2. **Authentication**: Aktifkan metode masuk **Google** dan **Email/Password** di tab *Sign-in method*.
3. **Cloud Firestore**: 
   - Klik *Create database*.
   - Pilih wilayah terdekat (misal: `asia-southeast1`).
   - Jalankan database dalam **production mode**.
4. **Storage**: Aktifkan Cloud Storage jika Anda berencana mengunggah media.

---

### Langkah 4: Terapkan Security Rules & Indexes
```bash
# Login ke akun Firebase Anda
npx firebase login

# Tautkan dengan proyek Firebase Anda
npx firebase use --add

# Deploy konfigurasi rules dan indexes
npx firebase deploy --only firestore
```

---

### Langkah 5: Jalankan di Server Lokal
```bash
npm run dev
```

Buka peramban (browser) Anda dan akses:
**[http://localhost:3000](http://localhost:3000)**

---

## 📱 Progressive Web App (PWA) & Mode Offline

Aplikasi ini sepenuhnya mendukung PWA. Jika Anda membukanya di browser Google Chrome, Edge, atau Safari (iOS):
1. Anda akan melihat ikon tombol **"Install App"** di bilah alamat (*address bar*) atau menu opsi.
2. Klik tombol tersebut untuk memasang ASA Journey di layar utama ponsel atau desktop Anda.
3. Aplikasi kini dapat diakses secara instan dengan jendela terdedikasi tanpa bilah browser.

### 🔌 Dukungan Offline-First
Saat perangkat Anda kehilangan sinyal atau berada dalam mode pesawat:
- **Akses Penuh**: Anda tetap dapat membuka aplikasi, meninjau entri jurnal lama, mencari tag, membaca mimpi, dan merencanakan ide.
- **Tulis Jurnal Baru**: Anda tetap bisa menulis entri harian baru.
- **Real-time Sync**: Semua perubahan dan tulisan baru akan disimpan secara lokal di memori perangkat, lalu disinkronkan secara otomatis ke cloud Firebase saat koneksi internet Anda kembali aktif.

---

## 🔒 Keamanan & Privasi Data

- **Autentikasi Terenkripsi**: Seluruh data login diproses langsung oleh Firebase Auth menggunakan enkripsi berstandar industri.
- **Isolasi Data**: Menggunakan Firestore Security Rules untuk memastikan tidak ada pengguna lain yang dapat mengintip tulisan jurnal Anda.
- **Ekspor Data**: Kami sangat mendukung kepemilikan data seutuhnya. Anda dapat mengekspor seluruh entri jurnal Anda kapan saja dalam format teks terstruktur, Markdown, maupun berkas JSON di menu Pengaturan.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **Lisensi MIT** - lihat berkas [LICENSE](LICENSE) untuk detail lebih lanjut.

---

<p align="center">
  Dibuat dengan 🖤 untuk menemani perjalanan refleksi diri Anda. Selamat menulis!
</p>
