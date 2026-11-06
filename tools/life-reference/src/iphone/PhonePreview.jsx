import React, { useEffect, useState } from 'react';
import IPhoneApp from './IPhoneApp';
import './iphone.css';

const devices = [
  {name:'Compact',width:375,height:812},
  {name:'Standard',width:390,height:844},
  {name:'Large',width:430,height:932},
];
export default function PhonePreview() {
  const [wide,setWide]=useState(()=>matchMedia('(min-width: 760px)').matches);
  const [device,setDevice]=useState(1), [appearance,setAppearance]=useState('light');
  const [fit,setFit]=useState(true),[viewportHeight,setViewportHeight]=useState(innerHeight);
  useEffect(()=>{const query=matchMedia('(min-width: 760px)');const onChange=()=>setWide(query.matches);query.addEventListener('change',onChange);return()=>query.removeEventListener('change',onChange);},[]);
  useEffect(()=>{document.title='Spread · iPhone study';},[]);
  useEffect(()=>{const resize=()=>setViewportHeight(innerHeight);addEventListener('resize',resize);return()=>removeEventListener('resize',resize);},[]);
  if(location.pathname==='/iphone/app'||!wide)return <IPhoneApp/>;
  const size=devices[device];
  const scale=fit?Math.min(1,Math.max(.35,(viewportHeight-170)/(size.height+18))):1;
  return <div className="ip-preview">
    <header className="ip-preview-header"><a className="ip-preview-brand" href="/"><img src="/icons/app-icon-spread-cards-square.svg" alt=""/>Spread</a><span>iPhone interaction study</span><a href="/">Open desktop prototype</a></header>
    <main className="ip-preview-stage">
      <aside className="ip-preview-notes"><p className="ip-study-label">Made for your hand</p><h1>The same calm.<br/>A closer connection.</h1><p>Less chrome. More of your week. Tap a responsibility, shape its hours, and make room on a real day.</p><div className="ip-preview-controls"><label>Phone size<select value={device} onChange={e=>setDevice(Number(e.target.value))}>{devices.map((d,i)=><option value={i} key={d.name}>{d.name} · {d.width} × {d.height}</option>)}</select></label><div className="ip-preview-appearance" aria-label="Preview appearance">{['light','dark'].map(mode=><button key={mode} aria-pressed={appearance===mode} onClick={()=>setAppearance(mode)}>{mode==='light'?'Light':'Dark'}</button>)}</div></div><p className="ip-preview-caption">An interactive browser prototype. Native sheets, haptics and device performance still need an iPhone pass.</p><a href="/iphone/app">Open phone view directly</a></aside>
      <div className="ip-device-column"><div className="ip-device-space" style={{'--phone-width':`${size.width}px`,'--phone-height':`${size.height}px`,'--preview-scale':scale}}><div className="ip-device"><div className="ip-device-island" aria-hidden="true"/><iframe title="Interactive Spread iPhone prototype" key={`${device}-${appearance}`} src={`/iphone/app?appearance=${appearance}&framed=1`}/></div></div><button className="ip-fit-control" aria-pressed={fit} onClick={()=>setFit(!fit)}>{fit?'Fit to window · show actual size':'Actual size · fit to window'}</button></div>
      <div className="ip-preview-right"><span>01 / Life</span><p>A familiar card.<br/>Its own space beneath.</p><span>02 / Hours</span><p>Give time a place.<br/>Keep a little in reserve.</p><span>03 / Week</span><p>One day in focus.<br/>The week within reach.</p></div>
    </main>
  </div>;
}
