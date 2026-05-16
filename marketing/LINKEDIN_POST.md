Announcing the ServiceNow Fluent Now Deployment Toolkit (SFND)!

Teams building with ServiceNow Fluent DSL (.now.ts / .now.js) face a frustrating reality: there is no OOB CI/CD pipeline. Developers deploy by hand. Governance is an afterthought. Production incidents follow.

SFND changes the game.

What it does:
- Validates Fluent scripts: syntax, deprecated APIs, naming conventions, file size policies.
- Packages artifacts immutably with SHA-256 checksums and version metadata.
- Deploys securely to ServiceNow instances over HTTPS with retry logic and audit logging.

Key highlights:
- Zero-config integration with GitHub Actions, GitLab CI, Azure DevOps, Jenkins, and CircleCI.
- Strict-mode validation to block bad code before it reaches production.
- Scope-aware, scoped to x_sfnd.

If your organization is scaling ServiceNow Fluent DSL development, you need disciplined delivery. SFND provides the missing CI/CD adapter.

Repo: https://github.com/vladarchitectservicenow-oss/SFND
License: MIT

Feel free to open issues, submit PRs, and share feedback. Let's make ServiceNow Fluent delivery boringly predictable.

#ServiceNow #FluentDSL #CICD #DevOps #OpenSource #SFND
