
(() => {
  const plugins = {
    Filesystem: {
      async readFile(o) { const v = await window.__fsRead(o.path); if (v === null) throw new Error('File does not exist.'); return { data: v }; },
      async writeFile(o) { await window.__fsWrite(o.path, o.data, o.encoding || 'base64'); (window.__fsNames = window.__fsNames || new Set()).add(o.path); return { uri: 'file:///fake/' + o.path }; },
      async readdir() { return { files: [...(window.__fsNames || [])].map((name) => ({ name })) }; },
      async deleteFile(o) { (window.__fsNames || new Set()).delete(o.path); },
      async rmdir() {},
    },
    Share: {
      async share(o) { (window.__shared = window.__shared || []).push(o); if (window.__shareCancel) throw new Error('Share canceled'); return { activityType: 'x' }; },
    },
    StatusBar: { async setStyle(o) { (window.__status = window.__status || []).push(o.style); } },
    // A fake iCloud: backups live in window.__cloudStore. Tests steer it with __cloudStatus,
    // __cloudFailWrite ('noSpace' | 'failed') and __cloudUploaded (false = saved here only).
    SpreadCloud: {
      async status() {
        const store = (window.__cloudStore = window.__cloudStore || []);
        const regular = store.filter((b) => !b.pin);
        const last = regular[regular.length - 1];
        const base = { deviceId: (sessionStorage.getItem('fakeDevice') || (sessionStorage.setItem('fakeDevice', 'DEV-' + Math.random().toString(16).slice(2, 10).padEnd(8, '0')), sessionStorage.getItem('fakeDevice'))), cloudKit: 'available', driveAvailable: true, backupCount: store.length };
        if (last) Object.assign(base, { lastBackupAt: new Date(last.at).toISOString(), lastBackupUploaded: window.__cloudUploaded !== false });
        return Object.assign(base, window.__cloudStatus || {});
      },
      async backupWrite(o) {
        const store = (window.__cloudStore = window.__cloudStore || []);
        if (window.__cloudFailWrite) { const e = new Error('write failed'); e.code = window.__cloudFailWrite; throw e; }
        const at = Date.now();
        const name = String(at) + (o.pin ? '.' + o.pin : '') + '.spreadbackup';
        store.push({ name, text: o.text, pin: o.pin, at });
        return { name, bytes: o.text.length, createdAt: new Date(at).toISOString(), verified: true, inICloudContainer: true };
      },
      async backupList() {
        const store = (window.__cloudStore = window.__cloudStore || []);
        return { backups: store.slice().reverse().map((b, i) => ({ deviceId: i % 2 ? 'DEV-BBBBBBBB' : 'DEV-AAAAAAAA', name: b.name, createdAt: new Date(b.at).toISOString(), bytes: b.text.length, uploaded: true, downloaded: true, own: !(i % 2), pin: b.pin })) };
      },
      async backupRead(o) {
        const found = (window.__cloudStore || []).find((b) => b.name === o.name);
        if (!found) throw new Error('not found');
        return { text: found.text };
      },
      async addListener(event, handler) { ((window.__syncHandlers = window.__syncHandlers || {})[event] = (window.__syncHandlers[event] || [])).push(handler); return { remove: async () => {} }; },

      // --- Sync: a fake CKSyncEngine in front of a cloud the test harness owns (window.__cloudSave / __cloudChanges).
      async syncStart() { engine().started = true; },
      async syncStop() { engine().started = false; },
      async syncForget(o) { const e = engine(); for (const k of Object.keys(e.outbox)) if (k.startsWith(o.syncId + '|')) { delete e.outbox[k]; e.sending.delete(k); } for (const k of Object.keys(e.inbox)) if (k.startsWith(o.syncId + '|')) delete e.inbox[k]; (window.__forgot = window.__forgot || []).push(o.syncId); },
      async syncExcludeFromBackup(o) { (window.__excluded = window.__excluded || []).push(...o.names); },
      async syncResume() { if (window.__syncStatus && (window.__syncStatus.zoneDeleted || window.__syncStatus.accountChanged)) throw new Error('paused'); window.__resumed = (window.__resumed || 0) + 1; },
      async syncClearPause() { window.__syncStatus = {}; window.__clearedPause = (window.__clearedPause || 0) + 1; },
      async syncBrowse() { if (window.__browseFails) throw new Error('fetchFailed'); engine().started = true; await flush(); },
      async syncQueue(o) { const e = engine(); for (const r of o.items) { const n = r.syncId + '|' + r.itemId; e.outbox[n] = r; e.sending.add(n); } await flush(); },
      async syncInbox() { await flush(); return { items: Object.values(engine().inbox) }; },
      async syncOutbox() { return { names: Object.keys(engine().outbox) }; },
      async syncAck(o) { for (const r of o.items) { const n = r.syncId + '|' + r.itemId; const now = engine().inbox[n]; if (now && now.v === r.v && now.fields === r.fields && !!now.deleted === !!r.deleted && now.at === r.at) delete engine().inbox[n]; } },
      async syncNow() { await flush(); },
      async syncStatus() {
        const e = engine();
        return Object.assign({ running: e.started, zoneDeleted: false, quotaExceeded: false, outboxCount: Object.keys(e.outbox).length, inboxCount: Object.keys(e.inbox).length, accountKey: 'ACC1' }, window.__syncStatus || {});
      },
    },
  };
  function engine() {
    return (window.__engine = window.__engine || { started: false, outbox: {}, inbox: {}, sending: new Set(), tags: {}, cursor: 0 });
  }
  async function flush() {
    const e = engine();
    if (window.__syncOffline || !e.started) return;
    for (const name of Object.keys(e.outbox)) {
      if (!e.sending.has(name)) continue;
      const r = await window.__cloudSave(name, e.outbox[name], e.tags[name] === undefined ? null : e.tags[name]);
      if (r.ok) { e.tags[name] = r.tag; delete e.outbox[name]; e.sending.delete(name); }
      else { e.inbox[name] = r.row; e.tags[name] = r.tag; e.sending.delete(name); }
    }
    const changes = await window.__cloudChanges(e.cursor);
    for (const c of changes.rows) { if (e.tags[c.name] !== c.tag && !(c.name in e.outbox)) { e.inbox[c.name] = c.row; e.tags[c.name] = c.tag; } }
    e.cursor = changes.seq;
  }
  const stub = {
    isNativePlatform: () => true,
    getPlatform: () => 'ios',
    isPluginAvailable: () => true,
    registerPlugin: (name) => plugins[name] || {},
    convertFileSrc: (x) => x,
  };
  const proxy = new Proxy(stub, { set() { return true; }, get(t, k) { return k in t ? t[k] : undefined; } });
  Object.defineProperty(window, 'Capacitor', { get: () => proxy, set() {}, configurable: true });
})();
