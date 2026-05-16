# ServiceNow Fluent Now Deployment Toolkit (SFND)

## Overview

The **ServiceNow Fluent Now Deployment Toolkit (SFND)** is a comprehensive CI/CD adapter purpose-built for ServiceNow Fluent DSL workflows. In modern ServiceNow development environments, teams increasingly rely on Fluent scripting patterns encapsulated in `.now.ts` and `.now.js` files to define business logic, automate processes, and extend platform capabilities. Despite the growing adoption of Fluent DSL, the ServiceNow ecosystem lacks an out-of-the-box (OOB) continuous integration and continuous deployment (CI/CD) pipeline capable of validating, packaging, and deploying these artifacts with the rigor enterprise teams demand.

SFND bridges this critical gap. It provides a lightweight yet powerful command-line toolkit that integrates directly into existing CI/CD platforms such as GitHub Actions, GitLab CI, Azure DevOps, Jenkins, and CircleCI. By introducing structured validation, deterministic packaging, and secure deployment operations, SFND empowers development teams to treat Fluent scripts as first-class citizens in their software delivery lifecycle.

## The Problem

ServiceNow Fluent DSL represents a significant evolution in how developers interact with the Now Platform. The declarative, type-safe nature of `.now.ts` files improves maintainability and reduces runtime errors. However, the deployment story remains fragmented and manual. Common pain points include:

- **No Native CI/CD Integration:** ServiceNow does not ship an OOB pipeline for Fluent DSL artifacts. Teams must cobble together custom scripts that are brittle and hard to maintain.
- **Manual Deployment Friction:** Developers often deploy `.now.ts` files directly through the ServiceNow UI or via ad-hoc REST calls, bypassing code review, testing, and audit trails.
- **Zero Governance:** Without an automated gate, deprecated APIs, syntax errors, and policy violations reach production instances unchecked.
- **Inconsistent Packaging:** There is no standardized format for bundling Fluent scripts, leading to environment-specific failures and "works on my instance" syndrome.

SFND was created to eliminate these pain points through automation, validation, and disciplined deployment practices.

## Architecture

SFND is organized as a modular Node.js toolkit with three core orchestration components and a supporting infrastructure layer:

### Core Components

1. **SFNDPackager** (`src/SFNDPackager.js`)
   - Discovers `.now.ts` and `.now.js` files across the repository.
   - Resolves dependencies and metadata.
   - Produces a versioned, checksum-verified deployment package in JSON format.

2. **SFNDValidator** (`src/SFNDValidator.js`)
   - Performs static syntax analysis on Fluent DSL source files.
   - Detects usage of deprecated ServiceNow APIs and discouraged patterns.
   - Enforces naming conventions, scope boundaries, and policy rules.
   - Returns detailed diagnostic reports with file, line, and severity annotations.

3. **SFNDDeployer** (`src/SFNDDeployer.js`)
   - Authenticates to a target ServiceNow instance using instance-scoped credentials.
   - Uploads the validated package via REST API.
   - Handles retry logic, conflict resolution, and rollback triggers.
   - Logs deployment results for audit and compliance purposes.

### Supporting Files

- `src/sys_app.xml` — ServiceNow application manifest defining the scoped application metadata for SFND itself.
- `test/test_sfnd.js` — Comprehensive test suite with mocked dependencies, exercising validation, packaging, and deployment logic.
- `marketing/WHITEPAPER.md` — Strategic whitepaper for organizational adoption.
- `marketing/LINKEDIN_POST.md` — Executive summary for social rollout.

## Installation

### Prerequisites

- Node.js 18.x or later
- NPM 9.x or later
- Access to a ServiceNow instance with REST API enabled
- A scoped application (`x_sfnd`) configured on the instance

### Local Setup

```bash
git clone https://github.com/vladarchitectservicenow-oss/SFND.git
cd SFND
npm install
```

### CI/CD Integration

Add the following steps to your pipeline configuration:

```yaml
- name: Install SFND
  run: npm ci
- name: Validate Fluent Files
  run: node src/SFNDValidator.js --path ./fluent-src
- name: Package Fluent Files
  run: node src/SFNDPackager.js --input ./fluent-src --output ./dist/sfnd-package.json
- name: Deploy to ServiceNow
  run: node src/SFNDDeployer.js --package ./dist/sfnd-package.json --instance $SN_INSTANCE
  env:
    SN_USER: ${{ secrets.SN_USER }}
    SN_PASS: ${{ secrets.SN_PASS }}
```

## Usage

### Command-Line Interface

SFND exposes three primary CLI entrypoints, each designed for integration into build pipelines:

#### Validation

```bash
node src/SFNDValidator.js --path <source-directory> [--format json|console] [--strict]
```

- `--path`: Root directory containing `.now.ts` and `.now.js` files.
- `--format`: Output format for diagnostics. Default is `console`.
- `--strict`: Treat warnings as errors and fail the process.

#### Packaging

```bash
node src/SFNDPackager.js --input <source-directory> --output <package-file>
```

- `--input`: Directory to scan for Fluent DSL files.
- `--output`: Path where the deployment package will be written.

#### Deployment

```bash
node src/SFNDDeployer.js --package <package-file> --instance <instance-url>
```

- `--package`: The JSON package produced by SFNDPackager.
- `--instance`: Target ServiceNow instance URL (e.g., `https://dev12345.service-now.com`).

Environment variables `SN_USER` and `SN_PASS` must be set for authentication.

## Practical Example

Below is a complete end-to-end example for a team starting from scratch. Assume your repository contains a `fluent/` directory with `.now.ts` files. Start by creating `.sfndrc.json` in the project root:

```json
{
  "scope": "x_sfnd",
  "validation": { "deprecatedApis": ["gs.log"], "maxFileSizeKb": 256 },
  "deployment": { "timeoutMs": 45000, "retryCount": 3 }
}
```

Add a GitHub Actions workflow, then run:

```bash
npm ci
node src/SFNDValidator.js --path ./fluent --strict
node src/SFNDPackager.js --input ./fluent --output ./dist/sfnd-package.json
node src/SFNDDeployer.js --package ./dist/sfnd-package.json --instance $SN_INSTANCE
```

This gives teams syntax, deprecation, and naming validation; immutable packaging; and secure deployment with retry logic.

## Configuration

SFND supports an optional `.sfndrc.json` configuration file in the project root. Example:

```json
{
  "scope": "x_sfnd",
  "validation": {
    "deprecatedApis": ["gs.log", "GlideRecordSecure"],
    "namingConvention": "camelCase",
    "maxFileSizeKb": 512
  },
  "deployment": {
    "timeoutMs": 30000,
    "retryCount": 3,
    "rollbackOnFailure": true
  }
}
```

## Testing

A comprehensive test suite is included under `test/test_sfnd.js`. It uses a lightweight mocking strategy to simulate file system state, REST API responses, and validation edge cases without requiring a live ServiceNow instance.

Run tests:

```bash
npm test
```

## Security Considerations

- Credentials are read exclusively from environment variables or encrypted secrets stores. SFND never persists passwords to disk.
- All REST communications are enforced over HTTPS. Plain HTTP connections are rejected.
- Deployment packages include SHA-256 checksums to detect tampering in transit.
- Audit logs capture deployment actor, timestamp, target instance, and package version.

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---|---|---|
| `Package not found` | Incorrect `--package` path | Verify output path from SFNDPackager matches deployer input. |
| `HTTP 401` | Invalid credentials | Check `SN_USER` and `SN_PASS` environment variables. |
| `No .now.ts or .now.js files found` | Source path mismatch | Use absolute paths or verify `--path / --input` values. |
| Strict validation fails | Deprecated API or naming violation | Review diagnostics output and fix affected files. |
| `Request timed out` | Instance latency or firewall | Increase `timeoutMs` in `.sfndrc.json` or verify network path. |

## Architecture Deep Dive

The toolkit follows a layered architecture: Discovery → Validation → Packaging → Deployment. Each layer is independently unit-tested and can be invoked in isolation. The Packager does not depend on the Validator, allowing pipelines to run them in parallel or sequence based on compliance requirements. The Deployer is stateless; all deployment context is captured in the package manifest, making audits straightforward.

Diagrammatically:

```
Developer Workspace
       │
       ▼
  Discovery (.now.ts / .now.js)
       │
  ┌────┴────┐
  ▼         ▼
Validator  Packager
  │         │
  └────┬────┘
       ▼
   Deployment
       │
       ▼
Target ServiceNow Instance
```

## Community and Support

SFND is maintained by the ServiceNow Architecture Open Source initiative. We encourage community participation through issues, discussions, and pull requests. Enterprise support and consulting are available via the maintainers. For security disclosures, please contact the maintainers directly rather than opening public issues.

## Comparison with Native Approaches

ServiceNow native deployment options include Update Sets, Application Files, and the ServiceNow Studio bulk editor. While functional, these tools do not support automated Fluent DSL validation, checksum verification, or standardized packaging. Update Sets capture entire table snapshots and are poorly suited for incremental, source-controlled delivery of `.now.ts` files. Studio requires human interaction, which precludes true CI/CD. SFND fills this gap by treating Fluent scripts as discrete artifacts with their own lifecycle, versioning, and quality gates.

## Deployment Environments

SFND is designed for multi-environment promotion. The recommended pattern is to run validation and packaging once per commit, then deploy the same immutable package artifact to each target instance in sequence: Development, Test, Staging, and Production. Using a single package across environments eliminates "works on my machine" drift and ensures that the exact bytes validated by the pipeline are the bytes deployed to production. Teams should store environment-specific configuration, such as instance URLs and timeout values, in CI/CD secrets or environment variables rather than committing them to source control.

## Acknowledgments

SFND draws inspiration from existing ServiceNow ecosystem tools, the broader Node.js CI/CD tooling landscape, and the TypeScript community's emphasis on type-safe automation. Special thanks to early adopters who provided feedback during the initial design phase.

## Roadmap

- **Q3 2025**: ServiceNow Store publication for `x_sfnd` scoped application.
- **Q4 2025**: IDE extensions for VS Code and JetBrains providing real-time validation.
- **Q1 2026**: Policy-as-code engine allowing custom governance rule definitions.
- **Q2 2026**: Integration with ServiceNow App Engine Studio for low-code pipeline authoring.

## License

SFND is released under the MIT License. See `LICENSE` for full terms.

## Contributing

Contributions are welcome. Please open issues for bug reports, feature requests, or security disclosures. Pull requests should include tests and adhere to the existing code style.

## Contact

Maintained by the ServiceNow Architecture Open Source initiative.
Repository: https://github.com/vladarchitectservicenow-oss/SFND
