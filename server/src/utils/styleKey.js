/**
 * Line-level style key: within a category, same brand line (first 2 tokens)
 * collapses silhouette variants (도브 울 자켓/블루종/블레이저 → one).
 */

const GARMENT_TYPES = [
  "티셔츠",
  "맨투맨",
  "후드티",
  "후드",
  "스웨트",
  "셔츠",
  "블라우스",
  "니트",
  "가디건",
  "스웨터",
  "풀오버",
  "코트",
  "자켓",
  "재킷",
  "블루종",
  "블레이저",
  "파카",
  "패딩",
  "트러커",
  "집업",
  "팬츠",
  "슬랙스",
  "조거",
  "데님",
  "치노",
  "버뮤다",
  "벨트",
  "캡",
  "볼캡",
  "비니",
  "백팩",
  "토트백",
  "크로스백",
  "카메라백",
  "백",
  "가방",
  "머플러",
  "양말",
  "슈즈",
  "슬리브",
  "롱슬리브",
];

const GENERIC_MODIFIERS = new Set(
  [
    "오버사이즈",
    "오버핏",
    "세미오버",
    "세미",
    "크롭",
    "미니멀",
    "릴렉스",
    "릴렉스드",
    "와이드",
    "슬림",
    "핸드메이드",
    "컷팅",
    "라인",
    "하프",
    "롱",
    "숏",
    "베이직",
    "에센셜",
    "프리미엄",
    "영",
    "unisex",
    "oversized",
    "relaxed",
    "crop",
    "wide",
    "slim",
    "half",
    "long",
  ].map((s) => s.toLowerCase())
);

const COLOR_TOKENS = new Set(
  [
    "블랙",
    "화이트",
    "네이비",
    "그레이",
    "차콜",
    "베이지",
    "블루",
    "브라운",
    "아이보리",
    "레드",
    "그린",
    "멜란지",
    "크림",
    "카멜",
    "인디고",
    "카키",
    "스카이",
    "바질",
    "시나몬",
    "아보카도",
    "터콰이즈",
    "칸초",
    "black",
    "white",
    "navy",
    "grey",
    "gray",
    "charcoal",
    "beige",
    "blue",
    "brown",
    "ivory",
    "red",
    "green",
    "melange",
    "cream",
    "camel",
    "indigo",
    "dark",
    "light",
    "midnight",
    "low",
    "sky",
    "deep",
    "washing",
    "aqua",
    "pink",
    "sand",
    "shadow",
    "rock",
    "turquoise",
    "gilia",
    "jeju",
    "lavender",
    "mosky",
    "oatmeal",
    "orange",
    "cloud",
    "khaki",
    "crop",
    "linen",
    "olive",
    "taupe",
    "ecru",
    "ivory",
    "wine",
    "burgundy",
    "mustard",
    "neon",
    "fashion",
  ].map((s) => s.toLowerCase())
);

const COLOR_MAP = {
  BLACK: "블랙",
  블랙: "블랙",
  WHITE: "화이트",
  화이트: "화이트",
  NAVY: "네이비",
  네이비: "네이비",
  GREY: "그레이",
  GRAY: "그레이",
  그레이: "그레이",
  CHARCOAL: "차콜",
  차콜: "차콜",
  BEIGE: "베이지",
  베이지: "베이지",
  "L.BEIGE": "베이지",
  BROWN: "브라운",
  브라운: "브라운",
  "DARK BROWN": "브라운",
  BLUE: "블루",
  블루: "블루",
  "SKY BLUE": "스카이",
  "LIGHT BLUE": "스카이",
  "MIDNIGHT BLUE": "네이비",
  "DARK BLUE": "네이비",
  "DEEP INDIGO": "인디고",
  INDIGO: "인디고",
  인디고: "인디고",
  RED: "레드",
  레드: "레드",
  ROSE: "레드",
  GREEN: "그린",
  그린: "그린",
  OLIVE: "카키",
  KHAKI: "카키",
  카키: "카키",
  CREAM: "베이지",
  ECRU: "에크루",
  IVORY: "아이보리",
  아이보리: "아이보리",
  CAMEL: "카멜",
  카멜: "카멜",
  SKY: "스카이",
  스카이: "스카이",
  "SKY BLUE": "스카이",
  MELANGE: "그레이",
  "MELANGE GREY": "그레이",
  "MELANGE GRAY": "그레이",
  "L.GREY": "그레이",
  TAUPE: "베이지",
  "MELANGE TAUPE": "베이지",
  CHARCOAL: "차콜",
};

function tokenize(name) {
  return String(name || "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[_/]+/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .filter((t) => !COLOR_TOKENS.has(t))
    .filter((t) => !GENERIC_MODIFIERS.has(t));
}

function findGarmentTypeIndex(tokens) {
  let idx = -1;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (GARMENT_TYPES.some((g) => t === g || t.includes(g))) idx = i;
  }
  return idx;
}

/**
 * Line identity within a category (modifiers/colors stripped):
 * first 2 meaningful tokens → collapses 도브 울 * / 스테이블 린넨 * series.
 */
function styleKey(name) {
  const tokens = tokenize(name);
  if (!tokens.length) return "";

  const typeIdx = findGarmentTypeIndex(tokens);
  const before = typeIdx >= 0 ? tokens.slice(0, typeIdx) : tokens;
  const head = before.slice(0, 2);
  if (!head.length && typeIdx >= 0) return tokens[typeIdx];
  return head.join(" ");
}

/** Extract Korean display color from brand label / product name. */
function colorFromLabel(label) {
  const raw = String(label || "");
  const bracket = raw.match(/\[([^\]]+)\]/);
  if (bracket) {
    const key = bracket[1].trim().toUpperCase();
    if (COLOR_MAP[key]) return COLOR_MAP[key];
    const parts = key.split(/\s+/);
    // try full then last token
    if (COLOR_MAP[parts.join(" ")]) return COLOR_MAP[parts.join(" ")];
    if (COLOR_MAP[parts[parts.length - 1]]) {
      return COLOR_MAP[parts[parts.length - 1]];
    }
  }

  // trailing english/korean color words
  const upper = raw.toUpperCase();
  const ordered = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
  for (const key of ordered) {
    if (/[가-힣]/.test(key)) {
      if (raw.includes(key)) return COLOR_MAP[key];
    } else if (new RegExp(`(?:^|[\\s\\-\\[])${key}(?:$|[\\s\\-\\]])`, "i").test(upper)) {
      return COLOR_MAP[key];
    }
  }
  return "블랙";
}

/** Clean product title without colorway noise, append Korean color. */
function displayNameFromLabel(label, colorKo) {
  let base = String(label || "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/^unisex\s+/i, "")
    .replace(/^young\s+/i, "영 ")
    .replace(/^mataiga\s+/i, "마타이가 ")
    .replace(/\s+/g, " ")
    .trim();

  // strip trailing color tokens (en/ko)
  const colorWord =
    /(?:\s+(?:BLACK|WHITE|NAVY|GRE[YA]|CHARCOAL|BEIGE|BLUE|BROWN|IVORY|RED|GREEN|MELANGE|CREAM|CAMEL|INDIGO|KHAKI|OLIVE|TAUPE|ECRU|DARK|LIGHT|MIDNIGHT|SKY|DEEP|LOW|WASHING|AQUA|PINK|SAND|SHADOW|ROCK|TURQUOISE|GILIA|JEJU|LAVENDER|OATMEAL|ORANGE|CLOUD|NEON|FASHION|바질|시나몬|아보카도|터콰이즈|칸초|블랙|화이트|네이비|그레이|차콜|베이지|블루|브라운|아이보리|레드|그린|카멜|카키|멜란지|크림|인디고))+$/i;
  base = base.replace(colorWord, "").trim();

  // strip leftover single english colorway tokens in the middle near end
  base = base
    .split(/\s+/)
    .filter((t) => !COLOR_TOKENS.has(t.toLowerCase()))
    .join(" ")
    .trim();

  const color = colorKo || colorFromLabel(label);
  if (!base) base = "상품";
  // avoid "… 베이지 베이지"
  if (base.endsWith(color)) return base;
  const parts = base.split(/\s+/);
  if (parts[parts.length - 1] === color) return base;
  return `${base} ${color}`.replace(/\s+/g, " ").trim();
}

module.exports = {
  styleKey,
  tokenize,
  colorFromLabel,
  displayNameFromLabel,
  GARMENT_TYPES,
  COLOR_TOKENS,
  COLOR_MAP,
};
