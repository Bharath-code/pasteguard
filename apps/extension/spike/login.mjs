import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const ext=join(dirname(fileURLToPath(import.meta.url)),'ext');
const ctx=await chromium.launchPersistentContext(process.argv[2],{channel:'chromium',headless:false,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
for(const u of ['https://chatgpt.com','https://claude.ai','https://gemini.google.com']){const p=await ctx.newPage();await p.goto(u).catch(()=>{})}
console.log('ready');await new Promise(r=>ctx.on('close',r));
