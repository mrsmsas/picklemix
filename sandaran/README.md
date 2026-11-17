# Sandaran (backup) PickleMix

- `v1-sebelum-kumpulan-rank/` — versi sebelum format **Mix Seeded** dan mod **Beregu Kumpulan Rank** (commit 67c6fc7, sw cache `picklemix-v4`).

## Cara kembali ke versi lama
Salin semula dua fail ke akar repo, kemudian commit & push:

    cp sandaran/v1-sebelum-kumpulan-rank/index.html index.html
    cp sandaran/v1-sebelum-kumpulan-rank/sw.js sw.js

Atau guna commit lama: `git checkout 67c6fc7 -- index.html sw.js`

Nota: selepas kembali, naikkan nombor cache dalam `sw.js` (cth. `picklemix-v7`) supaya pelayar/PWA mengambil versi terbaharu.
