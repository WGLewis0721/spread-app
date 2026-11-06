import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWeek, allocated } from '../src/model.js';
import { visibleRoles, manageRole, deleteRole, markPriority, priorityPlan, editHistory, stepHistory } from '../src/iphone/planning.js';
test('priority uses only unassigned time and reaches its reserved-hour goal on eligible days',()=>{
  const before=seedWeek(),priority=markPriority(before,'family',8),plan=priorityPlan(priority,4);
  assert.equal(plan.funding,2);assert.equal(plan.additional,4);assert.equal(plan.next.budgets.family,8);assert.equal(allocated(plan.next,'family'),8);
  assert.ok(plan.slots.every(s=>s.day>=4));assert.equal(plan.slots.reduce((n,s)=>n+s.hours,0),4);
  assert.deepEqual(plan.next.allocations.work,before.allocations.work);assert.deepEqual(plan.next.tasks,before.tasks);assert.equal(before.budgets.family,6);
});
test('priority refuses a goal that would exceed capacity, never borrows from another responsibility',()=>{
  const week=markPriority({...seedWeek(),capacity:27},'family',8);const result=priorityPlan(week);
  assert.match(result.error,/only 0h/);assert.equal(result.next,undefined);assert.equal(week.budgets.work,12);
});
test('existing priority bank is used first and fulfilled goals produce no additions',()=>{
  let week=markPriority(seedWeek(),'family',6),plan=priorityPlan(week);assert.equal(plan.funding,0);assert.equal(plan.additional,2);
  plan=priorityPlan(plan.next);assert.equal(plan.additional,0);assert.deepEqual(plan.slots,[]);
  assert.equal(markPriority(week,'family',8.25),null);assert.equal(markPriority(week,'family',NaN),null);
});
test('manage validates identity and never changes the shared default roles',()=>{
  const before=seedWeek();const changed=manageRole(before,'family',{name:'  People I love  ',color:'#007AFF',icon:'category-personal'});
  assert.equal(visibleRoles(changed)[1].name,'People I love');assert.equal(visibleRoles(before)[1].name,'Family');assert.equal(manageRole(before,'family',{name:' ',color:'#007AFF',icon:'category-personal'}),null);
});
test('deletion releases budget and removes only this week’s associated tasks, reservations and priority',()=>{
  const before=markPriority(seedWeek(),'family',8),after=deleteRole(before,'family');assert.equal(visibleRoles(after).length,3);assert.equal(after.budgets.family,0);assert.equal(allocated(after,'family'),0);assert.equal(after.priority,null);assert.ok(after.tasks.every(t=>t.role!=='family'));assert.equal(before.tasks.length,10);
});
test('edit undo and redo restore complete snapshots, invalidate redo after a new edit, refuse stale state',()=>{
  const before=markPriority(seedWeek(),'family',8),after=deleteRole(before,'family');let history=editHistory({past:[],future:[]},before,after,'delete Family','family','work');
  const undo=stepHistory(history,after,'undo');assert.equal(undo.week,before);assert.equal(undo.selected,'family');assert.equal(undo.history.future.length,1);
  const redo=stepHistory(undo.history,before,'redo');assert.equal(redo.week,after);assert.equal(redo.selected,'work');
  assert.equal(stepHistory(history,{...after},'undo'),null);
  history=editHistory(undo.history,before,{...before},'another edit','family');assert.equal(history.future.length,0);
});
