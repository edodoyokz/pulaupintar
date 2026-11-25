# Pulaupintar

Aplikasi tutor belajar interaktif untuk anak usia 4–7 tahun. Tutor "Kak Pinta" berbicara, mengajar, dan mendengarkan jawaban anak untuk tiga pelajaran: Berhitung, Membaca, dan Bahasa Inggris.

Spesifikasi produk dan kurikulum: lihat dokumen "Pulaupintar — Spesifikasi Tutor & Kurikulum".

## Struktur

| Folder | Isi |
| --- | --- |
| `app/` | Aplikasi HP (Expo SDK 58, Expo Router, TypeScript) |
| `backend/` | Cloudflare Worker (Hono) yang menyimpan API key dan memanggil LLM (default GPT-5 Nano lewat Pollinations; bisa juga Sumopod atau Claude; opsional model kedua untuk cek keamanan, mis. jev-1.14.0), text-to-speech, dan speech-to-text |

Alur satu giliran: tutor berbicara (LLM → filter keamanan → TTS), anak menekan mikrofon dan menjawab (rekam → STT), lalu aplikasi menilai jawaban dari kunci jawaban (bukan LLM) dan meminta tutor memuji, memberi petunjuk, atau menunjukkan jawaban.

## Menjalankan backend

```bash
cd backend
npm install
cp .dev.vars.example .dev.vars   # isi POLLINATIONS_API_KEY, GOOGLE_CLOUD_API_KEY, APP_TOKEN
npm run dev                      # http://localhost:8787
npm test
```

- `GOOGLE_CLOUD_API_KEY` perlu mengaktifkan Cloud Text-to-Speech API dan Cloud Speech-to-Text API.
- `APP_TOKEN` adalah kata sandi bersama antara aplikasi dan backend, supaya orang lain tidak bisa memakai API key.
- Deploy: `npx wrangler secret put POLLINATIONS_API_KEY` (dan seterusnya), lalu `npm run deploy`.
- Setiap panggilan AI mencatat log `{"event":"cost", ...}` untuk menghitung biaya per sesi (dasar harga langganan nanti).

## Menjalankan aplikasi

```bash
cd app
npm install
cp .env.example .env    # isi EXPO_PUBLIC_API_URL dan EXPO_PUBLIC_APP_TOKEN
npx expo start
npm test        # kurikulum, penilaian jawaban, dan progres level
```

Mikrofon dan pemutar audio memakai `expo-audio`, jadi coba di HP Android dengan Expo Go atau development build (`npx expo run:android`). Jika suara cloud gagal, tutor otomatis memakai suara bawaan HP.
