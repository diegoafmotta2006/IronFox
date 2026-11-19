import {
  applyRemoteWorkoutRecords,
  loadWorkoutRecords,
} from "./workouts.js?v=5.8.5";

const PUSH_DELAY_MS = 900;

let firebase = null;
let started = false;
let uid = null;
let cloudUnsubscribe = null;
let pushTimer = null;
let retryTimer = null;

let state = {
  status: "loading",
  user: null,
  message: "",
  error: "",
  lastSyncAt: null,
};

export function getAccountState() {
  return { ...state };
}

function emit() {
  window.dispatchEvent(new CustomEvent("account:changed"));
}

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

function stamp(record) {
  if (!record || typeof record !== "object") return 0;
  return typeof record.updatedAt === "number" ? record.updatedAt : 0;
}

export function mergeWorkoutRecords(local, remote) {
  const result = {};
  const keys = new Set([
    ...Object.keys(local ?? {}),
    ...Object.keys(remote ?? {}),
  ]);
  for (const key of keys) {
    const a = local?.[key];
    const b = remote?.[key];
    if (!a) result[key] = b;
    else if (!b) result[key] = a;
    else result[key] = stamp(a) >= stamp(b) ? a : b;
  }
  return result;
}

function sameRecords(a, b) {
  return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

function stopCloud() {
  uid = null;
  if (cloudUnsubscribe) {
    cloudUnsubscribe();
    cloudUnsubscribe = null;
  }
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

async function pushNow() {
  if (!uid || !firebase) return;
  try {
    await firebase.writeCloud(uid, loadWorkoutRecords());
    setState({ lastSyncAt: Date.now(), error: "" });
  } catch (error) {
    setState({ error: "Não foi possível salvar na nuvem agora. Suas alterações continuam neste aparelho." });
    if (!retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        pushNow();
      }, 5000);
    }
  }
}

function schedulePush() {
  if (!uid || !firebase) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushNow();
  }, PUSH_DELAY_MS);
}

async function startCloud(user) {
  stopCloud();
  uid = user.uid;
  setState({ status: "syncing", user, error: "", message: "" });

  const cloud = await firebase.readCloud(uid);
  const remote = cloud?.workouts ?? {};
  const local = loadWorkoutRecords();
  const merged = mergeWorkoutRecords(local, remote);
  applyRemoteWorkoutRecords(merged);
  if (!sameRecords(merged, remote)) {
    await firebase.writeCloud(uid, merged);
  }

  cloudUnsubscribe = await firebase.watchCloud(uid, (remoteWorkouts) => {
    if (!uid) return;
    const localNow = loadWorkoutRecords();
    const next = mergeWorkoutRecords(localNow, remoteWorkouts);
    applyRemoteWorkoutRecords(next);
    // Se o aparelho tinha algo mais novo que a nuvem, envia de volta.
    if (!sameRecords(next, remoteWorkouts)) schedulePush();
  });

  setState({
    status: "signed-in",
    user,
    lastSyncAt: Date.now(),
    error: "",
  });
}

async function handleAuth(user) {
  if (!firebase) return;
  if (!user) {
    stopCloud();
    setState({ status: "signed-out", user: null, lastSyncAt: null, error: "" });
    return;
  }
  try {
    await startCloud(user);
  } catch (error) {
    setState({
      status: "error",
      user,
      error: "Não foi possível sincronizar agora. Seus dados continuam neste aparelho.",
    });
  }
}

export function initAccount() {
  if (started) return;
  started = true;

  window.addEventListener("workouts:changed", schedulePush);

  import("./firebase.js?v=5.8.5")
    .then((mod) => {
      firebase = mod;
      if (!mod.hasConfig()) {
        setState({ status: "unconfigured" });
        return;
      }
      return mod.observeAuth((user) => {
        handleAuth(user);
      });
    })
    .catch(() => {
      setState({
        status: "offline",
        error: "",
        message:
          "Sem conexão para carregar o login. Seus treinos continuam salvos neste aparelho.",
      });
    });
}

export async function signIn() {
  if (!firebase) initAccount();
  try {
    const mod = await import("./firebase.js?v=5.8.5");
    firebase = mod;
    await mod.signInWithGoogle();
  } catch (error) {
    setState({
      status: "signed-out",
      user: null,
      error: firebase ? firebase.describeAuthError(error) : "Falha ao entrar.",
    });
  }
}

export async function signOut() {
  if (!firebase) return;
  try {
    await firebase.signOutUser();
  } catch {
    stopCloud();
    setState({ status: "signed-out", user: null, error: "" });
  }
}
