import assert from "node:assert/strict";
import test from "node:test";
import {cycleDetent,snapDetent,sheetTop,rubberBandSheetTop,settleWeekSheet,wallpaperShiftForSheet,STUDIO_WEEK_BOARD} from "./week-detents.ts";
test("tap cycles all three detents",()=>{
 assert.equal(cycleDetent("peek"),"half");
 assert.equal(cycleDetent("half"),"full");
 assert.equal(cycleDetent("full"),"peek");
});
test("down collapses and up expands, with flicks but no jitter",()=>{
 assert.equal(snapDetent("half",-65,250),"full");
 assert.equal(snapDetent("half",68,250),"peek");
 assert.equal(snapDetent("peek",80,100),"peek");
 assert.equal(snapDetent("full",-80,100),"full");
 assert.equal(snapDetent("half",5,200),"half");
 assert.equal(snapDetent("half",-28,25),"full");
 assert.equal(snapDetent("half",NaN,3),"half");
});

test("E1 board ratios map the three sheet positions and drag is damped",()=>{
 const {sheetTop,rubberBandSheetTop,settleWeekSheet,wallpaperShiftForSheet,STUDIO_WEEK_BOARD}=requireDetents();
 assert.equal(STUDIO_WEEK_BOARD.height,874);
 assert.equal(sheetTop("peek",874),690);
 assert.equal(sheetTop("half",874),411);
 assert.equal(sheetTop("full",874),131);
 assert.equal(settleWeekSheet(400,-0.8,874),"full");
 assert.equal(settleWeekSheet(500,0.9,874),"peek");
 assert.ok(rubberBandSheetTop(-100,874)>-36);
 assert.equal(wallpaperShiftForSheet(690,874),0);
 assert.equal(wallpaperShiftForSheet(411,874),-241);
 assert.equal(wallpaperShiftForSheet(131,874),-241);
 assert.ok(wallpaperShiftForSheet(549,874)<-100);
 assert.equal(wallpaperShiftForSheet(sheetTop("half",804),804),-222);
});
function requireDetents(){return {sheetTop, rubberBandSheetTop,settleWeekSheet,wallpaperShiftForSheet,STUDIO_WEEK_BOARD};}
