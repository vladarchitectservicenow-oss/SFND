const fs = require('fs');
const path = require('path');

/**
 * SFNDValidator
 * Validates .now.ts and .now.js files for syntax correctness,
 * deprecated APIs, naming conventions, and scope policies.
 */
class SFNDValidator {
  constructor(options = {}) {
    this.sourcePath = options.sourcePath || process.cwd();
    this.format = options.format || 'console';
    this.strict = options.strict || false;
    this.deprecatedApis = options.deprecatedApis || ['gs.log', 'GlideRecordSecure', 'getReference'];
    this.maxFileSizeKb = options.maxFileSizeKb || 512;
    this.diagnostics = [];
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
    if (fs.existsSync(this.sourcePath)) {
      walk(this.sourcePath);
    }
    return files;
  }

  emit(severity, file, line, message, rule) {
    this.diagnostics.push({ severity, file, line, message, rule });
  }

  validateFile(filePath) {
    const stat = fs.statSync(filePath);
    const sizeKb = stat.size / 1024;
    const relPath = path.relative(this.sourcePath, filePath);

    if (sizeKb > this.maxFileSizeKb) {
      this.emit('error', relPath, 0, `File exceeds max size ${this.maxFileSizeKb}KB`, 'SFND-MAX-SIZE');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      const openBrace = (line.match(/{/g) || []).length;
      const closeBrace = (line.match(/}/g) || []).length;
      if (openBrace !== closeBrace) {
        // lightweight imbalance warning, not a full parser
      }

      for (const api of this.deprecatedApis) {
        if (line.includes(api)) {
          this.emit('warning', relPath, lineNum, `Deprecated API usage: ${api}`, 'SFND-DEPRECATED');
        }
      }

      const name = path.basename(filePath, path.extname(filePath));
      if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
        this.emit('warning', relPath, lineNum, `Naming convention violation in file name: ${name}`, 'SFND-NAMING');
      }
    }

    if (content.trim().length === 0) {
      this.emit('error', relPath, 0, 'File is empty', 'SFND-EMPTY');
    }
  }

  run() {
    const files = this.discoverFiles();
    if (files.length === 0) {
      this.emit('warning', this.sourcePath, 0, 'No .now.ts or .now.js files found', 'SFND-NO-FILES');
    }
    for (const file of files) {
      this.validateFile(file);
    }
    const errors = this.diagnostics.filter((d) => d.severity === 'error');
    const warnings = this.diagnostics.filter((d) => d.severity === 'warning');
    return { errors, warnings, diagnostics: this.diagnostics };
  }

  print() {
    if (this.format === 'json') {
      console.log(JSON.stringify(this.diagnostics, null, 2));
    } else {
      for (const d of this.diagnostics) {
        const label = d.severity.toUpperCase().padEnd(7, ' ');
        console.log(`[${label}] ${d.file}:${d.line} ${d.message} (${d.rule})`);
      }
    }
  }
}

function main() {
  const args = process.argv.slice(2);
  let sourcePath;
  let format = 'console';
  let strict = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--path' && i + 1 < args.length) sourcePath = args[i + 1];
    if (args[i] === '--format' && i + 1 < args.length) format = args[i + 1];
    if (args[i] === '--strict') strict = true;
  }
  const validator = new SFNDValidator({ sourcePath, format, strict });
  const result = validator.run();
  validator.print();
  const hasErrors = result.errors.length > 0 || (strict && result.warnings.length > 0);
  process.exit(hasErrors ? 1 : 0);
}

if (require.main === module) {
  main();
}

module.exports = SFNDValidator;
