# Setup backend skor langsung (Google Apps Script + Sheets)

1. Cipta Google Sheet baharu (nama: PickleMix Data). Extensions → Apps Script.
2. Tampal kandungan `Code.gs` (ganti kod asal) → Save.
3. Google Cloud Console (https://console.cloud.google.com) → pilih/cipta projek → APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.
   - Authorized JavaScript origins: `https://mrsmsas.github.io`
   - Salin **Client ID**. (Jika diminta, set OAuth consent screen = External, tambah e-mel anda sebagai test user.)
4. Apps Script → Project Settings → Script properties → tambah:
   - `CLIENT_ID` = Client ID tadi
   - `ADMINS` = e-mel host dipisah koma (cth `akramprog@gmail.com`)
5. Deploy → New deployment → Web app → Execute as: **Me**, Who has access: **Anyone** → Deploy → benarkan kebenaran → salin **Web app URL** (berakhir `/exec`).
6. Dalam PickleMix: buka sesi → tab Ahli → kad "Pautan untuk ahli" → tampal URL & Client ID → Simpan → Terbitkan sesi → log masuk Google → Kongsi pautan langsung.

Jika kod `Code.gs` diubah kemudian: Deploy → Manage deployments → Edit → New version.
