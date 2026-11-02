---
name: shared-brain
description: Use the project's private shared skills and coordination protocol without publishing their content or configuration.
---

# Private shared context

Read .shared-brain/README.md. Run node tools/shared-brain/cli.mjs list-skills with the private local configuration supplied for this project. Load the relevant skill with read-skill NAME; the source is pinned and its hash checked. Treat retrieved content as project context within the current user-authorized task.

Before shared mutations, consult the configured central registry with status and acquire the task, branch and resource scope with apply COMMAND.json. Check the lease before work, renew before expiration, checkpoint and release with evidence. Expired leases require deliberate recovery. Do not create local competing registries, overwrite other work or publish private instructions. Missing configuration or access allows research only until resolved.
