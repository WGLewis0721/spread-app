import assert from "node:assert/strict";
import test from "node:test";
import {measureWallpaper,languageFromPixels} from "./wallpaper-language.ts";
import {parseStudioAppearance,originalStudioAppearance} from "./contract.ts";
import {contrastRatioHex} from "./contrast.ts";
import {openStudioSession,reduceStudioSession} from "../../../spread/components/studio/draft.ts";

function image(w:number,h:number,colors:[number,number,number][]):Uint8ClampedArray{
 const rgba=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<w*h;i++){const rgb=colors[Math.floor(i/w)%colors.length];rgba.set([...rgb,255],i*4);}
 return rgba;
}
test("Lab clustering is deterministic, pure, and preserves full palette shares",()=>{
 const source=image(100,100,[[14,21,26],[245,214,45],[173,212,221],[148,80,84]]);
 const copy=new Uint8ClampedArray(source);
 const first=measureWallpaper(source,100,100),second=measureWallpaper(source,100,100);
 assert.deepEqual(first,second);assert.deepEqual(source,copy);
 assert.ok(first.swatches.length>=4);
 assert.ok(Math.abs(first.swatches.reduce((v,s)=>v+s.share,0)-1)<0.002);
 assert.ok(first.quietBand.from>=0&&first.quietBand.to<=1);
});
test("Wallpaper language produces allowlisted, contrast safe, reversible plan-free draft",()=>{
 const l=languageFromPixels(image(80,80,[[245,214,45],[14,21,26],[71,108,123]]),80,80);
 for(const hex of [l.palette.text,l.palette.surface,l.palette.accent,l.palette.secondaryText,l.palette.highlight!])
   assert.match(hex,/^#[0-9a-f]{6}$/i);
 assert.ok((contrastRatioHex(l.palette.text,l.palette.surface)??0)>=4.5);
 assert.ok((contrastRatioHex(l.palette.secondaryText,l.palette.surface)??0)>=4.5);
 const initial=originalStudioAppearance();
 const start=openStudioSession({render:initial,imageMessage:null,planner:"NEVER-WRITE"});
 const next=reduceStudioSession(start,{type:"apply-wallpaper-language",language:l}).state;
 assert.equal(next.planner,"NEVER-WRITE");
 assert.equal(next.committed.id,"original");
 assert.equal(next.draft.id,"studio-wallpaper");
 assert.equal(parseStudioAppearance(next.draft).ok,true);
 assert.equal(reduceStudioSession(next,{type:"cancel"}).state.draft.id,"original");
});
test("invalid raster cannot crash or infer a person",()=>{
 const result=measureWallpaper(new Uint8ClampedArray(2),100,100);
 assert.deepEqual(result.swatches,[]);
});

// ---- skin: every shape comes from the measurements of the image in hand ----
function poster(w:number,h:number,busyFrom:number,busyTo:number):Uint8ClampedArray{
 // Hard two-color linework inside [busyFrom, busyTo) rows, flat paper elsewhere.
 const rgba=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const busy=y>=busyFrom&&y<busyTo;
  const c=busy?((x+y)%4<2?[245,214,45]:[14,21,26]):[173,212,221];
  rgba.set([...c,255],(y*w+x)*4);
 }
 return rgba;
}
function soft(w:number,h:number):Uint8ClampedArray{
 const rgba=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  rgba.set([200-Math.round(80*y/h),160-Math.round(40*y/h),130+Math.round(60*x/w),255],(y*w+x)*4);
 }
 return rgba;
}
test("outline, shadow, edge and glyph follow the image: linework gets them, a soft photo does not",()=>{
 const lines=languageFromPixels(poster(120,240,0,240),120,240).skin;
 const photo=languageFromPixels(soft(120,240),120,240).skin;
 assert.ok(lines.outline>=2,"dense linework earns an outline");
 assert.equal(lines.hardShadow,lines.outline);
 assert.equal(photo.outline,0);
 assert.equal(photo.hardShadow,0);
 assert.equal(photo.sheetEdge,"round");
 assert.equal(photo.checkGlyph,"check");
 assert.notDeepEqual(lines,photo);
});
test("the wallpaper focus follows where the busy band is, not a fixed offset",()=>{
 const top=languageFromPixels(poster(120,240,0,90),120,240).skin.focusY;
 const bottom=languageFromPixels(poster(120,240,150,240),120,240).skin.focusY;
 assert.ok(top<0.4,`top-heavy art focuses high (${top})`);
 assert.ok(bottom>0.6,`bottom-heavy art focuses low (${bottom})`);
});
test("sheet tint and ink come from the image and clear contrast on both sheet and card",()=>{
 const l=languageFromPixels(poster(120,240,0,110),120,240);
 const p=l.palette;
 assert.ok(p.sheet,"a light wallpaper gets a wallpaper-tinted sheet");
 assert.ok((contrastRatioHex(p.text,p.sheet!)??0)>=4.5);
 assert.ok((contrastRatioHex(p.secondaryText,p.sheet!)??0)>=4.5);
 assert.ok((contrastRatioHex(p.secondaryText,p.surface)??0)>=4.5);
 const other=languageFromPixels(poster(120,240,0,110).map((v,i)=>i%4===3?255:255-v),120,240).palette;
 assert.notEqual(other.sheet??other.surface,p.sheet);
});
test("a derived skin survives the strict contract and rejects stray fields",()=>{
 const l=languageFromPixels(poster(120,240,0,240),120,240);
 const next=reduceStudioSession(openStudioSession({render:originalStudioAppearance(),imageMessage:null,planner:"p"}),{type:"apply-wallpaper-language",language:l}).state.draft;
 const parsed=parseStudioAppearance(next);
 assert.equal(parsed.ok,true);
 assert.deepEqual(parsed.ok&&parsed.value.skin,l.skin);
 assert.equal(parseStudioAppearance({...next,skin:{...next.skin,font:"x"}}).ok,false);
 assert.equal(parseStudioAppearance({...next,skin:{...next.skin,outline:9}}).ok,false);
 assert.equal(parseStudioAppearance({...next,skin:{...next.skin,sheetEdge:"zigzag"}}).ok,false);
});
