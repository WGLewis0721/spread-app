import { inflateSync } from 'node:zlib';

// Decode Playwright's lossless 8-bit RGB/RGBA screenshots for reflection paint tests.
export function pixels(buffer: Buffer) {
  const chunks: Buffer[] = [];
  let width = 0, height = 0, channels = 0;
  for (let p = 8; p < buffer.length;) {
    const size = buffer.readUInt32BE(p), type = buffer.toString('ascii', p + 4, p + 8);
    const data = buffer.subarray(p + 8, p + 8 + size);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (data[8] !== 8 || ![2, 6].includes(data[9])) throw Error('Expected an 8-bit RGB screenshot');
      channels = data[9] === 6 ? 4 : 3;
    }
    if (type === 'IDAT') chunks.push(data);
    p += size + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels;
  const output = Buffer.alloc(height * stride);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c, x = Math.abs(p - a), y = Math.abs(p - b), z = Math.abs(p - c);
    return x <= y && x <= z ? a : y <= z ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? output[y * stride + x - channels] : 0;
      const b = y ? output[(y - 1) * stride + x] : 0;
      const c = y && x >= channels ? output[(y - 1) * stride + x - channels] : 0;
      const predictor = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter];
      output[y * stride + x] = (raw[y * (stride + 1) + x + 1] + predictor) & 255;
    }
  }
  return { width, height, channels, data: output };
}
export function changedPixels(a: ReturnType<typeof pixels>, b: ReturnType<typeof pixels>, fromY = 0) {
  if (a.width !== b.width || a.height !== b.height || a.channels !== b.channels) throw Error('Screenshot dimensions differ');
  let changed = 0;
  for (let p = Math.floor(fromY) * a.width * a.channels; p < a.data.length; p += a.channels) {
    if ([0, 1, 2].some(c => Math.abs(a.data[p + c] - b.data[p + c]) > 3)) changed++;
  }
  return changed;
}
