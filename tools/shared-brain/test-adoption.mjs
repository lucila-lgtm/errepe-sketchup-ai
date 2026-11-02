import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { instruction,main } from './cli.mjs';
export async function runAdapterTests() {
  const content='Generic private instructions';
  const cfg={source:{repository:'example/private-brain',ref:'a'.repeat(40)},skills:{'test-skill':{path:'skills/test.md',sha256:createHash('sha256').update(content).digest('hex')}}};
  let calls=0;const request=async(url,opts)=>{calls++;assert(url.startsWith('https://api.github.com/repos/example/private-brain/'));assert.equal(opts.redirect,'error');return new Response(JSON.stringify({encoding:'base64',content:Buffer.from(content).toString('base64')}));};
  assert.equal(await instruction(cfg,'test-skill','test-token',request),content);
  await assert.rejects(instruction(cfg,'../other','test-token',request),/UNKNOWN_SKILL/);
  await assert.rejects(instruction(cfg,'test-skill','',request),/TOKEN_REQUIRED/);
  const bad=structuredClone(cfg);bad.source.repository='https://other.invalid';await assert.rejects(instruction(bad,'test-skill','test-token',request),/INVALID_SOURCE/);
  const mismatch=structuredClone(cfg);mismatch.skills['test-skill'].sha256='b'.repeat(64);await assert.rejects(instruction(mismatch,'test-skill','test-token',request),/HASH_MISMATCH/);
  await assert.rejects(instruction(cfg,'test-skill','test-token',async()=>new Response('{}',{status:403})),/SKILL_READ_403/);
  await assert.rejects(instruction(cfg,'test-skill','test-token',async()=>{throw new Error('OFFLINE');}),/OFFLINE/);
  await assert.rejects(main(['status'],{}),/LOCAL_CONFIG_REQUIRED/);assert.equal(calls,2);
  return {checks:8,network:'mock-only',configuration:'external-private-file'};
}
if(typeof process!=='undefined'&&process.argv[1]?.endsWith('test-adoption.mjs'))runAdapterTests().then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e);process.exitCode=1;});
