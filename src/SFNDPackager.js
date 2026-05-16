const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * SFNDPackager
 * Collects .now.ts and .now.js files, resolves metadata,
 * and produces a versioned deployment package.
 */
class SFNDPackager {
  constructor(options = {}) {
    this.inputPath = options.inputPath || process.cwd();
    this.outputPath = options.outputPath || './sfnd-package.json';
    this.scope = options.scope || 'x_sfnd';
    this.version = options.version || '1.0.0';
  }

  discoverFiles() {
    const files = [];
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && /\.(now\.ts|now\.js)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    };
    if (fs.existsSync(this.inputPath)) {
      walk(this.inputPath);
    }
    return files;
  }

  collectMeta(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const stat = fs.statSync(filePath);
    return {
      path: path.relative(this.inputPath, filePath),
      name: path.basename(filePath),
      size: stat.size,
      modified: stat.mtime.toISOString(),
      hash: crypto.createHash('sha256').update(content).digest('hex'),
      content: content,
    };
  }

  buildPackage() {
    const discovered = this.discoverFiles();
    const artifacts = discovered.map((f) => this.collectMeta(f));
    const packageManifest = {
      scope: this.scope,
      version: this.version,
      generatedAt: new Date().toISOString(),
      artifactCount: artifacts.length,
      artifacts,
      packageHash: '',
    };
    const hashPayload = JSON.stringify(artifacts.map((a) => a.hash));
    packageManifest.packageHash = crypto.createHash('sha256').update(hashPayload).digest('hex');
    return packageManifest;
  }

  writePackage(pkg) {
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.outputPath, JSON.stringify(pkg, null, 2), 'utf-8');
    return this.outputPath;
  }

  run() {
    const pkg = this.buildPackage();
    const out = this.writePackage(pkg);
    return { package: pkg, outputPath: out };
  }
}

function main() {
  const args = process.argv.slice(2);
  let inputPath;
  let outputPath;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) inputPath = args[i + 1];
    if (args[i] === '--output' && i + 1 < args.length) outputPath = args[i + 1];
  }
  const packager = new SFNDPackager({ inputPath, outputPath });
  const result = packager.run();
  console.log(`Package created: ${result.outputPath}`);
  console.log(`Artifacts: ${result.package.artifactCount}`);
}

if (require.main === module) {
  main();
}

module.exports = SFNDPackager;
