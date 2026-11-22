// Cued — Personalized Mobile App Controller (Anti-Decision-Fatigue Engine)

(function () {
  const E = window.CuedEngine;

  const state = {
    tab: 'tonight',
    profile: E.loadProfile(),
    tonightStep: 'setup', // 'setup' | 'pick' | 'shootout' | 'locked'
    context: {
      format: 'any',      // 'any' | 'movie' | 'series' | 'anime'
      origin: 'any',      // 'any' | 'indian' | 'western' | 'intl'
      mood: 'any'
    },
    watchlistMode: false,
    sessionSkipped: [],
    sessionCandidates: [],
    shotIndex: 0,
    currentPick: null,
    relaxedNote: null,
    shootoutPair: [],
    lockedPick: null,
    libTab: 'watchlist',
    calibSkipped: []
  };

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  function moodIcon(glyph) {
    const map = {
      pulse: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
      prism: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 20 2 20 12 2"/><line x1="12" y1="2" x2="12" y2="20"/></svg>',
      spark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/></svg>',
      hearth: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c4.5 0 8-3.2 8-7.5 0-3.2-2-6-4-7.5-.5 2-2 3-3.5 3.5.5-2.5 0-5.5-2-7.5C8 4.5 4 8.5 4 13.5 4 17.8 7.5 21 12 21z"/></svg>',
      wave: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c2.5-4 5.5-4 8 0s5.5 4 8 0 4-4 4-4"/><path d="M2 17c2.5-4 5.5-4 8 0s5.5 4 8 0 4-4 4-4" opacity="0.5"/></svg>',
      aperture: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="14.31" y1="8" x2="20.05" y2="17.94"/><line x1="9.69" y1="8" x2="21.17" y2="8"/><line x1="7.38" y1="12" x2="13.12" y2="2.06"/><line x1="9.69" y1="16" x2="3.95" y2="6.06"/></svg>'
    };
    return map[glyph] || map.aperture;
  }

  function typeLabel(t) {
    if (t.type === 'anime') return 'Anime';
    if (t.type === 'series') return 'Series';
    return 'Film';
  }

  function originLabel(origin) {
    if (origin === 'indian') return 'Indian';
    if (origin === 'anime') return 'Anime';
    if (origin === 'intl') return 'Intl';
    return 'Hollywood / UK';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function openSheet(html) {
    const backdrop = document.getElementById('sheet-backdrop');
    const content = document.getElementById('sheet-content');
    content.innerHTML = `<div class="sheet-handle"></div>${html}`;
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
  }

  function closeSheet() {
    const backdrop = document.getElementById('sheet-backdrop');
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
  }

  document.getElementById('sheet-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'sheet-backdrop') closeSheet();
  });

  function updateTopbar() {
    const cal = E.getCalibrationScore(state.profile);
    document.getElementById('dna-pill-text').textContent = `${cal.label} · ${cal.pct}%`;
  }

  function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.toggle('active', v.id === `view-${tab}`);
    });
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  document.getElementById('dna-pill-btn').addEventListener('click', () => switchTab('taste'));
  document.getElementById('settings-btn').addEventListener('click', openSettingsSheet);

  // ==================== TONIGHT VIEW ====================
  async function startPicking(watchlistOnly = false) {
    state.watchlistMode = watchlistOnly;
    state.sessionSkipped = [];
    state.sessionCandidates = [];
    state.sessionPool = [];
    state.shotIndex = 0;

    const { scored: localScored, relaxedNote } = E.getRankedPicks(state.profile, state.context, [], watchlistOnly);
    let merged = localScored;
    let note = relaxedNote;

    if (!watchlistOnly && state.profile.tmdbApiKey && state.profile.tmdbApiKey.trim()) {
      showToast('Ranking curated + live TMDB picks by Taste DNA...');
      try {
        const live = await Promise.race([
          E.discoverLiveFromTmdb(state.profile, state.context, []),
          new Promise((resolve) => setTimeout(() => resolve([]), 3500))
        ]);
        if (live.length > 0) {
          // If local had to relax region/mood, prefer exact live TMDB matches
          const baseLocal = relaxedNote ? [] : localScored;
          merged = [...baseLocal, ...live].sort((a, b) => b.rawScore - a.rawScore);
          note = relaxedNote
            ? 'Live TMDB matches ranked by your Taste DNA'
            : 'Curated + Live TMDB · Ranked by your Taste DNA';
        }
      } catch {
        // Fall back silently to local catalog
      }
    }

    state.relaxedNote = note;

    if (merged.length === 0) {
      showToast(watchlistOnly ? 'Save a few picks first!' : 'No unseen titles left—check Library or Settings.');
      return;
    }

    state.sessionPool = merged;
    state.currentPick = merged[0];
    state.sessionCandidates = [merged[0]];
    state.tonightStep = 'pick';
    renderTonight();
  }

  function advanceNextPick(burnShot = true) {
    if (state.currentPick) {
      state.sessionSkipped.push(state.currentPick.title.id);
    }
    if (burnShot) state.shotIndex += 1;

    if (state.shotIndex >= 3 && state.sessionCandidates.length >= 2) {
      state.shootoutPair = state.sessionCandidates.slice(0, 2);
      state.tonightStep = 'shootout';
      renderTonight();
      return;
    }

    // Step through pre-ranked session pool (blended local + live TMDB) first
    if (Array.isArray(state.sessionPool) && state.sessionPool.length > 0) {
      const nextFromPool = state.sessionPool.find(
        (c) => !state.sessionSkipped.includes(c.title.id) && !state.profile.ratings[c.title.id]
      );
      if (nextFromPool) {
        state.currentPick = nextFromPool;
        if (!state.sessionCandidates.some((c) => c.title.id === nextFromPool.title.id)) {
          state.sessionCandidates.push(nextFromPool);
        }
        state.tonightStep = 'pick';
        renderTonight();
        return;
      }
    }

    const { scored, relaxedNote } = E.getRankedPicks(
      state.profile,
      state.context,
      state.sessionSkipped,
      state.watchlistMode
    );
    state.relaxedNote = relaxedNote;

    if (scored.length === 0) {
      if (state.sessionCandidates.length >= 2) {
        state.shootoutPair = state.sessionCandidates.slice(0, 2);
        state.tonightStep = 'shootout';
      } else {
        showToast('That’s every match—try a different mood or format.');
        state.tonightStep = 'setup';
      }
      renderTonight();
      return;
    }

    state.currentPick = scored[0];
    if (!state.sessionCandidates.some((c) => c.title.id === scored[0].title.id)) {
      state.sessionCandidates.push(scored[0]);
    }
    state.tonightStep = 'pick';
    renderTonight();
  }

  function lockInPick(scoredPick) {
    state.lockedPick = scoredPick;
    state.tonightStep = 'locked';
    state.profile.history.unshift({
      id: scoredPick.title.id,
      pickedAt: new Date().toISOString()
    });
    state.profile.history = state.profile.history.slice(0, 30);
    E.saveProfile(state.profile);
    renderTonight();
  }

  function renderTonight() {
    const root = document.getElementById('view-tonight');

    if (state.tonightStep === 'setup') {
      const wlCount = state.profile.watchlist.length;
      const showOrigin = state.context.format !== 'anime';

      root.innerHTML = `
        <p class="eyebrow">30-Second Decider · All Access</p>
        <h2 class="page-title">What’s the vibe tonight?</h2>
        <p class="page-sub">Calibrated to your taste—fast pacing, real payoffs, zero boring filler. Max 3 picks before Sudden Death.</p>

        <div class="control-group">
          <div class="control-label"><span>Format</span></div>
          <div class="segmented" role="group" aria-label="Format">
            ${[
              ['any', 'Any'],
              ['movie', 'Movie'],
              ['series', 'Series'],
              ['anime', 'Anime']
            ].map(([val, lbl]) => `
              <button class="seg-btn ${state.context.format === val ? 'active' : ''}" data-format="${val}" type="button">${lbl}</button>
            `).join('')}
          </div>
        </div>

        ${showOrigin ? `
          <div class="control-group">
            <div class="control-label">
              <span>Origin</span>
              <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--ink-dim)">Optional</span>
            </div>
            <div class="segmented" role="group" aria-label="Origin">
              ${window.CUED_ORIGINS.map((o) => `
                <button class="seg-btn ${state.context.origin === o.id ? 'active' : ''}" data-origin="${o.id}" type="button">${o.label}</button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="control-group">
          <div class="control-label">
            <span>Mood</span>
            <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--ink-dim)">Tap to filter</span>
          </div>
          <div class="mood-grid">
            ${window.CUED_MOODS.map((m) => `
              <button class="mood-card ${state.context.mood === m.id ? 'active' : ''}" data-mood="${m.id}" type="button">
                <div class="mood-top"><span class="mood-icon">${moodIcon(m.glyph)}</span></div>
                <span class="mood-label">${m.label}</span>
                <span class="mood-sub">${m.sub}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <button class="btn-primary" id="btn-pick-now" type="button">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
          Pick For Me
        </button>

        <div class="quick-links">
          <button class="btn-ghost" id="btn-surprise" type="button">Instant Top Match</button>
          <button class="btn-ghost" id="btn-live-web" type="button">
            ${state.profile.tmdbApiKey ? 'Live Web Pick' : 'Enable Web Search'}
          </button>
          <button class="btn-ghost" id="btn-from-wl" type="button" ${wlCount === 0 ? 'style="opacity:0.5"' : ''}>
            Watchlist (${wlCount})
          </button>
        </div>
      `;

      root.querySelectorAll('[data-format]').forEach((b) =>
        b.addEventListener('click', () => {
          state.context.format = b.dataset.format;
          if (state.context.format === 'anime') state.context.origin = 'any';
          renderTonight();
        })
      );
      root.querySelectorAll('[data-origin]').forEach((b) =>
        b.addEventListener('click', () => {
          state.context.origin = b.dataset.origin;
          renderTonight();
        })
      );
      root.querySelectorAll('[data-mood]').forEach((b) =>
        b.addEventListener('click', () => {
          state.context.mood = state.context.mood === b.dataset.mood ? 'any' : b.dataset.mood;
          renderTonight();
        })
      );
      document.getElementById('btn-pick-now').addEventListener('click', () => startPicking(false));
      document.getElementById('btn-surprise').addEventListener('click', () => {
        state.context = { format: 'any', origin: 'any', mood: 'any' };
        startPicking(false);
      });
      document.getElementById('btn-live-web').addEventListener('click', async () => {
        if (!state.profile.tmdbApiKey) {
          openSettingsSheet();
          showToast('Add a free TMDB key to search the live web');
          return;
        }
        showToast('Searching live TMDB catalog...');
        const live = await E.discoverLiveFromTmdb(state.profile, state.context, state.sessionSkipped);
        if (!live.length) {
          showToast('No live matches—using curated catalog');
          startPicking(false);
          return;
        }
        state.watchlistMode = false;
        state.sessionSkipped = [];
        state.shotIndex = 0;
        state.relaxedNote = 'Live TMDB Picks · Ranked by your Taste DNA';
        state.sessionPool = live;
        state.currentPick = live[0];
        state.sessionCandidates = [live[0]];
        state.tonightStep = 'pick';
        renderTonight();
      });
      document.getElementById('btn-from-wl').addEventListener('click', () => {
        if (state.profile.watchlist.length === 0) return showToast('Save picks to your Watchlist first');
        startPicking(true);
      });
      return;
    }

    if (state.tonightStep === 'pick' && state.currentPick) {
      const pick = state.currentPick;
      const t = pick.title;
      const isSaved = state.profile.watchlist.includes(t.id);
      const finishText = E.getFinishTimeText(t);
      const audPct = t.audiencePct || Math.min(97, Math.round(parseFloat(t.rating) * 10.6));

      root.innerHTML = `
        <div class="pick-header">
          <button class="back-link" id="btn-back-setup" type="button">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Adjust Vibe
          </button>
          <div class="shot-counter">
            <span>${state.watchlistMode ? 'Watchlist' : `Pick ${Math.min(state.shotIndex + 1, 3)} of 3`}</span>
            <div class="shot-dots" aria-hidden="true">
              ${[0, 1, 2].map((i) => `<span class="shot-dot ${i < state.shotIndex ? 'done' : i === state.shotIndex ? 'current' : ''}"></span>`).join('')}
            </div>
          </div>
        </div>

        ${state.relaxedNote ? `<div class="relaxed-banner">${escapeHtml(state.relaxedNote)}</div>` : ''}

        <article class="pick-card" id="active-pick-card">
          <div class="swipe-badge yes" id="badge-yes">Watch Tonight</div>
          <div class="swipe-badge no" id="badge-no">Not Tonight</div>

          <div class="poster-frame" id="pick-poster-frame">
            ${t.posterUrl ? `<img src="${escapeHtml(t.posterUrl)}" alt="${escapeHtml(t.title)}" class="poster-photo" /><div class="poster-photo-scrim"></div>` : E.renderEditorialPosterSVG(t)}
            <div class="poster-top-bar">
              <span class="match-badge">${pick.matchPct}% Match</span>
              <span class="type-badge">${typeLabel(t)}${t.language !== 'EN' ? ` · ${t.language}` : ''}</span>
            </div>
            <div class="poster-bottom">
              <h2 class="pick-title">${escapeHtml(t.title)}</h2>
              <div class="pick-meta">
                <span>${t.year}</span>
                <span>·</span>
                <span>${escapeHtml(t.runtimeLabel)}</span>
                <span>·</span>
                <span class="meta-rating">★ ${t.rating}</span>
              </div>
            </div>
          </div>

          <div class="pick-body">
            <div class="score-strip">
              <div class="score-cell">
                <span class="score-cell-label">${t.isLiveTmdb ? 'TMDB Rating' : 'IMDb Rating'}</span>
                <span class="score-cell-val imdb">★ ${t.rating} / 10</span>
              </div>
              <div class="score-cell">
                <span class="score-cell-label">Public Score</span>
                <span class="score-cell-val aud">${audPct}% Liked</span>
              </div>
            </div>

            <div class="why-box">
              <div class="why-label">Why this fits your taste</div>
              <div class="why-text">${escapeHtml(pick.explanation)}</div>
            </div>

            <div class="tag-row">
              <span class="service-chip owned">${originLabel(t.origin)}</span>
              ${t.genres.slice(0, 2).map((g) => `<span class="tag-chip">${escapeHtml(g)}</span>`).join('')}
              ${t.whyTags.slice(0, 1).map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('')}
            </div>

            <div class="reception-box">
              <div>
                <div class="detail-section-label">About the Story</div>
                <p class="detail-text">${escapeHtml(t.overview || t.hook)}</p>
              </div>
              <div class="public-says-box">
                <div class="detail-section-label">What the Public Thinks</div>
                <p class="detail-text" id="public-says-text">${escapeHtml(t.publicSays || '')}</p>
              </div>
            </div>

            <div class="pick-credits" style="margin-top:12px">
              <span>${escapeHtml(t.creator)}</span>
              <span class="finish-clock">${escapeHtml(finishText)}</span>
            </div>
          </div>
        </article>

        <div class="action-dock">
          <button class="btn-primary" id="btn-watch-this" type="button">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
            Watch This Tonight
          </button>

          <div class="secondary-actions">
            <button class="dock-btn" id="btn-seen-it" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span>Seen / Pass</span>
            </button>
            <button class="dock-btn" id="btn-save-wl" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.9"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              <span>${isSaved ? 'Saved' : 'Save Later'}</span>
            </button>
            <button class="dock-btn" id="btn-not-tonight" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><polyline points="9 18 15 12 9 6"/></svg>
              <span>${state.shotIndex === 2 ? 'Sudden Death' : 'Next Pick'}</span>
            </button>
          </div>
          <div class="swipe-hint">Swipe right to lock in · swipe left for next pick</div>
        </div>
      `;

      function attachTmdbPoster(frameId, titleObj) {
        if (!state.profile.tmdbApiKey || titleObj.posterUrl) return;
        E.fetchTmdbPoster(titleObj, state.profile.tmdbApiKey).then((url) => {
          const frame = document.getElementById(frameId);
          if (!url || !frame) return;
          titleObj.posterUrl = url;
          const img = document.createElement('img');
          img.alt = titleObj.title;
          img.className = 'poster-photo';
          img.onload = () => {
            const svg = frame.querySelector('.poster-svg');
            if (svg) svg.remove();
          };
          img.onerror = () => {
            img.remove();
            scrim.remove();
          };
          const scrim = document.createElement('div');
          scrim.className = 'poster-photo-scrim';
          const topBar = frame.querySelector('.poster-top-bar');
          frame.insertBefore(img, topBar || null);
          frame.insertBefore(scrim, topBar || null);
          img.src = url;
        });
      }

      attachTmdbPoster('pick-poster-frame', t);

      if (t.isLiveTmdb && state.profile.tmdbApiKey) {
        E.fetchTmdbReviewSnippet(t.tmdbId, t.type, state.profile.tmdbApiKey).then((rev) => {
          const el = document.getElementById('public-says-text');
          if (rev && el) {
            el.textContent = `${t.publicSays} Top viewer review (${rev.author}): "${rev.snippet}"`;
          }
        });
      }

      document.getElementById('btn-back-setup').addEventListener('click', () => {
        state.tonightStep = 'setup';
        renderTonight();
      });
      document.getElementById('btn-watch-this').addEventListener('click', () => lockInPick(pick));
      document.getElementById('btn-not-tonight').addEventListener('click', () => advanceNextPick(true));
      document.getElementById('btn-save-wl').addEventListener('click', () => {
        if (!state.profile.watchlist.includes(t.id)) {
          state.profile.watchlist.unshift(t.id);
          E.saveProfile(state.profile);
          showToast(`Saved "${t.title}" to Watchlist`);
          advanceNextPick(false);
        } else {
          showToast('Already in your Watchlist');
        }
      });
      document.getElementById('btn-seen-it').addEventListener('click', () => openSeenSheet(t));

      attachSwipeGestures(document.getElementById('active-pick-card'), {
        onSwipeRight: () => lockInPick(pick),
        onSwipeLeft: () => advanceNextPick(true)
      });
      return;
    }

    if (state.tonightStep === 'shootout') {
      const [a, b] = state.shootoutPair;
      root.innerHTML = `
        <div class="pick-header">
          <button class="back-link" id="btn-back-setup" type="button">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Start Over
          </button>
          <span class="shot-counter" style="color:var(--accent)">Anti-Scroll Rule</span>
        </div>

        <p class="eyebrow">Sudden Death</p>
        <h2 class="page-title">Gut instinct. Pick one.</h2>
        <p class="page-sub">You skipped 3 picks—here are your top two contenders head-to-head. Tap one and open Nuvio.</p>

        <div class="shootout-wrap">
          ${[a, b].map((item, idx) => `
            <button class="shootout-card" data-winner="${idx}" type="button">
              <div class="shootout-top">
                <span class="match-badge">${item.matchPct}% Match</span>
                <span class="type-badge">${typeLabel(item.title)} · ${originLabel(item.title.origin)}</span>
              </div>
              <h3 class="shootout-title">${escapeHtml(item.title.title)}</h3>
              <div class="shootout-meta">${item.title.year} · ${escapeHtml(item.title.runtimeLabel)} · ★ ${item.title.rating}</div>
              <p class="shootout-hook">${escapeHtml(item.title.hook)}</p>
            </button>
            ${idx === 0 ? '<div class="vs-divider">VS</div>' : ''}
          `).join('')}
        </div>

        <div style="margin-top:16px">
          <button class="btn-ghost" id="btn-flip-coin" style="width:100%" type="button">
            Still stuck? Flip a coin for me
          </button>
        </div>
      `;

      document.getElementById('btn-back-setup').addEventListener('click', () => {
        state.tonightStep = 'setup';
        renderTonight();
      });
      root.querySelectorAll('[data-winner]').forEach((btn) => {
        btn.addEventListener('click', () => lockInPick(state.shootoutPair[Number(btn.dataset.winner)]));
      });
      document.getElementById('btn-flip-coin').addEventListener('click', () => {
        const winner = state.shootoutPair[Math.random() < 0.5 ? 0 : 1];
        showToast(`Coin chose ${winner.title.title}`);
        lockInPick(winner);
      });
      return;
    }

    if (state.tonightStep === 'locked' && state.lockedPick) {
      const t = state.lockedPick.title;
      const finishText = E.getFinishTimeText(t);
      const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${t.title} ${t.year} official trailer`)}`;
      const imdbUrl = `https://www.imdb.com/find/?q=${encodeURIComponent(t.title)}`;

      root.innerHTML = `
        <div class="locked-status">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Locked in — scrolling officially defeated
        </div>

        <div class="locked-card">
          <div class="poster-frame" style="height:190px">
            ${t.posterUrl ? `<img src="${escapeHtml(t.posterUrl)}" alt="${escapeHtml(t.title)}" class="poster-photo" /><div class="poster-photo-scrim"></div>` : E.renderEditorialPosterSVG(t)}
            <div class="poster-top-bar">
              <span class="match-badge">${state.lockedPick.matchPct}% Match</span>
              <span class="type-badge">${escapeHtml(t.runtimeLabel)}</span>
            </div>
            <div class="poster-bottom">
              <h2 class="pick-title">${escapeHtml(t.title)}</h2>
              <div class="pick-meta">
                <span>${t.year}</span>
                <span>·</span>
                <span>${escapeHtml(finishText)}</span>
              </div>
            </div>
          </div>

          <div class="pick-body">
            <p class="pick-hook">${escapeHtml(t.hook)}</p>
            <div class="tag-row">
              <span class="service-chip owned">Ready on Nuvio</span>
              ${t.genres.map((g) => `<span class="tag-chip">${escapeHtml(g)}</span>`).join('')}
            </div>

            <div class="launch-list">
              <button class="launch-link" id="btn-copy-title" type="button" style="width:100%;cursor:pointer;font-family:inherit">
                <span>Copy Title for Nuvio Search</span>
                <span class="sub">Tap to copy</span>
              </button>
              <a class="launch-link" href="${trailerUrl}" target="_blank" rel="noopener">
                <span>Watch Trailer First</span>
                <span class="sub">YouTube ↗</span>
              </a>
              <a class="launch-link" href="${imdbUrl}" target="_blank" rel="noopener">
                <span>Quick Cast & Details</span>
                <span class="sub">IMDb ↗</span>
              </a>
            </div>
          </div>
        </div>

        <button class="btn-primary" id="btn-rate-after" type="button">
          Finished Watching? Rate It
        </button>
        <div class="quick-links">
          <button class="btn-ghost" id="btn-pick-another" type="button">Pick Something Else</button>
        </div>
      `;

      document.getElementById('btn-copy-title').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(t.title);
          showToast(`Copied "${t.title}" — paste in Nuvio!`);
        } catch {
          showToast(`Search "${t.title}" in Nuvio`);
        }
      });
      document.getElementById('btn-rate-after').addEventListener('click', () => openSeenSheet(t, true));
      document.getElementById('btn-pick-another').addEventListener('click', () => {
        state.tonightStep = 'setup';
        renderTonight();
      });
    }
  }

  function openSeenSheet(title, fromLocked = false) {
    openSheet(`
      <h3 class="sheet-title">${escapeHtml(title.title)}</h3>
      <p class="sheet-sub">Your quick reaction updates your Taste DNA immediately.</p>
      <div class="calib-actions" style="margin-top:0">
        <button class="rate-btn love" data-rate="loved" type="button"><span>♥</span><span>Loved</span></button>
        <button class="rate-btn like" data-rate="liked" type="button"><span>↑</span><span>Liked</span></button>
        <button class="rate-btn" data-rate="meh" type="button"><span>–</span><span>Meh</span></button>
        <button class="rate-btn" data-rate="never" type="button"><span>✕</span><span>Never</span></button>
      </div>
    `);

    document.querySelectorAll('#sheet-content [data-rate]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = btn.dataset.rate;
        E.learnFromRating(state.profile, title, r);
        updateTopbar();
        closeSheet();
        showToast(r === 'never' ? `Hidden "${title.title}"` : `Taste DNA updated from "${title.title}"`);
        if (fromLocked) {
          state.tonightStep = 'setup';
          renderTonight();
        } else if (state.tab === 'tonight' && state.tonightStep === 'pick') {
          advanceNextPick(false);
        } else {
          render();
        }
      });
    });
  }

  function attachSwipeGestures(card, { onSwipeRight, onSwipeLeft }) {
    if (!card) return;
    let startX = 0, startY = 0, dx = 0, dragging = false, lockedAxis = null;
    const yesBadge = document.getElementById('badge-yes');
    const noBadge = document.getElementById('badge-no');

    function onStart(x, y) { startX = x; startY = y; dx = 0; dragging = true; lockedAxis = null; card.classList.add('swiping'); }
    function onMove(x, y) {
      if (!dragging) return;
      const ax = x - startX, ay = y - startY;
      if (!lockedAxis && (Math.abs(ax) > 10 || Math.abs(ay) > 10)) lockedAxis = Math.abs(ax) > Math.abs(ay) ? 'x' : 'y';
      if (lockedAxis !== 'x') return;
      dx = ax;
      card.style.transform = `translateX(${dx}px) rotate(${dx * 0.035}deg)`;
      const strength = Math.min(1, Math.abs(dx) / 95);
      yesBadge.style.opacity = dx > 0 ? strength : 0;
      noBadge.style.opacity = dx < 0 ? strength : 0;
    }
    function onEnd() {
      if (!dragging) return;
      dragging = false;
      card.classList.remove('swiping');
      if (dx > 100) {
        card.style.transform = 'translateX(420px) rotate(12deg)';
        card.style.opacity = '0';
        setTimeout(onSwipeRight, 175);
      } else if (dx < -100) {
        card.style.transform = 'translateX(-420px) rotate(-12deg)';
        card.style.opacity = '0';
        setTimeout(onSwipeLeft, 175);
      } else {
        card.style.transform = '';
        yesBadge.style.opacity = 0;
        noBadge.style.opacity = 0;
      }
    }

    card.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    card.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    card.addEventListener('touchend', onEnd);
    card.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('button, a')) return;
      onStart(e.clientX, e.clientY);
      const mm = (ev) => onMove(ev.clientX, ev.clientY);
      const mu = () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); onEnd(); };
      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', mu);
    });
  }

  // ==================== TASTE DNA VIEW ====================
  function renderTaste() {
    const root = document.getElementById('view-taste');
    const cal = E.getCalibrationScore(state.profile);
    const deck = E.getCalibrationDeck(state.profile).filter((t) => !state.calibSkipped.includes(t.id));
    const current = deck[0];

    root.innerHTML = `
      <p class="eyebrow">${escapeHtml(state.profile.profileName)}</p>
      <h2 class="page-title">Your Taste DNA</h2>
      <p class="page-sub">Pre-calibrated from your favorites (Andhadhun, Breaking Bad, Sherlock, Solo Leveling, The Pianist & more). Keep tuning anytime.</p>

      ${current ? `
        <div class="calib-card">
          <div class="calib-header">
            ${E.renderEditorialPosterSVG(current)}
            <div class="poster-top-bar">
              <span class="match-badge">Keep Tuning · ${cal.count} rated</span>
              <span class="type-badge">${typeLabel(current)} · ${current.year}</span>
            </div>
            <div class="poster-bottom">
              <h3 class="calib-title">${escapeHtml(current.title)}</h3>
              <div class="pick-meta">${escapeHtml(current.genres.join(' · '))}</div>
            </div>
          </div>
          <div class="calib-body">
            <p style="margin:0;font-size:13.5px;color:var(--ink-muted)">${escapeHtml(current.hook)}</p>
            <div class="calib-actions">
              <button class="rate-btn love" data-calib="loved" type="button"><span>♥</span><span>Loved</span></button>
              <button class="rate-btn like" data-calib="liked" type="button"><span>↑</span><span>Liked</span></button>
              <button class="rate-btn" data-calib="unseen" type="button"><span>?</span><span>Unseen</span></button>
              <button class="rate-btn" data-calib="meh" type="button"><span>✕</span><span>Not Me</span></button>
            </div>
          </div>
        </div>
      ` : `
        <div class="panel" style="text-align:center">
          <p class="panel-title">Fully Calibrated (${cal.count} rated)</p>
          <p style="font-size:13px;color:var(--ink-muted);margin:6px 0 0">Cued knows your taste cold.</p>
        </div>
      `}

      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">Taste Dimensions</h3>
          <span class="panel-meta">${cal.label} (${cal.pct}%)</span>
        </div>
        ${E.DNA_META.map((d) => {
          const val = state.profile.dna[d.key];
          return `
            <div class="slider-row">
              <div class="slider-ends">
                <span>${d.low}</span>
                <span class="val" id="val-${d.key}">${val.toFixed(1)}</span>
                <span>${d.high}</span>
              </div>
              <input type="range" min="1" max="10" step="0.5" value="${val}" data-dna="${d.key}" aria-label="${d.label}" />
            </div>
          `;
        }).join('')}
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">Playback & Filters</h3>
          <span class="panel-meta">Nuvio All-Access</span>
        </div>

        <div class="switch-row">
          <div>
            <div class="switch-label">Subtitles / International OK</div>
            <div class="switch-sub">Indian, Korean, Japanese, European gems</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="toggle-subs" ${state.profile.allowSubtitles ? 'checked' : ''} />
            <span class="switch-track"></span>
          </label>
        </div>

        <div class="switch-row" style="flex-direction:column;align-items:stretch;gap:8px">
          <div class="switch-label">Release Era Preference</div>
          <div class="segmented">
            ${[
              [0, 'Any Era'],
              [1995, '1995+'],
              [2010, '2010+'],
              [2018, '2018+']
            ].map(([yr, lbl]) => `
              <button class="seg-btn ${state.profile.minYear === yr ? 'active' : ''}" data-minyear="${yr}" type="button">${lbl}</button>
            `).join('')}
          </div>
        </div>
      </div>

      <button class="btn-secondary" id="btn-export-import" type="button">
        Import / Export Taste Profile JSON
      </button>
    `;

    if (current) {
      root.querySelectorAll('[data-calib]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.calib;
          if (action === 'unseen') state.calibSkipped.push(current.id);
          else {
            E.learnFromRating(state.profile, current, action);
            updateTopbar();
            showToast(`Updated DNA from ${current.title}`);
          }
          renderTaste();
        });
      });
    }

    root.querySelectorAll('[data-dna]').forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.dna;
        const v = parseFloat(input.value);
        state.profile.dna[key] = v;
        document.getElementById(`val-${key}`).textContent = v.toFixed(1);
        E.saveProfile(state.profile);
      });
    });

    document.getElementById('toggle-subs').addEventListener('change', (e) => {
      state.profile.allowSubtitles = e.target.checked;
      E.saveProfile(state.profile);
    });

    root.querySelectorAll('[data-minyear]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.profile.minYear = Number(btn.dataset.minyear);
        E.saveProfile(state.profile);
        renderTaste();
      });
    });

    document.getElementById('btn-export-import').addEventListener('click', openProfileJsonSheet);
  }

  // ==================== LIBRARY VIEW ====================
  function renderLibrary() {
    const root = document.getElementById('view-library');
    const watchlistItems = state.profile.watchlist.map((id) => E.getTitleById(id)).filter(Boolean);
    const ratedItems = Object.entries(state.profile.ratings)
      .map(([id, rating]) => ({ title: E.getTitleById(id), rating }))
      .filter((x) => x.title);

    root.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px">
        <div>
          <p class="eyebrow">Personal Vault</p>
          <h2 class="page-title" style="margin-bottom:0">Library</h2>
        </div>
        <button class="mini-pill" id="btn-log-title" style="padding:8px 12px;color:var(--ink)" type="button">+ Log Title</button>
      </div>

      <div class="segmented" style="margin-bottom:14px">
        <button class="seg-btn ${state.libTab === 'watchlist' ? 'active' : ''}" data-libtab="watchlist" type="button">
          Up Next (${watchlistItems.length})
        </button>
        <button class="seg-btn ${state.libTab === 'watched' ? 'active' : ''}" data-libtab="watched" type="button">
          Rated (${ratedItems.length})
        </button>
      </div>

      ${state.libTab === 'watchlist' ? (
        watchlistItems.length > 0 ? `
          <button class="btn-primary" id="btn-decide-wl" style="margin-bottom:14px" type="button">
            Pick One From My Watchlist
          </button>
          <div class="lib-list">
            ${watchlistItems.map((t) => `
              <div class="lib-item">
                <div class="lib-swatch" style="background:${t.poster.bg}">
                  <div style="position:absolute;inset:0;background:radial-gradient(circle at 70% 30%, ${t.poster.accent}88, transparent 70%)"></div>
                </div>
                <div class="lib-info">
                  <div class="lib-title">${escapeHtml(t.title)}</div>
                  <div class="lib-meta">${t.year} · ${escapeHtml(t.runtimeLabel)}</div>
                </div>
                <div class="lib-actions">
                  <button class="mini-pill" data-watch-now="${t.id}" type="button">Watch</button>
                  <button class="mini-pill" data-rm-wl="${t.id}" type="button" aria-label="Remove">✕</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <h3>Your Watchlist is clean</h3>
            <p>Tap “Save Later” on any pick in Tonight mode and it’ll queue up here.</p>
            <button class="btn-secondary" id="btn-go-tonight" style="width:auto;padding:10px 18px" type="button">Find Something Tonight</button>
          </div>
        `
      ) : (
        `<div class="lib-list">
          ${ratedItems.map(({ title: t, rating }) => `
            <div class="lib-item">
              <div class="lib-swatch" style="background:${t.poster.bg}">
                <div style="position:absolute;inset:0;background:radial-gradient(circle at 70% 30%, ${t.poster.accent}88, transparent 70%)"></div>
              </div>
              <div class="lib-info">
                <div class="lib-title">${escapeHtml(t.title)}</div>
                <div class="lib-meta">${t.year} · ${typeLabel(t)}</div>
              </div>
              <div class="lib-actions">
                <button class="mini-pill ${rating}" data-re-rate="${t.id}" type="button">${rating}</button>
                <button class="mini-pill" data-unrate="${t.id}" type="button" aria-label="Remove">✕</button>
              </div>
            </div>
          `).join('')}
        </div>`
      )}
    `;

    root.querySelectorAll('[data-libtab]').forEach((b) =>
      b.addEventListener('click', () => { state.libTab = b.dataset.libtab; renderLibrary(); })
    );
    document.getElementById('btn-log-title').addEventListener('click', openLogSearchSheet);
    const decideWl = document.getElementById('btn-decide-wl');
    if (decideWl) decideWl.addEventListener('click', () => { switchTab('tonight'); startPicking(true); });
    const goTonight = document.getElementById('btn-go-tonight');
    if (goTonight) goTonight.addEventListener('click', () => switchTab('tonight'));
    root.querySelectorAll('[data-rm-wl]').forEach((b) =>
      b.addEventListener('click', () => {
        state.profile.watchlist = state.profile.watchlist.filter((id) => id !== b.dataset.rmWl);
        E.saveProfile(state.profile);
        renderLibrary();
      })
    );
    root.querySelectorAll('[data-watch-now]').forEach((b) =>
      b.addEventListener('click', () => {
        const t = E.getTitleById(b.dataset.watchNow);
        if (!t) return;
        switchTab('tonight');
        lockInPick(E.scoreTitle(t, state.profile, { format: 'any', origin: 'any', mood: 'any' }));
      })
    );
    root.querySelectorAll('[data-re-rate]').forEach((b) =>
      b.addEventListener('click', () => { const t = E.getTitleById(b.dataset.reRate); if (t) openSeenSheet(t, false); })
    );
    root.querySelectorAll('[data-unrate]').forEach((b) =>
      b.addEventListener('click', () => {
        delete state.profile.ratings[b.dataset.unrate];
        E.saveProfile(state.profile);
        updateTopbar();
        renderLibrary();
      })
    );
  }

  function openLogSearchSheet() {
    openSheet(`
      <h3 class="sheet-title">Log a Movie, Series or Anime</h3>
      <p class="sheet-sub">Search the catalog to mark what you’ve already seen.</p>
      <input type="search" class="field-input" id="log-search-input" placeholder="Search title, director, or genre..." autocomplete="off" />
      <div class="search-results" id="log-search-results"></div>
    `);

    const input = document.getElementById('log-search-input');
    const results = document.getElementById('log-search-results');

    function renderResults(q) {
      const term = q.trim().toLowerCase();
      const matches = window.CUED_CATALOG.filter((t) => {
        if (!term) return true;
        return t.title.toLowerCase().includes(term) || t.creator.toLowerCase().includes(term) || t.genres.some((g) => g.toLowerCase().includes(term));
      }).slice(0, 20);

      results.innerHTML = matches.map((t) => {
        const cur = state.profile.ratings[t.id];
        return `
          <div class="lib-item" style="padding:10px 12px">
            <div class="lib-info">
              <div class="lib-title">${escapeHtml(t.title)}</div>
              <div class="lib-meta">${t.year} · ${typeLabel(t)}</div>
            </div>
            <button class="mini-pill ${cur || ''}" data-pick-log="${t.id}" type="button">${cur ? cur : 'Rate'}</button>
          </div>
        `;
      }).join('');

      results.querySelectorAll('[data-pick-log]').forEach((b) => {
        b.addEventListener('click', () => { const t = E.getTitleById(b.dataset.pickLog); if (t) openSeenSheet(t, false); });
      });
    }

    renderResults('');
    input.addEventListener('input', () => renderResults(input.value));
    setTimeout(() => input.focus(), 80);
  }

  function openProfileJsonSheet() {
    const json = JSON.stringify(state.profile, null, 2);
    openSheet(`
      <h3 class="sheet-title">Taste Profile JSON</h3>
      <p class="sheet-sub">Back up your ratings or paste a custom Taste Profile JSON.</p>
      <textarea class="field-textarea" id="profile-json-box">${escapeHtml(json)}</textarea>
      <div class="quick-links" style="margin-top:12px">
        <button class="btn-secondary" id="btn-copy-json" type="button">Copy JSON</button>
        <button class="btn-primary" id="btn-apply-json" type="button">Apply JSON</button>
      </div>
    `);

    document.getElementById('btn-copy-json').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(document.getElementById('profile-json-box').value); showToast('Profile JSON copied'); }
      catch { showToast('Select & copy the text above'); }
    });
    document.getElementById('btn-apply-json').addEventListener('click', () => {
      try {
        const parsed = JSON.parse(document.getElementById('profile-json-box').value);
        const def = E.createDefaultProfile();
        state.profile = { ...def, ...parsed, dna: { ...def.dna, ...(parsed.dna || {}) } };
        E.saveProfile(state.profile);
        updateTopbar(); closeSheet(); render();
        showToast('Taste Profile applied!');
      } catch { showToast('Invalid JSON format'); }
    });
  }

  function openSettingsSheet() {
    openSheet(`
      <h3 class="sheet-title">Settings</h3>
      <p class="sheet-sub">Customize your personal Cued app.</p>

      <div class="control-group">
        <div class="control-label"><span>Profile Label</span></div>
        <input type="text" class="field-input" id="set-name" value="${escapeHtml(state.profile.profileName)}" />
      </div>

      <div class="control-group">
        <div class="control-label"><span>TMDB API Key (Optional)</span></div>
        <input type="text" class="field-input" id="set-tmdb" value="${escapeHtml(state.profile.tmdbApiKey || '')}" placeholder="Free TMDB v3 key for live posters" />
        <p style="font-size:12px;color:var(--ink-dim);margin:6px 0 0">Leave blank to use built-in offline cinema posters.</p>
      </div>

      <button class="btn-primary" id="btn-save-settings" type="button" style="margin-bottom:10px">Save Settings</button>
      <button class="btn-secondary" id="btn-open-json-from-set" type="button" style="margin-bottom:10px">Import / Export Taste JSON</button>
      <button class="btn-ghost" id="btn-reset-all" type="button" style="width:100%;color:#E57D68">Restore Calibrated Defaults</button>
    `);

    document.getElementById('btn-save-settings').addEventListener('click', () => {
      state.profile.profileName = document.getElementById('set-name').value.trim() || 'Personal Taste';
      state.profile.tmdbApiKey = document.getElementById('set-tmdb').value.trim();
      E.saveProfile(state.profile);
      closeSheet(); render(); showToast('Settings saved');
    });
    document.getElementById('btn-open-json-from-set').addEventListener('click', openProfileJsonSheet);
    document.getElementById('btn-reset-all').addEventListener('click', () => {
      state.profile = E.createDefaultProfile();
      state.calibSkipped = [];
      state.tonightStep = 'setup';
      E.saveProfile(state.profile);
      updateTopbar(); closeSheet(); render();
      showToast('Restored your calibrated profile');
    });
  }

  function render() {
    updateTopbar();
    if (state.tab === 'tonight') renderTonight();
    else if (state.tab === 'taste') renderTaste();
    else if (state.tab === 'library') renderLibrary();
  }

  render();
})();
