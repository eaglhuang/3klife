#!/usr/bin/env python3
"""
restore-figures.py
------------------
Re-applies 5 colorful TikZ figures to paper-zh.tex after running
sync-paper-md-to-tex.js (which restores Mermaid Verbatim blocks).

Usage (after running sync):
    cd docs/ai_atomic_framework/arxiv-paper-v1
    python restore-figures.py

Each figure is identified by a unique anchor line in its Mermaid Verbatim
block. The script finds the surrounding \\begin{Verbatim}...\\end{Verbatim}
and replaces it with a TikZ figure environment wrapped in
% CLAUDE-FIG-BEGIN/END markers (so a future sync that respects markers
can skip these blocks).

DOES NOT TOUCH: paper.v3.1.md, references.bib, tables, prose paragraphs,
captions, Algorithm 1 (the Verbatim at the pseudocode block uses
"1: map I, I' to known atoms" as anchor and is NOT in our list).
"""

import re
import sys
from pathlib import Path

TEX = Path(__file__).resolve().parent / 'paper-zh.tex'

# ---- 5 TikZ figure blocks ----
FIG_THREE_PLANE = r"""% CLAUDE-FIG-BEGIN: fig-three-plane
% Replaces a Mermaid Verbatim block from md sync. Section: 3.2 architecture overview.
\begin{figure}[H]
\centering
\begin{tikzpicture}[
  >=Latex,
  font=\scriptsize,
  plane/.style ={draw, rounded corners=4pt, line width=0.6pt, align=center,
                 inner sep=4pt, minimum height=10mm},
  tcplane/.style={plane, fill=blue!10,    draw=blue!60!black},
  maplane/.style={plane, fill=green!12,   draw=green!50!black},
  ecplane/.style={plane, fill=orange!14,  draw=orange!70!black},
  pnode/.style ={draw, rounded corners=2pt, minimum height=7mm, minimum width=24mm,
                 inner sep=2pt, align=center, fill=white, line width=0.4pt},
  ext/.style   ={pnode, fill=gray!12, draw=black!55},
  flow/.style  ={->, line width=0.5pt, draw=black!75},
  dashflow/.style={->, line width=0.5pt, draw=black!55, dash pattern=on 2pt off 1.5pt},
  lbl/.style   ={font=\tiny\itshape, fill=white, inner sep=1.2pt}
]
\node[ext] (HU) at (-7.5, 2.4) {Human / Coordinator};
\node[tcplane, minimum width=120mm] (TC) at (0.5, 2.4) {};
\node[pnode, fill=blue!22] (T)  at (-2.5, 2.4) {Task Contract\\\tiny$\langle g, A, F, S, D, V, E, \epsilon\rangle$};
\node[pnode, fill=blue!22] (DL) at ( 3.5, 2.4) {Direction Lock +\\Pre-tool Scope Gate};
\node[font=\tiny\bfseries, anchor=west, blue!60!black]
      at (TC.north west) [yshift=-2.5pt, xshift=2pt] {Task-contract plane};
\node[maplane, minimum width=145mm, minimum height=32mm] (MA) at (0.5, -0.4) {};
\node[font=\tiny\bfseries, anchor=west, green!40!black]
      at (MA.north west) [yshift=-2.5pt, xshift=2pt]
      {Mutation-admission plane \,/\, CID broker subsystem};
\node[pnode, fill=green!22] (AG)   at (-5.5,  0.6)  {AI Agent\\\tiny WriteIntent};
\node[pnode, fill=green!22] (ADAP) at (-5.5, -1.4)  {Adapter Layer\\\tiny discoverAtomCandidates};
\node[pnode, fill=green!22] (AM)   at (-1.4,  0.6)  {Atom Map\\\tiny owners / deps / CID};
\node[pnode, fill=green!22] (VA)   at (-1.4, -1.4)  {Virtual Atoms\\\tiny refinement};
\node[pnode, fill=green!30, line width=0.7pt, draw=green!55!black, minimum width=27mm]
                            (B)    at ( 3.0, -0.4)  {\bfseries CID Broker\\\tiny progressive admission};
\node[pnode, fill=green!28, minimum width=27mm]
                            (ST)   at ( 6.3, -0.4)  {Neutral Steward\\\tiny single apply +\\CAS base-hash};
\node[ecplane, minimum width=120mm] (EC) at (0.5, -3.6) {};
\node[font=\tiny\bfseries, anchor=west, orange!60!black]
      at (EC.north west) [yshift=-2.5pt, xshift=2pt] {Evidence-closure plane};
\node[pnode, fill=orange!22] (VE) at (-3.5, -3.6) {Validator Envelope};
\node[pnode, fill=orange!22] (EB) at ( 0.5, -3.6) {Evidence Blockers +\\Review Advisory};
\node[pnode, fill=orange!22] (CP) at ( 4.5, -3.6) {Closure Packet};
\draw[flow] (HU)      -- (T);
\draw[flow] (T)       -- (DL);
\draw[flow] (DL.south) -- ++(0,-0.7) -| (AG.north);
\draw[flow] (ADAP)    -- (AM);
\draw[flow] (AM)      -- (VA);
\draw[flow] (AM)      -- (AG);
\draw[flow] (AG)      -- (B);
\draw[flow] (VA)      -- (B);
\draw[flow] (AM.east) -- (B.north west);
\draw[flow] (B)       -- node[lbl, above]{verdict + plan} (ST);
\draw[flow] (ST.south) -- ++(0,-1.0) -| (CP.north);
\draw[flow] (VE)      -- (EB);
\draw[flow] (EB)      -- (CP);
\draw[dashflow] (T.west) -- ++(-1.8,0)
                node[lbl, midway, above]{$D, V, E$ obligations}
                |- (VE.west);
\draw[dashflow] (CP.south) -- ++(0,-0.6) -| ([xshift=-3mm]HU.south)
                |- node[lbl, near end, above]{epoch update on scope change} (T.west);
\end{tikzpicture}
\caption{ATM three-plane governance substrate: \textbf{Task-contract plane} (blue), \textbf{Mutation-admission plane} (green, hosts the CID broker and neutral steward subsystem), \textbf{Evidence-closure plane} (orange). Solid arrows = main flow; dashed arrows = feedback to Task Contract.}
\label{fig:three-plane}
\end{figure}
% CLAUDE-FIG-END: fig-three-plane"""

FIG_ADMISSION_FLOW = r"""% CLAUDE-FIG-BEGIN: fig-admission-flow
% Replaces a Mermaid Verbatim block from md sync. Section: 3.4 admission flow.
\begin{figure}[H]
\centering
\begin{tikzpicture}[
  >=Latex,
  font=\scriptsize,
  node distance=3.5mm,
  input/.style ={draw, rounded corners=2pt, fill=blue!12,   draw=blue!60!black,
                 minimum width=28mm, minimum height=8mm, align=center, line width=0.4pt},
  check/.style ={draw, diamond, aspect=2.2, fill=yellow!22, draw=orange!70!black,
                 inner sep=0pt, minimum width=30mm, minimum height=14mm,
                 align=center, line width=0.5pt, font=\tiny},
  safe/.style  ={draw, rounded corners=2pt, fill=green!22,  draw=green!55!black,
                 minimum width=28mm, minimum height=8mm, align=center, line width=0.5pt,
                 font=\scriptsize\bfseries},
  compose/.style={draw, rounded corners=2pt, fill=violet!16, draw=violet!65!black,
                 minimum width=30mm, minimum height=8mm, align=center, line width=0.5pt,
                 font=\scriptsize\bfseries},
  block/.style ={draw, rounded corners=2pt, fill=red!14,    draw=red!65!black,
                 minimum width=28mm, minimum height=8mm, align=center, line width=0.5pt,
                 font=\scriptsize\bfseries},
  serial/.style={draw, rounded corners=2pt, fill=gray!22,   draw=black!55,
                 minimum width=24mm, minimum height=8mm, align=center, line width=0.5pt,
                 font=\scriptsize\bfseries},
  apply/.style ={draw, rounded corners=2pt, fill=white, draw=black, line width=0.9pt,
                 minimum width=28mm, minimum height=8mm, align=center,
                 font=\scriptsize\bfseries},
  flow/.style  ={->, line width=0.5pt, draw=black!75},
  lbl/.style   ={font=\tiny\itshape, fill=white, inner sep=1pt}
]
\node[input]  (IN)  at (-6.0, 3.0)  {WriteIntent pair $I, I'$};
\node[check]  (L0)  at (-6.0, 1.0)  {L0\\same file?};
\node[input]  (L1)  at (-6.0,-1.4)  {L1 --- Known atoms\\\tiny adapter + atom map};
\node[check]  (C1)  at (-6.0,-3.6)  {same atom\\or CID overlap?};
\node[input]  (L2)  at (-6.0,-6.0)  {L2 --- Governance surfaces\\\tiny owner / tests / deps / registry};
\node[check]  (C2)  at (-1.5,-6.0)  {shared surface\\or R/W dep?};
\node[check]  (C3)  at ( 3.0,-6.0)  {bounded regions\\disjoint?};
\node[input]  (VA)  at ( 7.5,-6.0)  {virtual-atom\\fallback};
\node[check]  (C4)  at ( 7.5,-3.6)  {refined CID\\now disjoint?};
\node[block]  (REFINE) at (7.5,-1.4) {split suggestion};
\node[safe]   (SAFE)    at ( 1.8, 1.0)  {parallel-safe};
\node[block]  (BLOCK)   at ( 1.8,-3.6)  {blocked-cid-conflict};
\node[serial] (SERIAL)  at (-1.5,-8.4)  {SERIAL};
\node[compose](COMPOSE) at ( 5.5,-8.4)  {needs-physical-split};
\node[apply]  (STEW)    at ( 1.8,-10.4) {Neutral Steward apply};
\node[apply,fill=teal!12,draw=teal!60!black]
              (EVID)    at ( 1.8,-12.0) {evidence record\\\tiny verdict + validator};
\draw[flow] (IN)  -- (L0);
\draw[flow] (L0)  -- node[lbl,right]{no} (SAFE.west |- L0);
\draw[flow] (L0)  -- (L1);
\draw[flow] (L1)  -- (C1);
\draw[flow] (C1)  -- node[lbl,above]{yes} (BLOCK.west |- C1);
\draw[flow] (C1)  -- (L2);
\draw[flow] (L2)  -- (C2);
\draw[flow] (C2)  -- node[lbl,right]{yes} (SERIAL);
\draw[flow] (C2)  -- (C3);
\draw[flow] (C3)  -- node[lbl,below]{yes} (COMPOSE);
\draw[flow] (C3)  -- (VA);
\draw[flow] (VA)  -- (C4);
\draw[flow] (C4.north) to[bend left=20] node[lbl,right]{disjoint} (COMPOSE.east);
\draw[flow] (C4)  -- node[lbl,right]{overlap} (REFINE);
\draw[flow] (REFINE) -| (BLOCK.east);
\draw[flow] (SAFE)    |- (STEW.north);
\draw[flow] (SERIAL)  -- (STEW);
\draw[flow] (COMPOSE) |- (STEW.east);
\draw[flow] (STEW)    -- (EVID);
\end{tikzpicture}
\caption{Progressive admission decision routing. Blue = layer step; yellow = decision diamond; green/violet = pass-through verdicts (\texttt{parallel-safe} / \texttt{needs-physical-split}); red = block verdicts; gray = SERIAL; white = Neutral Steward apply and evidence record. Read top-down from \texttt{IN}; each diamond routes the intent toward a terminal verdict or further refinement.}
\label{fig:admission-flow}
\end{figure}
% CLAUDE-FIG-END: fig-admission-flow"""

FIG_WRITE_INTENT_ESC = r"""% CLAUDE-FIG-BEGIN: fig-write-intent-escalation
% Replaces a Mermaid Verbatim block from md sync. Section: 3.4 escalation policy.
\begin{figure}[H]
\centering
\begin{tikzpicture}[
  >=Latex,
  font=\scriptsize,
  zone/.style    ={draw, rounded corners=4pt, line width=0.6pt, align=center,
                   minimum height=46mm, inner sep=4pt},
  localz/.style  ={zone, fill=blue!10,   draw=blue!60!black,   minimum width=44mm},
  intentz/.style ={zone, fill=orange!13, draw=orange!70!black, minimum width=44mm},
  governz/.style ={zone, fill=green!12,  draw=green!50!black,  minimum width=44mm},
  applyz/.style  ={zone, fill=violet!11, draw=violet!70!black, minimum width=36mm},
  stepbox/.style ={draw, rounded corners=2pt, fill=white, align=center,
                   minimum width=18mm, minimum height=10mm, line width=0.4pt, font=\tiny},
  decision/.style={draw, diamond, aspect=1.6, fill=yellow!22, draw=orange!70!black,
                   inner sep=0pt, minimum width=20mm, minimum height=14mm,
                   align=center, line width=0.5pt, font=\tiny},
  outbox/.style  ={draw, rounded corners=2pt, fill=gray!12, align=center,
                   minimum width=36mm, minimum height=8mm, line width=0.4pt, font=\tiny},
  flow/.style    ={->, line width=0.5pt, draw=black!75},
  lbl/.style     ={font=\tiny\itshape, fill=white, inner sep=1.2pt},
  zonelbl/.style ={font=\tiny\bfseries}
]
\node[localz]  (LZ) at (-7.7, -0.5) {};
\node[intentz] (IZ) at (-2.7, -0.5) {};
\node[governz] (GZ) at ( 2.5, -0.5) {};
\node[applyz]  (AZ) at ( 7.4, -0.5) {};
\node[zonelbl, blue!60!black,   anchor=north west] at (LZ.north west) [yshift=-1pt, xshift=2pt] {Local Edit Zone};
\node[zonelbl, orange!60!black, anchor=north west] at (IZ.north west) [yshift=-1pt, xshift=2pt] {Declared Intent Zone};
\node[zonelbl, green!40!black,  anchor=north west] at (GZ.north west) [yshift=-1pt, xshift=2pt] {Broker Governance Zone};
\node[zonelbl, violet!60!black, anchor=north west] at (AZ.north west) [yshift=-1pt, xshift=2pt] {Apply / Closure Zone};
\node[stepbox,  fill=blue!22]    (E) at (-8.8,  0.6) {Agent edit\\\tiny local WIP};
\node[decision]                  (D) at (-6.5,  0.6) {touches shared\\surface\,/\,scope?};
\node[stepbox,  fill=orange!22]  (I) at (-3.8,  0.6) {WriteIntent\\\tiny targets / atoms};
\node[decision]                  (G) at (-1.5,  0.6) {requires governed\\shared write?};
\node[stepbox,  fill=green!24]   (T) at ( 1.3,  0.6) {Governed transaction\\\tiny lease + rw set};
\node[stepbox,  fill=green!28]   (B) at ( 2.9,  0.6) {Broker admission\\\tiny atom map / CID};
\node[decision]                  (V) at ( 4.6,  0.6) {admission\\verdict};
\node[stepbox,  fill=violet!18]  (S) at ( 7.4,  0.9) {Neutral Steward\\apply};
\node[stepbox,  fill=violet!22]  (X) at ( 7.4, -1.7) {Refine, serialize,\\or fail closed};
\node[outbox,   fill=blue!22]    (L) at (-7.7, -2.0) {Local edit path\\\tiny direct write};
\node[outbox,   fill=orange!22]  (R) at (-2.7, -2.0) {Review-only path};
\draw[flow] (E)     -- (D);
\draw[flow] (D.east) -- node[lbl, above]{yes} (I.west);
\draw[flow] (I)     -- (G);
\draw[flow] (G.east) -- node[lbl, above]{yes} (T.west);
\draw[flow] (T)     -- (B);
\draw[flow] (B)     -- (V);
\draw[flow] (V.east) -- node[lbl, above]{parallel-safe\,/\,compose} (S.west);
\draw[flow] (V.south east) -- node[lbl, near end, above right=-2pt and -2pt]{block\,/\,SERIAL} (X.west);
\draw[flow] (D.south) -- node[lbl, right]{no} (L);
\draw[flow] (G.south) -- node[lbl, right]{no} (R);
\end{tikzpicture}
\caption{Write intent escalation across four zones: \textbf{Local Edit Zone} (blue) -- \textbf{Declared Intent Zone} (orange) -- \textbf{Broker Governance Zone} (green) -- \textbf{Apply / Closure Zone} (violet). Within each zone, input node is on the left and the yellow diamond gate is on the right; top rail = yes path continues escalating; bottom rail = no path stays inside the zone (local edit or review-only).}
\label{fig:write-intent-escalation}
\end{figure}
% CLAUDE-FIG-END: fig-write-intent-escalation"""

FIG_EVIDENCE_TAXONOMY = r"""% CLAUDE-FIG-BEGIN: fig-evidence-taxonomy
% Replaces a Mermaid Verbatim block from md sync. Section: 4 Validation intro.
% Six evidence buckets mirror the body prose at the start of section 4:
% deterministic fixture (4.1), self-hosting (4.2), adoption (4.3),
% field collision (4.4), AdmissionBench (5), wave/batch extension (4.5).
\begin{figure}[H]
\centering
\begin{tikzpicture}[
  >=Latex,
  font=\scriptsize,
  box/.style    ={draw, rounded corners=3pt, minimum width=24mm, minimum height=13mm,
                  align=center, line width=0.5pt},
  motive/.style ={box, fill=blue!12,    draw=blue!60!black, minimum width=32mm},
  scope/.style  ={box, fill=yellow!20,  draw=orange!70!black, minimum width=32mm},
  mech/.style   ={box, fill=green!18,   draw=green!50!black},
  self/.style   ={box, fill=teal!16,    draw=teal!70!black},
  adopt/.style  ={box, fill=violet!16,  draw=violet!70!black},
  field/.style  ={box, fill=red!14,     draw=red!60!black},
  bench/.style  ={box, fill=cyan!16,    draw=cyan!60!black},
  wave/.style   ={box, fill=orange!18,  draw=orange!60!black},
  core/.style   ={box, fill=white, draw=black, line width=0.9pt,
                  font=\scriptsize\bfseries, minimum width=34mm, minimum height=11mm},
  limit/.style  ={box, fill=gray!18, draw=black!60, minimum width=80mm, minimum height=10mm},
  flow/.style   ={->, line width=0.5pt, draw=black!70}
]
\node[motive] (M) at (0, 0) {Motivation\\\tiny AgenticFlict (Ref.~18)\\\tiny Git / PR conflict};
\node[scope]  (S) at (0,-1.7) {Scope\\\tiny single authority domain\\\tiny pre-write admission};
\node[mech]  (B1) at (-7.5,-3.7) {Mechanism\\\tiny \S4.1 \,/\, 12-scenario\\\tiny B-02 / B-08 / B-13};
\node[self]  (B2) at (-4.5,-3.7) {Self-hosting\\\tiny \S4.2 \,/\, forensics\\\tiny coverage 95\,/\,100};
\node[adopt] (B3) at (-1.5,-3.7) {Adoption\\\tiny \S4.3 \,/\, npc-brain\\\tiny recoverability};
\node[field] (B4) at ( 1.5,-3.7) {Field collision\\\tiny \S4.4 \,/\, same-file\\\tiny POS2 / B-12 / BLOCK};
\node[bench] (B5) at ( 4.5,-3.7) {AdmissionBench\\\tiny \S5 \,/\, v0.1 baseline\\\tiny + v0.2 paper};
\node[wave]  (B6) at ( 7.5,-3.7) {Wave / Batch\\\tiny \S4.5 \,/\, extension\\\tiny orchestration};
\node[core]  (K) at (-3.0,-6.0) {Core admission claim\\\tiny progressive atomization + CID broker};
\node[core]  (G) at ( 3.0,-6.0) {Governance claim\\\tiny operable substrate};
\node[limit] (L) at (0,-7.7) {Limitations\\\tiny no cross-clone locking\,\textbullet\, no full comparative benchmark yet};
\draw[flow] (M) -- (S);
\draw[flow] (S) -- (B1); \draw[flow] (S) -- (B2); \draw[flow] (S) -- (B3);
\draw[flow] (S) -- (B4); \draw[flow] (S) -- (B5); \draw[flow] (S) -- (B6);
\draw[flow] (B1) -- (K);
\draw[flow] (B4) -- (K);
\draw[flow] (B5) -- (K);
\draw[flow] (B2) -- (G);
\draw[flow] (B3) -- (G);
\draw[flow] (B6) -- (G);
\draw[flow] (K) -- (L);
\draw[flow] (G) -- (L);
\end{tikzpicture}
\caption{Evidence taxonomy and claim alignment. Six evidence buckets (green Mechanism \S4.1, teal Self-hosting \S4.2, violet Adoption \S4.3, red Field collision \S4.4, cyan AdmissionBench \S5, orange Wave / Batch \S4.5) align to two claim heads (Core admission claim and Governance claim) and converge into Limitations. Read top-down from Motivation (blue) through Scope (yellow); left three buckets feed the Core claim and right three feed the Governance claim.}
\label{fig:evidence-taxonomy}
\end{figure}
% CLAUDE-FIG-END: fig-evidence-taxonomy"""

FIG_POS2 = r"""% CLAUDE-FIG-BEGIN: fig-pos2-case
% Replaces a Mermaid Verbatim block from md sync. Section: 4.4 POS2 field case.
\begin{figure}[H]
\centering
\begin{tikzpicture}[
  >=Latex,
  font=\scriptsize,
  node distance=3mm,
  file/.style    ={draw, rounded corners=2pt, fill=blue!10,   draw=blue!60!black,
                   minimum width=78mm, minimum height=8mm, align=center, line width=0.5pt},
  region/.style  ={draw, rounded corners=2pt, fill=blue!22,   draw=blue!60!black,
                   minimum width=78mm, minimum height=7mm, align=left, font=\tiny,
                   inner xsep=4mm, line width=0.4pt},
  pivot/.style   ={draw, rounded corners=2pt, fill=yellow!22, draw=orange!70!black,
                   minimum width=78mm, minimum height=7mm, align=center, line width=0.5pt,
                   font=\scriptsize\bfseries},
  layer/.style   ={draw, rounded corners=2pt, fill=gray!10,   draw=black!60,
                   minimum width=78mm, minimum height=6mm, align=left, font=\tiny,
                   inner xsep=4mm, line width=0.4pt},
  verdict/.style ={draw, rounded corners=2pt, fill=green!24,  draw=green!60!black,
                   minimum width=78mm, minimum height=7mm, align=center, line width=0.5pt,
                   font=\scriptsize\bfseries},
  exec/.style    ={draw, rounded corners=2pt, fill=violet!14, draw=violet!70!black,
                   minimum width=78mm, minimum height=7mm, align=center, line width=0.5pt},
  applied/.style ={draw, rounded corners=2pt, fill=green!32,  draw=green!60!black,
                   minimum width=78mm, minimum height=7mm, align=center, line width=0.6pt,
                   font=\scriptsize\bfseries},
  validate/.style={draw, rounded corners=2pt, fill=teal!12,   draw=teal!60!black,
                   minimum width=78mm, minimum height=7mm, align=left, font=\tiny,
                   inner xsep=4mm, line width=0.4pt},
  flow/.style    ={->, line width=0.5pt, draw=black!75}
]
\node[file]                                   (FILE)   {\texttt{packages/cli/src/commands/broker.ts}};
\node[region,  below=of FILE]                 (POS2A)  {POS2-A \quad lines 841--878 \quad\textit{(Codex / OpenAI; TASK-POS2-A)}};
\node[region,  below=of POS2A]                (POS2B)  {POS2-B \quad lines 989--1142 \quad\textit{(Claude / Anthropic; TASK-POS2-B)}};
\node[pivot,   below=of POS2B]                (CMP)    {Progressive atomization compare};
\node[layer,   below=of CMP]                  (L0)     {Layer 0 \,--\, same file?                       \hfill yes};
\node[layer,   below=of L0]                   (L1)     {Layer 1 \,--\, known atom overlap?              \hfill no};
\node[layer,   below=of L1]                   (L2)     {Layer 2 \,--\, shared surface overlap?          \hfill no};
\node[layer,   below=of L2]                   (L3)     {Layer 3 \,--\, read / write dependency?         \hfill no};
\node[layer,   below=of L3]                   (L4)     {Layer 4 \,--\, virtual atom overlap?            \hfill no};
\node[layer,   below=of L4]                   (LR)     {Result \,--\, bounded disjoint                  \hfill yes};
\node[verdict, below=of LR]                   (VERD)   {Verdict: \texttt{needs-physical-split}};
\node[exec,    below=of VERD]                 (COMP)   {Deterministic composer};
\node[exec,    below=of COMP]                 (STEW)   {Neutral Steward apply\,(single neutral write)};
\node[applied, below=of STEW]                 (APPLIED){Verdict: \emph{applied}};
\node[validate, below=of APPLIED]             (V1)     {Validator: \texttt{git diff -{}-check}\hfill$\checkmark$};
\node[validate, below=of V1]                  (V2)     {Validator: \texttt{npm run typecheck}\hfill$\checkmark$};
\node[validate, below=of V2]                  (V3)     {Validator: \texttt{npm run validate:cli}\hfill$\checkmark$};
\foreach \a/\b in {FILE/POS2A, POS2A/POS2B, POS2B/CMP,
                   CMP/L0, L0/L1, L1/L2, L2/L3, L3/L4, L4/LR,
                   LR/VERD, VERD/COMP, COMP/STEW, STEW/APPLIED,
                   APPLIED/V1, V1/V2, V2/V3}
    \draw[flow] (\a) -- (\b);
\end{tikzpicture}
\caption{POS2 progressive atomization case. Two cross-vendor intents land in disjoint bounded regions of the same file (blue), pass a pivot compare (yellow) and five disjointness layers (gray), are routed to \texttt{needs-physical-split} (green), executed by composer and neutral steward (violet) into a single neutral write (dark green), and pass three validators (teal). Read top-down.}
\label{fig:pos2-case}
\end{figure}
% CLAUDE-FIG-END: fig-pos2-case"""

# ---- map from anchor-line to TikZ block ----
# Each anchor uniquely identifies one Verbatim block from md sync.
REPLACEMENTS = [
    # (anchor substring inside the Verbatim, replacement)
    ('subgraph TC["Task-contract plane"]',                        FIG_THREE_PLANE),
    ('IN["WriteIntent pair<br/>I and I',                          FIG_ADMISSION_FLOW),
    ('subgraph Local["Local Edit Zone"]',                         FIG_WRITE_INTENT_ESC),
    ('"Motivation<br/>AgenticFlict (Ref. 18)<br/>Git / PR',       FIG_EVIDENCE_TAXONOMY),
    ('packages/cli/src/commands/broker.ts',                       FIG_POS2),
]

VERBATIM_RE = re.compile(
    r'\\begin\{Verbatim\}\[[^\]]*\][^\0]*?\\end\{Verbatim\}',
    re.MULTILINE,
)


def main() -> int:
    if not TEX.exists():
        print(f'paper-zh.tex not found at {TEX}', file=sys.stderr)
        return 1
    src = TEX.read_text(encoding='utf-8')
    n_applied = 0
    n_already = 0

    for anchor, replacement in REPLACEMENTS:
        # Skip if marker already present (avoid double-apply when sync did not run)
        marker = re.search(r'CLAUDE-FIG-BEGIN: ([a-z\-]+)', replacement)
        if marker and f'CLAUDE-FIG-BEGIN: {marker.group(1)}' in src:
            n_already += 1
            continue

        # Find the Verbatim block that contains this anchor
        found = False
        for m in VERBATIM_RE.finditer(src):
            if anchor in m.group(0):
                src = src[:m.start()] + replacement + src[m.end():]
                n_applied += 1
                found = True
                break
        if not found:
            print(f'WARN: anchor not found, figure may already be applied or md changed: '
                  f'{anchor[:60]!r}', file=sys.stderr)

    TEX.write_text(src, encoding='utf-8')
    print(f'restored figures: applied={n_applied}, already-present={n_already}, '
          f'total markers expected=5')
    return 0


if __name__ == '__main__':
    sys.exit(main())
