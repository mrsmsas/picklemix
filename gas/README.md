# Setup backend skor langsung (Google Apps Script + Sheets)

1. Cipta Google Sheet baharu (nama: PickleMix Data). Extensions → Apps Script.
2. Tampal kandungan `Code.gs` (ganti kod asal) → Save.
3. Google Cloud Console (https://console.cloud.google.com) → pilih/cipta projek → APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.
   - Authorized JavaScript origins: `https://mrsmsas.github.io`
   - Salin **Client ID**. (Jika diminta, set OAuth consent screen = External, tambah e-mel anda sebagai test user.)
4. Apps Script → Project Settings → Script properties → tambah:
   - `CLIENT_ID` = Client ID tadi
   - (`ADMINS` tidak lagi diperlukan — sesiapa yang berdaftar boleh jadi host. `SECRET` dijana automatik.)
5. Deploy → New deployment → Web app → Execute as: **Me**, Who has access: **Anyone** → Deploy → benarkan kebenaran → salin **Web app URL** (berakhir `/exec`).
6. Sekali sahaja: dalam Apps Script pilih fungsi `resetSesiLama` → Run (memadam sesi terbit lama; senarai Ahli kekal).
7. Dalam PickleMix: Laman utama → daftar/log masuk Google + pilih nickname (kekal pada peranti).
   - **Host**: buka sesi → tab Ahli → kad sesi langsung → Terbitkan (tetapkan PIN) → Kongsi Kod + PIN.
   - **Ahli**: Laman utama → Sertai sesi → masukkan Kod + PIN (atau buka pautan `#s=KOD`). Ahli kekal sehingga host padam.

Jika kod `Code.gs` diubah kemudian: Deploy → Manage deployments → Edit → New version.
