/**
 * Independent screenshot/contrast audit of the *live* wallpaper-derived material.
 * Also asserts the layout is identical across wallpapers: only color, dim and material change.
 * Three very different procedural images, no image URL or production data.
 * 3 widths x 2 schemes x 3 wallpapers x 3 Week detents = 54 screenshots.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { auditStudioContrast } from "./contrast-audit.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const output = join(root, "screenshots", "studio-material");
const origin = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:8080";
const nativeInit = readFileSync(join(root, "scripts", "ios-bridge-sim", "native-init.js"), "utf8");
const quick = process.env.AUDIT_QUICK === "1";
const shapes = (quick ? ["line-illustration"] : ["line-illustration", "dark-poster", "soft-photo"]) as unknown as readonly ["line-illustration", "dark-poster", "soft-photo"];
const schemes = (quick ? ["light"] : ["light", "dark"]) as unknown as readonly ["light", "dark"];
const sizes = [{width:390,height:844},{width:402,height:874},{width:820,height:1180}] as const;
const detents = ["peek", "half", "full"] as const;
const results: Array<Record<string,unknown>> = [];
const errors: string[] = [];
const geometryByCase = new Map<string,string>();
let carouselChecked = false;

mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH ?? chromium.executablePath()});

// These fixtures deliberately do not share palette, subject location or edge density.
async function imageBytes(page:import("playwright").Page,name:(typeof shapes)[number]):Promise<Buffer> {
  const image=await page.evaluate((kind)=>{
    const canvas=document.createElement("canvas");canvas.width=320;canvas.height=640;
    const c=canvas.getContext("2d")!;
    if(kind==="line-illustration"){
      c.fillStyle="#fffbed";c.fillRect(0,0,320,640);
      c.strokeStyle="#203a61";c.lineWidth=3;
      for(let k=0;k<20;k++){c.beginPath();c.moveTo((k*51)%320,0);c.bezierCurveTo(70,150,270,400,(k*47)%320,640);c.stroke();}
      c.fillStyle="#e4a24b";c.fillRect(95,285,145,170);
      c.strokeStyle="#162a41";c.lineWidth=8;c.strokeRect(95,285,145,170);
    }else if(kind==="dark-poster"){
      c.fillStyle="#0d101b";c.fillRect(0,0,320,640);
      c.fillStyle="#e43154";c.fillRect(12,420,296,100);
      c.fillStyle="#30add1";c.beginPath();c.arc(180,280,125,0,Math.PI*2);c.fill();
      c.fillStyle="#f1dd4b";c.font="bold 80px sans-serif";c.fillText("NIGHT",12,135);
      c.fillStyle="#1c2037";c.fillRect(40,535,240,64);
    }else{
      const sky=c.createLinearGradient(0,0,0,640);
      sky.addColorStop(0,"#a7d4d7");sky.addColorStop(.43,"#ebcbbb");
      sky.addColorStop(.68,"#b3a18a");sky.addColorStop(1,"#657958");
      c.fillStyle=sky;c.fillRect(0,0,320,640);
      c.save();c.filter="blur(24px)";
      c.fillStyle="#f6e6c6";c.beginPath();c.arc(98,250,68,0,Math.PI*2);c.fill();
      c.fillStyle="#566f51";c.beginPath();c.ellipse(110,540,170,80,-.2,0,Math.PI*2);c.fill();
      c.fillStyle="#8185a6";c.beginPath();c.ellipse(260,365,80,100,0,0,Math.PI*2);c.fill();
      c.restore();
    }
    return canvas.toDataURL("image/png").split(",")[1];
  },name);
  return Buffer.from(image,"base64");
}

function hexColor(value:string):string|null {
  if(/^#[0-9a-f]{6}$/i.test(value.trim()))return value.trim();
  const rgb=value.match(/rgba?\(\s*(\d+)(?:[,\s]+)(\d+)(?:[,\s]+)(\d+)/);
  if(!rgb)return null;
  return "#"+[rgb[1],rgb[2],rgb[3]].map(v=>Math.max(0,Math.min(255,+v)).toString(16).padStart(2,"0")).join("");
}
function ratio(a:string,b:string):number|null {
  const x=hexColor(a),y=hexColor(b);
  if(!x||!y)return null;
  const luminance=(h:string)=>{
    const ch=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255)
      .map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
    return .2126*ch[0]+.7152*ch[1]+.0722*ch[2];
  };
  const l=luminance(x),m=luminance(y);
  return Number(((Math.max(l,m)+.05)/(Math.min(l,m)+.05)).toFixed(3));
}

try {
  for(const scheme of schemes) for(const shape of shapes){
    const files=new Map<string,string>();
    const context=await browser.newContext();
    await context.exposeFunction("__fsRead", async (p:string)=>files.get(p)??null);
    await context.exposeFunction("__fsWrite", async (p:string,v:string)=>{files.set(p,v)});
    await context.exposeFunction("__cloudSave", async ()=>({ok:true,tag:"skin-audit"}));
    await context.exposeFunction("__cloudChanges", async ()=>({rows:[],seq:0}));
    await context.addInitScript(nativeInit);
    const page=await context.newPage();
    page.on("pageerror",e=>errors.push(String(e)));
    try {
      await page.setViewportSize({width:390,height:844});
      await page.goto(origin,{waitUntil:"domcontentloaded"});
      await page.getByRole("tab",{name:"Spread"}).waitFor({timeout:30000});
      await page.getByRole("button",{name:"Settings"}).click();
      await page.getByRole("heading",{name:"More"}).waitFor();
      await page.getByRole("radio",{name:scheme==="light"?"Light":"Dark"}).click();
      await page.getByRole("button",{name:"Customize Spread"}).click();
      const editor=page.locator(".studio-sheet");
      await editor.getByRole("heading",{name:"Customize Spread"}).waitFor();
      await editor.locator("input[type='file']").setInputFiles({
        name:shape+".png",mimeType:"image/png",buffer:await imageBytes(page,shape),
      });
      await page.waitForFunction(()=>{
        const a=[...document.querySelectorAll<HTMLButtonElement>(".studio-sheet button")];
        return a.some(b=>b.textContent?.trim()==="Apply" && !b.disabled);
      },null,{timeout:30000});
      await editor.getByRole("button",{name:"Apply",exact:true}).click();
      await editor.waitFor({state:"hidden",timeout:15000});
      await page.getByRole("button",{name:"Close",exact:true}).click();
      // Spread tab: one grouped list. Role rows reuse .week-seq-item but must not become nested cards.
      await page.waitForTimeout(900);
      const nested=await page.evaluate(()=>[...document.querySelectorAll<HTMLElement>(".week-seq-item")]
        .filter(el=>!el.closest(".studio-week-stage")&&!el.parentElement?.classList.contains("studio-role-stack"))
        .map(el=>{const c=getComputedStyle(el);return {r:c.borderTopLeftRadius,w:c.borderTopWidth,s:c.boxShadow};})
        .filter(v=>v.r!=="0px"||v.w!=="0px"||v.s!=="none"));
      if(nested.length) errors.push(shape+"/"+scheme+": Spread tab rows became nested cards "+JSON.stringify(nested[0]));
      // Stacked role cards: every visible text node on the Spread tab must clear contrast on its card.
      const spreadText=await auditStudioContrast(page);
      if(spreadText.length)errors.push(shape+"/"+scheme+": Spread tab text audit "+spreadText.length+" violations "+JSON.stringify(spreadText[0]).slice(0,240));
      const stackCards=await page.locator(".studio-role-stack > .week-seq-item").count();
      if(stackCards<3)errors.push(shape+"/"+scheme+": expected stacked role cards, found "+stackCards);
      // Carousel: the stack turns by itself (front card changes); exactly one card is open; Pause stops it.
      if(!carouselChecked){
        carouselChecked=true;
        const openCards=()=>page.evaluate(()=>[...document.querySelectorAll(".studio-role-stack > .week-seq-item")].map(e=>(e.getAttribute("data-role-id")||"?")+(e.querySelector(".task-fold")?.classList.contains("task-fold-open")?"+":"-")).join(","));
        const first=await openCards();
        if(first.split("+").length!==2) errors.push("carousel: expected exactly one open card, got "+first);
        await page.waitForTimeout(7600);
        const second=await openCards();
        if(second===first||second.split("+").length!==2) errors.push("carousel did not advance: "+first+" -> "+second);
        await page.getByRole("button",{name:"Pause auto-advance"}).click();
        const held=await openCards();
        await page.waitForTimeout(7600);
        if((await openCards())!==held) errors.push("carousel kept moving after Pause");
        await page.getByRole("button",{name:"Resume auto-advance"}).click();
      }
      await page.getByRole("tab",{name:"Week",exact:true}).click();
      await page.waitForFunction(()=>{
        const host=document.querySelector<HTMLElement>('[data-studio-wallpaper="on"]');
        return !!host && getComputedStyle(host).getPropertyValue("--studio-wallpaper-image").includes("blob:");
      },null,{timeout:15000});
      const sheet=page.locator(".studio-week-stage");
      const handle=page.getByRole("slider",{name:"Week sheet position"});
      for(const size of sizes){
        await page.setViewportSize(size);
        for(const detent of detents){
          await handle.focus();
          await handle.press(detent==="peek"?"Home":detent==="full"?"End":"Home");
          if(detent==="half") await handle.press("ArrowUp");
          await page.waitForTimeout(475);
          const measured=await page.evaluate(()=>{
            const scope=document.querySelector<HTMLElement>('[data-studio-wallpaper="on"]')!;
            const week=document.querySelector<HTMLElement>(".studio-week-stage")!;
            const card=week.querySelector<HTMLElement>(".week-seq-item");
            const grab=week.querySelector<HTMLElement>('[role="slider"]')!;
            const computed=getComputedStyle(scope),cs=card?getComputedStyle(card):null;
            const get=(name:string)=>computed.getPropertyValue(name).trim();
            return {
              sheetTop:week.getBoundingClientRect().top,
              headerBottom:document.querySelector<HTMLElement>(".studio-week-header")?.getBoundingClientRect().bottom,
              viewportHeight:innerHeight,
              ink:get("--ink"),sheet:get("--studio-sheet"),card:cs?.backgroundColor??get("--elevated"),
              highlight:get("--studio-highlight"),onHighlight:get("--studio-on-highlight"),
              focus:get("--studio-focus"),sheetPanel:get("--studio-sheet-panel"),
              sheetBlur:getComputedStyle(week).backdropFilter,
              cardBlur:card?getComputedStyle(card).backdropFilter:"none",
              geometry:[week.getBoundingClientRect(),grab.getBoundingClientRect(),
                document.querySelector<HTMLElement>(".studio-week-header")!.getBoundingClientRect()]
                .map(r=>[r.left,r.top,r.width,r.height].map(n=>Math.round(n*10)/10).join(",")).join("|"),
              aria:grab.getAttribute("aria-valuetext"),
              dragging:scope.hasAttribute("data-studio-dragging"),
              grabWidth:grab.getBoundingClientRect().width,grabHeight:grab.getBoundingClientRect().height,
            };
          });
          if(!measured.aria?.toLowerCase().includes(detent)) errors.push(shape+"/"+scheme+"/"+size.width+"/"+detent+": slider value");
          // Material belongs to the functional layer only: the sheet blurs, cards do not.
          if(!/blur/.test(measured.sheetBlur)) errors.push(shape+"/"+scheme+"/"+size.width+"/"+detent+": sheet has no material blur");
          if(/blur/.test(measured.cardBlur)) errors.push(shape+"/"+scheme+"/"+size.width+"/"+detent+": card must not blur");
          const key=scheme+"/"+size.width+"/"+detent;
          const seen=geometryByCase.get(key);
          if(seen===undefined) geometryByCase.set(key,measured.geometry);
          else if(seen!==measured.geometry) errors.push(key+": layout changed with the wallpaper ("+shape+")");
          const inkSheet=ratio(measured.ink,measured.sheet);
          // Cards must have an opaque local plate. Use its computed background.
          const inkCard=ratio(measured.ink,measured.card);
          const inkHighlight=ratio(measured.onHighlight,measured.highlight);
          if((inkSheet??0)<4.5||(inkCard??0)<4.5||(inkHighlight??0)<4.5){
            errors.push(shape+"/"+scheme+"/"+size.width+"/"+detent+": contrast "+JSON.stringify({inkSheet,inkCard,inkHighlight,measured}));
          }
          await handle.evaluate(el=>(el as HTMLElement).blur());
          if(process.env.AUDIT_DEBUG&&size.width===390&&detent==="half"){
            console.log(JSON.stringify(await page.evaluate(()=>{
              const b=document.querySelector<HTMLElement>(".spread-bubbles");
              return [...document.elementsFromPoint(200,578)].slice(0,6).map(e=>{const c=getComputedStyle(e);return {tag:e.tagName,cls:String(e.className).slice(0,70),bg:c.backgroundColor,bf:c.backdropFilter,sh:c.boxShadow.slice(0,50),z:c.zIndex}}).concat(b?[{bubbles:getComputedStyle(b).backgroundColor,rect:JSON.stringify(b.getBoundingClientRect())}] as never:[]);
            })));
          }
          const shot=shape+"-"+scheme+"-"+size.width+"-"+detent+".png";
          await page.screenshot({path:join(output,shot)});
          results.push({shape,scheme,width:size.width,height:size.height,detent,
            ...measured,contrast:{inkOnSheet:inkSheet,inkOnCard:inkCard,onHighlight:inkHighlight},shot});
        }
      }
      // 200% web font scaling is an approximation, not native iOS Dynamic Type.
      await handle.press("End");
      await page.evaluate(()=>{document.documentElement.style.fontSize="200%"});
      const type=await handle.evaluate(el=>{
        const r=el.getBoundingClientRect();
        return {width:r.width,height:r.height,readable:r.width>=44 && r.height>=44};
      });
      if(!type.readable) errors.push(shape+"/"+scheme+": 200% font scaling "+JSON.stringify(type));
      await page.evaluate(()=>{document.documentElement.style.fontSize=""});
      await page.emulateMedia({reducedMotion:"reduce"});
      const reduced=await sheet.evaluate(el=>({property:getComputedStyle(el).transitionProperty,duration:getComputedStyle(el).transitionDuration}));
      if(reduced.duration.split(",").some(n=>parseFloat(n)>0.08))errors.push(shape+"/"+scheme+": Reduce Motion "+JSON.stringify(reduced));
      await page.emulateMedia({reducedMotion:"no-preference"});
      const contrastNodes=await auditStudioContrast(page);
      if(contrastNodes.length)errors.push(shape+"/"+scheme+": text audit "+contrastNodes.length+" violations");
      results.push({shape,scheme,accessibility:{type200:type,reducedMotion:reduced,visibleTextContrastViolations:contrastNodes.length}});
    } catch(error){errors.push(shape+"/"+scheme+": "+String(error));} finally {await context.close();}
  }
} finally {
  await browser.close();
  writeFileSync(join(output,"measurements.json"),JSON.stringify({cases:results,errors},null,2));
}
const geometry=results.filter(v=>v.detent);
console.log("MATERIAL AUDIT: "+JSON.stringify({
  screenshotCount:geometry.length,
  wallpaperKinds:shapes,
  widths:sizes.map(s=>s.width),
  schemes,
  minInkSheet:Math.min(...geometry.map(v=>(v.contrast as {inkOnSheet:number}).inkOnSheet)),
  minInkCard:Math.min(...geometry.map(v=>(v.contrast as {inkOnCard:number}).inkOnCard)),
  minHighlight:Math.min(...geometry.map(v=>(v.contrast as {onHighlight:number}).onHighlight)),
  errors:errors.slice(0,12),errorCount:errors.length,
}));
if((!quick&&geometry.length!==54)||errors.length)throw new Error("material audit failed: "+errors.length+" findings; see measurements.json");
