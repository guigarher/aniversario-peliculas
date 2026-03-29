const MOVIE_PATHS = [
  "./data/movies.json",
  "./movies.json",
  "./data/movies_with_genres.json",
  "./movies_with_genres.json"
];

const WEEKDAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado"
];

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const movies = await loadMovies();
    const sortedMovies = sortMoviesByDate(movies);

    fillHeroBadges(sortedMovies);
    fillMainStats(sortedMovies);
    fillPlaceBreakdown(sortedMovies);
    fillGenres(sortedMovies);
    fillFirstMovie(sortedMovies);
    fillWrappedHighlights(sortedMovies);
    fillMemories(sortedMovies);
    fillSpecialSelection(sortedMovies);
    renderTimeline(sortedMovies);
    setupTimelineToggle();
    setupSectionReveal();
    fillTopMonthMovies(sortedMovies);
    setupTrailerPlayOverlay();
    setupLetterGate();
  } catch (error) {
    console.error("Error al iniciar la página:", error);
    showFatalError(error);
  }
}

async function loadMovies() {
  let lastError = null;

  for (const path of MOVIE_PATHS) {
    try {
      const response = await fetch(path, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`No se pudo cargar ${path} (${response.status})`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(`El archivo ${path} no contiene un array JSON válido.`);
      }

      return data.map(normalizeMovie);
    } catch (error) {
      lastError = error;
      console.warn(`Falló la carga de ${path}:`, error);
    }
  }

  throw lastError || new Error("No se pudo cargar ningún JSON de películas.");
}

function normalizeMovie(movie, index) {
  return {
    id: Number(movie.id ?? index + 1),
    title: String(movie.title ?? "Sin título"),
    date: String(movie.date ?? ""),
    place: String(movie.place ?? "Sin lugar"),
    notes: String(movie.notes ?? ""),
    tags: Array.isArray(movie.tags) ? movie.tags.map(String) : [],
    genres: Array.isArray(movie.genres) ? movie.genres.map(g => normalizeGenre(g)) : []
  };
}

function normalizeGenre(value) {
  return String(value ?? "").trim().toLowerCase();
}

function sortMoviesByDate(movies) {
  return [...movies].sort((a, b) => {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return a.id - b.id;
  });
}

function fillHeroBadges(movies) {
  const total = movies.length;
  const homeCount = movies.filter(movie => inferExperience(movie.place) === "home").length;
  const awayCount = movies.length - homeCount;

  setText("totalMoviesBadge", `${total} películas`);
  setText("cinemaMoviesBadge", `${awayCount} fuera de casa`);
  setText("homeMoviesBadge", `${homeCount} en casa`);
  setText("memoryMoviesBadge", `${getSpecialMemoryCount(movies)} recuerdos`);
}

function fillMainStats(movies) {
  setText("statTotal", String(movies.length));

  const topMonth = getTopMonth(movies);
  setText("statTopMonth", topMonth.name);
  setText("statTopMonthDetail", `${topMonth.count} películas en ${topMonth.name.toLowerCase()}`);

  const topWeekday = getTopWeekday(movies);
  setText("statTopWeekday", topWeekday.name);
  setText("statTopWeekdayDetail", `${topWeekday.count} sesiones cayeron en ${topWeekday.name.toLowerCase()}`);

  const topGenre = getTopGenre(movies);
  setText("statTopGenre", topGenre.label);
  setText("statTopGenreDetail", `${topGenre.count} pelis tocaron ese género`);

  const longestStreak = getLongestConsecutiveDayStreak(movies);
  setText("statLongestStreak", `${longestStreak.days} ${longestStreak.days === 1 ? "día" : "días"}`);
  setText("statLongestStreakDetail", longestStreak.detail);
  fillStreakMovies(longestStreak.movies);

  const movieDays = getMovieDaysInfo(movies);
  setText("statMovieDays", `${movieDays.days}`);
  setText("statMovieDaysDetail", `${movieDays.days} días distintos con al menos una película`);
}

function fillTopMonthMovies(movies) {
  const button = document.getElementById("topMonthToggleBtn");
  const box = document.getElementById("topMonthMoviesBox");
  const list = document.getElementById("topMonthMoviesList");

  if (!button || !box || !list) return;

  const topMonth = getTopMonth(movies);
  const monthIndex = MONTH_NAMES.indexOf(topMonth.name);

  const monthMovies = movies.filter(movie => {
    const date = new Date(movie.date);
    return date.getMonth() === monthIndex;
  });

  list.innerHTML = monthMovies
    .map(movie => `<li>${escapeHtml(movie.title)}</li>`)
    .join("");

  button.onclick = () => {
    const isHidden = box.hasAttribute("hidden");

    if (isHidden) {
      box.removeAttribute("hidden");
      button.textContent = "Ocultar películas";
      button.setAttribute("aria-expanded", "true");
    } else {
      box.setAttribute("hidden", "");
      button.textContent = "Ver películas";
      button.setAttribute("aria-expanded", "false");
    }
  };
}

function fillStreakMovies(movies) {
  const list = document.getElementById("streakMoviesList");
  const box = document.getElementById("streakMoviesBox");
  const button = document.getElementById("streakToggleBtn");

  if (!list || !box || !button) return;

  if (!movies.length) {
    button.hidden = true;
    box.hidden = true;
    return;
  }

  list.innerHTML = movies
    .map(movie => `<li>${escapeHtml(movie.title)}</li>`)
    .join("");

  button.hidden = false;

  button.onclick = () => {
    const isHidden = box.hasAttribute("hidden");

    if (isHidden) {
      box.removeAttribute("hidden");
      button.textContent = "Ocultar películas";
      button.setAttribute("aria-expanded", "true");
    } else {
      box.setAttribute("hidden", "");
      button.textContent = "Ver películas";
      button.setAttribute("aria-expanded", "false");
    }
  };
}

function fillPlaceBreakdown(movies) {
  const placesGrid = document.getElementById("placesGrid");
  if (!placesGrid) return;

  const homeCount = movies.filter(movie => inferExperience(movie.place) === "home").length;
  const awayCount = movies.length - homeCount;
  const specialCount = getSpecialMemoryCount(movies);

  setText("homeVsAwayTitle", `${homeCount} en casa - ${awayCount} fuera`);
  setText(
    "homeVsAwayText",
    specialCount
      ? `En casa la mayoría, que es donde más pegaditos podemos estar.`
      : "Casi todo se reparte entre casa y fuera."
  );

  const topPlace = getTopPlace(movies);
  setText("topPlaceTitle", topPlace.name);

  if (topPlace.name === "Casa") {
    setText("topPlaceText", `${topPlace.count} veces entre tu sofá y mi cama.`);
  } else {
    setText("topPlaceText", `${topPlace.count} ${topPlace.count === 1 ? "vez" : "veces"} dentro de este año.`);
  }

  const groupedPlaces = getGroupedPlacesWithMovies(movies).slice(0, 6);

  placesGrid.innerHTML = groupedPlaces
    .map((place, index) => {
      const boxId = `placeMoviesBox-${index}`;
      const btnId = `placeMoviesBtn-${index}`;

      return `
        <article class="place-card">
          <span class="place-card-label">Lugar</span>
          <h3>${escapeHtml(place.name)}</h3>
          <p>${place.count} ${place.count === 1 ? "película" : "películas"}</p>

          <button
            class="place-toggle"
            id="${btnId}"
            type="button"
            aria-expanded="false"
            aria-controls="${boxId}"
          >
            Ver películas
          </button>

          <div class="place-movies" id="${boxId}" hidden>
            <ul class="place-movies-list">
              ${place.movies.map(movie => `<li>${escapeHtml(movie)}</li>`).join("")}
            </ul>
            ${
                place.name === "La Gomera"
                  ? `<p class="place-note">
                      Las dos películas que tuvimos de fondo en el apartamento de tu padre en La Gomera
                      también cuentan para mí. Porque esos días también forman parte de nuestra historia.
                    </p>`
                  : ""
              }
          </div>
        </article>
      `;
    })
    .join("");

  setupPlaceCardToggles(groupedPlaces);
}

function fillGenres(movies) {
  const genresGrid = document.getElementById("genresGrid");
  if (!genresGrid) return;

  const groupedGenres = getGenresWithMovies(movies).slice(0, 6);

  genresGrid.innerHTML = groupedGenres
    .map((genre, index) => {
      const slug = slugify(genre.name);
      const boxId = `genreMoviesBox-${index}`;
      const btnId = `genreMoviesBtn-${index}`;

      return `
        <article class="genre-card genre-${slug}">
          <span class="genre-card-label">Género</span>
          <h3>${escapeHtml(capitalize(genre.name))}</h3>
          <p>${genre.count} ${genre.count === 1 ? "película" : "películas"}</p>

          <button
            class="genre-toggle"
            id="${btnId}"
            type="button"
            aria-expanded="false"
            aria-controls="${boxId}"
          >
            Ver películas
          </button>

          <div class="genre-movies" id="${boxId}" hidden>
            <ul class="genre-movies-list">
              ${genre.movies.map(movie => `<li>${escapeHtml(movie)}</li>`).join("")}
            </ul>
          </div>
        </article>
      `;
    })
    .join("");

  setupGenreCardToggles(groupedGenres);
}

function fillFirstMovie(movies) {
  const firstMovie = movies[0];
  if (!firstMovie) return;

  setText("firstMovieTitle", firstMovie.title);
  setText(
    "firstMovieMeta",
    `${formatFullDate(firstMovie.date)} · ${normalizePlace(firstMovie.place)}`
  );
  setText(
    "firstMovieNotes",
    firstMovie.notes || "La primera de todas, y donde empezó realmente este año en películas."
  );
}

function fillWrappedHighlights(movies) {
  const firstOfYear = movies.find(movie => movie.tags.includes("firstOfYear")) || findFirstMovieOfYear(movies, 2026);
  setText("firstOfYearTitle", firstOfYear?.title || "—");
  setText(
    "firstOfYearMeta",
    firstOfYear ? `${formatFullDate(firstOfYear.date)} · ${normalizePlace(firstOfYear.place)} · También la menos favorita de los dos. Empezamos el año con mal pie, pero a partir de ahí todo fue hacia arriba.` : "—"
  );

  const maxDays = getMostIntenseDays(movies);

  if (maxDays.length) {
    setText(
      "doubleSessionsValue",
      `${maxDays.length} ${maxDays.length === 1 ? "día" : "días"} de ${maxDays[0].count} pelis`
    );
    setText(
      "doubleSessionsMeta",
      `Hubo varios días en los que apretamos bastante más de la cuenta.`
    );
  } else {
    setText("doubleSessionsValue", "Sin sesión doble");
    setText("doubleSessionsMeta", "No hubo ningún día con dos o más pelis.");
  }

  fillMostIntenseDaysDetail(movies);
  fillManualFavorites();
}

  function fillManualFavorites() {
  setText("leastFavoriteTitle", "Bob Trevino Likes It");
  setText(
    "leastFavoriteMeta",
    "Empatada con Back to the Future Part II en 4,5 ★ en Letterboxd. Lo de Regreso al Futuro 2 seguramente fue presión amistosa."
  );

  setText("yourFavoritesTitle", "Back to the Future I & II");
  setText(
    "yourFavoritesMeta",
    "También Forrest Gump y la última de 28 años después se quedaron arriba del todo."
  );

  setText("herFavoritesTitle", "Bob Trevino Likes It");
  setText(
    "herFavoritesMeta",
    "Empatada con Back to the Future Part II como la que más nota se llevó de las que vimos juntos."
  );
}

function fillMostIntenseDaysDetail(movies) {
  const list = document.getElementById("doubleSessionsList");
  const box = document.getElementById("doubleSessionsBox");
  const button = document.getElementById("doubleSessionsToggleBtn");

  if (!list || !box || !button) return;

  const maxDays = getMostIntenseDays(movies);

  if (!maxDays.length) {
    button.hidden = true;
    box.hidden = true;
    return;
  }

  list.innerHTML = maxDays
    .map(day => `<li>${escapeHtml(formatShortDate(day.date))} — ${escapeHtml(day.titles.join(", "))}</li>`)
    .join("");

  button.hidden = false;

  button.addEventListener("click", () => {
    const isHidden = box.hasAttribute("hidden");

    if (isHidden) {
      box.removeAttribute("hidden");
      button.textContent = "Ocultar películas";
      button.setAttribute("aria-expanded", "true");
    } else {
      box.setAttribute("hidden", "");
      button.textContent = "Ver películas";
      button.setAttribute("aria-expanded", "false");
    }
  });
}

function fillMemories(movies) {
  const memoryList = document.getElementById("memoryList");
  if (!memoryList) return;

  const gomeraMovies = movies.filter(
    movie => normalizePlace(movie.place).toLowerCase() === "la gomera" || movie.tags.includes("gomera")
  );

  if (gomeraMovies.length) {
    const dates = unique(gomeraMovies.map(movie => movie.date)).map(formatFullDate);
    const titles = gomeraMovies.map(movie => movie.title).join(" y ");

    setText(
      "gomeraText",
      `${titles} se quedaron ligadas a La Gomera. Fue el ${dates.join(" y ")} y, más que una sesión cualquiera, se quedó como recuerdo del viaje.`
    );
  } else {
    setText(
      "gomeraText",
      "Aquí se quedan esos recuerdos que importan más por el momento en que aparecieron que por la peli en sí."
    );
  }

  const specialMovies = movies.filter(
    movie => normalizePlace(movie.place).toLowerCase() === "la gomera" || movie.tags.includes("memory") || movie.tags.includes("family")
  );

  if (!specialMovies.length) {
    memoryList.innerHTML = `
      <article class="memory-item">
        <h4>No hay recuerdos marcados</h4>
        <p>Este bloque se puede quedar pequeño y limpio si prefieres que solo aparezcan los que de verdad importan.</p>
      </article>
    `;
    return;
  }

  memoryList.innerHTML = specialMovies
    .slice(0, 4)
    .map(
      movie => `
        <article class="memory-item">
          <h4>${escapeHtml(movie.title)}</h4>
          <p>${escapeHtml(formatFullDate(movie.date))} · ${escapeHtml(normalizePlace(movie.place))}</p>
          <p>${escapeHtml(movie.notes || "Se quedó unida a ese momento.")}</p>
        </article>
      `
    )
    .join("");
}

function fillSpecialSelection(movies) {
  const specialGrid = document.getElementById("specialGrid");
  if (!specialGrid) return;

  const selections = buildSpecialSelections(movies);

  specialGrid.innerHTML = selections
    .map(
      item => `
        <article class="special-card">
          <span class="special-type">${escapeHtml(item.label)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </article>
      `
    )
    .join("");
}

function buildSpecialSelections(movies) {
  const first = movies[0];
  const last = movies[movies.length - 1];
  const birthday = movies.find(movie => movie.tags.includes("birthday"));
  const gomera = movies.find(movie => movie.tags.includes("gomera"));
  const bestStreak = getLongestConsecutiveDayStreak(movies);

  const selections = [];

  if (first) {
    selections.push({
      label: "Primera",
      title: first.title,
      description: `La primera de todas: ${formatFullDate(first.date)} en ${normalizePlace(first.place)}.`
    });
  }

  if (birthday) {
    selections.push({
      label: "Cumpleaños",
      title: birthday.title,
      description: `Se quedó unida al ${formatFullDate(birthday.date)} y a ese día en concreto.`
    });
  }

  if (gomera) {
    selections.push({
      label: "Viaje",
      title: "La Gomera",
      description: `Un recuerdo pequeño pero muy vuestro, con Forrest Gump y Catch Me If You Can de fondo.`
    });
  }

  if (bestStreak.days > 1) {
    selections.push({
      label: "Racha",
      title: `${bestStreak.days} días seguidos`,
      description: bestStreak.detail
    });
  }

  if (last) {
    selections.push({
      label: "Última",
      title: last.title,
      description: `La última registrada de este recorrido: ${formatFullDate(last.date)}.`
    });
  }

  return selections.slice(0, 5);
}

function renderTimeline(movies) {
  const timeline = document.getElementById("timeline");
  if (!timeline) return;

  timeline.innerHTML = movies
    .map(movie => {
      const chips = [
        `<span class="timeline-chip">${placeTypeLabel(inferExperience(movie.place))}</span>`,
        `<span class="timeline-chip">${escapeHtml(normalizePlace(movie.place))}</span>`
      ];

      if (movie.genres.length) {
        chips.push(
          ...movie.genres.slice(0, 2).map(genre => `<span class="timeline-chip">${escapeHtml(capitalize(genre))}</span>`)
        );
      }

      return `
        <article class="timeline-card">
          <div class="timeline-top">
            <h3 class="timeline-title">${escapeHtml(movie.title)}</h3>
            <span class="timeline-date">${escapeHtml(formatFullDate(movie.date))}</span>
          </div>

          <div class="timeline-meta">
            ${chips.join("")}
          </div>

          <p class="timeline-notes">
            ${escapeHtml(movie.notes || "Forma parte de este año aunque no haga falta decir mucho más.")}
          </p>
        </article>
      `;
    })
    .join("");
}

function setupTimelineToggle() {
  const button = document.getElementById("toggleTimelineBtn");
  const wrapper = document.getElementById("timelineWrapper");
  const section = document.getElementById("timeline-section");

  if (!button || !wrapper || !section) return;

  button.addEventListener("click", () => {
    const isHidden = wrapper.hasAttribute("hidden");

    if (isHidden) {
      wrapper.removeAttribute("hidden");
      button.textContent = "✦ Ocultar timeline";
      button.setAttribute("aria-expanded", "true");
      section.classList.add("timeline-open");
    } else {
      wrapper.setAttribute("hidden", "");
      button.textContent = "✦ Ver timeline";
      button.setAttribute("aria-expanded", "false");
      section.classList.remove("timeline-open");

      section.scrollIntoView({
        behavior: "auto",
        block: "start"
      });
    }
  });
}

function setupTrailerPlayOverlay() {
  const video = document.getElementById("teaserVideo");
  const button = document.getElementById("playOverlayBtn");

  if (!video || !button) return;

  const updateButtonState = () => {
    if (video.paused) {
      button.classList.remove("is-hidden");
    } else {
      button.classList.add("is-hidden");
    }
  };

  button.addEventListener("click", () => {
    video.play();
  });

  video.addEventListener("play", updateButtonState);
  video.addEventListener("pause", updateButtonState);
  video.addEventListener("ended", updateButtonState);

  updateButtonState();
}

function getTopMonth(movies) {
  const counts = new Map();

  movies.forEach(movie => {
    const date = new Date(movie.date);
    const month = date.getMonth();
    counts.set(month, (counts.get(month) || 0) + 1);
  });

  let bestMonth = 0;
  let bestCount = 0;

  counts.forEach((count, month) => {
    if (count > bestCount) {
      bestMonth = month;
      bestCount = count;
    }
  });

  return {
    name: MONTH_NAMES[bestMonth] || "—",
    count: bestCount
  };
}

function getTopWeekday(movies) {
  const counts = new Map();

  movies.forEach(movie => {
    const weekday = new Date(movie.date).getDay();
    counts.set(weekday, (counts.get(weekday) || 0) + 1);
  });

  let bestWeekday = 0;
  let bestCount = 0;

  counts.forEach((count, weekday) => {
    if (count > bestCount) {
      bestWeekday = weekday;
      bestCount = count;
    }
  });

  return {
    name: WEEKDAY_NAMES[bestWeekday] || "—",
    count: bestCount
  };
}

function getTopGenre(movies) {
  const counts = new Map();

  movies.forEach(movie => {
    movie.genres.forEach(genre => {
      counts.set(genre, (counts.get(genre) || 0) + 1);
    });
  });

  let bestGenre = "";
  let bestCount = 0;

  counts.forEach((count, genre) => {
    if (count > bestCount) {
      bestGenre = genre;
      bestCount = count;
    }
  });

  return {
    label: bestGenre ? capitalize(bestGenre) : "—",
    count: bestCount
  };
}

function getGenreCounts(movies) {
  const counts = new Map();

  movies.forEach(movie => {
    movie.genres.forEach(genre => {
      counts.set(genre, (counts.get(genre) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
}
function getGenresWithMovies(movies) {
  const grouped = new Map();

  movies.forEach(movie => {
    movie.genres.forEach(genre => {
      if (!grouped.has(genre)) {
        grouped.set(genre, {
          name: genre,
          count: 0,
          movies: []
        });
      }

      const entry = grouped.get(genre);
      entry.count += 1;
      entry.movies.push(movie.title);
    });
  });

  return [...grouped.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
}

function setupGenreCardToggles(genres) {
  genres.forEach((_, index) => {
    const button = document.getElementById(`genreMoviesBtn-${index}`);
    const box = document.getElementById(`genreMoviesBox-${index}`);

    if (!button || !box) return;

    button.addEventListener("click", () => {
      const isHidden = box.hasAttribute("hidden");

      if (isHidden) {
        box.removeAttribute("hidden");
        button.textContent = "Ocultar películas";
        button.setAttribute("aria-expanded", "true");
      } else {
        box.setAttribute("hidden", "");
        button.textContent = "Ver películas";
        button.setAttribute("aria-expanded", "false");
      }
    });
  });
}

function getTopPlace(movies) {
  const placeCounts = getPlaceCounts(movies);
  return placeCounts[0] || { name: "—", count: 0 };
}

function getPlaceCounts(movies) {
  const counts = new Map();

  movies.forEach(movie => {
    const place = normalizePlace(movie.place);
    counts.set(place, (counts.get(place) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
}
function getGroupedPlacesWithMovies(movies) {
  const grouped = new Map();

  movies.forEach(movie => {
    const place = normalizePlace(movie.place);

    if (!grouped.has(place)) {
      grouped.set(place, {
        name: place,
        count: 0,
        movies: []
      });
    }

    const entry = grouped.get(place);
    entry.count += 1;
    entry.movies.push(movie.title);
  });

  return [...grouped.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
}

function setupPlaceCardToggles(places) {
  places.forEach((_, index) => {
    const button = document.getElementById(`placeMoviesBtn-${index}`);
    const box = document.getElementById(`placeMoviesBox-${index}`);

    if (!button || !box) return;

    button.addEventListener("click", () => {
      const isHidden = box.hasAttribute("hidden");

      if (isHidden) {
        box.removeAttribute("hidden");
        button.textContent = "Ocultar películas";
        button.setAttribute("aria-expanded", "true");
      } else {
        box.setAttribute("hidden", "");
        button.textContent = "Ver películas";
        button.setAttribute("aria-expanded", "false");
      }
    });
  });
}

function getMovieDaysInfo(movies) {
  return { days: unique(movies.map(movie => movie.date)).length };
}

function getLongestConsecutiveDayStreak(movies) {
  const grouped = groupMoviesByDate(movies);
  const dates = [...grouped.keys()].sort();

  if (!dates.length) {
    return { days: 0, detail: "Sin datos.", movies: [] };
  }

  let best = { days: 1, start: dates[0], end: dates[0] };
  let current = { days: 1, start: dates[0], end: dates[0] };

  for (let i = 1; i < dates.length; i += 1) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffDays = Math.round((curr - prev) / 86400000);

    if (diffDays === 1) {
      current.days += 1;
      current.end = dates[i];
    } else {
      current = { days: 1, start: dates[i], end: dates[i] };
    }

    if (current.days > best.days) {
      best = { ...current };
    }
  }

  if (best.days === 1) {
    return {
      days: 1,
      detail: "No hubo una racha larga de días seguidos.",
      movies: []
    };
  }

  const streakMovies = dates
    .filter(date => date >= best.start && date <= best.end)
    .flatMap(date => grouped.get(date) || []);

  return {
    days: best.days,
    detail: `Del ${formatShortDate(best.start)} al ${formatShortDate(best.end)}`,
    movies: streakMovies.map(movie => ({
      title: movie.title,
      date: movie.date
    }))
  };
}

function getMostIntenseDays(movies) {
  const grouped = groupMoviesByDate(movies);

  const allDays = [...grouped.entries()]
    .map(([date, dayMovies]) => ({
      date,
      count: dayMovies.length,
      titles: dayMovies.map(movie => movie.title)
    }))
    .filter(day => day.count >= 2)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!allDays.length) return [];

  const maxCount = Math.max(...allDays.map(day => day.count));
  return allDays.filter(day => day.count === maxCount);
}

function groupMoviesByDate(movies) {
  const grouped = new Map();

  movies.forEach(movie => {
    if (!grouped.has(movie.date)) grouped.set(movie.date, []);
    grouped.get(movie.date).push(movie);
  });

  return grouped;
}

function findFirstMovieOfYear(movies, year) {
  return movies.find(movie => new Date(movie.date).getFullYear() === year) || null;
}

function normalizePlace(place) {
  const raw = String(place || "").trim();
  const lower = raw.toLowerCase();

  if (lower === "tea" || lower.includes("tea,")) return "TEA";
  if (lower.includes("alcampo")) return "Cine Alcampo";
  if (lower.includes("cajacanarias")) return "CajaCanarias";
  if (lower.includes("espacio cultural")) return "CajaCanarias";
  if (lower.includes("casa")) return "Casa";
  if (lower.includes("gomera")) return "La Gomera";
  if (lower.includes("desleal")) return "El Desleal";
  return raw;
}

function inferExperience(place) {
  const normalized = normalizePlace(place).toLowerCase();

  if (normalized === "casa") return "home";
  if (["tea", "cine alcampo", "cajacanarias", "el desleal"].includes(normalized)) return "away";
  return "special";
}

function placeTypeLabel(type) {
  if (type === "home") return "Casa";
  if (type === "away") return "Fuera";
  return "Recuerdo";
}

function getSpecialMemoryCount(movies) {
  return movies.filter(movie => {
    const place = normalizePlace(movie.place).toLowerCase();
    return place === "la gomera" || movie.tags.includes("memory") || movie.tags.includes("family");
  }).length;
}

function formatFullDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatShortDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short"
  }).format(date);
}

function capitalize(value) {
  const text = String(value || "");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function unique(array) {
  return [...new Set(array)];
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function setupSectionReveal() {
  const sections = document.querySelectorAll(
    ".section-intro, .place-breakdown-section, .genres-section, .spotlight-section, .highlights-section, .memories-section, .favorites-section, .timeline-section"
  );

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("section-visible");
        }
      });
    },
    {
      threshold: 0.12
    }
  );

  sections.forEach(section => observer.observe(section));
}
function setupLetterGate() {
  const wrap = document.getElementById("letterWrap");
  const button = document.getElementById("letterUnlockBtn");
  const input = document.getElementById("letterAnswer");
  const feedback = document.getElementById("letterFeedback");

  if (!wrap || !button || !input || !feedback) return;

  const validAnswers = [
    "slow coffee",
    "Slow Coffee",
    "SLOW COFFEE",
    "slow Coffee",
    "Slow coffee"
  ];

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[¿?¡!.,]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function unlockLetter() {
    const answer = normalizeText(input.value);
    const isCorrect = validAnswers.some(valid => normalizeText(valid) === answer);

    if (isCorrect) {
      wrap.classList.remove("locked");
      wrap.classList.add("unlocked");
      feedback.textContent = "Correcto.";
    } else {
      feedback.textContent = "Mmm… prueba otra vez.";
    }
  }

  button.addEventListener("click", unlockLetter);

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      unlockLetter();
    }
  });
}
function showFatalError(error) {
  const main = document.querySelector("main");
  if (!main) return;

  main.innerHTML = `
    <section class="section">
      <div class="container">
        <div class="special-card">
          <span class="special-type">Error</span>
          <h3>No se pudo cargar la página</h3>
          <p>Revisa que el JSON esté en la raíz o dentro de <code>/data</code>.</p>
          <p><code>${escapeHtml(error?.message || "Error desconocido")}</code></p>
        </div>
      </div>
    </section>
  `;
}
