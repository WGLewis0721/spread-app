
(() => {
  const plugins = {
    Filesystem: {
      async readFile(o) { const v = await window.__fsRead(o.path); if (v === null) throw new Error('File does not exist.'); return { data: v }; },
      async writeFile(o) { await window.__fsWrite(o.path, o.data, o.encoding || 'base64'); return { uri: 'file:///fake/' + o.path }; },
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
        const base = { deviceId: 'DEV-AAAAAAAA', cloudKit: 'available', driveAvailable: true, backupCount: store.length };
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
      async addListener() { return { remove: async () => {} }; },
    },
  };
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
