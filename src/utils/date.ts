const locale = "id-ID";

export const formatTime = (date: Date) => {
  if (isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export const formatDate = (date: Date) => {
  if (isNaN(date.getTime())) return "Tanggal tidak valid";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};
