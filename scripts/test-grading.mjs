import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
const{default:worker}=await import('data:text/javascript;base64,'+Buffer.from('const ASSETS={};\n'+await readFile('worker/grading.js','utf8')+'\n'+await readFile('worker/index.js','utf8')).toString('base64'));
const map=new Map(),env={OPENAI_API_KEY:'test-only-not-a-real-key',BUCKET:{get:async k=>map.has(k)?{json:async()=>JSON.parse(map.get(k))}:null,put:async(k,v)=>map.set(k,v)}};
let family='',session='',upstreamCalls=0,payload;const image='data:image/png;base64,aGVsbG8=';const body={document:'test-draft',consent:true,original:image,answered:image,ink:image};
async function call(path,data,noSession=false){const r=await worker.fetch(new Request('https://test.site/api/'+path,{method:data?'POST':'GET',headers:{Origin:'https://test.site',Cookie:family+'; '+(noSession?'':session),'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined}),env);const c=r.headers.get('set-cookie');if(c?.startsWith('paperly_family='))family=c.split(';')[0];if(c?.startsWith('paperly_parent='))session=c.split(';')[0];return{status:r.status,body:await r.json()}}
await call('parent/setup',{pin:'654321'});await call('parent/unlock',{pin:'654321'});
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{upstreamCalls++;payload=JSON.parse(options.body);return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({summary:'两道题识别完成。',marks:[{label:'第1题',status:'wrong',x:.5,y:.3,studentAnswer:'6',answer:'5',reason:'2+3=5',confidence:.98},{label:'第2题',status:'wrong',x:.5,y:.5,studentAnswer:'模糊',answer:'3',reason:'需确认',confidence:.6}]})}]}]})};
assert.equal((await call('parent/grade',body,true)).status,401);assert.equal(upstreamCalls,0);
assert.equal((await call('parent/grade',{...body,consent:false})).status,400);assert.equal(upstreamCalls,0);
const result=await call('parent/grade',body);assert.equal(result.status,200);assert.equal(result.body.report.marks[0].status,'wrong');assert.equal(result.body.report.marks[1].status,'uncertain');assert.equal(result.body.report.released,false);assert.equal(payload.store,false);assert.equal(payload.input[0].content.filter(c=>c.type==='input_image').length,3);assert.equal((await call('child/review?document=test-draft')).body.marks.length,0);
assert.equal((await call('parent/grade',body)).status,429);
for(const k of map.keys())if(k.startsWith('ai-usage/'))map.delete(k);
globalThis.fetch=async()=>Response.json({error:{code:'credit_balance_exhausted',type:'insufficient_quota'}},{status:429});
const quota=await call('parent/grade',body);assert.equal(quota.status,429);assert(quota.body.error.includes('额度不足'));assert.equal(quota.body.code,'AI_QUOTA');
for(const k of map.keys())if(k.startsWith('ai-usage/'))map.delete(k);
globalThis.fetch=async()=>{await call('parent/lock',{});return Response.json({status:'completed',output:[{content:[{type:'output_text',text:'{"summary":"测试","marks":[]}'}]}]})};
assert.equal((await call('parent/grade',body)).status,401);
globalThis.fetch=realFetch;console.log('PASS: AI parent authorization, explicit consent, three image inputs, confidence fallback, response storage disabled, private result, repeated-call limit, lock during in-flight grading');
