import {useEffect,useRef} from 'react';
import {removeFile} from './task-media';
export function useMediaSession(task){
  const added=useRef(new Set()),committed=useRef(false),disposed=useRef(false);
  useEffect(()=>()=>{disposed.current=true;if(!committed.current)for(const id of added.current)removeFile(id).catch(()=>{});},[]);
  return {record(meta){if(disposed.current){removeFile(meta.id).catch(()=>{});return false;}added.current.add(meta.id);return true;},commit(attachments){committed.current=true;const keep=new Set(attachments.map(a=>a.id));/* Retain previously saved media so task Undo can restore it. */for(const id of added.current)if(!keep.has(id))removeFile(id).catch(()=>{});}};
}
