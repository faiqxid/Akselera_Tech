# Akselera.Tech - Internal Chat Web App

Aplikasi Web Chat Internal 1-on-1 dengan identitas brand **Akselera.Tech**, dibangun sebagai fondasi sistem CRM terintegrasi.

---

## 🚀 Live Demo & Repository
* **URL Aplikasi (Production):** `https://akselera-tech-chat.vercel.app` *(atau URL Vercel hasil deployment Anda)*
* **Repository GitHub:** `https://github.com/<username>/<repo-name>`
* **Collaborator:** `tec.akselera@gmail.com` *(sudah ditambahkan)*

---

## 👥 Akun Sampel untuk Pengujian
Gunakan 2 akun berikut untuk menguji percakapan 1-on-1 secara langsung:

| No | Nama Akun | Email | Password |
|:---|:---|:---|:---|
| 1 | **Andi Pratama** | `andi@contoh.id` | `password123` |
| 2 | **Rina Kartika** | `rina@contoh.id` | `password123` |

---

## 🛠️ Tech Stack & Alasan Pemilihan Infrastruktur

| Komponen | Teknologi | Alasan Pemilihan |
|:---|:---|:---|
| **Frontend Framework** | **Next.js 14 (App Router & TypeScript)** | Sesuai instruksi teknis wajib. Mendukung Server-Side Rendering (SSR) untuk proteksi middleware yang aman, performa optimal, dan routing yang modular. |
| **Styling & UI** | **Tailwind CSS + next-themes** | Memudahkan styling monokrom presisi, bebas flicker saat pergantian tema, serta mendukung responsivitas mobile. |
| **Tipografi & Brand** | **Google Fonts (Nunito)** | Sesuai ketentuan brand Akselera.Tech dengan dynamic logo switcher (Light: Logo Hitam, Dark: Logo Putih). |
| **Backend & Database** | **Supabase (Managed PostgreSQL)** | Menyediakan native **Row Level Security (RLS)** untuk proteksi isolasi data chat di level database (Fitur Wajib #5), autentikasi terkelola, dan paket gratis yang optimal. |
| **Realtime Engine** | **Supabase Realtime (PostgreSQL Changes via WebSocket)** | Memungkinkan pesan masuk tampil instan tanpa perlu refresh halaman (Fitur Bonus). |
| **Hosting & Deployment**| **Vercel** | Platform native untuk Next.js dengan continuous deployment otomatis dari GitHub, SSL/HTTPS gratis, edge network cepat, dan zero maintenance cost. |

---

## 🔒 Keamanan Akses Data & Penanganan Secret

1. **Row Level Security (RLS) Ketat (Fitur Wajib #5):**
   * Seluruh tabel (`profiles`, `conversations`, `conversation_participants`, `messages`) dilindungi kebijakan RLS PostgreSQL.
   * Menggunakan PostgreSQL *Security Definer Function* `is_participant(conv_id uuid)` untuk memverifikasi apakah akun yang sedang login merupakan anggota percakapan sah.
   * User dilarang keras membaca atau menyisipkan pesan di luar ruang chat miliknya sendiri, bahkan jika mencoba memotong akses langsung melalui Supabase Client / API.
2. **Penanganan Secret:**
   * Tidak ada `SERVICE_ROLE_KEY` atau password database yang diekspos ke client bundle.
   * Variabel lingkungan publik hanya memuat `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` yang seluruh operasinya dibatasi oleh RLS.
   * File `.env.local` dikecualikan dari Git repository via `.gitignore`.

---

## 🗄️ Struktur Tabel Database

```sql
-- 1. Profiles (Metadata publik user)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  created_at timestamptz default now() not null
);

-- 2. Conversations (Sesi 1-on-1)
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. Conversation Participants (Junction Table)
create table public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  last_read_at timestamptz default now() not null,
  primary key (conversation_id, user_id)
);

-- 4. Messages (Pesan chat)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  content text not null check (trim(content) <> ''),
  created_at timestamptz default now() not null
);
```

Skema lengkap beserta Trigger dan RLS Policies tersedia di file `supabase/schema.sql`.

---

## 💻 Cara Menjalankan Secara Lokal

### 1. Clone Repository & Install Dependensi
```bash
git clone https://github.com/<username>/<repo-name>.git
cd <repo-name>
npm install
```

### 2. Setup Environment Variables
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```
Isi konfigurasi dengan project Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Setup Skema Database Supabase
1. Buka dashboard [Supabase](https://supabase.com) project Anda.
2. Masuk ke menu **SQL Editor**.
3. Buka file `supabase/schema.sql` di repository ini, salin seluruh isinya, tempel ke SQL Editor, lalu klik **Run**.

### 4. Jalankan Server Development
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 🤖 Penggunaan AI Coding Tools
* **AI Tool:** Hermes Agent (Nous Research) dengan model Coding Agent & MCP Context7 Documentation.
* **Cakupan Penggunaan:** Penyusunan arsitektur project Next.js 14 App Router, konfigurasi Supabase SSR & RLS policies, penerapan styling Tailwind CSS sesuai mockup visual dan brand guide Akselera.Tech.

---

## 📌 Status Fitur & Hal yang Belum Selesai

### Fitur Wajib (100% Selesai):
- [x] Login dan logout akun dengan validasi error.
- [x] Proteksi rute (halaman chat terproteksi tanpa login).
- [x] Add new chat 1-on-1 dengan filter user terdaftar.
- [x] Kirim dan terima pesan teks persisten di PostgreSQL.
- [x] Daftar chat menampilkan avatar, nama lawan bicara, cuplikan pesan terakhir, dan waktu.
- [x] Isolasi keamanan data di level database dengan Row Level Security (RLS).
- [x] Light mode dan Dark mode switchable di seluruh layar dan persisten.
- [x] Brand Akselera.Tech dengan font Nunito dan switcher logo dinamis.

### Fitur Bonus (100% Selesai):
- [x] Pesan masuk realtime via Supabase WebSocket tanpa refresh halaman.
- [x] Unread message counter badge & auto-sorting chat ke paling atas (WhatsApp style).
- [x] Kirim foto / lampiran file dokumen (image preview lightbox, download file) via Supabase Storage.
- [x] Tarik Pesan (Unsend / Delete for Everyone) dengan indikator realtime `🚫 Pesan ini telah ditarik`.
- [x] Hapus Chat (Delete Conversation) dengan modal konfirmasi dan penghapusan relasi cascade.
- [x] Registrasi akun baru secara mandiri (`/register`).
- [x] Fitur pencarian percakapan pada sidebar.
- [x] Tampilan responsive untuk perangkat layar ponsel (mobile view).

### Hal yang Belum Selesai:
- *Tidak ada (seluruh fitur wajib dan fitur bonus telah diselesaikan secara lengkap).*
