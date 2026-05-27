# Hatta AI — Trading Assistant 🤖📈

AI Trading Assistant yang dilatih dengan sistem trading peribadi Hatta.
Boleh analisa chart, jawab soalan tentang setup, dan guide berdasarkan sistem 3M.

## Features
- 🤖 Chat dengan AI yang faham sistem Hatta (3M, Sepit/Pagar, Fibonacci, dll)
- 📸 Upload chart screenshot untuk analisa terus
- 📚 Knowledge base dari nota Hatta
- 💬 Streaming response

---

## Setup (Untuk Developer)

### 1. Clone repo
```bash
git clone https://github.com/zico3112/atta-forex-ai.git
cd atta-forex-ai
npm install
```

### 2. Isi environment variables
Buat file `.env.local` dalam root folder:
```
NEXT_PUBLIC_SUPABASE_URL=https://lpjtqzisjhnfvtgttocq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dapatkan dari Zico>
SUPABASE_SERVICE_ROLE_KEY=<dapatkan dari Zico>
ANTHROPIC_API_KEY=<dapatkan dari Zico>
```

### 3. Run
```bash
npm run dev
```
Buka `http://localhost:3000`

---

## Cara Tambah Knowledge Baru

Semua knowledge Hatta ada dalam folder `/knowledge-base/`.
Setiap file adalah satu topik dalam format Markdown.

Untuk tambah nota baru:
1. Buat file baru dalam `/knowledge-base/` (contoh: `13-nama-topik.md`)
2. Tulis dalam format yang sama
3. Commit dan push

---

## Tech Stack
- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS
- **AI:** Claude claude-sonnet-4-6 (Anthropic)
- **Database:** Supabase (PostgreSQL + pgvector)
- **Deploy:** Vercel
