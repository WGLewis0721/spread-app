import { addDays, monday } from '../model.js';
export function angleDelta(from,to){return ((to-from+540)%360)-180;}
export function pointerAngle(x,y,cx,cy){return Math.atan2(y-cy,x-cx)*180/Math.PI;}
export function capacityAfter(week,delta){const assigned=Object.values(week.budgets).reduce((a,b)=>a+b,0);return Math.min(168,Math.max(assigned,week.capacity+delta));}
export function monthCells(dateKey){const date=new Date(`${dateKey}T12:00:00`);date.setDate(1);const first=monday(date);return Array.from({length:42},(_,i)=>addDays(first,i));}
export function shiftMonth(key,delta){const d=new Date(`${key}T12:00:00`),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+delta);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function outlinePrefix(value){const m=/^([IVX]+|[A-Z])\.\s$/.exec(value);if(!m)return null;const roman=/^[IVX]+$/.test(m[1]);let romanValue=0,previous=0;if(roman)for(const letter of [...m[1]].reverse()){const n={I:1,V:5,X:10}[letter];romanValue+=n<previous?-n:n;previous=Math.max(previous,n);}return {type:roman?'I':'A',start:roman?romanValue:m[1].charCodeAt(0)-64};}
