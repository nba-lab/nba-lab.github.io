/* =========================================================================
   NBA LAB — Idioma (español / inglés)
   - Botón ES/EN en la cabecera, junto a X.
   - ?lang=en o ?lang=es en la URL fuerza el idioma (lo usan los enlaces de la imagen en inglés).
   - Se recuerda en el navegador. Sin elección previa: inglés si el navegador no está en español.
   - Traduce el HTML fijo y todo lo que dibuja main.js (MutationObserver).
   - main.js lee window.NL_LANG para números, fechas, estadísticas y la imagen para compartir.
   ========================================================================= */
(function () {
  "use strict";
  var KEY = "nl-lang";
  function get() { try { return localStorage.getItem(KEY); } catch (_) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (_) {} }

  var lang = null;
  try {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "en" || q === "es") { lang = q; set(q); }
  } catch (_) {}
  if (!lang) lang = get();
  if (lang !== "en" && lang !== "es") {
    var ua = navigator.userAgent || "";
    var bot = /bot|crawl|spider|slurp|google|bing|yandex|duckduck|baidu|lighthouse|headless/i.test(ua);
    var nl = (navigator.languages && navigator.languages[0]) || navigator.language || "es";
    lang = (!bot && !/^(es|ca|gl|eu)\b/i.test(nl)) ? "en" : "es";
  }
  window.NL_LANG = lang;
  var EN = lang === "en";
  document.documentElement.lang = lang;

  /* ---------------------------------------------------------------------------------------
     Diccionario: texto exacto (sin espacios a los lados) → inglés
     --------------------------------------------------------------------------------------- */
  var D = {
    "Recuento de picks": "Picks record", "Cargando picks…": "Loading picks…",
    "Todos los picks que publicamos en X y Telegram, con la casa, la cuota y el stake. Cada mañana se corrigen solos con las estadísticas oficiales de NBA.com y se recalculan las unidades del día, del mes y el total.": "Every pick we post on X and Telegram, with the sportsbook, odds and stake. Each morning they are graded automatically with official NBA.com stats and the units for the day, the month and overall are recalculated.",
    // cabecera / menús
    "Calendario": "Schedule", "Jugadores": "Players", "Escáner": "Scanner", "Defensa": "Defense",
    "Rival": "Opponent", "Gráficos": "Charts", "Líneas": "Lines", "Minutos": "Minutes", "Compañeros": "Teammates",
    "Splits": "Splits", "Rivales": "Opponents", "Partidos": "Games", "Inicio": "Home", "Secciones": "Sections",
    "Cargando datos…": "Loading data…", "Cargando…": "Loading…", "Cargando jugador…": "Loading player…",
    "Sin datos": "No data", "DATOS DE EJEMPLO": "SAMPLE DATA", "NBA LAB en X": "NBA LAB on X",
    // portada
    "Props NBA · Gratis · En español · Sin registro": "NBA props · Free · No sign-up",
    "Cada línea,": "Every line,", "partido": "game", "a partido.": "by game.",
    "La herramienta de props NBA": "The NBA props tool that's",
    "gratis y en español": "100% free",
    ". Los últimos 100 partidos de cada jugador con tu línea encima, cómo defiende cada rival a su posición y qué hace cuando falta un compañero. Sin registro ni suscripción, con horarios de España y datos de NBA.com actualizados cada mañana.":
      ". Every player's last 100 games with your line on top, how each opponent defends his position and what he does when a teammate is out. No sign-up, no subscription, with NBA.com data updated every morning.",
    "Busca un jugador: Jokić, Curry, Wembanyama…": "Search a player: Jokić, Curry, Wembanyama…",
    "Buscar jugador": "Search player",
    "Picks con valor en Telegram": "Value picks on Telegram", "Síguenos en X": "Follow us on X",
    "Partidos de hoy": "Today's games", "Tutorial de la web": "Website tutorial", "Activar sonido": "Turn sound on", "Silenciar": "Mute", "Escáner de líneas": "Line scanner",
    "jugadores activos": "active players", "partidos registrados": "games tracked",
    "estadísticas por partido": "stats per game", "partidos por gráfico": "games per chart",
    "100% gratis": "100% free", "Sin registro y sin suscripción. Entras y lo tienes todo.": "No sign-up and no subscription. Open it and everything is there.",
    "En español": "In English and Spanish",
    "Todo explicado en castellano y con los horarios de los partidos en hora de España.": "Everything explained in plain words, with tip-off times in your local time.",
    "Datos oficiales": "Official data",
    "Estadísticas de NBA.com partido a partido, actualizadas cada mañana tras la jornada.": "Game-by-game NBA.com stats, updated every morning after the slate.",
    "Lo que suele ser de pago": "What others charge for",
    "Defensa del rival por posición, rendimiento sin cada compañero, escalera de líneas e imagen para compartir.": "Defense vs position, splits without each teammate, line ladders and a shareable image.",
    "01 — Calendario": "01 — Schedule", "Partidos de cada jornada": "Games for every night",
    "Elige un día y pulsa un partido: se abre con los jugadores de los dos equipos a la izquierda y el gráfico del que elijas a la derecha. Las horas están en horario de España.":
      "Pick a day and tap a game: it opens with both rosters on the left and the chart of the player you choose on the right. Tip-off times are shown in your local time.",
    "Semana anterior": "Previous week", "Semana siguiente": "Next week", "Hoy": "Today",
    "Abrir partido →": "Open game →", "EN JUEGO": "LIVE", "FINAL": "FINAL", "Final": "Final",
    "No hay partidos este día.": "No games on this day.",
    "02 — Jugadores": "02 — Players", "Explora la plantilla de la liga": "Browse every roster in the league",
    "Filtrar por nombre": "Filter by name", "Equipo": "Team", "Posición": "Position", "Ordenar": "Sort",
    "Todos los equipos": "All teams", "Todas las posiciones": "All positions",
    "Base / Escolta (G)": "Guard (G)", "Alero / Ala-pívot (F)": "Forward (F)", "Pívot (C)": "Center (C)",
    "Ordenar: Puntos": "Sort: Points", "Nombre": "Name", "Triples": "3-pointers",
    "Mostrando los 10 primeros. Usa el buscador o los filtros para encontrar a cualquier jugador.": "Showing the top 10. Use the search box or the filters to find any player.",
    "No hay jugadores con ese filtro.": "No players match that filter.", "Sin resultados": "No results",
    "03 — Escáner de líneas": "03 — Line scanner",
    "¿Quién supera la línea con más frecuencia?": "Who clears the line most often?",
    "Elige una estadística y una línea, por ejemplo 2,5 triples o 9,5 rebotes. También puedes usar la media de temporada de cada jugador como referencia para ver quién está en racha. La tabla ordena a los jugadores según el porcentaje de partidos recientes en los que superaron esa línea.":
      "Pick a stat and a line, for example 2.5 threes or 9.5 rebounds. You can also use each player's season average as the line to see who is on a streak. The table ranks players by the share of recent games in which they went over that line.",
    "Estadística": "Stat", "Casa de apuestas": "Sportsbook", "Tipo de línea": "Line type",
    "Línea fija": "Fixed line", "Media de temporada de cada jugador": "Each player's season average",
    "Línea de la casa (próximos partidos)": "Sportsbook line (upcoming games)", "Mejor cuota": "Best odds",
    "Bajar línea": "Lower line", "Subir línea": "Raise line", "Línea": "Line", "Ordenar por": "Sort by",
    "Ordenar: % últimos 10": "Sort: % last 10", "% últimos 5": "% last 5", "% últimos 20": "% last 20",
    "Media últimos 10": "Last 10 average", "Ver unders": "Show unders",
    "Jugador": "Player", "Cuota": "Odds", "Media L10": "L10 avg", "Últimos 10": "Last 10",
    "Todavía no hay cuotas de este mercado para los próximos partidos.": "No odds for this market for the upcoming games yet.",
    "Sin jugadores.": "No players.",
    "04 — Defensa por posición": "04 — Defense vs position",
    "Ranking de defensas: ¿quién permite más a cada posición?": "Defense rankings: who allows the most to each position?",
    "Del 1º al 30º: el": "From 1st to 30th: the", "es el equipo que": "is the team that allows the", "más": "most",
    "permite (bueno para el más) y el": "(good for the over) and the",
    "el que menos (bueno para el menos). Se calcula con lo que promedian bases y escoltas, aleros y pívots contra cada equipo esta temporada (jugadores con 20 minutos o más). Elige la posición y pulsa una estadística para ordenar.":
      "the fewest (good for the under). It's based on what guards, forwards and centers average against each team this season (players with 20+ minutes). Pick a position and click a stat to sort.",
    "Ranking 1-30": "Ranking 1-30", "Comparar posiciones": "Compare positions",
    "Bases/escoltas": "Guards", "Aleros": "Forwards", "Pívots": "Centers",
    "Bases y escoltas": "Guards", "Aleros y ala-pívots": "Forwards", "Media de la liga": "League average",
    "Aún no hay partidos suficientes esta temporada.": "Not enough games yet this season.",
    "05 — Canal de Telegram": "05 — Telegram channel", "Picks con valor,": "Value picks,",
    "cada jornada en Telegram.": "every night on Telegram.", "En el canal": "In the",
    "publicamos los picks con valor que salen del análisis de esta web: el historial de los últimos 100 partidos, el porcentaje de veces que el jugador supera la línea y su rendimiento contra cada rival. Cada pick lleva el enlace a la ficha del jugador para que puedas comprobar los datos tú mismo.":
      "channel we post the value picks that come out of this site's analysis: the last 100 games, how often the player clears the line and how he does against each opponent. Every pick links to the player page so you can check the numbers yourself.",
    "Unirme al canal": "Join the channel", "Únete al canal": "Join the channel", "Únete al canal de Telegram": "Join the Telegram channel",
    "+18 · Ningún pick es seguro: apuesta solo lo que puedas permitirte perder.": "18+ · No pick is a sure thing: only bet what you can afford to lose.",
    "Picks de props de jugadores en cada jornada NBA": "Player prop picks for every NBA slate",
    "Basados en hit rates, tendencias y enfrentamientos": "Based on hit rates, trends and matchups",
    "Cada pick con su ficha para verificar los números": "Every pick links to its player page so you can verify it",
    "Canal de Telegram": "Telegram channel",
    "Herramienta de análisis estadístico, sin afiliación con la NBA. No garantiza resultados.": "Statistical analysis tool, not affiliated with the NBA. Results are not guaranteed.",
    "Juega con responsabilidad · +18": "Gamble responsibly · 18+",
    // ficha de jugador
    "← Todos los jugadores": "← All players", "Próximo partido": "Next game",
    "Defensa del próximo rival": "Next opponent's defense", "Cómo defiende el rival": "How the opponent defends",
    "Ver la tabla de los 30 equipos →": "See the table for all 30 teams →",
    "Medias por tramo": "Averages by span", "Temporada, últimos 5, 10, 20, 50 y 100": "Season, last 5, 10, 20, 50 and 100",
    "Temp": "Szn", "TEMP": "SZN", "Máx": "Max", "Mín": "Min", "Tend.": "Trend",
    "La flecha compara la media de los últimos 5 partidos con la de los últimos 20. Máx. y mín. son el mejor y el peor registro dentro de los últimos 100 partidos.":
      "The arrow compares the last-5 average with the last-20 average. Max and min are the best and worst games within the last 100.",
    "Gráficos · últimos 100 partidos": "Charts · last 100 games", "Tu línea contra su historial": "Your line vs his history",
    "Elige una o varias estadísticas y ajusta la línea en cada gráfico. Verde: superó la línea. Rojo: se quedó por debajo. Pasa el cursor por una barra para ver el partido exacto.":
      "Pick one or more stats and set the line on each chart. Green: over the line. Red: under it. Hover a bar to see that exact game.",
    "Todos": "All", "Local": "Home", "Visitante": "Away", "Todos los rivales": "All opponents",
    "Incluir playoffs": "Include playoffs", "Más": "Over", "Menos": "Under", "Over": "Over", "Under": "Under",
    "Línea de minutos": "Minutes line", "Rol": "Role", "Titular": "Starter", "Suplente": "Bench",
    "Compañero": "Teammate", "Con": "With", "Sin": "Without", "— Ninguno —": "— None —",
    "Imagen": "Image", "Calcular valor": "Value calculator", "RACHA": "STREAK", "Fallo": "Miss",
    "Acierto del Más": "Over hit", "Acierto del Menos": "Under hit", "Minutos (eje derecho)": "Minutes (right axis)",
    "+18 · Orientativas: comprueba siempre la cuota en la casa antes de apostar.": "18+ · Indicative only: always check the odds with the sportsbook before betting.",
    "✅ VALOR": "✅ VALUE", "❌ sin valor": "❌ no value", "≈ justa": "≈ fair",
    "Minutos y rotación": "Minutes and rotation", "¿Está jugando más o menos?": "Is he playing more or less?",
    "Los minutos mandan en los props: si un jugador gana o pierde minutos, todas sus líneas cambian.": "Minutes drive props: when a player gains or loses minutes, all of his lines change.",
    "L5 VS TEMP": "L5 VS SZN", "TITULAR · TEMP": "STARTER · SZN", "ROL ÚLT. 5": "ROLE LAST 5",
    "Media móvil 5": "5-game rolling avg", "Media temporada": "Season avg", "Media móvil": "Rolling avg",
    "Media acumulada": "Cumulative avg", "Partido": "Game", "Sin compañero": "Without a teammate",
    "¿Qué hace cuando falta un compañero?": "What does he do when a teammate is out?",
    "Sus medias en los partidos en los que no jugó cada compañero, y la diferencia con los partidos en los que sí jugó. Arriba salen los que no jugaron el último partido del equipo (posible baja). Pulsa una fila para ver los gráficos sin ese compañero.":
      "His averages in games each teammate missed, and the difference vs games they played. Teammates who missed the team's last game (may be out) are listed first. Click a row to see the charts without that teammate.",
    "PJ con / sin": "GP with / without", "posible baja": "may be out", "POSIBLE BAJA": "MAY BE OUT",
    "Solo cuentan los partidos con el mismo equipo y desde que coinciden en la plantilla. Solo salen los compañeros con al menos 3 partidos sin ellos (o los que pueden ser baja hoy).":
      "Only games with the same team since they've been on the roster together count. Only teammates with at least 3 games missed (or who may be out today) are shown.",
    "Escalera de líneas": "Line ladder", "% de partidos por encima de cada línea": "% of games over each line",
    "Local L100": "Home L100", "Visit. L100": "Away L100", "Evolución": "Trend",
    "Tendencia durante la temporada": "Trend during the season",
    "Local / visitante · titular / suplente": "Home / away · starter / bench",
    "¿Cambia según dónde y cómo juega?": "Does it change by venue and role?",
    "Temporada": "Season", "Todo el historial": "Full history", "Dif.": "Diff.",
    "Contra rivales": "Vs opponents", "Rendimiento contra cada equipo": "Performance against each team",
    "Datos de todo el historial guardado. Pulsa en un rival para filtrar los gráficos por ese enfrentamiento.": "Data from the full saved history. Click an opponent to filter the charts to that matchup.",
    "PJ": "GP", "Último": "Last", "Registro": "Game log", "Fecha": "Date", "Res": "W/L",
    "ROB": "STL", "TAP": "BLK", "PÉR": "TOV", "FP": "PF", "TC": "FG", "TL": "FT", "LÍN": "LINE", "ROB+TAP": "STL+BLK",
    "TCM": "FGM", "TCI": "FGA", "TC%": "FG%", "TLM": "FTM", "TLI": "FTA", "TL%": "FT%", "REB-O": "OREB", "REB-D": "DREB",
    "Resumen": "Summary", "Victoria": "Win", "Derrota": "Loss", "Sin intentos": "No attempts",
    "Usar esta línea": "Use this line", "Línea principal": "Main line",
    "Rival": "Opponent", "Bajar": "Lower", "Subir": "Raise", "Línea de apuesta": "Betting line",
    "Crear imagen para compartir en X o Telegram": "Create an image to share on X or Telegram",
    "Crear imagen del prop para compartir en X o Telegram": "Create a prop image to share on X or Telegram",
    "Compartir imagen": "Share image", "Descargar imagen del prop": "Download prop image", "Quitar gráfico": "Remove chart",
    "Ver aciertos del Más o del Menos": "Show over or under hits",
    "Jugador no encontrado": "Player not found", "Volver a la lista de jugadores": "Back to the player list",
    "sin datos": "no data", "Sin dato": "No data", "Sin partidos.": "No games.",
    "No hay partidos con estos filtros.": "No games with these filters.",
    "Sin datos de titular/suplente (ejecuta actualizar.bat)": "No starter/bench data yet",
    "Sin datos de compañeros (ejecuta actualizar.bat)": "No teammate data yet",
    "Sin datos de compañeros todavía.": "No teammate data yet.", "Sin datos de compañeros": "No teammate data",
    "Todavía no hay compañeros con al menos 3 partidos sin ellos en este equipo.": "No teammates with at least 3 missed games on this team yet.",
    "Defensa en la media de la liga en todas las estadísticas.": "League-average defense in every stat.",
    "Pocos partidos todavía: tómalo con cautela.": "Few games so far: take it with caution.",
    "Sin posición": "No position", "Sin jugadores de este equipo en los datos.": "No players from this team in the data.",
    "No se pudieron cargar los partidos de este jugador.": "Couldn't load this player's games.",
    "solo local": "home only", "solo visitante": "away only", "sin playoffs": "no playoffs",
    "Media gráfico": "Chart avg", "Hit rate": "Hit rate", "Min. medios": "Avg min", "Local + Visit.": "Home + Away",
    "LOCAL": "HOME", "VISIT.": "AWAY", "Media": "Avg", "Media 20": "Avg 20", "Media 10": "Avg 10",
    "T = titular · S = suplente": "STR = starter · BEN = bench", "TIT": "STR", "SUP": "BEN",
    "Ver ficha completa del jugador →": "See full player page →",
    "Buscar jugador en los dos equipos…": "Search a player on either team…",
    "Buscar jugador en el partido": "Search a player in this game",
    "← Calendario": "← Schedule", "Base/Esc.": "Guard", "Alero": "Forward", "Pívot": "Center",
    "Partido no encontrado": "Game not found", "Ningún jugador coincide.": "No player matches.",
    "no jugó el último partido de su equipo · ▲▼ cambio de minutos": "missed his team's last game · ▲▼ change in minutes",
    // imagen / compartir
    "Imagen para compartir": "Shareable image", "Cerrar": "Close", "Compartir": "Share",
    "Descargar imagen": "Download image", "Copiar imagen": "Copy image", "Copiar texto para X": "Copy text for X",
    "Imagen copiada: pégala en X o Telegram.": "Image copied: paste it on X or Telegram.",
    "Tu navegador no deja copiar imágenes: usa Descargar.": "Your browser can't copy images: use Download.",
    "Texto copiado.": "Text copied.",
    // app (PWA)
    "Instala NBA LAB": "Install NBA LAB", "Gratis · se abre a pantalla completa": "Free · opens full screen",
    "Instalar": "Install", "Instalar la app": "Install the app", "📲 Instalar la app": "📲 Install the app", "App": "App",
    "Gratis · sin tiendas · siempre al día": "Free · no app store · always up to date",
    "Pulsa el botón": "Tap the", "de la barra de Safari.": "button in Safari's toolbar.",
    "Baja y elige": "Scroll down and choose", "Añadir a pantalla de inicio": "Add to Home Screen", "Pulsa": "Tap",
    "Añadir": "Add", ". El icono de NBA LAB aparecerá con tus apps.": ". The NBA LAB icon will appear with your apps.",
    "Pulsa el menú": "Tap the", "de arriba.": "menu at the top.", "Elige": "Choose", "Abrir en el navegador": "Open in browser",
    "(Chrome o Safari).": "(Chrome or Safari).", "Allí pulsa": "Then tap", "Instalar app": "Install app",
    "Abre el menú del navegador": "Open the browser menu", "Pulsa": "Tap", "o": "or",
    "Confirma. El icono de NBA LAB aparecerá con tus apps.": "Confirm. The NBA LAB icon will appear with your apps.",
    // estadísticas (por si algún texto aún las trae en español)
    "Puntos": "Points", "Rebotes": "Rebounds", "Asistencias": "Assists", "Robos": "Steals", "Tapones": "Blocks",
    "Pérdidas": "Turnovers", "Faltas personales": "Personal fouls", "Puntos + Rebotes + Asistencias": "Points + Rebounds + Assists",
    "Puntos + Rebotes": "Points + Rebounds", "Puntos + Asistencias": "Points + Assists", "Rebotes + Asistencias": "Rebounds + Assists",
    "Robos + Tapones": "Steals + Blocks", "Triples anotados": "3-pointers made", "Triples intentados": "3-pointers attempted",
    "% de triples": "3-point %", "Tiros de campo anotados": "Field goals made", "Tiros de campo intentados": "Field goals attempted",
    "% tiro de campo": "Field goal %", "Tiros libres anotados": "Free throws made", "Tiros libres intentados": "Free throws attempted",
    "% tiros libres": "Free throw %", "Rebotes ofensivos": "Offensive rebounds", "Rebotes defensivos": "Defensive rebounds",
    "Más / menos": "Plus / minus", "Generales": "General", "Combinadas": "Combos", "Tiro": "Shooting", "Avanzadas": "Advanced",
    "PARTIDOS": "GAMES", "Últimos": "Last",
    // páginas sin datos
    "Aún no hay datos. Ejecuta": "No data yet. Run", "para descargarlos de NBA.com.": "to download it from NBA.com."
  };

  var POS = {
    "bases y escoltas": "guards", "bases/escoltas": "guards", "bases": "guards", "Bases y escoltas": "Guards",
    "aleros y ala-pívots": "forwards", "aleros": "forwards", "Aleros": "Forwards",
    "pívots": "centers", "Pívots": "Centers"
  };
  function pos(x) { return POS[x] || POS[x.toLowerCase()] || x; }
  var SL = { "puntos": "points", "rebotes": "rebounds", "asistencias": "assists", "triples": "threes", "robos": "steals",
    "tapones": "blocks", "pérdidas": "turnovers", "puntos+rebotes+asistencias": "points+rebounds+assists", "puntos+rebotes": "points+rebounds",
    "puntos+asistencias": "points+assists", "rebotes+asistencias": "rebounds+assists", "robos+tapones": "steals+blocks" };
  function stl(x) { return SL[x] || SL[x.toLowerCase()] || x; }
  function ord(n) { n = +n; var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function dec(x) { return String(x).replace(/(\d),(\d)/g, "$1.$2"); }
  var MESES = { ene: "Jan", feb: "Feb", mar: "Mar", abr: "Apr", may: "May", jun: "Jun", jul: "Jul", ago: "Aug", sep: "Sep", oct: "Oct", nov: "Nov", dic: "Dec" };

  /* Reglas para textos compuestos. Se prueban sobre el texto entero (anclado). */
  var R = [
    [/^Estadísticas de (.+) · temporada (.+)$/, "$1 stats · $2 season"],
    [/^Actualizado (.+)$/, "Updated $1"],
    [/^Fuente: (.+)$/, "Source: $1"],
    [/^Telegram (.+)$/, "Telegram $1"],
    [/^(\d+) PJ$/, "$1 GP"],
    [/^(\d+) part\.$/, "$1 games"],
    [/^media (.+)$/, "avg $1"],
    [/^Mostrando 60 de (\d+) jugadores\. Afina la búsqueda para ver el resto\.$/, "Showing 60 of $1 players. Narrow the search to see the rest."],
    [/^(\d+) jugadores con cuotas$/, "$1 players with odds"],
    [/^cuotas de las (.+)$/, "odds as of $1"],
    [/^Cuotas$/, "Odds"],
    [/^\+18$/, "18+"],
    [/^orientativas, compruébalas en la casa$/, "indicative only, check them with the sportsbook"],
    [/^Ranking de (.+)$/, function (m, a) { return "Ranking: " + pos(a); }],
    [/^ordenado por (.+)$/i, function (m, a) { return "sorted by " + pos(stl(a)); }],
    [/^Media móvil (\d+)$/, "$1-game rolling avg"],
    [/^1º = el que más permite, (\d+)º = el que menos$/, function (m, n) { return "1st = allows the most, " + ord(n) + " = allows the least"; }],
    [/^(.+?) ▼$/, function (m, a) { return pos(D[a] || a) + " ▼"; }],
    [/^(\d+)º\/(\d+)$/, function (m, a, b) { return ord(a) + "/" + b; }],
    [/^pocos datos$/, "small sample"],
    [/^(\d+) partidos de (.+?) con (\d+)\+ min$/, function (m, n, p, k) { return n + " games by " + pos(p) + " with " + k + "+ min"; }],
    [/^(.+): ([\d.,+-]+) \(([+\-]?\d+%) vs liga\)$/, "$1: $2 ($3 vs league)"],
    [/^HOY vs (.+)$/, "TODAY vs $1"],
    [/^Contra (\w+): (.+)$/, function (m, t, r) { return "Vs " + t + ": " + tr(r); }],
    [/^Ver solo partidos vs (.+)$/, "Only show games vs $1"],
    [/^Cómo defiende (\w+) a los (.+)$/, function (m, t, p) { return "How " + t + " defends " + pos(p); }],
    [/^Lo que promedian los (.+?) \((\w)\) contra (\w+) esta temporada, comparado con la media de la liga\. Puesto 1º = el equipo que$/,
      function (m, p, c, t) { return "What " + pos(p) + " (" + c + ") average against " + t + " this season, compared with the league average. 1st = the team that allows the"; }],
    [/^concede \(mejor para el over\)\. (\d+) partidos de jugadores con (\d+)\+ minutos\.$/, "(best for the over). $1 games by players with $2+ minutes."],
    [/^(.+) CONCEDE$/, "$1 ALLOWED"],
    [/^([+\-]?\d+%) vs liga$/, "$1 vs league"],
    [/^▲ Favorable para el over: (.+)$/, "▲ Good for the over: $1"],
    [/^▼ Defiende bien: (.+)$/, "▼ Defends well: $1"],
    [/^(.+?) ⚠ posible baja$/, "$1 ⚠ may be out"],
    [/^con (\d+) \/ sin (\d+)$/, "with $1 / without $2"],
    [/^es el$/, "is the"],
    [/^(\d+)º de (\d+)$/, function (m, a, b) { return ord(a) + " of " + b; }],
    [/^que más (.+?) permite a (.+?) \(([+\-]?\d+%) vs media\)( ·)?$/, function (m, s, p, d, dot) { return "in " + stl(s) + " allowed to " + pos(p) + " (" + d + " vs avg)" + (dot || ""); }],
    [/^(muy )?(favorable|difícil) para el (más|menos)$/, function (m, muy, f, side) { return (muy ? "very " : "") + (f === "favorable" ? "good" : "tough") + " for the " + (side === "más" ? "over" : "under"); }],
    [/^Escribe la cuota y te digo si hay valor según los (\d+) partidos mostrados\.$/, "Enter the odds and I'll tell you if there's value based on the $1 games shown."],
    [/^Media (\d+)$/, "Avg $1"],
    [/^Máx (.+)$/, "Max $1"], [/^Mín (.+)$/, "Min $1"],
    [/^Más (.+)$/, "Over $1"], [/^Menos (.+)$/, "Under $1"],
    [/^implícita (.+)$/, "implied $1"], [/^real (.+)$/, "actual $1"],
    [/^no jugó el último partido de (\w+) \(posible baja\)\. Sin él, (.+) promedia$/, "missed $1's last game (may be out). Without him, $2 averages"],
    [/^en (\d+) partidos \(con él: (.+)\)\.$/, "in $1 games (with him: $2).", 1],
    [/^Local \((\d+)\)$/, "Home ($1)"], [/^Visitante \((\d+)\)$/, "Away ($1)"],
    [/^Titular \((\d+)\)$/, "Starter ($1)"], [/^Suplente \((\d+)\)$/, "Bench ($1)"],
    [/^Total \((\d+)\)$/, "Total ($1)"],
    [/^rival de hoy$/, "today's opponent"],
    [/^1 partidos?$/, "1 game"], [/^(\d+) partidos$/, "$1 games"], [/^(\d+) partido$/, "$1 game"],
    [/^local$/, "home"], [/^visitante$/, "away"], [/^titular$/, "starter"], [/^suplente$/, "bench"],
    [/^línea (.+)$/, "line $1"],
    [/^TC (.+)$/, "FG $1"], [/^TL (.+)$/, "FT $1"],
    [/^Filtro activo: (.+)$/, function (m, a) { return "Active filter: " + tr(a); }],
    [/^sin (.+)$/, "without $1"], [/^con (.+)$/, "with $1"],
    [/^temporada (.+)$/, "season $1"], [/^Temporada (.+)$/, "Season $1"],
    [/^últimos (\d+)$/, "last $1"], [/^Últimos (\d+)$/, "Last $1"],
    [/^últimos (\d+) partidos$/, "last $1 games"], [/^Últimos (\d+) partidos$/, "Last $1 games"],
    [/^(.+) \(hora España\)$/, function (m, a) { return a + " (your time)"; }],
    [/^(.+) \(hora España\)</, "$1 (your time)<"],
    [/^(\d+) partidos en el historial$/, "$1 games in history"],
    [/^último: (.+)$/, function (m, a) { return "last: " + tr(a); }],
    [/^(\d{1,2}) (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic) (\d{4})$/, function (m, d, mm, y) { return MESES[mm] + " " + d + ", " + y; }],
    [/^(\d{1,2}) (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic) (\d{4}) vs (\w+)$/, function (m, d, mm, y, t) { return MESES[mm] + " " + d + ", " + y + " vs " + t; }],
    [/^(.+) · temporada (.+)$/, "$1 · season $2"],
    [/^Final · (.+)$/, "Final · $1"],
    [/^(.+) min en los últimos 5 frente a (.+) de media esta temporada \((.+)\)\. Posible cambio de rotación: revisa sus líneas\.$/,
      "$1 min over the last 5 vs $2 on average this season ($3). Possible rotation change: check his lines."],
    [/^min en los últimos 5 frente a$/, "min over the last 5 vs"],
    [/^de media esta temporada \($/, "on average this season ("],
    [/^\)\. Posible cambio de rotación: revisa sus líneas\.$/, "). Possible rotation change: check his lines."],
    [/^Más minutos:$/, "More minutes:"], [/^Menos minutos:$/, "Fewer minutes:"],
    [/^Minutos últimos 5: (.+)$/, "Minutes last 5: $1"],
    [/^Buscar jugador en (\w+) o (\w+)…$/, "Search a player on $1 or $2…"],
    [/^Buscar jugador en (.+)$/, "Search a player on $1"],
    [/^Esta línea no la ofrece (.+) ahora mismo\. Elige una de las líneas de abajo\.$/, "$1 doesn't offer this line right now. Pick one of the lines below."],
    [/^Sin cuotas de (.+) para este mercado\.$/, "No $1 odds for this market."],
    [/^No se pudo cargar (.+)$/, "Couldn't load $1"],
    [/^Línea \((más|menos)\)$/, function (m, a) { return "Line (" + (a === "más" ? "over" : "under") + ")"; }],
    [/^(\d+) partidos · (local|visitante)$/, function (m, n, l) { return n + " games · " + (l === "local" ? "home" : "away"); }],
    [/^(.+) sin él$/, "$1 without him"],
    [/^Puesto (\d+)º/, function (m, n) { return "Rank " + ord(n); }],
    // títulos y meta (y resumen de las páginas de jugador para Google)
    [/^NBA LAB — Estadísticas y props NBA gratis y en español$/, "NBA LAB — Free NBA player prop stats and charts"],
    [/^Props NBA gratis y en español: .+$/, "Free NBA props: game-by-game stats, hit rate for every line, defense vs position and splits without each teammate. No sign-up. Updated every morning."],
    [/^Ficha de jugador — NBA LAB$/, "Player page — NBA LAB"],
    [/^(.+) \((\w+)\): estadísticas y props NBA (.+) \| NBA LAB$/, "$1 ($2): NBA stats and props $3 | NBA LAB"],
    [/^(.+) en la temporada (\S+): ([\d,]+) puntos, ([\d,]+) rebotes, ([\d,]+) asistencias y ([\d,]+) triples por partido\..*$/,
      function (m, n, s, a, b, c, d) { return n + " in the " + s + " season: " + dec(a) + " points, " + dec(b) + " rebounds, " + dec(c) + " assists and " + dec(d) + " threes per game. Hit rate for every line, defense vs position and his numbers without each teammate. Free."; }],

    [/^(.+) \((.+)\) promedia ([\d,]+) puntos, ([\d,]+) rebotes, ([\d,]+) asistencias, ([\d,]+) triples, ([\d,]+) robos y ([\d,]+) tapones en ([\d,]+) minutos por partido \((\d+) partidos esta temporada\)\. Último partido: (.+)\.$/,
      function (m, n, t, a, b, c, d, e, f, g, gp, last) { return n + " (" + t + ") averages " + dec(a) + " points, " + dec(b) + " rebounds, " + dec(c) + " assists, " + dec(d) + " threes, " + dec(e) + " steals and " + dec(f) + " blocks in " + dec(g) + " minutes per game (" + gp + " games this season). Last game: " + last + "."; }],
    [/^Últimos (\d+) partidos de (.+)\. Datos de NBA\.com, actualizados cada mañana\.$/, "Last $1 games of $2. NBA.com data, updated every morning."],
    [/^(.+) — NBA LAB$/, function (m, a) { return tr(a) + " — NBA LAB"; }]
  ];
  /* Palabras sueltas que pueden quedar dentro de textos largos (última pasada). */
  var W = [
    [/\bvs liga\b/g, "vs league"], [/\bvs media\b/g, "vs avg"], [/\(hora España\)/g, "(your time)"],
    [/\bposible baja\b/g, "may be out"], [/\bpartidos\b/g, "games"], [/\bpartido\b/g, "game"],
    [/\btemporada\b/g, "season"], [/\bTemporada\b/g, "Season"], [/\búltimos\b/g, "last"], [/\bÚltimos\b/g, "Last"],
    [/(\d+)º/g, function (m, n) { return ord(n); }]
  ];

  /* Reglas "compuestas" (su patrón lleva ·) se prueban sobre el texto entero; las demás, por tramos separados por " · ". */
  var RC = R.filter(function (r) { return r[2] || r[0].source.indexOf("·") > -1; });
  var RS = R.filter(function (r) { return !r[2] && r[0].source.indexOf("·") < 0; });
  function apply(list, t) {
    for (var i = 0; i < list.length; i++) { var r = list[i]; if (r[0].test(t)) return t.replace(r[0], r[1]); }
    return null;
  }
  function has(t) { return Object.prototype.hasOwnProperty.call(D, t); }
  function seg(t) { if (has(t)) return D[t]; var o = apply(RS, t); return o == null ? t : o; }
  function tr(s) {
    if (!EN || s == null) return s;
    var str = String(s);
    var m = /^(\s*(?:·\s+)?)([\s\S]*?)((?:\s+·)?\s*)$/.exec(str), t = m[2];
    if (!t || !/[A-Za-zÁÉÍÓÚáéíóúÑñ¿¡º]/.test(t)) return str;
    var out = has(t) ? D[t] : apply(RC, t);
    if (out == null) out = t.indexOf(" · ") > -1 ? t.split(" · ").map(seg).join(" · ") : seg(t);
    for (var i = 0; i < W.length; i++) out = out.replace(W[i][0], W[i][1]);
    return m[1] + out + m[3];
  }
  window.NL_T = tr;
  window.NL_TRANSLATE = function (el) { walk(el || document.body); };

  /* ---------------------------------------------------------------------------------------
     Botón de idioma en la cabecera
     --------------------------------------------------------------------------------------- */
  function addButton() {
    var nav = document.querySelector("[data-nav]");
    if (!nav || nav.querySelector(".nav-lang")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "nav-lang";
    b.setAttribute("aria-label", EN ? "Ver la web en español" : "View the site in English");
    b.title = EN ? "Español" : "English";
    b.innerHTML = EN ? '<span class="fl" aria-hidden="true">🇪🇸</span><span>ES</span>' : '<span class="fl" aria-hidden="true">🇬🇧</span><span>EN</span>';
    b.addEventListener("click", function () {
      var nv = EN ? "es" : "en";
      set(nv);
      try {
        var u = new URL(location.href);
        if (nv === "en") u.searchParams.set("lang", "en"); else u.searchParams.delete("lang");
        location.href = u.toString();
      } catch (_) { location.reload(); }
    });
    var x = nav.querySelector(".nav-x");
    if (x && x.parentNode === nav) nav.insertBefore(b, x.nextSibling); else nav.appendChild(b);
    marked.add(b);
  }

  /* ---------------------------------------------------------------------------------------
     Traducción del DOM (texto + atributos) y de lo que vaya apareciendo
     --------------------------------------------------------------------------------------- */
  var ATTRS = ["placeholder", "title", "aria-label", "alt"];
  var marked = new WeakSet();
  var SKIP = /^(SCRIPT|STYLE|CODE|TEXTAREA|NOSCRIPT)$/;
  function doText(n) {
    var v = n.nodeValue; if (!v || !v.trim()) return;
    var p = n.parentNode; if (p && p.nodeType === 1 && SKIP.test(p.nodeName)) return;
    var t = tr(v); if (t !== v) n.nodeValue = t;
  }
  function doAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute && el.getAttribute(a);
      if (v) { var t = tr(v); if (t !== v) el.setAttribute(a, t); }
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1 || SKIP.test(root.nodeName) || marked.has(root)) return;
    doAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function head() {
    var t = tr(document.title); if (t !== document.title) document.title = t;
    var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute("content", tr(md.getAttribute("content")));
    ["og:title", "og:description"].forEach(function (p) { var e = document.querySelector('meta[property="' + p + '"]'); if (e) e.setAttribute("content", tr(e.getAttribute("content"))); });
  }
  function start() {
    addButton();
    if (!EN) return;
    document.documentElement.classList.add("lang-en");
    head();
    walk(document.body);
    var mo = new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.type === "characterData") doText(r.target);
        else if (r.type === "attributes") doAttrs(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
      }
      head();
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    // <title> también cambia (ficha de jugador)
    var tt = document.querySelector("title");
    if (tt) new MutationObserver(head).observe(tt, { childList: true, characterData: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
