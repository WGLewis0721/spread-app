
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
