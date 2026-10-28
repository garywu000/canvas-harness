'use strict';
// Regression for the unmodified upstream room at 51eb229b0c43010a1475ab1eff2341c56c1df72d.
// The dashboard lives in a shadow root: document.activeElement is the host,
// while shadowRoot.activeElement is the actual Focus room trigger.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('closing the official focus room returns keyboard focus to its shadow-root trigger',async()=>{
 class Node{
  constructor(){this.dataset={};this.children=[];this.hidden=false;this.inert=false;this.nodes=new Map();this.values=new Map();this.classList={contains:()=>false};this.style={getPropertyValue:k=>this.values.get(k)||'',getPropertyPriority:()=>'',setProperty:(k,v)=>this.values.set(k,v),removeProperty:k=>this.values.delete(k)};}
  append(n){if(n.parentNode)n.remove();n.parentNode=this;this.children.push(n);}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
  setAttribute(){}
  querySelector(k){if(!this.nodes.has(k))this.nodes.set(k,new Node());return this.nodes.get(k);}
  querySelectorAll(){return [];}
  focus(){this.focused=true;}
 }
 const trigger=new Node(),host=new Node(),container=new Node(),shell=new Node(),shadow={activeElement:trigger,fullscreenElement:null},listeners={};
 const doc={activeElement:host,fullscreenElement:null,createElement:()=>new Node(),addEventListener:(k,f)=>listeners[k]=f,removeEventListener:k=>delete listeners[k],exitFullscreen:async()=>{doc.fullscreenElement=null;shadow.fullscreenElement=null;listeners.fullscreenchange?.();}};
 container.ownerDocument=doc;container.getRootNode=()=>shadow;container.append(shell);
 container.requestFullscreen=async()=>{doc.fullscreenElement=host;shadow.fullscreenElement=container;listeners.fullscreenchange?.();};
 const env={ReserveFeatures:{enabled:()=>true},ReserveCore:{focusState:()=>({left:1500,phase:'focus',active:false,running:false,paused:false})},location:{pathname:'/courses/7'}};
 vm.runInNewContext(fs.readFileSync(process.env.CANVAS_FOCUS_SOURCE||path.join(__dirname,'upstream-focus-room.js'),'utf8'),env);
 const room=env.ReserveFocusRoom.create({container,store:{get:()=>({focus:{minutes:25}})}});
 try{assert.equal(await room.open(),true);room.close();assert.equal(shell.hidden,false);assert.equal(trigger.focused,true,'Expected the real Focus room button to regain focus; upstream focuses document.activeElement (the shadow host) instead.');}
 finally{room.destroy();}
});
