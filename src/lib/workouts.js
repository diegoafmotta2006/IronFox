import { DAY_STATUS } from "../config.js?v=5.6.1";
import { dateKey, startOfDay } from "./dates.js?v=5.6.1";

const STORAGE_KEY = "treinos.v1";
const STORAGE_VERSION = 1;

function storageAvailable() {
  return typeof localStorage !== "undefined";
}

function normalizeWorkouts(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function loadWorkouts() {
  if (!storageAvailable()) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return normalizeWorkouts(parsed?.workouts);
  } catch {
    return {};
  }
}

export function saveWorkout(date, workout) {
  const workouts = loadWorkouts();
  const key = dateKey(date);
  if (workout) {
    workouts[key] = workout;
  } else {
    delete workouts[key];
  }
  if (!storageAvailable()) return workouts;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ v: STORAGE_VERSION, workouts }),
  );
  return workouts;
}

export function getWorkout(workouts, date) {
  return workouts[dateKey(date)] ?? null;
}

export function exerciseSets(exercise) {
  if (!exercise) return [];
  if (Array.isArray(exercise.sets)) {
    return exercise.sets.map((set) => ({
      reps: typeof set?.reps === "number" ? set.reps : null,
      weightKg: typeof set?.weightKg === "number" ? set.weightKg : null,
    }));
  }
  // Formato antigo: { sets: 3, weightKg: 40 } (séries com o mesmo peso).
  if (typeof exercise.sets === "number" && exercise.sets > 0) {
    const weight = typeof exercise.weightKg === "number" ? exercise.weightKg : null;
    return Array.from({ length: Math.min(exercise.sets, 50) }, () => ({
      reps: null,
      weightKg: weight,
    }));
  }
  if (typeof exercise.weightKg === "number") {
    return [{ reps: null, weightKg: exercise.weightKg }];
  }
  return [];
}

export function workoutGroups(workout) {
  if (!workout) return [];
  if (Array.isArray(workout.groups)) {
    return workout.groups.filter((group) => typeof group === "string");
  }
  if (typeof workout.group === "string") return [workout.group];
  return [];
}

export function latestWorkout(workouts, beforeKey) {
  let latest = null;
  for (const [key, workout] of Object.entries(workouts ?? {})) {
    if (!workout || typeof workout !== "object" || workout.status) continue;
    if (!workout.exercises || Object.keys(workout.exercises).length === 0) continue;
    if (beforeKey && key >= beforeKey) continue;
    if (!latest || key > latest.key) latest = { key, workout };
  }
  return latest;
}

export function getDayStatus(workouts, date, today = new Date()) {
  const workout = getWorkout(workouts, date);
  if (workout) {
    if (workout.status === DAY_STATUS.DESCANSO) {
      return { type: DAY_STATUS.DESCANSO, workout };
    }
    if (workout.status === DAY_STATUS.PENDENTE) {
      return { type: DAY_STATUS.PENDENTE, workout };
    }
    return { type: DAY_STATUS.TREINO, workout };
  }
  if (startOfDay(date) < startOfDay(today)) {
    return { type: DAY_STATUS.DESCANSO, workout: null };
  }
  return { type: DAY_STATUS.PENDENTE, workout: null };
}
