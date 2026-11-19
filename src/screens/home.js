import { APP_VERSION, DAY_STATUS, MUSCLE_GROUPS } from "../config.js?v=5.8.3";
import { el } from "../dom.js?v=5.8.3";
import {
  WEEKDAYS,
  dateKey,
  formatBR,
  monthDays,
  monthNameLower,
  monthTitle,
} from "../lib/dates.js?v=5.8.3";
import { getAccountState } from "../lib/sync.js?v=5.8.3";
import {
  exerciseSets,
  getDayStatus,
  loadWorkouts,
  workoutGroups,
} from "../lib/workouts.js?v=5.8.3";

const weightFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

const axisFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

function groupLabels(workout) {
  return workoutGroups(workout)
    .map((key) => MUSCLE_GROUPS[key]?.label)
    .filter(Boolean);
}

function statusLabel(status) {
  if (status.type === DAY_STATUS.TREINO) {
    const labels = groupLabels(status.workout);
    return labels.length > 0 ? labels.join(" + ") : "Treino";
  }
  return status.type === DAY_STATUS.DESCANSO ? "Descanso" : "Pendente";
}

function groupBackground(workout) {
  const colors = workoutGroups(workout)
    .map((key) => MUSCLE_GROUPS[key]?.color)
    .filter(Boolean);
  if (colors.length === 0) return "";
  if (colors.length === 1) return colors[0];
  return `linear-gradient(135deg, ${colors.join(", ")})`;
}

function paintGroupLabel(node, workout) {
  const colors = workoutGroups(workout)
    .map((key) => MUSCLE_GROUPS[key]?.color)
    .filter(Boolean);
  if (colors.length === 0) return;
  if (colors.length === 1) {
    node.style.color = colors[0];
    return;
  }
  node.style.backgroundImage = `linear-gradient(135deg, ${colors.join(", ")})`;
  node.style.webkitBackgroundClip = "text";
  node.style.backgroundClip = "text";
  node.style.color = "transparent";
}

function isCurrentMonth(monthDate, today) {
  return (
    monthDate.getFullYear() === today.getFullYear() &&
    monthDate.getMonth() === today.getMonth()
  );
}

function buildAccountLink() {
  const link = el("a", "account-link");
  link.href = "#/conta";
  link.setAttribute("aria-label", "Conta");
  link.title = "Conta";

  const icon = svgEl("svg", {
    viewBox: "0 0 24 24",
    width: "18",
    height: "18",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "1.6",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  });
  icon.append(
    svgEl("circle", { cx: "12", cy: "8.2", r: "3.4" }),
    svgEl("path", { d: "M5.2 19.8c.8-3.4 3.5-5.3 6.8-5.3s6 1.9 6.8 5.3" }),
  );
  link.append(icon);

  if (getAccountState().user) link.classList.add("account-link--active");
  return link;
}

function buildHeader(monthDate, today) {
  const header = el("header", "page-head");

  const eyebrowRow = el("div", "page-head__eyebrow-row");
  eyebrowRow.append(el("p", "page-head__eyebrow", `IronFox · v${APP_VERSION}`));

  const actions = el("div", "page-head__actions");
  if (!isCurrentMonth(monthDate, today)) {
    const todayButton = el("button", "page-head__today", "Hoje");
    todayButton.type = "button";
    todayButton.addEventListener("click", () => {
      window.location.hash = "#/";
    });
    actions.append(todayButton);
  }
  actions.append(buildAccountLink());
  eyebrowRow.append(actions);

  const nav = el("div", "page-head__nav");
  const previous = el("button", "month-nav", "‹");
  previous.type = "button";
  previous.setAttribute("aria-label", "Mês anterior");
  previous.addEventListener("click", () => {
    const target = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
    window.location.hash = `#/${dateKey(target).slice(0, 7)}`;
  });

  const title = el("h1", "page-head__title", monthTitle(monthDate));

  const next = el("button", "month-nav", "›");
  next.type = "button";
  next.setAttribute("aria-label", "Próximo mês");
  next.disabled = isCurrentMonth(monthDate, today);
  next.addEventListener("click", () => {
    const target = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    window.location.hash = `#/${dateKey(target).slice(0, 7)}`;
  });

  nav.append(previous, title, next);
  header.append(eyebrowRow, nav);
  return header;
}

function buildCalendar(monthDate, workouts, today) {
  const section = el("section", "calendar");
  section.setAttribute(
    "aria-label",
    `Calendário de ${monthNameLower(monthDate)} de ${monthDate.getFullYear()}`,
  );

  const weekdays = el("div", "calendar__weekdays");
  for (const label of WEEKDAYS) {
    const cell = el("span", "calendar__weekday", label);
    cell.setAttribute("aria-hidden", "true");
    weekdays.append(cell);
  }

  const grid = el("div", "calendar__grid");
  const todayKey = dateKey(today);

  for (const day of monthDays(monthDate)) {
    if (!day) {
      const empty = el("span", "calendar__day calendar__day--empty");
      empty.setAttribute("aria-hidden", "true");
      grid.append(empty);
      continue;
    }

    const status = getDayStatus(workouts, day, today);
    const label = statusLabel(status);
    const cell = el("button", "calendar__day", String(day.getDate()));
    cell.type = "button";
    cell.dataset.date = dateKey(day);
    cell.setAttribute("aria-label", `${formatBR(day)} – ${label}`);

    cell.addEventListener("click", () => {
      window.location.hash = `#/dia/${dateKey(day)}`;
    });

    if (status.type === DAY_STATUS.DESCANSO) {
      cell.classList.add("calendar__day--past");
    }
    if (status.type === DAY_STATUS.TREINO) {
      cell.classList.add("calendar__day--workout");
      cell.style.setProperty("--day-color", groupBackground(status.workout));
    }
    if (dateKey(day) === todayKey) {
      cell.classList.add("calendar__day--today");
    }

    grid.append(cell);
  }

  section.append(weekdays, grid);
  return section;
}

function buildRow(day, workouts, today) {
  const status = getDayStatus(workouts, day, today);
  const label = statusLabel(status);
  const row = el("li", "log__row");
  row.dataset.date = dateKey(day);
  row.tabIndex = 0;
  row.setAttribute("role", "button");
  const openDay = () => {
    window.location.hash = `#/dia/${dateKey(day)}`;
  };
  row.addEventListener("click", openDay);
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDay();
    }
  });

  const date = el("span", "log__date", formatBR(day));
  const dash = el("span", "log__dash", "–");
  dash.setAttribute("aria-hidden", "true");
  const stateCell = el("span", `log__status log__status--${status.type}`, label);
  if (status.type === DAY_STATUS.TREINO) {
    paintGroupLabel(stateCell, status.workout);
  }

  row.append(date, dash, stateCell);

  const weight = status.workout?.weightKg;
  if (typeof weight === "number" && Number.isFinite(weight)) {
    row.append(
      el("span", "log__weight", `– ${weightFormat.format(weight)} kg`),
    );
  }

  return row;
}

function buildLog(monthDate, workouts, today) {
  const section = el("section", "card log");
  const head = el("div", "log__head");
  head.append(el("h2", "log__title", "Registro do mês"));

  const list = el("ul", "log__list");
  list.setAttribute(
    "aria-label",
    `Registro de ${monthNameLower(monthDate)} de ${monthDate.getFullYear()}`,
  );
  for (const day of monthDays(monthDate)) {
    if (day) list.append(buildRow(day, workouts, today));
  }

  section.append(head, list);
  return section;
}

function monthFromParam(param, today) {
  const fallback = new Date(today.getFullYear(), today.getMonth(), 1);
  const match = /^(\d{4})-(\d{2})$/.exec(param ?? "");
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return fallback;
  return new Date(year, month, 1);
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) {
    node.setAttribute(name, value);
  }
  return node;
}

function shortDate(key) {
  const [, month, day] = key.split("-");
  return `${day}/${month}`;
}

function lastDayKey(monthDate) {
  return dateKey(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));
}

function collectBodyWeights(workouts, limitKey) {
  return Object.entries(workouts)
    .filter(
      ([key, workout]) =>
        key <= limitKey &&
        workout &&
        typeof workout.weightKg === "number" &&
        Number.isFinite(workout.weightKg),
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, workout]) => ({ key, value: workout.weightKg }));
}

function collectExerciseSeries(workouts, limitKey) {
  const byName = new Map();
  const entries = Object.entries(workouts)
    .filter(([key, workout]) => key <= limitKey && workout && !workout.status)
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [key, workout] of entries) {
    for (const list of Object.values(workout.exercises ?? {})) {
      if (!Array.isArray(list)) continue;
      for (const exercise of list) {
        const name = typeof exercise?.name === "string" ? exercise.name.trim() : "";
        if (!name) continue;
        const weights = exerciseSets(exercise)
          .map((set) => set.weightKg)
          .filter((value) => typeof value === "number" && Number.isFinite(value));
        if (weights.length === 0) continue;

        const id = name.toLowerCase();
        if (!byName.has(id)) byName.set(id, { name, points: new Map() });
        const entry = byName.get(id);
        const previous = entry.points.get(key);
        const weight = Math.max(...weights, previous ?? -Infinity);
        entry.points.set(key, weight);
      }
    }
  }

  return [...byName.values()]
    .map((entry) => ({
      name: entry.name,
      points: [...entry.points.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => ({ key, value })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function buildChart(points, ariaLabel) {
  const box = el("div", "chart");
  if (points.length === 0) {
    box.append(el("p", "chart__empty", "Sem dados suficientes por enquanto."));
    return box;
  }

  const width = 300;
  const height = 140;
  const left = 36;
  const right = 10;
  const top = 12;
  const bottom = 24;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const values = points.map((point) => point.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const padding = (max - min) * 0.15;
  min -= padding;
  max += padding;

  const xAt = (index) =>
    points.length === 1
      ? left + plotWidth / 2
      : left + (index / (points.length - 1)) * plotWidth;
  const yAt = (value) =>
    top + (1 - (value - min) / (max - min)) * plotHeight;

  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    class: "chart__svg",
    role: "img",
    "aria-label": ariaLabel,
  });

  for (const fraction of [0, 0.5, 1]) {
    const y = top + fraction * plotHeight;
    svg.append(
      svgEl("line", {
        x1: left,
        x2: width - right,
        y1: y,
        y2: y,
        class: "chart__grid",
      }),
    );
    const label = svgEl("text", {
      x: left - 6,
      y: y + 3,
      class: "chart__axis",
      "text-anchor": "end",
    });
    label.textContent = axisFormat.format(max - fraction * (max - min));
    svg.append(label);
  }

  const labelIndexes =
    points.length <= 5
      ? points.map((_, index) => index)
      : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  for (const index of [...new Set(labelIndexes)]) {
    const anchor =
      points.length === 1
        ? "middle"
        : index === 0
          ? "start"
          : index === points.length - 1
            ? "end"
            : "middle";
    const label = svgEl("text", {
      x: xAt(index),
      y: height - 6,
      class: "chart__axis",
      "text-anchor": anchor,
    });
    label.textContent = shortDate(points[index].key);
    svg.append(label);
  }

  if (points.length > 1) {
    svg.append(
      svgEl("polyline", {
        points: points
          .map((point, index) => `${xAt(index)},${yAt(point.value)}`)
          .join(" "),
        class: "chart__line",
      }),
    );
  }

  points.forEach((point, index) => {
    svg.append(
      svgEl("circle", {
        cx: xAt(index),
        cy: yAt(point.value),
        r: 2.6,
        class: "chart__point",
      }),
    );
  });

  box.append(svg);
  return box;
}

function buildEvolution(monthDate, workouts) {
  const section = el("section", "card log");
  const head = el("div", "log__head");
  head.append(el("h2", "log__title", "Evolução"));
  section.append(head);

  const limitKey = lastDayKey(monthDate);
  const bodyWeights = collectBodyWeights(workouts, limitKey);
  const exercises = collectExerciseSeries(workouts, limitKey);
  let mode = "weight";
  let selectedExercise = exercises[0]?.name ?? "";
  let pickerOpen = false;

  const tabs = el("div", "chart-tabs");
  const weightTab = el("button", "chart-tab", "Peso corporal");
  const exerciseTab = el("button", "chart-tab", "Exercício");
  weightTab.type = "button";
  exerciseTab.type = "button";
  weightTab.addEventListener("click", () => {
    mode = "weight";
    pickerOpen = false;
    paint();
  });
  exerciseTab.addEventListener("click", () => {
    mode = "exercise";
    pickerOpen = false;
    paint();
  });
  tabs.append(weightTab, exerciseTab);

  const body = el("div", "chart-body");
  section.append(tabs, body);

  function buildPicker() {
    const wrap = el("div", "picker");

    const trigger = el("button", "picker__trigger");
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", String(pickerOpen));
    trigger.setAttribute("aria-label", "Escolher exercício");

    const chevron = svgEl("svg", {
      viewBox: "0 0 24 24",
      width: "14",
      height: "14",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      class: "picker__chevron",
    });
    chevron.append(svgEl("path", { d: "M6 9.5l6 6 6-6" }));
    trigger.append(el("span", "picker__name", selectedExercise), chevron);

    const list = el("div", "picker__list");
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "Exercícios");
    list.hidden = !pickerOpen;

    for (const exercise of exercises) {
      const active = exercise.name === selectedExercise;
      const option = el("button", "picker__option", exercise.name);
      option.type = "button";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(active));
      if (active) {
        option.classList.add("picker__option--selected");
        option.append(el("span", "picker__check", "✓"));
      }
      option.addEventListener("click", () => {
        pickerOpen = false;
        selectedExercise = exercise.name;
        paint();
      });
      list.append(option);
    }

    function closePicker() {
      if (!pickerOpen) return;
      pickerOpen = false;
      list.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }

    trigger.addEventListener("click", () => {
      pickerOpen = !pickerOpen;
      list.hidden = !pickerOpen;
      trigger.setAttribute("aria-expanded", String(pickerOpen));
      if (pickerOpen) {
        document.addEventListener(
          "pointerdown",
          (event) => {
            if (!wrap.contains(event.target)) closePicker();
          },
          { once: true },
        );
      }
    });

    wrap.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && pickerOpen) {
        event.stopPropagation();
        closePicker();
        trigger.focus();
      }
    });

    wrap.append(trigger, list);
    return wrap;
  }

  function paint() {
    weightTab.setAttribute("aria-pressed", String(mode === "weight"));
    exerciseTab.setAttribute("aria-pressed", String(mode === "exercise"));
    body.replaceChildren();

    if (mode === "weight") {
      const points = bodyWeights.slice(-12);
      body.append(buildChart(points, "Evolução do peso corporal"));
      if (bodyWeights.length > points.length) {
        body.append(el("p", "chart__caption", "Últimos 12 registros"));
      }
      return;
    }

    if (exercises.length === 0) {
      body.append(
        el("p", "chart__empty", "Nenhum exercício com peso anotado ainda."),
      );
      return;
    }

    const current =
      exercises.find((exercise) => exercise.name === selectedExercise) ??
      exercises[0];
    const points = current.points.slice(-12);

    body.append(
      buildPicker(),
      buildChart(points, `Evolução de carga de ${current.name}`),
    );
    if (current.points.length > points.length) {
      body.append(el("p", "chart__caption", "Últimos 12 registros"));
    }
  }

  paint();
  return section;
}

function buildSummary(monthDate, workouts, today) {
  const section = el("section", "card log");
  const head = el("div", "log__head");
  head.append(el("h2", "log__title", "Resumo do mês"));
  section.append(head);

  let workoutsDone = 0;
  let misses = 0;
  let bestStreak = 0;
  let streak = 0;

  for (const day of monthDays(monthDate)) {
    if (!day) continue;
    const status = getDayStatus(workouts, day, today);
    if (status.type !== DAY_STATUS.TREINO) {
      streak = 0;
      continue;
    }
    const groups = workoutGroups(status.workout);
    if (groups.includes("falta")) {
      misses += 1;
      streak = 0;
      continue;
    }
    if (groups.length === 0) {
      streak = 0;
      continue;
    }
    workoutsDone += 1;
    streak += 1;
    bestStreak = Math.max(bestStreak, streak);
  }

  const rows = [
    ["Treinos", String(workoutsDone)],
    ["Faltas", String(misses)],
    ["Sequência", bestStreak > 0 ? `${bestStreak} dia${bestStreak > 1 ? "s" : ""}` : "—"],
  ];

  const list = el("dl", "summary");
  for (const [label, value] of rows) {
    const row = el("div", "summary__row");
    row.append(el("dt", "summary__label", label), el("dd", "summary__value", value));
    list.append(row);
  }

  section.append(list);
  return section;
}

export function renderHome(param) {
  const today = new Date();
  const monthDate = monthFromParam(param, today);
  const workouts = loadWorkouts();

  const screen = el("div", "screen");
  screen.append(
    buildHeader(monthDate, today),
    buildCalendar(monthDate, workouts, today),
    buildLog(monthDate, workouts, today),
    buildEvolution(monthDate, workouts),
    buildSummary(monthDate, workouts, today),
  );
  return screen;
}
