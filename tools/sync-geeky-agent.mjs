// Pin only committed agent modules. Run with a local clone and full commit SHA.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'asesor/vendor/geeky-agent');
const digest=data=>createHash('sha256').update(data).digest('hex');
if(process.argv[2]==='--check'){
  const manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));
  if(!/^[a-f0-9]{40}$/.test(manifest.commit))throw new Error('Invalid pinned commit');
  for(const [file,hash] of Object.entries(manifest.files)){
    if(!['client.mjs','protocol.mjs'].includes(file))throw new Error('Unexpected vendored file');
    if(digest(await readFile(path.join(dir,manifest.commit,file)))!==hash)throw new Error('Agent source hash mismatch: '+file);
  }
  const ui=await readFile(path.join(root,'asesor/agent-ui.mjs'),'utf8');
  if(!ui.includes("./vendor/geeky-agent/"+manifest.commit+"/client.mjs"))throw new Error('UI does not use pinned agent commit');
  console.log('Pinned Geeky agent verified: '+manifest.commit);
}else{
  const [source,ref]=process.argv.slice(2);
  if(!source||!/^[a-f0-9]{40}$/.test(ref||''))throw new Error('Usage: node tools/sync-geeky-agent.mjs <local-repository> <full-commit-sha> | --check');
  const get=file=>execFileSync('git',['-C',path.resolve(source),'show',ref+':'+file]);
  const pkg=JSON.parse(get('package.json'));
  const manifest={repository:'https://github.com/GuateGeeks/geeky-agent',version:pkg.version,commit:ref,files:{}};
  await mkdir(path.join(dir,ref),{recursive:true});
  for(const file of ['client.mjs','protocol.mjs']){
    const data=get('src/'+file);manifest.files[file]=digest(data);await writeFile(path.join(dir,ref,file),data);
  }
  await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  const uiPath=path.join(root,'asesor/agent-ui.mjs'), ui=await readFile(uiPath,'utf8');
  await writeFile(uiPath,ui.replace(/const AGENT_MODULE = '[^']+';/,"const AGENT_MODULE = './vendor/geeky-agent/"+ref+"/client.mjs';"));
  console.log('Pinned Geeky agent '+pkg.version+' at '+ref);
}
