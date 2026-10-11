const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm'), fs = require('fs');
test('Actual profile result store deduplicates session IDs',()=>{
 const data = new Map();const localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const context={localStorage,module:{exports:{}},console,Date,Math};vm.createContext(context);vm.runInContext(fs.readFileSync('public/js/state.js','utf8'),context);
 const store=context.module.exports;const first=store.recordSession({id:'fixture-session',subjectId:'toan10',score:1,total:2});const second=store.recordSession({id:'fixture-session',subjectId:'toan10',score:2,total:2});assert.equal(first.id,second.id);assert.equal(store.getHistory().length,1);assert.equal(second.score,1);
});
test('Timer uses elapsed wall time and expires immediately after reload past deadline',()=>{
 const data=new Map();let tick,expired=0,now=1000;
 const context={sessionStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},module:{exports:{}},Date:{now:()=>now},setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('public/js/timer.js','utf8'),context);const timer=context.module.exports;timer.init(1,()=>{},()=>expired++);assert.ok(timer.loadState(), 'Timer must persist before the first tick');now=46000;tick();assert.equal(timer.remaining,15);now=62000;const saved=timer.loadState();assert.equal(saved.remaining,0);timer.remaining=saved.remaining;timer.start();assert.equal(expired,1);
});
