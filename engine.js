// Cued — Personalized Taste DNA Engine v2 & Poster Renderer

(function () {
  const STORAGE_KEY = 'cued_profile_v2';
  const POSTER_CACHE_KEY = 'cued_tmdb_posters_v1';
  const LIVE_TITLES_KEY = 'cued_live_titles_v1';

  const DNA_KEYS = ['pace', 'intensity', 'complexity', 'warmth', 'humor', 'spectacle'];
  const VALID_RATINGS = new Set(['loved', 'liked', 'meh', 'never']);

  const DNA_META = [
    { key: 'pace',       low: 'Slow Burn',       high: 'Relentless Pace', label: 'Pacing' },
    { key: 'intensity',  low: 'Light & Easy',    high: 'Dark & Intense',  label: 'Intensity' },
    { key: 'complexity', low: 'Straightforward', high: 'Twisty & Smart',  label: 'Plot Twists' },
    { key: 'warmth',     low: 'Bleak / Gritty',  high: 'Deep & Moving',   label: 'Emotional Pull' },
    { key: 'humor',      low: 'Dead Serious',    high: 'Witty & Fun',     label: 'Humor' },
    { key: 'spectacle',  low: 'Grounded',        high: 'Epic Scale',      label: 'Scale' }
  ];

  const DEFAULT_DNA = {
    pace: 8.5,
    intensity: 8.5,
    complexity: 8.0,
    warmth: 5.5,
    humor: 5.0,
    spectacle: 8.0
  };

  const DEFAULT_RATINGS = {
    'breaking-bad': 'loved',
    'game-of-thrones': 'loved',
    'sherlock': 'loved',
    'shutter-island': 'loved',
    'andhadhun': 'loved',
    'hit-first-case': 'loved',
    'gangs-of-wasseypur': 'loved',
    'insidious': 'loved',
    'the-pianist': 'loved',
    'solo-leveling': 'loved',
    'demon-slayer': 'loved',
    'harry-potter': 'loved',
    'avengers-iw': 'loved',
    'jumanji': 'loved'
  };

  const SOFT_SKIP_TTL_MS = 5 * 24 * 60 * 60 * 1000;   // 5 days
  const HISTORY_COOLDOWN_DAYS = 14;
  const DISCOVER_CACHE_TTL_MS = 10 * 60 * 1000;       // 10 minutes
  const MAX_POSTER_CACHE_ENTRIES = 200;
  const MAX_LIVE_TITLES_CACHED = 80;

  let catalogMap = null;
  let catalogMapSize = 0;
  let posterCacheMem = null;
  let lastTmdbError = null;
  const discoverCache = new Map();
  const liveTitleRegistry = new Map();

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function zeroOffsets() {
    const o = {};
    for (const k of DNA_KEYS) o[k] = 0;
    return o;
  }

  function ensureCatalogMap() {
    const cat = window.CUED_CATALOG || [];
    if (!catalogMap || catalogMapSize !== cat.length) {
      catalogMap = new Map();
      for (const item of cat) catalogMap.set(item.id, item);
      catalogMapSize = cat.length;
    }
    return catalogMap;
  }

  function loadLiveTitleRegistry() {
    try {
      const raw = localStorage.getItem(LIVE_TITLES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      for (const [id, item] of Object.entries(parsed)) {
        if (item && item.id && item.title && item.dna) {
          liveTitleRegistry.set(id, item);
        }
      }
    } catch {
      // ignore corrupted cache
    }
  }

  function saveLiveTitleRegistry(profile) {
    try {
      const pinned = new Set();
      if (profile) {
        for (const id of profile.watchlist || []) pinned.add(id);
        for (const id of Object.keys(profile.ratings || {})) pinned.add(id);
        for (const h of profile.history || []) if (h && h.id) pinned.add(h.id);
      }
      const out = {};
      const entries = Array.from(liveTitleRegistry.entries());
      // Keep all pinned live titles first
      for (const [id, item] of entries) {
        if (pinned.has(id)) out[id] = item;
      }
      // Fill remaining slots with most recent live discoveries
      let extra = 0;
      for (let i = entries.length - 1; i >= 0 && extra < MAX_LIVE_TITLES_CACHED; i--) {
        const [id, item] = entries[i];
        if (!out[id]) {
          out[id] = item;
          extra++;
        }
      }
      localStorage.setItem(LIVE_TITLES_KEY, JSON.stringify(out));
    } catch {
      // ignore quota errors
    }
  }

  function persistLiveTitle(title, profile) {
    if (!title || !title.id || !title.isLiveTmdb) return;
    liveTitleRegistry.set(title.id, title);
    saveLiveTitleRegistry(profile);
  }

  loadLiveTitleRegistry();

  // Pre-calibrated from your Taste Grill!
  function createDefaultProfile() {
    return {
      profileName: 'Personal Taste · Calibrated',
      dna: { ...DEFAULT_DNA },
      dnaOffsets: zeroOffsets(),
      ratings: { ...DEFAULT_RATINGS },
      watchlist: [],
      history: [],
      softSkips: {},
      dismissedNudgeId: '',
      allAccess: true,      // Nuvio All-Access — every title unlocked
      allowSubtitles: true, // Subtitles & international titles welcome
      minYear: 0,
      tmdbApiKey: ''
    };
  }

  function sanitizeProfile(raw) {
    const def = createDefaultProfile();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return def;
    }

    const dna = {};
    for (const k of DNA_KEYS) {
      const num = raw.dna && raw.dna[k] !== undefined ? Number(raw.dna[k]) : def.dna[k];
      dna[k] = Number.isFinite(num) ? Number(clamp(num, 1, 10).toFixed(2)) : def.dna[k];
    }

    const hasOffsets = raw.dnaOffsets && typeof raw.dnaOffsets === 'object';
    const dnaOffsets = {};
    for (const k of DNA_KEYS) {
      const num = hasOffsets && raw.dnaOffsets[k] !== undefined ? Number(raw.dnaOffsets[k]) : 0;
      dnaOffsets[k] = Number.isFinite(num) ? Number(clamp(num, -6, 6).toFixed(2)) : 0;
    }

    const ratings = {};
    if (raw.ratings && typeof raw.ratings === 'object' && !Array.isArray(raw.ratings)) {
      for (const [id, r] of Object.entries(raw.ratings)) {
        if (typeof id === 'string' && VALID_RATINGS.has(r)) {
          ratings[id] = r;
        }
      }
    } else if (raw.ratings === undefined) {
      Object.assign(ratings, def.ratings);
    }

    const watchlist = Array.isArray(raw.watchlist)
      ? Array.from(new Set(raw.watchlist.filter((id) => typeof id === 'string' && id.trim())))
      : [];

    const history = Array.isArray(raw.history)
      ? raw.history
          .filter((h) => h && typeof h.id === 'string' && typeof h.pickedAt === 'string')
          .slice(0, 40)
      : [];

    const now = Date.now();
    const softSkips = {};
    if (raw.softSkips && typeof raw.softSkips === 'object' && !Array.isArray(raw.softSkips)) {
      for (const [id, ts] of Object.entries(raw.softSkips)) {
        const n = Number(ts);
        if (typeof id === 'string' && Number.isFinite(n) && now - n < SOFT_SKIP_TTL_MS) {
          softSkips[id] = n;
        }
      }
    }

    const minYearNum = Number(raw.minYear);
    const minYear = Number.isFinite(minYearNum) && minYearNum >= 0 && minYearNum <= 2030 ? Math.floor(minYearNum) : 0;

    const profile = {
      profileName: typeof raw.profileName === 'string' && raw.profileName.trim()
        ? raw.profileName.trim().slice(0, 60)
        : def.profileName,
      dna,
      dnaOffsets,
      ratings,
      watchlist,
      history,
      softSkips,
      dismissedNudgeId: typeof raw.dismissedNudgeId === 'string' ? raw.dismissedNudgeId : '',
      allAccess: true,
      allowSubtitles: typeof raw.allowSubtitles === 'boolean' ? raw.allowSubtitles : def.allowSubtitles,
      minYear,
      tmdbApiKey: typeof raw.tmdbApiKey === 'string' ? raw.tmdbApiKey.trim() : ''
    };

    // Upgrade migration: preserve any pre-v2 manual DNA slider tweaks as offsets
    if (!hasOffsets && raw.dna) {
      const base = computeBaseDnaFromRatings(profile.ratings);
      for (const k of DNA_KEYS) {
        profile.dnaOffsets[k] = Number(clamp(profile.dna[k] - base[k], -6, 6).toFixed(2));
      }
    }

    return profile;
  }

  function loadProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultProfile();
      return sanitizeProfile(JSON.parse(raw));
    } catch {
      return createDefaultProfile();
    }
  }

  function saveProfile(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      saveLiveTitleRegistry(profile);
    } catch {
      // ignore storage quota issues in sandboxed previews
    }
  }

  function exportProfileJson(profile, includeApiKey = false) {
    const clean = {
      profileName: profile.profileName,
      dna: { ...profile.dna },
      dnaOffsets: { ...(profile.dnaOffsets || zeroOffsets()) },
      ratings: { ...profile.ratings },
      watchlist: [...(profile.watchlist || [])],
      history: [...(profile.history || [])],
      allAccess: true,
      allowSubtitles: profile.allowSubtitles,
      minYear: profile.minYear
    };
    if (includeApiKey && profile.tmdbApiKey) {
      clean.tmdbApiKey = profile.tmdbApiKey;
    }
    return JSON.stringify(clean, null, 2);
  }

  function getTitleById(id) {
    return ensureCatalogMap().get(id) || liveTitleRegistry.get(id);
  }

  // Deterministic, drift-free DNA computation from ratings relative to calibrated prior
  function computeBaseDnaFromRatings(ratings) {
    const posAccum = zeroOffsets();
    const negAccum = zeroOffsets();
    let posCount = 0;
    let negCount = 0;

    const posWeight = { loved: 0.24, liked: 0.12 };
    const negWeight = { meh: 0.08, never: 0.14 };

    // 1. Apply ratings added or changed beyond starter defaults
    for (const [id, rating] of Object.entries(ratings || {})) {
      if (DEFAULT_RATINGS[id] === rating) continue;
      const t = getTitleById(id);
      if (!t || !t.dna) continue;

      if (posWeight[rating]) {
        posCount++;
        const w = posWeight[rating];
        for (const k of DNA_KEYS) {
          posAccum[k] += (t.dna[k] - DEFAULT_DNA[k]) * w;
        }
      } else if (negWeight[rating]) {
        negCount++;
        const w = negWeight[rating];
        for (const k of DNA_KEYS) {
          // Gently pull away from disliked title's extremes
          negAccum[k] += (DEFAULT_DNA[k] - t.dna[k]) * w;
        }
      }
    }

    // 2. If user removed a starter default anchor, gently subtract its prior pull
    for (const [id] of Object.entries(DEFAULT_RATINGS)) {
      if (ratings && ratings[id]) continue;
      const t = getTitleById(id);
      if (!t || !t.dna) continue;
      negCount++;
      for (const k of DNA_KEYS) {
        negAccum[k] += (DEFAULT_DNA[k] - t.dna[k]) * 0.07;
      }
    }

    const posNorm = 1 + posCount * 0.22;
    const negNorm = 1 + negCount * 0.30;

    const out = {};
    for (const k of DNA_KEYS) {
      const delta = (posAccum[k] / posNorm) + (negAccum[k] / negNorm);
      out[k] = Number(clamp(DEFAULT_DNA[k] + delta, 1, 10).toFixed(2));
    }
    return out;
  }

  function recomputeDna(profile) {
    const base = computeBaseDnaFromRatings(profile.ratings);
    const offsets = profile.dnaOffsets || zeroOffsets();
    for (const k of DNA_KEYS) {
      profile.dna[k] = Number(clamp(base[k] + (offsets[k] || 0), 1, 10).toFixed(2));
    }
    return profile;
  }

  function setManualDnaAxis(profile, key, value) {
    if (!DNA_KEYS.includes(key)) return profile;
    const num = Number(value);
    if (!Number.isFinite(num)) return profile;
    const clamped = Number(clamp(num, 1, 10).toFixed(2));
    const base = computeBaseDnaFromRatings(profile.ratings);
    if (!profile.dnaOffsets) profile.dnaOffsets = zeroOffsets();
    profile.dnaOffsets[key] = Number(clamp(clamped - base[key], -6, 6).toFixed(2));
    profile.dna[key] = clamped;
    return profile;
  }

  function learnFromRating(profile, title, rating) {
    if (!VALID_RATINGS.has(rating)) return profile;
    if (title.isLiveTmdb) persistLiveTitle(title, profile);

    const prev = profile.ratings[title.id];
    profile.ratings[title.id] = rating;
    profile.watchlist = profile.watchlist.filter((id) => id !== title.id);
    if (profile.softSkips && profile.softSkips[title.id]) {
      delete profile.softSkips[title.id];
    }

    if (prev !== rating) {
      recomputeDna(profile);
    }
    saveProfile(profile);
    return profile;
  }

  function unrateTitle(profile, id) {
    if (!profile.ratings[id]) return profile;
    delete profile.ratings[id];
    recomputeDna(profile);
    saveProfile(profile);
    return profile;
  }

  function recordSoftSkip(profile, titleId) {
    if (!titleId) return;
    if (!profile.softSkips || typeof profile.softSkips !== 'object') {
      profile.softSkips = {};
    }
    const now = Date.now();
    // Prune expired skips
    for (const [id, ts] of Object.entries(profile.softSkips)) {
      if (now - ts >= SOFT_SKIP_TTL_MS) delete profile.softSkips[id];
    }
    profile.softSkips[titleId] = now;
    saveProfile(profile);
  }

  function getCalibrationScore(profile) {
    const entries = Object.entries(profile.ratings || {});
    const count = entries.length;
    if (count === 0) return { pct: 20, label: 'Starter', count, customCount: 0 };

    let customCount = 0;
    let hasNegative = false;
    for (const [id, r] of entries) {
      if (DEFAULT_RATINGS[id] !== r) customCount++;
      if (r === 'meh' || r === 'never') hasNegative = true;
    }

    // Starts at 76% (Pre-Tuned) with the 14 seeded anchors; climbs smoothly to 100% as you add ~8 personal ratings
    let pct;
    if (count < 14 && customCount === 0) {
      pct = Math.min(75, Math.round(22 + count * 3.8));
    } else {
      const base = Math.min(76, Math.round(22 + Math.min(count, 14) * 3.86));
      const growth = Math.min(24, customCount * 3 + (hasNegative ? 3 : 0));
      pct = Math.min(100, base + growth);
    }

    let label = 'Warming Up';
    if (pct >= 94) label = 'Dialed In';
    else if (pct >= 84) label = 'Sharp';
    else if (pct >= 70) label = 'Pre-Tuned';
    else if (count >= 6) label = 'Tuned';

    return { pct, label, count, customCount };
  }

  const MAX_DNA_DIST = Math.sqrt(DNA_KEYS.length * 81);
  const creatorTokenCache = new Map();

  function dnaSimilarity(a, b) {
    const d0 = (a.pace ?? 5) - (b.pace ?? 5);
    const d1 = (a.intensity ?? 5) - (b.intensity ?? 5);
    const d2 = (a.complexity ?? 5) - (b.complexity ?? 5);
    const d3 = (a.warmth ?? 5) - (b.warmth ?? 5);
    const d4 = (a.humor ?? 5) - (b.humor ?? 5);
    const d5 = (a.spectacle ?? 5) - (b.spectacle ?? 5);
    return 1 - Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3 + d4 * d4 + d5 * d5) / MAX_DNA_DIST;
  }

  function extractCreatorTokens(creator) {
    if (!creator) return [];
    let cached = creatorTokenCache.get(creator);
    if (cached) return cached;
    const low = creator.toLowerCase();
    if (low.includes('live tmdb') || low.includes('taste dna')) {
      cached = [];
    } else {
      cached = low
        .split(/\s*(?:&|,|\/|\band\b)\s*/i)
        .map((s) => s.trim())
        .filter((s) => s.length >= 3);
    }
    creatorTokenCache.set(creator, cached);
    return cached;
  }

  function hasSharedCreatorTokens(t1, t2) {
    if (t1.length === 0 || t2.length === 0) return false;
    for (let i = 0; i < t1.length; i++) {
      const a = t1[i];
      for (let j = 0; j < t2.length; j++) {
        const b = t2[j];
        if (a === b || (a.length >= 6 && b.includes(a)) || (b.length >= 6 && a.includes(b))) {
          return true;
        }
      }
    }
    return false;
  }

  function computeEffectiveRating(title) {
    const raw = parseFloat(title.rating);
    const r = Number.isFinite(raw) ? raw : 7.5;
    if (title.isLiveTmdb) {
      // Bayesian weighted rating shrinks noisy low-vote scores toward 7.4, plus +0.35 IMDb-scale calibration
      const v = Number(title.voteCount) || 100;
      const m = title.origin === 'indian' ? 120 : 300;
      const C = 7.4;
      const wr = (v / (v + m)) * r + (m / (v + m)) * C;
      return clamp(wr + 0.35, 5.0, 9.6);
    }
    return r;
  }

  function prepareScoringContext(profile) {
    const nowMs = Date.now();
    const ratedEntries = [];
    for (const [ratedId, rating] of Object.entries(profile.ratings || {})) {
      const other = getTitleById(ratedId);
      if (!other || !other.dna) continue;
      ratedEntries.push({
        id: ratedId,
        rating,
        other,
        dna: other.dna,
        genres: other.genres || [],
        moods: other.moods || [],
        creatorTokens: extractCreatorTokens(other.creator)
      });
    }
    const historyAges = new Map();
    if (Array.isArray(profile.history)) {
      for (const h of profile.history) {
        if (!h || !h.id || historyAges.has(h.id)) continue;
        const ts = Date.parse(h.pickedAt);
        if (Number.isFinite(ts)) {
          historyAges.set(h.id, Math.max(0, (nowMs - ts) / (24 * 60 * 60 * 1000)));
        }
      }
    }
    return { nowMs, ratedEntries, historyAges };
  }

  function scoreTitle(title, profile, context = {}, precomputed = null) {
    const prep = precomputed || prepareScoringContext(profile);
    const baseDnaSim = dnaSimilarity(title.dna, profile.dna);

    const posAffinities = [];
    const negAffinities = [];
    let bestLovedNeighbor = null;
    let bestNeighborRank = 0;

    const titleGenres = title.genres || [];
    const titleMoods = title.moods || [];
    const titleCreatorTokens = extractCreatorTokens(title.creator);
    const tGenreLen = titleGenres.length;
    const tMoodLen = titleMoods.length;

    const ratedEntries = prep.ratedEntries;
    for (let rIdx = 0; rIdx < ratedEntries.length; rIdx++) {
      const entry = ratedEntries[rIdx];
      if (entry.id === title.id) continue;
      const other = entry.other;
      const rating = entry.rating;

      const dSim = dnaSimilarity(title.dna, entry.dna);
      const otherGenres = entry.genres;
      const otherMoods = entry.moods;

      let sharedGenres = 0;
      for (let i = 0; i < otherGenres.length; i++) {
        if (titleGenres.includes(otherGenres[i])) sharedGenres++;
      }
      const unionGenres = Math.max(1, tGenreLen + otherGenres.length - sharedGenres);
      const genreJaccard = sharedGenres / unionGenres;

      let sharedMoods = 0;
      for (let i = 0; i < otherMoods.length; i++) {
        if (titleMoods.includes(otherMoods[i])) sharedMoods++;
      }
      const moodOverlap = sharedMoods / Math.max(1, Math.min(tMoodLen, otherMoods.length));

      const creatorMatch = hasSharedCreatorTokens(titleCreatorTokens, entry.creatorTokens);
      const originBonus = title.origin === other.origin && title.origin === 'indian' ? 0.05 : 0;
      const animeBonus = title.type === 'anime' && other.type === 'anime' ? 0.05 : 0;

      const pairSim =
        dSim * 0.62 +
        genreJaccard * 0.22 +
        moodOverlap * 0.08 +
        originBonus +
        animeBonus +
        (creatorMatch ? 0.16 : 0);

      if (rating === 'loved') {
        posAffinities.push(pairSim);
        // Explanation neighbor prefers strong thematic/genre/format fit (avoids odd cross-genre matches like GoT -> Inception)
        const explainRank =
          pairSim +
          (creatorMatch ? 0.25 : 0) +
          (title.type === other.type ? 0.045 : 0) +
          (titleMoods[0] && titleMoods[0] === otherMoods[0] ? 0.05 : 0);
        if ((creatorMatch || (sharedGenres > 0 && sharedMoods > 0)) && explainRank > bestNeighborRank) {
          bestNeighborRank = explainRank;
          bestLovedNeighbor = { title: other, creatorMatch, pairSim };
        }
      } else if (rating === 'liked') {
        posAffinities.push(pairSim * 0.90);
      } else if (rating === 'meh') {
        negAffinities.push(pairSim * 0.86);
      } else if (rating === 'never') {
        negAffinities.push(pairSim);
      }
    }

    // Top-K neighbor aggregation (eliminates the 80% saturation cap)
    let lovedBoost = 0;
    if (posAffinities.length > 0) {
      posAffinities.sort((a, b) => b - a);
      const w0 = 0.55, w1 = 0.30, w2 = 0.15;
      let valSum = posAffinities[0] * w0;
      let wSum = w0;
      if (posAffinities.length > 1) { valSum += posAffinities[1] * w1; wSum += w1; }
      if (posAffinities.length > 2) { valSum += posAffinities[2] * w2; wSum += w2; }
      const topK = valSum / wSum;
      let closeCount = 0;
      for (let i = 0; i < posAffinities.length; i++) if (posAffinities[i] >= 0.68) closeCount++;
      const breadth = Math.min(0.04, closeCount * 0.006);
      lovedBoost = clamp((topK - 0.56) * 0.72 + breadth, 0, 0.28);
    }

    let dislikePenalty = 0;
    if (negAffinities.length > 0) {
      negAffinities.sort((a, b) => b - a);
      const topNeg = negAffinities.length > 1
        ? negAffinities[0] * 0.65 + negAffinities[1] * 0.35
        : negAffinities[0];
      dislikePenalty = clamp((topNeg - 0.54) * 0.92, 0, 0.38);
    }

    // Mood match bonus
    const hasMoodFilter = !!(context.mood && context.mood !== 'any');
    let moodBonus = 0;
    if (hasMoodFilter) {
      if (titleMoods[0] === context.mood) moodBonus = 0.18;
      else if (titleMoods.includes(context.mood)) moodBonus = 0.11;
      else moodBonus = -0.28;
    }

    // Bidirectional pace guard (actually active on both fast-burn and slow-burn users)
    let paceGuard = 0;
    if (profile.dna.pace >= 7.5) {
      if (title.dna.pace <= 5) paceGuard = -0.18;
      else if (title.dna.pace <= 6) paceGuard = -0.09;
      else if (profile.dna.pace >= 8.5 && title.dna.pace <= 7) paceGuard = -0.03;
    } else if (profile.dna.pace <= 4.0 && title.dna.pace >= 9) {
      paceGuard = -0.12;
    }

    // Quality consensus prior (calibrated across IMDb & TMDB)
    const effRating = computeEffectiveRating(title);
    const qualityBonus = clamp((effRating - 7.8) * 0.035, -0.08, 0.07);

    // Recency cooldown (keeps rankings fresh across sessions without altering honest match %)
    let recencyPenalty = 0;
    const histAgeDays = prep.historyAges.get(title.id);
    if (histAgeDays !== undefined && histAgeDays < HISTORY_COOLDOWN_DAYS) {
      recencyPenalty -= 0.26 * (1 - histAgeDays / HISTORY_COOLDOWN_DAYS);
    }
    const skipTs = profile.softSkips && profile.softSkips[title.id];
    if (skipTs) {
      const skipAgeMs = prep.nowMs - skipTs;
      if (skipAgeMs >= 0 && skipAgeMs < SOFT_SKIP_TTL_MS) {
        recencyPenalty -= 0.14 * (1 - skipAgeMs / SOFT_SKIP_TTL_MS);
      }
    }

    const fitScore = baseDnaSim * 0.68 + lovedBoost - dislikePenalty + moodBonus + paceGuard + qualityBonus;
    const rawScore = fitScore + recencyPenalty;

    // Mood-normalized honest match percentage [45..98]
    const normFit = hasMoodFilter ? fitScore - 0.12 : fitScore;
    const matchPct = Math.round(clamp(40 + normFit * 62, 45, 98));

    // Generate personal explanation
    const reasons = [];
    if (bestLovedNeighbor && (bestLovedNeighbor.creatorMatch || bestLovedNeighbor.pairSim >= 0.68)) {
      if (bestLovedNeighbor.creatorMatch) {
        reasons.push(`Same creative DNA as ${bestLovedNeighbor.title.title} (${title.creator})`);
      } else {
        reasons.push(`Shares the vibe of ${bestLovedNeighbor.title.title}, which you loved`);
      }
    } else {
      const traits = [];
      if (title.dna.complexity >= 8) traits.push('razor-sharp plot twists & real payoff');
      if (title.dna.pace >= 9) traits.push('zero-filler momentum');
      if (title.dna.intensity >= 9) traits.push('gripping high-stakes tension');
      if (title.dna.spectacle >= 9) traits.push('epic scale');
      if (title.dna.warmth >= 8) traits.push('deep emotional impact');
      if (title.dna.humor >= 8) traits.push('sharp wit & fun');
      reasons.push(
        traits.length >= 2
          ? `Built for your taste in ${traits[0]} and ${traits[1]}`
          : traits.length === 1
          ? `Hits your sweet spot for ${traits[0]}`
          : `Strong fit for your calibrated Taste DNA`
      );
    }

    const firstTag = title.whyTags && title.whyTags[0];
    const secondTag = title.whyTags && title.whyTags[1];
    const neighborTitleLower = bestLovedNeighbor ? bestLovedNeighbor.title.title.toLowerCase() : '';
    const tagToAdd =
      firstTag && (!neighborTitleLower || !firstTag.toLowerCase().includes(neighborTitleLower))
        ? firstTag
        : secondTag;
    if (tagToAdd) {
      reasons.push(tagToAdd.toLowerCase());
    }

    const explanation = reasons.join(' — ') + '.';
    return { title, rawScore, fitScore, matchPct, explanation };
  }

  function matchesTimeBudget(t, budget) {
    if (!budget || budget === 'any') return true;
    if (budget === 'quick') return t.runtime <= 55;
    if (budget === 'short') return t.type === 'movie' ? t.runtime <= 125 : t.runtime <= 55;
    return true;
  }

  // MMR-style diversity reranker for top picks so "Any" sessions don't serve duplicates of one format/vibe
  function diversifyTopPicks(scoredList, context, topN = 6) {
    if (!Array.isArray(scoredList) || scoredList.length <= 2) return scoredList;
    const varyFormat = !context.format || context.format === 'any';
    const varyOrigin = !context.origin || context.origin === 'any';
    const varyMood = !context.mood || context.mood === 'any';
    if (!varyFormat && !varyOrigin && !varyMood) return scoredList;

    const remaining = [...scoredList];
    const result = [remaining.shift()];
    const limit = Math.min(topN, scoredList.length);

    while (result.length < limit && remaining.length > 0) {
      const prev = result[result.length - 1].title;
      const seenTypes = new Set(result.map((r) => r.title.type));
      const seenOrigins = new Set(result.map((r) => r.title.origin));

      let bestIdx = 0;
      let bestVal = -Infinity;
      const windowSize = Math.min(remaining.length, 14);

      for (let i = 0; i < windowSize; i++) {
        const cand = remaining[i];
        let pen = 0;
        if (varyFormat && cand.title.type === prev.type) pen += 0.038;
        else if (varyFormat && seenTypes.has(cand.title.type)) pen += 0.014;

        if (varyOrigin && cand.title.origin === prev.origin) pen += 0.024;
        else if (varyOrigin && seenOrigins.has(cand.title.origin)) pen += 0.008;

        if (varyMood && cand.title.moods[0] && cand.title.moods[0] === prev.moods[0]) pen += 0.022;

        const val = cand.rawScore - pen;
        if (val > bestVal) {
          bestVal = val;
          bestIdx = i;
        }
      }
      result.push(remaining.splice(bestIdx, 1)[0]);
    }

    return [...result, ...remaining];
  }

  function getRankedPicks(profile, context = {}, excludeIds = [], watchlistOnly = false) {
    const excludeSet = new Set(excludeIds);
    const seenOrVetoed = new Set(Object.keys(profile.ratings || {}));
    const prep = prepareScoringContext(profile);

    if (watchlistOnly) {
      const wlPool = (profile.watchlist || [])
        .filter((id) => !excludeSet.has(id))
        .map((id) => getTitleById(id))
        .filter(Boolean);
      const scored = wlPool
        .map((t) => scoreTitle(t, profile, context, prep))
        .sort((a, b) => b.rawScore - a.rawScore);
      return { scored, relaxedNote: null };
    }

    function filterPool(relaxOrigin, relaxMood, relaxFormat, relaxTime) {
      const explicitNonEnOrigin = context.origin === 'indian' || context.origin === 'intl' || context.format === 'anime';
      return window.CUED_CATALOG.filter((t) => {
        if (excludeSet.has(t.id)) return false;
        if (seenOrVetoed.has(t.id)) return false;
        if (!relaxFormat && context.format && context.format !== 'any' && t.type !== context.format) return false;
        if (!relaxTime && !matchesTimeBudget(t, context.timeBudget)) return false;
        if (!profile.allowSubtitles && !explicitNonEnOrigin && t.language !== 'EN') return false;
        if (profile.minYear && t.year < profile.minYear) return false;
        if (!relaxOrigin && context.origin && context.origin !== 'any') {
          if (t.origin !== context.origin) return false;
        }
        if (!relaxMood && context.mood && context.mood !== 'any' && !t.moods.includes(context.mood)) {
          return false;
        }
        return true;
      });
    }

    let relaxedNote = null;
    let pool = filterPool(false, false, false, false);

    if (pool.length === 0 && context.timeBudget && context.timeBudget !== 'any') {
      pool = filterPool(false, false, false, true);
      if (pool.length > 0) relaxedNote = 'Relaxed time filter to keep your vibe & region.';
    }
    if (pool.length === 0 && context.mood && context.mood !== 'any') {
      pool = filterPool(false, true, false, true);
      if (pool.length > 0) relaxedNote = 'Relaxed mood filter to keep your region & format.';
    }
    if (pool.length === 0 && context.format && context.format !== 'any') {
      pool = filterPool(false, true, true, true);
      if (pool.length > 0) relaxedNote = 'Expanded format to keep your selected region.';
    }
    if (pool.length === 0 && context.origin && context.origin !== 'any') {
      pool = filterPool(true, false, false, true);
      if (pool.length > 0) relaxedNote = 'No unseen titles left in that region — widened region.';
    }
    if (pool.length === 0) {
      pool = filterPool(true, true, true, true);
      relaxedNote = 'Showing your highest-scoring unseen matches overall.';
    }

    const sorted = pool
      .map((t) => scoreTitle(t, profile, context, prep))
      .sort((a, b) => b.rawScore - a.rawScore);

    const scored = diversifyTopPicks(sorted, context, 6);
    return { scored, relaxedNote };
  }

  function getCalibrationDeck(profile) {
    const rated = new Set(Object.keys(profile.ratings || {}));
    const anchors = window.CUED_CATALOG.filter((t) => t.anchor && !rated.has(t.id));
    const others = window.CUED_CATALOG.filter((t) => !t.anchor && !rated.has(t.id));
    return [...anchors, ...others];
  }

  function getFinishTimeText(title) {
    const now = new Date();
    const finish = new Date(now.getTime() + (title.runtime || 110) * 60000);
    const formatted = finish.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (title.type === 'movie') return `Start now · finishes ~${formatted}`;
    return `1 ep now · finishes ~${formatted}`;
  }

  function renderEditorialPosterSVG(title) {
    const { bg, accent, ink, motif } = title.poster || { bg: '#1A1513', accent: '#E05A3A', ink: '#F5F0E8', motif: 'maze' };
    const idSafe = String(title.id || 'x').replace(/[^a-z0-9]/gi, '');
    const motifs = {
      ring: `<circle cx="290" cy="115" r="88" fill="none" stroke="${accent}" stroke-width="2.2" opacity="0.72"/><circle cx="290" cy="115" r="62" fill="none" stroke="${ink}" stroke-width="0.9" opacity="0.22"/><circle cx="290" cy="115" r="34" fill="${accent}" opacity="0.18"/>`,
      stairs: `<path d="M185 220 L185 180 L230 180 L230 140 L275 140 L275 100 L320 100 L320 60 L380 60 L380 220 Z" fill="${accent}" opacity="0.18"/><path d="M185 220 L185 180 L230 180 L230 140 L275 140 L275 100 L320 100 L320 60 L380 60" fill="none" stroke="${accent}" stroke-width="2" opacity="0.75"/>`,
      grid: `<rect x="210" y="34" width="136" height="136" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.65"/><line x1="255" y1="34" x2="255" y2="170" stroke="${accent}" opacity="0.35"/><line x1="301" y1="34" x2="301" y2="170" stroke="${accent}" opacity="0.35"/><line x1="210" y1="79" x2="346" y2="79" stroke="${accent}" opacity="0.35"/><line x1="210" y1="125" x2="346" y2="125" stroke="${accent}" opacity="0.35"/><rect x="255" y="79" width="46" height="46" fill="${accent}" opacity="0.28"/>`,
      horizon: `<circle cx="290" cy="126" r="56" fill="${accent}" opacity="0.25"/><circle cx="290" cy="126" r="34" fill="${accent}" opacity="0.55"/><rect x="0" y="138" width="400" height="82" fill="${bg}" opacity="0.82"/><line x1="24" y1="138" x2="376" y2="138" stroke="${accent}" stroke-width="1.6" opacity="0.8"/>`,
      arch: `<path d="M225 220 L225 104 A64 64 0 0 1 353 104 L353 220" fill="${accent}" opacity="0.16" stroke="${accent}" stroke-width="2"/><path d="M250 220 L250 110 A39 39 0 0 1 328 110 L328 220" fill="none" stroke="${ink}" opacity="0.25"/>`,
      prism: `<polygon points="288,36 364,174 212,174" fill="${accent}" opacity="0.16" stroke="${accent}" stroke-width="2"/><polygon points="288,68 338,160 238,160" fill="none" stroke="${ink}" opacity="0.3"/>`,
      bars: `<rect x="224" y="34" width="16" height="156" fill="${accent}" opacity="0.22"/><rect x="254" y="54" width="16" height="136" fill="${accent}" opacity="0.44"/><rect x="284" y="28" width="16" height="162" fill="${accent}" opacity="0.72"/><rect x="314" y="72" width="16" height="118" fill="${accent}" opacity="0.32"/>`,
      waves: `<path d="M160 95 Q215 62 270 95 T380 95" fill="none" stroke="${accent}" stroke-width="2" opacity="0.72"/><path d="M160 122 Q215 89 270 122 T380 122" fill="none" stroke="${accent}" stroke-width="1.4" opacity="0.45"/>`,
      blades: `<polygon points="240,220 315,24 345,24 270,220" fill="${accent}" opacity="0.24"/><polygon points="286,220 360,24 374,24 300,220" fill="${accent}" opacity="0.58"/>`,
      sun: `<circle cx="300" cy="96" r="54" fill="${accent}" opacity="0.78"/><circle cx="300" cy="96" r="78" fill="none" stroke="${accent}" stroke-width="1.2" stroke-dasharray="4 6" opacity="0.5"/>`,
      split: `<rect x="275" y="0" width="125" height="220" fill="${accent}" opacity="0.18"/><line x1="275" y1="0" x2="275" y2="220" stroke="${accent}" stroke-width="2" opacity="0.85"/><circle cx="275" cy="110" r="28" fill="${bg}" stroke="${accent}" stroke-width="2"/>`,
      burst: `<polygon points="294,30 312,92 374,92 324,128 342,188 294,150 246,188 264,128 214,92 276,92" fill="${accent}" opacity="0.22" stroke="${accent}" stroke-width="1.5"/>`,
      beam: `<polygon points="330,0 370,0 230,220 140,220" fill="${accent}" opacity="0.22"/><line x1="350" y1="0" x2="185" y2="220" stroke="${accent}" stroke-width="2" opacity="0.78"/>`,
      frames: `<rect x="218" y="34" width="112" height="140" fill="none" stroke="${ink}" opacity="0.28"/><rect x="242" y="54" width="112" height="140" fill="${accent}" opacity="0.16" stroke="${accent}" stroke-width="1.8"/>`,
      maze: `<rect x="216" y="34" width="136" height="136" fill="none" stroke="${accent}" stroke-width="1.8" opacity="0.7"/><rect x="242" y="60" width="84" height="84" fill="none" stroke="${accent}" stroke-width="1.4" opacity="0.45"/><rect x="268" y="86" width="32" height="32" fill="${accent}" opacity="0.5"/>`
    };
    return `
      <svg class="poster-svg" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="grad-${idSafe}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${bg}" stop-opacity="0.15"/>
            <stop offset="55%" stop-color="${bg}" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#141311" stop-opacity="0.98"/>
          </linearGradient>
        </defs>
        <rect width="400" height="220" fill="${bg}"/>
        ${motifs[motif] || motifs.maze}
        <rect width="400" height="220" fill="url(#grad-${idSafe})"/>
      </svg>`;
  }

  function getPosterCache() {
    if (!posterCacheMem) {
      try {
        posterCacheMem = JSON.parse(localStorage.getItem(POSTER_CACHE_KEY) || '{}') || {};
      } catch {
        posterCacheMem = {};
      }
    }
    return posterCacheMem;
  }

  function setPosterCacheEntry(id, url) {
    const cache = getPosterCache();
    cache[id] = url;
    const keys = Object.keys(cache);
    if (keys.length > MAX_POSTER_CACHE_ENTRIES) {
      for (const k of keys.slice(0, keys.length - MAX_POSTER_CACHE_ENTRIES)) {
        delete cache[k];
      }
    }
    try {
      localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // ignore quota
    }
  }

  async function tmdbFetch(url, apiKey) {
    const key = (apiKey || '').trim();
    if (!key) return null;
    const isBearer = key.includes('.') || key.length > 40;
    const res = isBearer
      ? await fetch(url, { headers: { Authorization: `Bearer ${key}`, accept: 'application/json' } })
      : await fetch(`${url}${url.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(key)}`);

    if (res && (res.status === 401 || res.status === 403)) {
      lastTmdbError = { code: res.status, message: 'TMDB key rejected (401) — check Settings.' };
    } else if (res && res.ok) {
      lastTmdbError = null;
    }
    return res;
  }

  function getLastTmdbError() {
    return lastTmdbError;
  }

  async function testTmdbKey(apiKey) {
    const key = (apiKey || '').trim();
    if (!key) return { ok: false, message: 'Paste a TMDB API key or Read Access Token first.' };
    try {
      const res = await tmdbFetch('https://api.themoviedb.org/3/configuration', key);
      if (!res) return { ok: false, message: 'Could not reach TMDB.' };
      if (res.ok) return { ok: true, message: 'Connected to TMDB — live posters & search ready!' };
      if (res.status === 401 || res.status === 403) {
        return { ok: false, message: 'Invalid TMDB key (HTTP 401). Double-check your key.' };
      }
      return { ok: false, message: `TMDB returned HTTP ${res.status}.` };
    } catch {
      return { ok: false, message: 'Network error reaching TMDB (are you offline?).' };
    }
  }

  async function fetchTmdbPoster(title, apiKey) {
    if (!apiKey || !apiKey.trim()) return null;
    try {
      const cache = getPosterCache();
      if (cache[title.id]) return cache[title.id];
      const endpoint = title.type === 'movie' ? 'movie' : 'tv';
      const yearParam = title.type === 'movie' ? `year=${title.year}` : `first_air_date_year=${title.year}`;
      let res = await tmdbFetch(
        `https://api.themoviedb.org/3/search/${endpoint}?query=${encodeURIComponent(title.title)}&${yearParam}`,
        apiKey
      );
      if (!res || !res.ok) return null;
      let data = await res.json();
      let hit = data.results && data.results[0];
      if (!hit) {
        res = await tmdbFetch(
          `https://api.themoviedb.org/3/search/${endpoint}?query=${encodeURIComponent(title.title)}`,
          apiKey
        );
        if (res && res.ok) {
          data = await res.json();
          hit = data.results && data.results[0];
        }
      }
      const path = hit && (hit.backdrop_path || hit.poster_path);
      if (!path) return null;
      const imgUrl = `https://image.tmdb.org/t/p/w780${path}`;
      setPosterCacheEntry(title.id, imgUrl);
      return imgUrl;
    } catch {
      return null;
    }
  }

  const TMDB_GENRES = {
    28:    { name: 'Action',      moods: ['hype', 'fun'],           dna: { pace: 9, intensity: 8, complexity: 5, warmth: 4, humor: 5, spectacle: 9 } },
    12:    { name: 'Adventure',   moods: ['fun', 'hype'],           dna: { pace: 8, intensity: 6, complexity: 5, warmth: 6, humor: 6, spectacle: 9 } },
    16:    { name: 'Animation',   moods: ['hype', 'fun'],           dna: { pace: 8, intensity: 7, complexity: 6, warmth: 7, humor: 6, spectacle: 9 } },
    35:    { name: 'Comedy',      moods: ['fun'],                   dna: { pace: 8, intensity: 4, complexity: 5, warmth: 7, humor: 9, spectacle: 4 } },
    80:    { name: 'Crime',       moods: ['crime', 'mindbend'],     dna: { pace: 8, intensity: 9, complexity: 8, warmth: 4, humor: 4, spectacle: 6 } },
    99:    { name: 'Documentary', moods: ['deep'],                  dna: { pace: 5, intensity: 6, complexity: 7, warmth: 7, humor: 3, spectacle: 4 } },
    18:    { name: 'Drama',       moods: ['deep'],                  dna: { pace: 6, intensity: 7, complexity: 7, warmth: 8, humor: 3, spectacle: 5 } },
    10751: { name: 'Family',      moods: ['fun', 'deep'],           dna: { pace: 7, intensity: 3, complexity: 4, warmth: 9, humor: 7, spectacle: 6 } },
    14:    { name: 'Fantasy',     moods: ['hype', 'fun'],           dna: { pace: 8, intensity: 7, complexity: 7, warmth: 6, humor: 5, spectacle: 10 } },
    36:    { name: 'History',     moods: ['deep'],                  dna: { pace: 6, intensity: 7, complexity: 7, warmth: 8, humor: 2, spectacle: 8 } },
    27:    { name: 'Horror',      moods: ['horror', 'mindbend'],    dna: { pace: 8, intensity: 10, complexity: 7, warmth: 2, humor: 2, spectacle: 6 } },
    10402: { name: 'Music',       moods: ['deep', 'fun'],           dna: { pace: 7, intensity: 5, complexity: 5, warmth: 8, humor: 5, spectacle: 6 } },
    9648:  { name: 'Mystery',     moods: ['mindbend', 'crime'],     dna: { pace: 8, intensity: 8, complexity: 10, warmth: 4, humor: 3, spectacle: 5 } },
    10749: { name: 'Romance',     moods: ['deep', 'fun'],           dna: { pace: 6, intensity: 5, complexity: 4, warmth: 9, humor: 6, spectacle: 4 } },
    878:   { name: 'Sci-Fi',      moods: ['mindbend', 'hype'],      dna: { pace: 8, intensity: 8, complexity: 9, warmth: 5, humor: 4, spectacle: 9 } },
    53:    { name: 'Thriller',    moods: ['crime', 'mindbend'],     dna: { pace: 9, intensity: 9, complexity: 9, warmth: 3, humor: 2, spectacle: 6 } },
    10752: { name: 'War',         moods: ['deep', 'hype'],          dna: { pace: 7, intensity: 9, complexity: 6, warmth: 7, humor: 2, spectacle: 9 } },
    37:    { name: 'Western',     moods: ['crime', 'hype'],         dna: { pace: 7, intensity: 8, complexity: 6, warmth: 4, humor: 3, spectacle: 8 } },
    10759: { name: 'Action',      moods: ['hype', 'crime'],         dna: { pace: 9, intensity: 8, complexity: 6, warmth: 5, humor: 5, spectacle: 9 } },
    10765: { name: 'Sci-Fi',      moods: ['mindbend', 'hype'],      dna: { pace: 8, intensity: 8, complexity: 8, warmth: 5, humor: 4, spectacle: 9 } },
    10768: { name: 'War',         moods: ['deep', 'crime'],         dna: { pace: 7, intensity: 8, complexity: 8, warmth: 5, humor: 3, spectacle: 8 } }
  };

  function normalizeTitleKey(title, year) {
    const clean = String(title || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    return `${clean}-${year || ''}`;
  }

  function inferTmdbMetadata(item, context, isSeries, isAnime, isHorrorQuery = false) {
    const genreIds = Array.isArray(item.genre_ids) ? item.genre_ids : [];
    const matched = genreIds.map((id) => TMDB_GENRES[id]).filter(Boolean);

    const genres = [];
    const moods = [];
    for (const g of matched) {
      if (!genres.includes(g.name)) genres.push(g.name);
      for (const m of g.moods) {
        if (!moods.includes(m)) moods.push(m);
      }
    }

    const dna = { pace: 7, intensity: 7, complexity: 6.5, warmth: 5.5, humor: 4.5, spectacle: 6.5 };
    if (matched.length > 0) {
      for (const k of DNA_KEYS) {
        const avg = matched.reduce((acc, g) => acc + g.dna[k], 0) / matched.length;
        dna[k] = Number(clamp(avg, 1, 10).toFixed(1));
      }
    }

    const text = `${item.title || item.name || ''} ${item.overview || ''}`.toLowerCase();
    const hasHorrorCue = /\b(haunt|ghost|demon|curse|cursed|zombie|vampire|paranormal|supernatural|exorcis|possess|horror|nightmare|creepy|occult|undead|terror|monster|evil spirit)\b/.test(text);

    if (hasHorrorCue || (isSeries && isHorrorQuery)) {
      if (!moods.includes('horror')) moods.unshift('horror');
      if (!genres.includes('Horror') && hasHorrorCue) genres.unshift('Horror');
      dna.intensity = Number(clamp(dna.intensity + 1.2, 1, 10).toFixed(1));
    }
    if (/\b(twist|conspiracy|secret|mystery|detective|investigat|puzzle|mind|hidden|suspect|clue)\b/.test(text)) {
      dna.complexity = Number(clamp(dna.complexity + 1.1, 1, 10).toFixed(1));
    }
    if (/\b(killer|murder|cartel|gang|mafia|revenge|brutal|deadly|hostage|terror|survive|hunt)\b/.test(text)) {
      dna.intensity = Number(clamp(dna.intensity + 1.0, 1, 10).toFixed(1));
      dna.pace = Number(clamp(dna.pace + 0.7, 1, 10).toFixed(1));
    }
    if (/\b(heist|chase|race against|mission|spy|agent|battle|war|epic|empire|kingdom)\b/.test(text)) {
      dna.pace = Number(clamp(dna.pace + 0.8, 1, 10).toFixed(1));
      dna.spectacle = Number(clamp(dna.spectacle + 1.0, 1, 10).toFixed(1));
    }
    if (/\b(funny|hilarious|comic|satire|misadventure|witty|laugh)\b/.test(text)) {
      dna.humor = Number(clamp(dna.humor + 1.4, 1, 10).toFixed(1));
    }
    if (/\b(family|love|friendship|heart|dream|hope|bond|true story|inspires)\b/.test(text)) {
      dna.warmth = Number(clamp(dna.warmth + 1.0, 1, 10).toFixed(1));
    }

    if (genres.length === 0) genres.push(context.mood && context.mood !== 'any' ? context.mood : 'Drama');
    if (moods.length === 0) moods.push(context.mood && context.mood !== 'any' ? context.mood : 'crime');

    // Infer origin accurately
    const lang = (item.original_language || 'en').toLowerCase();
    const countries = Array.isArray(item.origin_country) ? item.origin_country : [];
    const indianLangs = new Set(['hi', 'ta', 'te', 'ml', 'kn', 'mr', 'bn', 'pa', 'gu']);
    let origin = 'western';
    if (isAnime || (genreIds.includes(16) && (lang === 'ja' || countries.includes('JP')))) {
      origin = 'anime';
    } else if (context.origin && context.origin !== 'any') {
      origin = context.origin;
    } else if (countries.includes('IN') || indianLangs.has(lang)) {
      origin = 'indian';
    } else if (countries.some((c) => ['US', 'GB', 'CA', 'AU', 'IE', 'NZ'].includes(c)) || lang === 'en') {
      origin = 'western';
    } else {
      origin = 'intl';
    }

    return { genres: genres.slice(0, 3), moods: moods.slice(0, 3), dna, origin };
  }

  // Live Internet Catalog Discovery via TMDB API, cached, filtered & ranked by Taste DNA
  async function discoverLiveFromTmdb(profile, context = {}, excludeIds = [], options = {}) {
    const apiKey = (profile.tmdbApiKey || '').trim();
    if (!apiKey) return [];

    const forceFresh = !!options.forceFresh;
    const explicitNonEnOrigin = context.origin === 'indian' || context.origin === 'intl' || context.format === 'anime';
    const englishOnly = !profile.allowSubtitles && !explicitNonEnOrigin;

    const cacheKey = [
      context.format || 'any',
      context.origin || 'any',
      context.mood || 'any',
      context.timeBudget || 'any',
      profile.minYear || 0,
      englishOnly ? 'en' : 'all'
    ].join('|');

    const exSet = new Set([...excludeIds, ...Object.keys(profile.ratings || {})]);

    // Check short-TTL cache so repeat taps are instant
    const cachedEntry = !forceFresh ? discoverCache.get(cacheKey) : null;
    if (cachedEntry && Date.now() - cachedEntry.ts < DISCOVER_CACHE_TTL_MS) {
      const freshFiltered = cachedEntry.titles
        .filter((t) => !exSet.has(t.id))
        .map((t) => scoreTitle(t, profile, context))
        .sort((a, b) => b.rawScore - a.rawScore);
      if (freshFiltered.length >= 4) {
        return diversifyTopPicks(freshFiltered, context, 6).slice(0, 12);
      }
    }

    try {
      const isAnime = context.format === 'anime';
      const isQuickOnly = context.timeBudget === 'quick';
      const endpoints = isAnime || isQuickOnly
        ? ['tv']
        : context.format === 'movie'
        ? ['movie']
        : context.format === 'series'
        ? ['tv']
        : ['movie', 'tv'];

      const moodGenresMovie = {
        crime: '80|53|9648',
        mindbend: '9648|53|878',
        deep: '18|36|10752',
        hype: '28|12|14',
        horror: '27',            // True horror only (fixed from 27|53)
        fun: '35|12'             // Comedy / Adventure (cleaner fun signal)
      };
      const moodGenresTv = {
        crime: '80|9648',
        mindbend: '9648|10765',
        deep: '18',
        hype: '10759|10765',
        horror: '9648|10765',    // Paired with horror keywords below
        fun: '35|10759'
      };
      const TV_HORROR_KEYWORDS = '162846|6152|9826|10224|15001|12377';

      const localTitleKeys = new Set(
        window.CUED_CATALOG.map((c) => normalizeTitleKey(c.title, c.year))
      );
      const localTitleNamesOnly = new Set(
        window.CUED_CATALOG.map((c) => normalizeTitleKey(c.title, ''))
      );

      const palettes = [
        ['#1A1513', '#E05A3A', 'beam'],
        ['#14191F', '#D9A441', 'ring'],
        ['#161D18', '#6EA37B', 'prism'],
        ['#1C1418', '#D85448', 'blades']
      ];

      async function fetchEndpoint(endpoint) {
        const isSeries = endpoint === 'tv';
        const isHorrorTv = isSeries && context.mood === 'horror';
        const pageNum = forceFresh ? Math.floor(Math.random() * 3) + 1 : 1;
        const usePopularity = !isHorrorTv && (context.mood === 'fun' || context.mood === 'hype' || pageNum > 1);

        const params = new URLSearchParams({
          sort_by: usePopularity ? 'popularity.desc' : 'vote_average.desc',
          'vote_count.gte': context.origin === 'indian' ? '60' : isSeries ? '150' : '300',
          'vote_average.gte': context.mood === 'horror' ? '6.7' : '7.2',
          without_genres: '99,10770,10402',
          page: String(pageNum)
        });

        if (profile.minYear) {
          params.set(isSeries ? 'first_air_date.gte' : 'primary_release_date.gte', `${profile.minYear}-01-01`);
        }
        if (englishOnly) {
          params.set('with_original_language', 'en');
        }
        if (!isSeries && context.timeBudget === 'short') {
          params.set('with_runtime.lte', '125');
        }

        if (isAnime) {
          params.set('with_genres', '16');
          params.set('with_origin_country', 'JP');
        } else {
          const gMap = isSeries ? moodGenresTv : moodGenresMovie;
          if (context.mood && context.mood !== 'any' && gMap[context.mood]) {
            params.set('with_genres', gMap[context.mood]);
          } else if (profile.dna.pace >= 7.5 && profile.dna.intensity >= 7.5) {
            params.set('with_genres', isSeries ? '80|9648|10759|10765|18' : '53|80|9648|28|878|18');
          }
          if (isHorrorTv) {
            params.set('with_keywords', TV_HORROR_KEYWORDS);
            params.set('vote_count.gte', '60');
          }
          if (context.origin === 'indian') params.set('with_origin_country', 'IN');
          else if (context.origin === 'western') params.set('with_origin_country', 'US|GB');
          else if (context.origin === 'intl') params.set('with_origin_country', 'KR|JP|ES|FR|DE');
        }

        let res = await tmdbFetch(`https://api.themoviedb.org/3/discover/${endpoint}?${params.toString()}`, apiKey);
        if (!res || !res.ok) return [];
        let data = await res.json();
        let results = data.results || [];

        // Fallback for TV horror if keyword filter was too narrow for selected origin
        if (isHorrorTv && results.length < 3) {
          params.delete('with_keywords');
          res = await tmdbFetch(`https://api.themoviedb.org/3/discover/${endpoint}?${params.toString()}`, apiKey);
          if (res && res.ok) {
            data = await res.json();
            results = data.results || [];
          }
        }

        return results.map((item) => ({ item, endpoint, isSeries, isHorrorTv }));
      }

      const batches = await Promise.all(endpoints.map(fetchEndpoint));
      const combined = batches.flat();

      const builtTitles = [];
      const seenKeys = new Set();

      for (let idx = 0; idx < combined.length; idx++) {
        const { item, endpoint, isSeries, isHorrorTv } = combined[idx];
        const id = `tmdb-${endpoint}-${item.id}`;
        if (!item.overview) continue;

        const name = item.title || item.name || 'Untitled';
        const dateStr = item.release_date || item.first_air_date || '';
        const year = parseInt(dateStr.slice(0, 4), 10) || 2024;
        const normKey = normalizeTitleKey(name, year);
        const normNameOnly = normalizeTitleKey(name, '');
        if (seenKeys.has(normKey) || localTitleKeys.has(normKey) || localTitleNamesOnly.has(normNameOnly)) continue;
        seenKeys.add(normKey);

        const meta = inferTmdbMetadata(item, context, isSeries, isAnime, isHorrorTv);
        const vote = (item.vote_average || 7.6).toFixed(1);
        const votes = item.vote_count || 0;
        const audPct = Math.min(97, Math.max(60, Math.round((item.vote_average || 7.6) * 10.6)));
        const pal = palettes[idx % palettes.length];

        const existing = liveTitleRegistry.get(id);
        const titleObj = existing || {
          id,
          tmdbId: item.id,
          isLiveTmdb: true,
          detailsHydrated: false,
          title: name,
          year,
          type: isAnime ? 'anime' : (isSeries ? 'series' : 'movie'),
          origin: meta.origin,
          runtime: isSeries ? 48 : 118,
          runtimeLabel: isSeries ? 'Series · Live Web Pick' : 'Feature Film · Live Web',
          creator: 'Live TMDB · Taste DNA Ranked',
          genres: meta.genres,
          moods: meta.moods,
          rating: vote,
          audiencePct: audPct,
          voteCount: votes,
          language: (item.original_language || 'en').toUpperCase(),
          hook: item.overview.length > 155 ? item.overview.slice(0, 152).trim() + '…' : item.overview,
          overview: item.overview,
          publicSays: `Live public score: ${vote}/10 across ${votes.toLocaleString()} viewer votes on TMDB (${audPct}% positive audience consensus).`,
          whyTags: ['Ranked by your Taste DNA', `${votes.toLocaleString()} public votes`],
          posterUrl: item.backdrop_path
            ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
            : (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null),
          poster: { bg: pal[0], accent: pal[1], ink: '#F5F0E8', motif: pal[2] },
          dna: meta.dna
        };

        liveTitleRegistry.set(id, titleObj);
        builtTitles.push(titleObj);
      }

      if (builtTitles.length > 0) {
        discoverCache.set(cacheKey, { ts: Date.now(), titles: builtTitles });
      }

      const scoredPicks = builtTitles
        .filter((t) => !exSet.has(t.id))
        .map((t) => scoreTitle(t, profile, context))
        .sort((a, b) => b.rawScore - a.rawScore);

      return diversifyTopPicks(scoredPicks, context, 6).slice(0, 12);
    } catch {
      return [];
    }
  }

  // Single-call lazy hydration: populates real runtime, director/creator, and top viewer review
  async function fetchTmdbTitleDetails(title, apiKey, profile) {
    if (!apiKey || !title || !title.tmdbId) return null;
    try {
      const endpoint = title.type === 'movie' ? 'movie' : 'tv';
      const res = await tmdbFetch(
        `https://api.themoviedb.org/3/${endpoint}/${title.tmdbId}?append_to_response=credits,reviews`,
        apiKey
      );
      if (!res || !res.ok) return null;
      const d = await res.json();

      if (endpoint === 'movie') {
        if (Number.isFinite(d.runtime) && d.runtime > 0) {
          title.runtime = d.runtime;
          const hrs = Math.floor(d.runtime / 60);
          const mins = d.runtime % 60;
          title.runtimeLabel = hrs > 0 ? `${hrs}h ${String(mins).padStart(2, '0')}m` : `${mins}m`;
        }
        const director = d.credits && Array.isArray(d.credits.crew)
          ? d.credits.crew.find((c) => c.job === 'Director')
          : null;
        if (director && director.name) {
          title.creator = director.name;
        }
      } else {
        const epRun = Array.isArray(d.episode_run_time) && d.episode_run_time[0]
          ? d.episode_run_time[0]
          : (d.last_episode_to_air && d.last_episode_to_air.runtime) || null;
        if (Number.isFinite(epRun) && epRun > 0) {
          title.runtime = epRun;
        }
        const seasons = d.number_of_seasons;
        if (seasons) {
          title.runtimeLabel = `${seasons} ${seasons === 1 ? 'season' : 'seasons'} · ${title.runtime}m eps`;
        }
        if (Array.isArray(d.created_by) && d.created_by.length > 0) {
          title.creator = d.created_by.slice(0, 2).map((c) => c.name).join(' & ');
        }
      }

      let review = null;
      const revList = d.reviews && Array.isArray(d.reviews.results) ? d.reviews.results : [];
      const first = revList.find((r) => r.content && r.content.length > 40);
      if (first) {
        const clean = first.content.replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim();
        review = {
          author: first.author || 'Viewer',
          snippet: clean.length > 220 ? clean.slice(0, 217).trim() + '…' : clean
        };
      }

      title.detailsHydrated = true;
      liveTitleRegistry.set(title.id, title);
      if (profile) saveLiveTitleRegistry(profile);
      return { title, review };
    } catch {
      return null;
    }
  }

  async function fetchTmdbReviewSnippet(tmdbId, type, apiKey) {
    if (!apiKey || !tmdbId) return null;
    try {
      const endpoint = type === 'movie' ? 'movie' : 'tv';
      const res = await tmdbFetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/reviews`, apiKey);
      if (!res || !res.ok) return null;
      const data = await res.json();
      const first = data.results && data.results.find((r) => r.content && r.content.length > 40);
      if (!first) return null;
      const clean = first.content.replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim();
      return {
        author: first.author || 'Viewer',
        snippet: clean.length > 220 ? clean.slice(0, 217).trim() + '…' : clean
      };
    } catch {
      return null;
    }
  }

  window.CuedEngine = {
    DNA_KEYS,
    DNA_META,
    createDefaultProfile,
    sanitizeProfile,
    loadProfile,
    saveProfile,
    exportProfileJson,
    persistLiveTitle,
    learnFromRating,
    unrateTitle,
    setManualDnaAxis,
    recordSoftSkip,
    getCalibrationScore,
    getTitleById,
    scoreTitle,
    getRankedPicks,
    getCalibrationDeck,
    getFinishTimeText,
    renderEditorialPosterSVG,
    fetchTmdbPoster,
    discoverLiveFromTmdb,
    fetchTmdbTitleDetails,
    fetchTmdbReviewSnippet,
    testTmdbKey,
    getLastTmdbError
  };
})();
