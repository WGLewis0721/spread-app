import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const version = (value) => String(value).split('.').slice(0, 3).reduce((sum, part, i) => sum + Number(part) * 256 ** (2 - i), 0);
const generation = (device) => Number(device.name.match(/(\d+)(?:st|nd|rd|th) generation/)?.[1] ?? 0);
export function chooseSimulator(runtimes, types, width) {
  const matches = {
    duo: (d) => d.name === 'iPhone Duo',
    390: (d) => ['iPhone 14', 'iPhone 13', 'iPhone 12'].includes(d.name),
    820: (d) => /iPad Air.*5th generation/.test(d.name),
    1024: (d) => /iPad Pro.*12\.9/.test(d.name),
  }[width];
  if (!matches) throw new Error(`Unsupported verification width: ${width}`);
  for (const runtime of runtimes.filter((r) => r.identifier.includes('iOS-') && r.isAvailable !== false && version(r.version) >= version(width === 'duo' ? '27.1' : '17.0')).sort((a, b) => version(b.version) - version(a.version))) {
    const supported = new Set((runtime.supportedDeviceTypes ?? []).map((d) => typeof d === 'string' ? d : d.identifier));
    const current = version(runtime.version);
    const candidates = types.filter((d) => matches(d) &&
      (!supported.size || supported.has(d.identifier)) &&
      (d.minRuntimeVersion === undefined || d.minRuntimeVersion <= current) &&
      (d.maxRuntimeVersion === undefined || d.maxRuntimeVersion >= current));
    candidates.sort((a, b) => generation(b) - generation(a) || a.identifier.localeCompare(b.identifier));
    if (candidates.length) return { runtime, device: candidates[0] };
  }
  throw new Error(`No installed iOS 17+ runtime has a compatible device for ${width} pt.`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const list = (kind) => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return JSON.parse(execFileSync('xcrun', ['simctl', 'list', kind, '-j'], { encoding: 'utf8', timeout: 60000 }));
      } catch (error) {
        if (error.code !== 'ETIMEDOUT' || attempt === 3) throw error;
        console.error(`Simulator service timed out listing ${kind}; retry ${attempt}/3`);
      }
    }
  };
  const selected = chooseSimulator(list('runtimes').runtimes, list('devicetypes').devicetypes, process.argv[2] === 'duo' ? 'duo' : Number(process.argv[2]));
  console.log(`Selected ${selected.device.name} (${selected.device.identifier}), iOS ${selected.runtime.version}`);
  const udid = execFileSync('xcrun', ['simctl', 'create', `Spread ${process.argv[2]} pt`, selected.device.identifier, selected.runtime.identifier], { encoding: 'utf8', timeout: 120000 }).trim();
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `NATIVE_UDID=${udid}\n`);
  execFileSync('xcrun', ['simctl', 'bootstatus', udid, '-b'], { stdio: 'inherit', timeout: 600000 });
}
