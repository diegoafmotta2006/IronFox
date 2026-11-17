import { renderDay } from "./day.js?v=5.6.1";
import { renderHome } from "./home.js?v=5.6.1";

export const routes = [
  {
    path: "/",
    label: "Início",
    title: "IronFox",
    render: renderHome,
  },
  {
    path: "/dia",
    label: "Dia",
    title: "Grupo muscular",
    render: renderDay,
    hidden: true,
  },
];
