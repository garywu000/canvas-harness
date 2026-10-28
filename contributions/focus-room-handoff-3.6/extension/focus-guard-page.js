/* Canvas Harness distraction guard: the reminder on a site from the student's own list while a focus session runs.
   background.js adds this script only to those sites and only during a session (focus-guard-model.js has the rules).
   It covers the page and holds its sound and video until the session ends or is paused, or for five minutes when the
   student chooses to continue. It reads the session record and nothing on the page, and sends nothing anywhere.
   Gary: in Strict focus there is no five-minute pass. "Back to Canvas" shows the Canvas tab, and holding "End Strict
   focus" for three seconds ends it (RELEASE_KEY), the deliberate way out. */
(function(root){
 'use strict';
 // Added a second time (a page that was already open when a session started): look again instead.
 if(typeof root.__reserveFocusGuard==='function'){root.__reserveFocusGuard();return;}
 const G=root.ReserveFocusGuardModel,doc=root.document;
 if(!G||root.top!==root||!root.chrome?.storage?.local||!doc)return;
 const local=()=>root.chrome.storage.local;
 let host=null,parts=null,site='',timer=0,overflow=null,observer=null,until=0,strict=false;
 const HOLD_MS=3000;

 async function check(){
  let got;
  try{got=await local().get([G.KEY,G.SNOOZE_KEY,G.RELEASE_KEY,'reserve:sites']);}catch{hide();return;}   // the extension was reloaded
  const now=Date.now(),rec=G.cleanRecord(got[G.KEY]);
  const st=G.status(rec,root.location.href,{now,snooze:G.cleanSnooze(got[G.SNOOZE_KEY],now),protect:Array.isArray(got['reserve:sites'])?got['reserve:sites']:[],released:Number(got[G.RELEASE_KEY])||0});
  clearTimeout(timer);timer=0;
  if(st.blocked)show(rec,st.site,st.strict);else hide();
  if(st.wake>now)timer=setTimeout(check,Math.min(st.wake-now+250,2147483647));
 }

 /* ---- the reminder ---- */
 const STYLE=`:host{color-scheme:light dark}
.wrap{position:fixed;inset:0;display:grid;place-items:center;padding:24px;overflow:auto;background:#F3F1EA;color:#1F1E1B;font:15px/1.5 "Segoe UI",system-ui,-apple-system,sans-serif;text-align:center}
@media (prefers-color-scheme:dark){.wrap{background:#15171c;color:#F7F5EF}}
.card{max-width:460px;display:grid;gap:14px;justify-items:center}
.eyebrow{margin:0;font:600 11px/1 "Segoe UI",system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.62}
h1{margin:0;font:500 clamp(26px,4.4vw,36px)/1.2 "Literata",Georgia,serif;text-wrap:balance}
.goal{margin:0;font-size:17px;font-style:italic}
.why{margin:0;opacity:.72;font-size:14px}
button{margin-top:6px;font:600 14px/1 "Segoe UI",system-ui,sans-serif;padding:11px 18px;border-radius:11px;border:1px solid rgb(127 127 127/.38);background:transparent;color:inherit;cursor:pointer}
button:hover{background:rgb(127 127 127/.12)}
button:focus-visible{outline:2px solid #C96442;outline-offset:2px}
.row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.hold{position:relative;overflow:hidden}
.hold i{position:absolute;inset:0;width:0;background:rgb(201 100 66/.28);pointer-events:none}
.hold[data-holding] i{width:100%;transition:width 3000ms linear}
.hint{margin:0;font-size:12px;opacity:.6}
[hidden]{display:none}`;
 function build(){
  host=doc.createElement('reserve-focus-guard');
  const fixed='all:initial;position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;padding:0;border:0;display:block;z-index:2147483647;background:transparent;overflow:hidden';
  for(const rule of fixed.split(';')){const i=rule.indexOf(':');host.style.setProperty(rule.slice(0,i),rule.slice(i+1),'important');}
  host.setAttribute('popover','manual');
  const shadow=host.attachShadow({mode:'closed'}),style=doc.createElement('style');style.textContent=STYLE;
  const wrap=doc.createElement('div');wrap.className='wrap';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-labelledby','fg-title');
  const card=doc.createElement('div');card.className='card';
  const line=(tag,cls)=>{const el=doc.createElement(tag);if(cls)el.className=cls;card.append(el);return el;};
  line('p','eyebrow').textContent='Canvas Harness · Focus';
  const title=line('h1');title.id='fg-title';
  parts={title,goal:line('p','goal'),why:line('p','why'),button:line('button'),row:line('div','row'),hint:line('p','hint')};
  parts.button.type='button';parts.button.textContent='Continue anyway for 5 minutes';
  parts.button.addEventListener('click',pass);
  // Strict focus: back to Canvas, or the deliberate way out.
  const back=doc.createElement('button'),end=doc.createElement('button');back.type=end.type='button';
  back.textContent='Back to Canvas';end.className='hold';const label=doc.createElement('span');label.textContent='Hold to end Strict focus';end.append(doc.createElement('i'),label);
  back.addEventListener('click',()=>{try{root.chrome.runtime.sendMessage({type:'ch-focus-guard',op:'back'},()=>{void root.chrome.runtime.lastError;});}catch{}});
  holdToEnd(end);parts.row.append(back,end);parts.back=back;
  parts.hint.textContent='Press and hold for 3 seconds. It ends Strict focus for this session; your timer keeps going.';
  wrap.append(card);shadow.append(style,wrap);
 }
 async function pass(){
  try{const got=await local().get(G.SNOOZE_KEY);await local().set({[G.SNOOZE_KEY]:G.snooze(got[G.SNOOZE_KEY],site,Date.now())});}catch{hide();return;}
  check();
 }
 // Press and hold (pointer, or Enter / Space) for three seconds; letting go early does nothing.
 function holdToEnd(button){
  let wait=0;
  const stop=()=>{clearTimeout(wait);wait=0;delete button.dataset.holding;};
  const start=()=>{if(wait)return;button.dataset.holding='';wait=setTimeout(async()=>{stop();try{await local().set({[G.RELEASE_KEY]:until});}catch{}check();},HOLD_MS);};
  button.addEventListener('pointerdown',start);for(const type of ['pointerup','pointerleave','pointercancel','blur'])button.addEventListener(type,stop);
  button.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();start();}});
  button.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' ')stop();});
 }
 function show(rec,matched,isStrict){
  if(!host)build();
  site=matched;until=rec.until;strict=isStrict;
  const time=new Date(rec.until).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}).replace(/\s/g,'\u00a0');
  parts.title.textContent=rec.open?'You’re in an open focus session':`You’re focusing until ${time}`;
  parts.goal.textContent=rec.goal?`“${rec.goal}”`:'';parts.goal.hidden=!rec.goal;
  parts.why.textContent=strict?`Strict focus: only Canvas and the sites you allowed open until then. ${matched} opens again when the session ends.`:`${matched} is on your distraction list. It opens again when the session ends or you pause it.`;
  parts.button.hidden=strict;parts.row.hidden=parts.hint.hidden=!strict;
  const first=!host.isConnected;
  attach();
  if(first){
   if(overflow===null){overflow=doc.documentElement.style.overflow;doc.documentElement.style.setProperty('overflow','hidden','important');}
   for(const media of doc.querySelectorAll('video,audio'))try{media.pause();}catch{}
   doc.addEventListener('play',hold,true);
   for(const type of ['keydown','keypress','keyup'])root.addEventListener(type,quiet,true);
   observer=observer||new MutationObserver(()=>{if(host&&!host.isConnected)attach();});
   observer.observe(doc.documentElement,{childList:true});
   (strict?parts.back:parts.button).focus({preventScroll:true});
  }
 }
 // On top of everything the page draws, and put back if the page removes it.
 function attach(){
  if(!host.isConnected)(doc.documentElement||doc).append(host);
  try{if(!host.matches(':popover-open'))host.showPopover();}catch{}
 }
 function hide(){
  if(!host||!host.isConnected)return;
  observer?.disconnect();
  try{host.hidePopover();}catch{}
  host.remove();
  doc.removeEventListener('play',hold,true);
  for(const type of ['keydown','keypress','keyup'])root.removeEventListener(type,quiet,true);
  if(overflow!==null){doc.documentElement.style.overflow=overflow;overflow=null;}
 }
 // While the reminder is up, the page plays nothing and hears no keys (its shortcuts would start a video).
 function hold(event){if(host?.isConnected&&typeof event.target?.pause==='function')event.target.pause();}
 function quiet(event){if(host?.isConnected&&!event.composedPath().includes(host)&&event.key!=='Tab')event.stopImmediatePropagation();}

 root.__reserveFocusGuard=check;
 try{root.chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes[G.KEY]||changes[G.SNOOZE_KEY]||changes[G.RELEASE_KEY]||changes['reserve:sites']))check();});}catch{}
 check();
})(globalThis);
