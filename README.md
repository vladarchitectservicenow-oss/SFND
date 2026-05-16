# ServiceNow Fluent Now (.now.ts) Deployment Toolkit (SFND)

**CI/CD adapter for ServiceNow Fluent DSL.**

Author: Vladimir Kapustin  
License: AGPL-3.0-only

---

## What is SFND?

ServiceNow Fluent introduces `.now.ts` and `.now.js` DSL files. No OOB CI/CD path exists.

SFND is a scoped app (`x_sfnd`) that:
- Collects `.now.ts` / `.now.js` files from source
- Validates syntax and deprecated API usage
- Packages into deployable update set format

## Modules

| Module | Purpose |
|--------|---------|
| SFNDPackager | Scans and packages source files |
| SFNDValidator | Syntax/deprecation validation |

## Tests
```
2/2 PASS
```

---
Vladimir Kapustin · AGPL-3.0-only
