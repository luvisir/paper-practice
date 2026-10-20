import{execFileSync}from'node:child_process';import{readFileSync,lstatSync}from'node:fs';
const files=[...new Set(execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{encoding:'utf8'}).split('\0').filter(Boolean))];
const actual=process.env.OPENAI_API_KEY;
const patterns=[/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b/,/\bart_v2_[A-Za-z0-9_-]{20,}\b/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
let issues=[];
function check(data,label){const text=data.toString('utf8');if((actual&&text.includes(actual))||patterns.some(p=>p.test(text)))issues.push(label)}
for(const file of files){if(/(^|\/)(\.env(?:\..*)?|keystore\.properties)$/.test(file)&&!file.endsWith('.env.example'))issues.push(file);if(/\.(jks|keystore)$/i.test(file))issues.push(file);try{if(lstatSync(file).isFile())check(readFileSync(file),file)}catch{}}
if(process.argv.includes('--history')){const objects=execFileSync('git',['rev-list','--objects','--all'],{encoding:'utf8'}).trim().split('\n');for(const object of objects){const first=object.indexOf(' '),sha=first<0?object:object.slice(0,first);if(execFileSync('git',['cat-file','-t',sha],{encoding:'utf8'}).trim()==='blob')check(execFileSync('git',['cat-file','blob',sha],{maxBuffer:64*1024*1024}),first<0?sha:object.slice(first+1));}}
if(issues.length){console.error('Potential secret files detected (values withheld):\n'+[...new Set(issues)].join('\n'));process.exit(1)}
console.log(`Secret scan passed for ${files.length} source files${process.argv.includes('--history')?' and all Git history':''}; no secret values printed`);
