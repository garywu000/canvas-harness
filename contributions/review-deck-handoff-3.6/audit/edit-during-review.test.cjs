'use strict';
// Pinned unmodified official 3.6 controller/model, exercised through public methods.
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('./upstream/extension/review-deck-model.js');
const UI=require(process.env.CANVAS_REVIEW_UI_SOURCE||'./upstream/extension/review-deck.js');
const DAY='2026-10-20',ORIGIN='https://school.instructure.com';
function fixture(){
 const card=M.makeCard({front:'Term',back:'Original answer',course:'5',today:DAY,id:'rc-edit-test'});
 let data={settings:{reviewDecks:M.cleanDeck({cards:[card]})}};
 const store={owner:{accountId:'7',origin:ORIGIN},get:()=>structuredClone(data),async update(fn){const next=structuredClone(data);fn(next);data=next;return structuredClone(next);}};
 const ui=UI.create({container:{querySelector:()=>null},store,getContext:()=>({user:{id:'7'},origin:ORIGIN,s:{timeZone:'UTC'},courses:[{id:'5',name:'Example course'}],items:[]}),isEnabled:()=>true,isSelected:()=>true,getPath:()=>'/dashboard',now:()=>Date.parse(DAY+'T12:00:00Z')});
 return {ui,id:card.id,act:(name,args={})=>ui.action('review-deck-'+name,args),get data(){return structuredClone(data);},edit(fn){fn(data);}};
}
test('a card edited and saved in this review session remains gradable without restarting',async()=>{
 const f=fixture();try{
  await f.act('start');await f.act('reveal');await f.act('edit',{id:f.id});
  f.ui.input('review-deck-back','Corrected answer');await f.act('save');
  assert.equal(f.data.settings.reviewDecks.cards[0].b,'Corrected answer');
  await f.act('tab',{tab:'review'});await f.act('reveal');await f.act('grade',{grade:'good'});
  const s=f.ui.getState();assert.equal(s.session.index,1,'The successful same-controller edit should not be rejected as a change elsewhere.');
  assert.equal(f.data.settings.reviewDecks.cards[0].s.f.last,DAY);
 }finally{f.ui.destroy();}
});
test('an independent edit still blocks a stale review from writing a grade',async()=>{
 const f=fixture();try{
  await f.act('start');await f.act('reveal');f.edit(d=>{d.settings.reviewDecks.cards[0].b='Changed in another tab';});
  await f.act('grade',{grade:'good'});assert.equal(f.ui.getState().session.index,0);assert.equal(f.data.settings.reviewDecks.cards[0].s.f.last,'');assert.match(f.ui.getState().status,/changed elsewhere/);
 }finally{f.ui.destroy();}
});
test('saving an edit after an independent change does not silently validate an already stale session',async()=>{
 const f=fixture();try{
  await f.act('start');await f.act('reveal');f.edit(d=>{d.settings.reviewDecks.cards[0].b='Independent edit';});
  await f.act('edit',{id:f.id});f.ui.input('review-deck-back','My follow-up edit');await f.act('save');
  await f.act('tab',{tab:'review'});await f.act('reveal');await f.act('grade',{grade:'good'});
  assert.equal(f.ui.getState().session.index,0);assert.equal(f.data.settings.reviewDecks.cards[0].s.f.last,'');assert.match(f.ui.getState().status,/changed elsewhere/);
 }finally{f.ui.destroy();}
});
