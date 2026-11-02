import { validateState } from './registry.mjs';
export class GitHubStore {
  constructor(token, request = fetch, registry) {
    if(!token) throw new Error('GITHUB_TOKEN_REQUIRED');
    if(!registry || !/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(registry.repository) || !/^[a-z0-9_./-]+$/i.test(registry.branch) || !/^[a-z0-9_./-]+$/i.test(registry.path) || [registry.path,registry.branch].some(s=>s.split('/').some(p=>!p||p==='.'||p==='..'))) throw new Error('INVALID_REGISTRY_CONFIG');
    this.token=token;this.request=request;this.registry=registry;
  }
  async api(path, options={}) {
    return this.request('https://api.github.com'+path,{...options,redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+this.token,'X-GitHub-Api-Version':'2026-03-10','Content-Type':'application/json','Cache-Control':'no-cache'}});
  }
  async read() {
    const user=await this.api('/user');if(!user.ok)throw new Error('GITHUB_IDENTITY_'+user.status);
    const actor=(await user.json()).login;
    const c=this.registry;
    const r=await this.api(`/repos/${c.repository}/contents/${c.path}?ref=${encodeURIComponent(c.branch)}`);if(!r.ok)throw new Error('REGISTRY_READ_'+r.status);
    const now=Date.parse(r.headers.get('date'));if(!Number.isFinite(now))throw new Error('SERVER_TIME_REQUIRED');
    const f=await r.json();if(f.encoding!=='base64'||!f.sha)throw new Error('INVALID_REGISTRY_FILE');
    return {state:validateState(JSON.parse(Buffer.from(f.content,'base64').toString('utf8'))),version:f.sha,actor,now};
  }
  async compareAndSwap(version,state) {
    const c=this.registry;
    const r=await this.api(`/repos/${c.repository}/contents/${c.path}`,{method:'PUT',body:JSON.stringify({branch:c.branch,sha:version,message:`coordination: revision ${state.revision}`,content:Buffer.from(JSON.stringify(state,null,2)+'\n').toString('base64')})});
    if(r.status===409||r.status===422)return false;if(!r.ok)throw new Error('REGISTRY_WRITE_'+r.status);return true;
  }
}
