# 📊 Dokumentasi Lengkap Project — BNI Life Insurance Dashboard
### Internal Analytics & ML/DL Teller Transaction System

> Dokumen ini merangkum seluruh codebase project Dashboard Analitik BNI Life Insurance, mencakup arsitektur aplikasi, semua halaman/komponen, algoritma Machine Learning & Deep Learning, serta metode analisis lainnya.

---

## 📌 Daftar Isi

1. [Gambaran Umum Aplikasi](#1-gambaran-umum-aplikasi)
2. [Struktur Teknologi (Tech Stack)](#2-struktur-teknologi-tech-stack)
3. [Arsitektur Aplikasi & Routing](#3-arsitektur-aplikasi--routing)
4. [Sistem Autentikasi & Session](#4-sistem-autentikasi--session)
5. [API Layer](#5-api-layer)
6. [Halaman Dashboard Utama](#6-halaman-dashboard-utama)
7. [Halaman CRUD Produksi](#7-halaman-crud-produksi)
8. [SAW Ranking (Bukan ML — Decision Support)](#8-saw-ranking-bukan-ml--decision-support)
9. [Dashboard Analisis Teller](#9-dashboard-analisis-teller)
10. [Dashboard Nasabah Pasmar](#10-dashboard-nasabah-pasmar)
11. [K-Means Clustering (Machine Learning)](#11-k-means-clustering-machine-learning)
12. [DBSCAN Clustering (Machine Learning)](#12-dbscan-clustering-machine-learning)
13. [Regresi Linear & Polinomial (Machine Learning)](#13-regresi-linear--polinomial-machine-learning)
14. [Isolation Forest (Machine Learning)](#14-isolation-forest-machine-learning)
15. [Autoencoder Neural Network (Deep Learning)](#15-autoencoder-neural-network-deep-learning)
16. [LSTM Forecasting (Deep Learning)](#16-lstm-forecasting-deep-learning)
17. [Perbandingan Semua Metode](#17-perbandingan-semua-metode)
18. [Kamus Istilah](#18-kamus-istilah)

---

## 1. Gambaran Umum Aplikasi

**BNI Life Insurance Internal Dashboard** adalah sistem analitik internal berbasis web yang dibangun menggunakan React. Sistem ini menggabungkan dashboard produksi, manajemen data, analisis transaksi teller, dan berbagai algoritma Machine Learning serta Deep Learning — semuanya berjalan langsung di browser (*client-side*) tanpa server tambahan untuk komputasi ML.

### Fitur Utama

| Modul | Fungsi | Kategori |
|---|---|---|
| Dashboard Produksi | Visualisasi premi, fee, polis per BAS/LSR | Analisis |
| CRUD Produksi | Input, edit, hapus data produksi | Manajemen Data |
| SAW Ranking | Peringkat BAS/LSR dengan scoring terbobot | Decision Support |
| Teller Dashboard | Monitoring transaksi CR/DR harian | Analisis |
| Pasmar Dashboard | Distribusi & ranking nasabah | Analisis |
| K-Means | Pengelompokan transaksi otomatis | Machine Learning |
| DBSCAN | Clustering + deteksi anomali | Machine Learning |
| Regresi | Prediksi nilai transaksi berdasarkan waktu | Machine Learning |
| Isolation Forest | Deteksi fraud/anomali berbasis pohon isolasi | Machine Learning |
| Autoencoder | Deteksi anomali via neural network | Deep Learning |
| LSTM | Peramalan pola transaksi per jam | Deep Learning |

---

## 2. Struktur Teknologi (Tech Stack)

```
Frontend:
├── React (JSX)          — UI framework
├── Recharts             — Visualisasi grafik (bar, line, scatter, pie, radar)
├── TensorFlow.js        — Autoencoder + LSTM (ML/DL di browser)
├── Lucide React         — Icon library
└── Tailwind CSS         — Styling (dipakai di beberapa halaman)

Backend / Data:
├── Google Apps Script   — REST API (create, read, update, delete)
└── Google Sheets        — Database (tabel produksi, teller, pasmar)

Algoritma (Pure JS — tanpa library eksternal):
├── K-Means Clustering   — kmeansOnce(), runKMeans()
├── DBSCAN               — runDBSCAN(), rangeQuery()
├── Linear Regression    — linearRegression()
├── Polynomial Regression— polyRegression2()
└── Isolation Forest     — buildITree(), runIsolationForest()
```

---

## 3. Arsitektur Aplikasi & Routing

File utama: **`App.jsx`**

Routing menggunakan state `page` (bukan React Router), sehingga setiap navigasi hanya mengganti komponen yang dirender tanpa reload halaman.

```jsx
// Contoh routing dari App.jsx
{page === "dashboard"       && <Dashboard  data={data} loading={loading} />}
{page === "tellerdashboard" && <TellerDashboard data={dataTeller} loading={loadingTeller} />}
{page === "kmeans"          && <KMeansDashboard data={dataTeller} loading={loadingTeller} />}
{page === "dbscan"          && <DBSCANDashboard data={dataTeller} loading={loadingTeller} />}
{page === "regresi"         && <RegresiDashboard data={dataTeller} loading={loadingTeller} />}
{page === "if"              && <IsolationForestDashboard data={dataTeller} loading={loadingTeller} />}
{page === "auto"            && <AutoencoderDashboard data={dataTeller} loading={loadingTeller} />}
{page === "lstm"            && <LSTMDashboard data={dataTeller} loading={loadingTeller} />}
{page === "crud"            && <Crud data={data} loading={loading} onRefresh={loadData} />}
```

### Layout Utama

```
┌─────────────────────────────────────────────────────┐
│  Topbar (navigasi mobile, info session, logout)     │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│   Sidebar    │        <Main Content Page>           │
│  (desktop)   │                                      │
│              │                                      │
├──────────────┴──────────────────────────────────────┤
│  BottomNav (mobile navigation)                      │
└─────────────────────────────────────────────────────┘
```

---

## 4. Sistem Autentikasi & Session

File: **`Login.jsx`** + session management di `App.jsx`

### Alur Login

```
User mengisi username + password
        ↓
POST ke Google Apps Script (action=login)
        ↓
Response JSON: { success, username, nama, message }
        ↓
Jika berhasil → simpan session ke localStorage
        ↓
Redirect ke dashboard dengan animasi pop-up "Selamat Pagi/Siang/..."
```

### Struktur Session di localStorage

```json
{
  "username": "user001",
  "nama": "Budi Santoso",
  "loginAt": "2025-01-15T08:00:00.000Z",
  "expiresAt": "2025-01-15T16:00:00.000Z"
}
```

> **Session berlaku 8 jam** (`SESSION_DURATION_MS = 8 * 60 * 60 * 1000`). Setiap 5 menit, aplikasi mengecek apakah session masih valid. Jika sudah expired, user otomatis di-logout.

### Fitur Keamanan Login

- Password toggle (tampil/sembunyikan)
- Validasi input kosong
- Error message dari server
- Animasi progress bar saat redirect
- Greeting sesuai waktu (Pagi/Siang/Sore/Malam)

---

## 5. API Layer

File: **`api.js`** + **`config.js`**

Semua komunikasi ke backend (Google Apps Script) melalui fungsi-fungsi ini:

```javascript
// Membaca data produksi (premi, fee, polis)
export async function getAllData() {
  const res = await fetch(BASE_URL + "?action=read");
  return res.json();
}

// Membaca data transaksi teller (NO, TIME, TELLER, TRAN_CODE, AMOUNT, TYPE)
export async function getAllDataTeller() {
  const res = await fetch(BASE_URL + "?action=read_teller");
  return res.json();
}

// Membaca data nasabah pasmar (NO, NAMA, NOMINAL)
export async function getAllDataPasmar() {
  const res = await fetch(BASE_URL + "?action=read_pasmar");
  return res.json();
}

// CRUD Produksi
export async function createData(payload) { ... }
export async function updateData(payload) { ... }
export async function deleteData(id) { ... }
```

### Format Data Transaksi Teller

```
NO   | TIME     | TELLER | TRAN_CODE | SYS | AMOUNT    | TYPE | CUR
-----|----------|--------|-----------|-----|-----------|------|----
1    | 08:19:00 | T001   | TRF       | BOR | 15000000  | CR   | IDR
2    | 09:45:00 | T002   | WD        | BOR | 5000000   | DR   | IDR
```

---

## 6. Halaman Dashboard Utama

File: **`Dashboard.jsx`**

Dashboard produksi BNI Life Insurance — menampilkan KPI, tren premi bulanan, komposisi produk, ranking BAS/LSR, dan fee based.

### KPI Cards

| Kartu | Sumber Data | Warna |
|---|---|---|
| Total Premium | Sum "Basic Premium Regular" | BNI Orange |
| Total Fee Based | Sum "Fee Based" | BNI Blue |
| Jumlah Polis | Count rows | Teal |

### Visualisasi

```
1. Bar Chart — Premium per Bulan (dikelompokkan per "Periode")
2. Doughnut Chart — Komposisi Produk (BLUP / BLSD / BLHYNP1)
3. Bar Chart — Fee Based per Bulan
4. Horizontal Bar — Top 5 BAS (Basic Agency Staff) tertinggi
5. Horizontal Bar — Top 5 LSR (kontribusi terbesar)
```

Contoh pengelompokan data untuk chart:

```javascript
// groupSum(data, "Periode", "Basic Premium Regular")
// Menghasilkan: { "January,2025": 45000000, "February,2025": 52000000, ... }
```

### Export PDF & CSV

Dashboard mendukung ekspor ke PDF (via `exportToPDF`) dan CSV (via `exportToCSV`). PDF dirender dari data chart menggunakan library eksternal yang dipanggil secara dinamis.

---

## 7. Halaman CRUD Produksi

File: **`Crud.jsx`**

Manajemen data produksi (tambah, edit, hapus) dengan pagination 20 data per halaman.

### Form Input Fields

| Field | Tipe | Contoh |
|---|---|---|
| Periode | Text | "January,2025" |
| Policy Number | Number | 1234567890 |
| Frequency | Select | Single / Monthly / Quarterly / Yearly |
| Product | Select | BLUP / BLSD / BLHYNP1 |
| Basic Premium | Number | 5000000 |
| Fee Based | Number | 250000 |
| BAS Name | Text | "Ahmad Fauzi" |
| NPP BAS | Number | 123456 |
| LSR Name | Text | "Siti Rahayu" |
| NPP LSR | Number | 789012 |
| LSR Unit Name | Text | "Unit Jakarta Selatan" |

### Payload yang Dikirim ke API

```javascript
function buildPayload(source) {
  return {
    Periode: source.Periode,
    "Policy Number": source.PolicyNumber,
    "Issued Date": new Date().toISOString(),
    Frequency: source.freq,
    "Policy Status": "Inforce",
    "SPAJ Status": "Inforce",
    Product: source.Product,
    "Basic Premium Regular": Number(source.Premium),
    "Fee Based": Number(source.Fee),
    "Branch Name": "KCP RSAL DR.RAMELAN",
    NPPBAS: "BAS-" + source.NPPBAS,
    "BAS Name": source.BAS,
    // ...
  };
}
```

### Edit Modal

Klik tombol **Edit** membuka modal overlay dengan form pre-filled. Update hanya mengirim field yang dapat berubah (Periode, Product, Premium, Fee, BAS, LSR).

---

## 8. SAW Ranking (Bukan ML — Decision Support)

File: **`SAWRanking.jsx`**

> ⚠️ **SAW bukan Machine Learning.** SAW adalah metode **Multi-Criteria Decision Making (MCDM)** — sebuah teknik matematika sederhana untuk memberi peringkat alternatif berdasarkan beberapa kriteria dengan bobot tertentu.

### Apa itu SAW?

**Simple Additive Weighting (SAW)** adalah metode pengambilan keputusan yang mengalikan nilai ternormalisasi setiap kriteria dengan bobotnya, lalu menjumlahkan hasilnya.

> **Analogi sederhana:** Kamu menilai calon karyawan dari dua kriteria: nilai ujian (bobot 60%) dan pengalaman kerja (bobot 40%). Kandidat A: ujian 90, pengalaman 70. Kandidat B: ujian 75, pengalaman 95. SAW menghitung skor akhir dengan mempertimbangkan kedua kriteria secara bersamaan.

### Rumus SAW

```
Normalisasi (benefit): norm_i = nilai_i / nilai_maksimum

Skor SAW = (norm_BP × bobot_BP) + (norm_Fee × bobot_Fee)

Contoh dengan bobot BP=60%, Fee=40%:
BAS "Ahmad Fauzi":   BP = Rp 50jt (norm=1.0), Fee = Rp 5jt (norm=0.5)
  Skor = 1.0 × 0.6 + 0.5 × 0.4 = 0.6 + 0.2 = 0.8000

BAS "Budi Santoso":  BP = Rp 30jt (norm=0.6), Fee = Rp 10jt (norm=1.0)
  Skor = 0.6 × 0.6 + 1.0 × 0.4 = 0.36 + 0.4 = 0.7600

Ranking: Ahmad Fauzi (0.8000) > Budi Santoso (0.7600)
```

### Implementasi di Code

```javascript
function computeSAW(data, periodeFilter, wBP, mode) {
  // 1. Filter data berdasarkan periode
  // 2. Kelompokkan per nama BAS atau LSR
  // 3. Hitung total BP dan total Fee per nama
  // 4. Normalisasi: bagi dengan nilai maksimum
  // 5. Hitung skor SAW = normBP × wBP + normFee × wFee
  // 6. Urutkan dari skor tertinggi

  const maxBP  = Math.max(...names.map(n => map[n].totalBP));
  const maxFee = Math.max(...names.map(n => map[n].totalFee));

  return names.map(name => {
    const nBP   = d.totalBP  / maxBP;   // normalisasi 0-1
    const nFee  = d.totalFee / maxFee;  // normalisasi 0-1
    const score = nBP * wBP + nFee * wFee;
    return { name, score, ... };
  }).sort((a, b) => b.score - a.score);
}
```

### Fitur Interaktif

- **Slider bobot** — geser untuk mengubah proporsi BP vs Fee secara real-time
- **Filter periode** — ranking bisa dihitung per bulan tertentu
- **Mode BAS / LSR** — toggle antara ranking agen (BAS) atau supervisor (LSR)
- **Tampilan Card atau Tabel** — pilih tampilan yang diinginkan
- **Medal 🥇🥈🥉** — visualisasi peringkat 3 besar

---

## 9. Dashboard Analisis Teller

File: **`TellerDashboard.jsx`**

Dashboard monitoring transaksi teller harian — bukan ML, murni analisis deskriptif/statistik.

### KPI Cards

| KPI | Rumus |
|---|---|
| Total Transaksi | `data.length` |
| Total Credit (CR) | `sum(AMOUNT where TYPE=CR)` |
| Total Debit (DR) | `sum(AMOUNT where TYPE=DR)` |
| Rata-rata per Transaksi | `totalAmount / totalCount` |

### Visualisasi

```
1. Bar Chart — Volume transaksi per jam (CR vs DR berdampingan)
   Contoh: Jam 10:00 → CR: 5 txn, DR: 3 txn

2. Pie Chart — Komposisi tipe (CR vs DR)
   Contoh: CR 60% vs DR 40%

3. Horizontal Bar — Nilai per Tran Code
   Contoh: TRF (Transfer): Rp 150jt, WD (Withdrawal): Rp 80jt

4. Bar Chart — Distribusi sistem (SYS: BOR / lainnya)

5. Bar Chart — Net flow per teller (CR - DR)
   Contoh: T001 → net +Rp 20jt (biru), T003 → net -Rp 5jt (merah)

6. Line Chart — Akumulasi CR sepanjang hari (kumulatif)
```

### Filter Tabel

Tabel detail mendukung filter berdasarkan Tipe (CR/DR), SYS, dan pencarian bebas (NO/Teller/Tran Code). Pagination 20 baris per halaman.

---

## 10. Dashboard Nasabah Pasmar

File: **`PasmarDashboard.jsx`**

Analisis distribusi nominal nasabah Pasmar (tabungan/deposito). Bukan ML — analisis deskriptif dengan segmentasi manual.

### Segmentasi Nominal

```javascript
const SEGMENTS = [
  { label: "< 1 Juta",    min: 0,          max: 1_000_000   },
  { label: "1–10 Juta",   min: 1_000_000,  max: 10_000_000  },
  { label: "10–50 Juta",  min: 10_000_000, max: 50_000_000  },
  { label: "50–100 Juta", min: 50_000_000, max: 100_000_000 },
  { label: "> 100 Juta",  min: 100_000_000,max: Infinity    },
];
```

### Privasi Nama Nasabah

```javascript
// Nama disembunyikan secara default untuk keamanan data
function maskName(name) {
  if (name.length <= 3) return name;
  return name.substring(0, 3) + " " + "*".repeat(7);
}
// "Budi Santoso" → "Bud *******"
// Toggle "Tampilkan Nama" untuk melihat nama asli
```

### Visualisasi

```
1. Horizontal Bar — Top 10 nasabah berdasarkan nominal
2. Pie Chart — Segmentasi nasabah (5 kategori nominal)
3. Histogram Bar — Distribusi 10 bucket nominal
4. Bar Chart — Total nominal per segmen
5. Tabel — Detail nasabah dengan filter, sort, search, pagination
```

---

## 11. K-Means Clustering (Machine Learning)

File: **`KMeansDashboard.jsx`**

> ✅ **Kategori: Unsupervised Machine Learning (Clustering)**

### Apa itu K-Means?

K-Means adalah algoritma ML yang mengelompokkan data ke dalam **K kelompok** berdasarkan kemiripan. Setiap data masuk ke kelompok dengan centroid (titik pusat) yang paling dekat.

> **Analogi:** 100 biji kacang tersebar di lantai. K-Means seperti menentukan 3 titik pusat, lalu setiap biji bergabung ke titik yang paling dekat. Titik pusat terus bergeser hingga stabil.

### Bagaimana Kode Ini Bekerja

```javascript
// 1. Normalisasi data ke skala 0-1
function normalizePoints(data) {
  // amount dan time dinormalisasi agar skala seimbang
  const normA = (v) => (v - minA) / (maxA - minA);
  const normT = (v) => (v - minT) / (maxT - minT);
}

// 2. Inisialisasi centroid dengan K-Means++
// (memilih centroid awal yang jauh satu sama lain — lebih stabil)

// 3. Iterasi assignment & update centroid (maks 150 iterasi)
// Setiap titik → masuk ke centroid terdekat (Euclidean distance)
// Centroid → diupdate ke rata-rata semua anggotanya

// 4. Re-labeling cluster berdasarkan rata-rata amount (ascending)
// agar label stabil dan konsisten setiap run
```

### Contoh Hasil Clustering (K=3)

| Cluster | Karakteristik | Contoh |
|---|---|---|
| **Cluster A** (kecil) | Amount rendah, jam pagi | Rp 2jt jam 08:00 |
| **Cluster B** (menengah) | Amount sedang, jam siang | Rp 25jt jam 11:30 |
| **Cluster C** (besar) | Amount tinggi, jam sore | Rp 150jt jam 15:00 |

### Elbow Method — Memilih K Optimal

```javascript
function computeElbow(points, maxK = 6) {
  // Jalankan K-Means untuk K=2 hingga K=6
  // Hitung WCSS (Within-Cluster Sum of Squares) untuk setiap K
  // K optimal = titik "siku" di mana penurunan WCSS mulai melambat
}

// Contoh output:
// K=2: WCSS = 2.45
// K=3: WCSS = 0.89  ← siku (optimal)
// K=4: WCSS = 0.72
// K=5: WCSS = 0.68  ← hampir sama
```

### Fitur Interaktif

- Pilih K = 2, 3, 4, atau 5 langsung dari header
- Klik kartu cluster untuk filter tabel
- Elbow chart dengan highlight K rekomendasi
- Scatter plot color-coded per cluster

---

## 12. DBSCAN Clustering (Machine Learning)

File: **`DBSCANDashboard.jsx`**

> ✅ **Kategori: Unsupervised Machine Learning (Density-Based Clustering)**

### Apa itu DBSCAN?

DBSCAN mengelompokkan data berdasarkan **kepadatan**. Tidak perlu menentukan jumlah cluster di awal. Titik yang terisolasi (tidak punya cukup tetangga) otomatis menjadi **noise** (anomali).

> **Analogi:** Peta kerumunan orang di mal. Kelompok padat = satu toko ramai. Orang yang berdiri sendiri jauh dari kerumunan = noise.

### Tiga Jenis Titik DBSCAN

```
ε (epsilon) = radius pencarian
minPts      = minimum tetangga agar disebut "padat"

● Core Point   : punya ≥ minPts tetangga dalam radius ε → inti cluster
○ Border Point : tetangga core point, tapi tetangganya < minPts
✗ Noise Point  : tidak punya cukup tetangga → ANOMALI
```

### Implementasi di Code

```javascript
function runDBSCAN(points, eps, minPts) {
  const labels = new Array(points.length).fill(-2); // -2 = belum dikunjungi

  for (let i = 0; i < points.length; i++) {
    if (labels[i] !== -2) continue;
    const neighbors = rangeQuery(points, i, eps); // cari tetangga dalam radius ε

    if (neighbors.length < minPts) {
      labels[i] = -1; // noise (anomali)
      continue;
    }

    labels[i] = clusterId; // tandai sebagai core point
    // expand cluster: masukkan semua tetangga ke cluster yang sama
    // ...
    clusterId++;
  }
  return { labels, numClusters: clusterId };
}
```

### Contoh Hasil (ε=0.15, minPts=3)

```
Transaksi normal (jam kerja, amount wajar) → masuk Cluster 1, 2, dst
Transaksi jam 02:00 pagi, Rp 500jt         → NOISE (anomali!)
Transaksi Rp 100 (uji coba sistem)          → NOISE (anomali!)
```

### Slider Parameter Real-Time

```
ε (epsilon): 0.05 ─────●───────── 0.50
  Makin besar → cluster melebar, noise berkurang

minPts: 2 ──────●──────── 10
  Makin besar → cluster lebih padat, noise bertambah
```

### Perbedaan K-Means vs DBSCAN

| Aspek | K-Means | DBSCAN |
|---|---|---|
| Jumlah cluster | Harus ditentukan manual | Otomatis dari data |
| Deteksi outlier | ❌ Tidak | ✅ Otomatis (jadi noise) |
| Bentuk cluster | Harus bulat | Bebas (arbitrer) |
| Kecepatan | O(nkt) — lebih cepat | O(n²) — lebih lambat |
| Cocok untuk | Data terstruktur | Data dengan noise/anomali |

---

## 13. Regresi Linear & Polinomial (Machine Learning)

File: **`RegresiDashboard.jsx`**

> ✅ **Kategori: Supervised Machine Learning (Regression)**
> *(Meskipun tidak ada label kelas, regresi termasuk supervised karena belajar memetakan X→Y)*

### Apa itu Regresi?

Regresi mencari **fungsi matematis** yang paling baik mendeskripsikan hubungan antara variabel input (jam transaksi) dan output (nilai transaksi).

> **Analogi:** Kamu catat jam dan jumlah makanan yang dimakan setiap hari. Setelah 30 hari, kamu bisa gambar garis tren — "semakin siang, semakin banyak makan". Garis itu bisa digunakan untuk prediksi.

### Regresi Linear (OLS)

```javascript
function linearRegression(xs, ys) {
  // Rumus OLS (Ordinary Least Squares):
  // b (slope)     = Σ(xi - x̄)(yi - ȳ) / Σ(xi - x̄)²
  // a (intercept) = ȳ - b·x̄

  const b = ssXY / ssXX;
  const a = meanY - b * meanX;

  // Contoh hasil:
  // y = 5.23 + 1.45 · x
  // Prediksi jam 10: y = 5.23 + 1.45 × 10 = 19.73 juta
}
```

### Regresi Polinomial Derajat 2

```javascript
function polyRegression2(xs, ys) {
  // Rumus: y = a + bx + cx²
  // Diselesaikan dengan sistem persamaan linear 3×3 (Cramer's rule)

  // Contoh: transaksi rendah pagi, puncak siang, turun sore
  // y = -10.5 + 8.2x - 0.4x²  (bentuk parabola)
}
```

### Metrik Evaluasi

```javascript
// R² (R-Squared) — seberapa baik model menjelaskan data
R² = 1 - (SS_residual / SS_total)
// R² = 1.0 → sempurna | R² = 0.0 → tidak berguna

// MAE (Mean Absolute Error)
MAE = rata-rata |aktual - prediksi|
// Contoh: aktual=[10,20,15], prediksi=[12,18,16], MAE = 1.67 jt

// RMSE (Root Mean Squared Error)
RMSE = √(rata-rata (aktual - prediksi)²)
// Lebih sensitif terhadap error besar

// Moving Average (window=3)
// [10, 20, 15, 25, 18] → [-, -, 15, 20, 19.3]
```

### Fitur Interaktif

- Toggle model: **Linear** vs **Polinomial**
- Toggle sumbu X: **Jam Transaksi** vs **Urutan Index**
- Filter tipe: **Semua** / **CR** / **DR**
- **Simulasi prediksi** dengan slider jam → nilai prediksi tampil real-time
- Plot residual untuk diagnostik model

---

## 14. Isolation Forest (Machine Learning)

File: **`IsolationForestDashboard.jsx`**

> ✅ **Kategori: Unsupervised Machine Learning (Anomaly Detection)**
> Referensi: Liu et al. (2008) — *Isolation Forest*

### Apa itu Isolation Forest?

Isolation Forest mendeteksi anomali berdasarkan prinsip: **anomali lebih mudah diisolasi** dari data normal karena posisinya yang "terpencil".

> **Analogi:** Bermain petak umpet di hutan. Orang yang bersembunyi di tengah kerumunan (normal) susah ditemukan. Orang yang berdiri sendiri di lapangan (anomali) langsung ketahuan hanya dengan 2-3 langkah.

### Bagaimana Kode Ini Bekerja

```javascript
// 1. Bangun banyak "isolation tree" (pohon acak)
function buildITree(data, indices, depth, maxDepth) {
  if (indices.length <= 1 || depth >= maxDepth) {
    return { isLeaf: true, size: indices.length };
  }
  // Pilih fitur acak (amount atau time)
  const featureIdx = Math.floor(Math.random() * 2);
  // Pilih nilai split acak antara min dan max
  const splitVal = randomBetween(minVal, maxVal);
  // Rekursif: data < splitVal ke kiri, ≥ splitVal ke kanan
  return { left: buildITree(...), right: buildITree(...) };
}

// 2. Hitung path length (berapa split untuk mengisolasi satu titik)
// Anomali → path pendek (cepat terisolasi)
// Normal  → path panjang (butuh banyak split)

// 3. Hitung anomaly score
const score = Math.pow(2, -avgPath / cFactor(sampleSize));
// Score ≈ 1 → sangat anomali
// Score ≈ 0 → sangat normal
// Score ≈ 0.5 → tidak pasti
```

### Contoh Hasil

```
Transaksi normal Rp 15jt jam 10:00:
  → Butuh 8 split untuk terisolasi
  → Score = 0.42 → NORMAL ✓

Transaksi Rp 950jt jam 03:00:
  → Hanya butuh 2 split untuk terisolasi
  → Score = 0.87 → HIGH RISK ⚠

Transaksi Rp 100 (uji coba):
  → Butuh 3 split
  → Score = 0.71 → HIGH RISK ⚠
```

### Level Risiko

```javascript
const RISK_HIGH = 0.65; // score ≥ 0.65 → HIGH RISK  (merah)
const RISK_MED  = 0.50; // score ≥ 0.50 → MEDIUM RISK (kuning)
                        // score < 0.50 → NORMAL       (hijau)
```

### Keunggulan vs Threshold Sederhana

```
Threshold sederhana: "amount > 500jt = anomali"
→ Gagal mendeteksi: Rp 10.000 jam 03:00 (amount kecil tapi waktunya tidak wajar)

Isolation Forest: mempertimbangkan KOMBINASI semua fitur
→ Berhasil mendeteksi: jam tidak wajar + amount tidak konsisten
```

### Parameter yang Bisa Diubah

| Parameter | Default | Pengaruh |
|---|---|---|
| Jumlah Trees | 100 | Lebih banyak → skor lebih stabil |
| Sample Size | 256 | Lebih kecil → lebih cepat |
| Threshold HIGH RISK | 65% | Turunkan → lebih banyak anomali terdeteksi |

---

## 15. Autoencoder Neural Network (Deep Learning)

File: **`AutoencoderDashboard.jsx`**

> ✅ **Kategori: Unsupervised Deep Learning (Anomaly Detection)**
> Menggunakan: **TensorFlow.js**

### Apa itu Autoencoder?

Autoencoder adalah jaringan saraf tiruan yang dilatih untuk **mengompres lalu merekonstruksi** inputnya sendiri. Jika model gagal merekonstruksi suatu data dengan baik, data tersebut kemungkinan adalah anomali.

> **Analogi:** Mesin fotokopi yang dilatih menyalin dokumen resmi. Setelah melihat ratusan dokumen asli, mesin bisa menyalinnya dengan sempurna. Tapi ketika ada dokumen palsu (anomali), salinannya jadi kacau — banyak perbedaan. Itulah *reconstruction error* tinggi.

### Arsitektur Model

```
Input (4D)
    ↓
Dense(8, ReLU)     ← Encoder Layer 1
    ↓
Dense(2, ReLU)     ← Bottleneck / Latent Space (2D)
    ↓
Dense(8, ReLU)     ← Decoder Layer 1
    ↓
Dense(4, Sigmoid)  ← Output (harus mirip Input)
```

### Empat Fitur Input

```javascript
features = [
  normA(amount),          // 1. Normalized Amount (0-1)
  normH(hour),            // 2. Normalized Hour (0-1)
  type === "CR" ? 1 : 0,  // 3. CR/DR encoding (binary)
  normLA(amount),         // 4. Log-normalized Amount (tangkap distribusi skewed)
]
```

### Training & Threshold

```javascript
// Training: model belajar merekonstruksi transaksi normal
await model.fit(xs, xs, {  // xs = xs (input = target)
  epochs: 50,
  loss: "meanSquaredError",
  optimizer: "adam",
});

// Reconstruction Error per transaksi
RE = MSE(input, output) = rata-rata (input_i - output_i)²

// Threshold otomatis: μ + 2σ
// Mencakup ~95% data normal (asumsi distribusi normal)
threshold = mean(RE) + 2 * std(RE);

// Contoh:
// μ = 0.008, σ = 0.004
// threshold = 0.008 + 2×0.004 = 0.016
// RE > 0.016 → ANOMALI
```

### Contoh Hasil

```
Transaksi normal jam 10:00, Rp 15jt, CR:
  Input:  [0.30, 0.50, 1.0, 0.42]
  Output: [0.31, 0.49, 0.98, 0.41]
  RE = 0.0003 → NORMAL ✓

Transaksi anomali jam 01:00, Rp 500jt, DR:
  Input:  [0.99, 0.05, 0.0, 0.99]
  Output: [0.45, 0.30, 0.55, 0.50]
  RE = 0.1820 → ANOMALI ⚠
```

### Loss Curve

```
Epoch 1:  Loss = 0.045  (model masih acak)
Epoch 20: Loss = 0.012  (mulai belajar pola)
Epoch 50: Loss = 0.003  (model konvergen)
Epoch 80: Loss = 0.001  (sangat baik)
```

### Autoencoder vs Isolation Forest

| Aspek | Isolation Forest | Autoencoder |
|---|---|---|
| Jenis | ML Klasik | Deep Learning |
| Training time | Sangat cepat | Lebih lambat |
| Pola non-linear | Terbatas | ✅ Sangat baik |
| Interpretasi | Lebih mudah | Lebih sulit |
| Data sedikit | ✅ Lebih baik | Butuh data lebih banyak |

---

## 16. LSTM Forecasting (Deep Learning)

File: **`LstmDashboard.jsx`**

> ✅ **Kategori: Supervised Deep Learning (Time Series Forecasting)**
> Menggunakan: **TensorFlow.js**

### Apa itu LSTM?

**Long Short-Term Memory (LSTM)** adalah jenis Recurrent Neural Network yang memiliki "memori" — mampu mengingat pola dari waktu lampau untuk memprediksi masa depan.

> **Analogi:** Seorang analis senior yang sudah 10 tahun di BNI Life. Dia tahu: "Setiap Jumat jam 14:00–15:00 selalu ramai karena gajian". Dia *mengingat pola* dari masa lalu untuk memprediksi masa depan. Itulah LSTM.

### Arsitektur Model

```
Input: [windowSize, 1]        ← sekuens jam historis
    ↓
LSTM(32 units)                ← belajar pola temporal
    ↓
Dropout(0.1)                  ← cegah overfitting
    ↓
Dense(16, ReLU)               ← ekstrak fitur tambahan
    ↓
Dense(1)                      ← prediksi 1 nilai
```

### Sliding Window — Mengubah Data ke Format Supervised

```javascript
function buildSequences(series, windowSize) {
  // windowSize = 4 (default)
  // Data per jam: [5jt, 10jt, 15jt, 25jt, 40jt, 35jt, ...]

  // X (input)             Y (target/label)
  [5, 10, 15, 25]     →   40    // prediksi jam ke-5
  [10, 15, 25, 40]    →   35    // prediksi jam ke-6
  [15, 25, 40, 35]    →   20    // prediksi jam ke-7
  // ...
}
```

### Forecast Rekursif Multi-Step

```javascript
// Prediksi 6 jam ke depan (forecastSteps=6)
let forecastSeq = [...norm.slice(-windowSize)]; // ambil 4 jam terakhir

for (let i = 0; i < 6; i++) {
  const pred = model.predict(forecastSeq);  // prediksi jam berikutnya
  forecastSeq = [...forecastSeq.slice(1), pred]; // geser window
  // error bisa akumulatif di langkah jauh ke depan!
}
```

### Metrik Evaluasi LSTM

```
MAPE (Mean Absolute Percentage Error):
MAPE = rata-rata |aktual - prediksi| / aktual × 100%

Interpretasi:
< 10%  → Sangat akurat ✅
10-20% → Baik ✓
20-50% → Sedang ⚠
> 50%  → Kurang baik ❌

Contoh hasil:
Jam 10: aktual 40jt, prediksi 38jt → error = 5%
Jam 11: aktual 35jt, prediksi 32jt → error = 8.6%
MAPE = 6.8% → Sangat akurat! ✅
```

### Tab Navigasi Dashboard

| Tab | Isi |
|---|---|
| 📈 Forecast | Prediksi N jam ke depan + detail tabel |
| 📊 Aktual vs Pred | Overlay aktual dan in-sample prediction |
| 📉 Residual | Plot selisih aktual vs prediksi per jam |
| 🕐 Pola Jam | Heatmap aktivitas + segmentasi sesi kerja |

### Parameter Konfigurasi

| Parameter | Range | Default | Pengaruh |
|---|---|---|---|
| Target | Dropdown | Total Amount | Prediksi amount atau count |
| Window Size | 2-8 | 4 | Jam historis sebagai input |
| LSTM Units | 8-64 | 32 | Kapasitas memori |
| Epoch | 20-200 | 80 | Lama training |
| Forecast Steps | 1-12 | 6 | Berapa jam ke depan |

---

## 17. Perbandingan Semua Metode

### Klasifikasi Teknik yang Digunakan

| Metode | Kategori | Jenis ML/DL | Library |
|---|---|---|---|
| SAW Ranking | Decision Support | ❌ Bukan ML | Pure Math |
| Analisis Teller | Statistik Deskriptif | ❌ Bukan ML | Pure JS |
| Analisis Pasmar | Statistik Deskriptif | ❌ Bukan ML | Pure JS |
| K-Means | Unsupervised ML | ✅ ML Klasik | Pure JS |
| DBSCAN | Unsupervised ML | ✅ ML Klasik | Pure JS |
| Regresi Linear | Supervised ML | ✅ ML Klasik | Pure JS |
| Regresi Polinomial | Supervised ML | ✅ ML Klasik | Pure JS |
| Isolation Forest | Unsupervised ML | ✅ ML Klasik | Pure JS |
| Autoencoder | Unsupervised DL | ✅ Deep Learning | TensorFlow.js |
| LSTM | Supervised DL | ✅ Deep Learning | TensorFlow.js |

### Kapan Menggunakan Metode Apa?

```
❓ "Siapa BAS/LSR terbaik bulan ini?"
   → SAW Ranking (scoring terbobot)

❓ "Transaksi ini masuk kelompok mana?"
   → K-Means (cluster berdasarkan nilai & waktu)

❓ "Berapa cluster alami dalam data ini?"
   → DBSCAN (otomatis tanpa tentukan K)

❓ "Apakah ada transaksi mencurigakan?"
   → DBSCAN (cepat, noise = anomali)
   → Isolation Forest (lebih robust, ada skor numerik)
   → Autoencoder (paling canggih, tangkap pola non-linear)

❓ "Prediksi nilai transaksi jam berikutnya?"
   → Regresi Linear (sederhana, interpretable)
   → LSTM (akurat untuk pola temporal kompleks)

❓ "Kapan jam tersibuk? Forecast jam besok?"
   → LSTM
```

### Tingkat Kompleksitas

```
Mudah ←───────────────────────────────────────→ Sulit

K-Means → DBSCAN → Regresi → Isolation Forest → Autoencoder → LSTM
  ⭐         ⭐⭐      ⭐⭐⭐         ⭐⭐⭐              ⭐⭐⭐⭐         ⭐⭐⭐⭐⭐
```

### Pipeline Analitik Lengkap

```
DATA TRANSAKSI TELLER (dari Google Sheets via API)
                    │
                    ▼
        ┌───────────────────────┐
        │  Preprocessing        │
        │  • Parse TIME → jam   │
        │  • Normalisasi 0-1    │
        │  • Log transform      │
        └───────────────────────┘
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
     K-Means     DBSCAN   Regresi
   "Kelompok   "Cluster + "Tren per
    transaksi"  anomali"   waktu"
          │         │         │
          └─────────┼─────────┘
                    │
          ┌─────────┼─────────┐
          ▼                   ▼
   Isolation Forest      Autoencoder
   "Anomaly score        "RE-based
    per transaksi"        anomaly"
                    │
                    ▼
                  LSTM
            "Forecast jam
             berikutnya"
                    │
                    ▼
          INSIGHT & LAPORAN
```

---

## 18. Kamus Istilah

| Istilah | Penjelasan |
|---|---|
| **AMOUNT** | Nilai transaksi dalam Rupiah |
| **CR** | Credit — uang masuk ke rekening |
| **DR** | Debit — uang keluar dari rekening |
| **TELLER** | Kode petugas teller (T001, T002, dst) |
| **TRAN_CODE** | Kode jenis transaksi (TRF=Transfer, WD=Withdrawal, dll) |
| **SYS** | Sistem pemrosesan (BOR, dll) |
| **BAS** | Basic Agency Staff — agen penjual asuransi |
| **LSR** | Life Sales Representative — supervisor agen |
| **Cluster** | Kelompok data yang mirip satu sama lain |
| **Centroid** | Titik pusat sebuah cluster di K-Means |
| **Epsilon (ε)** | Radius pencarian tetangga di DBSCAN |
| **Noise** | Titik yang tidak masuk cluster manapun di DBSCAN — anomali |
| **Normalisasi** | Mengubah nilai ke skala 0-1 agar algoritma adil |
| **Epoch** | Satu putaran penuh training data di neural network |
| **Loss** | Ukuran kesalahan prediksi model (makin kecil makin baik) |
| **Overfitting** | Model hafal data training tapi gagal di data baru |
| **Anomaly Score** | Skor 0-1 seberapa "tidak normal" suatu transaksi |
| **Reconstruction Error** | Seberapa berbeda output autoencoder vs inputnya |
| **Bottleneck** | Layer paling sempit di autoencoder — representasi inti |
| **Latent Space** | Dimensi tersembunyi di dalam encoder |
| **Sliding Window** | Teknik memotong deret waktu menjadi input-output pair |
| **MAPE** | Mean Absolute Percentage Error — error dalam persen |
| **MAE** | Mean Absolute Error — rata-rata selisih absolut |
| **RMSE** | Root Mean Squared Error — sensitif terhadap error besar |
| **R²** | Koefisien determinasi — seberapa baik model fit data |
| **WCSS** | Within-Cluster Sum of Squares — ukuran kekompakan cluster |
| **OLS** | Ordinary Least Squares — metode estimasi regresi |
| **Path Length** | Berapa split dibutuhkan untuk mengisolasi 1 titik di Isolation Forest |
| **Session** | Data login tersimpan di localStorage dengan batas waktu |
| **SAW** | Simple Additive Weighting — metode peringkat multi-kriteria |
| **MCDM** | Multi-Criteria Decision Making — pengambilan keputusan multi-kriteria |

---

## 📚 Referensi Akademik

| Algoritma | Referensi |
|---|---|
| K-Means | MacQueen (1967). *Some methods for classification and analysis of multivariate observations* |
| K-Means++ | Arthur & Vassilvitskii (2007). *k-means++: The Advantages of Careful Seeding* |
| DBSCAN | Ester et al. (1996). *A Density-Based Algorithm for Discovering Clusters* |
| Linear Regression | Gauss (1809). *Theoria motus corporum coelestium* |
| Isolation Forest | Liu et al. (2008). *Isolation Forest* |
| Autoencoder | Rumelhart et al. (1986). *Learning representations by back-propagating errors* |
| LSTM | Hochreiter & Schmidhuber (1997). *Long Short-Term Memory* |
| SAW | Fishburn (1967). *Additive Utilities with Incomplete Product Sets* |

---

*Dokumen ini merangkum project ML/DL Dashboard Transaksi Teller & Produksi BNI Life Insurance.*

*Stack: React · Recharts · TensorFlow.js · Google Apps Script · Google Sheets*

*© 2025 BNI Life Insurance — Internal Use Only*