// 도전과제 배지 이미지(도트 아트) 생성 스크립트
// 사용법: node scripts/generate-badge-images.mjs
// 결과물: public/badges/*.png (40x40 도트를 12배 확대한 480x480 PNG)
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GRID = 40;
const SCALE = 12;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "badges");

// ---------- 색상 유틸 ----------
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const INK = hex("#3a2a1a");
const WHITE = hex("#ffffff");

// ---------- 캔버스 ----------
const makeCanvas = () => Array.from({ length: GRID * GRID }, () => null);
const idx = (x, y) => y * GRID + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < GRID && y < GRID;

// ---------- 도형 마스크 ----------
const maskFrom = (test) => {
  const m = new Set();
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (test(x + 0.5, y + 0.5)) m.add(idx(x, y));
    }
  }
  return m;
};
const circle = (cx, cy, r) => maskFrom((x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r);
const ellipse = (cx, cy, rx, ry) =>
  maskFrom((x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
const rect = (x0, y0, w, h) => maskFrom((x, y) => x >= x0 && x <= x0 + w && y >= y0 && y <= y0 + h);
const polygon = (pts) =>
  maskFrom((x, y) => {
    let inPoly = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inPoly = !inPoly;
    }
    return inPoly;
  });
const subtract = (a, b) => new Set([...a].filter((v) => !b.has(v)));
const intersect = (a, b) => new Set([...a].filter((v) => b.has(v)));

// 마스크를 칠한다. fill 은 색상 또는 (x, y) => 색상 함수. outline 이 있으면 바깥 1px 외곽선을 그린다.
const paint = (canvas, mask, fill, outline = INK) => {
  if (outline) {
    for (const i of mask) {
      const x = i % GRID;
      const y = Math.floor(i / GRID);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (inside(nx, ny) && !mask.has(idx(nx, ny))) canvas[idx(nx, ny)] = outline;
      }
    }
  }
  for (const i of mask) {
    const x = i % GRID;
    const y = Math.floor(i / GRID);
    canvas[i] = typeof fill === "function" ? fill(x, y) : fill;
  }
};

// 왼쪽 위는 밝게, 오른쪽 아래는 어둡게 (도트 느낌의 계단식 음영)
const shaded = (base, light, dark, x0, y0, x1, y1) => (x, y) => {
  const t = ((x - x0) / (x1 - x0) + (y - y0) / (y1 - y0)) / 2;
  if (t < 0.3) return light;
  if (t > 0.72) return dark;
  return base;
};

// ---------- 3x5 숫자 폰트 ----------
const DIGITS = {
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "001", "010", "010"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
};

const drawNumber = (canvas, text, centerX, topY, color) => {
  const str = String(text);
  const width = str.length * 3 + (str.length - 1);
  let x = Math.round(centerX - width / 2);
  for (const ch of str) {
    DIGITS[ch].forEach((row, ry) => {
      [...row].forEach((bit, rx) => {
        if (bit === "1") canvas[idx(x + rx, topY + ry)] = color;
      });
    });
    x += 4;
  }
};

// ---------- 그룹/단계 팔레트 ----------
const GROUPS = {
  hero: { bg: hex("#8fd3f4"), bgDark: hex("#6fb8e0"), face: hex("#e3f5ff") },
  weekly: { bg: hex("#c3b0f5"), bgDark: hex("#a592e0"), face: hex("#f1eaff") },
  streak: { bg: hex("#ffc89c"), bgDark: hex("#f2a86f"), face: hex("#fff0e0") },
  total: { bg: hex("#92e3bd"), bgDark: hex("#6bc99c"), face: hex("#e2fbef") },
};

// 단계별 테두리(메달) 색
const TIERS = [
  { light: hex("#e9a566"), base: hex("#cd7f32"), dark: hex("#8a4b14") }, // 동
  { light: hex("#eef2f6"), base: hex("#c3ccd6"), dark: hex("#6b7684") }, // 은
  { light: hex("#ffe27a"), base: hex("#ffc21f"), dark: hex("#b8730a") }, // 금
  { light: hex("#b4f3ff"), base: hex("#6fdcf5"), dark: hex("#2a82ab") }, // 플래티넘
  { light: hex("#e2c4ff"), base: hex("#b684f5"), dark: hex("#6a3aa8") }, // 자수정
];

// ---------- 아이콘 (중심 약 20,19 / 크기 약 18x18) ----------
const ICONS = {
  sprout: (c) => {
    const green = hex("#5ccf45");
    const greenLight = hex("#a8f07a");
    const greenDark = hex("#2f8f33");
    const soil = hex("#8b5a2b");
    paint(c, ellipse(20, 26.5, 8, 2.6), shaded(soil, hex("#a8743f"), hex("#5e3a1a"), 12, 24, 28, 29));
    paint(c, rect(19, 17, 2, 9), greenDark);
    paint(c, polygon([[19.2, 20], [11, 19], [10.5, 12.5], [18.5, 13.5]]), shaded(green, greenLight, greenDark, 10, 12, 19, 20));
    paint(c, polygon([[20.8, 17], [29, 16], [29.5, 9.5], [21.5, 10.5]]), shaded(green, greenLight, greenDark, 21, 9, 30, 17));
  },
  star: (c) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 10.5 : 4.4;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push([20 + r * Math.cos(a), 19.5 + r * Math.sin(a)]);
    }
    paint(c, polygon(pts), shaded(hex("#ffd21f"), hex("#fff08a"), hex("#f2a100"), 9, 9, 31, 30), hex("#a8530a"));
  },
  moon: (c) => {
    const moon = subtract(circle(18.5, 19.5, 8.6), circle(23, 16.5, 7));
    paint(c, moon, shaded(hex("#ffd84a"), hex("#fff3b0"), hex("#e8a90f"), 10, 11, 24, 28), hex("#6a3a08"));
    paint(c, polygon([[26, 19], [27, 21.4], [29.4, 22.4], [27, 23.4], [26, 25.8], [25, 23.4], [22.6, 22.4], [25, 21.4]]), hex("#ffd84a"), hex("#6a3a08"));
    paint(c, polygon([[25.5, 11], [26.2, 12.5], [27.7, 13.2], [26.2, 13.9], [25.5, 15.4], [24.8, 13.9], [23.3, 13.2], [24.8, 12.5]]), hex("#fff08a"), hex("#6a3a08"));
  },
  gem: (c) => {
    const body = polygon([[11.5, 15], [16, 9.5], [24, 9.5], [28.5, 15], [20, 29]]);
    paint(c, body, (x, y) => {
      if (y < 15) return x < 20 ? hex("#e7b8ff") : hex("#c58cf5");
      return x < 20 ? hex("#b47df0") : hex("#8f55d6");
    }, hex("#4a2a7a"));
    paint(c, polygon([[16, 9.5], [24, 9.5], [22, 15], [18, 15]]), hex("#f6e4ff"), null);
    paint(c, polygon([[16, 9.5], [18, 15], [11.5, 15]]), hex("#d9a8ff"), null);
    paint(c, rect(14.5, 11.5, 2, 2), WHITE, null);
  },
  earth: (c) => {
    const globe = circle(20, 19.5, 10);
    paint(c, globe, shaded(hex("#4aa8f0"), hex("#8fd2ff"), hex("#2a6fc0"), 10, 9, 30, 30), hex("#1f4f8f"));
    const land = hex("#58c75a");
    const landDark = hex("#2f9040");
    paint(c, intersect(globe, circle(16.5, 16, 3.8)), land, null);
    paint(c, intersect(globe, ellipse(15.5, 19.5, 2.4, 2)), land, null);
    paint(c, intersect(globe, circle(24, 22.5, 4.2)), landDark, null);
    paint(c, intersect(globe, ellipse(24.5, 14, 2.6, 1.6)), land, null);
    paint(c, rect(14, 12.5, 2, 1.6), WHITE, null);
  },
  flag: (c) => {
    paint(c, rect(13.5, 9, 2, 19), hex("#8b5a2b"), INK);
    paint(c, rect(11, 27, 7, 2.2), hex("#6b6b78"), INK);
    paint(c, polygon([[15.5, 10], [29, 10], [25, 14.5], [29, 19], [15.5, 19]]), shaded(hex("#ff5a5a"), hex("#ff9a9a"), hex("#c92a2a"), 15, 10, 29, 19), hex("#7a1a1a"));
  },
  medal: (c) => {
    paint(c, polygon([[12.5, 8.5], [18.5, 8.5], [22, 18], [16, 18]]), hex("#4a8cf0"), hex("#1f3f8f"));
    paint(c, polygon([[27.5, 8.5], [21.5, 8.5], [18, 18], [24, 18]]), hex("#ff5a5a"), hex("#7a1a1a"));
    paint(c, circle(20, 22, 7), shaded(hex("#ffc21f"), hex("#ffe27a"), hex("#d98c0a"), 13, 15, 27, 29), hex("#8a4b0a"));
    paint(c, circle(20, 22, 4), hex("#ffe9a0"), hex("#c9820a"));
    paint(c, rect(19, 19.5, 2, 5), hex("#d98c0a"), null);
  },
  trophy: (c) => {
    const gold = hex("#ffc21f");
    const handleL = subtract(ellipse(12.6, 14.5, 3.4, 4), ellipse(13.6, 14.5, 1.3, 2.1));
    const handleR = subtract(ellipse(27.4, 14.5, 3.4, 4), ellipse(26.4, 14.5, 1.3, 2.1));
    paint(c, handleL, gold, hex("#8a4b0a"));
    paint(c, handleR, gold, hex("#8a4b0a"));
    paint(c, polygon([[14, 9.5], [26, 9.5], [25.5, 17], [22.5, 21.5], [17.5, 21.5], [14.5, 17]]), shaded(gold, hex("#ffe98a"), hex("#d98c0a"), 14, 9, 26, 22), hex("#8a4b0a"));
    paint(c, rect(18.5, 21.5, 3, 4), hex("#d98c0a"), hex("#8a4b0a"));
    paint(c, rect(14.5, 25.5, 11, 3), hex("#8b5a2b"), INK);
    paint(c, rect(16.5, 11.5, 2, 4.5), hex("#fff3b0"), null);
  },
  shield: (c) => {
    paint(c, polygon([[11.5, 9.5], [20, 8], [28.5, 9.5], [28.5, 18.5], [20, 29.5], [11.5, 18.5]]), shaded(hex("#4a8cf0"), hex("#8bbcff"), hex("#2a58b8"), 11, 8, 29, 29), hex("#1f3f8f"));
    paint(c, polygon([[14.5, 12], [20, 11], [25.5, 12], [25.5, 18], [20, 25], [14.5, 18]]), hex("#d6e8ff"), hex("#2a58b8"));
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 4.6 : 2;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push([20 + r * Math.cos(a), 17.8 + r * Math.sin(a)]);
    }
    paint(c, polygon(pts), hex("#ffc21f"), hex("#a8530a"));
  },
  flame: (c, tone) => {
    const tones = {
      orange: { outer: hex("#ff9a1f"), light: hex("#ffc24d"), dark: hex("#e0610a"), inner: hex("#ffe27a"), line: hex("#8a2a0a") },
      red: { outer: hex("#ff5030"), light: hex("#ff8a60"), dark: hex("#c92010"), inner: hex("#ffc24d"), line: hex("#6a1008") },
      blue: { outer: hex("#3aa0ff"), light: hex("#7fcfff"), dark: hex("#1f58c8"), inner: hex("#c9f2ff"), line: hex("#0f2f7a") },
      purple: { outer: hex("#a45cff"), light: hex("#cf9aff"), dark: hex("#6a28c8"), inner: hex("#f0d9ff"), line: hex("#3a1478") },
    };
    const t = tones[tone];
    paint(c, polygon([[20, 8], [23, 12.5], [27.5, 17.5], [28, 23], [24.5, 27.5], [20, 29], [15.5, 27.5], [12, 23], [12.5, 17.5], [16, 14], [18, 16.5]]), shaded(t.outer, t.light, t.dark, 12, 8, 28, 29), t.line);
    paint(c, polygon([[20, 17], [23.5, 21.5], [23.5, 25.5], [20, 27.5], [16.5, 25.5], [16.5, 21.5]]), t.inner, null);
  },
  checklist: (c, tone) => {
    const boards = {
      bronze: { base: hex("#cd7f32"), dark: hex("#8a4b14") },
      silver: { base: hex("#aab4c0"), dark: hex("#5f6b7a") },
      gold: { base: hex("#ffc21f"), dark: hex("#b8730a") },
    };
    const b = boards[tone];
    paint(c, rect(12.5, 10, 15, 18.5), b.base, b.dark);
    paint(c, rect(14.5, 12.5, 11, 14), hex("#ffffff"), null);
    paint(c, rect(16.5, 8.2, 7, 4), hex("#7a8494"), INK);
    for (let i = 0; i < 3; i++) {
      const y = 15 + i * 4;
      paint(c, polygon([[15.5, y + 1], [16.5, y + 2.2], [18.5, y - 0.4], [18.5, y + 0.4], [16.5, y + 3.2], [15.5, y + 2.2]]), hex("#2faa50"), null);
      paint(c, rect(19.8, y + 0.6, 4.4, 1.2), hex("#b7bfca"), null);
    }
  },
};

// ---------- 배지 한 장 그리기 ----------
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const renderBadge = ({ group, tier, icon, iconTone, number, seed }) => {
  const g = GROUPS[group];
  const tr = TIERS[tier];
  const canvas = makeCanvas();

  // 배경: 위아래 두 톤 + 반짝이
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) canvas[idx(x, y)] = y < GRID * 0.62 ? g.bg : mix(g.bg, g.bgDark, 0.5);
  }
  const rand = mulberry32(seed);
  for (let n = 0; n < 9; n++) {
    const sx = 2 + Math.floor(rand() * (GRID - 4));
    const sy = 2 + Math.floor(rand() * (GRID - 4));
    if ((sx - 20) ** 2 + (sy - 19) ** 2 < 19 ** 2) continue;
    if (sy >= 28 && sx >= 6 && sx <= 34) continue; // 숫자 명패와 겹치는 반짝이 제외
    canvas[idx(sx, sy)] = WHITE;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inside(sx + dx, sy + dy)) canvas[idx(sx + dx, sy + dy)] = mix(WHITE, g.bg, 0.35);
    }
  }

  // 메달 테두리 + 안쪽 면
  paint(canvas, circle(20, 19, 15.5), shaded(tr.base, tr.light, tr.dark, 5, 4, 35, 34), INK);
  paint(canvas, circle(20, 19, 12.4), g.face, tr.dark);
  // 테두리 하이라이트 점
  for (const [hx, hy] of [[9, 9], [10, 8], [8, 11]]) canvas[idx(hx, hy)] = WHITE;

  ICONS[icon](canvas, iconTone);

  // 숫자 명패
  paint(canvas, rect(9.5, 30.5, 21, 6.4), hex("#fff5d6"), INK);
  drawNumber(canvas, number, 20, 31, INK);

  return canvas;
};

// ---------- PNG 인코딩 ----------
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const encodePng = (canvas) => {
  const size = GRID * SCALE;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0;
    for (let x = 0; x < size; x++) {
      const px = canvas[idx(Math.floor(x / SCALE), Math.floor(y / SCALE))] ?? WHITE;
      raw[p++] = px[0];
      raw[p++] = px[1];
      raw[p++] = px[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

// ---------- 배지 목록 (파일명은 DB 의 badge id 와 동일) ----------
export const BADGES = [
  // 오늘의 영웅 누적
  { file: "hero_5", group: "hero", tier: 0, icon: "sprout", number: 5 },
  { file: "hero_20", group: "hero", tier: 1, icon: "star", number: 20 },
  { file: "hero_30", group: "hero", tier: 2, icon: "moon", number: 30 },
  { file: "hero_300", group: "hero", tier: 3, icon: "gem", number: 300 },
  { file: "hero_365", group: "hero", tier: 4, icon: "earth", number: 365 },
  // 주간 완주 누적
  { file: "weekly_1", group: "weekly", tier: 0, icon: "flag", number: 1 },
  { file: "weekly_4", group: "weekly", tier: 1, icon: "medal", number: 4 },
  { file: "weekly_10", group: "weekly", tier: 2, icon: "trophy", number: 10 },
  { file: "weekly_26", group: "weekly", tier: 3, icon: "shield", number: 26 },
  // 연속 달성
  { file: "streak_3", group: "streak", tier: 0, icon: "flame", iconTone: "orange", number: 3 },
  { file: "streak_7", group: "streak", tier: 1, icon: "flame", iconTone: "red", number: 7 },
  { file: "streak_14", group: "streak", tier: 2, icon: "flame", iconTone: "blue", number: 14 },
  { file: "streak_30", group: "streak", tier: 3, icon: "flame", iconTone: "purple", number: 30 },
  // 누적 미션 개수
  { file: "total_100", group: "total", tier: 0, icon: "checklist", iconTone: "bronze", number: 100 },
  { file: "total_500", group: "total", tier: 1, icon: "checklist", iconTone: "silver", number: 500 },
  { file: "total_1000", group: "total", tier: 2, icon: "checklist", iconTone: "gold", number: 1000 },
];

mkdirSync(OUT_DIR, { recursive: true });
BADGES.forEach((badge, i) => {
  const png = encodePng(renderBadge({ ...badge, seed: 101 + i * 7 }));
  writeFileSync(join(OUT_DIR, `${badge.file}.png`), png);
  console.log(`생성: public/badges/${badge.file}.png (${png.length} bytes)`);
});
