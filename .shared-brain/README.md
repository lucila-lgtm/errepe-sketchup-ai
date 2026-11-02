# Private shared context adapter

This public repository contains a generic client and skill router only. Project-specific source locations, pinned versions, available skills and central registry settings belong in a private JSON configuration outside the checkout. Set SHARED_BRAIN_CONFIG to that file and provide GITHUB_TOKEN through the environment or secret manager; never commit either. Obtain the approved configuration through the project's authenticated private workspace. No server, app or workflow receives these credentials.

Node 22+: node tools/shared-brain/cli.mjs list-skills | read-skill NAME | status | check SESSION GENERATION | apply COMMAND.json. Missing configuration fails closed. The reader fetches text from GitHub over HTTPS, checks immutable version and SHA-256, and never executes or caches downloaded text. The registry uses authenticated identity, server time, blob SHA, bounded retries, idempotency receipts and explicit expired-lease recovery. All projects must use their approved single central registry.

Private JSON shape: source {repository, ref}, registry {repository, branch, path}, skills {name: {path, sha256}}. Do not put operational data or credentials in this configuration. Do not infer a private source from public repository names.

Offline tests: node tools/shared-brain/test.mjs and node tools/shared-brain/test-adoption.mjs. These tests use fictional example/private-brain references and fake credentials only. They never access accounts or services.

Adoption is prepared on a separate branch. Do not merge, deploy or resume earlier production work as part of setup. Preserve all existing application files and local contracts. Rollback is a selective revert; never reset or delete the shared registry.
