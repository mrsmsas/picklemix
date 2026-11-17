# Sandaran (backup) PickleMix

- `v1-sebelum-kumpulan-rank/` — versi sebelum format **Mix Seeded** dan mod **Beregu Kumpulan Rank** (commit 67c6fc7, sw cache `picklemix-v4`).
- `v2-kumpulan-rank/` — versi dengan Mix Seeded + Beregu Kumpulan Rank, sebelum butang Ubah & tab Jadual (commit a440711, sw cache `picklemix-v6`).
- `v3-ubah-jadual/` — versi dengan butang Ubah & tab Jadual, sebelum format Putaran Seed (commit c224eef, sw cache `picklemix-v7`).
- `v4-putaran-seed/` — versi dengan format Putaran Seed, sebelum medan Tarikh & Tempat (commit d0d33b3, sw cache `picklemix-v8`).

## Cara kembali ke versi lama
Salin semula dua fail (daripada folder versi yang dikehendaki) ke akar repo, kemudian commit & push:

    cp sandaran/v2-kumpulan-rank/index.html index.html
    cp sandaran/v2-kumpulan-rank/sw.js sw.js

Atau guna commit lama: `git checkout 67c6fc7 -- index.html sw.js` (v1) atau `git checkout a440711 -- index.html sw.js` (v2) atau `git checkout c224eef -- index.html sw.js` (v3) atau `git checkout d0d33b3 -- index.html sw.js` (v4)

Nota: selepas kembali, naikkan nombor cache dalam `sw.js` (mesti lebih tinggi daripada cache yang sedang aktif, kini `picklemix-v9`, cth. `picklemix-v10`) supaya pelayar/PWA mengambil versi terbaharu.

## v5-tarikh-tempat
Kod sebelum fungsi "Pautan ahli (baca sahaja)" (commit 8597e2e). Pulihkan: `git checkout 8597e2e -- index.html sw.js` (naikkan nama cache dalam `sw.js`).

## v6-pautan-baca-sahaja
Kod sebelum segerak langsung GAS (commit 7a964c7). Pulihkan: `git checkout 7a964c7 -- index.html sw.js` (naikkan nama cache dalam `sw.js`).

## v7-segerak-gas
Kod sebelum Putaran Seed menyokong gelanggang kurang (commit 9e63a39). Pulihkan: `git checkout 9e63a39 -- index.html sw.js` (naikkan cache dalam sw.js).
