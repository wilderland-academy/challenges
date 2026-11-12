(function () {
  'use strict';
  var D = window.WL;
  var SK = {}, BYID = {};
  D.skills.forEach(function (s) { SK[s.k] = s; });
  D.ch.forEach(function (c) { BYID[c.id] = c; });

  // ---------- storage (best effort) ----------
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* keep in memory */ }
  }

  var state = { band: load('wl-band', '5–8'), skill: null, sub: null, q: '', f: { home: false, epic: false, lab: false, any: false } };
  if (['K–1', '2–4', '5–8'].indexOf(state.band) < 0) state.band = '5–8';
  var picks = load('wl-picks', []).filter(function (id) { return BYID[id]; });

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function icon(name) {
    return '<svg class="ic" aria-hidden="true"><use href="icons.svg#i-' + name + '"/></svg>';
  }
  function tint(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function m(x) { return Math.round(x + (255 - x) * amt); }
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  function skillVars(s) { return '--c:' + s.col + ';--tint:' + tint(s.col, 0.85); }
  function target() { return state.band === 'K–1' ? 3 : 2; }
  function guideMode() { return state.band === 'K–1'; }
  function imgFor(cid) { return D.img && D.img[cid]; }
  function credit(m) {
    return 'Photo: <a href="' + esc(m.page) + '" target="_blank" rel="noopener">' + esc(m.title.replace(/^File:/, '').replace(/\.jpe?g$/i, '')) + '</a>' +
      (m.artist ? ' by ' + esc(m.artist) : '') + ', ' + (m.license_url ? '<a href="' + esc(m.license_url) + '" target="_blank" rel="noopener">' + esc(m.license) + '</a>' : esc(m.license));
  }
  function compNum(cid) { return parseInt(cid.slice(3), 10); }
  function chNum(id) { return parseInt(id.split('.')[1], 10); }
  function anyHobby(c) { return !!(c.hob && c.hob.indexOf('*') >= 0); }
  function filtersOn() { var f = state.f; return f.home || f.epic || f.lab || f.any; }
  // A challenge passes when it is in the chosen band and matches every filter that is switched on.
  function passes(c) {
    if (c.b !== state.band) return false;
    var f = state.f;
    if (f.home && !c.h) return false;
    if (f.epic && c.z !== 'Epic') return false;
    if (f.lab && !c.lab) return false;
    if (f.any && !anyHobby(c)) return false;
    return true;
  }

  // Band-scoped structure: skill -> subskills (in order) -> competencies -> challenges
  function structure() {
    var out = {};
    D.skills.forEach(function (s) { out[s.k] = { subs: [], bySub: {}, count: 0 }; });
    D.ch.filter(passes)
      .sort(function (a, b) { return compNum(a.c) - compNum(b.c) || chNum(a.id) - chNum(b.id); })
      .forEach(function (c) {
        var comp = D.comps[c.c], node = out[comp.k];
        if (!node.bySub[comp.s]) { node.bySub[comp.s] = { comps: [], byComp: {}, count: 0 }; node.subs.push(comp.s); }
        var sub = node.bySub[comp.s];
        if (!sub.byComp[c.c]) { sub.byComp[c.c] = []; sub.comps.push(c.c); }
        sub.byComp[c.c].push(c);
        sub.count++; node.count++;
      });
    return out;
  }
  var S = structure();

  function picksIn(skill) {
    return picks.map(function (id) { return BYID[id]; }).filter(function (c) {
      return c && c.b === state.band && D.comps[c.c].k === skill;
    });
  }
  function creditsIn(skill) {
    return picksIn(skill).reduce(function (a, c) { return a + (c.cr || 1); }, 0);
  }

  // ---------- masthead strip + year tracker ----------
  document.getElementById('strip').innerHTML = D.skills.map(function (s) {
    return '<span style="--c:' + s.col + '"></span>';
  }).join('');
  document.getElementById('badge-names').textContent = D.skills.map(function (s) {
    return s.badge + ' (' + s.n + ')';
  }).join(', ') + '.';

  function renderYear() {
    var t = target();
    document.getElementById('year-goal').textContent = t === 1
      ? 'In K–1, cover at least 3 challenges in each of the 8 life skills this year, at least 2 a week.'
      : 'Finish 2 challenges in each of the 8 life skills this year. An Epic counts as 2. Save challenges to your plan and they fill in here.';
    document.getElementById('year-skills').innerHTML = D.skills.map(function (s) {
      var n = Math.min(creditsIn(s.k), t), dots = '';
      for (var i = 0; i < t; i++) dots += '<span class="dot' + (i < n ? ' on' : '') + '"></span>';
      return '<li><button class="ys' + (n >= t ? ' done' : '') + '" data-skill="' + s.k + '" style="' + skillVars(s) + '"' +
        (state.skill === s.k ? ' aria-current="true"' : '') +
        ' aria-label="' + esc(s.n) + ': ' + n + ' of ' + t + ' picked">' +
        '<span class="ys-name">' + esc(s.n) + '</span><span class="dots">' + dots + '</span></button></li>';
    }).join('');
  }

  // ---------- tree ----------
  var tree = document.getElementById('tree');

  function renderSkills() {
    var t = target();
    document.getElementById('col-skills').innerHTML =
      '<p class="col-title">8 life skills</p>' +
      D.skills.map(function (s) {
        var n = Math.min(creditsIn(s.k), t);
        return '<button class="node" role="listitem" data-skill="' + s.k + '" style="' + skillVars(s) + '"' +
          (state.skill === s.k ? ' aria-current="true"' : '') + '>' +
          '<span class="badge">' + icon(s.i) + '</span>' +
          '<span class="node-text"><span class="node-name">' + esc(s.n) + '</span>' +
          '<span class="node-sub">' + S[s.k].count + ' challenge' + (S[s.k].count === 1 ? '' : 's') + '</span></span>' +
          (guideMode() ? '' : '<span class="prog">' + n + '/' + t + '</span>') + '</button>';
      }).join('');
  }

  function renderSubs() {
    var el = document.getElementById('col-subs');
    if (!state.skill) {
      el.innerHTML = '<p class="col-title">Subskills</p><p class="empty-col">Choose a life skill to see what it’s made of.</p>';
      return;
    }
    var s = SK[state.skill], node = S[state.skill];
    el.innerHTML = '<button class="back" data-back="0">' + icon('chevron-left') + 'All life skills</button>' +
      '<div class="skill-intro" style="' + skillVars(s) + '"><b>' + esc(s.n) + '</b><span>' + esc(s.d) + '</span></div>' +
      '<p class="col-title">Subskills</p>' +
      (node.subs.length ? node.subs.map(function (name) {
        return '<button class="node sub" data-sub="' + esc(name) + '" style="' + skillVars(s) + '"' +
          (state.sub === name ? ' aria-current="true"' : '') + '>' +
          '<span class="badge">' + icon(D.subIcons[name] || s.i) + '</span>' +
          '<span class="node-text"><span class="node-name">' + esc(name) + '</span>' +
          '<span class="node-sub">' + node.bySub[name].count + ' challenge' + (node.bySub[name].count === 1 ? '' : 's') + '</span></span>' +
          icon('chevron-right').replace('class="ic"', 'class="ic chev"') + '</button>';
      }).join('') : '<p class="empty-col">' + (filtersOn() ? 'No challenges here match your filters. Switch a filter off to see more.' : 'No challenges in this life skill for your grades yet.') + '</p>');
  }

  function chRow(c, idea) {
    var on = picks.indexOf(c.id) >= 0;
    var tags = '';
    if (c.z === 'Epic') tags += '<span class="tag">' + icon('flag') + 'Epic, 2 credits</span>';
    if (c.lab) tags += '<span class="tag">' + icon('users') + 'Recommended Lab</span>';
    if (c.h) tags += '<span class="tag">' + icon('house') + 'Can do at home</span>';
    if (anyHobby(c)) tags += '<span class="tag tag-hob">' + icon('sparkles') + 'Bring your hobby</span>';
    if (c.b === 'K–1') tags += '<span class="tag">' + icon('users') + 'Guide-led</span>';
    if (c.gate) tags += '<span class="tag">' + icon('shield-alert') + 'Safety Gate</span>';
    return '<div class="ch"><button class="ch-open" data-open="' + c.id + '"><span class="ch-text">' + esc(c.t) + '</span>' +
      (idea ? '<span class="ch-idea">' + esc(idea) + '</span>' : '') +
      (tags ? '<span class="tags">' + tags + '</span>' : '') + '</button>' +
      (c.b === 'K–1' ? '' : '<button class="pick" data-pick="' + c.id + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove from my plan' : 'Save to my plan') + '">' +
      icon(on ? 'bookmark-check' : 'bookmark') + '</button>') + '</div>';
  }
  function compBlock(cid, list) {
    var comp = D.comps[cid], s = SK[comp.k];
    var im = imgFor(cid);
    return '<div class="comp has-img" style="' + skillVars(s) + '">' +
      (im ? '<img class="comp-img" src="img/' + cid + '.jpg" alt="" loading="lazy" width="960" height="360">'
          : '<div class="comp-img comp-band" aria-hidden="true">' + icon(comp.i) + '</div>') +
      '<h3>' + icon(comp.i) + esc(comp.n) + '</h3>' +
      list.map(function (c) { return chRow(c); }).join('') + '</div>';
  }

  function renderComps() {
    var el = document.getElementById('col-comps');
    if (!state.skill || !state.sub) {
      el.innerHTML = '<p class="col-title">Challenges</p><p class="empty-col">' +
        (state.skill ? 'Choose a subskill to see its challenges.' : 'Your challenges appear here.') + '</p>';
      return;
    }
    var sub = S[state.skill].bySub[state.sub];
    el.innerHTML = '<button class="back" data-back="1">' + icon('chevron-left') + esc(SK[state.skill].n) + '</button>' +
      '<p class="col-title">' + esc(state.sub) + '</p>' +
      sub.comps.map(function (cid) { return compBlock(cid, sub.byComp[cid]); }).join('');
  }

  function level() { return state.sub ? 2 : state.skill ? 1 : 0; }

  // Connector lines from the chosen node to the next column (wide screens only)
  function drawLinks() {
    var svg = document.getElementById('links');
    if (getComputedStyle(svg).display === 'none') return;
    var box = tree.getBoundingClientRect(), paths = '';
    function link(from, toEls, color) {
      if (!from || !toEls.length) return;
      var a = from.getBoundingClientRect();
      var x1 = a.right - box.left, y1 = a.top + a.height / 2 - box.top;
      toEls.forEach(function (to) {
        var b = to.getBoundingClientRect();
        var x2 = b.left - box.left, y2 = b.top + Math.min(b.height / 2, 28) - box.top;
        var mx = (x1 + x2) / 2;
        paths += '<path d="M' + x1 + ' ' + y1 + 'C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2 + '" stroke="' + color + '"/>';
      });
    }
    if (state.skill) {
      var col = SK[state.skill].col;
      link(tree.querySelector('#col-skills [aria-current="true"]'), Array.prototype.slice.call(tree.querySelectorAll('#col-subs .node.sub')), col);
      if (state.sub) link(tree.querySelector('#col-subs [aria-current="true"]'), Array.prototype.slice.call(tree.querySelectorAll('#col-comps .comp')), col);
    }
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    svg.innerHTML = paths;
  }

  function renderTree() {
    tree.setAttribute('data-level', String(level()));
    renderSkills(); renderSubs(); renderComps();
    requestAnimationFrame(drawLinks);
  }

  // ---------- search ----------
  // Whole words, not letters inside words: "art" finds "art" and "arts", never "start" or "heart".
  // A hobby word ("tech", "songwriting", "birdwatching") also finds challenges about that hobby,
  // then lists "Bring your hobby" challenges you could do through it at the bottom.
  function words(s) { return String(s).toLowerCase().match(/[a-z0-9:]+/g) || []; }
  var WORDS = {}, SYN = {};
  D.ch.forEach(function (c) {
    var comp = D.comps[c.c], set = {};
    words(c.t + ' ' + comp.n + ' ' + comp.s + ' ' + SK[comp.k].n).forEach(function (w) { set[w] = 1; });
    WORDS[c.id] = set;
  });
  Object.keys(D.hob || {}).forEach(function (k) { D.hob[k].syn.forEach(function (w) { SYN[w] = k; }); });
  function hobbyOf(term) {
    return SYN[term] || SYN[term.replace(/(es|s)$/, '')] || SYN[term.replace(/s$/, '')] || null;
  }
  function hasWord(set, term) {
    if (set[term] || set[term + 's'] || set[term + 'es']) return true;
    if (term.length < 4) return false;
    for (var w in set) if (w.indexOf(term) === 0) return true;
    return false;
  }
  // Word families: "photography" also finds "photo" and "camera"; "tech" finds "coding", "app", "micro:bit".
  var FAM = {};
  (D.fam || []).forEach(function (f) { f.forEach(function (w) { FAM[w] = (FAM[w] || []).concat(f); }); });
  function family(term) { return FAM[term] || FAM[term.replace(/(es|s)$/, '')] || FAM[term.replace(/s$/, '')] || []; }
  function termMatches(c, term) {
    var set = WORDS[c.id];
    if (hasWord(set, term)) return true;
    return family(term).some(function (w) { return set[w]; });
  }
  // Show a challenge's hobby idea only when it fits the hobby being searched (or works for any hobby).
  function ideaFor(c, hobs) {
    if (!c.hx) return '';
    if (anyHobby(c)) return c.hx;
    var lw = words(c.hx);
    return hobs.some(function (k) { return D.hob[k].syn.some(function (w) { return lw.indexOf(w) >= 0; }); }) ? c.hx : '';
  }
  function bySkillOrder(a, b) {
    var ka = D.skills.indexOf(SK[D.comps[a.c].k]), kb = D.skills.indexOf(SK[D.comps[b.c].k]);
    return ka - kb || compNum(a.c) - compNum(b.c) || chNum(a.id) - chNum(b.id);
  }
  function renderSearch() {
    var box = document.getElementById('search-results');
    var terms = words(state.q);
    var on = terms.length > 0;
    var wasOn = !box.hidden;
    box.hidden = !on; tree.hidden = on;
    if (!on) return;
    if (!wasOn) {
      var head = document.getElementById('explore-title');
      try { head.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { head.scrollIntoView(); }
    }
    var pool = D.ch.filter(passes);
    var hits = pool.filter(function (c) {
      return terms.every(function (t) { return termMatches(c, t); });
    }).sort(bySkillOrder);
    var hitIds = {}; hits.forEach(function (c) { hitIds[c.id] = 1; });
    // Hobbies named in the search, in the order typed
    var hobs = [];
    terms.forEach(function (t) { var k = hobbyOf(t); if (k && hobs.indexOf(k) < 0) hobs.push(k); });
    var extra = guideMode() || !hobs.length ? [] : pool.filter(function (c) {
      if (hitIds[c.id] || !c.hob) return false;
      return anyHobby(c) || hobs.some(function (k) { return c.hob.indexOf(k) >= 0; });
    }).sort(function (a, b) {
      // challenges that name this hobby come before the "any hobby" ones
      return (anyHobby(a) - anyHobby(b)) || bySkillOrder(a, b);
    });
    var html = '';
    if (hits.length) {
      var groups = [], by = {};
      hits.forEach(function (c) { if (!by[c.c]) { by[c.c] = []; groups.push(c.c); } by[c.c].push(c); });
      html += '<p class="col-title">' + hits.length + ' match' + (hits.length === 1 ? '' : 'es') + ' in grades ' + esc(state.band) + '</p>' +
        groups.map(function (cid) { return compBlock(cid, by[cid]); }).join('');
    } else {
      html += '<p class="empty-col">No grades ' + esc(state.band) + ' challenges name “' + esc(state.q) + '”' +
        (filtersOn() ? ' with these filters on' : '') + '.' + (extra.length ? ' But you can bring it to the challenges below.' : ' Try a shorter word, or clear the search to explore by life skill.') + '</p>';
    }
    if (extra.length) {
      var names = hobs.map(function (k) { return D.hob[k].n.toLowerCase(); }).join(' or ');
      html += '<section class="hob-more"><h3>' + icon('sparkles') + 'Bring your hobby: ' + extra.length + ' more you can do through ' + esc(names) + '</h3>' +
        '<p class="muted">These don’t mention ' + esc(names) + ', but you can do them through it. Tell your guide how you’ll use it.</p>' +
        extra.map(function (c, i) {
          var s = SK[D.comps[c.c].k];
          var sub = '';
          if (i === 0 && !anyHobby(c)) sub = '<p class="hob-sub">Good fits for ' + esc(names) + '</p>';
          if (anyHobby(c) && (i === 0 || !anyHobby(extra[i - 1]))) sub = '<p class="hob-sub">Works with any hobby</p>';
          return sub + '<div class="hob-item" style="' + skillVars(s) + '"><p class="hob-skill">' + icon(s.i) + esc(s.n) + ' › ' + esc(D.comps[c.c].n) + '</p>' +
            chRow(c, ideaFor(c, hobs)) + '</div>';
        }).join('') + '</section>';
    }
    box.innerHTML = html;
  }

  // ---------- detail sheet ----------
  var detail = document.getElementById('detail');
  var lastFocus = null;
  function openDetail(id) {
    var c = BYID[id]; if (!c) return;
    var comp = D.comps[c.c], s = SK[comp.k];
    var on = picks.indexOf(c.id) >= 0;
    var h = '<button class="icon-btn d-close" data-close aria-label="Close">' + icon('x') + '</button>' +
      '<div class="d-band" style="' + skillVars(s) + '"><span class="badge">' + icon(comp.i) + '</span>' +
      '<p class="d-crumb">' + esc(s.n) + ' › ' + esc(comp.s) + ' › ' + esc(comp.n) + '</p></div>' +
      (imgFor(c.c) ? '<img class="d-img" src="img/' + c.c + '.jpg" alt="">' : '<div class="d-img comp-band" style="' + skillVars(s) + '" aria-hidden="true">' + icon(comp.i) + '</div>') +
      '<h2 id="d-title" class="d-title">' + esc(c.t) + '</h2>' +
      '<div class="facts">' +
      '<div class="fact"><b>Grades</b>' + esc(c.gr) + '</div>' +
      '<div class="fact"><b>Time</b>' + esc(c.b === 'K–1' && c.z === 'Week' ? 'Guide-led: a day or longer, as it needs' : c.tm) + '</div>' +
      '<div class="fact"><b>Credits</b>' + c.cr + '</div>' +
      '<div class="fact"><b>How you show it</b>' + esc(c.w) + '</div>' +
      '</div>';
    if (c.gate) h += '<div class="callout"><b>Safety Gate.</b> Pass this before: ' + esc(c.gate) + '. A guide or certified instructor checks it.</div>';
    if (c.how && c.how.length) {
      h += '<div class="sheet-sec"><h3>' + (c.b === 'K–1' ? 'How to run it (for guides)' : 'How to do it') + '</h3><ol class="cps steps-list">' +
        c.how.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>';
    }
    if (c.st && c.st.length) {
      h += '<div class="sheet-sec"><h3>' + (c.z === 'Epic' ? 'Checkpoints' : 'Stages') + '</h3><ol class="cps">' +
        c.st.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>';
    }
    if (c.hob && c.hob.length && c.b !== 'K–1') {
      var specific = c.hob.filter(function (k) { return k !== '*' && D.hob[k]; });
      h += '<div class="sheet-sec hob-sec"><h3>' + icon('sparkles') + 'Bring your hobby</h3>' +
        (anyHobby(c) ? '<p><b>Any hobby works.</b> Do this through the thing you already love, and tell your guide how.</p>' : '') +
        (specific.length ? '<p class="hob-chips">' + (anyHobby(c) ? 'Especially good for: ' : 'Good for: ') + specific.map(function (k) {
          return '<span class="tag">' + icon(D.hob[k].i) + esc(D.hob[k].n) + '</span>';
        }).join('') + '</p>' : '') +
        (c.hx ? '<p class="hob-idea">' + esc(c.hx) + '</p>' : '') + '</div>';
    }
    h += '<div class="sheet-sec"><h3>Where to learn</h3>';
    if (c.r && c.r.length) {
      h += '<ul class="res">' + c.r.map(function (i) {
        var r = D.res[i];
        return '<li><a href="' + esc(r[2]) + '" target="_blank" rel="noopener">' + esc(r[0]) + icon('external-link') + '</a> <small>' + esc(r[1]) + '</small></li>';
      }).join('') + '</ul>';
    } else {
      h += '<p>No outside lesson for this one: you learn it by doing, with the steps above and your crew. Ask your guide if you get stuck.</p>';
    }
    h += '</div><div class="sheet-actions">' + (c.b === 'K–1' ? '' : '<button class="btn" data-pick="' + c.id + '" aria-pressed="' + on + '">' +
      icon(on ? 'bookmark-check' : 'bookmark') + (on ? 'Saved to my plan' : 'Save to my plan') + '</button>') +
      '<button class="btn ghost" data-close>Back</button></div>';
    if (imgFor(c.c)) h += '<p class="credit">' + credit(imgFor(c.c)) + '</p>';
    document.getElementById('detail-body').innerHTML = h;
    if (!detail.open) { lastFocus = document.activeElement; detail.showModal(); }
    detail.querySelector('.d-close').focus();
  }
  detail.addEventListener('close', function () {
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  });

  // ---------- picks ----------
  var picksDlg = document.getElementById('picks');
  function setPick(id, on) {
    var i = picks.indexOf(id);
    if (on && i < 0) picks.push(id);
    if (!on && i >= 0) picks.splice(i, 1);
    save('wl-picks', picks);
    refreshPicks();
  }
  function refreshPicks() {
    document.getElementById('picks-count').textContent = picks.length;
    Array.prototype.forEach.call(document.querySelectorAll('[data-pick]'), function (b) {
      var on = picks.indexOf(b.dataset.pick) >= 0;
      b.setAttribute('aria-pressed', String(on));
      if (b.classList.contains('pick')) {
        b.setAttribute('aria-label', on ? 'Remove from my plan' : 'Save to my plan');
        b.innerHTML = icon(on ? 'bookmark-check' : 'bookmark');
      } else {
        b.innerHTML = icon(on ? 'bookmark-check' : 'bookmark') + (on ? 'Saved to my plan' : 'Save to my plan');
      }
    });
    renderYear();
    // update the progress pills without rebuilding the tree (keeps focus)
    var t = target();
    Array.prototype.forEach.call(document.querySelectorAll('#col-skills .node'), function (n) {
      var pill = n.querySelector('.prog');
      if (pill) pill.textContent = Math.min(creditsIn(n.dataset.skill), t) + '/' + t;
    });
    if (picksDlg.open) renderPicks();
  }
  function renderPicks() {
    var list = picks.map(function (id) { return BYID[id]; }).filter(Boolean);
    var credits = list.reduce(function (a, c) { return a + (c.cr || 1); }, 0);
    document.getElementById('picks-sum').textContent = list.length
      ? list.length + ' in your plan, worth ' + credits + ' credit' + (credits === 1 ? '' : 's') + ' when you pass them.'
      : 'Your plan is empty. Tap the bookmark next to any challenge to add it.';
    document.getElementById('picks-actions').hidden = !list.length;
    document.getElementById('picks-list').innerHTML = list.map(function (c) {
      var s = SK[D.comps[c.c].k];
      return '<li style="--c:' + s.col + '"><button class="open" data-open="' + c.id + '"><span class="sk">' + esc(s.n) + (c.z === 'Epic' ? ', Epic' : '') + ', grades ' + esc(c.b) + '</span>' + esc(c.t) + '</button>' +
        '<button class="icon-btn" data-unpick="' + c.id + '" aria-label="Remove from my plan">' + icon('x') + '</button></li>';
    }).join('');
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function planLink() {
    return location.origin + location.pathname + '#plan=' + picks.join(',');
  }
  function copyText(text, msg) {
    var done = function () { toast(msg); };
    try {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } catch (err) { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  // ---------- events ----------
  function renderAll() {
    S = structure();
    Array.prototype.forEach.call(document.querySelectorAll('.band'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.band === state.band));
    });
    document.getElementById('k1-note').hidden = !guideMode();
    document.getElementById('year').hidden = guideMode();
    // K–1 is guide-led in Labs: no home work, no hobby picks
    ['home', 'any'].forEach(function (k) {
      var b = document.querySelector('[data-filter="' + k + '"]');
      if (b) b.hidden = guideMode();
      if (guideMode()) state.f[k] = false;
    });
    syncFilters(); fixSelection();
    renderYear(); renderTree(); renderSearch(); refreshPicks();
  }
  function syncFilters() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-filter]'), function (b) {
      b.setAttribute('aria-pressed', String(!!state.f[b.dataset.filter]));
    });
    var clear = document.getElementById('clear-filters');
    if (clear) clear.hidden = !filtersOn();
  }
  // Keep the open subskill valid after filters or the band change
  function fixSelection() {
    S = structure();
    if (state.skill && state.sub && !S[state.skill].bySub[state.sub]) {
      state.sub = window.matchMedia('(max-width:820px)').matches ? null : (S[state.skill].subs[0] || null);
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, a');
    if (!t) return;
    if (t.dataset.filter) {
      state.f[t.dataset.filter] = !state.f[t.dataset.filter];
      syncFilters(); fixSelection(); renderTree(); renderSearch();
      return;
    }
    if (t.id === 'clear-filters') {
      Object.keys(state.f).forEach(function (k) { state.f[k] = false; });
      syncFilters(); fixSelection(); renderTree(); renderSearch();
      return;
    }
    if (t.dataset.band) {
      state.band = t.dataset.band; save('wl-band', state.band);
      if (state.skill && state.sub && !S[state.skill]) state.sub = null;
      state.sub = null; renderAll(); return;
    }
    if (t.dataset.skill) {
      var fromYear = t.classList.contains('ys');
      state.skill = (state.skill === t.dataset.skill && !fromYear) ? null : t.dataset.skill;
      state.sub = null;
      if (state.q) { state.q = ''; document.getElementById('q').value = ''; renderSearch(); }
      renderYear(); renderTree();
      if (fromYear || window.matchMedia('(max-width:820px)').matches) tree.scrollIntoView({ block: 'start' });
      return;
    }
    if (t.dataset.sub !== undefined && t.classList.contains('sub')) {
      state.sub = state.sub === t.dataset.sub ? null : t.dataset.sub;
      renderTree();
      if (window.matchMedia('(max-width:820px)').matches) tree.scrollIntoView({ block: 'start' });
      return;
    }
    if (t.dataset.back !== undefined) {
      if (t.dataset.back === '0') { state.skill = null; state.sub = null; } else { state.sub = null; }
      renderYear(); renderTree(); tree.scrollIntoView({ block: 'start' }); return;
    }
    if (t.dataset.pick) { setPick(t.dataset.pick, picks.indexOf(t.dataset.pick) < 0); return; }
    if (t.dataset.unpick) { setPick(t.dataset.unpick, false); return; }
    if (t.dataset.open) { if (picksDlg.open) picksDlg.close(); openDetail(t.dataset.open); return; }
    if (t.hasAttribute('data-close')) { t.closest('dialog').close(); return; }
    if (t.id === 'open-picks') { lastFocus = t; renderPicks(); picksDlg.showModal(); return; }
    if (t.id === 'copy-picks') {
      copyText('My Wilderland plan\n\n' + picks.map(function (id) {
        var c = BYID[id]; return '- ' + c.t + ' (' + SK[D.comps[c.c].k].n + ', ' + c.id + ')';
      }).join('\n') + '\n\nOpen my plan: ' + planLink(), 'Plan copied');
      return;
    }
    if (t.dataset.copyLink !== undefined) {
      if (!picks.length) { toast('Save a challenge to your plan first'); return; }
      copyText(planLink(), 'Plan link copied. Paste it anywhere to keep it.'); return;
    }
    if (t.id === 'clear-picks') { picks = []; save('wl-picks', picks); refreshPicks(); toast('Plan cleared'); return; }
  });
  [detail, picksDlg].forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
  });
  picksDlg.addEventListener('close', function () { if (lastFocus && document.contains(lastFocus) && !detail.open) lastFocus.focus(); });

  var qTimer;
  document.getElementById('q').addEventListener('input', function (e) {
    clearTimeout(qTimer);
    qTimer = setTimeout(function () { state.q = e.target.value.trim(); renderSearch(); if (!state.q) requestAnimationFrame(drawLinks); }, 120);
  });
  var rTimer;
  window.addEventListener('resize', function () { clearTimeout(rTimer); rTimer = setTimeout(drawLinks, 100); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLinks);

  // ---------- photo credits ----------
  (function () {
    var el = document.getElementById('credits-list');
    if (!el || !D.img) return;
    el.innerHTML = Object.keys(D.img).sort().map(function (cid) {
      return '<li><b>' + esc(D.comps[cid].n) + '.</b> ' + credit(D.img[cid]) + '</li>';
    }).join('');
    document.getElementById('credits').hidden = !Object.keys(D.img).length;
  })();

  // ---------- a plan link restores a plan on any device ----------
  (function () {
    var m = /^#plan=([A-Z0-9.,\-]*)$/.exec(location.hash);
    if (!m) return;
    var ids = m[1].split(',').filter(function (id) { return BYID[id]; });
    if (ids.length) { picks = ids; save('wl-picks', picks); setTimeout(function () { toast('Your plan is loaded'); }, 400); }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  })();

  // ---------- start ----------
  state.skill = 'EN';
  if (!window.matchMedia('(max-width:820px)').matches) state.sub = S.EN.subs[0] || null;
  else state.skill = null;
  renderAll();
})();
