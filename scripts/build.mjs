import {readFile,writeFile,mkdir,readdir,cp,rm} from 'node:fs/promises';
import path from 'node:path';
const assets={};const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg'};
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())await walk(p);else assets['/'+path.relative('web',p).split(path.sep).join('/')]={type:types[path.extname(p)]||'application/octet-stream',data:(await readFile(p)).toString('base64')};}}
await walk('web');await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await writeFile('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\n'+await readFile('worker/index.js','utf8'));await cp('.openai/hosting.json','dist/.openai/hosting.json');console.log('Worker and embedded assets built');
