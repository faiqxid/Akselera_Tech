# Akselera.Tech - Internal Chat Web App

Aplikasi Web Chat Internal 1-on-1 dengan identitas brand **Akselera.Tech**, dibangun sebagai fondasi sistem CRM terintegrasi yang aman, cepat, dan responsif.

---

## 👥 Akun Demo untuk Pengujian
Gunakan 2 akun berikut untuk menguji percakapan 1-on-1 secara langsung:

| Nama Pengguna | Email | Password | Role / Keterangan |
|:---|:---|:---|:---|
| **Andi Pratama** | `andi@contoh.id` | `password123` | User Akun 1 |
| **Rina Kartika** | `rina@contoh.id` | `password123` | User Akun 2 |

---

## 1. 🛠️ Stack & Infrastruktur yang Digunakan Beserta Alasan Pemilihannya

### 📊 Ringkasan Tabel Infrastruktur & Stack:

| Komponen / Lapisan | Teknologi | Alasan Utama Pemilihan |
|:---|:---|:---|
| **Frontend Framework** | **Next.js 14 (App Router & TypeScript)** | Server-Side Rendering (SSR) & Server Actions untuk proteksi rute middleware instan, type safety penuh, dan optimasi performa Edge. |
| **Backend & Database** | **Supabase (Managed PostgreSQL)** | Isolasi data ketat via Row Level Security (RLS) pada database engine, auth terkelola, storage bucket file, dan WebSocket Realtime. |
| **Hosting & Deployment** | **Vercel** | Edge Network global, zero-config Next.js 14 deployment, CI/CD otomatis, SSL/HTTPS instan, dan gratis (Hobby tier). |
| **Styling & Theming** | **Tailwind CSS + next-themes** | Pengaturan warna monokrom Akselera.Tech presisi, responsif mobile, dan toggle Dark/Light mode tanpa *hydration mismatch*. |
| **Tipografi & Brand** | **Google Fonts (Nunito)** | Kepatuhan 100% pada panduan teknis brand Akselera.Tech dengan dynamic logo switching berbasis CSS murni. |
| **Realtime Engine** | **Supabase Realtime (WebSocket & Presence)** | Broadcast pesan instan dua arah & status online/offline (Presence) tanpa polling HTTP yang boros daya. |
| **Mobile PWA** | **Progressive Web App (Manifest & SW)** | Pengalaman pengguna aplikasi native di Android/iOS/Desktop dengan offline caching aset statis. |

---

### 💡 Rincian Detail Alasan Pemilihan Infrastruktur:

 Sesuai ketentuan teknis rekrutmen Akselera.Tech, berikut adalah rasionalisasi mendalam mengenai pemilihan infrastruktur yang digunakan:

1. **Mengapa Memilih Supabase sebagai Database & Backend Infrastructure?**
   * **Row Level Security (RLS) Native:** Persyaratan wajib nomor 5 menuntut isolasi data di mana *satu akun hanya bisa membaca percakapan miliknya sendiri*, bahkan bila diakses langsung lewat PostgREST API / Database. Supabase menyediakan RLS berbasis PostgreSQL Security Definer (`is_participant()`) yang menegakkan aturan ini secara mutlak pada level engine database.
   * **Realtime Broadcast & Presence Out-of-the-Box:** Supabase Realtime memanfaatkan fitur PostgreSQL Logical Replication & WebSockets. Ini memungkinkan pengiriman pesan instan dan status online (`presence`) secara dua arah tanpa perlu membangun server WebSocket terpisah (seperti Socket.io).
   * **PostgreSQL Storage Bucket:** Memudahkan pengelolaan lampiran file/gambar (maks 10MB) dengan integrasi kebijakan RLS yang sama dengan database.
   * **Optimasi Gratisan:** Memanfaatkan Supabase Free Tier secara optimal tanpa biaya operasional.

2. **Mengapa Memilih Vercel sebagai Hosting Platform?**
   * **Integrasi Native Next.js:** Vercel adalah pembuat Next.js, sehingga mendukung fitur Next.js 14 App Router, Server Actions, dan Middleware Route Guard secara sempurna tanpa konfigurasi manual (*zero-config*).
   * **Global Edge Network & Latensi Rendah:** Memastikan aplikasi dapat diakses publik dengan kecepatan tinggi, SSL/HTTPS otomatis, dan CI/CD seamless setiap kali ada `git push`.
   * **Optimasi Gratisan:** Menggunakan Vercel Hobby Free Tier yang tetap aktif 24/7 dan memenuhi syarat pengujian rekrutmen (>7 hari).

3. **Mengapa Memilih Next.js 14 (App Router) sebagai Frontend Framework?**
   * **Keamanan Route Guard via Middleware:** Memungkinkan pengecekan sesi autentikasi pengguna langsung di server Edge sebelum halaman di-render, mencegah kebocoran tampilan (*unauthorized flash*).
   * **Type Safety & Reliability:** TypeScript menjamin integritas tipe data antara Supabase client dan komponen UI, mencegah *runtime errors*.

---
---

## 2. 💻 Cara Menjalankan Aplikasi Secara Lokal

### Prasyarat:
* Node.js v18+ (direkomendasikan v20+)
* npm atau yarn / pnpm

### Langkah Instalasi:

1. **Clone Repository & Masuk ke Direktori:**
   ```bash
   git clone https://github.com/<username>/<repo-name>.git
   cd Akselera_Tech
   ```

2. **Install Dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables:**
   Salin berkas `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Buka `.env.local` dan masukkan kredensial project Supabase Anda:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Setup Database Supabase:**
   * Masuk ke dashboard project [Supabase](https://supabase.com).
   * Buka menu **SQL Editor**.
   * Buka file `supabase/schema.sql` pada repository ini, salin seluruh kodenya, tempel ke SQL Editor Supabase, lalu klik tombol **Run**.
   * *(Opsional)* Jika ingin membuat user demo otomatis, jalankan juga script pada `supabase/seed.sql`.

5. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000).

---

## 3. 🗄️ Struktur Tabel Database

Database PostgreSQL pada Supabase dirancang menggunakan 4 tabel inti yang saling berelasi dan diproteksi penuh oleh Row Level Security (RLS):

```sql
-- 1. Profiles (Metadata publik akun pengguna)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  created_at timestamptz default now() not null
);

-- 2. Conversations (Entitas ruang percakapan 1-on-1)
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. Conversation Participants (Junction table peserta percakapan)
create table public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  last_read_at timestamptz default now() not null,
  cleared_at timestamptz default null,  -- Stempel waktu untuk fitur Hapus Chat (Delete for Me)
  primary key (conversation_id, user_id)
);

-- 4. Messages (Penyimpanan pesan, attachment, dan status penarikan)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  content text not null check (trim(content) <> '' or file_url is not null or is_deleted = true),
  file_url text default null,           -- URL publik file di bucket Supabase Storage
  file_type text default null,          -- Tipe MIME ('image' atau 'file')
  file_name text default null,          -- Nama asli file lampiran
  is_deleted boolean default false,     -- Status Tarik Pesan (Unsend for Everyone)
  created_at timestamptz default now() not null
);
```

### Keamanan Akses (Row Level Security):
* **Fungsi Security Definer `is_participant(conv_id uuid)`:** Menjamin query hanya mengembalikan baris di mana user yang sedang terautentikasi terdaftar sebagai partisipan sah.
* **Isolasi Pesan:** User sama sekali tidak dapat membaca, mengedit, ataupun menyisipkan pesan ke dalam percakapan milik pengguna lain.

---

## 4. 🤖 AI Tools yang Digunakan

Pengembangan aplikasi ini memanfaatkan bantuan AI tools canggih secara terarah untuk memastikan kualitas kode standar industri:

1. **Hermes Agent (Nous Research):**
   * Digunakan sebagai *autonomous coding agent* untuk scaffolding struktur direktori, penulisan modular Next.js App Router, implementasi hooks realtime, dan integrasi skema database PostgreSQL.
2. **Context7 MCP (Model Context Protocol):**
   * Digunakan untuk meng-query dokumentasi resmi dan termutakhir secara real-time terkait Supabase SSR client (`@supabase/ssr`), Next.js 14 App Router, dan implementasi Web App Manifest & Service Worker modern.
3. **React Doctor (`npx react-doctor`):**
   * Digunakan untuk melakukan *deep static code audit* (AST-level analysis) pada komponen frontend.
   * Mengaudit potensi *memory leaks*, *hydration mismatches*, kepatuhan aksesibilitas (WAI-ARIA), serta kompleksitas komponen hingga berhasil meraih **Skor Sempurna 100 / 100 (Great, 0 Issues)**.

---

## 5. 📌 Hal atau Fitur yang Masih Belum Selesai (Future Enhancements)

Meskipun seluruh persyaratan teknis wajib dan fitur bonus telah selesai diimplementasikan 100%, berikut adalah daftar *enhancements* terencana untuk pengembangan fase selanjutnya:

1. **End-to-End Encryption (E2EE):**
   * Saat ini enkripsi data telah aktif pada level transit (HTTPS/WSS) dan rest (PostgreSQL TDE). Implementasi E2EE berbasis Signal Protocol (Web Crypto API) dapat ditambahkan untuk enkripsi konten pesan langsung dari perangkat pengguna sebelum masuk ke database server.
2. **Native Web Push Notifications:**
   * Saat ini notifikasi pesan masuk dan unread badge bekerja secara *real-time in-app* via WebSocket. Penambahan integrasi Web Push API (VAPID) akan memungkinkan pengiriman notifikasi sistem operasi saat browser atau aplikasi PWA tertutup sepenuhnya.
3. **Group Chat / Multi-User Rooms:**
   * Arsitektur database `conversations` dan `conversation_participants` sudah mendukung relasi *many-to-many*. Namun, antarmuka saat ini dikhususkan secara optimal untuk interaksi 1-on-1 internal CRM. Fitur pembuatan grup multi-pengguna dapat diaktifkan pada pengembangan lanjutan.
4. **Voice Note / Audio Recorder:**
   * Menambahkan perekam audio interaktif langsung di antarmuka chat untuk mengirimkan pesan suara ke bucket storage.

