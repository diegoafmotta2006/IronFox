import { DAY_STATUS, MUSCLE_GROUPS } from "../config.js?v=5.8.6";
import { el } from "../dom.js?v=5.8.6";
import { formatBR, dateKey } from "../lib/dates.js?v=5.8.6";
import {
  exerciseSets,
  getWorkout,
  latestWorkout,
  loadWorkouts,
  saveWorkout,
  workoutGroups,
} from "../lib/workouts.js?v=5.8.6";

const STATUS_OPTIONS = [
  { key: DAY_STATUS.DESCANSO, label: "Descanso" },
  { key: DAY_STATUS.PENDENTE, label: "Pendente" },
];

const numberFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

function parseDate(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function emptySet() {
  return { reps: "", weightKg: "" };
}

function emptyExercise() {
  return { name: "", sets: [emptySet()] };
}

function cloneExercises(source) {
  const out = {};
  if (source && typeof source === "object") {
    for (const [key, list] of Object.entries(source)) {
      if (!Array.isArray(list)) continue;
      out[key] = list.map((item) => {
        const sets = exerciseSets(item).map((set) => ({
          reps: set.reps != null ? String(set.reps) : "",
          weightKg: set.weightKg != null ? String(set.weightKg) : "",
        }));
        return {
          name: typeof item?.name === "string" ? item.name : "",
          sets: sets.length > 0 ? sets : [emptySet()],
        };
      });
    }
  }
  return out;
}

function toNumber(text) {
  const trimmed = String(text).trim();
  if (trimmed === "") return null;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function statusLabel(status) {
  if (status === DAY_STATUS.DESCANSO) return "Descanso";
  if (status === DAY_STATUS.PENDENTE) return "Pendente";
  return "Treino";
}

function exerciseDetail(exercise) {
  const parts = [];
  if (typeof exercise.sets === "number" && exercise.sets > 0) {
    parts.push(`${numberFormat.format(exercise.sets)} séries`);
  }
  if (typeof exercise.weightKg === "number") {
    parts.push(`${numberFormat.format(exercise.weightKg)} kg`);
  }
  return parts.join(" · ");
}

function setLabel(index, set) {
  const reps = set.reps != null ? numberFormat.format(set.reps) : "—";
  const weight = set.weightKg != null ? `${numberFormat.format(set.weightKg)} kg` : "—";
  return `${index} = ${reps} - ${weight}`;
}

export function renderDay(dayKey) {
  const date = parseDate(dayKey);
  const screen = el("div", "screen screen--left");

  if (!date) {
    screen.append(
      buildHeader(null, "Voltar", null, "Grupo muscular"),
      emptyCard("Escolha um dia no início para registrar o treino."),
    );
    return screen;
  }

  let current = getWorkout(loadWorkouts(), date);
  let editing = !current;

  function refresh() {
    current = getWorkout(loadWorkouts(), date);
  }

  function goHome() {
    window.location.hash = "#/";
  }

  function render() {
    refresh();
    screen.replaceChildren();
    if (editing) renderEdit();
    else renderView();
    window.scrollTo(0, 0);
  }

  function startEdit() {
    editing = true;
    render();
  }

  function stopEdit() {
    editing = false;
    render();
  }

  function buildHeader(dateValue, backLabel, onBack, title) {
    const header = el("header", "page-head");
    if (onBack) {
      const back = el("button", "page-head__back", backLabel);
      back.type = "button";
      back.addEventListener("click", onBack);
      header.append(back);
    } else {
      const back = el("a", "page-head__back", backLabel);
      back.href = "#/";
      header.append(back);
    }
    header.append(
      el("p", "page-head__eyebrow", dateValue ? formatBR(dateValue) : "Dia"),
      el("h1", "page-head__title", title),
    );
    return header;
  }

  function emptyCard(text) {
    const card = el("section", "log log--plain");
    card.append(el("p", "log__empty", text));
    return card;
  }

  function renderEdit() {
    const state = {
      status: current?.status ?? null,
      groups: new Set(workoutGroups(current)),
      exercises: cloneExercises(current?.exercises),
      weightKg: typeof current?.weightKg === "number" ? String(current.weightKg) : "",
    };

    const groupRows = new Map();
    const exerciseArea = el("div", "exercise-area");
    const save = el("button", "log__save", "Salvar");
    save.type = "button";
    const previous = latestWorkout(loadWorkouts(), dateKey(date));

    function repeatPrevious() {
      if (!previous) return;
      state.status = null;
      state.groups = new Set(
        workoutGroups(previous.workout).filter((key) => MUSCLE_GROUPS[key]),
      );
      state.exercises = cloneExercises(previous.workout.exercises);
      paintGroups();
      renderExercises();
    }

    const repeat = el("button", "repeat-button", "↻ Repetir último treino");
    repeat.type = "button";
    repeat.addEventListener("click", repeatPrevious);

    function paintGroups() {
      for (const [key, row] of groupRows) {
        const active =
          key === DAY_STATUS.DESCANSO || key === DAY_STATUS.PENDENTE
            ? state.status === key
            : state.groups.has(key);
        row.classList.toggle("log__row--selected", active);
        if (active) row.setAttribute("aria-current", "true");
        else row.removeAttribute("aria-current");

        const label = row.querySelector(".log__status");
        const color = MUSCLE_GROUPS[key]?.color;
        if (label) {
          if (active && color) label.style.color = color;
          else label.style.removeProperty("color");
        }
      }
    }

    function toggleGroup(key) {
      if (state.status) state.status = null;
      if (state.groups.has(key)) state.groups.delete(key);
      else state.groups.add(key);
      paintGroups();
      renderExercises();
    }

    function toggleStatus(key) {
      state.groups.clear();
      state.status = state.status === key ? null : key;
      paintGroups();
      renderExercises();
    }

    function rowsFor(key) {
      if (!state.exercises[key] || state.exercises[key].length === 0) {
        state.exercises[key] = [emptyExercise()];
      }
      return state.exercises[key];
    }

    function buildSetRow(exercise, index) {
      const set = exercise.sets[index];
      const row = el("div", "set-row");

      row.append(
        el("span", "set-row__index", String(index + 1)),
        el("span", "set-row__sep", "="),
      );

      const reps = el("input", "exercise__control set-row__input");
      reps.type = "number";
      reps.min = "1";
      reps.step = "1";
      reps.inputMode = "numeric";
      reps.placeholder = "reps";
      reps.value = set.reps;
      reps.setAttribute("aria-label", `Repetições da série ${index + 1}`);
      reps.addEventListener("input", () => {
        set.reps = reps.value;
      });

      const weight = el("input", "exercise__control set-row__input");
      weight.type = "number";
      weight.min = "0";
      weight.step = "0.1";
      weight.inputMode = "decimal";
      weight.placeholder = "kg";
      weight.value = set.weightKg;
      weight.setAttribute("aria-label", `Peso da série ${index + 1} (kg)`);
      weight.addEventListener("input", () => {
        set.weightKg = weight.value;
      });

      row.append(
        reps,
        el("span", "set-row__sep", "–"),
        weight,
        el("span", "set-row__unit", "kg"),
      );

      if (exercise.sets.length > 1) {
        const remove = el("button", "set-row__remove", "×");
        remove.type = "button";
        remove.setAttribute("aria-label", `Remover série ${index + 1}`);
        remove.addEventListener("click", () => {
          exercise.sets.splice(index, 1);
          renderExercises();
        });
        row.append(remove);
      }

      return row;
    }

    function buildExerciseCard(key, index) {
      const data = state.exercises[key][index];
      const card = el("div", "exercise");

      const top = el("div", "exercise__top");
      const name = el("input", "exercise__name");
      name.type = "text";
      name.placeholder = "Exercício (ex.: supino reto)";
      name.value = data.name;
      name.addEventListener("input", () => {
        data.name = name.value;
      });

      const remove = el("button", "exercise__remove", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", "Remover exercício");
      remove.addEventListener("click", () => {
        state.exercises[key].splice(index, 1);
        renderExercises();
      });
      top.append(name, remove);

      const sets = el("div", "exercise__sets");
      data.sets.forEach((_, setIndex) => sets.append(buildSetRow(data, setIndex)));

      const addSet = el("button", "exercise-add exercise-add--set", "+ Série");
      addSet.type = "button";
      addSet.addEventListener("click", () => {
        const last = data.sets[data.sets.length - 1];
        data.sets.push({ reps: "", weightKg: last ? last.weightKg : "" });
        renderExercises();
      });

      card.append(top, sets, addSet);
      return card;
    }

    function buildGroupBlock(key) {
      const group = MUSCLE_GROUPS[key];
      const block = el("div", "exercise-block");

      const title = el("h3", "exercise-block__title");
      const dot = el("span", "log__dot");
      dot.style.background = group.color;
      dot.setAttribute("aria-hidden", "true");
      const label = el("span", null, group.label);
      label.style.color = group.color;
      title.append(dot, label);

      const list = el("div", "exercise-list");
      const rows = rowsFor(key);
      rows.forEach((_, index) => list.append(buildExerciseCard(key, index)));

      const add = el("button", "exercise-add", "Adicionar exercício");
      add.type = "button";
      add.addEventListener("click", () => {
        rowsFor(key).push(emptyExercise());
        renderExercises();
      });

      block.append(title, list, add);
      return block;
    }

    function renderExercises() {
      exerciseArea.replaceChildren();
      const keys = Object.keys(MUSCLE_GROUPS).filter(
        (key) => state.groups.has(key) && !MUSCLE_GROUPS[key].noExercises,
      );
      if (keys.length === 0) {
        const onlyNoExercises =
          state.groups.size > 0 &&
          [...state.groups].every((key) => MUSCLE_GROUPS[key]?.noExercises);
        exerciseArea.append(
          el(
            "p",
            "exercise-hint",
            state.status
              ? `Dia marcado como ${statusLabel(state.status).toLowerCase()}.`
              : onlyNoExercises
                ? "Dia marcado como falta."
                : "Escolha um grupo muscular acima para anotar os exercícios.",
          ),
        );
        return;
      }
      for (const key of keys) exerciseArea.append(buildGroupBlock(key));
    }

    function buildGroupRow(key, label, color) {
      const row = el("li", "log__row log__row--option");
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.dataset.option = key;

      const dot = el("span", "log__dot");
      if (color) dot.style.background = color;
      else dot.classList.add("log__dot--muted");
      dot.setAttribute("aria-hidden", "true");

      row.append(dot, el("span", "log__status", label));

      const isStatus = key === DAY_STATUS.DESCANSO || key === DAY_STATUS.PENDENTE;
      const choose = () => (isStatus ? toggleStatus(key) : toggleGroup(key));
      row.addEventListener("click", choose);
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          choose();
        }
      });

      groupRows.set(key, row);
      return row;
    }

    const weightBlock = el("label", "exercise-block exercise-block--weight");
    weightBlock.append(el("span", "exercise-block__title", "Peso do dia"));
    const dayWeight = el("input", "exercise__control");
    dayWeight.type = "number";
    dayWeight.min = "0";
    dayWeight.step = "0.01";
    dayWeight.inputMode = "decimal";
    dayWeight.placeholder = "ex.: 60.59";
    dayWeight.value = state.weightKg;
    dayWeight.addEventListener("input", () => {
      state.weightKg = dayWeight.value;
    });
    const weightField = el("span", "exercise__field");
    weightField.append(el("span", null, "Seu peso hoje (kg)"), dayWeight);
    weightBlock.append(weightField);

    save.addEventListener("click", () => {
      if (state.status) {
        const statusWorkout = { status: state.status };
        const statusWeight = toNumber(state.weightKg);
        if (statusWeight !== null) statusWorkout.weightKg = statusWeight;
        saveWorkout(date, statusWorkout);
        editing = false;
        render();
        return;
      }

      const groups = Object.keys(MUSCLE_GROUPS).filter((key) => state.groups.has(key));
      if (groups.length === 0) {
        saveWorkout(date, null);
        goHome();
        return;
      }

      const exercises = {};
      for (const key of groups) {
        const rows = (state.exercises[key] ?? [])
          .map((item) => ({
            name: item.name.trim(),
            sets: item.sets
              .map((set) => ({
                reps: toNumber(set.reps),
                weightKg: toNumber(set.weightKg),
              }))
              .filter((set) => set.reps !== null || set.weightKg !== null),
          }))
          .filter((item) => item.name || item.sets.length > 0);
        if (rows.length > 0) exercises[key] = rows;
      }

      const next = { groups };
      if (Object.keys(exercises).length > 0) next.exercises = exercises;
      const bodyWeight = toNumber(state.weightKg);
      if (bodyWeight !== null) next.weightKg = bodyWeight;

      saveWorkout(date, next);
      editing = false;
      render();
    });

    const section = el("section", "log log--plain");
    const head = el("div", "log__head");
    head.append(el("h2", "log__title", "Grupos musculares"));

    const list = el("ul", "log__list");
    list.setAttribute("aria-label", `Grupos musculares de ${formatBR(date)}`);
    list.setAttribute("aria-multiselectable", "true");

    for (const [key, group] of Object.entries(MUSCLE_GROUPS)) {
      list.append(buildGroupRow(key, group.label, group.color));
    }
    for (const option of STATUS_OPTIONS) {
      list.append(buildGroupRow(option.key, option.label, null));
    }

    section.append(head, list);
    if (previous) section.append(repeat);
    section.append(exerciseArea, weightBlock, save);

    screen.append(buildHeader(date, current ? "Cancelar" : "Voltar", current ? stopEdit : null, "Grupo muscular"));
    screen.append(section);

    paintGroups();
    renderExercises();
  }

  function renderView() {
    const section = el("section", "log log--plain");
    const head = el("div", "log__head");
    head.append(el("h2", "log__title", "Anotações"));
    section.append(head);

    if (current?.status) {
      const row = el("div", "notes__status");
      row.append(
        el("span", "log__dot log__dot--muted"),
        el("span", "log__status", statusLabel(current.status)),
      );
      section.append(row);
    } else {
      const groups = workoutGroups(current);
      for (const key of groups) {
        const group = MUSCLE_GROUPS[key];
        if (!group) continue;

        const block = el("div", "notes__group");
        const title = el("h3", "exercise-block__title");
        const dot = el("span", "log__dot");
        dot.style.background = group.color;
        dot.setAttribute("aria-hidden", "true");
        const label = el("span", null, group.label);
        label.style.color = group.color;
        title.append(dot, label);
        block.append(title);

        const exercises = current?.exercises?.[key] ?? [];
        if (group.noExercises) {
          // "Falta" é só um marcador, não tem exercícios.
        } else if (exercises.length === 0) {
          block.append(el("p", "notes__empty", "Sem exercícios anotados."));
        } else {
          const list = el("ul", "notes__list");
          for (const exercise of exercises) {
            const item = el("li", "notes__item notes__item--exercise");
            item.append(el("span", "notes__name", exercise.name || "Exercício"));
            if (Array.isArray(exercise.sets)) {
              const sets = el("ul", "notes__sets");
              exercise.sets.forEach((set, index) => {
                sets.append(el("li", "notes__set", setLabel(index + 1, set)));
              });
              if (sets.childElementCount > 0) item.append(sets);
            } else {
              const detail = exerciseDetail(exercise);
              if (detail) item.append(el("span", "notes__detail", detail));
            }
            list.append(item);
          }
          block.append(list);
        }
        section.append(block);
      }
    }

    if (typeof current?.weightKg === "number") {
      const weight = el("div", "notes__weight");
      weight.append(
        el("span", "exercise-block__title", "Peso do dia"),
        el("span", "notes__weight-value", `${numberFormat.format(current.weightKg)} kg`),
      );
      section.append(weight);
    }

    const edit = el("button", "edit-button");
    edit.type = "button";
    const pencil = el("span", "edit-button__icon", "✎");
    pencil.setAttribute("aria-hidden", "true");
    edit.append(pencil, el("span", null, "Editar"));
    edit.addEventListener("click", startEdit);
    section.append(edit);

    screen.append(buildHeader(date, "Voltar", null, "Anotações"));
    screen.append(section);
  }

  render();
  return screen;
}
