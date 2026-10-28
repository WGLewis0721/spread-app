import assert from "node:assert/strict";
import test from "node:test";
import {cycleDetent,snapDetent} from "./week-detents.ts";
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
import {detentTops,followTop,nearestDetent} from "./week-detents.ts";
test("detent tops follow the board proportions and stay ordered",()=>{
 const t=detentTops(874,126);
 assert.equal(t.peek,690);assert.equal(t.half,411);assert.equal(t.full,132);
 const small=detentTops(500,140);
 assert.ok(small.full<small.half&&small.half<small.peek);
});
test("release settles by position and velocity, and the sheet rubber-bands at the ends",()=>{
 const t=detentTops(874,126);
 assert.equal(nearestDetent(420,0,t),"half");
 assert.equal(nearestDetent(420,-1.2,t),"full");
 assert.equal(nearestDetent(420,1.2,t),"peek");
 assert.equal(nearestDetent(NaN,0,t),"half");
 assert.ok(followTop(t.full,-100,t)>t.full-31);
 assert.equal(followTop(t.half,10,t),t.half+10);
});
