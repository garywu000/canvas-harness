# Local Review deck integration excerpts

Exact excerpts from Gary Edition 3.5.1 for adapting the original workflow to current upstream. These are reference snippets; preserve the official loader, account/quiz restrictions and transaction validation.

## extension/storage.js (local lines 11–12)

```js
  // The review deck's cards, settings and days (review-model.js).
  const reviewModel=root.ReserveReviewModel||(typeof module==='object'&&module.exports?require('./review-model.js'):null);
```

## extension/storage.js (local lines 186–189)

```js
    if(isRecord(value.focus)) out.focus=focusModel?focusModel.cleanFocus(value.focus):{minutes:[15,25,45,60].includes(value.focus.minutes)?value.focus.minutes:25,remaining:Number.isFinite(value.focus.remaining)?Math.max(0,Math.min(3600,value.focus.remaining)):1500,endsAt:Number.isFinite(value.focus.endsAt)?value.focus.endsAt:null,itemId:text(value.focus.itemId,100)||null,sessions:Number.isInteger(value.focus.sessions)?Math.max(0,value.focus.sessions):0};
    if(focusModel&&value.focusLog!==undefined)out.focusLog=focusModel.cleanLog(value.focusLog);
    if(focusModel&&value.focusRoom!==undefined)out.focusRoom=focusModel.cleanRoom(value.focusRoom);
    if(reviewModel&&value.reviewDeck!==undefined)out.reviewDeck=reviewModel.cleanDeck(value.reviewDeck);
```

## extension/workspace-arrange.js (local lines 7–9)

```js
 const EXTRA=['today','week','timer','review','clock','notes','bookmarks','grades','messages','tests','pet'];
 const ALL=[...PANELS,...EXTRA];
 const LABELS={context:'Course information',work:'Up next',reader:'Assignment details',rail:'Courses',today:'Today',week:'This week',timer:'Focus timer',review:'Review deck',clock:'Clock',notes:'Notes',bookmarks:'Bookmarks',grades:'Grades',messages:'Messages',tests:'Upcoming tests',pet:'Paddock'};
```

## extension/widgets.js (local lines 17–18)

```js
  review:{hint:'Flashcards for your courses. Each comes back just before you would forget it; before a test, that course comes first.'},
  clock:{hint:'The time, the date, and how long until the next thing is due.'},
```

## extension/widgets.js (local lines 105–108)

```js
   const {board,today}=plan(c,h),d=board.days.find(x=>x.key===today)||{all:[],open:0,done:0,minutes:0},late=board.overdue.slice(0,3);
   const total=d.all.length,line=total?`${d.done} of ${total} done${d.minutes?` · ${E(Plan().minutes(d.minutes))} left`:''}`:'';
   body=`${root.ReserveReviewDeck?.current?.todayLine?.()||''}${total?`<div class="rd-progress" role="img" aria-label="${E(line)}"><i style="width:${Math.round(100*d.done/total)}%"></i></div><p class="rd-widget-note">${line}</p>`:''}
${late.length?`<p class="rd-widget-label">Still open from before</p><ul class="rd-todo-list">${late.map(e=>todo(e,{showDue:false})).join('')}</ul>${action('plan-carry','Move to today','','rd-text-button')}`:''}
```

## extension/widgets.js (local lines 126–129)

```js
  }else if(key==='review'){
   // review-deck.js draws the module's contents (cards due, courses, the week ahead).
   body=root.ReserveReviewDeck?.current?.moduleBody?.()||'<p class="rd-widget-empty">The review deck is loading.</p>';
  }else if(key==='clock'){
```

## extension/widgets.js (local lines 261–262)

```js
  // The review deck (review-deck.js): its module, the review screen and the card manager.
  const deck=root.ReserveReviewDeck&&root.ReserveReviewModel?root.ReserveReviewDeck.create({container,store,save,getContext,helpers,onFinished:kind=>finished(kind)}):null;
```

## extension/widgets.js (local lines 516–519)

```js
  function click(event){
   if(deck?.click(event))return true;
   if(room?.click(event))return true;
   if(planner?.click(event))return true;
```

## extension/widgets.js (local lines 537–540)

```js
   if(deck&&action==='review-start'){deck.open('review');return true;}
   if(deck&&action==='review-manage'){deck.open('manage',{tab:button.dataset.tab||'add'});return true;}
   if(deck&&action==='review-course'){deck.open('review',{course:button.dataset.id});return true;}
   if(deck&&action==='review-add'){const it=ctx().items.find(x=>String(x.id)===String(button.dataset.id));deck.open('manage',{tab:'add',course:it?String(it.courseId):'',src:it?.url?{url:it.url,title:it.name}:null});return true;}
```

## extension/widgets.js (local lines 559–568)

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

## extension/dashboard-view.js (local lines 71–71)

```js
  function toolbar(){const unread=c.unread||0;return `<header class="rd-toolbar">${action('drawer','<span class="rd-drawer-glyph" aria-hidden="true"></span>','aria-label="Menu: workspaces and courses" aria-expanded="false" aria-controls="rd-course-rail"','rd-icon-button rd-drawer-button')}<div class="rd-workspace-tabs t-tabs" role="tablist" aria-label="Workspace"><span class="t-tabs-pill" aria-hidden="true"></span>${[['work','Home'],['assignments','Assignments'],['plan','Planner'],['hub','Course hub'],['materials','Materials'],['inbox','Messages'],['grades','Grades']].map(([key,label])=>action('workspace',`<span>${label}</span>${key==='inbox'?`<span class="rd-n" data-rd-unread aria-hidden="true"${unread?'':' hidden'}>${unread||''}</span><span class="rd-sr-only" data-rd-unread-sr>${unread?`, ${unread} unread`:''}</span>`:''}`,`data-tab="${key}" role="tab" id="rd-tab-${key}" aria-controls="rd-workspace-panel" aria-selected="${tabHere===key}" tabindex="${tabHere===key?0:-1}"`,'rd-workspace-tab t-tab')).join('')}</div>${searchField(true)}<div class="rd-tools">${root.ReserveReviewDeck?(()=>{const due=root.ReserveReviewDeck.current?.dueCount?.()||0;return action('review-start',icon('book')+`<span>Cards</span>${due?`<b class="rv-count">${due}</b>`:''}`,`aria-label="Review deck${due?`, ${due} cards due`:''}" title="Review deck: flashcards for your courses · Shift+R" aria-keyshortcuts="Shift+R"`,'rd-button rd-focus-trigger rv-toolbar-button');})():''}${root.ReserveFocusRoom?action('focus-room',icon('clock')+'<span>Focus room</span>','aria-label="Focus room" title="Open Focus room · Shift+F" aria-keyshortcuts="Shift+F"','rd-button rd-focus-trigger'):''}${(()=>{const moved=c.deadlineChanges?.count||0;return action('toolbox',icon('search')+`<span>Tools</span>${moved?`<b class="rv-count rd-tools-moved" aria-hidden="true">${moved}</b>`:''}<kbd aria-hidden="true">${mod} K</kbd>`,`aria-label="Tools${moved?`, ${moved} due date${moved===1?'':'s'} moved`:''}" title="Tools · ${mod} K${moved?` · ${moved} due date${moved===1?'':'s'} moved (Changes tab)`:''}" aria-keyshortcuts="Control+K Meta+K"`,'rd-button rd-toolbox-trigger');})()}${c.petAsk?action('pet-ask',icon('chat')+`<span>Ask ${E(c.petAsk)}</span>`,`aria-label="Ask ${E(c.petAsk)}" title="Ask ${E(c.petAsk)}: type a short line like “calc hw”, “focus 25” or “open planner”"`,'rd-button rd-ask-trigger'):''}${c.demo?'<span class="rd-demo">Sample data</span>':''}<span class="rd-focus-indicator" aria-label="${c.focusClock?'Planner, focus session running':'Planner'}"><span class="rd-focus-clock" data-rd-focus-clock ${c.focusClock?'':'hidden'}>${E(c.focusClock||'')}</span></span><label class="rd-grade-switch"><input type="checkbox" role="switch" data-rd-field="setting" data-setting="showGrades" aria-label="Show grades" ${c.s.showGrades===true?'checked':''}><span class="rd-switch-track" aria-hidden="true"></span><span>Show grades</span></label>${action('settings',icon('sliders'),`aria-label="Appearance settings" title="Appearance settings" aria-expanded="${!!c.customizeOpen}" aria-controls="rd-appearance-panel"`,'rd-icon-button')}${(()=>{const sync=syncState();return action('refresh',icon('refresh')+syncRing,`aria-label="Refresh Canvas data" title="${E(sync.text)}"${sync.failed&&!c.refreshing?' data-tone="danger"':''} ${c.refreshing?'aria-disabled="true" aria-busy="true"':''}`,'rd-icon-button rd-refresh-button');})()}${c.nativeSwitch?action('native',`${icon('grid')}<span>Canvas<span class="rd-native-word"> dashboard</span></span>`,'aria-label="Canvas dashboard" title="Show Canvas’s own dashboard"','rd-button rd-native-switch'):''}</div></header>`;}
```

## extension/dashboard-view.js (local lines 170–170)

```js
  function readerTop(course,item,extra='',href=''){return `<header class="rd-reader-heading" data-rd-key="reader-heading" data-arrange-head="reader"><p class="rd-reader-course" title="${E(full(course||{})||item.courseName||'')}">${mini(course,'reader')}<span>${unbreak(E(short(course)||item.courseName||'Personal'))}</span>${extra}</p><div class="rd-reader-tools">${layoutTools('reader')}${href?`<a class="rd-icon-button rd-reader-open" href="${E(href)}" target="_blank" rel="noopener noreferrer" aria-label="Open the original in a new tab" title="Open the original in a new tab">${icon('external')}</a>`:''}${action('close-preview',icon('close'),'aria-label="Back to work list" title="Back to work list"','rd-icon-button rd-reader-back')}</div></header>`;}
```

## extension/course-hub-ui.js (local lines 146–146)

```js
      return `<header class="rd-deck-header" data-rd-key="deck-heading"${arrange?' data-arrange-head="context"':''}${tone(course)}><div><h2>${root.ReserveCourseArt?.mini?.(course,{place:'deck'})||''}Course information</h2><p title="${E(full(course))}">${E(short(course))}${detail(course)?` · ${E(detail(course))}`:''}</p></div>${arrange?root.ReserveWorkspaceArrange?.controls('context')||'':''}<div class="rd-heading-actions">${root.ReserveReviewDeck?.current?.courseButton?.(id)||''}<a href="${origin}/courses/${id}">Original course ↗</a>${button('refresh-deck','Refresh',id,entry?.loading||material?.loading||inbox?.loading?'aria-disabled="true"':'')}</div></header>`;
```

## extension/course-hub-ui.js (local lines 183–183)

```js
      return `<section class="rd-hub" aria-label="Course hub"><header class="rd-page-heading${sharedHeading?'':' rd-course-banner'}"${named?' data-titled="true"':''}${look}>${sharedHeading?'':`<div class="rd-banner-art" aria-hidden="true">${root.ReserveCourseArt?.scene?.(course,{crop:'wide'})||''}</div>`}<div>${sharedHeading?'<h2>Course hub</h2>':`<h1 title="${E(full(course))}">${E(short(course))}${course.tag?` <small class="rd-course-tag">${E(course.tag)}</small>`:''}</h1>`}<p>${tagged}${detail(course)?`<strong class="rd-course-detail">${E(detail(course))}</strong> · `:''}Home, teacher updates & course tools</p><div class="rd-hub-links">${pages}<span aria-hidden="true"> · </span>${courseTools(id,entry)}</div></div><div class="rd-heading-actions">${root.ReserveReviewDeck?.current?.courseButton?.(id)||''}<a class="rd-button rd-button--outline" href="${origin}/courses/${id}">Original course <span aria-hidden="true">↗</span></a><button type="button" class="rd-icon-button" data-rd-action="hub-refresh" data-course="${E(id)}" aria-label="Refresh this course" title="Refresh this course" ${entry?.loading?'aria-disabled="true" aria-busy="true"':''}>${root.ReserveIcon?.('refresh','rd-icon')||''}${ring}</button></div>${named}</header>${entry?.error?`<p role="alert" class="rd-hub-notice">${E(entry.error)} ${button('refresh','Try again',id)}</p>`:''}${entry?.raw?.errors?.length?'<p role="status" class="rd-hub-notice">Some course updates could not load. Use the original course or try refreshing.</p>':''}<div class="rd-hub-grid"><section class="rd-home-sheet" aria-label="Teacher course home"><div class="rd-sheet-heading"><h2>Teacher’s home page</h2><div class="rd-source-actions">${selectHome(id)+button('capture-home','Plan from this page',id)}<a href="${origin}/courses/${id}">Open original <span aria-hidden="true">↗</span></a></div></div>${home(course)}</section><aside class="rd-course-updates" aria-label="Teacher updates"><div class="rd-sheet-heading"><h2>Recent announcements</h2><span class="rd-n">${announcements.length}</span></div>${entry?.loading?`<p class="rd-hub-notice" role="status" data-loading="true">${ring}Checking course updates…</p>${announcements.length?'':ghosts}`:''}${announcements.length?announcements.map(a=>`<details class="rd-announcement" data-rd-section="announcement-${E(a.id)}" data-unread="${!!a.unread}"><summary><span class="rd-announcement-meta">${E(day(a.postedAt))}${a.unread?' · Unread':''} · ${E(a.author||'Course announcement')}</span><strong>${E(a.title)}</strong></summary><div class="rd-announcement-body"><div class="rd-rich-text">${rich(a.body)}</div><div class="rd-source-actions"><a class="rd-text-button" href="${E(safe(a.url)||`${origin}/courses/${id}/announcements`)}">Open announcement in Canvas <span aria-hidden="true">↗</span></a>${selectSource('announcement',a.id,id,a.title)}${button('capture-announcement','Add to my plan',id,`data-announcement="${E(a.id)}"`)}</div></div></details>`).join(''):!entry?.loading?'<p class="rd-hub-notice">No announcements were returned for the past 14 days. Homework may still be in Inbox or the class schedule.</p>':''}<p class="rd-message-prompt">Teachers sometimes post homework in Messages. <button class="rd-text-button" type="button" data-rd-action="workspace" data-tab="inbox">View messages <span aria-hidden="true">→</span></button></p></aside></div></section>`;
```

## extension/focus-room.js (local lines 222–229)

```js
   // The review deck (review-deck.js) can be the session's task too.
   const deck=root.ReserveReviewDeck?.current,reviewing=s.itemId==='review:deck'&&!!deck,dueCards=deck?deck.dueCount():0;
   const options=(deck?`<option value="review:deck" ${reviewing?'selected':''}>Review cards${dueCards?` (${dueCards} due)`:''}</option>`:'')+open.map(x=>{const co=courseOf(c,x);return `<option value="${E(x.id)}" ${item===x?'selected':''}>${E(x.name)}${co?` · ${E(co.shortName||co.name)}`:''}</option>`;}).join('');
   const local=item?c.local[item.id]||{}:{},steps=local.checklist||[],done=item&&(h.complete(item)||local.checkedOff===true);
   const link=item&&!String(item.id).startsWith('local-')?h.assignmentLink(item):'';
   const task=`<aside class="fr-task fr-glass" data-rd-key="task" aria-label="What you are working on">
<label class="fr-task-pick"><span>Working on</span><select data-fr-field="item"><option value="">Nothing in particular</option>${options}</select></label>
${reviewing?`<p class="fr-task-course"><i></i>Review deck</p><h2>Review cards</h2><p class="fr-task-due">${dueCards?`${dueCards} ${dueCards===1?'card':'cards'} due today`:'Nothing due right now'}</p><div class="fr-task-actions">${dueCards?'<button type="button" class="fr-button" data-rd-action="review-start">Start review</button>':''}<button type="button" class="fr-button" data-rd-action="review-manage" data-tab="add">Add cards</button></div>`:item?`${course?`<p class="fr-task-course" style="--fr-course:${E(course.color||'#C96442')}"><i></i>${E(course.shortName||course.name)}</p>`:''}<h2>${E(item.name)}</h2>
```

## extension/focus-room.js (local lines 235–235)

```js
<div class="fr-tools">${root.ReserveReviewDeck?.current?`<button type="button" class="fr-icon fr-cards" data-rd-action="review-start" aria-label="Review cards" title="Review cards (Shift+R)"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.4 7.2c4.4-.5 8.8-.5 13.2 0l.2 11.4c-4.5.5-9 .5-13.5 0z"/><path d="M8.4 4.4c3.2-.3 6.6-.3 9.8.1M8.6 11.6c2.2-.2 4.6-.2 6.8 0M8.6 14.8h4.6"/></svg>${(()=>{const n=root.ReserveReviewDeck.current.dueCount();return n?`<b class="fr-badge">${n}</b>`:'';})()}</button>`:''}${tool('panel','scene','Scene and sound',`data-value="scene" aria-pressed="${panel==='scene'}"`)}${tool('panel','stats','Your focus',`data-value="stats" aria-pressed="${panel==='stats'}"`)}${doc.fullscreenEnabled!==false?tool('fullscreen',full?'shrink':'full',full?'Leave full screen':'Full screen'):''}${tool('close','close','Leave the room (Esc). The timer keeps running.')}</div></header>
```

## extension/pets.js (local lines 39–45)

```js
 // Finishing a piece of work: a treat, some experience, and the day counts toward the run of days.
 function reward(pet,kind,today){
  const next={...pet},gain={done:10,focus:6,review:4,plan:2}[kind]||0;
  next.xp=clamp(next.xp+gain,0,1e6);
  if(kind==='done'||kind==='focus'||kind==='review')next.treats=clamp(next.treats+1,0,99);
  if((kind==='done'||kind==='focus'||kind==='review')&&today&&next.streakDay!==today){
   const y=new Date(today+'T12:00:00Z');y.setUTCDate(y.getUTCDate()-1);
```

## Local manifest relationships (port through the current feature catalogue)

```json
{
  "localScriptOrder": [
    "review-model.js",
    "storage.js",
    "review-deck.js",
    "widgets.js"
  ],
  "localWebAccessibleResources": [
    {
      "matches": [
        "https://*.instructure.com/*"
      ],
      "resources": [
        "review-deck.css"
      ]
    },
    {
      "matches": [
        "https://*/*"
      ],
      "resources": [
        "review-deck.css"
      ]
    }
  ]
}
```
