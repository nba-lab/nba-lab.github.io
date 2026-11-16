/* NBA LAB · Defensa del rival por posición (lo usan la web y el bot de valor).
   Con los partidos de ESTA temporada de todos los jugadores (data/index.js) calcula
   cuánto promedian bases/escoltas (G), aleros (F) y pívots (C) contra cada equipo.
   Solo cuentan jugadores con 20 minutos o más en ese partido.
   Ranking: 1º = el equipo que MÁS permite · 30º = el que MENOS permite. */
(function (G) {
  "use strict";
  var EQUIPOS = ["ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW", "HOU", "IND", "LAC", "LAL", "MEM",
    "MIA", "MIL", "MIN", "NOP", "NYK", "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS"];
  var BASE = ["pts", "reb", "ast", "fg3m", "stl", "blk", "tov"];
  var STATS = {
    pts: "puntos", reb: "rebotes", ast: "asistencias", fg3m: "triples", stl: "robos", blk: "tapones", tov: "pérdidas",
    pra: "puntos+rebotes+asistencias", pr: "puntos+rebotes", pa: "puntos+asistencias", ra: "rebotes+asistencias", sb: "robos+tapones"
  };
  var POS = { G: "bases y escoltas", F: "aleros", C: "pívots" };
  var MIN_MIN = 20;

  function posGroup(p) { var c = String(p || "").charAt(0).toUpperCase(); return (c === "G" || c === "F" || c === "C") ? c : null; }

  function calcular(IDX) {
    var acc = {}, lg = {}, keys = Object.keys(STATS);
    function add(o, k, row) { var b = o[k] = o[k] || { n: 0 }; b.n++; keys.forEach(function (s) { b[s] = (b[s] || 0) + row[s]; }); }
    (IDX && IDX.players || []).forEach(function (p) {
      var g = posGroup(p.p), L = p.l20o ? p.l20o.length : 0;
      if (!g || !L || !p.l20) return;
      var n = Math.min(p.gp || 0, L);
      for (var i = L - n; i < L; i++) {
        var m = p.l20.min ? p.l20.min[i] : null, o = p.l20o[i];
        if (m == null || m < MIN_MIN || EQUIPOS.indexOf(o) < 0) continue;
        var row = {}, ok = true;
        BASE.forEach(function (s) { var v = p.l20[s] ? p.l20[s][i] : null; if (v == null) ok = false; row[s] = v || 0; });
        if (!ok) continue;
        row.pra = row.pts + row.reb + row.ast; row.pr = row.pts + row.reb; row.pa = row.pts + row.ast;
        row.ra = row.reb + row.ast; row.sb = row.stl + row.blk;
        acc[o] = acc[o] || {}; add(acc[o], g, row); add(lg, g, row);
      }
    });
    var teams = Object.keys(acc), out = { teams: {}, lg: {}, nTeams: teams.length };
    ["G", "F", "C"].forEach(function (g) {
      out.lg[g] = {};
      keys.forEach(function (s) { out.lg[g][s] = lg[g] && lg[g].n ? lg[g][s] / lg[g].n : null; });
      teams.forEach(function (t) {
        var b = acc[t][g], r = { n: b ? b.n : 0 };
        keys.forEach(function (s) {
          var v = b && b.n ? b[s] / b.n : null, base = out.lg[g][s];
          r[s] = { v: v, d: (v != null && base) ? (v - base) / base * 100 : null, r: null };
        });
        (out.teams[t] = out.teams[t] || {})[g] = r;
      });
      keys.forEach(function (s) {
        teams.filter(function (t) { return out.teams[t][g][s].v != null; })
          .sort(function (a, b) { return out.teams[b][g][s].v - out.teams[a][g][s].v; })
          .forEach(function (t, i) { out.teams[t][g][s].r = i + 1; });
      });
    });
    return out;
  }

  /* Info lista para usar: rival, posición del jugador y mercado.
     lado "over"/"under": dice si la defensa favorece la apuesta. */
  function info(D, rival, posJugador, stat, lado) {
    var g = posGroup(posJugador);
    if (!D || !g || !rival || !STATS[stat] || !D.teams[rival]) return null;
    var c = D.teams[rival][g], x = c && c[stat];
    if (!x || x.r == null) return null;
    var N = D.nTeams, r = x.r, under = lado === "under";
    var nivel = r <= 5 ? 2 : r <= 10 ? 1 : r > N - 5 ? -2 : r > N - 10 ? -1 : 0; // + = permite mucho
    if (under) nivel = -nivel;
    var etq = nivel === 2 ? "muy favorable" : nivel === 1 ? "favorable" : nivel === -2 ? "muy difícil" : nivel === -1 ? "difícil" : "neutra";
    return { rival: rival, pos: g, posN: POS[g], stat: stat, statN: STATS[stat], rank: r, n: N, valor: x.v, dif: x.d, muestra: c.n,
      nivel: nivel, etiqueta: etq, lado: under ? "under" : "over" };
  }
  function texto(i) {
    if (!i) return "";
    var d = i.dif == null ? "" : " (" + (i.dif > 0 ? "+" : "") + Math.round(i.dif) + "% vs media)";
    var base = i.rival + " es el " + i.rank + "º de " + i.n + " que más " + i.statN + " permite a " + i.posN;
    return base + d + " → " + i.etiqueta + (i.lado === "under" ? " para el menos" : " para el más");
  }
  var API = { calcular: calcular, info: info, texto: texto, posGroup: posGroup, STATS: STATS, POS: POS, MIN_MIN: MIN_MIN, EQUIPOS: EQUIPOS };
  G.NBALAB_DVP = API;
  if (typeof module !== "undefined") module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
