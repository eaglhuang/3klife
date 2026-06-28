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

function findBareUrl(src, start) {
  const rest = src.slice(start);
  const match = rest.match(/https?:\/\/[^\s<>{}[\]]+/);
  if (!match) return null;
  let url = match[0];
  let end = start + match.index + url.length;
  while (/[.,;:]$/.test(url)) {
    url = url.slice(0, -1);
    end -= 1;
  }
  return { index: start + match.index, end, url };
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
    const bareUrl = findBareUrl(src, i);
    const urlAt = bareUrl ? bareUrl.index : -1;
    const candidates = [codeAt, boldAt, linkAt, mathAt, urlAt].filter((n) => n >= 0);
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
    if (urlAt === i && bareUrl) {
      out += `\\url{${latexUrl(bareUrl.url)}}`;
      i = bareUrl.end;
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

function renderTable(rows, state = null) {
  const body = rows.filter((row) => !isTableSeparator(row));
  if (!body.length) return [];
  const parsed = body.map(splitTableRow);
  const cols = Math.max(...parsed.map((row) => row.length));
  const tableSpecs = {
    2: [0.31, 0.65],
    3: [0.22, 0.25, 0.47],
    4: [0.17, 0.22, 0.39, 0.17],
    5: [0.17, 0.17, 0.18, 0.18, 0.18],
    6: [0.12, 0.11, 0.16, 0.16, 0.16, 0.19],
  };
  const specialTableSpecs = {
    'Table C.1': [0.18, 0.27, 0.18, 0.31],
  };
  const widths = specialTableSpecs[state?.lastTableTitle] || tableSpecs[cols] || Array.from({ length: cols }, () => Math.max(0.09, Math.min(0.30, 0.94 / cols)));
  const spec = widths.map((width) => `L{${Number(width).toFixed(2)}\\textwidth}`).join('');
  const tableFont = cols >= 4 ? '\\tiny' : '\\scriptsize';
  const tabcolsep = cols >= 4 ? '2pt' : '3pt';
  // Zebra striping: header row stays white, data rows alternate gray!8 / white.
  // Baked into the sync script so the table format survives every regeneration.
  const out = [
    '\\begingroup',
    tableFont,
    `\\setlength{\\tabcolsep}{${tabcolsep}}`,
    '\\arrayrulecolor{black!55}',
    '\\rowcolors{2}{gray!8}{white}',
    `\\begin{longtable}{@{}${spec}@{}}`,
    '\\toprule',
  ];
  if (state) state.lastTableTitle = null;
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

function renderAppendixHeading(level, text) {
  const title = inline(text.trim());
  if (level <= 2) return [`\\section*{${title}}`];
  if (level === 3) return [`\\subsection*{${title}}`];
  return [`\\subsubsection*{${title}}`];
}

function renderParagraph(lines, state = null) {
  const text = lines.join(' ').trim();
  if (!text) return [];
  // English PDF typography policy:
  // Body text is serif; numbered headings are sans bold; captions use small
  // bold labels; paragraph lead-ins should stay plain unless they are formal
  // labels, named mechanisms, or first-use technical terms in the Markdown.
  // Table-title paragraphs (e.g. "**Table 9 --- ATM-AdmissionBench v0.1 ...**")
  // get a consistent small-bold caption style so their font size sits closer to
  // the \scriptsize table body underneath, instead of jumping back to 10pt.
  // Strip outer **...** wrappers since we re-emit our own \textbf.
  const tableTitle = text.match(/^\*\*\s*(Table\s+[A-Z0-9.]+\s*[—\-].*?)\s*\*\*\s*([\s\S]*)$/);
  if (tableTitle) {
    const tableId = tableTitle[1].split(/\s+[—\-]\s+/)[0];
    if (state) state.lastTableTitle = tableId;
    const specialNeedspace = {
      'Table 3': '24',
      'Table C.1': '30',
    };
    const needspace = specialNeedspace[tableId] || '7';
    const tail = tableTitle[2] ? ` ${inline(tableTitle[2].trimStart())}` : '';
    return [`\\Needspace{${needspace}\\baselineskip}\\smallskip\\noindent{\\small\\bfseries ${inline(tableTitle[1])}}${tail}\\par\\smallskip`];
  }
  const figureTitle = text.match(/^\*\*\s*(Figure\s+\d+\s*[—\-].*?)\s*\*\*\s*([\s\S]*)$/);
  if (figureTitle) {
    const tail = figureTitle[2] ? ` ${inline(figureTitle[2].trimStart())}` : '';
    return [`\\noindent\\textbf{${inline(figureTitle[1])}}${tail}`];
  }
  const algorithmTitle = text.match(/^\*\*\s*(Algorithm\s+\d+\s*(?:[—\-]|--)[\s\S]+?)\s*\*\*\s*$/);
  if (algorithmTitle) {
    if (state) state.algorithmBox = true;
    return [
      '\\Needspace{19\\baselineskip}',
      '\\begin{paperAlgoBox}',
      `\\noindent{\\small\\bfseries ${inline(algorithmTitle[1])}}\\par\\smallskip`,
    ];
  }
  return [inline(text)];
}

function collectPreservedFigureBlocks(oldTex) {
  const out = [];
  const blockRe = /% CLAUDE-FIG-BEGIN:\s*([a-z0-9\-_]+)[\s\S]*?% CLAUDE-FIG-END:\s*\1/g;
  let match;
  while ((match = blockRe.exec(oldTex)) !== null) {
    const name = match[1];
    const block = match[0];
    let figureNumber = block.match(/Figure\s+(\d+)\s+---/)?.[1] ?? null;
    if (figureNumber === null) {
      const before = oldTex.slice(0, match.index);
      const lines = before.split('\n');
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        const figureMatch = lines[i].trim().match(/Figure\s+(\d+)\s+---/);
        if (figureMatch) {
          figureNumber = figureMatch[1];
          break;
        }
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

function withFigureCaption(block, titleLine) {
  // Keep captions inside the figure float so a page break cannot separate a
  // figure/table-style explanatory line from the visual body it describes.
  const stripped = block.replace(
    /(\\begin\{figure\}\[H\]\s*)([\s\S]*?)(\\centering)/,
    (whole, begin, between, centering) => (between.includes('Figure ') ? `${begin}${centering}` : whole),
  );
  const caption = `{\\small ${titleLine}\\par}\n\\smallskip\n`;
  return stripped.replace(/(\\begin\{figure\}\[H\]\s*)/, `$1\n${caption}`);
}

function reinjectPreservedFigures(body, preserved) {
  let result = body;
  for (const { name, figureNumber, block } of preserved) {
    const anchorRe = new RegExp(`^.*Figure\\s+${figureNumber}\\s+---.*$`, 'm');
    const anchor = result.match(anchorRe);
    if (!anchor) {
      console.warn(`[sync-paper-en-md-to-tex] could not re-inject figure '${name}': 'Figure ${figureNumber} ---' not in new body`);
      continue;
    }
    const titleLine = anchor[0];
    const titleLineEnd = anchor.index + titleLine.length;
    const verbatimStart = result.indexOf('\\begin{Verbatim}', titleLineEnd);
    if (verbatimStart < 0) {
      result = result.slice(0, anchor.index) + withFigureCaption(block, titleLine) + result.slice(titleLineEnd);
      continue;
    }
    const verbatimClose = result.indexOf('\\end{Verbatim}', verbatimStart);
    if (verbatimClose < 0) {
      console.warn(`[sync-paper-en-md-to-tex] could not re-inject figure '${name}': Verbatim not closed`);
      continue;
    }
    const verbatimEnd = verbatimClose + '\\end{Verbatim}'.length;
    result = result.slice(0, anchor.index) + withFigureCaption(block, titleLine) + result.slice(verbatimEnd);
  }
  return result;
}

function convertMarkdown(md) {
  const lines = md.split(/\r\n|\n|\r/);
  const out = ['\\paperTitleBlock', ''];
  const state = { paragraph: [], list: null, code: false, algorithmBox: false, flowBox: false, lastTableTitle: null };
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

  function flushParagraph() {
    if (state.paragraph.length) {
      out.push(...renderParagraph(state.paragraph, state), '');
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
  function listKindForLine(value) {
    if (/^\s*\d+\.\s+/.test(value)) return 'enumerate';
    if (/^\s*[-*]\s+/.test(value)) return 'itemize';
    return null;
  }

  let i = 0;
  let inAppendix = false;
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
        const firstCodeLine = lines[i + 1]?.trim() || '';
        if (/^(agent proposal|re-read base hash)$/.test(firstCodeLine)) {
          out.push('\\Needspace{8\\baselineskip}', '\\begin{paperAlgoBox}');
          state.flowBox = true;
        }
        out.push('\\begin{Verbatim}[breaklines=true,fontsize=\\scriptsize]');
        state.code = true;
      } else {
        out.push('\\end{Verbatim}');
        if (state.algorithmBox) {
          out.push('\\end{paperAlgoBox}', '');
          state.algorithmBox = false;
        } else if (state.flowBox) {
          out.push('\\end{paperAlgoBox}', '');
          state.flowBox = false;
        } else {
          out.push('');
        }
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
      if (/^Appendix$/.test(heading[2].trim())) {
        inAppendix = true;
        i += 1;
        continue;
      }
      if (/^Appendix\b/.test(heading[2].trim())) inAppendix = true;
      const headingRenderer = inAppendix ? renderAppendixHeading : renderHeading;
      out.push(...headingRenderer(heading[1].length, heading[2]), '');
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
      out.push(...renderTable(rows, state), '');
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
      if (state.list) {
        // Markdown often separates numbered items with blank lines. Preserve
        // one enumerate/itemize block across those blanks so PDF numbering does
        // not restart at 1 for every item.
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j += 1;
        if (j < lines.length && listKindForLine(lines[j]) === state.list) {
          i += 1;
          continue;
        }
      }
      closeList();
      i += 1;
      continue;
    }
    state.paragraph.push(line.trim());
    i += 1;
  }
  flushParagraph();
  closeList();
  if (state.code) {
    out.push('\\end{Verbatim}');
    if (state.algorithmBox) {
      out.push('\\end{paperAlgoBox}');
      state.algorithmBox = false;
    }
    if (state.flowBox) {
      out.push('\\end{paperAlgoBox}');
      state.flowBox = false;
    }
    out.push('');
  }
  out.push('\\end{document}', '');
  return out.join('\n');
}

const preamble = String.raw`% Generated from paper.v3.1.en.md. Do not hand-edit prose here.
\documentclass[9pt,letterpaper]{extarticle}
\usepackage[left=0.78in,right=0.78in,top=0.82in,bottom=0.88in]{geometry}
\usepackage{fontspec}
\usepackage{booktabs}
\usepackage{longtable}
\usepackage{array}
\usepackage{amsmath,amssymb}
\usepackage{unicode-math}
\usepackage{enumitem}
\usepackage{float}
\usepackage{fancyvrb}
\usepackage{fvextra}
\usepackage{seqsplit}
\usepackage{xurl}
\usepackage[hidelinks,colorlinks=false]{hyperref}
\usepackage{tikz}
\usepackage{pgfplots}
\usepackage[table]{xcolor}
\usepackage{titlesec}
\usepackage{needspace}
\usepackage[most]{tcolorbox}
\usetikzlibrary{arrows.meta,calc,positioning,shapes.geometric,fit,backgrounds}
\pgfplotsset{compat=1.18}
\setmainfont{LibertinusSerif-Regular.otf}[
  BoldFont=LibertinusSerif-Bold.otf,
  ItalicFont=LibertinusSerif-Italic.otf,
  BoldItalicFont=LibertinusSerif-BoldItalic.otf
]
\setsansfont{LibertinusSans-Regular.otf}[
  BoldFont=LibertinusSans-Bold.otf,
  ItalicFont=LibertinusSans-Italic.otf
]
\setmonofont{LibertinusMono-Regular.otf}[
  Scale=0.90
]
\setmathfont{LibertinusMath-Regular.otf}
\newcolumntype{L}[1]{>{\raggedright\arraybackslash}p{#1}}
\setlength{\LTleft}{0pt}
\setlength{\LTright}{0pt}
\setlength{\emergencystretch}{3em}
\setlength{\hfuzz}{1pt}
\setlength{\parskip}{0pt}
\setlength{\parindent}{1.25em}
\setlist{topsep=1.5pt,itemsep=1pt,parsep=0pt}
\newtcolorbox{paperAlgoBox}{
  enhanced,
  colback=gray!6,
  colframe=gray!35,
  boxrule=0.45pt,
  arc=3pt,
  left=6pt,
  right=6pt,
  top=5pt,
  bottom=5pt,
  drop fuzzy shadow=black!18,
  before skip=6pt,
  after skip=7pt,
  breakable=false
}
\titleformat{\section}{\normalfont\sffamily\bfseries\large}{\thesection}{0.65em}{}
\titleformat{name=\section,numberless}{\normalfont\sffamily\bfseries\large}{}{0pt}{}
\titleformat{\subsection}{\normalfont\sffamily\bfseries\normalsize}{\thesubsection}{0.55em}{}
\titleformat{name=\subsection,numberless}{\normalfont\sffamily\bfseries\normalsize}{}{0pt}{}
\titleformat{\subsubsection}{\normalfont\sffamily\bfseries\normalsize}{\thesubsubsection}{0.5em}{}
\titleformat{name=\subsubsection,numberless}{\normalfont\sffamily\bfseries\normalsize}{}{0pt}{}
\titlespacing*{\section}{0pt}{2.2ex plus 0.35ex minus 0.2ex}{0.9ex plus 0.2ex}
\titlespacing*{\subsection}{0pt}{1.45ex plus 0.25ex minus 0.15ex}{0.65ex plus 0.15ex}
\titlespacing*{\subsubsection}{0pt}{1.1ex plus 0.2ex minus 0.12ex}{0.45ex plus 0.12ex}
\newcommand{\paperTitleBlock}{%
  \begin{center}
    {\fontsize{18}{22}\selectfont\bfseries
    ATM: CID-Brokered Pre-Write Admission\\
    for Multi-Agent Code Co-Synthesis\par}
    \vspace{2.5pt}
    {\fontsize{10}{12}\selectfont\bfseries
    A Specification-Grounded Governance Substrate for Software Agents\par}
    \vspace{12pt}
    {\fontsize{11}{13}\selectfont Eaglhuang\par}
    {\fontsize{10}{12}\selectfont eaglhuang@gmail.com\par}
    {\fontsize{10}{12}\selectfont 2026-06-28\par}
  \end{center}
  \vspace{4pt}
}
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
