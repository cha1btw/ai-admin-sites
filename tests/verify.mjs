import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import CSSOM from 'cssom';

const base=fileURLToPath(new URL('../landing/',import.meta.url));
const html=readFileSync(base+'index.html','utf8');
let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
for(const file of ['zapysai.css','conversion.css'])check(CSSOM.parse(readFileSync(base+file,'utf8')).cssRules.length>0,file+' parses');

function load(search='',response={ok:true,status:200}){
  const {window}=parseHTML(html),{document}=window;
  const storage=new Map(),requests=[],clipboard=[],events=[];
  window.HTMLElement.prototype.scrollIntoView=function(){};
  // LinkeDOM's anchor property double-encodes reserved query bytes; model browser URL behavior.
  const anchorPrototype=Object.getPrototypeOf(document.querySelector('a'));
  Object.defineProperty(anchorPrototype,'href',{configurable:true,get(){return new URL(this.getAttribute('href')||'', 'https://example.test/').href;},set(value){this.setAttribute('href',String(value));}});
  const selectPrototype=Object.getPrototypeOf(document.querySelector('select'));
  Object.defineProperty(selectPrototype,'value',{configurable:true,get(){return [...this.options].find(o=>o.hasAttribute('selected'))?.getAttribute('value')??this.options[0]?.getAttribute('value');},set(value){for(const option of this.options){if(option.getAttribute('value')===value)option.setAttribute('selected','');else option.removeAttribute('selected');}}});
  class FormDataTest{constructor(form){this.form=form;}*entries(){for(const input of this.form.querySelectorAll('input[name],select[name],textarea[name]'))yield[input.getAttribute('name'),input.value||''];}}
  const navigator={clipboard:{writeText:async text=>{clipboard.push(text);}}};
  const sandbox={window,document,console,URLSearchParams,URL,NodeFilter:{SHOW_TEXT:4},FormData:FormDataTest,CustomEvent:window.CustomEvent,navigator,
    location:new URL('https://example.test/'+search),
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    setTimeout:()=>0,clearTimeout:()=>{},fetch:async(url,options)=>{requests.push({url,options});return response;}};
  window.matchMedia=()=>({matches:false});
  document.addEventListener('zapysai:conversion',event=>events.push(event.detail));
  const context=vm.createContext(sandbox);
  for(const script of document.querySelectorAll('script')){
    const source=script.getAttribute('src');
    let code=source?readFileSync(base+source,'utf8'):script.textContent;
    if(code.includes('var DICT'))code=code.replace(/\}\)\(\);\s*$/,'window.__qa={DICT:DICT};})();');
    new vm.Script(code,{filename:source||'inline.js'}).runInContext(context);
  }
  const click=selector=>{const node=document.querySelector(selector);assert.ok(node,selector);node.dispatchEvent(new window.Event('click',{bubbles:true}));};
  const choose=(selector,value)=>{const node=document.querySelector(selector);node.value=value;node.dispatchEvent(new window.Event('change',{bubbles:true}));};
  const text=selector=>document.querySelector(selector).textContent;
  const number=selector=>Number(text(selector).replace(/\D/g,''));
  const submit=()=>document.querySelector('#lead-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
  const fill=()=>{for(const [id,value]of Object.entries({'f-name':'Test Name','f-contact':'@test_contact','f-business':'Test Business','f-message':'Test & question? #1'}))document.getElementById(id).value=value;};
  return{window,document,requests,clipboard,events,navigator,storage,click,choose,text,number,submit,fill};
}
const page=load();const{window,document,click,choose,text,number}=page;
check(document.querySelectorAll('.audience-card').length===8,'eight audiences');
check(document.querySelectorAll('.timeline li').length===4,'four launch steps');
check(document.querySelectorAll('.plan').length===3,'three plans');
check(document.querySelectorAll('.services > .service').length===9,'complete nine-card services grid');
check(!document.querySelector('#f-name').closest('details'),'required name immediately visible');
check(document.querySelector('#f-business').closest('details').id==='lead-details','optional details collapsed');
check(!document.querySelector('#lead-details').open,'details initially closed');
check(document.querySelectorAll('[data-link="contact"]:not([hidden])').length===2,'real Telegram links visible');
for(const link of document.querySelectorAll('[data-link="contact"]'))check(link.href==='https://t.me/ZapysAI','correct contact target');
for(const code of ['uk','ru','en','es','pl'])check(window.__qa.DICT[code].length===window.__qa.DICT.uk.length,'dictionary alignment '+code);
for(const row of window.ZAPYS_I18N)for(const code of ['uk','ru','en','es','pl'])check(typeof row[code]==='string'&&row[code].length>0,'complete added copy '+code);
const prices={UAH:{monthly:[2499,3999,6999],annual:[20000,32000,56000]},EUR:{monthly:[100,160,200],annual:[900,1440,1800]}};
for(const currency of ['UAH','EUR']){
  click(`[data-currency="${currency}"]`);
  for(const billing of ['monthly','annual']){
    click(`[data-billing="${billing}"]`);
    for(const[i,plan]of ['lite','medium','pro'].entries())check(number(`[data-price="${plan}"]`)===prices[currency][billing][i],currency+' '+billing+' '+plan);
    check(document.querySelector('[data-annual]').hidden===(billing==='monthly'),'annual detail visibility');
    check(number('#calc-plan-price')===Math.round(prices[currency][billing][1]/(billing==='annual'?12:1)),'calculator billing equivalent');
  }
}
check(text('[data-annual="medium"]').replace(/\s/g,'').includes('480EUR'),'exact EUR annual saving');
click('[data-currency="UAH"]');click('[data-billing="monthly"]');
check(number('#c-money')===13760,'baseline opportunity calculation');
document.querySelector('#r-lost').value='0';document.querySelector('#r-lost').dispatchEvent(new window.Event('input'));
check(number('#c-money')===0,'zero assumed losses gives zero');
const requirements=[['one','text','Lite'],['one','audio','Medium'],['one','advanced','Pro'],['many','text','Pro'],['many','audio','Pro'],['many','advanced','Pro']];
for(const lang of ['uk','ru','en','es','pl']){
  click(`[data-l="${lang}"]`);
  check(document.documentElement.lang===lang,'language '+lang);
  check(number('[data-price="medium"]')===3999,'explicit currency retained '+lang);
  check(text('h1').includes(window.ZAPYS_I18N.find(row=>row.uk==='Ви працюєте.')[lang]),'hero translated '+lang);
  for(const addon of ['waitlist','knowledge']) {
    click('[data-addon="'+addon+'"]');
    const title=document.querySelector('[data-addon="'+addon+'"]').closest('.service').querySelector('h3').textContent;
    check(text('#lead-selection').includes(title),'selected extra service visible '+lang+' '+addon);
    check(window.ZapysConversion.describeSelection().includes(title),'extra service retained in lead '+lang+' '+addon);
  }
  for(const[channels,needs,expected]of requirements){choose('#finder-channels',channels);choose('#finder-needs',needs);check(text('#finder-plan')===expected,'minimum plan '+lang+' '+channels+' '+needs);check(text('#finder-reason').length>20,'reason shown');}
  for(let index=0;index<8;index++){click(`[data-industry="${index}"]`);check(text('#example-answer').includes('AI'),'honest example '+lang+' '+index);check(text('#audience-example-title')===document.querySelectorAll('.audience-card h3')[index].textContent,'industry title translated');}
}
click('#theme');check(document.documentElement.getAttribute('data-theme')==='dark','dark mode');click('#theme');check(!document.documentElement.hasAttribute('data-theme'),'light mode');
choose('#finder-channels','one');choose('#finder-needs','text');click('#finder-apply');
check(window.ZapysLanding.getState().chosenPlan==='lite','apply recommendation');
click('[data-plan="pro"]');check(window.ZapysLanding.getState().chosenPlan==='pro','manual override retained');
check(text('#lead-selection').includes('Pro'),'selected plan visible');
click('[data-currency="EUR"]');click('[data-billing="annual"]');check(text('#lead-selection').includes('1')&&text('#lead-selection').includes('800'),'summary annual pro cost');
page.submit();check(document.querySelector('#f-name').getAttribute('aria-invalid')==='true','required error accessible');
page.fill();page.submit();
check(!document.querySelector('#telegram-lead').hidden,'Telegram preview visible');
check(page.requests.length===0,'Telegram route makes no API call');
check(!document.querySelector('.form-done'),'no fake sent confirmation');
const url=new URL(document.querySelector('#telegram-draft-link').href),draft=url.searchParams.get('text');
check(url.origin==='https://t.me'&&url.pathname==='/ZapysAI','exact recipient');
check(draft.includes('Test & question? #1'),'special characters round-trip');
check(draft.includes('Pro')&&draft.includes('EUR')&&draft.includes('Test Name'),'draft has selected plan, price and contact');
check(draft.includes(text('#audience-example-title')),'industry context retained');
check(!url.searchParams.has('profile'),'opens chat, not profile');
check(!page.storage.has('Test Name')&&!JSON.stringify([...page.storage]).includes('@test_contact'),'no personal details stored');
click('#copy-lead');await new Promise(setImmediate);check(page.clipboard[0]===draft,'copy exact draft');
page.navigator.clipboard.writeText=async()=>{throw new Error('denied');};click('#copy-lead');await new Promise(setImmediate);check(text('#telegram-copy-status').length>20,'clipboard failure has manual fallback');
document.querySelector('#f-message').dispatchEvent(new window.Event('input',{bubbles:true}));check(document.querySelector('#telegram-lead').hidden,'edited form invalidates old draft');
for(const addon of ['waitlist','knowledge']){
  click('[data-addon="'+addon+'"]');page.submit();
  const title=document.querySelector('[data-addon="'+addon+'"]').closest('.service').querySelector('h3').textContent;
  check(document.querySelector('#telegram-draft').value.includes(title),'Telegram draft identifies '+addon);
}
choose('#f-service','crm');check(window.ZapysLanding.getState().chosenAddon===null,'manual service choice clears previous add-on');
click('[data-service="crm"]');check(document.querySelector('#lead-details').open,'addon reveals optional details');check(window.ZapysLanding.getState().chosenPlan===null,'addon clears unrelated plan');
check(!JSON.stringify(page.events).includes('Test Name')&&!JSON.stringify(page.events).includes('@test_contact'),'event hooks exclude personal details');
click('[data-plan="medium"]');
window.CONFIG.apiBase='https://example.test';window.ZapysConversion.refresh();page.submit();await new Promise(setImmediate);
check(page.requests.length===1,'API route submits once');
const payload=JSON.parse(page.requests[0].options.body);
check(page.requests[0].url==='https://example.test/leads','unchanged endpoint');
check(payload.message.includes('Plan: medium; Billing: annual; Currency: EUR'),'existing contract retains chosen plan');
check(payload.message.includes(text('#audience-example-title')),'API request includes industry');
check(!!document.querySelector('.form-done'),'API confirmation only after success');
const failed=load('',{ok:false,status:500});failed.window.CONFIG.apiBase='https://example.test';failed.window.ZapysConversion.refresh();failed.fill();failed.submit();await new Promise(setImmediate);
check(!failed.document.querySelector('.form-done'),'failed API has no success');
check(!failed.document.querySelector('#form-error').hidden,'failed API error visible');
check(!failed.document.querySelector('#f-submit').disabled,'failed API can retry');
const unsafe=load();unsafe.window.CONFIG.contact='bad/user';unsafe.fill();unsafe.submit();check(unsafe.document.querySelector('#telegram-lead').hidden,'invalid recipient does not create a Telegram draft');
for(const lang of ['en','es','pl']){const current=load('?lang='+lang);check(current.window.ZapysLanding.getState().currency==='EUR','initial EUR '+lang);check(current.number('[data-price="pro"]')===200,'initial Pro EUR '+lang);}
console.log(`PASS: ${checks} checks. Includes five languages, all 12 prices, all six plan-finder combinations, eight industry examples, Telegram draft/clipboard, API success/failure, and privacy. No real messages sent. Visual browser QA remains unverified.`);
