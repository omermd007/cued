// Cued — Personalized Taste DNA Engine & Poster Renderer

(function () {
  const STORAGE_KEY = 'cued_profile_v2';
  const POSTER_CACHE_KEY = 'cued_tmdb_posters_v1';

  const DNA_KEYS = ['pace', 'intensity', 'complexity', 'warmth', 'humor', 'spectacle'];

  const DNA_META = [
    { key: 'pace',       low: 'Slow Burn',    high: 'Relentless Pace', label: 'Pacing' },
    { key: 'intensity',  low: 'Light & Easy', high: 'Dark & Intense',  label: 'Intensity' },
    { key: 'complexity', low: 'Straightforward', high: 'Twisty & Smart', label: 'Plot Twists' },
    { key: 'warmth',     low: 'Bleak / Gritty', high: 'Deep & Moving', label: 'Emotional Pull' },
    { key: 'humor',      low: 'Dead Serious', high: 'Witty & Fun',     label: 'Humor' },
    { key: 'spectacle',  low: 'Grounded',     high: 'Epic Scale',      label: 'Scale' }
  ];

  // Pre-calibrated from your Taste Grill!
  function createDefaultProfile() {
    return {
      profileName: 'Personal Taste · Calibrated',
      dna: {
        pace: 8.5,
        intensity: 8.5,
        complexity: 8.0,
        warmth: 5.5,
        humor: 5.0,
        spectacle: 8.0
      },
      ratings: {
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
      },
      watchlist: [],
      history: [],
      allAccess: true,      // Nuvio All-Access — every title unlocked
      allowSubtitles: true, // Subtitles & international titles welcome
      minYear: 0,
      tmdbApiKey: ''
    };
  }

  function loadProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultProfile();
      const parsed = JSON.parse(raw);
      const def = createDefaultProfile();
      return {
        ...def,
        ...parsed,
        dna: { ...def.dna, ...(parsed.dna || {}) },
        ratings: parsed.ratings || def.ratings,
        watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [],
        history: Array.isArray(parsed.history) ? parsed.history : []
      };
    } catch {
      return createDefaultProfile();
    }
  }

  function saveProfile(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore storage quota issues in sandboxed previews
    }
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function dnaSimilarity(a, b) {
    let sumSq = 0;
    for (const k of DNA_KEYS) {
      const diff = (a[k] ?? 5) - (b[k] ?? 5);
      sumSq += diff * diff;
    }
    const maxDist = Math.sqrt(DNA_KEYS.length * 81);
    return 1 - Math.sqrt(sumSq) / maxDist;
  }

  function learnFromRating(profile, title, rating) {
    const prev = profile.ratings[title.id];
    profile.ratings[title.id] = rating;
    if (prev === rating) return profile;

    const stepMap = { loved: 0.16, liked: 0.09, meh: -0.10, never: -0.16 };
    const rate = stepMap[rating] ?? 0;
    if (rate !== 0) {
      for (const k of DNA_KEYS) {
        const cur = profile.dna[k];
        const target = title.dna[k];
        profile.dna[k] = Number(clamp(cur + (target - cur) * rate, 1, 10).toFixed(2));
      }
    }

    profile.watchlist = profile.watchlist.filter((id) => id !== title.id);
    saveProfile(profile);
    return profile;
  }

  function getCalibrationScore(profile) {
    const count = Object.keys(profile.ratings).length;
    if (count === 0) return { pct: 20, label: 'Starter', count };
    const pct = Math.min(100, Math.round(25 + count * 6));
    let label = 'Warming Up';
    if (count >= 12) label = 'Dialed In';
    else if (count >= 6) label = 'Tuned';
    return { pct, label, count };
  }

  function getTitleById(id) {
    return window.CUED_CATALOG.find((t) => t.id === id);
  }

  function scoreTitle(title, profile, context) {
    const catalog = window.CUED_CATALOG;
    const baseDnaSim = dnaSimilarity(title.dna, profile.dna);

    let lovedBoost = 0;
    let bestLovedNeighbor = null;
    let bestLovedSim = 0;
    let dislikePenalty = 0;

    for (const [ratedId, rating] of Object.entries(profile.ratings)) {
      if (ratedId === title.id) continue;
      const other = catalog.find((c) => c.id === ratedId);
      if (!other) continue;

      let sim = dnaSimilarity(title.dna, other.dna);
      const sharedGenres = title.genres.filter((g) => other.genres.includes(g)).length;
      const sharedMoods = title.moods.filter((m) => other.moods.includes(m)).length;
      sim += sharedGenres * 0.045 + sharedMoods * 0.025;
      if (title.origin === other.origin && title.origin === 'indian') sim += 0.06;
      if (title.type === 'anime' && other.type === 'anime') sim += 0.06;
      if (title.creator === other.creator) sim += 0.14;

      if (rating === 'loved') {
        if ((sharedGenres > 0 || title.creator === other.creator) && sim > bestLovedSim) {
          bestLovedSim = sim;
          bestLovedNeighbor = other;
        }
        lovedBoost += Math.max(0, sim - 0.72) * 0.22;
      } else if (rating === 'liked') {
        lovedBoost += Math.max(0, sim - 0.75) * 0.12;
      } else if (rating === 'meh') {
        dislikePenalty += Math.max(0, sim - 0.74) * 0.22;
      } else if (rating === 'never') {
        dislikePenalty += Math.max(0, sim - 0.70) * 0.36;
      }
    }

    lovedBoost = Math.min(0.24, lovedBoost);
    dislikePenalty = Math.min(0.32, dislikePenalty);

    // Mood match bonus
    let moodBonus = 0;
    if (context.mood && context.mood !== 'any') {
      if (title.moods[0] === context.mood) moodBonus = 0.20;
      else if (title.moods.includes(context.mood)) moodBonus = 0.12;
      else moodBonus = -0.30;
    }

    // Anti-slow-burn guard when user prefers fast momentum
    let paceGuard = 0;
    if (profile.dna.pace >= 7.5 && title.dna.pace <= 5) {
      paceGuard = -0.18;
    }

    // Quality consensus prior
    const qualityBonus = (parseFloat(title.rating) - 7.8) * 0.032;

    const rawScore = baseDnaSim * 0.72 + lovedBoost - dislikePenalty + moodBonus + paceGuard + qualityBonus;
    const matchPct = Math.round(clamp(56 + rawScore * 36, 70, 98));

    // Generate personal explanation
    const reasons = [];
    if (bestLovedNeighbor && bestLovedSim >= 0.80) {
      if (title.creator === bestLovedNeighbor.creator) {
        reasons.push(`Same director/creator behind ${bestLovedNeighbor.title} (${title.creator})`);
      } else {
        reasons.push(`Shares the DNA of ${bestLovedNeighbor.title}, which you loved`);
      }
    } else {
      const traits = [];
      if (title.dna.complexity >= 8) traits.push('razor-sharp plot twists & real payoff');
      if (title.dna.pace >= 9) traits.push('zero-filler momentum');
      if (title.dna.intensity >= 9) traits.push('gripping high-stakes tension');
      if (title.dna.spectacle >= 9) traits.push('epic scale');
      if (title.dna.warmth >= 8) traits.push('deep emotional impact');
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
    const tagToAdd =
      firstTag && (!bestLovedNeighbor || !firstTag.toLowerCase().includes(bestLovedNeighbor.title.toLowerCase()))
        ? firstTag
        : secondTag;
    if (tagToAdd) {
      reasons.push(tagToAdd.toLowerCase());
    }

    const explanation = reasons.join(' — ') + '.';
    return { title, rawScore, matchPct, explanation };
  }

  function getRankedPicks(profile, context, excludeIds = [], watchlistOnly = false) {
    const excludeSet = new Set(excludeIds);
    const seenOrVetoed = new Set(Object.keys(profile.ratings));

    function filterPool(relaxOrigin, relaxMood) {
      return window.CUED_CATALOG.filter((t) => {
        if (excludeSet.has(t.id)) return false;
        if (watchlistOnly) return profile.watchlist.includes(t.id);
        if (seenOrVetoed.has(t.id)) return false;
        if (context.format && context.format !== 'any' && t.type !== context.format) return false;
        if (!profile.allowSubtitles && t.language !== 'EN') return false;
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
    let pool = filterPool(false, false);

    if (pool.length < 2 && !watchlistOnly && context.origin !== 'any') {
      pool = filterPool(true, false);
      if (pool.length > 0) relaxedNote = 'Widened region slightly to keep your match quality high.';
    }
    if (pool.length < 1 && !watchlistOnly) {
      pool = filterPool(true, true);
      relaxedNote = 'Showing your highest-scoring unseen matches overall.';
    }

    const scored = pool
      .map((t) => scoreTitle(t, profile, context))
      .sort((a, b) => b.rawScore - a.rawScore);

    return { scored, relaxedNote };
  }

  function getCalibrationDeck(profile) {
    const rated = new Set(Object.keys(profile.ratings));
    const anchors = window.CUED_CATALOG.filter((t) => t.anchor && !rated.has(t.id));
    const others = window.CUED_CATALOG.filter((t) => !t.anchor && !rated.has(t.id));
    return [...anchors, ...others];
  }

  function getFinishTimeText(title) {
    const now = new Date();
    const finish = new Date(now.getTime() + title.runtime * 60000);
    const formatted = finish.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (title.type === 'movie') return `Start now · finishes ~${formatted}`;
    return `1 ep now · finishes ~${formatted}`;
  }

  function renderEditorialPosterSVG(title) {
    const { bg, accent, ink, motif } = title.poster;
    const idSafe = title.id.replace(/[^a-z0-9]/gi, '');
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

  async function fetchTmdbPoster(title, apiKey) {
    if (!apiKey) return null;
    try {
      const cache = JSON.parse(localStorage.getItem(POSTER_CACHE_KEY) || '{}');
      if (cache[title.id]) return cache[title.id];
      const endpoint = title.type === 'movie' ? 'movie' : 'tv';
      const url = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(title.title)}&year=${title.year}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const hit = data.results && data.results[0];
      const path = hit && (hit.backdrop_path || hit.poster_path);
      if (!path) return null;
      const imgUrl = `https://image.tmdb.org/t/p/w780${path}`;
      cache[title.id] = imgUrl;
      localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(cache));
      return imgUrl;
    } catch {
      return null;
    }
  }

  // Live Internet Catalog Discovery via TMDB API (optional free key in Settings)
  async function discoverLiveFromTmdb(profile, context, excludeIds = []) {
    const apiKey = profile.tmdbApiKey;
    if (!apiKey) return [];
    try {
      const isAnime = context.format === 'anime';
      const isSeries = context.format === 'series' || isAnime;
      const endpoint = isSeries ? 'tv' : 'movie';

      const moodGenresMovie = {
        crime: '80,53,9648',
        mindbend: '9648,53,878',
        deep: '18,36,10752',
        hype: '28,12,14',
        horror: '27,53,9648',
        fun: '12,35,28'
      };
      const moodGenresTv = {
        crime: '80,9648',
        mindbend: '9648,10765',
        deep: '18',
        hype: '10759,10765',
        horror: '9648,10765',
        fun: '35,10759'
      };

      const params = new URLSearchParams({
        api_key: apiKey,
        sort_by: 'vote_average.desc',
        'vote_count.gte': context.origin === 'indian' ? '60' : '250',
        'vote_average.gte': '7.2',
        page: String(Math.floor(Math.random() * 2) + 1)
      });

      if (isAnime) {
        params.set('with_genres', '16');
        params.set('with_origin_country', 'JP');
      } else {
        const gMap = isSeries ? moodGenresTv : moodGenresMovie;
        if (context.mood && context.mood !== 'any' && gMap[context.mood]) {
          params.set('with_genres', gMap[context.mood].split(',')[0]);
        }
        if (context.origin === 'indian') params.set('with_origin_country', 'IN');
        else if (context.origin === 'western') params.set('with_origin_country', 'US|GB');
        else if (context.origin === 'intl') params.set('with_origin_country', 'KR|JP|ES|FR|DE');
      }

      const res = await fetch(`https://api.themoviedb.org/3/discover/${endpoint}?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      const exSet = new Set([...excludeIds, ...Object.keys(profile.ratings)]);
      const palettes = [
        ['#1A1513', '#E05A3A', 'beam'],
        ['#14191F', '#D9A441', 'ring'],
        ['#161D18', '#6EA37B', 'prism'],
        ['#1C1418', '#D85448', 'blades']
      ];

      return (data.results || [])
        .filter((item) => item.overview && !exSet.has(`tmdb-${endpoint}-${item.id}`))
        .slice(0, 8)
        .map((item, idx) => {
          const name = item.title || item.name || 'Untitled';
          const dateStr = item.release_date || item.first_air_date || '';
          const year = parseInt(dateStr.slice(0, 4), 10) || 2024;
          const vote = (item.vote_average || 7.6).toFixed(1);
          const votes = item.vote_count || 0;
          const audPct = Math.min(97, Math.round((item.vote_average || 7.6) * 10.5));
          const pal = palettes[idx % palettes.length];
          const titleObj = {
            id: `tmdb-${endpoint}-${item.id}`,
            tmdbId: item.id,
            isLiveTmdb: true,
            title: name,
            year,
            type: isAnime ? 'anime' : (isSeries ? 'series' : 'movie'),
            origin: isAnime ? 'anime' : (context.origin !== 'any' ? context.origin : 'western'),
            runtime: isSeries ? 48 : 122,
            runtimeLabel: isSeries ? 'Series · Live Web Pick' : 'Feature Film · Live Web',
            creator: 'Live TMDB Discovery',
            genres: [context.mood !== 'any' ? context.mood : 'Top Rated'],
            moods: [context.mood !== 'any' ? context.mood : 'crime'],
            rating: vote,
            audiencePct: audPct,
            voteCount: votes,
            language: (item.original_language || 'en').toUpperCase(),
            hook: item.overview.length > 155 ? item.overview.slice(0, 152).trim() + '…' : item.overview,
            overview: item.overview,
            publicSays: `Live public score: ${vote}/10 across ${votes.toLocaleString()} viewer votes on TMDB (${audPct}% positive audience consensus).`,
            whyTags: ['Fresh from live web search', `${votes.toLocaleString()} public votes`],
            posterUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null),
            poster: { bg: pal[0], accent: pal[1], ink: '#F5F0E8', motif: pal[2] },
            dna: { ...profile.dna }
          };
          return {
            title: titleObj,
            rawScore: 0.92,
            matchPct: Math.min(97, Math.round(78 + (item.vote_average || 7.5) * 2.1)),
            explanation: `Pulled live from TMDB matching your ${context.mood !== 'any' ? context.mood : 'calibrated'} vibe (${vote}/10 from ${votes.toLocaleString()} votes).`
          };
        });
    } catch {
      return [];
    }
  }

  async function fetchTmdbReviewSnippet(tmdbId, type, apiKey) {
    if (!apiKey || !tmdbId) return null;
    try {
      const endpoint = type === 'movie' ? 'movie' : 'tv';
      const res = await fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/reviews?api_key=${encodeURIComponent(apiKey)}`);
      if (!res.ok) return null;
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
    loadProfile,
    saveProfile,
    learnFromRating,
    getCalibrationScore,
    getTitleById,
    scoreTitle,
    getRankedPicks,
    getCalibrationDeck,
    getFinishTimeText,
    renderEditorialPosterSVG,
    fetchTmdbPoster,
    discoverLiveFromTmdb,
    fetchTmdbReviewSnippet
  };
})();
