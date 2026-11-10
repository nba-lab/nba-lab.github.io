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
  function hitOf(s, games, line) {
    var xs = vals(s, games);
    if (!xs.length) return null;
    var o = 0, pu = 0;
    xs.forEach(function (x) { if (x > line) o++; else if (x === line) pu++; });
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
  function pUrl(id) { return "jugador.html?id=" + encodeURIComponent(id); }

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
      box.classList.toggle("disabled", mode === "avg");
      var rows = IDX.players.filter(function (p) { return (p.l20.pts || []).length >= 5; }).map(function (p) {
        var ser = idxSeries(p, key), line = mode === "avg" ? lineDefault(idxAvg(p, key)) : fixed;
        var l10 = ser.slice(-10);
        return { p: p, ser: ser, line: line, l5: rate(ser, line, 5, under), l10: rate(ser, line, 10, under), l20: rate(ser, line, 20, under),
          avg10: l10.reduce(function (a, b) { return a + b; }, 0) / (l10.length || 1) };
      });
      var so = sSort.value;
      rows.sort(function (a, b) {
        if (so === "avg10") return b.avg10 - a.avg10;
        return ((b[so] || {}).p || 0) - ((a[so] || {}).p || 0) || b.avg10 - a.avg10;
      });
      body.innerHTML = rows.slice(0, 60).map(function (r) {
        var bars = r.ser.slice(-10).map(function (v) {
          var mx = Math.max(r.line * 1.6, 1), h = Math.max(3, Math.min(26, v / mx * 26));
          return '<i class="' + ((under ? v < r.line : v > r.line) ? "o" : "") + '" style="height:' + h.toFixed(0) + 'px" title="' + fmt(v, 0) + '"></i>';
        }).join("");
        return "<tr>" +
          '<td><a class="player-cell" href="' + pUrl(r.p.id) + '">' + photoHTML(r.p) + "<span>" + esc(r.p.n) + "<small>" + esc(r.p.t) + " · " + esc(r.p.p) + "</small></span></a></td>" +
          '<td class="mono" style="color:var(--bet)">' + (under ? "U " : "O ") + fmt(r.line) + "</td>" +
          "<td>" + pctCell(r.l5) + "</td><td>" + pctCell(r.l10) + "</td><td>" + pctCell(r.l20) + "</td>" +
          '<td class="mono">' + fmt(r.avg10) + '</td><td class="hide-sm"><span class="bars-mini">' + bars + "</span></td></tr>";
      }).join("");
    }
    sStat.addEventListener("change", function () { sLine.value = DEF[sStat.value]; render(); });
    [sMode, sLine, sSort, sUnder].forEach(function (el) { el.addEventListener("input", render); });
    $("[data-s-dec]").addEventListener("click", function () { sLine.value = Math.max(0.5, (+sLine.value || 0) - 1); render(); });
    $("[data-s-inc]").addEventListener("click", function () { sLine.value = (+sLine.value || 0) + 1; render(); });
    render();
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
  function teamRec(t) { return (t.w != null && t.l != null && (t.w + t.l) > 0) ? t.w + "-" + t.l : ""; }

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
    function playerRows(team, opp) {
      var ps = IDX.players.filter(function (p) { return p.t === team; }).sort(function (a, b) { return (b.avg.min || 0) - (a.avg.min || 0); }).slice(0, 13);
      if (!ps.length) return '<p class="empty small">Sin jugadores de este equipo en los datos.</p>';
      return '<div class="roster-head mono"><span>Jugador</span><span>MIN</span><span>PTS</span><span>REB</span><span>AST</span><span>3PM</span><span>PRA</span></div>' +
        ps.map(function (p) {
          var a = p.avg;
          return '<a class="roster-row" href="' + pUrl(p.id) + "&vs=" + encodeURIComponent(opp) + '">' +
            '<span class="player-cell">' + photoHTML(p) + "<span>" + esc(p.n) + "<small>" + esc(p.p || "—") + (p.j ? " · #" + esc(p.j) : "") + "</small></span></span>" +
            "<span>" + fmt(a.min) + "</span><span><b>" + fmt(a.pts) + "</b></span><span>" + fmt(a.reb) + "</span><span>" + fmt(a.ast) + "</span><span>" + fmt(a.fg3m) + "</span><span>" + fmt(a.pts + a.reb + a.ast) + "</span></a>";
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
          side(g.h, hw, true) + '<span class="g-cta mono">Ver jugadores ↓</span></button>';
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
        '<div class="gp-cols"><div><h4><span class="mono">Visitante</span> ' + esc(g.a.t) + "</h4>" + playerRows(g.a.t, g.h.t) + "</div>" +
        '<div><h4><span class="mono">Local</span> ' + esc(g.h.t) + "</h4>" + playerRows(g.h.t, g.a.t) + "</div></div>";
      last.insertAdjacentElement("afterend", panel);
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
      if (b) openGame(b);
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

  function bootPlayer() {
    var id = new URLSearchParams(location.search).get("id");
    var info = IDX.players.filter(function (p) { return String(p.id) === String(id); })[0];
    if (!id || !info) {
      if (!id && IDX.players.length) { location.replace(pUrl(IDX.players[0].id)); return; }
      $("[data-p-name]").textContent = "Jugador no encontrado";
      $("[data-p-sub]").innerHTML = '<a href="index.html#jugadores" style="color:var(--over)">Volver a la lista de jugadores</a>';
      return;
    }
    $("[data-p-name]").textContent = info.n;
    document.title = info.n + " — NBA LAB";
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
      range: 100, loc: "all", opp: "all", po: true,
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
      var W = [["Temp", seasonG], ["L5", games.slice(-5)], ["L10", games.slice(-10)], ["L20", games.slice(-20)], ["L50", games.slice(-50)], ["L100", last100]];
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
    seg("[data-loc]", "loc", renderCharts);
    seg("[data-sample]", "sample", renderSplits);
    seg("[data-evo-win]", "evoW", renderEvo);
    var oppSel = $("[data-opp]");
    var oppCount = {};
    games.forEach(function (g) { oppCount[g.o] = (oppCount[g.o] || 0) + 1; });
    Object.keys(oppCount).sort().forEach(function (o) { oppSel.insertAdjacentHTML("beforeend", '<option value="' + esc(o) + '">vs ' + esc(o) + " (" + oppCount[o] + ")</option>"); });
    oppSel.addEventListener("change", function () { st.opp = oppSel.value; renderCharts(); });
    $("[data-po]").addEventListener("change", function (e) { st.po = e.target.checked; renderCharts(); });

    function filtered() {
      return games.filter(function (g) {
        return (st.po || !g.po) && (st.loc === "all" || String(g.h) === st.loc) && (st.opp === "all" || g.o === st.opp);
      });
    }
    function getLine(kk, pool) {
      if (st.lines[kk] != null) return st.lines[kk];
      return lineDefault(avgOf(STAT[kk], pool.slice(-20)));
    }

    /* --- gráfico de barras --- */
    function drawBars(host, s, shown, line, pool) {
      var W = Math.max(320, Math.round(host.clientWidth || 960)), H = W < 640 ? 250 : 300, pl = 34, pr = 92, pt = 14, pb = 26;
      var n = shown.length, iw = W - pl - pr, ih = H - pt - pb, bw = iw / Math.max(n, 1);
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
        var bx = pl + i2 * bw + bw * gap / 2, w2 = Math.max(1, bw * (1 - gap));
        if (x == null) { out.push('<rect class="bar p" data-i="' + i2 + '" x="' + bx.toFixed(1) + '" y="' + (pt + ih - 2) + '" width="' + w2.toFixed(1) + '" height="2"/>'); return; }
        var y0 = Y(Math.max(0, x)), hh = Math.max(2, pt + ih - y0);
        var c = x > line ? "o" : x < line ? "u" : "p";
        out.push('<rect class="bar ' + c + '" data-i="' + i2 + '" x="' + bx.toFixed(1) + '" y="' + (pt + ih - hh).toFixed(1) + '" width="' + w2.toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="' + Math.min(3, w2 / 3).toFixed(1) + '"/>');
      });
      // eje x: fechas
      out.push('<g class="xl">');
      var stepX = Math.max(1, Math.ceil(n / 8));
      for (var j = 0; j < n; j += stepX) out.push('<text x="' + (pl + (j + 0.5) * bw).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + fdate(shown[j].d) + "</text>");
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
        out.push('<g class="lab"><rect x="' + (W - pr + 6) + '" y="' + (l.y - 9).toFixed(1) + '" width="' + (pr - 8) + '" height="18" fill="' + l.c + '"/><text x="' + (W - pr + 12) + '" y="' + (l.y + 4).toFixed(1) + '" fill="' + l.f + '">' + esc(l.t) + "</text></g>");
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

    function hitStrip(s, pool, line) {
      var W2 = [["L5", pool.slice(-5)], ["L10", pool.slice(-10)], ["L20", pool.slice(-20)], ["L50", pool.slice(-50)], ["L100", pool.slice(-100)],
        ["TEMP", pool.filter(function (g) { return g.s === season && !g.po; })]];
      var h2h = nextOpp || lastG.o;
      if (st.opp === "all" && h2h) W2.push(["VS " + h2h + (nextOpp ? " ▸" : ""), games.filter(function (g) { return g.o === h2h; })]);
      var xsAll = vals(s, pool), streak = 0, dir = null;
      for (var i = xsAll.length - 1; i >= 0; i--) {
        var o = xsAll[i] > line;
        if (dir === null) dir = o;
        if (o !== dir) break;
        streak++;
      }
      return W2.map(function (w) {
        var h = hitOf(s, w[1], line);
        return '<div class="hit"><span>' + esc(w[0]) + "</span>" + (h ? '<b style="color:' + (h.p >= 50 ? "var(--over)" : "var(--under)") + '">' + Math.round(h.p) + "%</b><em>" + h.o + "/" + h.n + "</em>" : "<b>—</b>") + "</div>";
      }).join("") + (xsAll.length ? '<div class="hit"><span>RACHA</span><b style="color:' + (dir ? "var(--over)" : "var(--under)") + '">' + streak + " " + (dir ? "O" : "U") + "</b></div>" : "");
    }

    function renderCharts() {
      var host = $("[data-charts]");
      var pool = filtered();
      var shown = pool.slice(-st.range);
      host.classList.toggle("multi", st.stats.length > 1);
      host.innerHTML = "";
      if (!shown.length) { host.innerHTML = '<p class="empty">No hay partidos con estos filtros.</p>'; return; }
      var draws = [];
      st.stats.forEach(function (kk) {
        var s = STAT[kk], line = getLine(kk, pool);
        var card = document.createElement("article");
        card.className = "card chart-card";
        var mx = vals(s, shown);
        card.innerHTML =
          '<div class="chart-head"><h3>' + esc(s.l) + "<small>" + shown.length + " partidos" + (st.opp !== "all" ? " vs " + esc(st.opp) : "") + (st.loc !== "all" ? (st.loc === "1" ? " · local" : " · visitante") : "") + "</small></h3>" +
          '<div style="display:flex;gap:8px;align-items:center"><div class="line-input"><button type="button" data-d="-1" aria-label="Bajar">−</button><input type="number" step="0.5" value="' + line + '" aria-label="Línea de apuesta"/><button type="button" data-d="1" aria-label="Subir">+</button></div>' +
          '<button class="x" title="Quitar gráfico" aria-label="Quitar gráfico">×</button></div></div>' +
          '<div class="hit-strip"></div><div class="plot"></div>' +
          '<div class="legend"><span><i class="sq" style="background:var(--over)"></i>Over</span><span><i class="sq" style="background:var(--under)"></i>Under</span>' +
          '<span><i style="border-color:var(--bet)"></i>Línea</span><span><i style="border-color:#fff;border-top-style:dashed"></i>Media ' + shown.length + '</span><span><i style="border-color:#6aa3ff;border-top-style:dotted"></i>Media 20</span><span><i style="border-color:#c08bff;border-top-style:dotted"></i>Media 10</span>' +
          (mx.length ? "<span>Máx " + fmt(Math.max.apply(null, mx), s.pct ? 1 : 0) + " · Mín " + fmt(Math.min.apply(null, mx), s.pct ? 1 : 0) + "</span>" : "") + "</div>";
        host.appendChild(card);
        var inp = $("input", card);
        function apply(v) {
          v = Math.max(0, Math.round(v * 2) / 2);
          inp.value = v; st.lines[kk] = v; store(LS_KEY, st.lines);
          drawBars($(".plot", card), s, shown, v, pool);
          $(".hit-strip", card).innerHTML = hitStrip(s, pool, v);
        }
        inp.addEventListener("change", function () { apply(parseFloat(String(inp.value).replace(",", ".")) || 0); });
        $$("[data-d]", card).forEach(function (b) { b.addEventListener("click", function () { apply((parseFloat(inp.value) || 0) + (+b.dataset.d)); }); });
        $(".x", card).addEventListener("click", function () {
          var i = st.stats.indexOf(kk);
          if (i > -1 && st.stats.length > 1) { st.stats.splice(i, 1); store("pl-stats", st.stats); syncChips(); renderCharts(); }
        });
        $(".hit-strip", card).innerHTML = hitStrip(s, pool, line);
        draws.push(function () { drawBars($(".plot", card), s, shown, line, pool); });
      });
      draws.forEach(function (d) { safe(d, "drawBars"); });
    }

    /* --- escalera de líneas --- */
    function fillStatSelect(sel, cur) {
      sel.innerHTML = STATS.map(function (s) { return '<option value="' + s.k + '"' + (s.k === cur ? " selected" : "") + ">" + esc(s.l) + " (" + esc(s.s) + ")</option>"; }).join("");
    }
    function renderLadder() {
      var s = STAT[st.ladder];
      var base = lineDefault(avgOf(s, games.slice(-20)));
      var step = (s.pct || st.ladder === "min" || ["ortg", "drtg", "pace", "usg", "ts", "efg"].indexOf(st.ladder) > -1) ? 2 : (["pts", "pra", "pr", "pa"].indexOf(st.ladder) > -1 ? 1 : 1);
      var lines = [];
      for (var i = -5; i <= 5; i++) { var L = base + i * step; if (L > 0) lines.push(L); }
      var W3 = [["L5", games.slice(-5)], ["L10", games.slice(-10)], ["L20", games.slice(-20)], ["L50", games.slice(-50)], ["L100", last100], ["Temp", seasonG], ["Local L100", last100.filter(function (g) { return g.h; })], ["Visit. L100", last100.filter(function (g) { return !g.h; })]];
      var h = "<thead><tr><th>Línea (over)</th>" + W3.map(function (w) { return "<th>" + w[0] + "</th>"; }).join("") + "</tr></thead><tbody>";
      lines.forEach(function (L) {
        h += '<tr><td class="line">+' + fmt(L) + "</td>" + W3.map(function (w) { return "<td>" + pctCell(hitOf(s, w[1], L)) + "</td>"; }).join("") + "</tr>";
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
      var h = "<thead><tr><th>Estadística</th><th>Local (" + H1.length + ")</th><th>Visitante (" + A1.length + ")</th><th>Diferencia</th><th>Total (" + pool.length + ")</th></tr></thead><tbody>";
      MAIN.forEach(function (kk) {
        var s = STAT[kk], a = avgOf(s, H1), b = avgOf(s, A1), d = a != null && b != null ? a - b : null;
        h += '<tr><td class="lbl">' + esc(s.l) + "<small>" + esc(s.s) + "</small></td><td>" + fmt(a) + "</td><td>" + fmt(b) + "</td><td class=\"" + (d == null || Math.abs(d) < 0.05 ? "muted" : d > 0 ? "trend-up" : "trend-down") + '">' + (d == null ? "—" : (d > 0 ? "+" : "") + fmt(d)) + "</td><td class=\"muted\">" + fmt(avgOf(s, pool)) + "</td></tr>";
      });
      $("[data-splits]").innerHTML = h + "</tbody>";
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

    syncChips();
    safe(renderCharts, "charts");
    safe(renderLadder, "ladder");
    safe(renderEvo, "evo");
    safe(renderSplits, "splits");
    safe(renderRivals, "rivals");
    safe(renderLog, "log");
    var rz = 0, lastW = window.innerWidth;
    window.addEventListener("resize", function () {
      tipHide();
      clearTimeout(rz);
      rz = setTimeout(function () { if (Math.abs(window.innerWidth - lastW) > 30) { lastW = window.innerWidth; safe(renderCharts, "charts"); safe(renderEvo, "evo"); } }, 200);
    });
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
      }
    } else if (page === "player") {
      safe(bootPlayer, "player");
    }
    safe(initReveals, "reveals");
    document.documentElement.classList.add("is-ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
