const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const repo = process.cwd();
const pdfPath = path.join(repo, 'docs/ai_atomic_framework/arxiv-paper-v1/paper-zh.pdf');
const runtimeRoot = 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const python = path.join(runtimeRoot, 'python/python.exe');

function runPython(code, args = []) {
  const result = cp.spawnSync(python, ['-c', code, ...args], {
    cwd: repo,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 50,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || `python exited with ${result.status}`);
  }
  return result.stdout;
}

const probeCode = [
  'import json',
  'mods={}',
  'for m in ["pypdf","pdfplumber","fitz","reportlab"]:',
  '    try:',
  '        __import__(m); mods[m]=True',
  '    except Exception:',
  '        mods[m]=False',
  'print(json.dumps(mods, ensure_ascii=False))',
].join('\n');

const extractCode = [
  'import json, sys',
  'from pypdf import PdfReader',
  'pdf=sys.argv[1]',
  'reader=PdfReader(pdf)',
  'root=reader.trailer.get("/Root", {})',
  'names=root.get("/Names", {}) if root else {}',
  'embedded=bool(names.get("/EmbeddedFiles")) if names else False',
  'pages=[]',
  'for i,p in enumerate(reader.pages):',
  '    text=p.extract_text() or ""',
  '    mb=p.mediabox',
  '    pages.append({"page":i+1,"chars":len(text),"head":text[:500],"width":float(mb.width),"height":float(mb.height)})',
  'meta={str(k):str(v) for k,v in (reader.metadata or {}).items()}',
  'print(json.dumps({"pages":len(reader.pages),"embeddedFiles":embedded,"metadata":meta,"pageInfo":pages[:5],"totalChars":sum(p["chars"] for p in pages)}, ensure_ascii=False, indent=2))',
].join('\n');

const result = {
  pdf: {
    path: pdfPath,
    exists: fs.existsSync(pdfPath),
    bytes: fs.existsSync(pdfPath) ? fs.statSync(pdfPath).size : 0,
    mtime: fs.existsSync(pdfPath) ? fs.statSync(pdfPath).mtime.toISOString() : null,
  },
  python: {
    path: python,
    exists: fs.existsSync(python),
  },
};

result.modules = JSON.parse(runPython(probeCode));
if (result.modules.pypdf && result.pdf.exists) {
  result.extract = JSON.parse(runPython(extractCode, [pdfPath]));
}

console.log(JSON.stringify(result, null, 2));
