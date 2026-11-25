# Pulaupintar

Aplikasi tutor belajar interaktif untuk anak usia 4–7 tahun. Tutor "Kak Pinta" berbicara, mengajar, dan mendengarkan jawaban anak untuk tiga pelajaran: Berhitung, Membaca, dan Bahasa Inggris.

Spesifikasi produk dan kurikulum: lihat dokumen "Pulaupintar — Spesifikasi Tutor & Kurikulum".

## Struktur

| Folder | Isi |
| --- | --- |
| `app/` | Aplikasi HP (Expo SDK 58, Expo Router, TypeScript) |
| `backend/` | Cloudflare Worker (Hono) yang menyimpan API key dan memanggil LLM (utama Sumopod hy4-flash, cadangan Pollinations; cek keamanan jev-1.14.0 dengan cadangan qwen3guard), text-to-speech, dan speech-to-text |

Alur satu giliran: tutor berbicara (LLM → filter keamanan → TTS), anak menekan mikrofon dan menjawab (rekam → STT), lalu aplikasi menilai jawaban dari kunci jawaban (bukan LLM) dan meminta tutor memuji, memberi petunjuk, atau menunjukkan jawaban.

## Menjalankan backend

```bash
cd backend
npm install
cp .dev.vars.example .dev.vars   # isi GEMINI_API_KEY, APP_TOKEN (SUMOPOD_API_KEY dan POLLINATIONS_API_KEY untuk cadangan)
npm run dev                      # http://localhost:8787
npm test
```

- Suara memakai Gemini: `GEMINI_API_KEY` menulis kalimat, memeriksa keamanan, dan meneruskan suara lewat Worker (`/v1/live/speak` dan `/v1/live/listen`, websocket) ke Gemini Live 3.8 (bicara) dan Gemini 3.5 Transcribe Live (mendengar). Aplikasi tidak memegang kunci atau token Gemini, dan setiap kalimat yang diucapkan melewati pemeriksaan yang sama dengan `/v1/tts`.
- Aplikasi memakai modul audio native (`react-native-audio-api`), jadi butuh development build, bukan Expo Go. Expo sendiri tidak menyediakan pemutaran PCM mentah yang di-stream, makanya library ini dipakai untuk suara dan mikrofon. Tanpa itu (atau dengan `EXPO_PUBLIC_VOICE=rest`) aplikasi memakai `/v1/tts` dan `/v1/stt` yang juga Gemini.
- Untuk kembali ke Google Cloud TTS/STT: set `SPEECH_PROVIDER=google`, isi `GOOGLE_CLOUD_API_KEY` (Cloud Text-to-Speech dan Speech-to-Text API aktif), dan `EXPO_PUBLIC_VOICE=rest` serta `EXPO_PUBLIC_SPEECH=google` di aplikasi (Android lalu merekam AMR-WB, bukan AAC).
- **Penting:** Ketentuan Gemini API melarang aplikasi yang ditujukan atau kemungkinan dipakai anak di bawah 18 tahun, dan di tier gratis data dipakai Google untuk meningkatkan produknya (peninjau manusia bisa membacanya). Pakai kunci dari proyek berbayar, dan periksa ketentuan sebelum dipakai anak lain.
- `APP_TOKEN` adalah kata sandi bersama antara aplikasi dan backend, supaya orang lain tidak bisa memakai API key.
- Deploy: `npx wrangler secret put SUMOPOD_API_KEY` (dan seterusnya), lalu `npm run deploy`.
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
