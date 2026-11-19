import { APP_VERSION } from "../config.js?v=5.8.6";
import { el } from "../dom.js?v=5.8.6";
import {
  getAccountState,
  signIn,
  signOut,
} from "../lib/sync.js?v=5.8.6";

const timeFormat = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

function buildHeader() {
  const header = el("header", "page-head");
  const back = el("a", "page-head__back", "Voltar");
  back.href = "#/";
  header.append(
    back,
    el("p", "page-head__eyebrow", `IronFox · v${APP_VERSION}`),
    el("h1", "page-head__title", "Conta"),
  );
  return header;
}

function buildUser(user) {
  const row = el("div", "account__user");

  if (user.photoURL) {
    const avatar = el("img", "account__avatar");
    avatar.src = user.photoURL;
    avatar.alt = "";
    avatar.referrerPolicy = "no-referrer";
    avatar.width = 44;
    avatar.height = 44;
    row.append(avatar);
  } else {
    const initials = (user.displayName || user.email || "?")
      .trim()
      .slice(0, 1)
      .toUpperCase();
    row.append(el("span", "account__avatar account__avatar--text", initials));
  }

  const info = el("div", "account__identity");
  info.append(
    el("span", "account__name", user.displayName || "Conta Google"),
    el("span", "account__email", user.email || ""),
  );
  row.append(info);
  return row;
}

function buildStatus(state) {
  const box = el("div", "account__status");
  if (state.status === "syncing" || state.status === "loading") {
    box.append(el("p", "account__hint", "Sincronizando…"));
    return box;
  }
  if (state.status === "signed-in") {
    const dot = el("span", "account__dot");
    dot.setAttribute("aria-hidden", "true");
    const text =
      state.lastSyncAt != null
        ? `Sincronizado às ${timeFormat.format(new Date(state.lastSyncAt))}`
        : "Sincronização ativa";
    const line = el("p", "account__hint account__hint--ok");
    line.append(dot, el("span", null, text));
    box.append(line);
  }
  if (state.error) box.append(el("p", "account__error", state.error));
  if (state.message) box.append(el("p", "account__hint", state.message));
  return box;
}

export function renderAccount() {
  const screen = el("div", "screen");
  const body = el("div", "account");

  const unsubscribe = () => {
    window.removeEventListener("account:changed", onAccountChanged);
  };

  function onAccountChanged() {
    if (!screen.isConnected) {
      unsubscribe();
      return;
    }
    paint();
  }

  function paint() {
    const state = getAccountState();
    body.replaceChildren();

    if (state.status === "signed-in" || state.status === "syncing" || (state.user && state.status === "error")) {
      if (state.user) body.append(buildUser(state.user));
    }

    if (state.status === "loading") {
      body.append(el("p", "account__hint", "Verificando conta…"));
      return;
    }

    if (state.status === "unconfigured") {
      body.append(
        el(
          "p",
          "account__hint",
          "A conta ainda não foi configurada. Cole a configuração do Firebase em src/lib/firebase.js.",
        ),
      );
      return;
    }

    if (state.status === "offline") {
      body.append(buildStatus(state));
      const retry = el("button", "log__save", "Tentar de novo");
      retry.type = "button";
      retry.addEventListener("click", () => {
        window.location.reload();
      });
      body.append(retry);
      body.append(
        el(
          "p",
          "account__note",
          "Sem internet agora. Tudo o que você registrar continua salvo neste aparelho.",
        ),
      );
      return;
    }

    if (state.user) {
      body.append(buildStatus(state));
      const leave = el("button", "account__secondary", "Sair da conta");
      leave.type = "button";
      leave.addEventListener("click", () => {
        signOut();
      });
      body.append(leave);
      body.append(
        el(
          "p",
          "account__note",
          "Seus treinos ficam salvos neste aparelho e também na sua conta Google. Ao entrar em outro aparelho com a mesma conta, eles aparecem automaticamente.",
        ),
      );
      return;
    }

    body.append(buildStatus(state));
    body.append(
      el(
        "p",
        "account__note",
        "Entre com sua conta Google para manter seus treinos sincronizados entre aparelhos. Nenhuma senha é pedida ao app.",
      ),
    );

    const google = el("button", "log__save account__google", "Entrar com Google");
    google.type = "button";
    google.addEventListener("click", async () => {
      google.disabled = true;
      google.textContent = "Abrindo Google…";
      await signIn();
      google.disabled = false;
      google.textContent = "Entrar com Google";
    });
    body.append(google);

    body.append(
      el(
        "p",
        "account__note",
        "Sem entrar, tudo continua funcionando normalmente: os treinos ficam apenas neste aparelho.",
      ),
    );
  }

  window.addEventListener("account:changed", onAccountChanged);
  screen.append(buildHeader(), body);
  paint();
  return screen;
}
