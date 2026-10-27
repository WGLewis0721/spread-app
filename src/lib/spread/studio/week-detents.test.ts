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
