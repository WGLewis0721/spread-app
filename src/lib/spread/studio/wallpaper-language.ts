/**
 * Wallpaper -> Design Language. Deterministic, device-local, no AI account, no fetch.
 * Visual texture/quiet band is a *heuristic*, not person or subject detection.
 * The final colors and enum shapes are validated by the Studio V1 contract.
 */
import { suggestPalette } from "./palette.ts";
import { contrastRatioHex, enforceContrast, hexToRgb, mixRgb, relativeLuminance, rgbToHex } from "./contrast.ts";
import type { StudioPalette } from "./contract.ts";

/** How thick the sheet material reads over this wallpaper. Busy art needs thicker material for legible text. */
export type StudioMaterialThickness = "thin" | "regular" | "thick";

/** Transparency and depth (blur) the contract carries for each thickness. Thicker means more opaque. */
export const MATERIAL_THICKNESS: Record<StudioMaterialThickness, { transparency: number; depth: number }> = {
  thin: { transparency: 0.5, depth: 0.85 },
  regular: { transparency: 0.3, depth: 0.9 },
  thick: { transparency: 0.16, depth: 1 },
};

/** Apple's guidance: about 35% dim behind readable UI when the content under it is bright. */
export const MAX_WALLPAPER_DIM = 0.35;

/**
 * What a wallpaper decides, and nothing else: a tint (with a quiet sheet color and readable ink),
 * a dim, a material thickness, and where the image's interest sits. Layout, type, shapes and
 * controls never vary with the image.
 */
export type StudioWallpaperLanguage = {
  palette: StudioPalette;
  thickness: StudioMaterialThickness;
  dim: number;
  focusY: number;
  swatches: readonly { hex: string; share: number }[];
  edgeDensity: number;
  quietBand: { from: number; to: number };
  explanation: string;
};

type Point = { lab: [number, number, number]; rgb: [number, number, number] };
const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
const hex = (r: number, g: number, b: number) => rgbToHex({ r: clamp(r), g: clamp(g), b: clamp(b) });
const gamma = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
function lab(r: number, g: number, b: number): [number, number, number] {
  const R = gamma(r), G = gamma(g), B = gamma(b);
  const f = (v: number) => v > 0.008856 ? Math.cbrt(v) : 7.787037 * v + 16 / 116;
  const x = f((R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047);
  const y = f((R * 0.2126729 + G * 0.7151522 + B * 0.072175) / 1);
  const z = f((R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const dist = (a: [number, number, number], b: [number, number, number]) =>
  (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;
const sat = (v: [number, number, number]) => {
  const hi = Math.max(...v), lo = Math.min(...v); return hi ? (hi - lo) / hi : 0;
};

/** Deterministic Lab k-means palette (up to eight), sorted by pixel share. */
export function measureWallpaper(
  rgba: Uint8ClampedArray, width: number, height: number,
): { swatches: { hex: string; share: number }[]; edgeDensity: number; quietBand: { from: number; to: number }; focusY: number; lineDensity: number } {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      rgba.length < width * height * 4) return { swatches: [], edgeDensity: 0, quietBand: { from: 0.25, to: 0.6 }, focusY: 0.5, lineDensity: 0 };
  const jump = Math.max(1, Math.ceil(Math.sqrt((width * height) / 3800)));
  const points: Point[] = [];
  // Stagger the sample lattice to avoid aliasing horizontal stripes: with a
  // two-pixel step every other row can vanish entirely from the palette.
  const rowStep=Math.max(1,Math.floor(jump/2));
  const colStep=jump*2;
  for (let y=0;y<height;y+=rowStep) for (let x=Math.floor(y/rowStep)%colStep;x<width;x+=colStep) {
    const i=(y*width+x)*4; if (rgba[i+3] < 128) continue;
    const rgb: [number, number, number] = [rgba[i],rgba[i+1],rgba[i+2]];
    points.push({ rgb, lab: lab(...rgb) });
  }
  if (!points.length) return { swatches: [], edgeDensity: 0, quietBand: { from: 0.25, to: 0.6 }, focusY: 0.5, lineDensity: 0 };
  const k = Math.min(8, points.length);
  const centers: [number,number,number][] = [points[Math.floor(points.length/2)].lab.slice() as [number,number,number]];
  while(centers.length<k) {
    let chosen=0, farthest=-1;
    for(let i=0;i<points.length;i++) {
      const nearest=Math.min(...centers.map(c=>dist(points[i].lab,c)));
      if(nearest>farthest){farthest=nearest;chosen=i;}
    }
    if(farthest<0.0001) break;
    centers.push([...points[chosen].lab]);
  }
  const count=centers.length;
  let buckets:{r:number;g:number;b:number;n:number}[]=[];
  for(let pass=0;pass<9;pass++) {
    const labSum=Array.from({length:count},()=>[0,0,0,0]);
    buckets=Array.from({length:count},()=>({r:0,g:0,b:0,n:0}));
    for(const p of points) {
      let winner=0,best=Infinity;
      for(let i=0;i<count;i++){const d=dist(p.lab,centers[i]);if(d<best){winner=i;best=d;}}
      const sum=labSum[winner], bucket=buckets[winner];
      sum[0]+=p.lab[0];sum[1]+=p.lab[1];sum[2]+=p.lab[2];sum[3]++;
      bucket.r+=p.rgb[0];bucket.g+=p.rgb[1];bucket.b+=p.rgb[2];bucket.n++;
    }
    for(let i=0;i<count;i++) if(labSum[i][3]) centers[i]=labSum[i].slice(0,3).map(v=>v/labSum[i][3]) as [number,number,number];
  }
  const swatches=buckets.filter(b=>b.n).sort((a,b)=>b.n-a.n).map(b=>({hex:hex(b.r/b.n,b.g/b.n,b.b/b.n),share:Number((b.n/points.length).toFixed(4))}));
  // Sobel edge density in 20 horizontal strips: samples scaled to 160px width.
  const stride = Math.max(1, Math.ceil(width/160));
  const w=Math.max(1,Math.ceil(width/stride)), h=Math.max(1,Math.ceil(height/stride));
  const lum=new Float32Array(w*h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const i=(Math.min(height-1,y*stride)*width+Math.min(width-1,x*stride))*4;
    lum[y*w+x]=0.2126*rgba[i]+0.7152*rgba[i+1]+0.0722*rgba[i+2];
  }
  const bands=Array(20).fill(0), samples=Array(20).fill(0);
  let hard=0, total=0;
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++) {
    const a=lum[(y-1)*w+x-1],b=lum[(y-1)*w+x],c=lum[(y-1)*w+x+1];
    const d=lum[y*w+x-1],f=lum[y*w+x+1];
    const g=lum[(y+1)*w+x-1],h0=lum[(y+1)*w+x],i=lum[(y+1)*w+x+1];
    const gx=-a-2*d-g+c+2*f+i,gy=-a-2*b-c+g+2*h0+i;
    const band=Math.min(19,Math.floor(y/h*20));
    const mag=Math.hypot(gx,gy);
    bands[band]+=mag>95?1:0;samples[band]++;
    hard+=mag>420?1:0;total++;
  }
  const density=bands.reduce((a,b)=>a+b,0)/Math.max(1,samples.reduce((a,b)=>a+b,0));
  let from=0,lowest=Infinity;
  for(let i=0;i<=13;i++) {
    const score=bands.slice(i,i+7).reduce((sum,b,j)=>sum+b/Math.max(1,samples[i+j]),0);
    if(score<lowest){lowest=score;from=i;}
  }
  // Center of interest: the busiest seven-band window. This is a texture heuristic, not subject detection.
  let busyFrom=0,busiest=-1;
  for(let i=0;i<=13;i++) {
    const score=bands.slice(i,i+7).reduce((sum,b,j)=>sum+b/Math.max(1,samples[i+j]),0);
    if(score>busiest){busiest=score;busyFrom=i;}
  }
  const focusY=Number(((busyFrom+3.5)/20).toFixed(3));
  return {swatches,edgeDensity:Number(density.toFixed(3)),quietBand:{from:from/20,to:(from+7)/20},focusY,lineDensity:Number((hard/Math.max(1,total)).toFixed(3))};
}

const lumOf=(color:string)=>{const rgb=hexToRgb(color);return rgb?relativeLuminance(rgb):0;};
const mix=(a:string,b:string,amount:number)=>{const x=hexToRgb(a),y=hexToRgb(b);return x&&y?rgbToHex(mixRgb(x,y,amount)):a;};

/** Mean luminance (0 to 1) of the measured swatches, weighted by pixel share. */
export function meanLuminance(swatches: readonly { hex: string; share: number }[]): number {
  let total = 0, weight = 0;
  for (const { hex: color, share } of swatches) {
    const rgb = hexToRgb(color);
    if (!rgb) continue;
    total += relativeLuminance(rgb) * share;
    weight += share;
  }
  return weight > 0 ? total / weight : 0.5;
}

/** Dim grows with brightness: none for dark art, the full 35% for bright art. */
export function dimForLuminance(luminance: number): number {
  const t = Math.min(1, Math.max(0, (luminance - 0.3) / 0.4));
  return Number((t * MAX_WALLPAPER_DIM).toFixed(2));
}

/** Soft images take thin material; busy, high-detail images take thicker material so text stays legible. */
export function thicknessForEdges(edgeDensity: number): StudioMaterialThickness {
  if (edgeDensity < 0.02) return "thin";
  if (edgeDensity < 0.07) return "regular";
  return "thick";
}

/** Sheet tint: a quiet, light swatch from the wallpaper itself, never a fixed color. */
function sheetFrom(swatches:readonly {hex:string;share:number}[],dominant:string):string {
  let best:string|null=null,score=Infinity;
  for(const {hex:color} of swatches){
    const rgb=hexToRgb(color);if(!rgb)continue;
    const lum=relativeLuminance(rgb);
    if(lum<0.25||lum>0.85)continue;
    const s=Math.abs(lum-0.58)+0.6*sat([rgb.r,rgb.g,rgb.b]);
    if(s<score){score=s;best=color;}
  }
  return best??mix(dominant,"#ffffff",0.72);
}

/** A bounded, contrast-guarded tint, dim and material derived from the wallpaper's measurements. */
export function languageFromPixels(rgba:Uint8ClampedArray,width:number,height:number):StudioWallpaperLanguage {
  const measured=measureWallpaper(rgba,width,height);
  const base=suggestPalette(rgba,width,height).palette; // existing WCAG-safe base
  const dominant=measured.swatches[0]?.hex??base.accent;
  const samples=measured.swatches.map(({hex:color,share})=>({hex:color,share,rgb:hexToRgb(color)}));
  const vivid=samples.filter(s=>s.rgb && sat([s.rgb.r,s.rgb.g,s.rgb.b])>=0.29);
  vivid.sort((a,b)=>b.share-a.share);
  const lightBase=lumOf(base.surface)>0.4;
  // A quiet tint of the sheet and a near-white card surface on light art; the contrast-checked base on dark art.
  const tint=lightBase?mix(sheetFrom(measured.swatches,dominant),"#ffffff",0.4):base.surface;
  const surface=lightBase?mix(tint,"#ffffff",0.85):base.surface;
  const darkest=[...measured.swatches].sort((a,b)=>lumOf(a.hex)-lumOf(b.hex))[0]?.hex;
  const inkSeed=lightBase&&darkest?darkest:enforceContrast(base.text,surface,4.5).color;
  const ink=enforceContrast(enforceContrast(inkSeed,surface,7).color,tint,4.5).color;
  const secondary=enforceContrast(mix(ink,surface,0.32),lightBase?tint:surface,4.5).color;
  // One tint for Today, links, primary actions and selection: the most share-heavy saturated swatch that reads as text.
  const accentSeed=vivid.find(v=>(contrastRatioHex(v.hex,surface)??0)>=4.5&&(contrastRatioHex(v.hex,tint)??0)>=4.5)?.hex??base.accent;
  const accent=enforceContrast(enforceContrast(accentSeed,surface,4.5).color,tint,4.5).color;
  // Brightest saturated swatch, kept only for editor swatches and explicit starter styles.
  const fillable=vivid.filter(v=>lumOf(v.hex)>0.18)[0]?.hex??accent;
  return {
    palette:{accent,surface,text:ink,secondaryText:secondary,highlight:fillable,...(lightBase?{sheet:tint}:{})},
    thickness:thicknessForEdges(measured.edgeDensity),
    dim:dimForLuminance(meanLuminance(measured.swatches)),
    focusY:measured.focusY,
    swatches:measured.swatches,
    edgeDensity:measured.edgeDensity,
    quietBand:measured.quietBand,
    explanation:"Tint, dim and material taken from your wallpaper",
  };
}

/** Decode only a bounded raster inside the user's own browser, with no uploads. */
export async function analyzeWallpaperFile(file:Blob, signal?:AbortSignal):Promise<StudioWallpaperLanguage>{
  if (signal?.aborted) throw new Error("cancelled");
  let bitmap:ImageBitmap|null=null;
  let url:string|null=null;
  try {
    let source:CanvasImageSource;
    let naturalWidth:number,naturalHeight:number;
    if(typeof createImageBitmap==="function") {
      bitmap=await createImageBitmap(file);
      source=bitmap;naturalWidth=bitmap.width;naturalHeight=bitmap.height;
    } else {
      url=URL.createObjectURL(file);
      const image=new Image();
      await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("decode"));image.src=url!;});
      source=image;naturalWidth=image.naturalWidth;naturalHeight=image.naturalHeight;
    }
    if(signal?.aborted)throw new Error("cancelled");
    const ratio=Math.min(1,240/Math.max(1,naturalWidth),480/Math.max(1,naturalHeight));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(naturalWidth*ratio));
    canvas.height=Math.max(1,Math.round(naturalHeight*ratio));
    const context=canvas.getContext("2d",{willReadFrequently:true});
    if(!context)throw new Error("canvas");
    context.drawImage(source,0,0,canvas.width,canvas.height);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);
    return languageFromPixels(pixels.data,canvas.width,canvas.height);
  } finally {bitmap?.close();if(url)URL.revokeObjectURL(url);}
}
