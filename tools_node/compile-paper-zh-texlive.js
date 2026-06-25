const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const repo = process.cwd();
const workdir = path.join(repo, 'docs/ai_atomic_framework/arxiv-paper-v1');
const texliveBin = 'C:\\texlive\\2026\\bin\\windows';
const env = {
  ...process.env,
  PATH: `${texliveBin};${process.env.PATH || ''}`,
};

let step = 0;

function run(command, args) {
  step += 1;
  const outPath = path.join(workdir, `compile-node-${String(step).padStart(2, '0')}-${command}.out`);
  const outFd = fs.openSync(outPath, 'w');
  const result = cp.spawnSync(command, args, {
    cwd: workdir,
    env,
    stdio: ['ignore', outFd, outFd],
  });
  fs.closeSync(outFd);
  const output = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8').trimEnd() : '';
  const lastLine = output.split(/\r?\n/).filter(Boolean).slice(-1)[0] || '';
  console.log(`${command}: ${lastLine} [exit=${result.status}]`);
  return result.status;
}

run('xelatex', ['-interaction=nonstopmode', 'paper-zh.tex']);
run('bibtex', ['paper-zh']);
run('xelatex', ['-interaction=nonstopmode', 'paper-zh.tex']);
run('xelatex', ['-interaction=nonstopmode', 'paper-zh.tex']);

const pdfPath = path.join(workdir, 'paper-zh.pdf');
const logPath = path.join(workdir, 'paper-zh.log');
const log = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
const errors = (log.match(/^!/gm) || []).length;
const unresolved = (log.match(/Warning: Citation/g) || []).length;
const overfull = (log.match(/Overfull/g) || []).length;
const pageMatch = [...log.matchAll(/Output written.*\((\d+) pages\)/g)].slice(-1)[0];

console.log(`FINAL: ${fs.existsSync(pdfPath) ? Math.round((fs.statSync(pdfPath).size / 1024) * 10) / 10 : 0} KB`);
console.log(`Errors: ${errors}`);
console.log(`Unresolved: ${unresolved}`);
console.log(`Overfull: ${overfull}`);
console.log(`Pages: ${pageMatch ? pageMatch[0] : 'not found'}`);

if (errors > 0) {
  for (const line of log.split(/\r?\n/).filter((x) => x.startsWith('!')).slice(0, 5)) {
    console.log(line);
  }
}
