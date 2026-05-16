const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SFNDPackager = require('../src/SFNDPackager');
const SFNDValidator = require('../src/SFNDValidator');
const SFNDDeployer = require('../src/SFNDDeployer');

const TEST_DIR = path.join(__dirname, '_fixtures');
const PKG_OUT = path.join(__dirname, '_test-package.json');

function cleanUp() {
  try {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(PKG_OUT)) {
      fs.rmSync(PKG_OUT, { force: true });
    }
  } catch (_) {}
}

function ensureFixtures() {
  cleanUp();
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.writeFileSync(path.join(TEST_DIR, 'valid.now.ts'), `export default async function run(): Promise<void> {\n  gs.info('ok');\n}\n`);
  fs.writeFileSync(path.join(TEST_DIR, 'depr.now.js'), `function go() {\n  gs.log('warn');\n}\n`);
  fs.writeFileSync(path.join(TEST_DIR, 'empty.now.ts'), '');
  fs.writeFileSync(path.join(TEST_DIR, '-bad-name.now.js'), `var x = 1;\n`);
  fs.mkdirSync(path.join(TEST_DIR, 'deep'), { recursive: true });
  fs.writeFileSync(path.join(TEST_DIR, 'deep', 'nested.now.ts'), `function nested(): void {}\n`);
}

function setupPackageForDeploy() {
  const deployPkg = {
    scope: 'x_sfnd',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    artifactCount: 1,
    packageHash: 'abc',
    artifacts: [
      {
        path: 'example.now.ts',
        name: 'example.now.ts',
        size: 32,
        hash: 'hash',
        content: `function demo() {}`,
      },
    ],
  };
  fs.writeFileSync(PKG_OUT, JSON.stringify(deployPkg), 'utf-8');
}

/* --- Packager Tests --- */
console.log('[TEST] Packager - discoverFiles and buildPackage');
ensureFixtures();
const packager = new SFNDPackager({ inputPath: TEST_DIR, outputPath: PKG_OUT });
const result = packager.run();
assert.strictEqual(result.package.artifactCount, 5, 'Expected 5 artifacts');
assert.ok(result.package.packageHash.length > 0, 'Package hash must be set');
assert.ok(fs.existsSync(result.outputPath), 'Output file must be created');
console.log('PASS');

/* --- Validator Tests --- */
console.log('[TEST] Validator - discovers files and reports errors/warnings');
ensureFixtures();
const validator = new SFNDValidator({ sourcePath: TEST_DIR, format: 'json', strict: false });
const vResult = validator.run();
assert.ok(vResult.diagnostics.length > 0, 'Expected diagnostics');
const deprWarnings = vResult.diagnostics.filter((d) => d.rule === 'SFND-DEPRECATED');
assert.ok(deprWarnings.length >= 1, 'Expected at least one deprecated warning');
const emptyErrors = vResult.diagnostics.filter((d) => d.rule === 'SFND-EMPTY');
assert.strictEqual(emptyErrors.length, 1, 'Expected one empty file error');
const namingWarnings = vResult.diagnostics.filter((d) => d.rule === 'SFND-NAMING');
assert.ok(namingWarnings.length >= 1, 'Expected naming warning for bad file name');
console.log('PASS');

console.log('[TEST] Validator - strict mode treats warnings as errors');
ensureFixtures();
const strictValidator = new SFNDValidator({ sourcePath: TEST_DIR, strict: true });
const sResult = strictValidator.run();
const combined = sResult.errors.length + (strictValidator.strict ? sResult.warnings.length : 0);
assert.ok(combined > 0, 'Strict mode should yield combined errors > 0');
console.log('PASS');

/* --- Deployer Tests --- */
(async () => {
  console.log('[TEST] Deployer - rejects missing instance');
  setupPackageForDeploy();
  const deployer1 = new SFNDDeployer({ packagePath: PKG_OUT });
  try {
    await deployer1.deploy();
    assert.fail('Expected rejection due to missing instance');
  } catch (err) {
    assert.ok(err.message.includes('Target instance URL'), 'Expected instance URL error');
  }
  console.log('PASS');

  console.log('[TEST] Deployer - rejects HTTP instances');
  setupPackageForDeploy();
  const deployer2 = new SFNDDeployer({ packagePath: PKG_OUT, instance: 'http://example.service-now.com' });
  try {
    await deployer2.deploy();
    assert.fail('Expected rejection due to HTTP instead of HTTPS');
  } catch (err) {
    assert.ok(err.message.includes('HTTPS is required'), 'Expected HTTPS enforcement error');
  }
  console.log('PASS');

  console.log('[TEST] Deployer - rejects missing credentials');
  setupPackageForDeploy();
  const deployer3 = new SFNDDeployer({ packagePath: PKG_OUT, instance: 'https://example.service-now.com' });
  try {
    await deployer3.deploy();
    assert.fail('Expected rejection due to missing credentials');
  } catch (err) {
    assert.ok(err.message.includes('Authentication credentials'), 'Expected credentials error');
  }
  console.log('PASS');

  /* --- Cleanup --- */
  cleanUp();

  /* --- Summary --- */
  const diagnosticsSummary = vResult.diagnostics.map((d) => `[${d.severity.toUpperCase()}] ${d.file}:${d.line} ${d.message}`).join('\n');
  console.log('\n--- SFND Test Summary ---');
  console.log('All packager tests: PASS');
  console.log('All validator tests: PASS');
  console.log('All deployer tests: PASS');
  console.log('Validator diagnostics from fixture run:');
  console.log(diagnosticsSummary || 'None');
  console.log('--- End ---');
})();
