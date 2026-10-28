# Local host integration excerpts

These are exact excerpts from Gary Edition 3.5.1, for porting rather than replacing current upstream host files. The room also uses generic host services (UI escaping/date helpers, course art, site support checks, the store, Planner, Review deck and Biscuit) from the host application. Preserve current upstream equivalents. Source line numbers refer to this snapshot.

## extension/background.js (local lines 120–250)

```js
 // The focus room's distraction guard (focus-guard-model.js). The room copies a running session to its own key; while
 // it runs, the reminder (focus-guard-page.js) is added to the sites on the student's list and nowhere else, and only
 // once the student has allowed access to other websites by switching the guard on. Canvas and the school's own
 // sites are left out. Pages already open on those sites get it when a session starts.
 // Gary: Strict focus covers every http and https page except the allowed sites (with the extra access it asks for:
 // all http sites and "tabs", to see and cover new tabs), turns a new tab into the reminder page (focus-cover.html),
 // and keeps the window it started in full screen until the session ends or the student ends Strict focus.
 const Guard=globalThis.ReserveFocusGuardModel,GUARD_ID='ch-focus-guard',GUARD_FILES=['site.js','focus-guard-model.js','focus-guard-page.js'];
 const ALL_SITES={permissions:['scripting'],origins:['https://*/*']};
 const STRICT_SITES={permissions:['scripting','tabs'],origins:['https://*/*','http://*/*']};
 const STRICT_LOCK='reserve:focusStrictWindow',GUARD_ALARM='ch-focus-guard-end',COVER='focus-cover.html';
 const guardAllowed=(rec)=>chrome.permissions?.contains?chrome.permissions.contains(rec?.strict?STRICT_SITES:ALL_SITES).catch(()=>false):Promise.resolve(false);
 const guardRecord=async()=>Guard.cleanRecord((await chrome.storage.local.get(Guard.KEY))[Guard.KEY]);
 const guardReleased=async()=>Number((await chrome.storage.local.get(Guard.RELEASE_KEY))[Guard.RELEASE_KEY])||0;
 const guardLive=async rec=>Guard.active(rec,{released:await guardReleased()})&&(rec.strict||rec.sites.length>0);
 // Chrome's own new tab page, which no script can be added to.
 const newTab=url=>/^chrome:\/\/(newtab|new-tab-page)\/?$|^chrome-search:\/\/local-ntp/.test(url||'');
 // Adds the reminder to one open tab when it is on a listed site during a session (it checks again itself).
 async function guardTab(tab,rec){
  if(!tab?.id||!(rec.until>Date.now())||!chrome.scripting?.executeScript)return false;
  const url=tab.url||tab.pendingUrl||'';
  if(rec.strict&&newTab(url))return chrome.tabs.update(tab.id,{url:chrome.runtime.getURL(COVER)}).then(()=>true,()=>false);
  if(!url)return false;
  const schools=await grantedSites();if(!Guard.status(rec,url,{protect:schools,released:await guardReleased()}).site)return false;
  return chrome.scripting.executeScript({target:{tabId:tab.id},files:GUARD_FILES}).then(()=>true,()=>false);
 }
 let guardQueue=Promise.resolve();
 const syncGuard=(fresh=false)=>(guardQueue=guardQueue.then(()=>applyGuard(fresh)).catch(()=>{}));
 async function applyGuard(fresh){
  if(!Guard||!chrome.scripting?.registerContentScripts||!chrome.storage?.local)return;
  const rec=await guardRecord();
  const old=await chrome.scripting.getRegisteredContentScripts({ids:[GUARD_ID]}).catch(()=>[]);
  if(old.some(s=>s.id===GUARD_ID))await chrome.scripting.unregisterContentScripts({ids:[GUARD_ID]}).catch(()=>{});
  if(!await guardLive(rec)||!await guardAllowed(rec)){await unlockWindow();return;}
  const schools=await grantedSites(),both=sites=>Guard.matches(sites).flatMap(m=>[m,m.replace(/^https:/,'http:')]);
  const matches=rec.strict?STRICT_SITES.origins:Guard.matches(rec.sites);
  const excludeMatches=['https://*.instructure.com/*',...schools.map(origin=>origin+'/*'),...(rec.strict?both(rec.allow):[])];
  await chrome.scripting.registerContentScripts([{id:GUARD_ID,matches,excludeMatches,js:GUARD_FILES,runAt:'document_start',allFrames:false,persistAcrossSessions:false}]);
  chrome.alarms?.create?.(GUARD_ALARM,{when:rec.until+500});
  if(rec.strict)await lockWindow(rec);
  if(!fresh||!chrome.tabs?.query)return;
  for(const tab of await chrome.tabs.query(rec.strict?{}:{url:matches}).catch(()=>[]))guardTab(tab,rec);
 }
 // Strict focus keeps one window full screen: the one in use when the session started (where the room is). Leaving
 // full screen puts it back; when the session ends the window goes back to how it was.
 const lockStore=()=>chrome.storage.session||chrome.storage.local;
 async function lockWindow(rec){
  if(!chrome.windows?.update)return;
  const lock=(await lockStore().get(STRICT_LOCK))[STRICT_LOCK];
  if(lock?.until===rec.until){const w=await chrome.windows.get(lock.id).catch(()=>null);if(w&&w.state!=='fullscreen')await chrome.windows.update(w.id,{state:'fullscreen'}).catch(()=>{});return;}
  const w=await chrome.windows.getLastFocused({windowTypes:['normal']}).catch(()=>null);if(!w)return;
  await lockStore().set({[STRICT_LOCK]:{id:w.id,until:rec.until,state:w.state==='fullscreen'?'normal':w.state}});
  if(w.state!=='fullscreen')await chrome.windows.update(w.id,{state:'fullscreen'}).catch(()=>{});
 }
 async function unlockWindow(){
  const lock=(await lockStore().get(STRICT_LOCK).catch(()=>({})))[STRICT_LOCK];if(!lock)return;
  await lockStore().remove(STRICT_LOCK).catch(()=>{});
  const w=await chrome.windows?.get?.(lock.id).catch(()=>null);
  if(w?.state==='fullscreen')await chrome.windows.update(w.id,{state:['normal','maximized','minimized'].includes(lock.state)?lock.state:'normal'}).catch(()=>{});
 }
 chrome.windows?.onBoundsChanged?.addListener(w=>{
  lockStore().get(STRICT_LOCK).then(async got=>{
   const lock=got[STRICT_LOCK];if(!lock||lock.id!==w.id)return;
   const rec=await guardRecord();if(!rec.strict||lock.until!==rec.until||!await guardLive(rec)){unlockWindow();return;}
   const now=await chrome.windows.get(w.id).catch(()=>null);
   if(now&&now.state!=='fullscreen')chrome.windows.update(w.id,{state:'fullscreen'}).catch(()=>{});
  }).catch(()=>{});
 });
 chrome.alarms?.onAlarm?.addListener(a=>{if(a.name===GUARD_ALARM)syncGuard();});
 // A page that finished loading on a listed site gets the reminder even if the registered script missed it (a session
 // that started a moment after the page began loading, or a background that was just woken). In Strict focus a new
 // tab, and any http page, are looked at too.
 chrome.tabs?.onUpdated?.addListener((tabId,info,tab)=>{
  if(!Guard)return;const url=tab?.url||tab?.pendingUrl||'';
  if(!(info.status==='complete'&&/^https?:/.test(url))&&!(newTab(url)&&(info.status||info.url)))return;
  guardRecord().then(async rec=>{if(await guardLive(rec)&&(rec.strict||/^https:/.test(url))&&await guardAllowed(rec))guardTab(tab,rec);}).catch(()=>{});
 });
 // The focus room asks how the guard stands, opens the page where Chrome's access is allowed, and hands over the
 // running session when the stored copy is missing (it never switches the guard off this way).
 chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message?.type!=='ch-focus-guard'||!Guard)return;
  // Gary: "Back to Canvas" on a covered page or the new-tab reminder: show the Canvas tab (the room). Nothing else.
  if(message.op==='back'&&sender.id===chrome.runtime.id){
   (async()=>{
    const patterns=['https://*.instructure.com/*',...(await grantedSites()).map(origin=>origin+'/*')];
    const tabs=(await chrome.tabs.query({url:patterns}).catch(()=>[])).sort((a,b)=>(b.lastAccessed||0)-(a.lastAccessed||0));
    if(tabs[0]){await chrome.tabs.update(tabs[0].id,{active:true}).catch(()=>{});await chrome.windows?.update?.(tabs[0].windowId,{focused:true}).catch(()=>{});return {ok:true};}
    return {ok:false};
   })().then(reply,()=>reply({ok:false}));
   return true;
  }
  if(!canvasSender(sender)){reply({ok:false});return;}
  (async()=>{
   // Gary: "End early…" in the room opens the focus page, where Strict focus is ended by holding for three seconds.
   if(message.op==='cover'){await chrome.tabs.create({url:chrome.runtime.getURL(COVER),windowId:sender.tab.windowId,index:sender.tab.index+1}).catch(()=>{});return {ok:true};}
   if(message.op==='allow'){
    const url=chrome.runtime.getURL('focus-guard.html')+(message.strict?'?strict=1':'');
    const open=await chrome.tabs.query({url:chrome.runtime.getURL('focus-guard.html')+'*'}).catch(()=>[]);
    if(open[0]){await chrome.tabs.update(open[0].id,{url,active:true}).catch(()=>{});await chrome.windows?.update?.(open[0].windowId,{focused:true}).catch(()=>{});}
    else await chrome.windows.create({url,type:'popup',width:440,height:420,focused:true}).catch(()=>chrome.tabs.create({url}));
    return {ok:true};
   }
   let rec=await guardRecord();
   const given=Guard.cleanRecord(message.record);
   if(message.op==='status'&&given.until>Date.now()&&(given.sites.length||given.strict)&&(given.until!==rec.until||given.sites.join()!==rec.sites.join()||given.goal!==rec.goal||given.strict!==rec.strict||given.allow.join()!==rec.allow.join())){
    await chrome.storage.local.set({[Guard.KEY]:given});rec=given;
   }
   const wanted=Guard.cleanRecord(message.record).strict||rec.strict||message.strict===true;
   const allowed=await guardAllowed({strict:wanted}),live=await guardLive(rec),released=await guardReleased();
   const scripts=chrome.scripting?.getRegisteredContentScripts?await chrome.scripting.getRegisteredContentScripts({ids:[GUARD_ID]}).catch(()=>[]):[];
   const registered=scripts.some(x=>x.id===GUARD_ID);
   if(allowed&&live&&!registered)await syncGuard(true);
   return {ok:true,allowed,registered:registered||allowed&&live,until:rec.until,sites:rec.sites,open:rec.open,strict:rec.strict,allow:rec.allow,released:rec.strict&&released===rec.until};
  })().then(reply,()=>reply({ok:false}));
  return true;
 });
 chrome.storage?.onChanged?.addListener((changes,area)=>{
  if(area!=='local'||!Guard)return;
  if(changes[Guard.RELEASE_KEY]){syncGuard();return;}
  const change=changes[Guard.KEY];if(!change)return;
  const was=Guard.cleanRecord(change.oldValue),now=Guard.cleanRecord(change.newValue);
  syncGuard(now.until>Date.now()&&(was.until!==now.until||was.sites.join()!==now.sites.join()||was.strict!==now.strict||was.allow.join()!==now.allow.join()));
 });
 chrome.runtime.onInstalled?.addListener(()=>syncGuard());
 // The background sleeps between events; each time it wakes it makes sure the guard matches the stored session.
 syncGuard();
 chrome.runtime.onStartup?.addListener(()=>syncGuard());
 chrome.permissions?.onAdded?.addListener(()=>syncGuard(true));
 chrome.permissions?.onRemoved?.addListener(()=>syncGuard());

 // Gary: a course's own links and files (course-files.js). The Next class panel's "+" opens the manager as a small
```

## extension/storage.js (local lines 6–14)

```js
  const gpa=root.CanvasHarnessGPA||(typeof module==='object'&&module.exports?require('./gpa-model.js'):null);
  const customization=root.ReserveCustomization||(typeof module==='object'&&module.exports?require('./customization-model.js'):null);
  const layoutDefaults=customization?.defaults||{};
  // The focus room's session, log and choices (focus-room-model.js); without it the Home timer keeps its old fields.
  const focusModel=root.ReserveFocusRoomModel||(typeof module==='object'&&module.exports?require('./focus-room-model.js'):null);
  // The review deck's cards, settings and days (review-model.js).
  const reviewModel=root.ReserveReviewModel||(typeof module==='object'&&module.exports?require('./review-model.js'):null);
  // The distraction guard (focus-guard-model.js) works outside Canvas, so a running session is copied to its own key.
  const focusGuard=root.ReserveFocusGuardModel||(typeof module==='object'&&module.exports?require('./focus-guard-model.js'):null);
```

## extension/storage.js (local lines 186–188)

```js
    if(isRecord(value.focus)) out.focus=focusModel?focusModel.cleanFocus(value.focus):{minutes:[15,25,45,60].includes(value.focus.minutes)?value.focus.minutes:25,remaining:Number.isFinite(value.focus.remaining)?Math.max(0,Math.min(3600,value.focus.remaining)):1500,endsAt:Number.isFinite(value.focus.endsAt)?value.focus.endsAt:null,itemId:text(value.focus.itemId,100)||null,sessions:Number.isInteger(value.focus.sessions)?Math.max(0,value.focus.sessions):0};
    if(focusModel&&value.focusLog!==undefined)out.focusLog=focusModel.cleanLog(value.focusLog);
    if(focusModel&&value.focusRoom!==undefined)out.focusRoom=focusModel.cleanRoom(value.focusRoom);
```

## extension/storage.js (local lines 230–241)

```js
      return lock(key,async()=>{const saved=await adapter.read(key),next=saved?cleanData(saved):defaults();
        const oldLayout=next.settings.dashboardLayout,oldOrder=next.settings.deskOrder,oldGuard=focusGuard?JSON.stringify(focusGuard.record(next)):'';
        mutator(next);
        // Older Canvas Harness settings controls still write dashboardLayout alone.
        // Accept those updates without overwriting an explicit newer deskOrder.
        if(next.settings?.dashboardLayout!==oldLayout&&next.settings?.deskOrder===oldOrder&&['split','list'].includes(next.settings.dashboardLayout))next.settings.deskOrder=next.settings.dashboardLayout==='list'?'stacked':'context-first';
        const clean=cleanData(next);await adapter.write(key,clean);current=clean;
        // Written only when this save started, paused or ended a guarded session (or changed its sites), so another
        // account's tab saving something else never switches the guard off.
        // Gary: Strict focus is not ended by a pause or a reset before the round's planned end (focus-guard-model.js).
        if(focusGuard){const guard=focusGuard.record(clean);if(JSON.stringify(guard)!==oldGuard&&!focusGuard.holds?.(JSON.parse(oldGuard),guard))try{await adapter.write(focusGuard.KEY,guard);}catch{}}
        notify();return get();});
```

## extension/widgets.js (local lines 44–62)

```js
 const RING=root.ReserveFocusDial?.PATH||'M60 9a51 51 0 1 1 0 102a51 51 0 1 1 0-102Z';
 const drafts={};   // text being typed in a module, kept across renders until it is saved

 const mmss=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
 // The focus room's rules (focus-room-model.js) when they are loaded: Pomodoro breaks, open sessions, any length.
 function focusState(focus,now){
  if(Room())return Room().state(focus,now);
  const f=focus||{},minutes=[15,25,45,60].includes(f.minutes)?f.minutes:25,total=minutes*60,running=!!f.endsAt;
  const left=running?Math.max(0,Math.ceil((f.endsAt-now)/1000)):Math.max(0,Math.min(total,Number.isFinite(f.remaining)?f.remaining:total));
  return {minutes,total,running,left:left||(!running?total:0),progress:1-(left||(!running?total:0))/total,sessions:f.sessions||0};
 }
 function howLong(ms){
  const m=Math.round(Math.abs(ms)/60000);
  if(m<1)return 'now';if(m<60)return `${m} min`;
  const h=Math.floor(m/60);if(h<24)return m%60&&h<6?`${h} h ${m%60} min`:`${h} h`;
  const d=Math.round(h/24);return `${d} day${d===1?'':'s'}`;
 }
 function plan(c,h){
  if(c.__plan)return c.__plan;
```

## extension/widgets.js (local lines 173–182)

```js
  let dead=false,editing=false,settingsTab='layout',clockTimer=0,timerTick=0,notesTimer=0,pets=null,lastDone=null;
  const win=container.ownerDocument?.defaultView||root;
  const dials=new Map();
  function syncDials(){
   const arcs=new Set(container.querySelectorAll('.rd-timer-arc'));
   for(const [arc,dial] of dials)if(!arcs.has(arc)){dial.destroy();dials.delete(arc);}
   for(const arc of arcs){if(!dials.has(arc)&&root.ReserveFocusDial)dials.set(arc,root.ReserveFocusDial.create(arc,{getFocus:()=>store.get().focus}));dials.get(arc)?.sync();}
  }
  const newId=()=>'local-'+(root.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const ctx=()=>getContext();
```

## extension/widgets.js (local lines 259–260)

```js
  // The full-screen focus room (focus-room.js): the same session as the timer module.
  const room=root.ReserveFocusRoom&&Room()?root.ReserveFocusRoom.create({container,store,save,getContext,helpers,startTick:()=>startTick(),onFinished:kind=>finished(kind)}):null;
```

## extension/widgets.js (local lines 498–505)

```js
  }
  function sync(){
   if(dead)return;
   const data=store.get(),running=!!data.focus?.endsAt||!!data.focus?.startedAt,brk=!!data.focus?.phase&&data.focus.phase!=='focus';
   if(running&&!timerTick)timerTick=setInterval(tick,1000);
   if(container.querySelector('[data-rd-clock]')){if(!clockTimer)clockTimer=setInterval(clock,15000);}else if(clockTimer){clearInterval(clockTimer);clockTimer=0;}
   syncDials();ensurePets();pets?.sync();pets?.setFocus(running&&!brk);room?.sync();deck?.sync();
  }
```

## extension/widgets.js (local lines 516–520)

```js
  function click(event){
   if(deck?.click(event))return true;
   if(room?.click(event))return true;
   if(planner?.click(event))return true;
   const button=event.target.closest?.('[data-rd-action]');if(!button||dead)return false;
```

## extension/widgets.js (local lines 559–570)

```js
   if(deck?.keydown(event))return true;
   if(room?.keydown(event))return true;
   if(planner?.keydown(event))return true;
   if(event.key==='Escape'&&menu){event.preventDefault();closeMenu(true);return true;}
   // Keys are heard on the document, where a shadow root hides the real target.
   const target=event.composedPath?.()[0]||event.target;
   if(event.key==='Enter'&&target?.dataset?.rdField==='plan-quick'){event.preventDefault();quickAdd(target);return true;}
   // Shift+F opens the focus room, unless a field is being typed in.
   // Shift+R starts a review (or opens the deck when nothing is due).
   if(deck&&event.key==='R'&&event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!(target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName||''))){event.preventDefault();deck.open('review');return true;}
   if(room&&event.key==='F'&&event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!(target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName||''))){event.preventDefault();room.open();return true;}
   return false;
```

## extension/widgets.js (local lines 573–587)

```js
   if(deck?.input(event))return true;
   if(room?.input(event))return true;
   const field=event.target?.dataset?.rdField;
   if(field==='widget-notes'){
    drafts.notes=event.target.value.slice(0,30000);clearTimeout(notesTimer);
    const status=container.querySelector('[data-rd-notes-status]');if(status)status.textContent='Saving…';
    notesTimer=setTimeout(flushNotes,700);return true;
   }
   return field==='plan-quick';
  }
  // Switches and choices in "Make it yours" that this file owns: the pony, and the two on/off settings stored as words.
  function change(event){
   if(deck?.change(event))return true;
   if(room?.change(event))return true;
   const target=event.target,field=target?.dataset?.rdField;
```

## extension/widgets.js (local lines 601–608)

```js
   return save(data=>{data.toolbox={...data.toolbox,scratchpad:value};}).then(ok=>{if(ok&&drafts.notes===value)delete drafts.notes;const status=container.querySelector('[data-rd-notes-status]');if(status)status.textContent=ok?'Saved on this device.':'Not saved yet.';});
  }
  // Told by the workspace when a piece of work is ticked off or a focus session ends.
  function finished(kind,id){
   if(dead)return;
   if(kind==='focus'||kind==='break')room?.ended(kind);
   if(kind==='review')room?.sync();
   if(kind==='break'||!Pets())return;
```

## extension/widgets.js (local lines 612–614)

```js
  }
  function destroy(){dead=true;localFileOpen?.destroy?.();localFiles?.destroy?.();for(const dial of dials.values())dial.destroy();dials.clear();closeMenu();container.ownerDocument.removeEventListener('pointerdown',outside,true);win.removeEventListener('resize',closeMenu);clearInterval(clockTimer);clearInterval(timerTick);flushNotes();pets?.destroy();planner?.destroy();room?.destroy();deck?.destroy();}
  return {click,keydown,input,change,sync,finished,destroy,executeBiscuit,petInfo,focusRoom:()=>room,settingsTab:()=>settingsTab,planUI:()=>planner?.ui||{},editing:()=>editing,close(){if(editing){editing=false;rerender();}}};
```

## extension/dashboard.js (local lines 816–828)

```js
      const text=running?C.focusClock?.(f,now)||'':focusDoneUntil?'Done':'',clock=container.querySelector('[data-rd-focus-clock]');
      if(clock&&clock.textContent!==text){clock.textContent=text;clock.hidden=!text;clock.parentElement?.setAttribute('aria-label',running?'Planner, focus session running':'Planner');}
      if(running&&now>=f.endsAt&&!focusSettling&&C.settleFocus){
        focusSettling=true;let settled=false;const ended=f.endsAt;
        // A session that ended long before this page opened is recorded quietly.
        // The focus room's rules (Pomodoro breaks, the session log) when they are loaded; the planner's otherwise.
        const settle=root.ReserveFocusRoomModel?.settle||C.settleFocus;
        store.update(data=>{settled=settle(data,Date.now());}).then(()=>{if(settled&&!destroyed&&Date.now()-ended<60000){const text=settled==='break'?'Break over. Ready for the next round?':note;board?.finished(settled==='break'?'break':'focus');focusDoneUntil=Date.now()+8000;if(!transientStatus){transientStatus=text;render();}else syncFocus();}}).catch(()=>{}).finally(()=>{focusSettling=false;});
      }
      const ticking=running||!!focusDoneUntil;
      if(ticking&&!focusTimer)focusTimer=setInterval(syncFocus,1000);else if(!ticking&&focusTimer){clearInterval(focusTimer);focusTimer=0;}
    }

```

## Local manifest relationships (reference only)

```json
{
  "permissions": [
    "storage",
    "unlimitedStorage",
    "offscreen",
    "alarms",
    "notifications"
  ],
  "optional_permissions": [
    "scripting",
    "tabs"
  ],
  "optional_host_permissions": [
    "https://*/*",
    "http://*/*"
  ],
  "content_script_focus_order": [
    "focus-room-model.js",
    "focus-guard-model.js",
    "focus-scene-renderer.js",
    "focus-dial.js",
    "focus-room.js"
  ],
  "web_accessible_focus": [
    {
      "matches": [
        "https://*.instructure.com/*"
      ],
      "resources": [
        "focus-room.css",
        "focus-scene.html"
      ]
    },
    {
      "matches": [
        "https://*/*"
      ],
      "resources": [
        "focus-room.css",
        "focus-scene.html"
      ],
      "use_dynamic_url": true
    }
  ]
}
```
