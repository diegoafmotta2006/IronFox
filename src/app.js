import { el } from "./dom.js?v=5.8.6";
import { dateKey } from "./lib/dates.js?v=5.8.6";
import { initAccount } from "./lib/sync.js?v=5.8.6";
import { routes } from "./screens/index.js?v=5.8.6";

const app = document.getElementById("app");
const tabbar = buildTabbar();
let renderedDay = null;

function buildTabbar() {
  const visible = routes.filter((route) => !route.hidden);
  if (visible.length < 2) return null;
  const bar = el("nav", "tabbar");
  for (const route of visible) {
    const link = el("a", "tab", route.label);
    link.href = `#${route.path}`;
    link.dataset.path = route.path;
    bar.append(link);
  }
  return bar;
}

function resolveRoute() {
  const path = window.location.hash.replace(/^#/, "").split("?")[0] || "/";
  let match = null;
  for (const route of routes) {
    if (path === route.path || path.startsWith(`${route.path}/`)) {
      if (!match || route.path.length > match.path.length) match = route;
    }
  }
  const route = match ?? routes[0];
  const param = path.slice(route.path.length).replace(/^\//, "");
  return { route, param };
}

function updateTabs(activePath) {
  if (!tabbar) return;
  for (const link of tabbar.querySelectorAll(".tab")) {
    if (link.dataset.path === activePath) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }
}

function render() {
  const { route, param } = resolveRoute();
  document.title = route.title ?? "IronFox";

  const fragment = document.createDocumentFragment();
  fragment.append(route.render(param));
  if (tabbar) fragment.append(tabbar);
  app.replaceChildren(fragment);

  updateTabs(route.path);
  renderedDay = dateKey(new Date());
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && dateKey(new Date()) !== renderedDay) render();
});

render();

// Dados que chegam da nuvem atualizam a tela, menos no meio de uma edição.
window.addEventListener("workouts:remote", () => {
  if (!window.location.hash.startsWith("#/dia")) render();
});

// O SDK do Firebase só é baixado quando o app está livre (ou após alguns segundos).
if ("requestIdleCallback" in window) {
  window.requestIdleCallback(() => initAccount(), { timeout: 4000 });
} else {
  setTimeout(() => initAccount(), 1500);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {});
  });

  // Quando uma versão nova assume o controle, recarrega uma única vez para
  // a tela sair do HTML/JS antigos. Na primeira instalação (sem controlador
  // anterior) não recarrega: não há nada velho para trocar.
  const RELOAD_KEY = "ironfox.reload-at";
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !hadController) return;
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 10000) return;
    reloading = true;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    window.location.reload();
  });
}
