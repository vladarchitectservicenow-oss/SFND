const fs = require('fs');
const https = require('https');
const { URL } = require('url');

/**
 * SFNDDeployer
 * Deploys validated SFND packages to a target ServiceNow instance.
 * Supports retry logic, HTTPS enforcement, and basic audit logging.
 */
class SFNDDeployer {
  constructor(options = {}) {
    this.packagePath = options.packagePath || './sfnd-package.json';
    this.instance = (options.instance || '').replace(/\/+$/, '');
    this.user = options.user || process.env.SN_USER || '';
    this.password = options.password || process.env.SN_PASS || '';
    this.timeoutMs = options.timeoutMs || 30000;
    this.retryCount = options.retryCount || 3;
  }

  loadPackage() {
    if (!fs.existsSync(this.packagePath)) {
      throw new Error(`Package not found: ${this.packagePath}`);
    }
    const raw = fs.readFileSync(this.packagePath, 'utf-8');
    return JSON.parse(raw);
  }

  async deploy() {
    if (!this.instance) {
      throw new Error('Target instance URL is required.');
    }
    if (!/^https:/i.test(this.instance)) {
      throw new Error('HTTPS is required. Plain HTTP connections are rejected.');
    }
    if (!this.user || !this.password) {
      throw new Error('Authentication credentials are missing (SN_USER / SN_PASS).');
    }

    const pkg = this.loadPackage();
    const results = [];

    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        for (const artifact of pkg.artifacts) {
          const result = await this.pushArtifact(artifact, pkg.scope);
          results.push(result);
        }
        return { success: true, results };
      } catch (err) {
        if (attempt === this.retryCount - 1) {
          return { success: false, error: err.message, results };
        }
      }
    }
    return { success: false, error: 'Max retries exceeded', results };
  }

  pushArtifact(artifact, scope) {
    return new Promise((resolve, reject) => {
      const endpoint = `${this.instance}/api/now/table/sys_script_include`;
      const url = new URL(endpoint);
      const postData = JSON.stringify({
        name: artifact.name,
        script: artifact.content,
        sys_scope: scope,
      });

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(`${this.user}:${this.password}`).toString('base64'),
        },
        timeout: this.timeoutMs,
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ name: artifact.name, status: res.statusCode, body });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.write(postData);
      req.end();
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  let packagePath;
  let instance;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--package' && i + 1 < args.length) packagePath = args[i + 1];
    if (args[i] === '--instance' && i + 1 < args.length) instance = args[i + 1];
  }
  const deployer = new SFNDDeployer({ packagePath, instance });
  const result = await deployer.deploy();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = SFNDDeployer;
