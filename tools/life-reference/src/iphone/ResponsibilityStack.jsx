import React, { useEffect, useRef, useState } from 'react';
import { allocated, hours } from '../model.js';

function Card({role,week,order,active,editing,reveal,onReveal,onSelect,onManage,onDelete,onEdit,hidden=false,detailsId,day}) {
  const ref=useRef(null),gesture=useRef(null),hold=useRef(null),suppress=useRef(false);
  const displayHours=day===undefined?week.budgets[role.id]:(week.allocations[role.id][day]||0),reserved=day===undefined?allocated(week,role.id):displayHours;
  const offset=reveal==='manage'?-92:reveal==='delete'?92:0;
  useEffect(()=>()=>clearTimeout(hold.current),[]);
  function cancel(){clearTimeout(hold.current);gesture.current=null;ref.current?.style.removeProperty('transition');if(ref.current)ref.current.style.transform=`translateX(${offset}px)`;}
  function settle(event){clearTimeout(hold.current);const start=gesture.current;gesture.current=null;if(!start||start.pointer!==event.pointerId)return;if(start.horizontal){suppress.current=true;const next=start.base+event.clientX-start.x;onReveal(next<-42?'manage':next>42?'delete':null);ref.current.style.removeProperty('transition');ref.current.style.transform=`translateX(${next<-42?-92:next>42?92:0}px)`;}}
  return <div aria-hidden={hidden} inert={hidden} data-away={hidden} className={`ip-card-slot ${active?'ip-slot-selected':''}`} style={{'--role':role.color,'--card-index':order,transform:`translateY(calc(${order} * 52px * var(--ip-text-scale,1)))`}}>
    <div className="ip-swipe-actions"><button className="ip-swipe-delete" aria-label={`Delete ${role.name}`} aria-hidden={reveal!=='delete'} tabIndex={reveal==='delete'?0:-1} onClick={()=>{onReveal(null);onDelete(role);}}><img src="/icons/icon-trash.svg" alt=""/><span>Delete</span></button><button className="ip-swipe-manage" aria-label={`Manage ${role.name}`} aria-hidden={reveal!=='manage'} tabIndex={reveal==='manage'?0:-1} onClick={()=>{onReveal(null);onManage(role);}}><img src="/icons/icon-edit.svg" alt=""/><span>Manage</span></button></div>
    <button ref={ref} data-testid={`ip-card-${role.id}`} className={`ip-wallet-card ${active?'ip-selected':''}`} style={{transform:`translateX(${offset}px)`}} aria-expanded={active} aria-controls={detailsId} onClick={()=>{if(suppress.current){suppress.current=false;return;}onSelect(role.id);}} onContextMenu={e=>{e.preventDefault();onEdit?.(role.id);}} onKeyDown={e=>{if(editing&&['ArrowLeft','ArrowRight','Escape'].includes(e.key)){e.preventDefault();onReveal(e.key==='ArrowLeft'?'manage':e.key==='ArrowRight'?'delete':null);}}} onPointerDown={e=>{if(!e.isPrimary)return;suppress.current=false;gesture.current={x:e.clientX,y:e.clientY,pointer:e.pointerId,base:offset,horizontal:false};if(!editing&&onEdit)hold.current=setTimeout(()=>{suppress.current=true;onEdit(role.id);},550);}} onPointerMove={e=>{const start=gesture.current;if(!start||start.pointer!==e.pointerId)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.max(Math.abs(dx),Math.abs(dy))>9)clearTimeout(hold.current);if(!editing)return;if(!start.horizontal&&Math.abs(dx)>9&&Math.abs(dx)>Math.abs(dy)*1.5){start.horizontal=true;e.currentTarget.setPointerCapture(e.pointerId);}if(start.horizontal){e.currentTarget.style.transition='none';e.currentTarget.style.transform=`translateX(${Math.max(-110,Math.min(110,start.base+dx))}px)`;}}} onPointerUp={settle} onPointerCancel={cancel}>
      <div className="ip-card-header"><img src={`/icons/icon-${role.icon}.svg`} alt="" width={30} height={30}/><strong>{role.name}</strong>{week.priority?.roleId===role.id&&<span className="ip-priority-pill">Priority</span>}<span className="ip-card-hours">{hours(displayHours)}</span><span aria-hidden="true" className={`ip-chevron ip-${active?'up':'down'}`}/></div>
      <div className="ip-card-face"><p>{role.description}</p><div><span>{hours(reserved)} reserved</span><span>{week.tasks.filter(t=>t.role===role.id&&!t.done&&(day===undefined||t.day===day)).length} open tasks</span></div><div className="ip-role-progress"><span style={{background:role.color,width:`${displayHours?reserved/displayHours*100:0}%`}}/></div></div>
    </button>
  </div>;
}
export default function ResponsibilityStack({roles,week,selected,editing,onSelect,onManage,onDelete,onEdit,focusOnly=false,detailsId="ip-responsibility-details",day}) {
  const [reveal,setReveal]=useState(null);
  useEffect(()=>setReveal(null),[editing,selected]);
  const ordered=[...roles].sort((a,b)=>(b.id===week.priority?.roleId?1:0)-(a.id===week.priority?.roleId?1:0));
  const chosen=ordered.findIndex(r=>r.id===selected),expanded=chosen>=0;
  return <div className="ip-wallet ip-editable-wallet" data-expanded={expanded} data-editing={editing} data-focus={focusOnly&&expanded} style={{height:`calc(${focusOnly&&expanded?162:Math.max(0,roles.length-1)*52+(expanded?162:144)}px * var(--ip-text-scale,1))`}} aria-label="Responsibility card stack">
    {ordered.map((role,i)=><Card key={role.id} role={role} week={week} order={focusOnly&&expanded?0:expanded?(role.id===selected?roles.length-1:i<chosen?i:i-1):i} active={role.id===selected} hidden={focusOnly&&expanded&&role.id!==selected} detailsId={detailsId} day={day} editing={editing} reveal={reveal?.id===role.id?reveal.action:null} onReveal={action=>setReveal(action?{id:role.id,action}:null)} onSelect={onSelect} onManage={onManage} onDelete={onDelete} onEdit={onEdit}/>)}
  </div>;
}
