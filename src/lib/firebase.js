// Configuração pública do Firebase (apiKey não é senha; pode ficar no app).
const firebaseConfig = {
  apiKey: "AIzaSyC7hqzDS7UsB-fTpL4Jq783NZW6dXX1MDo",
  authDomain: "iroxfox-f3b91.firebaseapp.com",
  projectId: "iroxfox-f3b91",
  storageBucket: "iroxfox-f3b91.firebasestorage.app",
  messagingSenderId: "112973822863",
  appId: "1:112973822863:web:bfc6fb7dbff056be8669fa",
};

// O SDK é carregado do CDN oficial só quando a conta é usada.
const SDK_VERSION = "10.14.1";
const SDK_BASE = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

let sdkPromise = null;

export function hasConfig() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function getProjectId() {
  return firebaseConfig.projectId;
}

export function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      const [appMod, authMod, dbMod] = await Promise.all([
        import(`${SDK_BASE}/firebase-app.js`),
        import(`${SDK_BASE}/firebase-auth.js`),
        import(`${SDK_BASE}/firebase-firestore.js`),
      ]);

      const app = appMod.getApps().length
        ? appMod.getApp()
        : appMod.initializeApp(firebaseConfig);
      const auth = authMod.getAuth(app);

      let db;
      try {
        db = dbMod.initializeFirestore(app, {
          localCache: dbMod.persistentLocalCache({
            tabManager: dbMod.persistentSingleTabManager({}),
          }),
        });
      } catch {
        db = dbMod.getFirestore(app);
      }

      // Fecha o ciclo de um login por redirecionamento, se houver.
      authMod.getRedirectResult(auth).catch(() => {});

      return { authMod, dbMod, app, auth, db };
    })().catch((error) => {
      sdkPromise = null;
      throw error;
    });
  }
  return sdkPromise;
}

export async function observeAuth(callback) {
  const { authMod, auth } = await loadSdk();
  return authMod.onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  const { authMod, auth } = await loadSdk();
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    return await authMod.signInWithPopup(auth, provider);
  } catch (error) {
    const code = error?.code ?? "";
    if (
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment" ||
      code === "auth/web-storage-unsupported"
    ) {
      await authMod.signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export async function signOutUser() {
  const { authMod, auth } = await loadSdk();
  await authMod.signOut(auth);
}

export async function readCloud(uid) {
  const { dbMod, db } = await loadSdk();
  const snapshot = await dbMod.getDoc(dbMod.doc(db, "users", uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function writeCloud(uid, workouts) {
  const { dbMod, db } = await loadSdk();
  await dbMod.setDoc(dbMod.doc(db, "users", uid), {
    workouts,
    savedAt: Date.now(),
  });
}

export function watchCloud(uid, onChange) {
  return loadSdk().then(({ dbMod, db }) =>
    dbMod.onSnapshot(
      dbMod.doc(db, "users", uid),
      (snapshot) => {
        onChange(snapshot.exists() ? snapshot.data()?.workouts ?? {} : {});
      },
      () => {},
    ),
  );
}

export function describeAuthError(error) {
  const code = error?.code ?? "";
  const messages = {
    "auth/unauthorized-domain":
      "Este endereço não está autorizado no Firebase. Adicione o domínio em Authentication > Settings > Authorized domains.",
    "auth/operation-not-allowed":
      "O login com Google não está ativado. Ative em Authentication > Sign-in method.",
    "auth/popup-closed-by-user": "Login cancelado.",
    "auth/cancelled-popup-request": "Login cancelado.",
    "auth/popup-blocked":
      "O navegador bloqueou a janela de login. Permita pop-ups e tente de novo.",
    "auth/network-request-failed":
      "Sem conexão com o Firebase. Verifique a internet e tente de novo.",
    "auth/internal-error": "Falha ao falar com o Firebase. Tente de novo.",
    "auth/account-exists-with-different-credential":
      "Já existe uma conta com este e-mail usando outro método de login.",
  };
  if (messages[code]) return messages[code];
  if (error?.message) return error.message;
  return "Não foi possível concluir a operação.";
}
