(function () {
  "use strict";

  /* =========================================================================
     NBA LAB — lógica de la web (sin librerías, sin módulos)
     ========================================================================= */
  var BRAND = window.__BRAND__ || {};
  var IDX = window.__NBA_INDEX__ || { players: [] };
  var SCHED = (window.__NBA_SCHEDULE__ && window.__NBA_SCHEDULE__.games) ? window.__NBA_SCHEDULE__ : null;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "] falló:", e); } }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (_) { return null; } }

  /* ---------- formato español ---------- */
  function fmt(x, d) {
    if (x == null || isNaN(x)) return "—";
    return Number(x).toFixed(d == null ? 1 : d).replace(".", ",");
  }
  var MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  function fdate(iso, long) {
    var p = String(iso).split("-");
    if (p.length < 3) return iso;
    return long ? (+p[2]) + " " + MES[+p[1] - 1] + " " + p[0] : p[2] + "/" + p[1];
  }
  function initials(n) { return String(n).split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join(""); }
  function photoHTML(p, cls) {
    var url = BRAND.photoUrl ? BRAND.photoUrl(p.id) : "";
    return '<div class="' + (cls || "mini-photo") + '"><span class="ini">' + esc(initials(p.n)) + "</span>" +
      (url ? '<img src="' + esc(url) + '" alt="" loading="lazy" onerror="this.remove()">' : "") + "</div>";
  }
  function niceStep(raw) {
    var m = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))));
    var c = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < c.length; i++) if (c[i] * m >= raw) return c[i] * m;
    return 10 * m;
  }
  function lineDefault(avgV) { return avgV == null ? 0.5 : Math.max(0.5, Math.floor(avgV) + 0.5); }

  /* =========================================================================
     Definición de estadísticas (mercados de apuestas)
     ========================================================================= */
  function k(key) { return function (g) { return g[key]; }; }
  function S(key, label, short, group, calc, opt) {
    var s = { k: key, l: label, s: short, g: group, calc: calc, d: 1 };
    for (var o in opt || {}) s[o] = opt[o];
    return s;
  }
  var STATS = [
    S("pts", "Puntos", "PTS", "Generales", k("pts")),
    S("reb", "Rebotes", "REB", "Generales", k("reb")),
    S("ast", "Asistencias", "AST", "Generales", k("ast")),
    S("stl", "Robos", "ROB", "Generales", k("stl")),
    S("blk", "Tapones", "TAP", "Generales", k("blk")),
    S("tov", "Pérdidas", "PÉR", "Generales", k("tov")),
    S("min", "Minutos", "MIN", "Generales", k("min")),
    S("pf", "Faltas personales", "FP", "Generales", k("pf")),
    S("pra", "Puntos + Rebotes + Asistencias", "PRA", "Combinadas", function (g) { return g.pts + g.reb + g.ast; }),
    S("pr", "Puntos + Rebotes", "P+R", "Combinadas", function (g) { return g.pts + g.reb; }),
    S("pa", "Puntos + Asistencias", "P+A", "Combinadas", function (g) { return g.pts + g.ast; }),
    S("ra", "Rebotes + Asistencias", "R+A", "Combinadas", function (g) { return g.reb + g.ast; }),
    S("sb", "Robos + Tapones", "ROB+TAP", "Combinadas", function (g) { return g.stl + g.blk; }),
    S("fg3m", "Triples anotados", "3PM", "Tiro", k("fg3m")),
    S("fg3a", "Triples intentados", "3PA", "Tiro", k("fg3a")),
    S("fg3p", "% de triples", "3P%", "Tiro", function (g) { return g.fg3a ? g.fg3m / g.fg3a * 100 : null; }, { pct: ["fg3m", "fg3a"] }),
    S("fgm", "Tiros de campo anotados", "TCM", "Tiro", k("fgm")),
    S("fga", "Tiros de campo intentados", "TCI", "Tiro", k("fga")),
    S("fgp", "% tiro de campo", "TC%", "Tiro", function (g) { return g.fga ? g.fgm / g.fga * 100 : null; }, { pct: ["fgm", "fga"] }),
    S("ftm", "Tiros libres anotados", "TLM", "Tiro", k("ftm")),
    S("fta", "Tiros libres intentados", "TLI", "Tiro", k("fta")),
    S("ftp", "% tiros libres", "TL%", "Tiro", function (g) { return g.fta ? g.ftm / g.fta * 100 : null; }, { pct: ["ftm", "fta"] }),
    S("oreb", "Rebotes ofensivos", "REB-O", "Avanzadas", k("oreb")),
    S("dreb", "Rebotes defensivos", "REB-D", "Avanzadas", k("dreb")),
    S("pm", "Más / menos", "+/-", "Avanzadas", k("pm")),
    S("usg", "Usage rate", "USG%", "Avanzadas", k("usg")),
    S("ts", "True shooting %", "TS%", "Avanzadas", k("ts")),
    S("efg", "Effective FG %", "eFG%", "Avanzadas", k("efg")),
    S("ortg", "Offensive rating", "ORTG", "Avanzadas", k("ortg")),
    S("drtg", "Defensive rating", "DRTG", "Avanzadas", k("drtg")),
    S("pace", "Pace", "PACE", "Avanzadas", k("pace"))
  ];
  var STAT = {};
  STATS.forEach(function (s) { STAT[s.k] = s; });
  var MAIN = ["pts", "reb", "ast", "pra", "pr", "pa", "ra", "fg3m", "fg3a", "stl", "blk", "sb", "tov", "min", "pf", "fgm", "fga", "ftm", "fta", "fgp", "fg3p", "ftp", "usg", "ts", "ortg", "drtg", "pace"];

  function val(s, g) { var x = s.calc(g); return (x == null || isNaN(x)) ? null : x; }
  function vals(s, games) { var out = []; games.forEach(function (g) { var x = val(s, g); if (x != null) out.push(x); }); return out; }
  function avgOf(s, games) {
    if (!games.length) return null;
    if (s.pct) {
      var m = 0, a = 0;
      games.forEach(function (g) { m += g[s.pct[0]] || 0; a += g[s.pct[1]] || 0; });
      return a ? m / a * 100 : null;
    }
    var xs = vals(s, games);
    return xs.length ? xs.reduce(function (p, c) { return p + c; }, 0) / xs.length : null;
  }
  /* Lado del gráfico: "over" (Más de) o "under" (Menos de). Se recuerda en el navegador. */
  var SIDE = store("nl-side") === "under" ? "under" : "over";
  function setSide(v) { SIDE = v === "under" ? "under" : "over"; store("nl-side", SIDE); }
  function hitGood(x, line) { return SIDE === "under" ? x < line : x > line; }
  function sideTxt() { return SIDE === "under" ? "Menos de" : "Más de"; }
  function sideSegHTML(attr) {
    return '<div class="seg side-seg" ' + attr + ' title="Ver aciertos del Más o del Menos"><button type="button" data-v="over"' + (SIDE === "over" ? ' class="on"' : "") + '>Más</button><button type="button" data-v="under"' + (SIDE === "under" ? ' class="on"' : "") + ">Menos</button></div>";
  }
  function legendHTML() {
    return '<span><i class="sq" style="background:var(--over)"></i>Acierto del ' + (SIDE === "under" ? "Menos" : "Más") + '</span><span><i class="sq" style="background:var(--under)"></i>Fallo</span>';
  }
  function hitOf(s, games, line) {
    var xs = vals(s, games);
    if (!xs.length) return null;
    var o = 0, pu = 0;
    xs.forEach(function (x) { if (hitGood(x, line)) o++; else if (x === line) pu++; });
    return { o: o, n: xs.length, push: pu, p: o / xs.length * 100 };
  }
  function pctColor(p) {
    if (p == null) return "";
    var t = (p - 50) / 50;
    if (t >= 0) return "background:rgba(25,240,139," + (0.08 + t * 0.5).toFixed(2) + ");color:" + (t > .35 ? "#eafff4" : "#9ff7cc");
    return "background:rgba(255,71,102," + (0.08 - t * 0.5).toFixed(2) + ");color:" + (t < -.35 ? "#fff0f3" : "#ffb0be");
  }
  function pctCell(h) {
    if (!h) return '<span class="pct" style="color:var(--dim)">—</span>';
    return '<span class="pct" style="' + pctColor(h.p) + '">' + Math.round(h.p) + "%</span>";
  }

  /* =========================================================================
     Comunes: estado de actualización, tooltip, revelados
     ========================================================================= */
  function initStatus() {
    var el = $("[data-status]");
    if (!el) return;
    if (!IDX.players || !IDX.players.length) {
      el.innerHTML = '<span class="badge warn">Sin datos</span>';
      return;
    }
    var u = String(IDX.updated || "");
    var when = u ? fdate(u.slice(0, 10)) + " " + u.slice(11, 16) : "—";
    el.innerHTML = '<span class="txt">Actualizado ' + esc(when) + "</span>" +
      (IDX.sample ? '<span class="badge warn" title="Ejecuta tools/actualizar_datos.py para cargar datos reales">DATOS DE EJEMPLO</span>'
                  : '<span class="badge ok">' + esc(IDX.season || "") + "</span>");
    $$("[data-source]").forEach(function (s) { s.textContent = "Fuente: " + (IDX.source || "—"); });
  }

  var TIP = null;
  function tipShow(html, x, y) {
    TIP = TIP || $("[data-tip]");
    if (!TIP) return;
    TIP.innerHTML = html;
    TIP.hidden = false;
    var w = TIP.offsetWidth || 200;
    var cx = Math.max(w / 2 + 8, Math.min(window.innerWidth - w / 2 - 8, x));
    var cy = Math.max(TIP.offsetHeight + 24, y);
    TIP.style.left = cx + "px";
    TIP.style.top = cy + "px";
  }
  function tipHide() { if (TIP) TIP.hidden = true; }
  window.addEventListener("scroll", tipHide, { passive: true });

  function initReveals() {
    var els = $$(".reveal");
    if (!els.length || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("js-io");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.01, rootMargin: "0px 0px -5% 0px" });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () { els.forEach(function (el) { el.classList.add("in"); }); }, 6000);
  }

  function initTelegram() {
    var tg = BRAND.telegram || {};
    if (tg.url) $$("[data-tg]").forEach(function (a) { a.setAttribute("href", tg.url); });
    if (tg.handle) {
      $$("[data-tg-text]").forEach(function (el) { el.textContent = tg.handle + (tg.members ? " · " + tg.members : ""); });
      $$("[data-tg-handle]").forEach(function (el) { el.textContent = "Telegram " + tg.handle; });
    }
    var fl = $(".tg-float");
    if (!fl) return;
    var block = $(".tg-block");
    function upd() {
      var past = window.pageYOffset > 500;
      var r = block ? block.getBoundingClientRect() : null;
      var blockVisible = r && r.top < window.innerHeight && r.bottom > 0;
      fl.classList.toggle("show", past && !blockVisible);
    }
    window.addEventListener("scroll", upd, { passive: true });
    upd();
  }

  function initMouseGradient() {
    var hero = $(".hero, .p-hero");
    if (!hero) return;
    var raf = 0, tx = 30, ty = 40, x = 30, y = 40;
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width * 100;
      ty = (e.clientY - r.top) / r.height * 100;
      if (!raf) raf = requestAnimationFrame(step);
    });
    function step() {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      hero.style.setProperty("--mx", x.toFixed(2) + "%");
      hero.style.setProperty("--my", y.toFixed(2) + "%");
      raf = (Math.abs(tx - x) + Math.abs(ty - y) > 0.2) ? requestAnimationFrame(step) : 0;
    }
  }

  /* =========================================================================
     PORTADA
     ========================================================================= */
  function idxVal(p, key, i) {
    var L = p.l20;
    if (STAT[key] && L[key]) return L[key][i];
    var c = { pra: ["pts", "reb", "ast"], pr: ["pts", "reb"], pa: ["pts", "ast"], ra: ["reb", "ast"], sb: ["stl", "blk"] }[key];
    if (!c) return null;
    return c.reduce(function (a, kk) { return a + (L[kk] ? L[kk][i] : 0); }, 0);
  }
  function idxSeries(p, key) {
    var n = (p.l20.pts || []).length, out = [];
    for (var i = 0; i < n; i++) out.push(idxVal(p, key, i));
    return out;
  }
  function idxAvg(p, key) {
    var a = p.avg;
    if (a[key] != null) return a[key];
    var c = { pra: ["pts", "reb", "ast"], pr: ["pts", "reb"], pa: ["pts", "ast"], ra: ["reb", "ast"], sb: ["stl", "blk"] }[key];
    return c ? c.reduce(function (s, kk) { return s + (a[kk] || 0); }, 0) : 0;
  }
  // Cada jugador tiene su propia página (jugador-santi-aldama.html) para que Google la indexe.
  var SLUGS = null;
  function slugOf(id) {
    if (!SLUGS) { SLUGS = {}; IDX.players.forEach(function (p) { if (p.sl) SLUGS[p.id] = p.sl; }); }
    return SLUGS[id];
  }
  function pUrl(id, vs) {
    var sl = slugOf(id);
    var u = sl ? "jugador-" + sl + ".html" : "jugador.html?id=" + encodeURIComponent(id);
    if (vs) u += (u.indexOf("?") >= 0 ? "&" : "?") + "vs=" + encodeURIComponent(vs);
    return u;
  }

  function mountCounters() {
    var games = IDX.players.reduce(function (a, p) { return a + (p.tot || p.gp || 0); }, 0);
    var tgt = { players: IDX.players.length, games: games };
    $$("[data-count]").forEach(function (el) {
      var to = tgt[el.dataset.count] != null ? tgt[el.dataset.count] : +el.textContent || 0;
      var t0 = performance.now(), dur = 1300;
      (function tick(t) {
        var k2 = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k2, 3);
        el.textContent = Math.round(to * e).toLocaleString("es-ES");
        if (k2 < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  function mountTicker() {
    var tr = $("[data-ticker]");
    if (!tr || tr.children.length) return;
    var items = IDX.players.slice(0, 40).map(function (p) {
      var s = idxSeries(p, "pts").slice(-5), l5 = s.reduce(function (a, b) { return a + b; }, 0) / (s.length || 1);
      var d = l5 - p.avg.pts, up = d >= 0;
      return '<span><b>' + esc(p.n.split(" ").slice(-1)[0]) + "</b> PTS L5 " + fmt(l5) +
        ' <span class="' + (up ? "up" : "down") + '">' + (up ? "▲ +" : "▼ ") + fmt(d) + "</span></span>";
    }).join("");
    tr.innerHTML = items + items;
  }

  function mountSuggest() {
    var inp = $("[data-hero-search]"), box = $("[data-suggest]");
    if (!inp || !box) return;
    var act = -1;
    function norm(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
    function render() {
      var q = norm(inp.value.trim());
      if (!q) { box.classList.remove("open"); box.innerHTML = ""; return; }
      var res = IDX.players.filter(function (p) { return norm(p.n).indexOf(q) > -1 || norm(p.t) === q; }).slice(0, 7);
      act = -1;
      box.innerHTML = res.map(function (p) {
        return '<a href="' + pUrl(p.id) + '">' + photoHTML(p) + "<span><b>" + esc(p.n) + "</b><br><small style=\"margin:0\">" + esc(p.t) + " · " + esc(p.p) + "</small></span><small>" + fmt(p.avg.pts) + " PTS</small></a>";
      }).join("") || '<a href="#jugadores"><span>Sin resultados</span></a>';
      box.classList.add("open");
    }
    inp.addEventListener("input", render);
    inp.addEventListener("keydown", function (e) {
      var links = $$("a", box);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        act = (act + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
        links.forEach(function (l, i) { l.classList.toggle("active", i === act); });
      } else if (e.key === "Enter") {
        var l = links[act >= 0 ? act : 0];
        if (l) location.href = l.getAttribute("href");
      } else if (e.key === "Escape") { box.classList.remove("open"); }
    });
    document.addEventListener("click", function (e) { if (!box.contains(e.target) && e.target !== inp) box.classList.remove("open"); });
  }

  function sparkSVG(series, ref) {
    var n = series.length;
    if (!n) return "";
    var max = Math.max.apply(null, series.concat([ref * 1.3, 1]));
    var w = 200, h = 36, bw = w / n;
    var bars = series.map(function (v, i) {
      var bh = Math.max(2, v / max * (h - 2));
      return '<rect x="' + (i * bw + 1).toFixed(1) + '" y="' + (h - bh).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5" fill="' + (v > ref ? "var(--over)" : "var(--under)") + '" opacity=".85"/>';
    }).join("");
    var ry = h - ref / max * (h - 2);
    return '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none">' + bars +
      '<line x1="0" x2="' + w + '" y1="' + ry.toFixed(1) + '" y2="' + ry.toFixed(1) + '" stroke="var(--bet)" stroke-width="1.2" stroke-dasharray="3 3"/></svg>';
  }

  function mountGrid() {
    var grid = $("[data-grid]");
    if (!grid) return;
    var fS = $("[data-f-search]"), fT = $("[data-f-team]"), fP = $("[data-f-pos]"), fO = $("[data-f-sort]");
    var teams = {};
    IDX.players.forEach(function (p) { teams[p.t] = 1; });
    Object.keys(teams).sort().forEach(function (t) { fT.insertAdjacentHTML("beforeend", '<option value="' + esc(t) + '">' + esc(t) + "</option>"); });
    function norm(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
    function render() {
      var q = norm(fS.value.trim()), t = fT.value, pos = fP.value, so = fO.value;
      var list = IDX.players.filter(function (p) {
        return (!q || norm(p.n).indexOf(q) > -1) && (!t || p.t === t) && (!pos || String(p.p).indexOf(pos) > -1);
      });
      list.sort(function (a, b) { return so === "n" ? a.n.localeCompare(b.n) : idxAvg(b, so) - idxAvg(a, so); });
      $("[data-grid-empty]").hidden = list.length > 0;
      var filtering = !!(q || t || pos);
      var shown = filtering ? list.slice(0, 60) : list.slice(0, 10);
      var note = $("[data-grid-note]");
      if (note) note.textContent = filtering
        ? (list.length > 60 ? "Mostrando 60 de " + list.length + " jugadores. Afina la búsqueda para ver el resto." : "")
        : "Mostrando los 10 primeros. Usa el buscador o los filtros para encontrar a cualquier jugador.";
      grid.innerHTML = shown.map(function (p) {
        var s10 = idxSeries(p, "pts").slice(-10);
        return '<a class="p-card" href="' + pUrl(p.id) + '">' +
          '<div class="p-card-top">' + photoHTML(p) + "<div><h3>" + esc(p.n) + '</h3><div class="meta">' + esc(p.t) + " · " + esc(p.p || "—") + (p.j ? " · #" + esc(p.j) : "") + " · " + (p.gp || 0) + " PJ</div></div></div>" +
          '<div class="p-card-stats"><div><b>' + fmt(p.avg.pts) + "</b><span>PTS</span></div><div><b>" + fmt(p.avg.reb) + "</b><span>REB</span></div><div><b>" + fmt(p.avg.ast) + "</b><span>AST</span></div><div><b>" + fmt(p.avg.fg3m) + "</b><span>3PM</span></div></div>" +
          sparkSVG(s10, p.avg.pts) + '<div class="spark-label"><span>Puntos · últimos 10</span><span>media ' + fmt(p.avg.pts) + "</span></div></a>";
      }).join("");
    }
    [fS, fT, fP, fO].forEach(function (el) { el.addEventListener("input", render); });
    render();
    grid.addEventListener("pointermove", function (e) {
      var c = e.target.closest && e.target.closest(".p-card");
      if (!c) return;
      var r = c.getBoundingClientRect();
      c.style.setProperty("--cx", (e.clientX - r.left) + "px");
      c.style.setProperty("--cy", (e.clientY - r.top) + "px");
    });
  }

  function mountScanner() {
    var body = $("[data-scanner]");
    if (!body) return;
    var SC = ["pts", "reb", "ast", "pra", "pr", "pa", "ra", "fg3m", "fg3a", "stl", "blk", "sb", "tov", "min"];
    var DEF = { pts: 24.5, reb: 8.5, ast: 6.5, pra: 35.5, pr: 30.5, pa: 30.5, ra: 12.5, fg3m: 2.5, fg3a: 6.5, stl: 1.5, blk: 1.5, sb: 2.5, tov: 2.5, min: 32.5 };
    var sStat = $("[data-s-stat]"), sMode = $("[data-s-mode]"), sLine = $("[data-s-line]"), sSort = $("[data-s-sort]"), sUnder = $("[data-s-under]"), box = $("[data-s-linebox]");
    sStat.innerHTML = SC.map(function (kk) { return '<option value="' + kk + '">' + esc(STAT[kk].l) + " (" + esc(STAT[kk].s) + ")</option>"; }).join("");
    function rate(series, line, n, under) {
      var s = series.slice(-n).filter(function (x) { return x != null; });
      if (!s.length) return null;
      var o = s.filter(function (x) { return under ? x < line : x > line; }).length;
      return { p: o / s.length * 100, o: o, n: s.length };
    }
    function render() {
      var key = sStat.value, mode = sMode.value, under = sUnder.checked, fixed = parseFloat(String(sLine.value).replace(",", ".")) || 0;
      box.classList.toggle("disabled", mode === "avg" || mode === "casa");
      var side = under ? "u" : "o";
      var rows = IDX.players.filter(function (p) { return (p.l20.pts || []).length >= 5 && (mode !== "casa" || cuoMain(p.id, key) != null); }).map(function (p) {
        var ser = idxSeries(p, key), line = mode === "avg" ? lineDefault(idxAvg(p, key)) : mode === "casa" ? cuoMain(p.id, key) : fixed;
        var l10 = ser.slice(-10);
        return { p: p, ser: ser, line: line, odd: cuoBest(cuoAt(p.id, key, line), side), l5: rate(ser, line, 5, under), l10: rate(ser, line, 10, under), l20: rate(ser, line, 20, under),
          avg10: l10.reduce(function (a, b) { return a + b; }, 0) / (l10.length || 1) };
      });
      var so = sSort.value;
      rows.sort(function (a, b) {
        if (so === "avg10") return b.avg10 - a.avg10;
        return ((b[so] || {}).p || 0) - ((a[so] || {}).p || 0) || b.avg10 - a.avg10;
      });
      var note = $("[data-s-cuotas]");
      if (note) note.textContent = CUO ? (mode === "casa" ? rows.length + " jugadores con cuotas · " : "") + cuoStamp() + " · +18 · orientativas, compruébalas en la casa" : "";
      if (!rows.length) { body.innerHTML = '<tr><td colspan="8" class="muted">' + (mode === "casa" ? "Todavía no hay cuotas de este mercado para los próximos partidos." : "Sin jugadores.") + "</td></tr>"; return; }
      body.innerHTML = rows.slice(0, 60).map(function (r) {
        var bars = r.ser.slice(-10).map(function (v) {
          var mx = Math.max(r.line * 1.6, 1), h = Math.max(3, Math.min(26, v / mx * 26));
          return '<i class="' + ((under ? v < r.line : v > r.line) ? "o" : "") + '" style="height:' + h.toFixed(0) + 'px" title="' + fmt(v, 0) + '"></i>';
        }).join("");
        return "<tr>" +
          '<td><a class="player-cell" href="' + pUrl(r.p.id) + '">' + photoHTML(r.p) + "<span>" + esc(r.p.n) + "<small>" + esc(r.p.t) + " · " + esc(r.p.p) + "</small></span></a></td>" +
          '<td class="mono" style="color:var(--bet)">' + (under ? "U " : "O ") + fmt(r.line) + "</td>" +
          '<td class="odd-td">' + oddCell(r.odd) + "</td>" +
          "<td>" + pctCell(r.l5) + "</td><td>" + pctCell(r.l10) + "</td><td>" + pctCell(r.l20) + "</td>" +
          '<td class="mono">' + fmt(r.avg10) + '</td><td class="hide-sm"><span class="bars-mini">' + bars + "</span></td></tr>";
      }).join("");
    }
    sStat.addEventListener("change", function () { sLine.value = DEF[sStat.value]; render(); });
    [sMode, sLine, sSort, sUnder].forEach(function (el) { el.addEventListener("input", render); });
    $("[data-s-dec]").addEventListener("click", function () { sLine.value = Math.max(0.5, (+sLine.value || 0) - 1); render(); });
    $("[data-s-inc]").addEventListener("click", function () { sLine.value = (+sLine.value || 0) + 1; render(); });
    render();
    cuotasLoad().then(function () {
      if (!CUO || !CUO.casas.length) return;
      var hayAlguna = Object.keys(CUO.j || {}).some(function (id) { return cuoLines(id, sStat.value).length; });
      var opt = document.createElement("option"); opt.value = "casa"; opt.textContent = "Línea de la casa (próximos partidos)";
      sMode.insertBefore(opt, sMode.firstChild);
      var cs = $("[data-s-casa]");
      if (cs) {
        cs.innerHTML = '<option value="best">Mejor cuota</option>' + CUO.casas.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
        cs.value = casaPref(); cs.hidden = false;
        cs.addEventListener("change", function () { store("nl-casa", cs.value); render(); });
      }
      if (hayAlguna) sMode.value = "casa";
      render();
    });
  }


  /* --- gráfico de barras --- */
  function drawBars(host, s, shown, line, pool, showMin) {
    var W = Math.max(320, Math.round(host.clientWidth || 960)), pl = 34, pr = showMin ? 128 : 92, pt = 14;
    var n = shown.length, iw = W - pl - pr, bw = iw / Math.max(n, 1);
    var showLogos = bw >= 14, logoS = Math.min(24, Math.floor(bw * 0.78));
    var showRole = bw >= 14 && shown.some(function (g) { return g.st === 0 || g.st === 1; });
    var showVals = bw >= 20;
    var pb = 24 + (showLogos ? logoS + 8 : 0) + (showRole ? 13 : 0);
    var H = (W < 640 ? 250 : 300) + (pb - 26), ih = H - pt - pb;
    var labX = W - pr + (showMin ? 36 : 6), labW = pr - (showMin ? 38 : 8);
    var xs = shown.map(function (g) { return val(s, g); });
    var real = xs.filter(function (x) { return x != null; });
    var mx = Math.max.apply(null, real.concat([line, 1])) * 1.08;
    var tick = niceStep(mx / 4), nice = tick * Math.ceil(mx / tick);
    if (s.pct && nice > 100) { nice = 100; tick = 25; }
    var Y = function (v) { return pt + ih - v / nice * ih; };
    var out = ['<svg class="chart-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(s.l) + '">'];
    out.push('<g class="grid">');
    for (var v = 0; v <= nice + 1e-9; v += tick) {
      var yy = Y(v);
      out.push('<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy + '" y2="' + yy + '"/><text x="' + (pl - 6) + '" y="' + (yy + 4) + '" text-anchor="end">' + fmt(v, v % 1 ? 1 : 0) + "</text>");
    }
    out.push("</g>");
    out.push('<text class="wm" x="' + (pl + iw / 2).toFixed(0) + '" y="' + (pt + Math.min(ih * 0.2, 60) + 20).toFixed(0) + '" text-anchor="middle" font-size="' + Math.max(26, Math.min(64, iw / 9)).toFixed(0) + '">NBA-LAB</text>');
    // separadores de temporada
    for (var i = 1; i < n; i++) {
      if (shown[i].s !== shown[i - 1].s) {
        var sx = pl + i * bw;
        out.push('<line class="sep" x1="' + sx + '" x2="' + sx + '" y1="' + pt + '" y2="' + (pt + ih) + '"/><text class="sep-t" x="' + (sx + 4) + '" y="' + (pt + 10) + '">' + esc(shown[i].s) + "</text>");
      }
    }
    // barras
    var gap = n > 60 ? 0.18 : 0.26;
    xs.forEach(function (x, i2) {
      var w2 = Math.max(1, Math.min(64, bw * (1 - gap))), bx = pl + (i2 + 0.5) * bw - w2 / 2;
      if (x == null) { out.push('<rect class="bar p" data-i="' + i2 + '" x="' + bx.toFixed(1) + '" y="' + (pt + ih - 2) + '" width="' + w2.toFixed(1) + '" height="2"/>'); return; }
      var y0 = Y(Math.max(0, x)), hh = Math.max(2, pt + ih - y0);
      var c = x === line ? "p" : hitGood(x, line) ? "o" : "u";
      out.push('<rect class="bar ' + c + '" data-i="' + i2 + '" x="' + bx.toFixed(1) + '" y="' + (pt + ih - hh).toFixed(1) + '" width="' + w2.toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="' + Math.min(6, w2 / 4).toFixed(1) + '"/>');
      if (showVals && hh >= 16) out.push('<text class="bar-v" x="' + (bx + w2 / 2).toFixed(1) + '" y="' + (pt + ih - 5).toFixed(1) + '" text-anchor="middle" font-size="' + Math.min(13, w2 * 0.45).toFixed(0) + '">' + fmt(x, s.pct || x % 1 ? 1 : 0) + "</text>");
    });
    // fila inferior: rol (T/S) y escudo del rival
    shown.forEach(function (g, i3) {
      var cx = pl + (i3 + 0.5) * bw, yb = pt + ih + 4;
      if (showRole) { out.push('<text class="role-l" x="' + cx.toFixed(1) + '" y="' + (yb + 9) + '" text-anchor="middle">' + (g.st === 1 ? "T" : g.st === 0 ? "S" : "") + "</text>"); yb += 13; }
      if (showLogos) {
        var u = logoUrl(g.o);
        out.push('<text class="logo-t" x="' + cx.toFixed(1) + '" y="' + (yb + logoS / 2 + 3).toFixed(1) + '" text-anchor="middle" font-size="' + Math.max(7, Math.min(10, logoS * 0.4)).toFixed(0) + '">' + esc(g.o) + "</text>");
        if (u) out.push('<image href="' + u + '" x="' + (cx - logoS / 2).toFixed(1) + '" y="' + yb.toFixed(1) + '" width="' + logoS + '" height="' + logoS + '" preserveAspectRatio="xMidYMid meet" onload="if(this.previousSibling)this.previousSibling.remove()" onerror="this.remove()"/>');
      }
    });
    // línea de minutos (eje derecho)
    if (showMin) {
      var mMax = Math.max(48, Math.max.apply(null, shown.map(function (g) { return g.min || 0; })) + 2);
      var YM = function (m) { return pt + ih - m / mMax * ih; };
      out.push('<g class="min-axis">');
      [0, 12, 24, 36, 48].forEach(function (m) { out.push('<text x="' + (W - pr + 6) + '" y="' + (YM(m) + 4).toFixed(1) + '">' + m + "'</text>"); });
      out.push("</g>");
      var dp = shown.map(function (g, i4) { return (i4 ? "L" : "M") + (pl + (i4 + 0.5) * bw).toFixed(1) + " " + YM(g.min || 0).toFixed(1); }).join("");
      out.push('<path class="min-line" d="' + dp + '"/>');
      if (bw >= 10) shown.forEach(function (g, i5) { out.push('<circle class="min-dot" cx="' + (pl + (i5 + 0.5) * bw).toFixed(1) + '" cy="' + YM(g.min || 0).toFixed(1) + '" r="' + (bw >= 24 ? 3 : 2) + '"/>'); });
    }
    // eje x: fechas
    out.push('<g class="xl">');
    var stepX = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 52))));
    for (var j = 0; j < n; j += stepX) out.push('<text x="' + (pl + (j + 0.5) * bw).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + fdate(shown[j].d) + "</text>");
    out.push("</g>");
    // líneas de media
    var a100 = avgOf(s, shown), a20 = avgOf(s, shown.slice(-20)), a10 = avgOf(s, shown.slice(-10));
    var labs = [];
    function hline(v, cls, txt, color, fg) {
      if (v == null) return;
      var yy2 = Y(Math.min(v, nice));
      out.push('<line class="' + cls + '" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + yy2.toFixed(1) + '" y2="' + yy2.toFixed(1) + '"/>');
      labs.push({ y: yy2, t: txt + " " + fmt(v), c: color, f: fg });
    }
    hline(a100, "avg a100", "M" + n, "#ffffff", "#0a0b0d");
    hline(a20, "avg a20", "M20", "#6aa3ff", "#04122e");
    hline(a10, "avg a10", "M10", "#c08bff", "#1c0738");
    hline(line, "bet", "LÍN", "#ffd23f", "#2a2000");
    labs.sort(function (a, b) { return a.y - b.y; });
    for (var q = 1; q < labs.length; q++) if (labs[q].y - labs[q - 1].y < 17) labs[q].y = labs[q - 1].y + 17;
    var over = labs.length ? labs[labs.length - 1].y - (pt + ih) : 0;
    if (over > 0) labs.forEach(function (l) { l.y -= over; });
    labs.forEach(function (l) {
      out.push('<g class="lab"><rect x="' + labX + '" y="' + (l.y - 9).toFixed(1) + '" width="' + labW + '" height="18" fill="' + l.c + '"/><text x="' + (labX + 6) + '" y="' + (l.y + 4).toFixed(1) + '" fill="' + l.f + '">' + esc(l.t) + "</text></g>");
    });
    out.push('<line class="cursor" x1="0" x2="0" y1="' + pt + '" y2="' + (pt + ih) + '" visibility="hidden"/>');
    out.push("</svg>");
    host.innerHTML = out.join("");

    var svg = $("svg", host), cur = $(".cursor", svg), rects = $$(".bar", svg), lastI = -1;
    function at(e) {
      var r = svg.getBoundingClientRect();
      var xv = (e.clientX - r.left) / r.width * W;
      var i3 = Math.floor((xv - pl) / bw);
      if (i3 < 0 || i3 >= n) { leave(); return; }
      if (i3 !== lastI) {
        if (lastI > -1 && rects[lastI]) rects[lastI].classList.remove("hl");
        rects[i3].classList.add("hl"); lastI = i3;
        svg.classList.add("hovering");
        var cx = pl + (i3 + 0.5) * bw;
        cur.setAttribute("x1", cx); cur.setAttribute("x2", cx); cur.setAttribute("visibility", "visible");
      }
      var g = shown[i3], x = xs[i3];
      var res = x == null ? "p" : x > line ? "o" : x < line ? "u" : "p";
      var resT = x == null ? "Sin intentos" : res === "o" ? "OVER" : res === "u" ? "UNDER" : "PUSH";
      var shot = function (m, a) { return g[m] + "/" + g[a]; };
      var html = '<div class="tt-top">' + esc(fdate(g.d, true)) + " · " + (g.h ? "vs " : "@ ") + esc(g.o) + " · " + (g.h ? "Local" : "Visitante") + (g.r ? " · " + (g.r === "W" ? "Victoria" : "Derrota") : "") + (g.po ? " · Playoffs" : "") + "</div>" +
        '<div class="tt-val">' + (x == null ? "—" : fmt(x, s.pct || x % 1 ? 1 : 0)) + ' <small class="' + res + '">' + resT + "</small></div>" +
        '<div class="tt-line">' + esc(s.s) + " · línea " + fmt(line) + " · " + fmt(g.min, 0) + " min</div>" +
        '<div class="tt-line">' + g.pts + " PTS · " + g.reb + " REB · " + g.ast + " AST · 3P " + shot("fg3m", "fg3a") + " · TC " + shot("fgm", "fga") + "</div>";
      var r2 = svg.getBoundingClientRect();
      var yTop = x == null ? pt + ih : Y(Math.min(Math.max(x, 0), nice));
      tipShow(html, r2.left + cx2(i3) / W * r2.width, r2.top + yTop / H * r2.height);
    }
    function cx2(i4) { return pl + (i4 + 0.5) * bw; }
    function leave() {
      if (lastI > -1 && rects[lastI]) rects[lastI].classList.remove("hl");
      lastI = -1; svg.classList.remove("hovering"); cur.setAttribute("visibility", "hidden"); tipHide();
    }
    svg.addEventListener("pointermove", at);
    svg.addEventListener("pointerdown", at);
    svg.addEventListener("pointerleave", leave);
  }


  /* =========================================================================
     CALENDARIO
     ========================================================================= */
  var DOW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  var DOW_L = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var MES_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function etToday() {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch (_) { return new Date().toISOString().slice(0, 10); }
  }
  function addDays(iso, n) { var d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function isoDow(iso) { return new Date(iso + "T12:00:00Z").getUTCDay(); }
  function madrid(utc) {
    if (!utc) return { h: "—", d: "" };
    var dt = new Date(utc);
    try {
      return {
        h: dt.toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" }),
        d: dt.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", month: "short" })
      };
    } catch (_) { return { h: dt.toISOString().slice(11, 16) + " UTC", d: "" }; }
  }
  function nextGameFor(team) {
    if (!SCHED || !team) return null;
    var now = Date.now() - 3 * 3600e3, gs = SCHED.games;
    for (var i = 0; i < gs.length; i++) {
      var g = gs[i];
      if ((g.h.t === team || g.a.t === team) && g.st !== 3 && (!g.utc || Date.parse(g.utc) > now)) return g;
    }
    return null;
  }
  var TEAM_ID = { ATL: 1610612737, BOS: 1610612738, CLE: 1610612739, NOP: 1610612740, CHI: 1610612741, DAL: 1610612742, DEN: 1610612743, GSW: 1610612744, HOU: 1610612745, LAC: 1610612746, LAL: 1610612747, MIA: 1610612748, MIL: 1610612749, MIN: 1610612750, BKN: 1610612751, NYK: 1610612752, ORL: 1610612753, IND: 1610612754, PHI: 1610612755, PHX: 1610612756, POR: 1610612757, SAC: 1610612758, SAS: 1610612759, OKC: 1610612760, TOR: 1610612761, UTA: 1610612762, MEM: 1610612763, WAS: 1610612764, DET: 1610612765, CHA: 1610612766 };
  function logoUrl(t) { return TEAM_ID[t] ? "https://cdn.nba.com/logos/nba/" + TEAM_ID[t] + "/global/L/logo.svg" : ""; }
  function teamLastOf(team) {
    var l = "";
    IDX.players.forEach(function (p) { if (p.t === team && p.last > l) l = p.last; });
    return l;
  }
  function normTxt(s) { return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function teamRec(t) { return (t.w != null && t.l != null && (t.w + t.l) > 0) ? t.w + "-" + t.l : ""; }

  /* =========================================================================
     DEFENSA DEL RIVAL POR POSICIÓN
     Se calcula en el navegador con los partidos de esta temporada de todos los
     jugadores (index.js): qué promedia cada posición contra cada equipo.
     Solo cuentan los jugadores con 20 minutos o más en ese partido.
     ========================================================================= */
  var POS_LBL = { G: "Bases y escoltas", F: "Aleros y ala-pívots", C: "Pívots" };
  var POS_SHORT = { G: "bases/escoltas", F: "aleros", C: "pívots" };
  var DVP_STATS = ["pts", "reb", "ast", "pra", "fg3m", "stl", "blk"];
  var DVP_MIN = 20;
  var _dvp = null;
  function posGroup(p) { var c = String(p || "").charAt(0).toUpperCase(); return (c === "G" || c === "F" || c === "C") ? c : null; }
  function dvpData() {
    if (_dvp) return _dvp;
    if (window.NBALAB_DVP) { _dvp = window.NBALAB_DVP.calcular(IDX); return _dvp; }
    var acc = {}, lg = {};
    function add(o, key, row) {
      o[key] = o[key] || { n: 0 };
      var b = o[key]; b.n++;
      DVP_STATS.forEach(function (s) { b[s] = (b[s] || 0) + row[s]; });
    }
    IDX.players.forEach(function (p) {
      var g = posGroup(p.p), L = p.l20o ? p.l20o.length : 0;
      if (!g || !L || !p.l20) return;
      var n = Math.min(p.gp || 0, L);
      for (var i = L - n; i < L; i++) {
        var m = p.l20.min ? p.l20.min[i] : null, o = p.l20o[i];
        if (m == null || m < DVP_MIN || !o) continue;
        var row = {}, ok = true;
        ["pts", "reb", "ast", "fg3m", "stl", "blk"].forEach(function (s) { var v = p.l20[s] ? p.l20[s][i] : null; if (v == null) ok = false; row[s] = v || 0; });
        if (!ok) continue;
        row.pra = row.pts + row.reb + row.ast;
        acc[o] = acc[o] || {};
        add(acc[o], g, row);
        add(lg, g, row);
      }
    });
    var teams = Object.keys(acc).filter(function (t) { return TEAM_ID[t]; });
    var out = { teams: {}, lg: {}, nTeams: teams.length };
    ["G", "F", "C"].forEach(function (g) {
      var L = lg[g];
      out.lg[g] = {};
      DVP_STATS.forEach(function (s) { out.lg[g][s] = L && L.n ? L[s] / L.n : null; });
      teams.forEach(function (t) {
        var b = acc[t][g];
        out.teams[t] = out.teams[t] || {};
        var r = { n: b ? b.n : 0 };
        DVP_STATS.forEach(function (s) {
          var v = b && b.n ? b[s] / b.n : null, base = out.lg[g][s];
          r[s] = { v: v, d: (v != null && base) ? (v - base) / base * 100 : null, r: null };
        });
        out.teams[t][g] = r;
      });
      DVP_STATS.forEach(function (s) {
        teams.filter(function (t) { return out.teams[t][g][s].v != null; })
          .sort(function (a, b) { return out.teams[b][g][s].v - out.teams[a][g][s].v; })
          .forEach(function (t, i) { out.teams[t][g][s].r = i + 1; });
      });
    });
    _dvp = out;
    return out;
  }
  function dvpClass(d) { return d == null ? "" : d >= 6 ? "dv-up" : d <= -6 ? "dv-down" : "dv-eq"; }
  function dvpPct(d) { return d == null ? "—" : (d > 0 ? "+" : "") + Math.round(d) + "%"; }

  /* =========================================================================
     CUOTAS DE LAS CASAS (data/cuotas.js, lo crea descargar_cuotas.py)
     Se cargan aparte para no retrasar la web; si no hay archivo, no sale nada.
     ========================================================================= */
  var CUO = null, _cuoP = null;
  var CASA_ABR = { Bet365: "B365", Winamax: "WMX" };
  function cuotasLoad() {
    if (_cuoP) return _cuoP;
    _cuoP = loadScript("data/cuotas.js?t=" + Math.floor(Date.now() / 300000)).then(function () {
      CUO = window.__NBA_CUOTAS__ || null;
      return CUO;
    }, function () { return null; });
    return _cuoP;
  }
  function casaPref() { var c = store("nl-casa"); return c && CUO && CUO.casas.indexOf(c) > -1 ? c : "best"; }
  function casaAbr(c) { return CASA_ABR[c] || c; }
  function sameL(a, b) { return Math.abs(a - b) < 0.01; }
  function cuoLines(pid, m) {
    if (!CUO || !CUO.j || !CUO.j[pid]) return [];
    var now = Date.now();
    return CUO.j[pid].filter(function (r) {
      if (r[0] !== m) return false;
      var g = CUO.g[r[6]];
      return !g || !g[2] || Date.parse(g[2]) > now; // partido ya empezado: cuota vieja, fuera
    }).map(function (r) { return { l: r[1], casa: CUO.casas[r[2]], o: r[3], u: r[4], main: !!r[5], fid: r[6] }; });
  }
  function cuoPrefList(ls) {
    var pref = casaPref();
    if (pref === "best") return ls;
    var f = ls.filter(function (x) { return x.casa === pref; });
    return f;
  }
  function cuoAt(pid, m, L) { return cuoLines(pid, m).filter(function (x) { return sameL(x.l, L); }); }
  /* Mejor cuota de un lado (o/u) entre las casas elegidas */
  function cuoBest(list, side) {
    var best = null;
    cuoPrefList(list).forEach(function (x) { var v = x[side]; if (v && (!best || v > best.v)) best = { v: v, casa: x.casa }; });
    return best;
  }
  /* Línea principal de la casa (la que tiene más y menos parecidos) */
  function cuoMain(pid, m) {
    var ls = cuoLines(pid, m), pool = cuoPrefList(ls);
    if (!pool.length) pool = ls;
    if (!pool.length) return null;
    var both = pool.filter(function (x) { return x.o && x.u; });
    var mains = both.filter(function (x) { return x.main; });
    var cand = mains.length ? mains : both;
    if (cand.length) {
      cand.sort(function (a, b) { return Math.abs(a.o - a.u) - Math.abs(b.o - b.u); });
      return cand[0].l;
    }
    var ov = pool.filter(function (x) { return x.o; }).sort(function (a, b) { return Math.abs(a.o - 1.9) - Math.abs(b.o - 1.9); });
    return ov.length ? ov[0].l : null;
  }
  function cuoStamp() {
    if (!CUO) return "";
    var u = String(CUO.updated || ""), hoy = new Date().toISOString().slice(0, 10);
    return "cuotas de las " + u.slice(11, 16) + (u.slice(0, 10) !== hoy ? " del " + fdate(u.slice(0, 10)) : "");
  }
  function casaSelectHTML() {
    if (!CUO || !CUO.casas.length) return "";
    var p = casaPref();
    return '<select class="input casa-sel" data-casa-sel aria-label="Casa de apuestas"><option value="best">Mejor cuota</option>' +
      CUO.casas.map(function (c) { return '<option value="' + esc(c) + '"' + (p === c ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select>";
  }
  function oddCell(b) {
    return b ? '<span class="odd-v">' + fmt(b.v, 2) + '</span><small class="odd-c">' + esc(casaAbr(b.casa)) + "</small>" : '<span class="muted">—</span>';
  }
  /* Bloque de cuotas de un gráfico: cuotas de la línea + líneas que ofrecen las casas */
  function casasRowHTML(pid, kk, L) {
    var ls = cuoLines(pid, kk);
    if (!ls.length) return "";
    var mine = cuoPrefList(ls), at = mine.filter(function (x) { return sameL(x.l, L); });
    at.sort(function (a, b) { return a.casa < b.casa ? -1 : 1; });
    var bo = cuoBest(at, "o"), bu = cuoBest(at, "u");
    var exact = at.length ? at.map(function (x) {
      return '<span class="cq"><b>' + esc(x.casa) + "</b>" +
        '<em class="' + (bo && x.o === bo.v && at.length > 1 ? "top" : "") + '">Más ' + (x.o ? fmt(x.o, 2) : "—") + "</em>" +
        '<em class="' + (bu && x.u === bu.v && at.length > 1 ? "top" : "") + '">Menos ' + (x.u ? fmt(x.u, 2) : "—") + "</em></span>";
    }).join("") : '<span class="muted small">' + (mine.length ? "Esta línea no la ofrece " + (casaPref() === "best" ? "ninguna casa" : casaPref()) + " ahora mismo. Elige una de las líneas de abajo." : "Sin cuotas de " + esc(casaPref()) + " para este mercado.") + "</span>";
    var main = cuoMain(pid, kk), seen = {}, lines = [];
    (mine.length ? mine : ls).forEach(function (x) { var key = x.l.toFixed(1); if (!seen[key]) { seen[key] = 1; lines.push(x.l); } });
    lines.sort(function (a, b) { return Math.abs(a - L) - Math.abs(b - L); });
    lines = lines.slice(0, 9).sort(function (a, b) { return a - b; });
    var chips = lines.map(function (l) {
      return '<button type="button" class="lchip' + (sameL(l, L) ? " on" : "") + (main != null && sameL(l, main) ? " main" : "") + '" data-cl="' + l + '" title="' + (main != null && sameL(l, main) ? "Línea principal" : "Usar esta línea") + '">' + fmt(l) + "</button>";
    }).join("");
    return '<div class="casas-row"><div class="casas-top"><span class="mono tb-lbl">Cuotas · ' + esc(cuoStamp()) + "</span>" + casaSelectHTML() + "</div>" +
      '<div class="cq-wrap">' + exact + "</div>" +
      (chips ? '<div class="lchips"><span class="mono tb-lbl">Líneas</span>' + chips + "</div>" : "") +
      '<p class="cq-note mono">+18 · Orientativas: comprueba siempre la cuota en la casa antes de apostar.</p></div>';
  }
  /* Engancha el selector de casa y los botones de línea de un bloque de cuotas */
  function bindCasas(host, onLine, onCasa) {
    var sel = $("[data-casa-sel]", host);
    if (sel) sel.addEventListener("change", function () { store("nl-casa", sel.value); onCasa(); });
    $$("[data-cl]", host).forEach(function (b) { b.addEventListener("click", function () { onLine(parseFloat(b.dataset.cl)); }); });
  }

  /* Franja "BOS es el 2º de 30 que más triples permite a bases" (ficha de jugador y partido) */
  function dvpLineHTML(opp, pos, stat) {
    var i = opp && window.NBALAB_DVP ? window.NBALAB_DVP.info(dvpData(), opp, pos, stat, SIDE) : null;
    if (!i) return "";
    var cl = i.nivel > 0 ? "dv-up" : i.nivel < 0 ? "dv-down" : "dv-eq";
    return '<div class="m-dvp ' + cl + '"><span class="m-dvp-rank">' + i.rank + "º<small>/" + i.n + "</small></span><span>🛡️ " +
      "<b>" + esc(opp) + "</b> es el <b>" + i.rank + "º de " + i.n + "</b> que más " + esc(i.statN) + " permite a " + esc(i.posN) +
      (i.dif != null ? " (" + (i.dif > 0 ? "+" : "") + Math.round(i.dif) + "% vs media)" : "") +
      " · <em>" + esc(i.etiqueta) + (SIDE === "under" ? " para el menos" : " para el más") + "</em></span></div>";
  }
  /* Texto corto del puesto: 1 = el equipo que más concede */
  function dvpRank(r, n) { return r == null ? "—" : r + "º/" + n; }

  var RANK_COLS = ["pts", "fg3m", "reb", "ast", "pra", "stl", "blk"];
  function rankClass(r, n) { return r == null ? "" : r <= 5 ? "rk-1" : r <= 10 ? "rk-2" : r > n - 5 ? "rk-5" : r > n - 10 ? "rk-4" : "rk-3"; }
  function mountDefense() {
    var host = $("[data-dvp]");
    if (!host) return;
    var D = dvpData();
    if (!D.nTeams) { host.innerHTML = '<p class="empty">Aún no hay partidos suficientes esta temporada.</p>'; return; }
    var st = { view: "rank", stat: "pts", pos: "G" };
    var sel = $("[data-dvp-stat]");
    var SEL_STATS = ["pts", "fg3m", "reb", "ast", "pra", "pr", "pa", "ra", "stl", "blk", "sb"];
    sel.innerHTML = SEL_STATS.map(function (s) { return '<option value="' + s + '">' + esc(STAT[s].l) + "</option>"; }).join("");
    var today = etToday(), playing = {};
    if (SCHED) SCHED.games.forEach(function (g) { if (g.d === today && g.st !== 3) { playing[g.h.t] = g.a.t; playing[g.a.t] = g.h.t; } });
    function teamCell(t) {
      var hoy = playing[t] ? ' <span class="badge ok">HOY vs ' + esc(playing[t]) + "</span>" : "";
      return '<td class="lbl"><span class="dv-team">' + (logoUrl(t) ? '<img src="' + logoUrl(t) + '" alt="" loading="lazy" onerror="this.remove()">' : "") + esc(t) + "</span>" + hoy + "</td>";
    }
    function sorted(pos, stat) {
      return Object.keys(D.teams).sort(function (a, b) {
        var va = D.teams[a][pos][stat].v, vb = D.teams[b][pos][stat].v;
        return (vb == null ? -1e9 : vb) - (va == null ? -1e9 : va);
      });
    }
    /* Vista 1: ranking 1-30 de una posición en todas las estadísticas */
    function renderRank() {
      var cols = RANK_COLS.indexOf(st.stat) > -1 ? RANK_COLS : RANK_COLS.concat([st.stat]);
      host.className = "table dvp rank";
      host.innerHTML = "<thead><tr><th>#</th><th>Rival</th>" + cols.map(function (s) {
        return '<th class="' + (s === st.stat ? "dv-sort" : "") + '" data-stat="' + s + '">' + esc(STAT[s].s) + (s === st.stat ? " ▼" : "") + "</th>";
      }).join("") + "</tr></thead><tbody>" + sorted(st.pos, st.stat).map(function (t) {
        var c = D.teams[t][st.pos];
        return '<tr><td class="rk-num ' + rankClass(c[st.stat].r, D.nTeams) + '">' + (c[st.stat].r || "—") + "</td>" + teamCell(t) + cols.map(function (s) {
          var x = c[s];
          return '<td class="rk ' + (s === st.stat ? "dv-sort" : "") + '" title="' + esc(STAT[s].l) + ": " + fmt(x.v) + " (" + dvpPct(x.d) + " vs liga)" + '"><span class="rk-pill ' + rankClass(x.r, D.nTeams) + '">' + (x.r || "—") + "º</span><small>" + fmt(x.v) + " · " + dvpPct(x.d) + "</small></td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody>";
    }
    /* Vista 2: una estadística, comparando las tres posiciones */
    function cell(t, g) {
      var c = D.teams[t][g], x = c[st.stat], low = c.n < 8;
      return '<td class="dv ' + dvpClass(x.d) + (g === st.pos ? " dv-sort" : "") + '" title="' + c.n + ' partidos de ' + POS_SHORT[g] + ' con ' + DVP_MIN + '+ min">' +
        "<b>" + fmt(x.v) + "</b><em>" + dvpPct(x.d) + "</em><small>" + dvpRank(x.r, D.nTeams) + (low ? " · pocos datos" : "") + "</small></td>";
    }
    function renderPos() {
      host.className = "table dvp";
      var lgRow = '<tr class="dv-lg"><td></td><td class="lbl">Media de la liga</td>' + ["G", "F", "C"].map(function (g) { return '<td class="dv' + (g === st.pos ? " dv-sort" : "") + '"><b>' + fmt(D.lg[g][st.stat]) + "</b></td>"; }).join("") + "</tr>";
      host.innerHTML = "<thead><tr><th>#</th><th>Rival</th>" + ["G", "F", "C"].map(function (g) {
        return '<th class="' + (g === st.pos ? "dv-sort" : "") + '" data-pos="' + g + '">' + esc(POS_LBL[g]) + (g === st.pos ? " ▼" : "") + "</th>";
      }).join("") + "</tr></thead><tbody>" + lgRow + sorted(st.pos, st.stat).map(function (t) {
        var r = D.teams[t][st.pos][st.stat].r;
        return '<tr><td class="rk-num ' + rankClass(r, D.nTeams) + '">' + (r || "—") + "</td>" + teamCell(t) + cell(t, "G") + cell(t, "F") + cell(t, "C") + "</tr>";
      }).join("") + "</tbody>";
    }
    function render() {
      sel.value = st.stat;
      var hint = $("[data-dvp-hint]");
      if (hint) hint.textContent = (st.view === "rank" ? "Ranking de " + POS_LBL[st.pos].toLowerCase() + " · ordenado por " + STAT[st.stat].l.toLowerCase() : "Ordenado por " + POS_LBL[st.pos].toLowerCase()) +
        " · 1º = el que más permite, " + D.nTeams + "º = el que menos";
      if (st.view === "rank") renderRank(); else renderPos();
    }
    sel.addEventListener("change", function () { st.stat = sel.value; render(); });
    function segOn(el, v) { $$("button", el).forEach(function (b) { b.classList.toggle("on", b.dataset.v === v); }); }
    var segPos = $("[data-dvp-pos]"), segView = $("[data-dvp-view]");
    function setPos(g) { st.pos = g; segOn(segPos, g); render(); }
    segPos.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) setPos(b.dataset.v); });
    if (segView) segView.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; st.view = b.dataset.v; segOn(segView, st.view); render(); });
    host.addEventListener("click", function (e) {
      var th = e.target.closest("th[data-pos]"); if (th) return setPos(th.dataset.pos);
      var ts = e.target.closest("th[data-stat]"); if (ts) { st.stat = ts.dataset.stat; render(); }
    });
    segOn(segPos, st.pos);
    render();
  }


  function mountCalendar() {
    var daysEl = $("[data-cal-days]"), gamesEl = $("[data-games]"), titleEl = $("[data-cal-title]");
    if (!daysEl || !gamesEl) return;
    if (!SCHED) {
      gamesEl.innerHTML = '<p class="empty">El calendario aparecerá en cuanto ejecutes <code>tools/actualizar.bat</code>.</p>';
      $(".cal-strip").hidden = true;
      return;
    }
    var by = {};
    SCHED.games.forEach(function (g) { (by[g.d] = by[g.d] || []).push(g); });
    var dates = Object.keys(by).sort();
    var today = etToday();
    var sel = today;
    if (!by[sel]) sel = dates.filter(function (d) { return d >= today; })[0] || dates[dates.length - 1];
    var start = addDays(sel, -3);

    function renderDays() {
      var html = "";
      for (var i = 0; i < 7; i++) {
        var d = addDays(start, i), n = (by[d] || []).length, p = d.split("-");
        html += '<button type="button" class="cal-day' + (d === sel ? " on" : "") + (d === today ? " today" : "") + (n ? "" : " none") + '" data-d="' + d + '">' +
          "<span>" + DOW[isoDow(d)] + "</span><b>" + (+p[2]) + "</b><small>" + MES[+p[1] - 1] + "</small><i>" + (n ? n + " part." : "—") + "</i></button>";
      }
      daysEl.innerHTML = html;
    }
    var POS_GROUPS = [["G", "Bases y escoltas"], ["F", "Aleros y ala-pívots"], ["C", "Pívots"], ["O", "Sin posición"]];
    function playerRows(team, opp) {
      var tl = teamLastOf(team);
      var ps = IDX.players.filter(function (p) { return p.t === team; }).sort(function (a, b) { return (b.avg.min || 0) - (a.avg.min || 0); });
      if (!ps.length) return '<p class="empty small">Sin jugadores de este equipo en los datos.</p>';
      var head = '<div class="roster-head mono"><span>Jugador</span><span>MIN</span><span>PTS</span><span>REB</span><span>AST</span><span>3PM</span><span>PRA</span></div>';
      return POS_GROUPS.map(function (grp) {
        var list = ps.filter(function (p) { var c = String(p.p || "").charAt(0).toUpperCase(); return grp[0] === "O" ? "GFC".indexOf(c) < 0 || !c : c === grp[0]; });
        if (!list.length) return "";
        return '<div class="pos-group"><p class="pos-title mono">' + grp[1] + " · " + list.length + "</p>" + head +
          list.map(function (p) {
            var a = p.avg, baja = tl && p.last < tl;
            var dm = (a.min5 != null && a.min != null) ? a.min5 - a.min : 0;
            var arrow = Math.abs(dm) >= 3 ? (dm > 0 ? ' <i class="trend-up" title="Minutos últimos 5: ' + fmt(a.min5) + '">▲</i>' : ' <i class="trend-down" title="Minutos últimos 5: ' + fmt(a.min5) + '">▼</i>') : "";
            var role = p.gsn ? '<em class="role-tag mono">' + (p.gs / p.gsn >= 0.5 ? "TIT" : "SUP") + " " + p.gs + "/" + p.gsn + "</em>" : "";
            return '<a class="roster-row' + (baja ? " is-out" : "") + '" data-name="' + esc(normTxt(p.n)) + '" href="' + pUrl(p.id, opp) + '">' +
              '<span class="player-cell">' + photoHTML(p) + "<span>" + esc(p.n) + "<small>" + esc(p.p || "—") + (p.j ? " · #" + esc(p.j) : "") + " " + role +
              (baja ? ' <em class="out-tag mono">POSIBLE BAJA</em>' : "") + "</small></span></span>" +
              "<span>" + fmt(a.min) + arrow + "</span><span><b>" + fmt(a.pts) + "</b></span><span>" + fmt(a.reb) + "</span><span>" + fmt(a.ast) + "</span><span>" + fmt(a.fg3m) + "</span><span>" + fmt(a.pts + a.reb + a.ast) + "</span></a>";
          }).join("") + "</div>";
      }).join("");
    }
    function renderGames() {
      var gs = by[sel] || [];
      var p = sel.split("-");
      titleEl.textContent = DOW_L[isoDow(sel)].replace(/^./, function (c) { return c.toUpperCase(); }) + " " + (+p[2]) + " de " + MES_L[+p[1] - 1] + " (hora de EE. UU.) · " + gs.length + (gs.length === 1 ? " partido" : " partidos") + (gs.length ? " · en España se juegan de madrugada" : "");
      if (!gs.length) { gamesEl.innerHTML = '<p class="empty">No hay partidos este día.</p>'; return; }
      gamesEl.innerHTML = gs.map(function (g) {
        var fin = g.st === 3, live = g.st === 2, t = madrid(g.utc);
        var hw = fin && g.h.s > g.a.s, aw = fin && g.a.s > g.h.s;
        function side(tm, win, home) {
          return '<div class="g-team' + (home ? " home" : "") + (win ? " win" : "") + (fin && !win ? " lose" : "") + '">' +
            '<b class="g-tri">' + esc(tm.t) + "</b><span>" + esc(((tm.c ? tm.c + " " : "") + (tm.n && tm.n !== tm.t ? tm.n : "")).trim() || (home ? "Local" : "Visitante")) + "</span>" +
            '<small class="mono">' + (teamRec(tm) || "&nbsp;") + "</small>" + (fin || live ? '<em class="g-score">' + (tm.s != null ? tm.s : "") + "</em>" : "") + "</div>";
        }
        var mid = fin ? '<span class="g-st mono">FINAL</span>' : live ? '<span class="g-st live mono">EN JUEGO</span>' :
          '<span class="g-time">' + esc(t.h) + '</span><span class="g-date mono">' + esc(t.d) + "</span>";
        return '<button type="button" class="game" data-gid="' + esc(g.id) + '">' + side(g.a, aw, false) +
          '<div class="g-mid">' + mid + '<span class="g-at mono">@</span>' + (g.lab ? '<span class="g-lab mono">' + esc(g.lab) + "</span>" : "") + "</div>" +
          side(g.h, hw, true) + '<span class="g-cta mono">Abrir partido →</span></button>';
      }).join("");
    }
    function openGame(btn) {
      var old = $(".game-panel", gamesEl), wasOpen = btn.classList.contains("open");
      if (old) old.remove();
      $$(".game.open", gamesEl).forEach(function (b) { b.classList.remove("open"); });
      if (wasOpen) return;
      var g = (by[sel] || []).filter(function (x) { return x.id === btn.dataset.gid; })[0];
      if (!g) return;
      btn.classList.add("open");
      // insertar el panel al final de la fila del partido pulsado
      var cards = $$(".game", gamesEl), top = btn.offsetTop, last = btn;
      cards.forEach(function (c) { if (c.offsetTop === top) last = c; });
      var panel = document.createElement("div");
      panel.className = "game-panel";
      var t = madrid(g.utc);
      panel.innerHTML = '<div class="gp-head"><b>' + esc(g.a.t) + " @ " + esc(g.h.t) + '</b><span class="mono">' + (g.st === 3 ? "Final · " + g.a.s + "-" + g.h.s : esc(t.d + " · " + t.h + " (hora España)")) + "</span></div>" +
        '<div class="gp-search"><input type="search" class="input" placeholder="Buscar jugador en ' + esc(g.a.t) + " o " + esc(g.h.t) + '…" aria-label="Buscar jugador en el partido" data-gp-search /><span class="mono gp-legend"><em class="out-tag">POSIBLE BAJA</em> no jugó el último partido de su equipo · ▲▼ cambio de minutos</span></div>' +
        '<div class="gp-cols"><div><h4><span class="mono">Visitante</span> ' + esc(g.a.t) + "</h4>" + playerRows(g.a.t, g.h.t) + "</div>" +
        '<div><h4><span class="mono">Local</span> ' + esc(g.h.t) + "</h4>" + playerRows(g.h.t, g.a.t) + "</div></div>";
      last.insertAdjacentElement("afterend", panel);
      var gsInp = $("[data-gp-search]", panel);
      gsInp.addEventListener("click", function (e) { e.stopPropagation(); });
      gsInp.addEventListener("input", function () {
        var q = normTxt(gsInp.value.trim());
        $$(".roster-row", panel).forEach(function (r) { r.hidden = !!q && r.dataset.name.indexOf(q) < 0; });
        $$(".pos-group", panel).forEach(function (gr) { gr.hidden = !$$(".roster-row", gr).some(function (r) { return !r.hidden; }); });
      });
      var y = btn.getBoundingClientRect().top + window.pageYOffset - 80;
      if (Math.abs(window.pageYOffset - y) > 300) window.scrollTo({ top: y, behavior: "smooth" });
    }
    daysEl.addEventListener("click", function (e) {
      var b = e.target.closest(".cal-day");
      if (!b) return;
      sel = b.dataset.d; renderDays(); renderGames();
    });
    gamesEl.addEventListener("click", function (e) {
      var b = e.target.closest(".game");
      if (b) location.href = "partido.html?g=" + encodeURIComponent(b.dataset.gid);
    });
    $("[data-cal-prev]").addEventListener("click", function () { start = addDays(start, -7); sel = addDays(sel, -7); renderDays(); renderGames(); });
    $("[data-cal-next]").addEventListener("click", function () { start = addDays(start, 7); sel = addDays(sel, 7); renderDays(); renderGames(); });
    $("[data-cal-today]").addEventListener("click", function () {
      sel = by[today] ? today : (dates.filter(function (d) { return d >= today; })[0] || today);
      start = addDays(sel, -3); renderDays(); renderGames();
    });
    renderDays(); renderGames();
  }

  /* =========================================================================
     FICHA DE JUGADOR
     ========================================================================= */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error("No se pudo cargar " + src)); };
      document.head.appendChild(s);
    });
  }

  /* --- imagen para compartir (X, Telegram, WhatsApp) --- */
  /* C = { P, games, season, opp, nextG, filt, allOpp } (ficha de jugador o página de partido) */
  function shareImage(s, pool, line, C) {
    var P = C.P, games = C.games, season = C.season, nextOpp = C.opp, nextG = C.nextG;
    var shown = pool.slice(-10), W = 1080, H = 1350;
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var x = cv.getContext("2d");
    var F = "Inter, system-ui, sans-serif", M = "'JetBrains Mono', Consolas, monospace";
    var site = "nba-lab.github.io/" + (slugOf(P.id) ? "jugador-" + slugOf(P.id) + ".html" : "");
    function rr(x0, y0, w, h, r) { x.beginPath(); x.moveTo(x0 + r, y0); x.arcTo(x0 + w, y0, x0 + w, y0 + h, r); x.arcTo(x0 + w, y0 + h, x0, y0 + h, r); x.arcTo(x0, y0 + h, x0, y0, r); x.arcTo(x0, y0, x0 + w, y0, r); x.closePath(); }
    function glow(cx, cy, r, col) { var g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    function fitText(t, maxW, size, weight) { do { x.font = weight + " " + size + "px " + F; size -= 2; } while (x.measureText(t).width > maxW && size > 30); }
    var hits = [["L5", pool.slice(-5)], ["L10", pool.slice(-10)], ["L20", pool.slice(-20)], ["TEMP", pool.filter(function (g) { return g.s === season && !g.po; })]];
    var h2h = nextOpp || null;
    if (h2h && C.allOpp) hits.push(["VS " + h2h, games.filter(function (g) { return g.o === h2h; })]);
    function draw(photo) {
      x.fillStyle = "#08090b"; x.fillRect(0, 0, W, H);
      glow(160, 120, 620, "rgba(25,240,139,.22)"); glow(980, 420, 640, "rgba(43,107,255,.20)"); glow(300, 1250, 560, "rgba(138,60,255,.14)");
      x.textBaseline = "alphabetic";
      // cabecera
      x.fillStyle = "#19f08b"; x.beginPath(); x.arc(92, 88, 11, 0, 7); x.fill();
      x.font = "800 42px " + F; x.fillStyle = "#f4f5f7"; x.fillText("NBA", 116, 103);
      var w1 = x.measureText("NBA ").width; x.fillStyle = "#19f08b"; x.fillText("LAB", 116 + w1, 103);
      x.font = "500 26px " + M; x.fillStyle = "#8b919c"; x.textAlign = "right"; x.fillText("@nbavaluelab", W - 80, 100); x.textAlign = "left";
      // jugador
      var nameMax = W - 160 - (photo ? 300 : 0);
      if (photo) { try { x.drawImage(photo, W - 80 - 290, 150, 290, 212); } catch (_) {} }
      fitText(P.n, nameMax, 80, "900"); x.fillStyle = "#f4f5f7"; x.fillText(P.n, 80, 250);
      var sub = [P.t, P.p].filter(Boolean).join(" · ");
      if (nextOpp) {
        var t = nextG ? madrid(nextG.utc) : null, home = nextG ? nextG.h.t === P.t : true;
        sub += "  ·  " + (home ? "vs " : "@ ") + nextOpp + (t && t.d ? " · " + t.d + " " + t.h : "");
      }
      x.font = "500 30px " + F; x.fillStyle = "#c7cbd2"; x.fillText(sub, 80, 305);
      var fl = C.filt || "";
      if (fl) { x.font = "500 24px " + M; x.fillStyle = "#ffd23f"; x.fillText("Filtro: " + fl, 80, 345); }
      // prop
      rr(80, 380, W - 160, 150, 26); x.fillStyle = "rgba(16,18,22,.92)"; x.fill(); x.strokeStyle = "rgba(25,240,139,.45)"; x.lineWidth = 2; x.stroke();
      x.font = "700 24px " + M; x.fillStyle = "#19f08b"; x.fillText("PROP", 116, 428);
      fitText(sideTxt() + " " + fmt(line) + " " + s.l.toLowerCase(), W - 232, 62, "800"); x.fillStyle = "#f4f5f7"; x.fillText(sideTxt() + " " + fmt(line) + " " + s.l.toLowerCase(), 116, 497);
      // aciertos
      var n = hits.length, gap = 16, tw = (W - 160 - gap * (n - 1)) / n;
      hits.forEach(function (hh, i) {
        var r = hitOf(s, hh[1], line), x0 = 80 + i * (tw + gap);
        rr(x0, 560, tw, 150, 20); x.fillStyle = "#171a20"; x.fill();
        x.textAlign = "center"; x.font = "600 22px " + M; x.fillStyle = "#8b919c"; x.fillText(hh[0], x0 + tw / 2, 600);
        x.font = "800 54px " + F; x.fillStyle = r ? (r.p >= 50 ? "#19f08b" : "#ff4766") : "#5b616b"; x.fillText(r ? Math.round(r.p) + "%" : "—", x0 + tw / 2, 662);
        x.font = "500 24px " + M; x.fillStyle = "#8b919c"; x.fillText(r ? r.o + "/" + r.n : "", x0 + tw / 2, 694);
        x.textAlign = "left";
      });
      // gráfico
      var cx0 = 80, cy0 = 790, cw = W - 160 - 96, ch = 330, xs = shown.map(function (g) { return val(s, g); });
      var real = xs.filter(function (v) { return v != null; }), mx = Math.max.apply(null, real.concat([line, 1])) * 1.15;
      x.font = "600 24px " + M; x.fillStyle = "#8b919c"; x.fillText("ÚLTIMOS " + shown.length + " PARTIDOS", cx0, 765);
      x.textAlign = "right"; x.fillText("MEDIA " + fmt(avgOf(s, shown)), W - 80, 765); x.textAlign = "left";
      var bw = cw / Math.max(1, shown.length), Y = function (v) { return cy0 + ch - v / mx * ch; };
      x.strokeStyle = "#23272f"; x.lineWidth = 1; x.beginPath(); x.moveTo(cx0, cy0 + ch); x.lineTo(cx0 + cw, cy0 + ch); x.stroke();
      shown.forEach(function (g, i) {
        var v = xs[i]; if (v == null) return;
        var bx = cx0 + i * bw + bw * 0.14, w = bw * 0.72, y = Y(v), over = hitGood(v, line);
        rr(bx, y, w, Math.max(4, cy0 + ch - y), Math.min(10, w / 3)); x.fillStyle = over ? "#19f08b" : v === line ? "#8b919c" : "#ff4766"; x.fill();
        x.textAlign = "center";
        x.font = "700 " + (bw > 60 ? 26 : 20) + "px " + M; x.fillStyle = "#f4f5f7"; x.fillText(fmt(v, s.pct ? 0 : (Number.isInteger(v) ? 0 : 1)), bx + w / 2, y - 10);
        x.font = "500 " + (bw > 60 ? 20 : 16) + "px " + M; x.fillStyle = "#8b919c"; x.fillText(g.o || "", bx + w / 2, cy0 + ch + 30);
        x.textAlign = "left";
      });
      x.setLineDash([14, 10]); x.strokeStyle = "#ffd23f"; x.lineWidth = 4; x.beginPath(); x.moveTo(cx0, Y(line)); x.lineTo(cx0 + cw, Y(line)); x.stroke(); x.setLineDash([]);
      x.font = "800 24px " + M; var lt = fmt(line), lw = x.measureText(lt).width + 20;
      rr(cx0 + cw + 12, Y(line) - 16, lw, 32, 8); x.fillStyle = "#ffd23f"; x.fill(); x.fillStyle = "#08090b"; x.fillText(lt, cx0 + cw + 22, Y(line) + 9);
      // pie
      x.strokeStyle = "#23272f"; x.lineWidth = 2; x.beginPath(); x.moveTo(80, 1190); x.lineTo(W - 80, 1190); x.stroke();
      x.font = "500 24px " + F; x.fillStyle = "#8b919c"; x.fillText("Gráficos y estadísticas gratis, en español:", 80, 1232);
      fitText(site, W - 160, 34, "800"); x.fillStyle = "#19f08b"; x.fillText(site, 80, 1274);
      x.font = "500 20px " + M; x.fillStyle = "#5b616b"; x.fillText("+18 · Juega con responsabilidad · jugarbien.es", 80, 1316);
      x.textAlign = "right"; x.fillStyle = "#2aabee"; x.font = "700 20px " + M; x.fillText("Telegram: NBA LAB", W - 80, 1316); x.textAlign = "left";
      openShare(cv, s, line, site, C, pool);
    }
    var url = BRAND.photoUrl ? BRAND.photoUrl(P.id) : "", done = false;
    function go(img) { if (done) return; done = true; draw(img); }
    var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    ready.then(function () {
      if (!url) return go(null);
      var img = new Image(); img.crossOrigin = "anonymous";
      img.onload = function () { go(img); }; img.onerror = function () { go(null); };
      setTimeout(function () { go(null); }, 2500);
      img.src = url + (url.indexOf("?") > -1 ? "&" : "?") + "cors=1";
    });
  }
  function openShare(cv, s, line, site, C, pool) {
    var P = C.P, nextOpp = C.opp;
    var old = $(".share-modal"); if (old) old.remove();
    var hit10 = hitOf(s, pool.slice(-10), line);
    var text = P.n + " · " + sideTxt() + " " + fmt(line) + " " + s.l.toLowerCase() + (hit10 ? " · L10 " + hit10.o + "/" + hit10.n : "") + (nextOpp ? " · vs " + nextOpp : "") + "\n📊 " + "https://" + site + "\n#NBA #props";
    var fname = "nbalab-" + (slugOf(P.id) || P.id) + "-" + s.k + "-" + String(line).replace(".", "_") + ".png";
    var m = document.createElement("div");
    m.className = "share-modal";
    m.innerHTML = '<div class="share-card" role="dialog" aria-label="Imagen para compartir"><button class="share-x" type="button" aria-label="Cerrar">×</button>' +
      '<img alt="Imagen para compartir" src="' + cv.toDataURL("image/png") + '">' +
      '<div class="share-actions"><button type="button" class="btn btn-primary" data-sh="share" hidden>Compartir</button>' +
      '<button type="button" class="btn btn-ghost" data-sh="dl">Descargar imagen</button>' +
      '<button type="button" class="btn btn-ghost" data-sh="copy" hidden>Copiar imagen</button>' +
      '<button type="button" class="btn btn-ghost" data-sh="txt">Copiar texto para X</button></div>' +
      '<p class="mono small share-msg" data-sh-msg></p></div>';
    document.body.appendChild(m);
    var msg = $("[data-sh-msg]", m);
    function close() { m.remove(); }
    $(".share-x", m).addEventListener("click", close);
    m.addEventListener("click", function (e) { if (e.target === m) close(); });
    cv.toBlob(function (blob) {
      if (!blob) return;
      var file = null;
      try { file = new File([blob], fname, { type: "image/png" }); } catch (_) {}
      var bs = $('[data-sh="share"]', m), bc = $('[data-sh="copy"]', m);
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        bs.hidden = false;
        bs.addEventListener("click", function () { navigator.share({ files: [file], text: text }).catch(function () {}); });
      }
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        bc.hidden = false;
        bc.addEventListener("click", function () {
          navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(function () { msg.textContent = "Imagen copiada: pégala en X o Telegram."; }, function () { msg.textContent = "Tu navegador no deja copiar imágenes: usa Descargar."; });
        });
      }
      $('[data-sh="dl"]', m).addEventListener("click", function () {
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fname;
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      });
    }, "image/png");
    $('[data-sh="txt"]', m).addEventListener("click", function () {
      var ok = function () { msg.textContent = "Texto copiado."; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function () { msg.textContent = text; });
      else msg.textContent = text;
    });
  }

  function bootPlayer() {
    var qs = new URLSearchParams(location.search);
    var id = qs.get("id") || (window.__NBA_PID__ != null ? String(window.__NBA_PID__) : null);
    var info = IDX.players.filter(function (p) { return String(p.id) === String(id); })[0];
    // Enlaces antiguos (jugador.html?id=...) → página propia del jugador
    if (qs.get("id") && info && slugOf(info.id) && /jugador\.html$/.test(location.pathname)) {
      location.replace(pUrl(info.id, qs.get("vs")) + location.hash); return;
    }
    if (!id || !info) {
      if (!id && IDX.players.length) { location.replace(pUrl(IDX.players[0].id)); return; }
      $("[data-p-name]").textContent = "Jugador no encontrado";
      $("[data-p-sub]").innerHTML = '<a href="index.html#jugadores" style="color:var(--over)">Volver a la lista de jugadores</a>';
      return;
    }
    $("[data-p-name]").textContent = info.n;
    if (window.__NBA_PID__ == null) document.title = info.n + " — NBA LAB";
    loadScript("data/players/" + encodeURIComponent(id) + ".js?v=" + encodeURIComponent(IDX.updated || "1"))
      .then(function () {
        var P = (window.__NBA_PLAYERS__ || {})[id];
        if (!P) throw new Error("sin datos");
        renderPlayer(P);
      })
      .catch(function (e) {
        console.warn(e);
        $("[data-p-sub]").textContent = "No se pudieron cargar los partidos de este jugador. Comprueba que existe data/players/" + id + ".js";
      });
  }

  function renderPlayer(P) {
    var games = P.games.slice().sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
    var season = IDX.season;
    var seasonG = games.filter(function (g) { return g.s === season && !g.po; });
    if (!seasonG.length) { season = games.length ? games[games.length - 1].s : season; seasonG = games.filter(function (g) { return g.s === season && !g.po; }); }
    var last100 = games.slice(-100);
    var lastG = games[games.length - 1] || {};
    var vsParam = new URLSearchParams(location.search).get("vs");
    var nextG = nextGameFor(P.t);
    var nextOpp = vsParam || (nextG ? (nextG.h.t === P.t ? nextG.a.t : nextG.h.t) : null);
    var LS_KEY = "pl-lines-" + P.id;
    var st = {
      stats: store("pl-stats") || ["pts", "reb", "ast"],
      range: (window.innerWidth < 600 ? 20 : 100), loc: "all", opp: "all", po: true, tit: true, sup: true, mate: "", mateMode: "sin", odds: {}, manual: {}, showMin: store("pl-showmin") !== false,
      lines: store(LS_KEY) || {}, sample: "l100", evo: "pts", evoW: 5, ladder: "pts"
    };
    st.stats = st.stats.filter(function (kk) { return STAT[kk]; });
    if (!st.stats.length) st.stats = ["pts"];

    /* --- cabecera --- */
    $("[data-p-photo]").outerHTML = photoHTML(P, "p-photo");
    $("[data-p-meta]").textContent = [P.t, P.p, P.j ? "#" + P.j : ""].filter(Boolean).join(" · ");
    $("[data-p-sub]").textContent = "Temporada " + season + " · " + seasonG.length + " partidos · " + games.length + " partidos en el historial · último: " + fdate(lastG.d, true) + (lastG.o ? " " + (lastG.h ? "vs " : "@ ") + lastG.o : "");
    (function nextBanner() {
      var el = $("[data-next]");
      if (!el || !nextOpp) return;
      var home = nextG ? nextG.h.t === P.t : null, t = nextG ? madrid(nextG.utc) : null;
      var prev = games.filter(function (g) { return g.o === nextOpp; });
      var pts = prev.length ? avgOf(STAT.pts, prev) : null, pra = prev.length ? avgOf(STAT.pra, prev) : null;
      el.innerHTML = '<span class="mono nx-lbl">Próximo partido</span><b>' + (home === null ? "vs " : home ? "vs " : "@ ") + esc(nextOpp) + "</b>" +
        (t ? '<span class="mono">' + esc(t.d + " · " + t.h) + " (hora España)</span>" : "") +
        '<span class="mono nx-h2h">Contra ' + esc(nextOpp) + ": " + prev.length + " partidos" + (prev.length ? " · " + fmt(pts) + " PTS · " + fmt(pra) + " PRA" : "") + "</span>" +
        (prev.length ? '<button type="button" class="nx-btn">Ver solo partidos vs ' + esc(nextOpp) + "</button>" : "");
      el.hidden = false;
      var b = $(".nx-btn", el);
      if (b) b.addEventListener("click", function () {
        st.opp = nextOpp; oppSel.value = nextOpp; renderCharts();
        var target = document.getElementById("graficos");
        if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 70, behavior: "smooth" });
      });
    })();
    var TL = ["pts", "reb", "ast", "pra", "fg3m", "min", "stl", "blk", "fgp", "fg3p", "ftp", "ts", "usg"];
    $("[data-p-tiles]").innerHTML = TL.map(function (kk) {
      return '<div class="tile"><b>' + fmt(avgOf(STAT[kk], seasonG)) + "</b><span>" + esc(STAT[kk].s) + " · TEMP</span></div>";
    }).join("") + '<div class="tile"><b>' + seasonG.length + "</b><span>PARTIDOS</span></div>";

    /* --- medias por tramo --- */
    (function avgTable() {
      var W = [["Temp", seasonG], ["L5", games.slice(-5)], ["L10", games.slice(-10)], ["L15", games.slice(-15)], ["L20", games.slice(-20)], ["L50", games.slice(-50)], ["L100", last100]];
      var h = "<thead><tr><th>Estadística</th>" + W.map(function (w) { return "<th>" + w[0] + "</th>"; }).join("") + "<th>Máx</th><th>Mín</th><th>Tend.</th></tr></thead><tbody>";
      MAIN.forEach(function (kk) {
        var s = STAT[kk], xs = vals(s, last100);
        var mx = xs.length ? Math.max.apply(null, xs) : null, mn = xs.length ? Math.min.apply(null, xs) : null;
        var a5 = avgOf(s, games.slice(-5)), a20 = avgOf(s, games.slice(-20));
        var tr = "";
        if (a5 != null && a20 != null && a20 !== 0) {
          var d = (a5 - a20) / Math.abs(a20) * 100;
          tr = Math.abs(d) < 5 ? '<span class="muted">=</span>' : d > 0 ? '<span class="trend-up">▲ ' + Math.round(d) + "%</span>" : '<span class="trend-down">▼ ' + Math.round(-d) + "%</span>";
          if (kk === "drtg" || kk === "tov" || kk === "pf") tr = tr.replace("trend-up", "x").replace("trend-down", "trend-up").replace("x", "trend-down");
        }
        var mxG = mx != null ? last100.filter(function (g) { return val(s, g) === mx; }).pop() : null;
        var mnG = mn != null ? last100.filter(function (g) { return val(s, g) === mn; }).pop() : null;
        h += '<tr><td class="lbl">' + esc(s.l) + "<small>" + esc(s.s) + "</small></td>" +
          W.map(function (w) { return "<td>" + fmt(avgOf(s, w[1])) + "</td>"; }).join("") +
          '<td title="' + (mxG ? esc(fdate(mxG.d, true) + " vs " + mxG.o) : "") + '">' + fmt(mx, s.pct ? 1 : (Number.isInteger(mx) ? 0 : 1)) + "</td>" +
          '<td class="muted" title="' + (mnG ? esc(fdate(mnG.d, true) + " vs " + mnG.o) : "") + '">' + fmt(mn, s.pct ? 1 : (Number.isInteger(mn) ? 0 : 1)) + "</td><td>" + tr + "</td></tr>";
      });
      $("[data-avg-table]").innerHTML = h + "</tbody>";
    })();

    /* --- controles de gráficos --- */
    var groups = {};
    STATS.forEach(function (s) { (groups[s.g] = groups[s.g] || []).push(s); });
    var chips = $("[data-chips]");
    chips.innerHTML = Object.keys(groups).map(function (gname) {
      return '<div class="chip-group"><span>' + esc(gname) + "</span>" + groups[gname].map(function (s) {
        return '<button class="chip" data-k="' + s.k + '" title="' + esc(s.l) + '">' + esc(s.s) + "</button>";
      }).join("") + "</div>";
    }).join("");
    function syncChips() { $$(".chip", chips).forEach(function (c) { c.classList.toggle("on", st.stats.indexOf(c.dataset.k) > -1); }); }
    chips.addEventListener("click", function (e) {
      var c = e.target.closest(".chip");
      if (!c) return;
      var kk = c.dataset.k, i = st.stats.indexOf(kk);
      if (i > -1) { if (st.stats.length > 1) st.stats.splice(i, 1); } else { st.stats.push(kk); if (st.stats.length > 8) st.stats.shift(); }
      store("pl-stats", st.stats);
      syncChips(); renderCharts();
    });
    function seg(sel, key, cb) {
      var el = $(sel);
      el.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        $$("button", el).forEach(function (x) { x.classList.toggle("on", x === b); });
        var v = b.dataset.v;
        st[key] = (key === "range" || key === "evoW") ? +v : v;
        cb();
      });
    }
    seg("[data-range]", "range", renderCharts);
    var sideBox = $("[data-side]");
    if (sideBox) {
      sideBox.innerHTML = sideSegHTML("").replace(/^<div[^>]*>|<\/div>$/g, "");
      sideBox.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        setSide(b.dataset.v);
        $$("button", sideBox).forEach(function (x) { x.classList.toggle("on", x.dataset.v === SIDE); });
        safe(renderCharts, "charts"); safe(renderLadder, "ladder");
      });
    }
    $$("[data-range] button").forEach(function (x) { x.classList.toggle("on", +x.dataset.v === st.range); });
    seg("[data-loc]", "loc", renderCharts);
    seg("[data-sample]", "sample", renderSplits);
    seg("[data-evo-win]", "evoW", renderEvo);
    var oppSel = $("[data-opp]");
    var oppCount = {};
    games.forEach(function (g) { oppCount[g.o] = (oppCount[g.o] || 0) + 1; });
    Object.keys(oppCount).sort().forEach(function (o) { oppSel.insertAdjacentHTML("beforeend", '<option value="' + esc(o) + '">vs ' + esc(o) + " (" + oppCount[o] + ")</option>"); });
    oppSel.addEventListener("change", function () { st.opp = oppSel.value; renderCharts(); });
    $("[data-po]").addEventListener("change", function (e) { st.po = e.target.checked; renderCharts(); });

    var hasRole = games.some(function (g) { return g.st === 0 || g.st === 1; });
    var hasMates = games.some(function (g) { return g.tm && g.tm.length; });
    var mateRange = {};
    games.forEach(function (g) {
      if (g.t !== P.t) return; // solo cuenta el equipo actual (si coincidieron en otro equipo, no vale)
      (g.tm || []).forEach(function (id) {
        var r = mateRange[id];
        if (!r) mateRange[id] = [g.d, g.d]; else { if (g.d < r[0]) r[0] = g.d; if (g.d > r[1]) r[1] = g.d; }
      });
    });
    var mateInfo = {};
    IDX.players.forEach(function (p) { mateInfo[p.id] = p; });
    function mateOK(g) {
      if (!st.mate) return true;
      var id = +st.mate, has = (g.tm || []).indexOf(id) > -1;
      if (st.mateMode === "con") return has;
      var r = mateRange[id], mi = mateInfo[id];
      if (!r || g.t !== P.t) return false;
      var end = mi && mi.t === P.t ? "9999-12-31" : r[1];
      return !has && g.d >= r[0] && g.d <= end;
    }
    function roleOK(g) {
      if (st.tit && st.sup) return true;
      return st.tit ? g.st === 1 : g.st === 0;
    }
    function filtered() {
      return games.filter(function (g) {
        return (st.po || !g.po) && (st.loc === "all" || String(g.h) === st.loc) && (st.opp === "all" || g.o === st.opp) && roleOK(g) && mateOK(g);
      });
    }
    function filterLabel() {
      var parts = [];
      if (!(st.tit && st.sup)) parts.push(st.tit ? "solo como titular" : "solo como suplente");
      if (st.mate && mateInfo[st.mate]) parts.push((st.mateMode === "con" ? "con " : "sin ") + mateInfo[st.mate].n);
      return parts.join(" · ");
    }
    (function setupMinToggle() {
      var c = $("[data-showmin]");
      if (!c) return;
      c.checked = st.showMin;
      c.addEventListener("change", function () { st.showMin = c.checked; store("pl-showmin", st.showMin); renderCharts(); });
    })();
    (function setupRoleMate() {
      var rb = $("[data-role-box]"), mb = $("[data-mate-box]");
      if (!hasRole) { rb.innerHTML = '<span class="mono tb-lbl">Rol</span><span class="mono muted small">Sin datos de titular/suplente (ejecuta actualizar.bat)</span>'; }
      else {
        $$("[data-role]", rb).forEach(function (c) {
          c.addEventListener("change", function () {
            st[c.dataset.role] = c.checked;
            if (!st.tit && !st.sup) { st.tit = st.sup = true; $$("[data-role]", rb).forEach(function (x) { x.checked = true; }); }
            renderCharts(); renderLadder();
          });
        });
      }
      if (!hasMates) { mb.innerHTML = '<span class="mono tb-lbl">Compañero</span><span class="mono muted small">Sin datos de compañeros (ejecuta actualizar.bat)</span>'; return; }
      var sel = $("[data-mate]", mb), tl = teamLastOf(P.t);
      IDX.players.filter(function (p) { return p.t === P.t && String(p.id) !== String(P.id); })
        .sort(function (a, b) { return (b.avg.min || 0) - (a.avg.min || 0); })
        .forEach(function (p) {
          var con = games.filter(function (g) { return (g.tm || []).indexOf(p.id) > -1; }).length;
          var old = st.mate; st.mate = String(p.id); st.mateMode = "sin";
          var sin = games.filter(mateOK).length; st.mate = old; st.mateMode = "sin";
          var baja = tl && p.last < tl;
          sel.insertAdjacentHTML("beforeend", '<option value="' + p.id + '">' + esc(p.n) + (baja ? " ⚠ posible baja" : "") + " · con " + con + " / sin " + sin + "</option>");
        });
      sel.addEventListener("change", function () { st.mate = sel.value; renderCharts(); renderLadder(); });
      seg("[data-mate-mode]", "mateMode", function () { renderCharts(); renderLadder(); });
    })();
    function getLine(kk, pool) {
      if (st.lines[kk] != null) return st.lines[kk];
      var cm = cuoMain(P.id, kk);
      if (cm != null) return cm; // línea principal de la casa
      return lineDefault(avgOf(STAT[kk], pool.slice(-20)));
    }

    function hitStrip(s, pool, line) {
      var W2 = [["L5", pool.slice(-5)], ["L10", pool.slice(-10)], ["L15", pool.slice(-15)], ["L20", pool.slice(-20)], ["L50", pool.slice(-50)], ["L100", pool.slice(-100)],
        ["TEMP", pool.filter(function (g) { return g.s === season && !g.po; })]];
      var h2h = nextOpp || lastG.o;
      if (st.opp === "all" && h2h) W2.push(["VS " + h2h + (nextOpp ? " ▸" : ""), games.filter(function (g) { return g.o === h2h; })]);
      var xsAll = vals(s, pool), streak = 0, dir = null;
      for (var i = xsAll.length - 1; i >= 0; i--) {
        var o = hitGood(xsAll[i], line);
        if (dir === null) dir = o;
        if (o !== dir) break;
        streak++;
      }
      return W2.map(function (w) {
        var h = hitOf(s, w[1], line);
        return '<div class="hit"><span>' + esc(w[0]) + "</span>" + (h ? '<b style="color:' + (h.p >= 50 ? "var(--over)" : "var(--under)") + '">' + Math.round(h.p) + "%</b><em>" + h.o + "/" + h.n + "</em>" : "<b>—</b>") + "</div>";
      }).join("") + (xsAll.length ? '<div class="hit"><span>RACHA</span><b style="color:' + (dir ? "var(--over)" : "var(--under)") + '">' + streak + " " + (dir ? "✓" : "✗") + "</b></div>" : "");
    }

    function renderCharts() {
      var host = $("[data-charts]");
      var pool = filtered();
      var shown = pool.slice(-st.range);
      host.classList.toggle("multi", st.stats.length > 1);
      host.innerHTML = "";
      var fn = $("[data-filter-note]");
      if (fn) fn.textContent = filterLabel() ? "Filtro activo: " + filterLabel() + " · " + pool.length + " partidos" : "";
      if (!shown.length) { host.innerHTML = '<p class="empty">No hay partidos con estos filtros.</p>'; return; }
      var draws = [];
      st.stats.forEach(function (kk) {
        var s = STAT[kk], line = getLine(kk, pool);
        var card = document.createElement("article");
        card.className = "card chart-card";
        var mx = vals(s, shown);
        card.innerHTML =
          '<div class="chart-head"><h3>' + esc(s.l) + "<small>" + shown.length + " partidos" + (st.opp !== "all" ? " vs " + esc(st.opp) : "") + (st.loc !== "all" ? (st.loc === "1" ? " · local" : " · visitante") : "") + (filterLabel() ? " · " + esc(filterLabel()) : "") + "</small></h3>" +
          '<div style="display:flex;gap:8px;align-items:center"><div class="line-input"><button type="button" data-d="-1" aria-label="Bajar">−</button><input type="number" step="0.5" value="' + line + '" aria-label="Línea de apuesta"/><button type="button" data-d="1" aria-label="Subir">+</button></div>' +
          '<button class="share-btn" type="button" title="Crear imagen para compartir en X o Telegram" aria-label="Compartir imagen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Imagen</span></button>' +
          '<button class="x" title="Quitar gráfico" aria-label="Quitar gráfico">×</button></div></div>' +
          dvpLineHTML(nextOpp, P.p, kk) +
          '<div class="casas-host"></div>' +
          '<div class="odds-row"><span class="mono tb-lbl">Calcular valor</span>' +
          '<label class="odd"><span>Over</span><input type="text" inputmode="decimal" placeholder="1,85" data-odd="o" value="' + esc(st.odds[kk + "o"] || "") + '"/></label>' +
          '<label class="odd"><span>Under</span><input type="text" inputmode="decimal" placeholder="1,95" data-odd="u" value="' + esc(st.odds[kk + "u"] || "") + '"/></label>' +
          '<div class="value-out"></div></div>' +
          '<div class="hit-strip"></div><div class="plot"></div>' +
          '<div class="legend">' + legendHTML() +
          '<span><i style="border-color:var(--bet)"></i>Línea</span><span><i style="border-color:#fff;border-top-style:dashed"></i>Media ' + shown.length + '</span><span><i style="border-color:#6aa3ff;border-top-style:dotted"></i>Media 20</span><span><i style="border-color:#c08bff;border-top-style:dotted"></i>Media 10</span>' +
          (st.showMin ? '<span><i style="border-color:#4cc9ff"></i>Minutos (eje derecho)</span>' : "") +
          (mx.length ? "<span>Máx " + fmt(Math.max.apply(null, mx), s.pct ? 1 : 0) + " · Mín " + fmt(Math.min.apply(null, mx), s.pct ? 1 : 0) + "</span>" : "") + "</div>";
        host.appendChild(card);
        var inp = $(".line-input input", card);
        function valueOut() {
          var L = parseFloat(String(inp.value).replace(",", ".")) || 0;
          var xs = vals(s, shown), n = xs.length;
          var o = xs.filter(function (x) { return x > L; }).length, u = xs.filter(function (x) { return x < L; }).length;
          var out = [];
          [["o", "Over", o], ["u", "Under", u]].forEach(function (k2) {
            var odd = parseFloat(String(st.odds[kk + k2[0]] || "").replace(",", "."));
            if (!odd || odd <= 1 || !n) return;
            var pr = k2[2] / n, imp = 1 / odd, ev = pr * odd - 1;
            var cls = ev > 0.05 ? "val-yes" : ev < -0.05 ? "val-no" : "val-eq";
            var verdict = ev > 0.05 ? "✅ VALOR" : ev < -0.05 ? "❌ sin valor" : "≈ justa";
            out.push('<span class="val ' + cls + '"><b>' + k2[1] + " " + fmt(L) + " @ " + fmt(odd, 2) + "</b> · implícita " + Math.round(imp * 100) + "% · real " + Math.round(pr * 100) + "% (" + k2[2] + "/" + n + ") · EV " + (ev > 0 ? "+" : "") + Math.round(ev * 100) + "% · " + verdict + "</span>");
          });
          $(".value-out", card).innerHTML = out.length ? out.join("") : '<span class="mono muted small">Escribe la cuota y te digo si hay valor según los ' + n + " partidos mostrados.</span>";
        }
        $$("[data-odd]", card).forEach(function (oi) {
          oi.addEventListener("input", function () { st.odds[kk + oi.dataset.odd] = oi.value; st.manual[kk] = !!(oi.value || $$("[data-odd]", card).some(function (x) { return x.value && x !== oi; })); valueOut(); });
        });
        /* cuotas de las casas: bloque + relleno automático de la calculadora */
        function paintCasas(L) {
          var hostC = $(".casas-host", card);
          hostC.innerHTML = casasRowHTML(P.id, kk, L);
          if (!st.manual[kk]) {
            var at = cuoAt(P.id, kk, L), bo = cuoBest(at, "o"), bu = cuoBest(at, "u");
            st.odds[kk + "o"] = bo ? fmt(bo.v, 2) : ""; st.odds[kk + "u"] = bu ? fmt(bu.v, 2) : "";
            $$("[data-odd]", card).forEach(function (oi) { oi.value = st.odds[kk + oi.dataset.odd] || ""; });
          }
          bindCasas(hostC, function (l) { apply(l); }, function () { renderCharts(); renderLadder(); });
        }
        function apply(v) {
          v = Math.max(0, Math.round(v * 2) / 2);
          inp.value = v; st.lines[kk] = v; store(LS_KEY, st.lines);
          drawBars($(".plot", card), s, shown, v, pool, st.showMin);
          $(".hit-strip", card).innerHTML = hitStrip(s, pool, v);
          paintCasas(v);
          valueOut();
        }
        inp.addEventListener("change", function () { apply(parseFloat(String(inp.value).replace(",", ".")) || 0); });
        $$("[data-d]", card).forEach(function (b) { b.addEventListener("click", function () { apply((parseFloat(inp.value) || 0) + (+b.dataset.d)); }); });
        $(".share-btn", card).addEventListener("click", function () { safe(function () { shareImage(s, pool, parseFloat(String(inp.value).replace(",", ".")) || 0, {
          P: P, games: games, season: season, opp: nextOpp, nextG: nextG, allOpp: st.opp === "all",
          filt: [filterLabel(), st.opp !== "all" ? "vs " + st.opp : "", st.loc === "1" ? "solo local" : st.loc === "0" ? "solo visitante" : ""].filter(Boolean).join(" · ") }); }, "share"); });
        $(".x", card).addEventListener("click", function () {
          var i = st.stats.indexOf(kk);
          if (i > -1 && st.stats.length > 1) { st.stats.splice(i, 1); store("pl-stats", st.stats); syncChips(); renderCharts(); }
        });
        $(".hit-strip", card).innerHTML = hitStrip(s, pool, line);
        paintCasas(line);
        valueOut();
        draws.push(function () { drawBars($(".plot", card), s, shown, line, pool, st.showMin); });
      });
      draws.forEach(function (d) { safe(d, "drawBars"); });
    }

    /* --- escalera de líneas --- */
    function fillStatSelect(sel, cur) {
      sel.innerHTML = STATS.map(function (s) { return '<option value="' + s.k + '"' + (s.k === cur ? " selected" : "") + ">" + esc(s.l) + " (" + esc(s.s) + ")</option>"; }).join("");
    }
    function renderLadder() {
      var s = STAT[st.ladder];
      var games = filtered(), last100 = games.slice(-100), seasonG = games.filter(function (g) { return g.s === season && !g.po; });
      var base = lineDefault(avgOf(s, games.slice(-20)));
      var step = (s.pct || st.ladder === "min" || ["ortg", "drtg", "pace", "usg", "ts", "efg"].indexOf(st.ladder) > -1) ? 2 : (["pts", "pra", "pr", "pa"].indexOf(st.ladder) > -1 ? 1 : 1);
      var lines = [];
      for (var i = -5; i <= 5; i++) { var L = base + i * step; if (L > 0) lines.push(L); }
      var W3 = [["L5", games.slice(-5)], ["L10", games.slice(-10)], ["L15", games.slice(-15)], ["L20", games.slice(-20)], ["L50", games.slice(-50)], ["L100", last100], ["Temp", seasonG], ["Local L100", last100.filter(function (g) { return g.h; })], ["Visit. L100", last100.filter(function (g) { return !g.h; })]];
      var conCuotas = cuoLines(P.id, st.ladder).length > 0;
      if (conCuotas) { // añade las líneas que ofrecen las casas
        cuoPrefList(cuoLines(P.id, st.ladder)).forEach(function (x) { if (x.o && !lines.some(function (l) { return sameL(l, x.l); })) lines.push(x.l); });
        lines.sort(function (a, b) { return a - b; });
      }
      var sd = SIDE === "under" ? "u" : "o";
      var h = "<thead><tr><th>Línea (" + (SIDE === "under" ? "menos" : "más") + ")</th>" + (conCuotas ? "<th>Cuota</th>" : "") + W3.map(function (w) { return "<th>" + w[0] + "</th>"; }).join("") + "</tr></thead><tbody>";
      lines.forEach(function (L) {
        h += '<tr><td class="line">' + (SIDE === "under" ? "−" : "+") + fmt(L) + "</td>" + (conCuotas ? '<td class="odd-td">' + oddCell(cuoBest(cuoAt(P.id, st.ladder, L), sd)) + "</td>" : "") +
          W3.map(function (w) { return "<td>" + pctCell(hitOf(s, w[1], L)) + "</td>"; }).join("") + "</tr>";
      });
      $("[data-ladder]").innerHTML = h + "</tbody>";
    }
    var ladSel = $("[data-ladder-stat]");
    fillStatSelect(ladSel, st.ladder);
    ladSel.addEventListener("change", function () { st.ladder = ladSel.value; renderLadder(); });

    /* --- evolución --- */
    function renderEvo() {
      var s = STAT[st.evo];
      var pool = seasonG.length >= 10 ? seasonG : last100;
      var lbl = seasonG.length >= 10 ? "temporada " + season : "últimos " + pool.length + " partidos";
      var xs = pool.map(function (g) { return val(s, g); });
      var W = Math.max(320, Math.round($("[data-evo]").clientWidth || 960)), H = 260, pl = 34, pr = 16, pt = 16, pb = 26, n = xs.length;
      if (!n) { $("[data-evo]").innerHTML = '<p class="empty">Sin partidos.</p>'; return; }
      var real = xs.filter(function (x) { return x != null; });
      var tk = niceStep(Math.max.apply(null, real.concat([1])) * 1.05 / 4), mx = tk * Math.ceil(Math.max.apply(null, real.concat([1])) * 1.05 / tk);
      var X = function (i) { return pl + (n === 1 ? (W - pl - pr) / 2 : i / (n - 1) * (W - pl - pr)); };
      var Y = function (v) { return pt + (H - pt - pb) - v / mx * (H - pt - pb); };
      var roll = [], cum = [], sum = 0, cnt = 0;
      xs.forEach(function (x, i) {
        if (x != null) { sum += x; cnt++; }
        cum.push(cnt ? sum / cnt : null);
        var win = xs.slice(Math.max(0, i - st.evoW + 1), i + 1).filter(function (v) { return v != null; });
        roll.push(win.length ? win.reduce(function (a, b) { return a + b; }, 0) / win.length : null);
      });
      function path(arr) { var d = ""; arr.forEach(function (v, i) { if (v == null) return; d += (d ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1); }); return d; }
      var o = ['<svg viewBox="0 0 ' + W + " " + H + '" class="chart-svg"><defs><linearGradient id="evoGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#19f08b" stop-opacity=".28"/><stop offset="1" stop-color="#19f08b" stop-opacity="0"/></linearGradient></defs><g class="grid">'];
      for (var v = 0; v <= mx + 1e-9; v += tk) { o.push('<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + fmt(v, v % 1 ? 1 : 0) + "</text>"); }
      o.push('</g><g class="xl">');
      var stepX = Math.max(1, Math.ceil(n / 8));
      for (var j = 0; j < n; j += stepX) o.push('<text x="' + X(j) + '" y="' + (H - 8) + '" text-anchor="middle">' + fdate(pool[j].d) + "</text>");
      o.push("</g>");
      var rp = path(roll);
      if (rp) o.push('<path class="area" d="' + rp + "L" + X(n - 1) + " " + Y(0) + "L" + X(0) + " " + Y(0) + 'Z"/>');
      xs.forEach(function (x, i) { if (x != null) o.push('<circle class="pt" cx="' + X(i).toFixed(1) + '" cy="' + Y(x).toFixed(1) + '" r="3"><title>' + esc(fdate(pool[i].d, true) + " vs " + pool[i].o + ": " + fmt(x, s.pct ? 1 : 0)) + "</title></circle>"); });
      o.push('<path class="roll" d="' + rp + '"/><path class="cum" d="' + path(cum) + '"/></svg>');
      $("[data-evo]").innerHTML = o.join("") +
        '<div class="legend"><span><i style="border-color:var(--over)"></i>Media móvil ' + st.evoW + '</span><span><i style="border-color:#6aa3ff;border-top-style:dashed"></i>Media acumulada</span><span><i class="sq" style="background:var(--dim);border-radius:50%"></i>Partido</span><span>' + esc(s.l) + " · " + esc(lbl) + "</span></div>";
    }
    var evoSel = $("[data-evo-stat]");
    fillStatSelect(evoSel, st.evo);
    evoSel.addEventListener("change", function () { st.evo = evoSel.value; renderEvo(); });

    /* --- local / visitante --- */
    function renderSplits() {
      var pool = st.sample === "season" ? seasonG : st.sample === "l100" ? last100 : games;
      var H1 = pool.filter(function (g) { return g.h; }), A1 = pool.filter(function (g) { return !g.h; });
      var T1 = pool.filter(function (g) { return g.st === 1; }), S1 = pool.filter(function (g) { return g.st === 0; });
      function dcell(d) { return '<td class="' + (d == null || Math.abs(d) < 0.05 ? "muted" : d > 0 ? "trend-up" : "trend-down") + '">' + (d == null ? "—" : (d > 0 ? "+" : "") + fmt(d)) + "</td>"; }
      var h = "<thead><tr><th>Estadística</th><th>Local (" + H1.length + ")</th><th>Visitante (" + A1.length + ")</th><th>Dif.</th>" +
        (hasRole ? "<th>Titular (" + T1.length + ")</th><th>Suplente (" + S1.length + ")</th><th>Dif.</th>" : "") + "<th>Total (" + pool.length + ")</th></tr></thead><tbody>";
      MAIN.forEach(function (kk) {
        var s = STAT[kk], a = avgOf(s, H1), b = avgOf(s, A1), d = a != null && b != null ? a - b : null;
        var t = avgOf(s, T1), u = avgOf(s, S1), d2 = t != null && u != null ? t - u : null;
        h += '<tr><td class="lbl">' + esc(s.l) + "<small>" + esc(s.s) + "</small></td><td>" + fmt(a) + "</td><td>" + fmt(b) + "</td>" + dcell(d) +
          (hasRole ? "<td>" + fmt(t) + "</td><td>" + fmt(u) + "</td>" + dcell(d2) : "") + '<td class="muted">' + fmt(avgOf(s, pool)) + "</td></tr>";
      });
      $("[data-splits]").innerHTML = h + "</tbody>";
    }

    /* --- minutos y rotación --- */
    function renderMinutes() {
      var reg = games.filter(function (g) { return !g.po; });
      var mS = avgOf(STAT.min, seasonG), m5 = avgOf(STAT.min, reg.slice(-5)), m10 = avgOf(STAT.min, reg.slice(-10)), m20 = avgOf(STAT.min, reg.slice(-20));
      var known = seasonG.filter(function (g) { return g.st === 0 || g.st === 1; });
      var gs = known.filter(function (g) { return g.st === 1; }).length;
      var last5 = reg.slice(-5).map(function (g) { return g.st === 1 ? "T" : g.st === 0 ? "S" : "·"; }).join(" ");
      var d = (m5 != null && mS != null) ? m5 - mS : null;
      $("[data-min-tiles]").innerHTML =
        '<div class="tile"><b>' + fmt(mS) + "</b><span>MIN · TEMP</span></div>" +
        '<div class="tile"><b>' + fmt(m5) + "</b><span>MIN · L5</span></div>" +
        '<div class="tile"><b>' + fmt(m10) + "</b><span>MIN · L10</span></div>" +
        '<div class="tile"><b>' + fmt(m20) + "</b><span>MIN · L20</span></div>" +
        '<div class="tile"><b class="' + (d == null || Math.abs(d) < 1 ? "" : d > 0 ? "trend-up" : "trend-down") + '">' + (d == null ? "—" : (d > 0 ? "+" : "") + fmt(d)) + "</b><span>L5 VS TEMP</span></div>" +
        (hasRole ? '<div class="tile"><b>' + gs + "/" + known.length + "</b><span>TITULAR · TEMP</span></div>" +
          '<div class="tile"><b class="mono" style="font-size:20px">' + esc(last5) + "</b><span>ROL ÚLT. 5</span></div>" : "");
      var al = $("[data-rot-alert]");
      if (d != null && Math.abs(d) >= 4) {
        al.hidden = false;
        al.className = "rot-alert " + (d > 0 ? "up" : "down");
        al.innerHTML = (d > 0 ? "▲ <b>Más minutos:</b> " : "▼ <b>Menos minutos:</b> ") + fmt(m5) + " min en los últimos 5 frente a " + fmt(mS) + " de media esta temporada (" + (d > 0 ? "+" : "") + fmt(d) + "). Posible cambio de rotación: revisa sus líneas.";
      } else al.hidden = true;
      // gráfico: últimos 30 partidos
      var pool = reg.slice(-30), host = $("[data-min-chart]");
      if (!pool.length) { host.innerHTML = '<p class="empty">Sin partidos.</p>'; return; }
      var W = Math.max(320, Math.round(host.clientWidth || 960)), H = 220, pl = 34, pr = 16, pt = 14, pb = 26, n = pool.length;
      var bw = (W - pl - pr) / n, mx = Math.max(48, Math.max.apply(null, pool.map(function (g) { return g.min; })) + 2);
      var Y = function (v) { return pt + (H - pt - pb) - v / mx * (H - pt - pb); };
      var o = ['<svg class="chart-svg" viewBox="0 0 ' + W + " " + H + '"><g class="grid">'];
      [0, 12, 24, 36, 48].forEach(function (v) { o.push('<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + "</text>"); });
      o.push("</g>");
      pool.forEach(function (g, i) {
        var x = pl + i * bw + bw * 0.15, w = bw * 0.7, y = Y(g.min);
        var c = g.st === 1 ? "var(--over)" : g.st === 0 ? "#6aa3ff" : "var(--dim)";
        o.push('<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (pt + (H - pt - pb) - y).toFixed(1) + '" rx="2" fill="' + c + '" opacity=".85"><title>' + esc(fdate(g.d, true) + " " + (g.h ? "vs " : "@ ") + g.o + " · " + fmt(g.min) + " min" + (g.st === 1 ? " · titular" : g.st === 0 ? " · suplente" : "")) + "</title></rect>");
      });
      var roll = pool.map(function (g, i) { var w2 = pool.slice(Math.max(0, i - 4), i + 1); return w2.reduce(function (a, b) { return a + b.min; }, 0) / w2.length; });
      o.push('<path d="' + roll.map(function (v, i) { return (i ? "L" : "M") + (pl + (i + 0.5) * bw).toFixed(1) + " " + Y(v).toFixed(1); }).join("") + '" stroke="var(--bet)" stroke-width="2.5" fill="none"/>');
      if (mS != null) o.push('<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(mS) + '" y2="' + Y(mS) + '" stroke="#fff" stroke-dasharray="6 5" opacity=".7"/>');
      o.push('<g class="xl">');
      for (var j = 0; j < n; j += Math.max(1, Math.ceil(n / 8))) o.push('<text x="' + (pl + (j + 0.5) * bw).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + fdate(pool[j].d) + "</text>");
      o.push("</g></svg>");
      host.innerHTML = o.join("") + '<div class="legend"><span><i class="sq" style="background:var(--over)"></i>Titular</span><span><i class="sq" style="background:#6aa3ff"></i>Suplente</span>' +
        (hasRole ? "" : '<span><i class="sq" style="background:var(--dim)"></i>Sin dato</span>') +
        '<span><i style="border-color:var(--bet)"></i>Media móvil 5</span><span><i style="border-color:#fff;border-top-style:dashed"></i>Media temporada</span><span>Últimos ' + n + " partidos</span></div>";
    }

    /* --- rivales --- */
    function renderRivals() {
      var by = {};
      games.forEach(function (g) { (by[g.o] = by[g.o] || []).push(g); });
      var cols = ["min", "pts", "reb", "ast", "pra", "fg3m", "stl", "blk"];
      var h = "<thead><tr><th>Rival</th><th>PJ</th>" + cols.map(function (c) { return "<th>" + STAT[c].s + "</th>"; }).join("") + "<th>Último</th></tr></thead><tbody>";
      Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length || a.localeCompare(b); }).forEach(function (o) {
        var gs = by[o], lg = gs[gs.length - 1];
        h += '<tr data-opp="' + esc(o) + '"><td class="lbl">vs ' + esc(o) + "</td><td>" + gs.length + "</td>" +
          cols.map(function (c) {
            var a = avgOf(STAT[c], gs), base = avgOf(STAT[c], last100), cls = "";
            if (a != null && base && c !== "min") cls = a > base * 1.1 ? "trend-up" : a < base * 0.9 ? "trend-down" : "";
            return '<td class="' + cls + '">' + fmt(a) + "</td>";
          }).join("") + '<td class="muted">' + fdate(lg.d) + " · " + lg.pts + "/" + lg.reb + "/" + lg.ast + "</td></tr>";
      });
      var tb = $("[data-rivals]");
      tb.innerHTML = h + "</tbody>";
      tb.addEventListener("click", function (e) {
        var tr = e.target.closest("tr[data-opp]");
        if (!tr) return;
        st.opp = tr.dataset.opp; oppSel.value = st.opp;
        renderCharts();
        var target = document.getElementById("graficos");
        if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 70, behavior: "smooth" });
      });
    }

    /* --- registro de partidos --- */
    function renderLog() {
      var rows = last100.slice().reverse();
      var h = "<thead><tr><th>Fecha</th><th>Rival</th><th>Res</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>PRA</th><th>ROB</th><th>TAP</th><th>PÉR</th><th>FP</th><th>TC</th><th>3P</th><th>TL</th><th>+/-</th><th>USG%</th><th>TS%</th><th>ORTG</th><th>DRTG</th><th>PACE</th></tr></thead><tbody>";
      rows.forEach(function (g) {
        h += "<tr><td>" + fdate(g.d, true) + (g.po ? ' <span class="badge">PO</span>' : "") + "</td><td>" + (g.h ? "vs " : "@ ") + esc(g.o) + '</td><td class="' + (g.r === "W" ? "w" : "l") + '">' + (g.r === "W" ? "V" : g.r === "L" ? "D" : "—") + "</td><td>" + fmt(g.min, 0) + "</td><td><b>" + g.pts + "</b></td><td>" + g.reb + "</td><td>" + g.ast + "</td><td>" + (g.pts + g.reb + g.ast) + "</td><td>" + g.stl + "</td><td>" + g.blk + "</td><td>" + g.tov + "</td><td>" + g.pf + "</td><td>" + g.fgm + "/" + g.fga + "</td><td>" + g.fg3m + "/" + g.fg3a + "</td><td>" + g.ftm + "/" + g.fta + "</td><td>" + (g.pm > 0 ? "+" : "") + g.pm + "</td><td>" + fmt(g.usg) + "</td><td>" + fmt(g.ts) + "</td><td>" + fmt(g.ortg) + "</td><td>" + fmt(g.drtg) + "</td><td>" + fmt(g.pace) + "</td></tr>";
      });
      $("[data-log]").innerHTML = h + "</tbody>";
    }


    /* --- defensa del próximo rival contra su posición --- */
    function renderDefense() {
      var sec = document.getElementById("defensa"), host = $("[data-p-dvp]");
      if (!sec || !host) return;
      var g = posGroup(P.p), D = dvpData();
      if (!nextOpp || !g || !D.teams[nextOpp]) { sec.hidden = true; return; }
      sec.hidden = false;
      var c = D.teams[nextOpp][g], l10 = games.slice(-10);
      $("[data-p-dvp-title]").textContent = "Cómo defiende " + nextOpp + " a los " + POS_SHORT[g];
      $("[data-p-dvp-lead]").innerHTML = "Lo que promedian los " + esc(POS_SHORT[g]) + " (" + esc(g) + ") contra " + esc(nextOpp) + " esta temporada, comparado con la media de la liga. " +
        "Puesto 1º = el equipo que <b>más</b> concede (mejor para el over). " + c.n + " partidos de jugadores con " + DVP_MIN + "+ minutos.";
      var good = [], bad = [];
      host.innerHTML = DVP_STATS.map(function (s) {
        var x = c[s];
        if (x.d != null && x.d >= 6) good.push(STAT[s].l + " (" + dvpPct(x.d) + ")");
        if (x.d != null && x.d <= -6) bad.push(STAT[s].l + " (" + dvpPct(x.d) + ")");
        return '<div class="tile dv-tile ' + dvpClass(x.d) + '"><span>' + esc(STAT[s].s) + " CONCEDE</span><b>" + fmt(x.v) + "</b>" +
          '<em>' + dvpPct(x.d) + " vs liga · " + dvpRank(x.r, D.nTeams) + "</em>" +
          '<small>' + esc(P.n.split(" ").slice(-1)[0]) + " L10: " + fmt(avgOf(STAT[s], l10)) + "</small></div>";
      }).join("");
      var sum = [];
      if (good.length) sum.push('<span class="dv-up">▲ Favorable para el over: ' + esc(good.join(", ")) + "</span>");
      if (bad.length) sum.push('<span class="dv-down">▼ Defiende bien: ' + esc(bad.join(", ")) + "</span>");
      if (!sum.length) sum.push('<span class="muted">Defensa en la media de la liga en todas las estadísticas.</span>');
      if (c.n < 8) sum.push('<span class="muted">Pocos partidos todavía: tómalo con cautela.</span>');
      $("[data-p-dvp-sum]").innerHTML = sum.join("");
    }

    /* --- rendimiento cuando falta un compañero --- */
    function mateGames(id, mode) {
      id = +id;
      var r = mateRange[id], mi = mateInfo[id];
      return games.filter(function (g) {
        var has = (g.tm || []).indexOf(id) > -1;
        if (mode === "con") return has && g.t === P.t;
        if (!r || g.t !== P.t) return false;
        var end = mi && mi.t === P.t ? "9999-12-31" : r[1];
        return !has && g.d >= r[0] && g.d <= end;
      });
    }
    function renderMates() {
      var host = $("[data-mates]"), al = $("[data-mates-alert]");
      if (!host) return;
      if (!hasMates) { host.innerHTML = '<tbody><tr><td class="muted">Sin datos de compañeros todavía.</td></tr></tbody>'; return; }
      var tl = teamLastOf(P.t), COLS = ["min", "pts", "reb", "ast", "pra", "fg3m"];
      var rows = IDX.players.filter(function (p) { return p.t === P.t && String(p.id) !== String(P.id); })
        .sort(function (a, b) { return (b.avg.min || 0) - (a.avg.min || 0); }).slice(0, 10)
        .map(function (m) { return { m: m, con: mateGames(m.id, "con"), sin: mateGames(m.id, "sin"), baja: !!(tl && m.last < tl) }; })
        .filter(function (r) { return r.con.length >= 3 && (r.sin.length >= 3 || r.baja); });
      rows.sort(function (a, b) { return (b.baja - a.baja) || ((b.m.avg.min || 0) - (a.m.avg.min || 0)); });
      if (!rows.length) { host.innerHTML = '<tbody><tr><td class="muted">Todavía no hay compañeros con al menos 3 partidos sin ellos en este equipo.</td></tr></tbody>'; return; }
      var h = "<thead><tr><th>Compañero</th><th>PJ con / sin</th>" + COLS.map(function (c) { return "<th>" + STAT[c].s + " sin él</th>"; }).join("") + "</tr></thead><tbody>";
      var alerts = [];
      rows.forEach(function (r) {
        var few = r.sin.length < 3;
        h += '<tr data-mate-id="' + r.m.id + '" class="' + (r.baja ? "mate-baja" : "") + '"><td class="lbl">' + esc(r.m.n) + "<small>" + fmt(r.m.avg.min) + " min</small>" +
          (r.baja ? ' <span class="badge warn">posible baja</span>' : "") + "</td><td>" + r.con.length + " / " + r.sin.length + "</td>" +
          COLS.map(function (c) {
            if (few) return '<td class="muted">—</td>';
            var a = avgOf(STAT[c], r.sin), b = avgOf(STAT[c], r.con), d = (a != null && b != null) ? a - b : null;
            var big = d != null && b ? Math.abs(d) / Math.max(1, Math.abs(b)) >= 0.1 : false;
            return '<td class="mate-cell"><b>' + fmt(a) + '</b><em class="' + (d == null || !big ? "muted" : d > 0 ? "trend-up" : "trend-down") + '">' + (d == null ? "" : (d > 0 ? "+" : "") + fmt(d)) + "</em></td>";
          }).join("") + "</tr>";
        if (r.baja && !few) {
          alerts.push("⚠ <b>" + esc(r.m.n) + "</b> no jugó el último partido de " + esc(P.t) + " (posible baja). Sin él, " + esc(P.n) + " promedia <b>" +
            fmt(avgOf(STAT.pts, r.sin)) + " PTS · " + fmt(avgOf(STAT.pra, r.sin)) + " PRA · " + fmt(avgOf(STAT.min, r.sin)) + " MIN</b> en " + r.sin.length +
            " partidos (con él: " + fmt(avgOf(STAT.pts, r.con)) + " PTS · " + fmt(avgOf(STAT.pra, r.con)) + " PRA).");
        }
      });
      host.innerHTML = h + "</tbody>";
      if (al) { al.hidden = !alerts.length; al.innerHTML = alerts.join("<br>"); }
      host.addEventListener("click", function (e) {
        var tr = e.target.closest("tr[data-mate-id]");
        if (!tr) return;
        st.mate = tr.dataset.mateId; st.mateMode = "sin";
        var sel = $("[data-mate]"); if (sel) sel.value = st.mate;
        $$("[data-mate-mode] button").forEach(function (b) { b.classList.toggle("on", b.dataset.v === "sin"); });
        renderCharts(); renderLadder();
        var target = document.getElementById("graficos");
        if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 70, behavior: "smooth" });
      });
    }


    syncChips();
    safe(renderCharts, "charts");
    safe(renderDefense, "defense");
    safe(renderMates, "mates");
    cuotasLoad().then(function () {
      if (!CUO || !CUO.j || !CUO.j[P.id]) return;
      safe(renderCharts, "charts-cuotas"); safe(renderLadder, "ladder-cuotas");
    });
    safe(renderLadder, "ladder");
    safe(renderEvo, "evo");
    safe(renderSplits, "splits");
    safe(renderMinutes, "minutes");
    safe(renderRivals, "rivals");
    safe(renderLog, "log");
    var rz = 0, lastW = window.innerWidth;
    window.addEventListener("resize", function () {
      tipHide();
      clearTimeout(rz);
      rz = setTimeout(function () { if (Math.abs(window.innerWidth - lastW) > 30) { lastW = window.innerWidth; safe(renderCharts, "charts"); safe(renderEvo, "evo"); safe(renderMinutes, "minutes"); } }, 200);
    });
  }


  /* =========================================================================
     PÁGINA DE PARTIDO
     ========================================================================= */
  function bootMatch() {
    var q = new URLSearchParams(location.search);
    var gid = q.get("g");
    var G = SCHED ? SCHED.games.filter(function (x) { return x.id === gid; })[0] : null;
    if (!G) {
      $("[data-m-title]").innerHTML = "<h1>Partido no encontrado</h1>";
      $("[data-m-sub]").innerHTML = '<a href="index.html#calendario" style="color:var(--over)">Volver al calendario</a>';
      return;
    }
    var t = madrid(G.utc), fin = G.st === 3;
    function teamTitle(tm) { return '<span class="m-team">' + (logoUrl(tm.t) ? '<img src="' + logoUrl(tm.t) + '" alt="" onerror="this.remove()">' : "") + "<b>" + esc(tm.t) + "</b>" + (fin ? '<em>' + esc(tm.s) + "</em>" : "") + "</span>"; }
    $("[data-m-title]").innerHTML = teamTitle(G.a) + '<span class="m-at">@</span>' + teamTitle(G.h);
    $("[data-m-sub]").textContent = (fin ? "Final" : t.d + " · " + t.h + " (hora España)") + " · " + G.a.t + " " + (teamRec(G.a) || "") + " · " + G.h.t + " " + (teamRec(G.h) || "");
    document.title = G.a.t + " @ " + G.h.t + " — NBA LAB";

    var MSTATS = ["pts", "reb", "ast", "pra", "pr", "pa", "ra", "fg3m", "fg3a", "stl", "blk", "sb", "tov", "min"];
    var ms = { team: G.a.t, pos: "all", q: "", pid: q.get("p") || null, stat: "pts", range: 20, loc: "all", opp: "all", po: true, mate: "", mateMode: "sin", tit: true, sup: true, showMin: store("pl-showmin") !== false, lines: {}, odds: {}, manual: false };
    function oppOf(team) { return team === G.h.t ? G.a.t : G.h.t; }
    function isHome(team) { return team === G.h.t ? 1 : 0; }
    var roster = {};
    [G.a.t, G.h.t].forEach(function (tm) {
      roster[tm] = IDX.players.filter(function (p) { return p.t === tm; }).sort(function (a, b) { return (b.avg.min || 0) - (a.avg.min || 0); });
    });
    var pinfo = {};
    IDX.players.forEach(function (p) { pinfo[p.id] = p; });
    if (ms.pid && pinfo[ms.pid] && roster[pinfo[ms.pid].t]) ms.team = pinfo[ms.pid].t; else ms.pid = null;

    // pestañas de equipo
    var teamsEl = $("[data-m-teams]");
    teamsEl.innerHTML = [G.a.t, G.h.t].map(function (tm) {
      return '<button type="button" data-t="' + tm + '">' + (logoUrl(tm) ? '<img src="' + logoUrl(tm) + '" alt="" onerror="this.remove()">' : "") + esc(tm) + "<small>" + (tm === G.h.t ? "Local" : "Visitante") + "</small></button>";
    }).join("");
    function syncTeams() { $$("button", teamsEl).forEach(function (b) { b.classList.toggle("on", b.dataset.t === ms.team && !ms.q); }); }
    teamsEl.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      ms.team = b.dataset.t; ms.q = ""; $("[data-m-search]").value = ""; syncTeams(); renderList();
    });
    $("[data-m-pos]").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      $$("[data-m-pos] button").forEach(function (x) { x.classList.toggle("on", x === b); });
      ms.pos = b.dataset.v; renderList();
    });
    $("[data-m-search]").addEventListener("input", function (e) { ms.q = normTxt(e.target.value.trim()); syncTeams(); renderList(); });

    // lista de jugadores
    function renderList() {
      var listEl = $("[data-m-list]");
      var src = ms.q ? roster[G.a.t].concat(roster[G.h.t]) : roster[ms.team];
      var list = src.filter(function (p) {
        var c = String(p.p || "").charAt(0).toUpperCase();
        return (ms.pos === "all" || c === ms.pos) && (!ms.q || normTxt(p.n).indexOf(ms.q) > -1);
      });
      var stat = STAT[ms.stat];
      $("[data-m-note]").textContent = stat.s + " · últimos 5 partidos" + (ms.q ? " · buscando en " + G.a.t + " y " + G.h.t : "");
      if (!list.length) { listEl.innerHTML = '<p class="empty small">Ningún jugador coincide.</p>'; return; }
      listEl.innerHTML = list.map(function (p) {
        var tl = teamLastOf(p.t), baja = tl && p.last < tl;
        var ser = idxSeries(p, ms.stat).slice(-5), ref = lineDefault(idxAvg(p, ms.stat));
        var chips = ser.map(function (v) { return '<i class="' + (v > ref ? "o" : "u") + '">' + fmt(v, v % 1 ? 1 : 0) + "</i>"; }).join("");
        var role = p.gsn ? '<em class="role-tag mono">' + (p.gs / p.gsn >= 0.5 ? "TIT" : "SUP") + "</em>" : "";
        return '<button type="button" class="m-item' + (String(p.id) === String(ms.pid) ? " on" : "") + (baja ? " is-out" : "") + '" data-id="' + p.id + '">' +
          photoHTML(p) + '<span class="m-item-body"><b>' + esc(p.n) + "</b><small>" + (ms.q ? esc(p.t) + " · " : "") + esc(p.p || "—") + " " + role + (baja ? ' <em class="out-tag mono">POSIBLE BAJA</em>' : "") + "</small>" +
          '<span class="m-chips">' + chips + "</span></span></button>";
      }).join("");
    }
    $("[data-m-list]").addEventListener("click", function (e) {
      var b = e.target.closest(".m-item"); if (!b) return;
      selectPlayer(b.dataset.id);
      if (window.innerWidth < 900) { var m = $(".m-main"); window.scrollTo({ top: m.getBoundingClientRect().top + window.pageYOffset - 70, behavior: "smooth" }); }
    });

    // estadísticas (chips)
    var statsEl = $("[data-m-stats]");
    statsEl.innerHTML = MSTATS.map(function (k2) { return '<button type="button" class="chip" data-k="' + k2 + '" title="' + esc(STAT[k2].l) + '">' + esc(STAT[k2].s) + "</button>"; }).join("");
    function syncStats() { $$(".chip", statsEl).forEach(function (c) { c.classList.toggle("on", c.dataset.k === ms.stat); }); }
    statsEl.addEventListener("click", function (e) {
      var c = e.target.closest(".chip"); if (!c) return;
      ms.stat = c.dataset.k; syncStats(); renderList(); renderChart();
    });
    function seg2(sel, key) {
      $(sel).addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        $$(sel + " button").forEach(function (x) { x.classList.toggle("on", x === b); });
        ms[key] = key === "range" ? +b.dataset.v : b.dataset.v; renderChart();
      });
    }
    seg2("[data-m-range]", "range"); seg2("[data-m-loc]", "loc");
    var mSide = $("[data-m-side]");
    if (mSide) {
      mSide.innerHTML = sideSegHTML("").replace(/^<div[^>]*>|<\/div>$/g, "");
      mSide.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        setSide(b.dataset.v);
        $$("button", mSide).forEach(function (x) { x.classList.toggle("on", x.dataset.v === SIDE); });
        renderChart();
      });
    }
    $$("[data-m-role] [data-role]").forEach(function (c) {
      c.addEventListener("change", function () {
        ms[c.dataset.role] = c.checked;
        if (!ms.tit && !ms.sup) { ms.tit = ms.sup = true; $$("[data-m-role] [data-role]").forEach(function (x) { x.checked = true; }); }
        renderChart();
      });
    });
    var oppSel = $("[data-m-opp]"), mateSel = $("[data-m-mate]");
    oppSel.addEventListener("change", function () { ms.opp = oppSel.value; renderChart(); });
    $("[data-m-po]").addEventListener("change", function (e) { ms.po = e.target.checked; renderChart(); });
    mateSel.addEventListener("change", function () { ms.mate = mateSel.value; renderChart(); });
    seg2("[data-m-mate-mode]", "mateMode");
    var mateRange = {};
    function mateOK(g) {
      if (!ms.mate) return true;
      var id = +ms.mate, has = (g.tm || []).indexOf(id) > -1;
      if (ms.mateMode === "con") return has;
      var r = mateRange[id], mi = pinfo[id];
      if (!r || g.t !== cur.P.t) return false;
      var end = mi && mi.t === cur.P.t ? "9999-12-31" : r[1];
      return !has && g.d >= r[0] && g.d <= end;
    }
    function setupPlayerFilters() {
      var P = cur.P, gs = cur.games;
      // rivales
      var cnt = {};
      gs.forEach(function (g) { cnt[g.o] = (cnt[g.o] || 0) + 1; });
      oppSel.innerHTML = '<option value="all">Todos los rivales</option>' + Object.keys(cnt).sort().map(function (o) {
        return '<option value="' + esc(o) + '">vs ' + esc(o) + " (" + cnt[o] + ")" + (o === oppOf(P.t) ? " · rival de hoy" : "") + "</option>";
      }).join("");
      if (ms.opp !== "all" && !cnt[ms.opp]) ms.opp = "all";
      oppSel.value = ms.opp;
      // compañeros
      mateRange = {};
      gs.forEach(function (g) {
        (g.tm || []).forEach(function (id) {
          var r = mateRange[id];
          if (!r) mateRange[id] = [g.d, g.d]; else { if (g.d < r[0]) r[0] = g.d; if (g.d > r[1]) r[1] = g.d; }
        });
      });
      ms.mate = "";
      var box = $("[data-m-mate-box]");
      if (!gs.some(function (g) { return g.tm && g.tm.length; })) { mateSel.innerHTML = '<option value="">Sin datos de compañeros</option>'; mateSel.disabled = true; return; }
      mateSel.disabled = false;
      var tl = teamLastOf(P.t), oldMode = ms.mateMode, opts = '<option value="">— Ninguno —</option>';
      IDX.players.filter(function (p) { return p.t === P.t && String(p.id) !== String(P.id); })
        .sort(function (a, b) { return (b.avg.min || 0) - (a.avg.min || 0); })
        .forEach(function (p) {
          var con = gs.filter(function (g) { return (g.tm || []).indexOf(p.id) > -1; }).length;
          ms.mate = String(p.id); ms.mateMode = "sin";
          var sin = gs.filter(mateOK).length;
          var baja = tl && p.last < tl;
          opts += '<option value="' + p.id + '">' + esc(p.n) + (baja ? " ⚠ posible baja" : "") + " · con " + con + " / sin " + sin + "</option>";
        });
      ms.mate = ""; ms.mateMode = oldMode;
      mateSel.innerHTML = opts;
      if (box) box.hidden = false;
    }
    function filterNote() {
      var parts = [];
      if (ms.opp !== "all") parts.push("vs " + ms.opp);
      if (!ms.po) parts.push("sin playoffs");
      if (!(ms.tit && ms.sup)) parts.push(ms.tit ? "solo titular" : "solo suplente");
      if (ms.mate && pinfo[ms.mate]) parts.push((ms.mateMode === "con" ? "con " : "sin ") + pinfo[ms.mate].n);
      return parts.join(" · ");
    }
    var smc = $("[data-m-showmin]"); smc.checked = ms.showMin;
    smc.addEventListener("change", function () { ms.showMin = smc.checked; store("pl-showmin", ms.showMin); renderChart(); });
    var lineInp = $("[data-m-line]");
    function setLine(v) { v = Math.max(0, Math.round(v * 2) / 2); ms.lines[ms.pid + ms.stat] = v; renderChart(); }
    lineInp.addEventListener("change", function () { setLine(parseFloat(String(lineInp.value).replace(",", ".")) || 0); });
    $$("[data-m-card] [data-d]").forEach(function (b) { b.addEventListener("click", function () { setLine((parseFloat(lineInp.value) || 0) + (+b.dataset.d)); }); });
    $$("[data-m-card] [data-odd]").forEach(function (oi) { oi.addEventListener("input", function () { ms.odds[oi.dataset.odd] = oi.value; ms.manual = $$("[data-m-card] [data-odd]").some(function (x) { return x.value; }); renderValue(); }); });

    var mShare = $("[data-m-share]");
    if (mShare) mShare.addEventListener("click", function () {
      if (!cur) return;
      safe(function () {
        var P = cur.P;
        shareImage(STAT[ms.stat], pool(), parseFloat(String(lineInp.value).replace(",", ".")) || 0, {
          P: P, games: cur.games, season: IDX.season, opp: oppOf(P.t), nextG: G, allOpp: ms.opp === "all",
          filt: [filterNote(), ms.loc === "1" ? "solo local" : ms.loc === "0" ? "solo visitante" : ""].filter(Boolean).join(" · ") });
      }, "share");
    });
    var cur = null; // { P, games }
    function selectPlayer(id) {
      ms.pid = String(id);
      $$(".m-item").forEach(function (b) { b.classList.toggle("on", b.dataset.id === ms.pid); });
      try { history.replaceState(null, "", "partido.html?g=" + encodeURIComponent(gid) + "&p=" + ms.pid); } catch (_) {}
      var have = (window.__NBA_PLAYERS__ || {})[id];
      var go = function () {
        var P = (window.__NBA_PLAYERS__ || {})[id];
        if (!P) { $("[data-m-player]").innerHTML = '<p class="empty">No se pudieron cargar los partidos de este jugador.</p>'; return; }
        cur = { P: P, games: P.games.slice().sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; }) };
        setupPlayerFilters();
        ms.odds = {}; ms.manual = false; $$("[data-m-card] [data-odd]").forEach(function (oi) { oi.value = ""; });
        renderChart();
      };
      if (have) go(); else loadScript("data/players/" + encodeURIComponent(id) + ".js?v=" + encodeURIComponent(IDX.updated || "1")).then(go, go);
    }

    function pool() {
      return cur.games.filter(function (g) {
        return (ms.po || !g.po) && (ms.opp === "all" || g.o === ms.opp) && (ms.loc === "all" || String(g.h) === ms.loc) &&
          (ms.tit && ms.sup ? true : ms.tit ? g.st === 1 : g.st === 0) && mateOK(g);
      });
    }
    function renderValue() {
      if (!cur) return;
      var s = STAT[ms.stat], pl = pool(), shown = pl.slice(-ms.range), L = parseFloat(lineInp.value) || 0;
      var xs = vals(s, shown), n = xs.length, o = xs.filter(function (x) { return x > L; }).length, u = xs.filter(function (x) { return x < L; }).length, out = [];
      [["o", "Over", o], ["u", "Under", u]].forEach(function (k2) {
        var odd = parseFloat(String(ms.odds[k2[0]] || "").replace(",", "."));
        if (!odd || odd <= 1 || !n) return;
        var pr = k2[2] / n, ev = pr * odd - 1;
        var cls = ev > 0.05 ? "val-yes" : ev < -0.05 ? "val-no" : "val-eq";
        out.push('<span class="val ' + cls + '"><b>' + k2[1] + " " + fmt(L) + " @ " + fmt(odd, 2) + "</b> · implícita " + Math.round(100 / odd) + "% · real " + Math.round(pr * 100) + "% (" + k2[2] + "/" + n + ") · EV " + (ev > 0 ? "+" : "") + Math.round(ev * 100) + "% · " + (ev > 0.05 ? "✅ VALOR" : ev < -0.05 ? "❌ sin valor" : "≈ justa") + "</span>");
      });
      $("[data-m-value]").innerHTML = out.length ? out.join("") : '<span class="mono muted small">Escribe la cuota y te digo si hay valor según los ' + n + " partidos mostrados.</span>";
    }
    function renderChart() {
      if (!cur) return;
      var P = cur.P, s = STAT[ms.stat], pl = pool(), shown = pl.slice(-ms.range);
      var opp = oppOf(P.t), home = isHome(P.t);
      var L = ms.lines[ms.pid + ms.stat];
      if (L == null) L = cuoMain(P.id, ms.stat);
      if (L == null) L = lineDefault(avgOf(s, pl.slice(-20)));
      lineInp.value = L;
      var mdv = $("[data-m-dvp]");
      if (mdv) { var dvh = dvpLineHTML(opp, P.p, ms.stat); mdv.hidden = !dvh; mdv.innerHTML = dvh; }
      var mc = $("[data-m-casas]");
      if (mc) {
        mc.innerHTML = casasRowHTML(P.id, ms.stat, L);
        bindCasas(mc, function (l) { setLine(l); }, function () { renderChart(); });
      }
      if (!ms.manual) {
        var atM = cuoAt(P.id, ms.stat, L), bo = cuoBest(atM, "o"), bu = cuoBest(atM, "u");
        ms.odds.o = bo ? fmt(bo.v, 2) : ""; ms.odds.u = bu ? fmt(bu.v, 2) : "";
        $$("[data-m-card] [data-odd]").forEach(function (oi) { oi.value = ms.odds[oi.dataset.odd] || ""; });
      }
      var h = hitOf(s, shown, L), mAvg = avgOf(STAT.min, shown);
      var mLeg = $("[data-m-leg]"); if (mLeg) mLeg.innerHTML = legendHTML();
      $("[data-m-player]").innerHTML = photoHTML(P, "m-photo") +
        '<div class="m-pinfo"><h2>' + esc(P.n) + '</h2><p class="mono">' + esc([P.t, P.p, P.j ? "#" + P.j : ""].filter(Boolean).join(" · ")) + " · " + esc(s.l) + " · últimos " + shown.length + "</p></div>" +
        '<div class="m-sum"><div><span>Media gráfico</span><b>' + fmt(avgOf(s, shown)) + "</b></div>" +
        '<div><span>Hit rate</span><b style="color:' + (h && h.p >= 50 ? "var(--over)" : "var(--under)") + '">' + (h ? Math.round(h.p) + "% <small>(" + h.o + "/" + h.n + ")</small>" : "—") + "</b></div>" +
        "<div><span>Min. medios</span><b>" + fmt(mAvg) + "</b></div></div>";
      var fnote = filterNote();
      $("[data-m-chart-title]").innerHTML = esc(s.l) + "<small>" + shown.length + " partidos" + (ms.loc !== "all" ? (ms.loc === "1" ? " · local" : " · visitante") : "") + (fnote ? " · " + esc(fnote) : "") + "</small>";
      $("[data-m-filter-note]").textContent = fnote ? "Filtro activo: " + fnote + " · " + pl.length + " partidos" : "";
      var season = IDX.season, W2 = [["L5", pl.slice(-5)], ["L10", pl.slice(-10)], ["L15", pl.slice(-15)], ["L20", pl.slice(-20)],
        ["TEMP", pl.filter(function (g) { return g.s === season && !g.po; })],
        [home ? "LOCAL" : "VISIT.", cur.games.filter(function (g) { return g.h === home && g.s === season; })],
        ["VS " + opp, cur.games.filter(function (g) { return g.o === opp; })]];
      $("[data-m-hits]").innerHTML = W2.map(function (w) {
        var hh = hitOf(s, w[1], L);
        return '<div class="hit"><span>' + esc(w[0]) + "</span>" + (hh ? '<b style="color:' + (hh.p >= 50 ? "var(--over)" : "var(--under)") + '">' + Math.round(hh.p) + "%</b><em>" + hh.o + "/" + hh.n + "</em>" : "<b>—</b>") + "</div>";
      }).join("");
      $("[data-m-full]").href = pUrl(P.id, opp);
      if (!shown.length) { $("[data-m-plot]").innerHTML = '<p class="empty">No hay partidos con estos filtros.</p>'; }
      else drawBars($("[data-m-plot]"), s, shown, L, pl, ms.showMin);
      renderValue();
    }

    syncTeams(); syncStats(); renderList();
    var first = ms.pid && pinfo[ms.pid] ? ms.pid : (roster[ms.team][0] || roster[G.h.t][0] || {}).id;
    if (first) selectPlayer(first);
    cuotasLoad().then(function () { if (CUO) safe(renderChart, "chart-cuotas"); });
    var rz = 0, lw = window.innerWidth;
    window.addEventListener("resize", function () { tipHide(); clearTimeout(rz); rz = setTimeout(function () { if (Math.abs(window.innerWidth - lw) > 30) { lw = window.innerWidth; renderChart(); } }, 200); });
  }

  /* =========================================================================
     Arranque
     ========================================================================= */
  function boot() {
    var page = document.body.getAttribute("data-page");
    safe(initStatus, "status");
    safe(initMouseGradient, "gradient");
    safe(initTelegram, "telegram");
    if (page === "home") {
      if (!IDX.players.length) {
        safe(mountCalendar, "calendar");
        var g = $("[data-grid]");
        if (g) g.innerHTML = '<p class="empty">Aún no hay datos. Ejecuta <code>tools/actualizar.bat</code> para descargarlos de NBA.com.</p>';
      } else {
        safe(mountCounters, "counters");
        safe(mountTicker, "ticker");
        safe(mountSuggest, "suggest");
        safe(mountGrid, "grid");
        safe(mountScanner, "scanner");
        safe(mountCalendar, "calendar");
        safe(mountDefense, "defense");
      }
    } else if (page === "player") {
      safe(bootPlayer, "player");
    } else if (page === "match") {
      safe(bootMatch, "match");
    }
    safe(initReveals, "reveals");
    document.documentElement.classList.add("is-ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

/* =========================================================================
   NBA LAB como app (PWA): instalar en el móvil, funcionar sin conexión
   y barra de pestañas cuando se abre desde el icono.
   ========================================================================= */
(function () {
  "use strict";
  var d = document, html = d.documentElement, ua = navigator.userAgent || "";
  var TG = (window.__BRAND__ && window.__BRAND__.telegram && window.__BRAND__.telegram.url) || "https://t.me/+vensGz7cBlY3MzQ8";
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (_) { return null; } }

  /* --- 1. Etiquetas de app (por si la página se generó antes de añadirlas) --- */
  function tag(name, attrs) {
    var el = d.createElement(name);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    d.head.appendChild(el);
  }
  if (!d.querySelector('link[rel="manifest"]')) {
    tag("link", { rel: "manifest", href: "/manifest.webmanifest" });
    tag("meta", { name: "theme-color", content: "#08090b" });
    tag("link", { rel: "apple-touch-icon", href: "/assets/img/apple-touch-icon.png" });
    tag("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
    tag("meta", { name: "apple-mobile-web-app-title", content: "NBA LAB" });
    tag("meta", { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" });
    var vp = d.querySelector('meta[name="viewport"]');
    if (vp && vp.content.indexOf("viewport-fit") < 0) vp.content += ", viewport-fit=cover";
  }

  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var isMobile = isIOS || isAndroid;
  var inApp = (isAndroid && /; wv\)/.test(ua)) || (isIOS && !/Safari\//.test(ua)) || /Instagram|FBAN|FBAV|Telegram|Twitter/i.test(ua);
  var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  if (standalone) html.classList.add("is-app");

  /* --- 2. Service worker --- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
  }

  /* --- 3. En la app: si vuelves tras un rato, recarga para ver los datos nuevos --- */
  var hiddenAt = 0;
  d.addEventListener("visibilitychange", function () {
    if (d.hidden) { hiddenAt = Date.now(); return; }
    if (standalone && hiddenAt && Date.now() - hiddenAt > 20 * 60 * 1000) location.reload();
  });

  var IC = {
    home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>',
    scan: '<path d="M5 20V12M10 20V6M15 20v-9M20 20v-5M3 9.5h18" />',
    tg: '<path d="M21.5 3.5 2.8 10.7c-.9.4-.9 1.6.1 1.9l4.6 1.5 1.8 5.6c.3.8 1.3 1 1.9.4l2.6-2.5 4.9 3.6c.7.5 1.7.1 1.9-.7L23 4.9c.2-1-.7-1.8-1.5-1.4Z" fill="currentColor" stroke="none"/>',
    dl: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>',
    plus: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>'
  };
  function svg(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + "</svg>"; }

  /* --- 4. Barra de pestañas (solo dentro de la app) --- */
  function tabbar() {
    var page = d.body.getAttribute("data-page");
    var pre = page === "home" ? "" : "index.html";
    var items = [
      ["home", "Inicio", pre + "#top", "top"],
      ["cal", "Partidos", pre + "#calendario", "calendario"],
      ["users", "Jugadores", pre + "#jugadores", "jugadores"],
      ["scan", "Escáner", pre + "#escaner", "escaner"],
      ["tg", "Telegram", TG, "tg"]
    ];
    var nav = d.createElement("nav");
    nav.className = "app-tabs";
    nav.setAttribute("aria-label", "Secciones");
    nav.innerHTML = items.map(function (it) {
      var ext = it[3] === "tg";
      return '<a href="' + it[2] + '" data-tab="' + it[3] + '"' + (ext ? ' target="_blank" rel="noopener" class="is-tg"' : "") + ">" + svg(it[0]) + "<span>" + it[1] + "</span></a>";
    }).join("");
    d.body.appendChild(nav);
    nav.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (a && a.dataset.tab === "top" && page === "home") { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }
    });
    function mark() {
      var cur = page === "player" ? "jugadores" : page === "match" ? "calendario" : "top";
      if (page === "home") {
        ["calendario", "jugadores", "escaner"].forEach(function (id) {
          var s = d.getElementById(id);
          if (s && s.getBoundingClientRect().top < window.innerHeight * 0.45) cur = id;
        });
      }
      Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) { a.classList.toggle("on", a.dataset.tab === cur); });
    }
    window.addEventListener("scroll", mark, { passive: true });
    mark();
  }

  /* --- 5. Instalar la app --- */
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    html.classList.add("can-install");
    maybeBanner(800);
  });
  window.addEventListener("appinstalled", function () {
    deferred = null;
    ls("nbalab-installed", "1");
    closeBanner();
    html.classList.remove("can-install");
  });

  function sheet(kind) {
    var old = d.querySelector(".app-sheet");
    if (old) old.remove();
    var steps;
    if (kind === "inapp") {
      steps = "<li>Pulsa el menú <b>⋮</b> o <b>···</b> de arriba.</li><li>Elige <b>Abrir en el navegador</b> (Chrome o Safari).</li><li>Allí pulsa <b>Instalar app</b>.</li>";
    } else if (kind === "ios") {
      steps = "<li>Pulsa el botón <b>Compartir</b> " + svg("share") + " de la barra de Safari.</li><li>Baja y elige <b>Añadir a pantalla de inicio</b> " + svg("plus") + ".</li><li>Pulsa <b>Añadir</b>. El icono de NBA LAB aparecerá con tus apps.</li>";
    } else {
      steps = "<li>Abre el menú del navegador <b>⋮</b>.</li><li>Pulsa <b>Instalar app</b> o <b>Añadir a pantalla de inicio</b>.</li><li>Confirma. El icono de NBA LAB aparecerá con tus apps.</li>";
    }
    var el = d.createElement("div");
    el.className = "app-sheet" + (kind === "ios" ? " is-ios" : "");
    el.innerHTML = '<div class="app-sheet-card" role="dialog" aria-modal="true" aria-label="Instalar la app">' +
      '<button class="app-x" type="button" aria-label="Cerrar">×</button>' +
      '<div class="app-sheet-head"><img src="/assets/img/icon-192.png" alt="" /><div><b>Instala NBA LAB</b><span>Gratis · sin tiendas · siempre al día</span></div></div>' +
      "<ol>" + steps + "</ol></div>";
    d.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    el.addEventListener("click", function (e) { if (e.target === el || e.target.closest(".app-x")) el.remove(); });
  }

  function install() {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function (r) { if (r && r.outcome === "accepted") closeBanner(); deferred = null; });
      return;
    }
    sheet(inApp ? "inapp" : isIOS ? "ios" : "other");
  }
  window.nbaInstall = install;

  var banner = null;
  function closeBanner(remember) {
    if (remember) ls("nbalab-banner-off", String(Date.now()));
    html.classList.remove("has-banner");
    if (banner) { banner.classList.remove("show"); var b = banner; setTimeout(function () { b.remove(); }, 400); banner = null; }
  }
  function maybeBanner(delay) {
    if (standalone || banner || !isMobile || ls("nbalab-installed")) return;
    var off = +ls("nbalab-banner-off") || 0;
    if (Date.now() - off < 5 * 24 * 3600 * 1000) return;
    setTimeout(function () {
      if (banner) return;
      banner = d.createElement("div");
      banner.className = "app-banner";
      banner.innerHTML = '<img src="/assets/img/icon-192.png" alt="" /><div class="app-banner-txt"><b>Instala NBA LAB</b><span>Gratis · se abre a pantalla completa</span></div>' +
        '<button type="button" class="app-banner-btn">Instalar</button><button type="button" class="app-x" aria-label="Cerrar">×</button>';
      d.body.appendChild(banner);
      banner.querySelector(".app-banner-btn").addEventListener("click", install);
      banner.querySelector(".app-x").addEventListener("click", function () { closeBanner(true); });
      html.classList.add("has-banner");
      requestAnimationFrame(function () { banner && banner.classList.add("show"); });
    }, delay);
  }

  function boot() {
    if (standalone) { ls("nbalab-installed", "1"); tabbar(); return; }
    // botón "App" en la cabecera y enlace en el pie
    var navTg = d.querySelector(".nav .nav-tg");
    if (navTg) {
      var b = d.createElement("button");
      b.type = "button"; b.className = "nav-app"; b.innerHTML = svg("dl") + "<span>App</span>";
      b.setAttribute("aria-label", "Instalar la app");
      b.addEventListener("click", install);
      navTg.parentNode.insertBefore(b, navTg);
    }
    var foot = d.querySelector(".footer > div");
    if (foot) {
      foot.insertAdjacentHTML("beforeend", ' · <a href="#" class="foot-app">📲 Instalar la app</a>');
      foot.querySelector(".foot-app").addEventListener("click", function (e) { e.preventDefault(); install(); });
    }
    // En iPhone y en navegadores sin aviso propio, mostramos el nuestro
    if (isIOS || inApp) maybeBanner(4000);
    else if (isAndroid) setTimeout(function () {
      if (deferred) return;
      var chk = navigator.getInstalledRelatedApps ? navigator.getInstalledRelatedApps() : Promise.resolve([]);
      chk.then(function (apps) { if (apps && apps.length) ls("nbalab-installed", "1"); else maybeBanner(0); }, function () { maybeBanner(0); });
    }, 6000);
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", boot); else boot();
})();
