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
