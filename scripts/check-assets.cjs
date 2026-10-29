const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'Duplicate HTML ids');
for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)){
 const value=m[1];if(/^(?:https?:|data:|#)/.test(value))continue;
 assert.ok(fs.existsSync(path.join(root,value.split('?')[0])),`Missing asset ${value}`);
}
const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
assert.ok(scripts.indexOf('learning-paths.js')<scripts.indexOf('learning-core.js'));assert.ok(scripts.indexOf('learning-paths-ui.js')>scripts.indexOf('app.js'));
assert.ok(scripts.indexOf('learning-portability.js')<scripts.indexOf('learning-portability-ui.js'));assert.ok(scripts.indexOf('learning-portability-ui.js')>scripts.indexOf('app.js'));
assert.ok(scripts.indexOf('learning-core.js')<scripts.indexOf('app.js'));assert.ok(scripts.indexOf('learning-ui.js')>scripts.indexOf('app.js'));
const context=vm.createContext({window:{}});for(const name of scripts.filter(n=>/questions/.test(n)))vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
const bank=context.window.QUESTION_BANK;assert.equal(bank.length,new Set(bank.map(q=>q.id)).size);assert.ok(bank.length>=1879);assert.ok(bank.filter(q=>q.project==='云盘').length>=24);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');
for(const icon of manifest.icons){const b=fs.readFileSync(path.join(root,icon.src)),size=Number(icon.sizes.split('x')[0]);assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size);}
console.log(`Validated ${ids.length} unique HTML ids, ${scripts.length} script references, ${bank.length} unique question IDs, and PWA assets.`);

