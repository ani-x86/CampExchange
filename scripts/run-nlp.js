import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const venvPy = path.resolve(process.cwd(), 'nlp', '.venv', 'Scripts', 'python.exe');
const py = fs.existsSync(venvPy) ? venvPy : 'python';

const child = spawn(py, args, { stdio: 'inherit' });
child.on('exit', (code) => {
  process.exit(code ?? 0);
});
