// Deliberately independent sample state. Never imports the production planner store.
export const ROLES = [
  { id: 'work', name: 'Work', color: '#34C759', icon: 'category-work', description: 'Do good work. Leave room for life.', budget: 12 },
  { id: 'family', name: 'Family', color: '#AF52DE', icon: 'category-family', description: 'Be there for the people who matter.', budget: 6 },
  { id: 'home', name: 'Home', color: '#FF9500', icon: 'category-home', description: 'Make your everyday a little lighter.', budget: 4 },
  { id: 'health', name: 'Health', color: '#30B0C7', icon: 'category-health', description: 'Take care of the person doing it all.', budget: 5 },
];
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export function iso(date) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function monday(date = new Date()) { const d = new Date(date); d.setHours(12,0,0,0); d.setDate(d.getDate() - (d.getDay()+6)%7); return iso(d); }
export function addDays(key, count) { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate()+count); return iso(d); }
export function formatDate(key, options) { return new Date(`${key}T12:00:00`).toLocaleDateString('en-US', options); }
export function weekLabel(key) { return `${formatDate(key,{month:'short',day:'numeric'})} – ${formatDate(addDays(key,6),{month:'short',day:'numeric'})}`; }
export const hours = value => `${Number(value.toFixed(2))}h`;
export function allocated(week, roleId) { return Object.values(week.allocations[roleId]).reduce((a,b)=>a+b,0); }
export function emptyWeek() { return { budgets: Object.fromEntries(ROLES.map(r=>[r.id,r.budget])), capacity: 36, allocations: Object.fromEntries(ROLES.map(r=>[r.id,{}])), tasks: [] }; }
export function seedWeek() {
  const w = emptyWeek();
  w.allocations = { work: {0:3,1:3,3:2}, family: {2:1,4:2,6:1}, home: {5:2,6:1}, health: {0:1,2:1,4:1,5:1} };
  w.tasks = [
    ['w1','work','Shape the next release',0,90,'Start with the smallest complete improvement.'],
    ['w2','work','Review the design direction',3,60,'Bring the open questions, then decide what to simplify.'],
    ['w3','work','Write the weekly update',null,30,'A few clear sentences are enough.'],
    ['f1','family','Dinner together',4,90,'Phones away. Try that new pasta recipe.'],
    ['f2','family','Call Mom',2,30,'Ask about her garden.'],
    ['f3','family','Plan a slow Sunday',6,60,'A walk, a coffee, and nowhere to rush.'],
    ['h1','home','Reset the house',5,60,'Laundry, fresh sheets, clear the kitchen.'],
    ['h2','home','Plan meals for next week',null,30,'Keep it simple. Use what is already in the fridge.'],
    ['b1','health','Get outside for a walk',0,45,'Leave a little space between work and home.'],
    ['b2','health','Strength and a stretch',4,60,'Focus on feeling better, not doing more.'],
  ].map(([id,role,title,day,minutes,notes])=>({id,role,title,day,minutes,notes,done:false}));
  return w;
}
export function initialState() { const key = monday(); return { version:1, currentWeek:key, view:'Responsibilities', selected:'family', day:(new Date().getDay()+6)%7, crown:'right', theme:'light', weeks:{[key]:seedWeek()} }; }
export function setBudget(week, role, value) {
  const min=allocated(week,role), other=Object.values(week.budgets).reduce((a,b)=>a+b,0)-week.budgets[role];
  if (!Number.isFinite(value) || value<min || value+other>week.capacity || value<0) return null;
  return {...week,budgets:{...week.budgets,[role]:Math.round(value*2)/2}};
}
export function setAllocation(week, role, day, value) {
  const old=week.allocations[role][day]||0;
  if (!Number.isFinite(value) || value<0 || allocated(week,role)-old+value>week.budgets[role]) return null;
  // Reserved hours cannot disappear underneath a placed task.
  if (value===0 && week.tasks.some(t=>t.role===role && t.day===day)) return null;
  return {...week,allocations:{...week.allocations,[role]:{...week.allocations[role],[day]:Math.round(value*2)/2}}};
}
export function validateTask(week, task) {
  if (!task.title.trim()) return 'Give the task a name.';
  if (!Number.isFinite(task.minutes) || task.minutes<15 || task.minutes>480) return 'Choose an estimate between 15 and 480 minutes.';
  if (task.day!==null && !(week.allocations[task.role][task.day]>0)) return 'Reserve hours for this responsibility on that day first.';
  return null;
}
