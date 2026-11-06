import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monday, addDays, seedWeek, allocated, setBudget, setAllocation, validateTask } from '../src/model.js';
test('calendar crosses months and years without mutating its input',()=>{assert.equal(addDays('2026-12-28',7),'2027-01-04');assert.equal(monday(new Date(2026,10,8,12)),'2026-11-02');});
test('budget cannot consume more capacity or strand reserved hours',()=>{const w=seedWeek();assert.equal(allocated(w,'work'),8);assert.equal(setBudget(w,'work',7.5),null);assert.equal(setBudget(w,'work',22),null);assert.equal(setBudget(w,'work',12.5).budgets.work,12.5);assert.equal(w.budgets.work,12);});
test('placing and returning hours conserves the bank',()=>{const w=seedWeek();const placed=setAllocation(w,'family',0,1);assert.equal(allocated(placed,'family'),5);const returned=setAllocation(placed,'family',0,0);assert.equal(allocated(returned,'family'),4);assert.equal(setAllocation(w,'family',0,2.5),null);assert.equal(setAllocation(w,'family',0,-.5),null);});
test('cannot remove last reservation from a day containing a task',()=>{assert.equal(setAllocation(seedWeek(),'family',4,0),null);});
test('task scheduling requires its own responsibility hours',()=>{const w=seedWeek(), t={title:'Call',role:'family',day:0,minutes:30};assert.match(validateTask(w,t),/Reserve hours/);assert.equal(validateTask(w,{...t,day:4}),null);assert.equal(validateTask(w,{...t,day:null}),null);assert.match(validateTask(w,{...t,title:' '}),/name/);assert.match(validateTask(w,{...t,minutes:0}),/estimate/);});
