import { renderAccount } from "./account.js?v=5.7.1";
import { renderDay } from "./day.js?v=5.7.1";
import { renderHome } from "./home.js?v=5.7.1";

export const routes = [
  {
    path: "/",
    label: "Início",
    title: "IronFox",
    render: renderHome,
  },
  {
    path: "/conta",
    label: "Conta",
    title: "Conta",
    render: renderAccount,
    hidden: true,
  },
  {
    path: "/dia",
    label: "Dia",
    title: "Grupo muscular",
    render: renderDay,
    hidden: true,
  },
];
