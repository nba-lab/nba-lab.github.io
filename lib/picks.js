/* =========================================================================
   NBA LAB — Recuento de picks
   Lee data/picks.js (window.__NBA_PICKS__) y dibuja el balance del último día,
   del mes y total, y la lista de picks de cada día con casa, cuota y stake.
   Los resultados los rellena tools/picks.py cada mañana (9:30).
   ========================================================================= */
(function () {
  "use strict";
  var EN = window.NL_LANG === "en";
  var MESES = EN ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                 : ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var DIAS = EN ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  var MN = EN ? { pts: "points", reb: "rebounds", ast: "assists", fg3m: "threes", stl: "steals", blk: "blocks", tov: "turnovers", pra: "pts+reb+ast", pr: "pts+reb", pa: "pts+ast", ra: "reb+ast", sb: "steals+blocks" }
              : { pts: "puntos", reb: "rebotes", ast: "asistencias", fg3m: "triples", stl: "robos", blk: "tapones", tov: "pérdidas", pra: "pts+reb+ast", pr: "pts+reb", pa: "pts+ast", ra: "reb+ast", sb: "robos+tapones" };
  var EST = EN ? { win: "Won", loss: "Lost", void: "Void", pend: "Pending" } : { win: "Verde", loss: "Roja", void: "Nula", pend: "Pendiente" };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function n2(x, d) { var s = (+x).toFixed(d == null ? 2 : d); return EN ? s : s.replace(".", ","); }
  function u(x) { var v = Math.round(x * 100) / 100; return (v > 0 ? "+" : v < 0 ? "−" : "") + n2(Math.abs(v)) + "u"; }
  function cls(x) { return x > 0.001 ? "pos" : x < -0.001 ? "neg" : "zero"; }
  function uni(p) { return p.est === "win" ? p.s * (p.c - 1) : p.est === "loss" ? -p.s : 0; }
  function hecho(p) { return p.est === "win" || p.est === "loss" || p.est === "void"; }
  function fday(f) {
    var d = new Date(f + "T12:00:00");
    return DIAS[d.getDay()] + " " + d.getDate() + " " + MESES[d.getMonth()].slice(0, 3);
  }
  function slug(pid) {
    var I = window.__NBA_INDEX__;
    if (!I || !I.players) return null;
    for (var i = 0; i < I.players.length; i++) if (I.players[i].id === pid) return I.players[i].sl;
    return null;
  }
  function linea(p) {
    var mas = p.lado !== "u";
    var L = n2(p.l, p.l % 1 ? 1 : 0);
    return (EN ? (mas ? "Over " : "Under ") : (mas ? "Más de " : "Menos de ")) + L + " " + (MN[p.m] || p.m);
  }
  function stats(list) {
    var r = { u: 0, st: 0, w: 0, l: 0, v: 0, pend: 0, enJuego: 0 };
    list.forEach(function (p) {
      if (hecho(p)) {
        r.u += uni(p);
        if (p.est !== "void") r.st += p.s;
        if (p.est === "win") r.w++; else if (p.est === "loss") r.l++; else r.v++;
      } else { r.pend++; r.enJuego += p.s; }
    });
    r.yield = r.st ? r.u / r.st * 100 : 0;
    return r;
  }
  function rec(r) { return r.w + "-" + r.l + (r.v ? "-" + r.v : ""); }

  function kpi(label, r, extra) {
    return '<div class="pk-kpi ' + cls(r.u) + '"><span class="pk-kpi-l mono">' + esc(label) + "</span>" +
      '<b class="pk-kpi-u">' + u(r.u) + "</b>" +
      '<span class="pk-kpi-s mono">' + rec(r) + (r.st ? " · yield " + (r.yield > 0 ? "+" : "") + n2(r.yield, 1) + "%" : "") + (extra || "") + "</span></div>";
  }

  function fila(p) {
    var sl = slug(p.pid);
    var nom = sl ? '<a href="jugador-' + esc(sl) + '.html">' + esc(p.p) + "</a>" : esc(p.p);
    var real = p.r == null ? "—" : (p.r % 1 ? n2(p.r, 1) : String(p.r));
    var e = hecho(p) ? p.est : "pend";
    return "<tr class=\"pk-" + e + "\">" +
      '<td class="pk-pick"><span class="pk-name">' + nom + "</span>" +
      '<span class="pk-line">' + esc(linea(p)) + (p.nota ? ' <i class="pk-nota mono">' + esc(p.nota) + "</i>" : "") + "</span>" +
      '<span class="pk-game mono">' + esc(p.partido || p.t || "") + "</span></td>" +
      '<td class="mono" data-l="' + (EN ? "Book" : "Casa") + '">' + esc(p.casa || "—") + "</td>" +
      '<td class="mono" data-l="' + (EN ? "Odds" : "Cuota") + '">' + n2(p.c) + "</td>" +
      '<td class="mono" data-l="Stake">' + n2(p.s, p.s % 1 ? 2 : 0) + "u</td>" +
      '<td class="mono" data-l="' + (EN ? "Actual" : "Real") + '">' + real + "</td>" +
      '<td data-l="' + (EN ? "Result" : "Estado") + '"><span class="pk-est pk-est-' + e + '">' + EST[e] + "</span></td>" +
      '<td class="mono pk-u ' + (hecho(p) ? cls(uni(p)) : "zero") + '" data-l="' + (EN ? "Units" : "Unidades") + '">' + (hecho(p) ? u(uni(p)) : "—") + "</td></tr>";
  }

  function mount() {
    var box = document.querySelector("[data-picks]");
    if (!box) return;
    var D = window.__NBA_PICKS__;
    if (!D || !D.picks || !D.picks.length) { box.innerHTML = '<p class="empty">' + (EN ? "No picks yet." : "Aún no hay picks.") + "</p>"; return; }
    var picks = D.picks.slice();
    var ini = +D.inicial || 0;
    var dias = {};
    picks.forEach(function (p) { (dias[p.f] = dias[p.f] || []).push(p); });
    var fechas = Object.keys(dias).sort().reverse();
    var meses = [];
    fechas.forEach(function (f) { var m = f.slice(0, 7); if (meses.indexOf(m) < 0) meses.push(m); });

    // último día con resultados
    var ult = null;
    for (var i = 0; i < fechas.length; i++) if (dias[fechas[i]].some(hecho)) { ult = fechas[i]; break; }
    var mesAct = (ult || fechas[0]).slice(0, 7);
    var tot = stats(picks); tot.u += ini;
    var iniMes = String(D.inicialMes || "");
    var mesR = stats(picks.filter(function (p) { return p.f.slice(0, 7) === mesAct; }));
    if (ini && iniMes === mesAct) mesR.u += ini;
    var hoyPend = fechas[0] !== ult ? stats(dias[fechas[0]]) : null;

    var mlabel = function (m) { var mm = +m.slice(5, 7) - 1; return MESES[mm] + " " + m.slice(0, 4); };
    var html = '<div class="pk-kpis">' +
      (ult ? kpi((EN ? "Last day · " : "Último día · ") + fday(ult), stats(dias[ult])) : "") +
      kpi((EN ? "Month · " : "Mes · ") + mlabel(mesAct), mesR, ini && iniMes === mesAct ? '<br><span class="pk-ini">' + (EN ? "incl. " : "incl. ") + u(ini) + (EN ? " before the web" : " antes de la web") + "</span>" : "") +
      kpi(EN ? "Total" : "Total", tot, ini ? '<br><span class="pk-ini">' + (EN ? "incl. " : "incl. ") + u(ini) + (EN ? " before the web" : " antes de la web") + "</span>" : "") +
      "</div>";
    if (hoyPend && hoyPend.pend) html += '<p class="pk-live mono"><span class="pk-dot"></span>' + fday(fechas[0]) + ": " + hoyPend.pend + (EN ? " picks in play · " : " picks en juego · ") + n2(hoyPend.enJuego, 2) + "u</p>";

    html += '<div class="pk-bar"><div class="seg" data-pk-mes>' + meses.map(function (m, k) {
      return '<button type="button" data-v="' + m + '"' + (k === 0 ? ' class="on"' : "") + ">" + esc(mlabel(m)) + "</button>";
    }).join("") + '<button type="button" data-v="all">' + (EN ? "All" : "Todo") + "</button></div></div>";
    html += '<div class="pk-days" data-pk-days></div>';
    box.innerHTML = html;

    var daysBox = box.querySelector("[data-pk-days]");
    function pintar(mes) {
      var fs = fechas.filter(function (f) { return mes === "all" || f.slice(0, 7) === mes; });
      daysBox.innerHTML = fs.map(function (f, k) {
        var r = stats(dias[f]);
        var res = r.pend && !r.w && !r.l && !r.v ? '<span class="pk-est pk-est-pend">' + EST.pend + "</span>"
                : '<b class="mono ' + cls(r.u) + '">' + u(r.u) + "</b>";
        return '<details class="pk-day card"' + (k < 2 ? " open" : "") + "><summary>" +
          '<span class="pk-day-f">' + esc(fday(f)) + "</span>" +
          '<span class="pk-day-n mono">' + dias[f].length + " picks · " + rec(r) + "</span>" + res + "</summary>" +
          '<div class="table-wrap pk-tw"><table class="table pk-table"><thead><tr><th>Pick</th><th>' + (EN ? "Book" : "Casa") + "</th><th>" + (EN ? "Odds" : "Cuota") +
          "</th><th>Stake</th><th>" + (EN ? "Actual" : "Real") + "</th><th>" + (EN ? "Result" : "Estado") + "</th><th>" + (EN ? "Units" : "Unidades") + "</th></tr></thead><tbody>" +
          dias[f].map(fila).join("") + "</tbody></table></div></details>";
      }).join("");
    }
    pintar(meses[0]);
    box.querySelector("[data-pk-mes]").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      [].forEach.call(this.querySelectorAll("button"), function (x) { x.classList.toggle("on", x === b); });
      pintar(b.getAttribute("data-v"));
    });
    var up = box.parentNode.querySelector("[data-pk-upd]");
    if (up && D.updated) up.textContent = (EN ? "Results updated " : "Resultados actualizados ") + fday(D.updated.slice(0, 10)) + " " + D.updated.slice(11, 16);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
