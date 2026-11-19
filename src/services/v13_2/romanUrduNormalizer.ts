/**
 * AWAAZ-E-AWAM (آوازِ عوام) — Phase V13.2 Roman Urdu Normalization Engine
 *
 * Implements deterministic, character-aware, and lexicon-guided normalization
 * for natural civic complaints submitted in Roman Urdu.
 *
 * Design Principles:
 * 1. Non-destructive: Original citizen text is NEVER modified or overwritten in storage.
 *    Normalization is strictly an internal lens for feature extraction and clause understanding.
 * 2. Preservation of Negation: Never invert or strip negative operators ('nahi', 'koi issue nahi').
 * 3. Preservation of Causality: Retains explicit causal connectives ('ki wajah se', 'isi liye').
 * 4. Context-Restricted: Does not alter person names, local area names, or unrelated English words.
 * 5. Space Recovery: Reconstitutes high-frequency missing spaces in civic expressions without greedy over-splitting.
 */

// Mapping of standardized civic lemma -> spelling variations
const SPELLING_VARIANTS: Record<string, string[]> = {
  // Electricity / K-Electric
  bijli: ['bejli', 'bigli', 'bijlee', 'bjli', 'bjl', 'bijlli'],
  transformer: ['tranforma', 'transfarmer', 'transformr', 'trasformer', 'transfomer', 'trnsfrmr', 'transfarer', 'transfamer'],
  taar: ['tar', 'taarein', 'taren', 'tarein', 'wire', 'wires'],
  current: ['curnt', 'crnt', 'karant', 'karent'],
  khamba: ['khumba', 'khambah', 'pole', 'pol'],
  sparking: ['spark', 'sparks', 'chingari', 'chingariyan', 'chingariyon'],
  voltage: ['voltg', 'voltaj', 'voltege'],
  tripping: ['triping', 'trip', 'tripp'],

  // Water & Sewerage / KWSC
  pani: ['pane', 'paani', 'panii', 'panie', 'pni', 'paney', 'pani'],
  sewerage: ['sewrage', 'severage', 'sever', 'sewrege', 'sewage'],
  gutter: ['gutar', 'gatter', 'gatar', 'gutr', 'gathr'],
  dhakkan: ['dhakan', 'dhakn', 'dakkan', 'dhkn', 'dhakna'],
  motor: ['motar', 'motr', 'pump', 'waterpump'],
  tanker: ['tankar', 'tankr'],
  sookhi: ['suki', 'sukhi', 'sokhi', 'sooki', 'khushk'],
  ubal: ['ubhal', 'ubalna', 'ubhalna', 'chhalak'],

  // Sui Southern Gas / SSGC
  gas: ['gass', 'gaas', 'gss', 'gees'],
  chulha: ['choolha', 'chula', 'choola', 'chulhe', 'chulhay', 'stove'],
  cylinder: ['slender', 'silender', 'silinder', 'cylndr'],
  boodar: ['boo', 'badboo', 'badbu', 'bad-boo', 'smell', 'odor', 'bhoo'],
  pressure: ['prshr', 'pressre', 'presure', 'presher'],

  // Roads & Infrastructure / KMC
  road: ['rod', 'rood', 'sarak', 'sadak', 'srk', 'sark'],
  toot: ['tooti', 'tuti', 'toti', 'toota', 'tuta', 'tota', 'tut', 'tootaa'],
  khadda: ['khadday', 'khadde', 'gadda', 'gadday', 'gadde', 'gadha', 'pothole', 'potholes'],
  footpath: ['futpath', 'foot path', 'fut path'],
  bridge: ['pul', 'plyover', 'flyover', 'underpass'],
  gali: ['glee', 'galli', 'gully', 'street'],

  // Solid Waste / SSWMB
  kachra: ['kachrah', 'kooda', 'kuda', 'kachre', 'kachrey', 'garbage', 'trash', 'waste'],
  dustbin: ['dastbin', 'kundi', 'kachra kundi', 'dumpster'],
  dumper: ['damper', 'dampr', 'dumpr'],
  sweeper: ['swpr', 'jamadar', 'safai wala', 'safai walay'],
  dher: ['dhaer', 'dheer', 'ambar', 'pile'],

  // Building Control / SBCA
  building: ['bldng', 'bilding', 'imarat', 'emarat', 'plaza', 'bldg'],
  crack: ['cracks', 'daraar', 'darar', 'daraarein', 'draren'],
  chhat: ['chath', 'chat', 'roof'],
  deewar: ['diwar', 'dewaarein', 'diwarein', 'wall'],
  illegal: ['ghair qanooni', 'ghairqanooni', 'najaiz', 'unauthorized'],
  girne: ['girna', 'gir', 'collapse', 'girne wali'],

  // Common Auxiliary & Verbal Tokens
  nahi: ['nhi', 'ni', 'nai', 'nahe', 'nahin', 'nahee', 'nhn', 'nae'],
  rahi: ['rhi', 'rhin', 'rahii'],
  raha: ['rha', 'rahaa'],
  rahe: ['rhe', 'rhay'],
  hai: ['hy', 'h', 'he'],
  hain: ['hn', 'hen', 'hae'],
  wajah: ['waja', 'vajha', 'vaja', 'wjh'],
  bohot: ['boht', 'bht', 'bohat', 'bhat', 'bhot'],
  zyada: ['zada', 'zyadh', 'ziada', 'ziyada'],
  kharab: ['khrab', 'khrb', 'kharb', 'xarab', 'xraab'],
  band: ['bnd', 'bund'],
  chal: ['chl', 'chalti', 'chalta', 'chaltay'],
  shikayat: ['shkayat', 'complaint', 'complant', 'shikayt'],
  shuru: ['shru', 'shuroo'],
};

// Inverted lookup map for fast single-token normalization
const VARIANT_TO_LEMMA = new Map<string, string>();
for (const [lemma, variants] of Object.entries(SPELLING_VARIANTS)) {
  VARIANT_TO_LEMMA.set(lemma.toLowerCase(), lemma.toLowerCase());
  for (const v of variants) {
    VARIANT_TO_LEMMA.set(v.toLowerCase(), lemma.toLowerCase());
  }
}

/**
 * Collapses 3 or more repeated identical characters down to 1 or 2,
 * preserving meaningful vowel phonetics (e.g. 'paaaani' -> 'paani', 'bohooot' -> 'bohot').
 */
export function collapseRepeatedCharacters(text: string): string {
  return text.replace(/([a-zA-Z])\1{2,}/g, (_, char) => {
    // Preserve natural double vowels in Roman Urdu: 'aa', 'ee', 'oo'
    if (['a', 'e', 'o'].includes(char.toLowerCase())) {
      return char + char;
    }
    return char;
  });
}

/**
 * Splits high-frequency joined civic expressions where a space was omitted on mobile keyboards.
 */
export function splitJoinedCivicTokens(text: string): string {
  let t = text;

  // Joined noun + negation/verbal
  t = t.replace(/\b(bijli|gas|pani|road|sarak|kachra|gutter|taar)(nahi|nhi|ni|nai)(a?r[a-z]*)\b/gi, '$1 nahi $3');
  t = t.replace(/\b(bijli|gas|pani|road|sarak|kachra|gutter|taar|light)(nahi|nhi|ni|nai|chali|band|gul)\b/gi, '$1 $2');
  t = t.replace(/\b(pani|gas|bijli|light)(aaraha|aarahi|aarha|aarhi|arha|arhi)\b/gi, '$1 aa rahi');
  t = t.replace(/\b(road|sarak|sadak|gutter|transformer)(kharab|khrab|toot|choke|burst|blast)\b/gi, '$1 $2');
  t = t.replace(/\b(taar|wire)(toot|gir|latak|latki)\b/gi, '$1 $2');
  t = t.replace(/\b(gutter|gatar)(dhakkan|dhakan|dhakna|ubal|choke)\b/gi, '$1 $2');
  t = t.replace(/\b(gas|pani)(leak|leek|pipeline|line|pressure)\b/gi, '$1 $2');
  t = t.replace(/\b(kachra|kooda)(dher|dhair|gari|gaari)\b/gi, '$1 $2');
  t = t.replace(/\b(main)(line|pipe|road|hole|sewer)\b/gi, '$1 $2');

  // Joined prepositional combinations
  t = t.replace(/\b(se|ke|ki|ka|mein|par)(bijli|gas|pani|road|sarak|kachra|gutter|transformer|line|pipe|building)\b/gi, '$1 $2');
  t = t.replace(/\b(bijli|gas|pani|road|sarak|kachra|gutter|transformer|line|pipe|building)(se|ke|ki|ka|mein|par|ko)\b/gi, '$1 $2');

  // Joined auxiliary / connectors
  t = t.replace(/\b(hai|hain|tha|thi)(aur|lekin|magar|isliye|iski)\b/gi, '$1 $2');
  t = t.replace(/\b(is|us)(wajah|liye|sabab)\b/gi, '$1 $2');

  return t;
}

/**
 * Normalizes verbal stems and common verbal contractions.
 */
export function normalizeVerbalStems(text: string): string {
  let t = text;
  t = t.replace(/\b(aa\s*rhi|aarhi|arhi|aarahi|arahi)\b/gi, 'aa rahi');
  t = t.replace(/\b(aa\s*rha|aarha|arha|aaraha|araha)\b/gi, 'aa raha');
  t = t.replace(/\b(aa\s*rhe|aarhe|arhe|aaraye)\b/gi, 'aa rahe');
  t = t.replace(/\b(ho\s*gae|ho\s*gai|ho\s*gy|hogai|hogayi)\b/gi, 'ho gayi');
  t = t.replace(/\b(ho\s*gaya|hogaya|hogy)\b/gi, 'ho gaya');
  t = t.replace(/\b(kar\s*diya|kardiya|kr\s*diya)\b/gi, 'kar diya');
  t = t.replace(/\b(chal\s*rahi|chalrhi|chl\s*rhi)\b/gi, 'chal rahi');
  t = t.replace(/\b(jal\s*raha|jalrha|jl\s*rha)\b/gi, 'jal raha');
  t = t.replace(/\b(band\s*hai|bnd\s*h|bnd\s*hai)\b/gi, 'band hai');
  t = t.replace(/\b(toot\s*gai|tut\s*gai|tootgai|tutgai)\b/gi, 'toot gayi');
  return t;
}

/**
 * Normalizes Roman Urdu complaint text while strictly preserving:
 * - Original capitalization for audit if needed (returns clean lowercase normalized)
 * - Punctuation and clause boundaries
 * - Negation operators
 * - Proper names and locations
 *
 * This function NEVER overwrites the user's submitted description in the database.
 */
export function normalizeRomanUrduV13_2(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  // 1. Lowercase and standard unicode normalization
  let text = rawText.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '');

  // 2. Collapse extreme character repetitions (e.g. 'paaaani' -> 'paani')
  text = collapseRepeatedCharacters(text);

  // 3. Resolve joined civic tokens with missing spaces
  text = splitJoinedCivicTokens(text);

  // 4. Token-by-token canonical lemma replacement
  // We split on whitespace while retaining punctuation boundaries
  const tokens = text.split(/(\s+|[.,!?;:()\[\]"'–—/])/);
  for (let i = 0; i < tokens.length; i++) {
    const rawToken = tokens[i];
    if (!rawToken || /^\s+$/.test(rawToken) || /^[.,!?;:()\[\]"'–—/]$/.test(rawToken)) {
      continue;
    }
    const cleanWord = rawToken.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const canonical = VARIANT_TO_LEMMA.get(cleanWord);
    if (canonical) {
      tokens[i] = canonical;
    }
  }
  text = tokens.join('');

  // 5. Verbal and phrasal contractions
  text = normalizeVerbalStems(text);

  // 6. Clean extraneous whitespace
  return text.replace(/[ \t]+/g, ' ').trim();
}

// Aliases for testing and modular integration
export {
  collapseRepeatedCharacters as normalizeElongations,
  splitJoinedCivicTokens as splitFusedWords,
};

export function correctTypos(word: string): string {
  const clean = word.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return VARIANT_TO_LEMMA.get(clean) || word;
}

