/**
 * PickleMix — Backend skor langsung (Google Apps Script + Google Sheets)
 * Sheet 'Ahli'  : emel | nickname | dibuat                       (semua pengguna berdaftar)
 * Sheet 'Sesi'  : id | hashKunciHost | dikemaskini | nama | json (lajur 5..14) | hashPin (15) | emelHost (16)
 * Sheet 'Sertai': idSesi | emel | nickname | tarikh                (ahli yang sudah sertai guna Kod + PIN)
 *
 * Aliran: daftar / log masuk Google (+ nickname) -> token ahli kekal pada peranti.
 *   Host : claim (Kod sesi + PIN) -> push data.   Ahli: join (Kod + PIN) -> get (baca sahaja).
 *
 * Script Properties (Project Settings > Script properties):
 *   CLIENT_ID = <OAuth Client ID Google anda>.apps.googleusercontent.com
 *   (SECRET dijana automatik. ADMINS tidak lagi diperlukan — sesiapa yang berdaftar boleh jadi host.)
 */
const SHEET = 'Sesi', MEMBERS = 'Ahli', JOINS = 'Sertai', CHUNK = 45000, MAXCH = 10;
const PINC = 15, HOSTC = 16, MAXTRY = 5, MAXTRY_ALL = 20;

function tab_(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); s.appendRow(header); }
  return s;
}
function sheet_() { return tab_(SHEET, ['id', 'hashKunci', 'dikemaskini', 'nama', 'json']); }
function members_() { return tab_(MEMBERS, ['emel', 'nickname', 'dibuat']); }
function joins_() { return tab_(JOINS, ['idSesi', 'emel', 'nickname', 'tarikh']); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sha_(t) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t)); }
function findRow_(s, id) {
  const n = s.getLastRow(); if (n < 2) return 0;
  const ids = s.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}
const okId_ = id => typeof id === 'string' && /^[a-z0-9]{6,20}$/.test(id);
const okPin_ = p => typeof p === 'string' && /^[A-Za-z0-9]{4,8}$/.test(p);
const pinHash_ = (id, pin) => sha_(id + ':' + String(pin).toUpperCase());

/* ---------- Token ahli (kekal; ditandatangani HMAC) ---------- */
function secret_() {
  const pr = PropertiesService.getScriptProperties();
  let k = pr.getProperty('SECRET');
  if (!k) { k = Utilities.getUuid() + Utilities.getUuid(); pr.setProperty('SECRET', k); }
  return k;
}
function sign_(t) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(t, secret_())); }
function mkTok_(email) { const e = Utilities.base64EncodeWebSafe(email); return e + '.' + sign_(e); }
function verifyTok_(tok) {
  const p = String(tok || '').split('.');
  if (p.length !== 2 || sign_(p[0]) !== p[1]) throw new Error('login');
  const email = Utilities.newBlob(Utilities.base64DecodeWebSafe(p[0])).getDataAsString().toLowerCase();
  if (!memberRow_(email)) throw new Error('login');
  return email;
}
function memberRow_(email) {
  const s = members_(), n = s.getLastRow(); if (n < 2) return 0;
  const v = s.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < v.length; i++) if (String(v[i][0]).toLowerCase() === email) return i + 2;
  return 0;
}
function nickOf_(email) { const r = memberRow_(email); return r ? String(members_().getRange(r, 2).getValue()) : ''; }
const cleanNick_ = n => String(n || '').replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);

/* ---------- Akses sesi ---------- */
function isJoined_(id, email, cache) {
  const ck = 'm_' + id + '_' + email.slice(0, 200);
  if (cache.get(ck)) return true;
  const s = joins_(), n = s.getLastRow(); if (n < 2) return false;
  const v = s.getRange(2, 1, n - 1, 2).getValues();
  for (let i = 0; i < v.length; i++)
    if (String(v[i][0]) === id && String(v[i][1]).toLowerCase() === email) { cache.put(ck, '1', 300); return true; }
  return false;
}

function doGet(e) {
  const p = e.parameter || {}, id = p.id;
  if (!okId_(id)) return out_({ok: false, err: 'id'});
  let email; try { email = verifyTok_(p.t); } catch (x) { return out_({ok: false, err: 'login'}); }
  const cache = CacheService.getScriptCache(), ck = 'd_' + id;
  let hit = cache.get(ck);
  let rec;
  if (hit) rec = JSON.parse(hit);
  else {
    const s = sheet_(), r = findRow_(s, id);
    if (!r) return out_({ok: false, err: 'tiada'});
    const row = s.getRange(r, 1, 1, HOSTC).getValues()[0];
    rec = {ts: Number(row[2]) || 0, data: row.slice(4, 4 + MAXCH).join(''), host: String(row[HOSTC - 1] || '').toLowerCase()};
    const str = JSON.stringify(rec);
    if (str.length < 90000) cache.put(ck, str, 10);
  }
  if (!rec.data) return out_({ok: false, err: 'tiada'});
  if (rec.host !== email && !isJoined_(id, email, cache)) return out_({ok: false, err: 'akses'});
  if (p.action === 'ver') return out_({ok: true, ts: rec.ts});
  return out_({ok: true, ts: rec.ts, data: JSON.parse(rec.data)});
}

function verifyGoogle_(idToken) {
  const props = PropertiesService.getScriptProperties();
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), {muteHttpExceptions: true});
  if (res.getResponseCode() !== 200) throw new Error('Token Google tidak sah');
  const t = JSON.parse(res.getContentText());
  if (t.aud !== props.getProperty('CLIENT_ID')) throw new Error('Client ID tidak sepadan');
  if (String(t.email_verified) !== 'true') throw new Error('E-mel belum disahkan');
  return {email: String(t.email).toLowerCase(), name: String(t.given_name || t.name || '')};
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const b = JSON.parse(e.postData.contents), cache = CacheService.getScriptCache();

    /* --- Daftar / log masuk (tiada id sesi) --- */
    if (b.action === 'auth') {
      const g = verifyGoogle_(b.idToken), nick = cleanNick_(b.nick);
      let r = memberRow_(g.email);
      if (!r) {
        if (nick.length < 2) return out_({ok: true, need: 'nick', suggest: cleanNick_(g.name)});
        members_().appendRow([g.email, nick, Date.now()]);
      } else if (nick.length >= 2) members_().getRange(r, 2).setValue(nick);
      return out_({ok: true, token: mkTok_(g.email), email: g.email, nick: nickOf_(g.email)});
    }

    const me = verifyTok_(b.token);                 // semua tindakan lain perlu ahli berdaftar
    const nick = nickOf_(me);

    if (b.action === 'mine') {                      // senarai sesi yang saya sertai
      const js = joins_(), jn = js.getLastRow(), ids = [];
      if (jn >= 2) js.getRange(2, 1, jn - 1, 2).getValues().forEach(v => { if (String(v[1]).toLowerCase() === me) ids.push(String(v[0])); });
      const ss = sheet_(), sn = ss.getLastRow(), names = {};
      if (sn >= 2) ss.getRange(2, 1, sn - 1, 4).getValues().forEach(v => { names[String(v[0])] = String(v[3] || ''); });
      return out_({ok: true, list: ids.filter(i => i in names).map(i => ({id: i, nama: names[i]}))});
    }

    const id = b.id;
    if (!okId_(id)) throw new Error('id tidak sah');
    const s = sheet_(); let r = findRow_(s, id);

    if (b.action === 'join') {                      // ahli masukkan Kod + PIN
      const fk = 'f_' + me + '_' + id, gk = 'g_' + me;
      const n1 = Number(cache.get(fk) || 0), n2 = Number(cache.get(gk) || 0);
      if (n1 >= MAXTRY || n2 >= MAXTRY_ALL) throw new Error('Terlalu banyak cubaan. Cuba lagi selepas 15 minit.');
      const ph = r ? String(s.getRange(r, PINC).getValue()) : '';
      if (!r || !ph || ph !== pinHash_(id, b.pin)) {
        cache.put(fk, String(n1 + 1), 900); cache.put(gk, String(n2 + 1), 900);
        throw new Error('Kod atau PIN salah');
      }
      cache.remove(fk);
      if (!isJoined_(id, me, cache)) joins_().appendRow([id, me, nick, Date.now()]);
      cache.put('m_' + id + '_' + me.slice(0, 200), '1', 300);
      return out_({ok: true, id: id, nama: String(s.getRange(r, 4).getValue() || '')});
    }

    if (b.action === 'claim') {                     // host terbitkan sesi (Kod + PIN)
      if (!okPin_(b.pin)) throw new Error('PIN mesti 4–8 huruf/nombor');
      const key = Utilities.getUuid() + Utilities.getUuid();
      if (!r) {
        s.appendRow([id, sha_(key), Date.now(), '', '']);
        r = s.getLastRow();
      } else {
        const h = String(s.getRange(r, HOSTC).getValue() || '').toLowerCase();
        if (h !== me) throw new Error('Kod sesi telah digunakan — cuba lagi');
        s.getRange(r, 2).setValue(sha_(key));
      }
      s.getRange(r, PINC, 1, 2).setValues([[pinHash_(id, b.pin), me]]);
      cache.remove('d_' + id);
      return out_({ok: true, key: key, email: me, nick: nick});
    }

    if (!r) throw new Error('sesi belum didaftar');
    if (sha_(String(b.key || '')) !== String(s.getRange(r, 2).getValue())) throw new Error('kunci host tidak sah');

    if (b.action === 'push') {
      const json = JSON.stringify(b.data);
      if (json.length > CHUNK * MAXCH) throw new Error('data terlalu besar');
      const parts = []; for (let i = 0; i < MAXCH; i++) parts.push(json.slice(i * CHUNK, (i + 1) * CHUNK));
      const ts = Date.now();
      s.getRange(r, 3, 1, 2 + MAXCH).setValues([[ts, String((b.data && b.data.n) || '').slice(0, 80)].concat(parts)]);
      cache.remove('d_' + id);
      return out_({ok: true, ts: ts});
    }
    if (b.action === 'setpin') {                    // tukar PIN (ahli sedia ada kekal)
      if (!okPin_(b.pin)) throw new Error('PIN mesti 4–8 huruf/nombor');
      s.getRange(r, PINC).setValue(pinHash_(id, b.pin));
      return out_({ok: true});
    }
    if (b.action === 'members') {                   // host: senarai nickname ahli
      const js = joins_(), jn = js.getLastRow(), list = [];
      if (jn >= 2) js.getRange(2, 1, jn - 1, 4).getValues().forEach(v => {
        if (String(v[0]) === id) list.push({nick: String(v[2]), at: Number(v[3]) || 0, ref: sha_(id + String(v[1]).toLowerCase()).slice(0, 12)});
      });
      return out_({ok: true, list: list});
    }
    if (b.action === 'kick') {                      // host: padam seorang ahli
      const js = joins_(), jn = js.getLastRow();
      if (jn >= 2) {
        const v = js.getRange(2, 1, jn - 1, 2).getValues();
        for (let i = v.length - 1; i >= 0; i--) {
          const em = String(v[i][1]).toLowerCase();
          if (String(v[i][0]) === id && sha_(id + em).slice(0, 12) === b.ref) { js.deleteRow(i + 2); cache.remove('m_' + id + '_' + em.slice(0, 200)); }
        }
      }
      return out_({ok: true});
    }
    if (b.action === 'delete') {
      const js = joins_(), jn = js.getLastRow();
      if (jn >= 2) {
        const v = js.getRange(2, 1, jn - 1, 2).getValues();
        for (let i = v.length - 1; i >= 0; i--) if (String(v[i][0]) === id) {
          cache.remove('m_' + id + '_' + String(v[i][1]).toLowerCase().slice(0, 200)); js.deleteRow(i + 2);
        }
      }
      s.deleteRow(r); cache.remove('d_' + id);
      return out_({ok: true});
    }
    throw new Error('tindakan tidak dikenali');
  } catch (err) {
    return out_({ok: false, err: String(err.message || err)});
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

/** Jalankan SEKALI secara manual (Run) untuk memadam semua sesi terbit lama dan senarai sertai. Ahli kekal. */
function resetSesiLama() {
  [sheet_(), joins_()].forEach(s => { const n = s.getLastRow(); if (n > 1) s.deleteRows(2, n - 1); });
}
