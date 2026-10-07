import type { CSSProperties } from "react";
import { HangulNetworkMotion } from "./hangul-network-motion";

/*
  Hero visual: a loose constellation of Hangul words joined by thin light paths
  (DESIGN.md §6). Original composition: words drift around the focal 말 ("words,
  speech") like a sentence assembling, not the reference's crossing light trails.
  Pure SVG + CSS, decorative and aria-hidden; it never receives pointer events.
*/

type Depth = 0 | 1 | 2;

type GlyphNode = {
  id: string;
  glyph: string;
  x: number;
  y: number;
  size: number;
  depth: Depth;
  /** Hidden below 640 px so the phone composition stays simple. */
  compact?: boolean;
};

const nodes: GlyphNode[] = [
  { id: "mal", glyph: "말", x: 470, y: 300, size: 148, depth: 2, compact: true },
  { id: "maeum", glyph: "마음", x: 205, y: 205, size: 50, depth: 1, compact: true },
  { id: "sori", glyph: "소리", x: 690, y: 175, size: 44, depth: 1 },
  { id: "uri", glyph: "우리", x: 640, y: 470, size: 54, depth: 1, compact: true },
  { id: "na", glyph: "나", x: 150, y: 430, size: 46, depth: 1 },
  { id: "iyagi", glyph: "이야기", x: 330, y: 560, size: 40, depth: 1, compact: true },
  { id: "geul", glyph: "글", x: 395, y: 80, size: 34, depth: 0 },
  { id: "hieut", glyph: "ㅎ", x: 760, y: 345, size: 30, depth: 0 },
  { id: "a", glyph: "ㅏ", x: 95, y: 110, size: 28, depth: 0 },
  { id: "nieun", glyph: "ㄴ", x: 790, y: 600, size: 26, depth: 0 },
  { id: "neo", glyph: "너", x: 240, y: 652, size: 30, depth: 0 },
];

type Edge = { from: string; to: string; bend: number; tone: "warm" | "cool"; pulse?: number };

const edges: Edge[] = [
  { from: "maeum", to: "mal", bend: -60, tone: "warm", pulse: 0 },
  { from: "mal", to: "sori", bend: -50, tone: "warm", pulse: 2.6 },
  { from: "mal", to: "uri", bend: 40, tone: "cool", pulse: 1.3 },
  { from: "na", to: "mal", bend: 70, tone: "cool", pulse: 3.9 },
  { from: "iyagi", to: "mal", bend: -40, tone: "warm" },
  { from: "geul", to: "maeum", bend: 30, tone: "warm" },
  { from: "sori", to: "hieut", bend: 20, tone: "cool" },
  { from: "a", to: "maeum", bend: -20, tone: "cool" },
  { from: "uri", to: "nieun", bend: -25, tone: "cool" },
  { from: "na", to: "neo", bend: 25, tone: "warm" },
  { from: "iyagi", to: "uri", bend: 45, tone: "cool" },
];

const byId = new Map(nodes.map((node) => [node.id, node]));

const curve = ({ from, to, bend }: Edge) => {
  const a = byId.get(from)!;
  const b = byId.get(to)!;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const cx = mx + (-(b.y - a.y) / length) * bend;
  const cy = my + ((b.x - a.x) / length) * bend;
  return `M${a.x} ${a.y} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
};

const depthStyle: Record<Depth, string> = {
  0: "hn-layer hn-depth-0",
  1: "hn-layer hn-depth-1",
  2: "hn-layer hn-depth-2",
};

const compactEdge = (edge: Edge) => byId.get(edge.from)?.compact && byId.get(edge.to)?.compact;

export const HangulNetwork = () => (
  <div className="hangul-network" aria-hidden="true">
    <div className="hn-glow" />
    <HangulNetworkMotion>
      <svg viewBox="0 0 860 680" preserveAspectRatio="xMidYMid meet" className="hn-svg">
        <defs>
          <linearGradient id="hn-warm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--hn-warm)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--hn-warm)" stopOpacity="0.85" />
            <stop offset="1" stopColor="var(--hn-warm)" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="hn-cool" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--hn-cool)" stopOpacity="0.1" />
            <stop offset="0.5" stopColor="var(--hn-cool)" stopOpacity="0.75" />
            <stop offset="1" stopColor="var(--hn-cool)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="hn-node">
            <stop offset="0" stopColor="var(--hn-node)" stopOpacity="1" />
            <stop offset="1" stopColor="var(--hn-node)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="hn-layer hn-depth-paths">
          {edges.map((edge) => {
            const d = curve(edge);
            return (
              <g key={`${edge.from}-${edge.to}`} className={compactEdge(edge) ? undefined : "hn-detail"}>
                <path d={d} className="hn-path" stroke={`url(#hn-${edge.tone})`} />
                {edge.pulse !== undefined ? (
                  <path
                    d={d}
                    pathLength={100}
                    className={`hn-pulse hn-pulse-${edge.tone}`}
                    style={{ "--hn-delay": `${edge.pulse}s` } as CSSProperties}
                  />
                ) : null}
              </g>
            );
          })}
        </g>

        {([0, 1, 2] as const).map((depth) => (
          <g key={depth} className={depthStyle[depth]}>
            {nodes
              .filter((node) => node.depth === depth)
              .map((node, index) => (
                <g
                  key={node.id}
                  className={`hn-node ${node.compact ? "" : "hn-detail"}`}
                  style={{ "--hn-drift": `${11 + ((index * 3 + depth * 2) % 7)}s`, "--hn-drift-delay": `${-index * 1.7}s` } as CSSProperties}
                >
                  <circle cx={node.x} cy={node.y} r={node.size * (depth === 2 ? 0.95 : 0.6)} fill="url(#hn-node)" className="hn-halo" />
                  <text
                    x={node.x}
                    y={node.y}
                    lang="ko"
                    fontSize={node.size}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={depth === 2 ? "hn-glyph hn-glyph-focal" : "hn-glyph"}
                  >
                    {node.glyph}
                  </text>
                </g>
              ))}
          </g>
        ))}
      </svg>
    </HangulNetworkMotion>
  </div>
);
