import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { GitHubStore } from './github-store.mjs';
import { transact, assertLease } from './registry.mjs';
export async function instruction(config,name,token,request=fetch) {
  if(!token)throw new Error('GITHUB_TOKEN_REQUIRED');
  const source=config?.source;
  if(!source||!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(source.repository)||!/^[a-f0-9]{40}$/.test(source.ref||''))throw new Error('INVALID_SOURCE_PIN');
  if(!/^[a-z0-9-]+$/.test(name)||!Object.hasOwn(config.skills||{},name))throw new Error('UNKNOWN_SKILL');
  const spec=config.skills[name];
  if(!/^[a-z0-9_./-]+$/i.test(spec.path)||spec.path.split('/').some(p=>!p||p==='.'||p==='..')||!/^[a-f0-9]{64}$/.test(spec.sha256||''))throw new Error('INVALID_SKILL_SPEC');
  const r=await request(`https://api.github.com/repos/${source.repository}/contents/${spec.path}?ref=${source.ref}`,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2026-03-10','Cache-Control':'no-cache'}});
  if(!r.ok)throw new Error('SKILL_READ_'+r.status);
  const b=await r.json();if(b.encoding!=='base64'||typeof b.content!=='string'||b.content.length>150000)throw new Error('INVALID_SKILL_RESPONSE');
  const bytes=Buffer.from(b.content,'base64');if(createHash('sha256').update(bytes).digest('hex')!==spec.sha256)throw new Error('SKILL_HASH_MISMATCH');
  return bytes.toString('utf8');
}
export async function main(args,env) {
  if(!env.SHARED_BRAIN_CONFIG)throw new Error('LOCAL_CONFIG_REQUIRED');
  const config=JSON.parse(await readFile(env.SHARED_BRAIN_CONFIG,'utf8'));
  if(args[0]==='list-skills')return Object.keys(config.skills||{});
  if(args[0]==='read-skill')return instruction(config,args[1],env.GITHUB_TOKEN);
  const store=new GitHubStore(env.GITHUB_TOKEN,fetch,config.registry);
  if(args[0]==='status'){const s=await store.read();return {version:s.version,serverTime:new Date(s.now).toISOString(),state:s.state};}
  if(args[0]==='check'){const s=await store.read();return assertLease(s.state,args[1],s.actor,Number(args[2]),s.now);}
  if(args[0]!=='apply'||!args[1])throw new Error('USAGE: list-skills | read-skill NAME | status | check SESSION GENERATION | apply COMMAND.json');
  return transact(store,JSON.parse(await readFile(args[1],'utf8')));
}
if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv.slice(2),process.env).then(v=>console.log(typeof v==='string'?v:JSON.stringify(v,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
