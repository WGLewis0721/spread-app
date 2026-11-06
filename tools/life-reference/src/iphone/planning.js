import { ROLES, allocated } from '../model.js';

export const ROLE_PALETTE = ['#34C759','#FF9500','#007AFF','#FF2D55','#AF52DE','#64D2FF','#5856D6','#30B0C7'];
export const ROLE_ICONS = ['work','family','home','health','fitness','personal','project','school','business','church'];
export function visibleRoles(week) {
  return ROLES.filter(role=>!(week.deletedRoles||[]).includes(role.id)).map(role=>({...role,...week.roleEdits?.[role.id]}));
}
export function manageRole(week,id,changes) {
  if (!visibleRoles(week).some(r=>r.id===id)) return null;
  const name=changes.name?.trim();
  if (!name || name.length>40 || !ROLE_PALETTE.includes(changes.color) || !ROLE_ICONS.some(icon=>`category-${icon}`===changes.icon)) return null;
  return {...week,roleEdits:{...week.roleEdits,[id]:{name,color:changes.color,icon:changes.icon}}};
}
export function deleteRole(week,id) {
  if(!visibleRoles(week).some(r=>r.id===id))return null;
  return {...week,deletedRoles:[...(week.deletedRoles||[]),id],budgets:{...week.budgets,[id]:0},allocations:{...week.allocations,[id]:{}},tasks:week.tasks.filter(t=>t.role!==id),priority:week.priority?.roleId===id?null:week.priority};
}
export function markPriority(week,id,targetHours=week.budgets[id]+2) {
  if (!visibleRoles(week).some(r=>r.id===id) || !Number.isFinite(targetHours) || targetHours<.5 || targetHours>168 || targetHours*2%1) return null;
  return {...week,priority:{roleId:id,targetHours}};
}
export function priorityPlan(week,firstDay=0) {
  const priority=week.priority;
  if(!priority||!visibleRoles(week).some(r=>r.id===priority.roleId))return {error:'Choose a weekly priority first.'};
  const {roleId,targetHours}=priority;
  if(!Number.isFinite(targetHours)||targetHours<.5||targetHours>168||targetHours*2%1)return {error:'Choose a goal in half-hour steps.'};
  const reserved=allocated(week,roleId), additional=Math.max(0,targetHours-reserved);
  const total=Object.values(week.budgets).reduce((n,v)=>n+v,0), funding=Math.max(0,targetHours-week.budgets[roleId]), unassigned=week.capacity-total;
  if(funding>unassigned)return {error:`This goal needs ${funding}h more in its budget; only ${unassigned}h is unassigned. Lower the goal or adjust your hours.`,funding,unassigned,slots:[]};
  const allocations={...week.allocations[roleId]}, slots={};
  const start=Math.max(0,Math.min(6,firstDay));
  for(let n=0;n<additional*2;n++) {
    let lightest=start,minimum=Infinity;
    for(let day=start;day<7;day++) {
      const load=Object.entries(week.allocations).reduce((sum,[id,days])=>sum+(id===roleId?(allocations[day]||0):(days[day]||0)),0);
      if(load<minimum){minimum=load;lightest=day;}
    }
    allocations[lightest]=(allocations[lightest]||0)+.5;
    slots[lightest]=(slots[lightest]||0)+.5;
  }
  return {additional,funding,unassigned,slots:Object.entries(slots).map(([day,hours])=>({day:Number(day),hours})),next:{...week,budgets:{...week.budgets,[roleId]:Math.max(week.budgets[roleId],targetHours)},allocations:{...week.allocations,[roleId]:allocations}}};
}
export function editHistory(history,before,after,label,beforeSelected,afterSelected=beforeSelected) {
  return {past:[...history.past,{before,after,label,beforeSelected,afterSelected}].slice(-30),future:[]};
}
export function stepHistory(history,week,direction) {
  const source=direction==='undo'?history.past:history.future,entry=source.at(-1);
  if(!entry)return null;
  if(week!==(direction==='undo'?entry.after:entry.before))return null;
  return direction==='undo'
    ? {week:entry.before,selected:entry.beforeSelected,label:`Undid ${entry.label}`,history:{past:history.past.slice(0,-1),future:[...history.future,entry]}}
    : {week:entry.after,selected:entry.afterSelected,label:`Redid ${entry.label}`,history:{past:[...history.past,entry],future:history.future.slice(0,-1)}};
}
