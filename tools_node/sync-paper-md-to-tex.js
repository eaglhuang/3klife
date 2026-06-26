const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAPER_DIR = path.join(ROOT, 'docs', 'ai_atomic_framework', 'arxiv-paper-v1');
const mdPath = path.join(PAPER_DIR, 'paper.v3.1.md');
const texPath = path.join(PAPER_DIR, 'paper-zh.tex');
const bibPath = path.join(PAPER_DIR, 'references.bib');
const argv = process.argv.slice(2);

function takeArg(flag) {
  const idx = argv.indexOf(flag);
  if (idx < 0) return null;
  return argv[idx + 1] || null;
}

const outputPath = takeArg('--output') ? path.resolve(process.cwd(), takeArg('--output')) : texPath;
const backupPath = takeArg('--backup');
const checkOnly = argv.includes('--check');
const noBackup = argv.includes('--no-backup');

function makeTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function defaultBackupFor(filePath) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  return path.join(dir, `${base}.before-sync-${makeTimestamp()}.bak`);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function splitLines(text) {
  return text.split(/\r\n|\n|\r/);
}

function escapeLatexText(text) {
  return String(text)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/≤/g, '$\\leq$')
    .replace(/≥/g, '$\\geq$')
    .replace(/→/g, '$\\rightarrow$')
    .replace(/←/g, '$\\leftarrow$')
    .replace(/↔/g, '$\\leftrightarrow$')
    .replace(/×/g, '$\\times$')
    .replace(/–/g, '--')
    .replace(/—/g, '---')
    .replace(/…/g, '\\ldots{}')
    .replace(/<br\s*\/?>/gi, '\\newline ');
}

function escapeLatexCode(text) {
  return String(text)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function latexUrl(url) {
  return String(url).replace(/([%#{}])/g, '\\$1');
}

function inline(text) {
  const src = String(text);
  let out = '';
  let i = 0;
  while (i < src.length) {
    const codeAt = src.indexOf('`', i);
    const boldAt = src.indexOf('**', i);
    const linkAt = src.indexOf('[', i);
    const displayMathAt = src.indexOf('$$', i);
    const mathAt = src.indexOf('$', i);
    const candidates = [codeAt, boldAt, linkAt, displayMathAt, mathAt].filter((n) => n >= 0);
    const next = candidates.length ? Math.min(...candidates) : -1;
    if (next < 0) {
      out += escapeLatexText(src.slice(i));
      break;
    }
    if (next > i) {
      out += escapeLatexText(src.slice(i, next));
      i = next;
      continue;
    }
    if (codeAt === i) {
      const end = src.indexOf('`', i + 1);
      if (end < 0) {
        out += escapeLatexText(src[i]);
        i += 1;
      } else {
        const code = src.slice(i + 1, end);
        out += `\\texttt{\\seqsplit{${escapeLatexCode(code)}}}`;
        i = end + 1;
      }
      continue;
    }
    if (boldAt === i) {
      const end = src.indexOf('**', i + 2);
      if (end < 0) {
        out += escapeLatexText(src.slice(i, i + 2));
        i += 2;
      } else {
        out += `\\textbf{${inline(src.slice(i + 2, end))}}`;
        i = end + 2;
      }
      continue;
    }
    if (linkAt === i) {
      const closeText = src.indexOf(']', i + 1);
      const openUrl = closeText >= 0 ? src.indexOf('(', closeText + 1) : -1;
      const closeUrl = openUrl >= 0 ? src.indexOf(')', openUrl + 1) : -1;
      if (closeText >= 0 && openUrl === closeText + 1 && closeUrl >= 0) {
        const label = src.slice(i + 1, closeText);
        const url = src.slice(openUrl + 1, closeUrl);
        out += `\\href{${latexUrl(url)}}{${inline(label)}}`;
        i = closeUrl + 1;
      } else {
        out += escapeLatexText(src[i]);
        i += 1;
      }
      continue;
    }
    if (displayMathAt === i) {
      const end = src.indexOf('$$', i + 2);
      if (end < 0) {
        out += escapeLatexText(src.slice(i, i + 2));
        i += 2;
      } else {
        out += src.slice(i, end + 2);
        i = end + 2;
      }
      continue;
    }
    if (mathAt === i) {
      const end = src.indexOf('$', i + 1);
      if (end < 0) {
        out += escapeLatexText(src[i]);
        i += 1;
      } else {
        out += src.slice(i, end + 1);
        i = end + 1;
      }
      continue;
    }
  }
  return out;
}

function cleanHeading(text) {
  return String(text)
    .replace(/^\d+(?:\.\d+)*\s+/, '')
    .replace(/^A\.\d+(?:\.\d+)*\s+/, '')
    .replace(/^Appendix\s+[A-Z]\.\s+/, '')
    .trim();
}

function renderHeading(level, text, state) {
  const raw = text.trim();
  if (/^References（參考文獻）/.test(raw)) {
    state.skipReferences = true;
    return [];
  }
  if (/^(A\.5|Appendix B\.|Appendix C\.)/.test(raw)) {
    state.skipReferences = false;
  }
  if (state.skipReferences) return [];

  if (/^Appendix（附錄）/.test(raw)) {
    state.inAppendix = true;
    return ['\\appendix', '\\section*{Appendix（附錄）}'];
  }
  if (/^Abstract（摘要）/.test(raw)) return ['\\section*{摘要}'];
  if (/^Acknowledgements/.test(raw)) return ['\\section*{Acknowledgements}'];

  const title = inline(cleanHeading(raw));
  if (state.inAppendix) {
    if (level <= 2) return [`\\section*{${inline(raw)}}`];
    if (level === 3) return [`\\subsection*{${inline(raw)}}`];
    return [`\\subsubsection*{${inline(raw)}}`];
  }
  if (level <= 2) return [`\\section{${title}}`];
  if (level === 3) return [`\\subsection{${title}}`];
  return [`\\subsubsection*{${inline(raw)}}`];
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function isTableLine(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function splitTableRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  const cells = [];
  let cur = '';
  let inCode = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function renderTable(rows) {
  const body = rows.filter((row) => !isTableSeparator(row));
  if (!body.length) return [];
  const parsed = body.map(splitTableRow);
  const cols = Math.max(...parsed.map((row) => row.length));
  const width = Math.max(0.12, Math.min(0.28, 0.92 / cols)).toFixed(2);
  const spec = Array.from({ length: cols }, () => `L{${width}\\textwidth}`).join('');
  const out = ['\\begingroup', '\\footnotesize', `\\begin{longtable}{${spec}}`, '\\toprule'];
  parsed.forEach((row, idx) => {
    const cells = Array.from({ length: cols }, (_, col) => inline(row[col] || ''));
    out.push(`${cells.join(' & ')} \\\\`);
    out.push(idx === 0 ? '\\midrule' : '');
  });
  out.push('\\bottomrule', '\\end{longtable}', '\\endgroup');
  return out.filter(Boolean);
}

function renderParagraph(lines) {
  const text = lines.join(' ').trim();
  if (!text) return [];
  if (/^Table\s+[A-Z0-9.]+?\s*[—-]/.test(text)) {
    return [`\\noindent\\textbf{${inline(text)}}`];
  }
  return [inline(text)];
}

function convertMarkdown(md) {
  const lines = splitLines(md);
  const out = ['\\maketitle', ''];
  const state = {
    inAppendix: false,
    skipReferences: false,
    inCode: false,
    list: null,
    paragraph: [],
  };

  function flushParagraph() {
    if (state.paragraph.length) {
      out.push(...renderParagraph(state.paragraph), '');
      state.paragraph = [];
    }
  }
  function closeList() {
    if (state.list) {
      out.push(state.list === 'enumerate' ? '\\end{enumerate}' : '\\end{itemize}', '');
      state.list = null;
    }
  }
  function openList(kind) {
    if (state.list !== kind) {
      closeList();
      out.push(kind === 'enumerate' ? '\\begin{enumerate}' : '\\begin{itemize}');
      state.list = kind;
    }
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (i < 14) {
      i += 1;
      continue;
    }

    if (/^```/.test(line.trim())) {
      flushParagraph();
      closeList();
      if (!state.inCode) {
        out.push('\\begin{Verbatim}[breaklines=true,fontsize=\\footnotesize]');
        state.inCode = true;
      } else {
        out.push('\\end{Verbatim}', '');
        state.inCode = false;
      }
      i += 1;
      continue;
    }
    if (state.inCode) {
      out.push(line);
      i += 1;
      continue;
    }

    if (/^\s*\$\$\s*$/.test(line)) {
      flushParagraph();
      closeList();
      const mathLines = [];
      i += 1;
      while (i < lines.length && !/^\s*\$\$\s*$/.test(lines[i])) {
        mathLines.push(lines[i]);
        i += 1;
      }
      out.push('$$');
      out.push(...mathLines);
      out.push('$$', '');
      if (i < lines.length) i += 1;
      continue;
    }

    if (/^\s*\$\$.+\$\$\s*$/.test(line.trim())) {
      flushParagraph();
      closeList();
      out.push(line.trim(), '');
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      out.push(...renderHeading(heading[1].length, heading[2], state), '');
      i += 1;
      continue;
    }

    if (state.skipReferences) {
      i += 1;
      continue;
    }

    if (/^\s*---\s*$/.test(line)) {
      flushParagraph();
      closeList();
      out.push('\\medskip', '');
      i += 1;
      continue;
    }

    if (isTableLine(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushParagraph();
      closeList();
      const rows = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && isTableLine(lines[i])) {
        rows.push(lines[i]);
        i += 1;
      }
      out.push(...renderTable(rows), '');
      continue;
    }

    const ordered = line.match(/^\s*(\d+)\.\s+(.+)$/);
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      openList('enumerate');
      out.push(`\\item ${inline(ordered[2])}`);
      i += 1;
      continue;
    }
    if (unordered) {
      flushParagraph();
      openList('itemize');
      out.push(`\\item ${inline(unordered[1])}`);
      i += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      closeList();
      const quoteLines = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, '').trim());
        i += 1;
      }
      out.push('\\begin{quote}', ...renderParagraph(quoteLines), '\\end{quote}', '');
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      i += 1;
      continue;
    }

    state.paragraph.push(line.trim());
    i += 1;
  }
  flushParagraph();
  closeList();
  if (state.inCode) out.push('\\end{Verbatim}', '');
  out.push('\\nocite{*}', '\\bibliographystyle{plainnat}', '\\bibliography{references}', '', '\\end{document}', '');
  return out.join('\n');
}

function ensureBibEntries(bib) {
  const entries = {
    Sun1998OT: `@article{Sun1998OT,
  author = {Chengzheng Sun and Xiaohua Jia and Yanchun Zhang and Yun Yang and David Chen},
  title = {Achieving Convergence, Causality Preservation, and Intention Preservation in Real-Time Cooperative Editing Systems},
  journal = {ACM Transactions on Computer-Human Interaction},
  volume = {5},
  number = {1},
  pages = {63--108},
  year = {1998},
  doi = {10.1145/274444.274447}
}`,
    SunEllis1998OT: `@inproceedings{SunEllis1998OT,
  author = {Chengzheng Sun and Clarence A. Ellis},
  title = {Operational Transformation in Real-Time Group Editors: Issues, Algorithms, and Achievements},
  booktitle = {Proceedings of the 1998 ACM Conference on Computer Supported Cooperative Work},
  pages = {59--68},
  year = {1998},
  publisher = {ACM},
  doi = {10.1145/289444.289469}
}`,
    Chacon2014ProGit: `@book{Chacon2014ProGit,
  author = {Scott Chacon and Ben Straub},
  title = {Pro Git},
  edition = {2},
  publisher = {Apress},
  year = {2014},
  url = {https://git-scm.com/book}
}`,
    Bernstein1987ConcurrencyControl: `@book{Bernstein1987ConcurrencyControl,
  author = {Philip A. Bernstein and Vassos Hadzilacos and Nathan Goodman},
  title = {Concurrency Control and Recovery in Database Systems},
  publisher = {Addison-Wesley},
  year = {1987},
  url = {https://www.microsoft.com/en-us/research/people/philbe/book/}
}`,
  };
  let next = bib.trimEnd();
  for (const [key, entry] of Object.entries(entries)) {
    const hasKey = new RegExp(`@\\w+\\s*\\{\\s*${key}\\s*,`).test(next);
    if (!hasKey) next += `\n\n${entry}`;
  }
  return `${next}\n`;
}

// ---------------------------------------------------------------------------
// CLAUDE-FIG marker preservation
// ---------------------------------------------------------------------------
// Hand-authored figure blocks live inside the otherwise md-driven body,
// wrapped in:
//     % CLAUDE-FIG-BEGIN: <name>
//     \begin{figure}[H] ... \end{figure}
//     % CLAUDE-FIG-END:   <name>
// Without preservation, convertMarkdown(md) regenerates the whole body and
// loses these blocks (md only contains the Verbatim Mermaid pseudo-figures).
// We:
//   1. Scan the OLD tex for marker blocks and remember each one together
//      with the figure number from the nearest preceding `Figure N ---` line
//      (which md sync will regenerate verbatim).
//   2. In the NEW body, locate that same `Figure N ---` line and replace the
//      Verbatim block that follows it with the saved marker block.
// If the anchor cannot be located the marker block is silently dropped (warns
// to stderr), so old/stale markers never break the build.

function collectPreservedFigureBlocks(oldTex) {
  const out = [];
  const blockRe = /% CLAUDE-FIG-BEGIN:\s*([a-z0-9\-_]+)[\s\S]*?% CLAUDE-FIG-END:\s*\1/g;
  let m;
  while ((m = blockRe.exec(oldTex)) !== null) {
    const name = m[1];
    const block = m[0];
    const before = oldTex.slice(0, m.index);
    const lines = before.split('\n');
    let figureNumber = null;
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const fm = lines[i].trim().match(/^Figure\s+(\d+)\s+---/);
      if (fm) {
        figureNumber = fm[1];
        break;
      }
    }
    if (figureNumber === null) {
      console.warn(`[sync-paper-md-to-tex] preserved figure '${name}' has no nearby 'Figure N ---' anchor; dropping`);
      continue;
    }
    out.push({ name, figureNumber, block });
  }
  return out;
}

function reinjectPreservedFigures(body, preserved) {
  let result = body;
  for (const { name, figureNumber, block } of preserved) {
    const anchorRe = new RegExp(`^Figure\\s+${figureNumber}\\s+---`, 'm');
    const am = result.match(anchorRe);
    if (!am) {
      console.warn(`[sync-paper-md-to-tex] could not re-inject figure '${name}': 'Figure ${figureNumber} ---' not in new body`);
      continue;
    }
    const afterAnchor = am.index + am[0].length;
    const verbStart = result.indexOf('\\begin{Verbatim}', afterAnchor);
    if (verbStart < 0) {
      console.warn(`[sync-paper-md-to-tex] could not re-inject figure '${name}': no Verbatim after 'Figure ${figureNumber} ---'`);
      continue;
    }
    const verbCloseIdx = result.indexOf('\\end{Verbatim}', verbStart);
    if (verbCloseIdx < 0) {
      console.warn(`[sync-paper-md-to-tex] could not re-inject figure '${name}': Verbatim not closed`);
      continue;
    }
    const verbEnd = verbCloseIdx + '\\end{Verbatim}'.length;
    result = result.slice(0, verbStart) + block + result.slice(verbEnd);
  }
  return result;
}

const md = readText(mdPath);
const existingTex = readText(texPath);
const beginDoc = existingTex.indexOf('\\begin{document}');
if (beginDoc < 0) throw new Error('paper-zh.tex missing \\begin{document}');
const preamble = existingTex.slice(0, beginDoc + '\\begin{document}'.length);
const preservedFigures = collectPreservedFigureBlocks(existingTex);
const bodyRaw = convertMarkdown(md);
const body = reinjectPreservedFigures(bodyRaw, preservedFigures);
const tex = `${preamble}\n\n${body}`;
const normalizedTex = tex.replace(/\r\n|\r|\n/g, '\n');

let resolvedBackupPath = null;
if (!checkOnly && !noBackup && fs.existsSync(outputPath)) {
  resolvedBackupPath = backupPath
    ? path.resolve(process.cwd(), backupPath)
    : defaultBackupFor(outputPath);
  fs.copyFileSync(outputPath, resolvedBackupPath);
}

if (!checkOnly) {
  fs.writeFileSync(outputPath, normalizedTex, 'utf8');
}

const bib = readText(bibPath);
const normalizedBib = ensureBibEntries(bib).replace(/\r\n|\r|\n/g, '\n');
if (!checkOnly) {
  fs.writeFileSync(bibPath, normalizedBib, 'utf8');
}

if (checkOnly) {
  console.log(`[sync-paper-md-to-tex] check ok for ${path.relative(ROOT, mdPath)} -> ${path.relative(ROOT, outputPath)}`);
} else {
  console.log(`[sync-paper-md-to-tex] wrote ${path.relative(ROOT, outputPath)}`);
  if (resolvedBackupPath) {
    console.log(`[sync-paper-md-to-tex] backup ${path.relative(ROOT, resolvedBackupPath)}`);
  }
  if (preservedFigures.length) {
    const names = preservedFigures.map((f) => f.name).join(', ');
    console.log(`[sync-paper-md-to-tex] preserved ${preservedFigures.length} CLAUDE-FIG block(s): ${names}`);
  }
  console.log(`[sync-paper-md-to-tex] checked ${path.relative(ROOT, bibPath)} for Refs 38-41 entries`);
}
