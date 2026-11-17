# Sandaran (backup) PickleMix

- `v1-sebelum-kumpulan-rank/` — versi sebelum format **Mix Seeded** dan mod **Beregu Kumpulan Rank** (commit 67c6fc7, sw cache `picklemix-v4`).
- `v2-kumpulan-rank/` — versi dengan Mix Seeded + Beregu Kumpulan Rank, sebelum butang Ubah & tab Jadual (commit a440711, sw cache `picklemix-v6`).

## Cara kembali ke versi lama
Salin semula dua fail (daripada folder versi yang dikehendaki) ke akar repo, kemudian commit & push:

    cp sandaran/v2-kumpulan-rank/index.html index.html
    cp sandaran/v2-kumpulan-rank/sw.js sw.js

Atau guna commit lama: `git checkout 67c6fc7 -- index.html sw.js` (v1) atau `git checkout a440711 -- index.html sw.js` (v2)

Nota: selepas kembali, naikkan nombor cache dalam `sw.js` (cth. `picklemix-v7`) supaya pelayar/PWA mengambil versi terbaharu.
