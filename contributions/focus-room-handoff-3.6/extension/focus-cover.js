/* Gary: Strict focus, the page a new tab becomes during a Strict focus session (focus-cover.html, opened by
   background.js). It reads the session record, shows until when it runs, and offers "Back to Canvas" and the deliberate
   way out: holding "End Strict focus" for three seconds writes RELEASE_KEY. When the session ends, or Strict focus is
   ended, it says so and the tab is free again. It reads nothing else and sends nothing anywhere. */
(function(root){
 'use strict';
 const G=root.ReserveFocusGuardModel,$=id=>document.getElementById(id),local=()=>root.chrome?.storage?.local;
 const HOLD_MS=3000;
 let until=0,timer=0;
 if(!G||!local())return;
 async function check(){
  let got;try{got=await local().get([G.KEY,G.RELEASE_KEY]);}catch{return;}
  const rec=G.cleanRecord(got[G.KEY]),live=rec.strict&&G.active(rec,{released:Number(got[G.RELEASE_KEY])||0});
  clearTimeout(timer);timer=0;until=rec.until;
  if(!live){
   $('title').textContent='Strict focus is over';$('goal').hidden=true;
   $('why').textContent='This tab is free again. Type an address above, or close it.';$('actions').hidden=$('hint').hidden=true;
   document.title='New tab';return;
  }
  const time=new Date(rec.until).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}).replace(/\s/g,' ');
  $('title').textContent=rec.open?'You’re in an open focus session':`You’re focusing until ${time}`;
  $('goal').textContent=rec.goal?`“${rec.goal}”`:'';$('goal').hidden=!rec.goal;
  $('actions').hidden=$('hint').hidden=false;
  timer=setTimeout(check,Math.min(rec.until-Date.now()+250,2147483647));
 }
 $('back').addEventListener('click',()=>{try{root.chrome.runtime.sendMessage({type:'ch-focus-guard',op:'back'},()=>{void root.chrome.runtime.lastError;});}catch{}});
 // Press and hold (pointer, or Enter / Space) for three seconds; letting go early does nothing.
 const end=$('end');let wait=0;
 const stop=()=>{clearTimeout(wait);wait=0;delete end.dataset.holding;};
 const start=()=>{if(wait||!until)return;end.dataset.holding='';wait=setTimeout(async()=>{stop();try{await local().set({[G.RELEASE_KEY]:until});}catch{}check();},HOLD_MS);};
 end.addEventListener('pointerdown',start);for(const type of ['pointerup','pointerleave','pointercancel','blur'])end.addEventListener(type,stop);
 end.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();start();}});
 end.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' ')stop();});
 try{root.chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes[G.KEY]||changes[G.RELEASE_KEY]))check();});}catch{}
 check();$('back').focus();
})(globalThis);
