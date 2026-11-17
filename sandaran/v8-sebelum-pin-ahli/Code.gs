/**
 * PickleMix — Backend skor langsung (Google Apps Script + Google Sheets)
 * Sheet 'Sesi': id | hashKunciHost | dikemaskini | nama | json (dipecah ke lajur 5..14)
 *
 * Script Properties (Project Settings > Script properties):
 *   CLIENT_ID = <OAuth Client ID Google anda>.apps.googleusercontent.com
 *   ADMINS    = emel1@gmail.com,emel2@gmail.com   (senarai host yang dibenarkan)
 */
const SHEET = 'Sesi', CHUNK = 45000, MAXCH = 10;

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(SHEET);
  if (!s) { s = ss.insertSheet(SHEET); s.appendRow(['id', 'hashKunci', 'dikemaskini', 'nama', 'json']); }
  return s;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function sha_(t) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t)); }
function findRow_(s, id) {
  const n = s.getLastRow(); if (n < 2) return 0;
  const ids = s.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}
const okId_ = id => typeof id === 'string' && /^[a-z0-9]{6,20}$/.test(id);

function doGet(e) {
  const p = e.parameter || {}, id = p.id;
  if (!okId_(id)) return out_({ok: false, err: 'id'});
  const cache = CacheService.getScriptCache(), ck = 'd_' + id;
  let hit = cache.get(ck);
  let rec;
  if (hit) rec = JSON.parse(hit);
  else {
    const s = sheet_(), r = findRow_(s, id);
    if (!r) return out_({ok: false, err: 'tiada'});
    const row = s.getRange(r, 1, 1, 4 + MAXCH).getValues()[0];
    rec = {ts: Number(row[2]) || 0, data: row.slice(4).join('')};
    const str = JSON.stringify(rec);
    if (str.length < 90000) cache.put(ck, str, 10);
  }
  if (!rec.data) return out_({ok: false, err: 'tiada'});
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
  const admins = String(props.getProperty('ADMINS') || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
  if (admins.indexOf(String(t.email).toLowerCase()) < 0) throw new Error('Akaun ' + t.email + ' bukan host yang dibenarkan');
  return t.email;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const b = JSON.parse(e.postData.contents), id = b.id;
    if (!okId_(id)) throw new Error('id tidak sah');
    const s = sheet_(); let r = findRow_(s, id);
    const cache = CacheService.getScriptCache();

    if (b.action === 'claim') {                    // log masuk Google -> dapat kunci host
      const email = verifyGoogle_(b.idToken);
      const key = Utilities.getUuid() + Utilities.getUuid();
      if (!r) { s.appendRow([id, sha_(key), Date.now(), '', '']); }
      else s.getRange(r, 2).setValue(sha_(key));
      cache.remove('d_' + id);
      return out_({ok: true, key: key, email: email});
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
    if (b.action === 'delete') { s.deleteRow(r); cache.remove('d_' + id); return out_({ok: true}); }
    throw new Error('tindakan tidak dikenali');
  } catch (err) {
    return out_({ok: false, err: String(err.message || err)});
  } finally { try { lock.releaseLock(); } catch (x) {} }
}
