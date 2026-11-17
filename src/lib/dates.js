const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MONTHS_LOWER = MONTHS.map((month) => month.toLowerCase());

export const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function pad(value) {
  return String(value).padStart(2, "0");
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatBR(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function monthName(date) {
  return MONTHS[date.getMonth()];
}

export function monthNameLower(date) {
  return MONTHS_LOWER[date.getMonth()];
}

export function monthTitle(date) {
  return `${monthName(date)} ${date.getFullYear()}`;
}

export function monthDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const total = new Date(year, month + 1, 0).getDate();
  const offset = new Date(year, month, 1).getDay();
  const days = [];
  for (let index = 0; index < offset; index += 1) days.push(null);
  for (let day = 1; day <= total; day += 1) days.push(new Date(year, month, day));
  return days;
}
