import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'Dockerfile',
  'docker-compose.yml',
  'local-compose.yaml',
  'README.md',
  'USER_GUIDE.md',
  'backend/src/server.js',
  'frontend/src/App.jsx'
];

for (const file of requiredFiles) {
  if (!existsSync(path.join(root, file))) {
    throw new Error(`Missing required file: ${file}`);
  }
}

function collectJavaScriptFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJavaScriptFiles(fullPath);
    if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) return [fullPath];
    return [];
  });
}

for (const file of collectJavaScriptFiles(path.join(root, 'backend', 'src'))) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

for (const file of collectJavaScriptFiles(path.join(root, 'backend', 'tests'))) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

JSON.parse(readFileSync(path.join(root, 'shared', 'app-version.json'), 'utf8'));
console.log('Lint checks passed.');
