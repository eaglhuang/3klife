const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAPER_DIR = path.join(ROOT, 'docs', 'ai_atomic_framework', 'arxiv-paper-v1');
const mdPath = path.join(PAPER_DIR, 'paper.v3.1.en.md');
const texPath = path.join(PAPER_DIR, 'paper-en.tex');
const argv = process.argv.slice(2);

function takeArg(flag) {
  const idx = argv.indexOf(flag);
  return idx >= 0 ? argv[idx + 1] || null : null;
}

const outputPath = takeArg('--output') ? path.resolve(process.cwd(), takeArg('--output')) : texPath;
const checkOnly = argv.includes('--check');
const noBackup = argv.includes('--no-backup');

function makeTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function escapeLatexText(text) {
  return String(text)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/\u2264/g, '$\\leq$')
    .replace(/\u2265/g, '$\\geq$')
    .replace(/\u2192/g, '$\\rightarrow$')
    .replace(/\u2190/g, '$\\leftarrow$')
    .replace(/\u2194/g, '$\\leftrightarrow$')
    .replace(/\u00d7/g, '$\\times$')
    .replace(/\u2013/g, '--')
    .replace(/\u2014/g, '---')
    .replace(/\u2026/g, '\\ldots{}')
    .replace(/\u26a0/g, 'Warning:')
    .replace(/"/g, '{\\char34}')
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
    const mathAt = src.indexOf('$', i);
    const candidates = [codeAt, boldAt, linkAt, mathAt].filter((n) => n >= 0);
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
        out += `\\texttt{\\seqsplit{${escapeLatexCode(src.slice(i + 1, end))}}}`;
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
        out += `\\href{${latexUrl(src.slice(openUrl + 1, closeUrl))}}{${inline(src.slice(i + 1, closeText))}}`;
        i = closeUrl + 1;
      } else {
        out += escapeLatexText(src[i]);
        i += 1;
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
    }
  }
  return out;
}

function isTableLine(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
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
  const width = Math.max(0.09, Math.min(0.30, 0.86 / cols)).toFixed(2);
  const spec = Array.from({ length: cols }, () => `L{${width}\\textwidth}`).join('');
  // Zebra striping: header row stays white, data rows alternate gray!8 / white.
  // Baked into the sync script so the table format survives every regeneration.
  const out = [
    '\\begingroup',
    '\\scriptsize',
    '\\setlength{\\tabcolsep}{3pt}',
    '\\arrayrulecolor{black!55}',
    '\\rowcolors{2}{gray!8}{white}',
    `\\begin{longtable}{@{}${spec}@{}}`,
    '\\toprule',
  ];
  parsed.forEach((row, idx) => {
    const cells = Array.from({ length: cols }, (_, col) => inline(row[col] || ''));
    out.push(`${cells.join(' & ')} \\\\`);
    if (idx === 0) out.push('\\midrule');
  });
  out.push('\\bottomrule', '\\end{longtable}', '\\endgroup');
  return out;
}

function renderHeading(level, text) {
  const title = inline(text.trim());
  if (level === 1) return [`\\section*{${title}}`];
  if (level === 2) {
    if (/^(Abstract|References|Acknowledgements|Appendix)/.test(text.trim())) return [`\\section*{${title}}`];
    return [`\\section{${title}}`];
  }
  if (level === 3) return [`\\subsection{${title}}`];
  return [`\\subsubsection*{${title}}`];
}

function renderParagraph(lines) {
  const text = lines.join(' ').trim();
  return text ? [inline(text)] : [];
}

function collectPreservedFigureBlocks(oldTex) {
  const out = [];
  const blockRe = /% CLAUDE-FIG-BEGIN:\s*([a-z0-9\-_]+)[\s\S]*?% CLAUDE-FIG-END:\s*\1/g;
  let match;
  while ((match = blockRe.exec(oldTex)) !== null) {
    const name = match[1];
    const block = match[0];
    const before = oldTex.slice(0, match.index);
    const lines = before.split('\n');
    let figureNumber = null;
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const figureMatch = lines[i].trim().match(/^(?:\\textbf\{)?Figure\s+(\d+)\s+---/);
      if (figureMatch) {
        figureNumber = figureMatch[1];
        break;
      }
    }
    if (figureNumber === null) {
      console.warn(`[sync-paper-en-md-to-tex] preserved figure '${name}' has no nearby 'Figure N ---' anchor; dropping`);
      continue;
    }
    out.push({ name, figureNumber, block });
  }
  return out;
}

function reinjectPreservedFigures(body, preserved) {
  let result = body;
  for (const { name, figureNumber, block } of preserved) {
    const anchorRe = new RegExp(`^(?:\\\\textbf\\{)?Figure\\s+${figureNumber}\\s+---`, 'm');
    const anchor = result.match(anchorRe);
    if (!anchor) {
      console.warn(`[sync-paper-en-md-to-tex] could not re-inject figure '${name}': 'Figure ${figureNumber} ---' not in new body`);
      continue;
    }
    const afterAnchor = anchor.index + anchor[0].length;
    const verbatimStart = result.indexOf('\\begin{Verbatim}', afterAnchor);
    if (verbatimStart < 0) {
      console.warn(`[sync-paper-en-md-to-tex] could not re-inject figure '${name}': no Verbatim after 'Figure ${figureNumber} ---'`);
      continue;
    }
    const verbatimClose = result.indexOf('\\end{Verbatim}', verbatimStart);
    if (verbatimClose < 0) {
      console.warn(`[sync-paper-en-md-to-tex] could not re-inject figure '${name}': Verbatim not closed`);
      continue;
    }
    const verbatimEnd = verbatimClose + '\\end{Verbatim}'.length;
    result = result.slice(0, verbatimStart) + block + result.slice(verbatimEnd);
  }
  return result;
}

function convertMarkdown(md) {
  const lines = md.split(/\r\n|\n|\r/);
  const out = ['\\maketitle', ''];
  const state = { paragraph: [], list: null, code: false };
  const metadataLines = [];

  let contentStart = 2;
  while (contentStart < lines.length && lines[contentStart].trim() === '') {
    contentStart += 1;
  }
  while (contentStart < lines.length) {
    const line = lines[contentStart];
    if (line.trim() === '') {
      break;
    }
    if (/^#{1,6}\s+/.test(line)) {
      break;
    }
    metadataLines.push(line.trim());
    contentStart += 1;
  }

  if (metadataLines.length) {
    out.push('\\begin{center}');
    out.push('{\\small');
    metadataLines.forEach((line, index) => {
      const suffix = index === metadataLines.length - 1 ? '' : ' \\\\';
      out.push(`${inline(line)}${suffix}`);
    });
    out.push('}');
    out.push('\\end{center}', '');
  }

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
    if (i < contentStart || /^>\s+English draft scaffold only/.test(line) || /^>\s+Source of truth/.test(line) || /^>\s+Use the guard files/.test(line)) {
      i += 1;
      continue;
    }
    if (/^```/.test(line.trim())) {
      flushParagraph();
      closeList();
      if (!state.code) {
        out.push('\\begin{Verbatim}[breaklines=true,fontsize=\\scriptsize]');
        state.code = true;
      } else {
        out.push('\\end{Verbatim}', '');
        state.code = false;
      }
      i += 1;
      continue;
    }
    if (state.code) {
      out.push(line);
      i += 1;
      continue;
    }
    if (/^\s*\$\$\s*$/.test(line)) {
      flushParagraph();
      closeList();
      out.push('\\[');
      i += 1;
      while (i < lines.length && !/^\s*\$\$\s*$/.test(lines[i])) {
        out.push(lines[i]);
        i += 1;
      }
      out.push('\\]', '');
      if (i < lines.length) i += 1;
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      out.push(...renderHeading(heading[1].length, heading[2]), '');
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
      out.push('\\begin{quote}', inline(line.replace(/^\s*>\s?/, '').trim()), '\\end{quote}', '');
      i += 1;
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
  if (state.code) out.push('\\end{Verbatim}', '');
  out.push('\\end{document}', '');
  return out.join('\n');
}

const preamble = String.raw`% Generated from paper.v3.1.en.md. Do not hand-edit prose here.
\documentclass[9pt,letterpaper]{article}
\usepackage[left=0.78in,right=0.78in,top=0.82in,bottom=0.88in]{geometry}
\usepackage{fontspec}
\usepackage{booktabs}
\usepackage{longtable}
\usepackage{array}
\usepackage{amsmath,amssymb}
\usepackage{enumitem}
\usepackage{float}
\usepackage{fancyvrb}
\usepackage{fvextra}
\usepackage{seqsplit}
\usepackage[hidelinks,colorlinks=false]{hyperref}
\usepackage{tikz}
\usepackage[table]{xcolor}
\usepackage{titlesec}
\usetikzlibrary{arrows.meta,calc,positioning,shapes.geometric,fit,backgrounds}
\setmainfont{texgyretermes-regular.otf}[
  BoldFont=texgyretermes-bold.otf,
  ItalicFont=texgyretermes-italic.otf,
  BoldItalicFont=texgyretermes-bolditalic.otf
]
\setsansfont{texgyreheros-regular.otf}[
  BoldFont=texgyreheros-bold.otf,
  ItalicFont=texgyreheros-italic.otf,
  BoldItalicFont=texgyreheros-bolditalic.otf
]
\setmonofont{texgyrecursor-regular.otf}[
  BoldFont=texgyrecursor-bold.otf,
  ItalicFont=texgyrecursor-italic.otf,
  BoldItalicFont=texgyrecursor-bolditalic.otf,
  Scale=0.92
]
\newcolumntype{L}[1]{>{\raggedright\arraybackslash}p{#1}}
\setlength{\LTleft}{0pt}
\setlength{\LTright}{0pt}
\setlength{\emergencystretch}{2em}
\setlength{\parskip}{0pt}
\setlength{\parindent}{1.25em}
\setlist{topsep=1.5pt,itemsep=1pt,parsep=0pt}
\titlespacing*{\section}{0pt}{1.0ex plus 0.2ex minus 0.15ex}{0.55ex plus 0.15ex}
\titlespacing*{\subsection}{0pt}{0.75ex plus 0.2ex minus 0.15ex}{0.35ex plus 0.1ex}
\title{ATM: Adapter-Guided Atomization and CID-Brokered Admission for Single-Domain Multi-Vendor LLM Code Co-Synthesis\\\large A Specification-Grounded Governance Substrate for Software Agents}
\author{}
\date{}
\begin{document}
`;

const md = fs.readFileSync(mdPath, 'utf8');
const existingTex = fs.existsSync(texPath) ? fs.readFileSync(texPath, 'utf8') : '';
const preservedFigures = existingTex ? collectPreservedFigureBlocks(existingTex) : [];
const body = reinjectPreservedFigures(convertMarkdown(md), preservedFigures);
const tex = `${preamble}\n${body}`.replace(/\r\n|\r|\n/g, '\n');
if (!checkOnly && !noBackup && fs.existsSync(outputPath)) {
  const backupPath = path.join(path.dirname(outputPath), `${path.basename(outputPath)}.before-sync-${makeTimestamp()}.bak`);
  fs.copyFileSync(outputPath, backupPath);
  console.log(`[sync-paper-en-md-to-tex] backup ${path.relative(ROOT, backupPath)}`);
}
if (!checkOnly) fs.writeFileSync(outputPath, tex, 'utf8');
console.log(`[sync-paper-en-md-to-tex] ${checkOnly ? 'check ok' : 'wrote'} ${path.relative(ROOT, outputPath)}`);
if (!checkOnly && preservedFigures.length) {
  const names = preservedFigures.map((figure) => figure.name).join(', ');
  console.log(`[sync-paper-en-md-to-tex] preserved ${preservedFigures.length} CLAUDE-FIG block(s): ${names}`);
}
