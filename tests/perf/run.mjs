import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const scenario = process.argv[2];
if (!scenario) {
  console.error('usage: node tests/perf/run.mjs <scenario-name>');
  process.exit(1);
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'));
const scriptPath = path.join(root, 'scenarios', `${scenario}.js`);
const resultsDir = path.join(root, 'results');
mkdirSync(resultsDir, { recursive: true });

const jsonOut = path.join(resultsDir, `${scenario}.json`);
const htmlOut = path.join(resultsDir, `${scenario}.html`);
const summaryOut = path.join(resultsDir, `${scenario}-summary.json`);

const env = {
  ...process.env,
  K6_WEB_DASHBOARD: 'true',
  K6_WEB_DASHBOARD_EXPORT: htmlOut,
};

const args = [
  'run',
  '--summary-export', summaryOut,
  '--out', `json=${jsonOut}`,
  scriptPath,
  ...process.argv.slice(3),
];

console.log(`[perf] k6 ${args.join(' ')}`);
console.log(`[perf] HTML report → ${htmlOut}`);

const child = spawn('k6', args, { env, stdio: 'inherit', shell: true });
child.on('exit', (code) => process.exit(code ?? 1));
