export const getWeatherDescription = (code: number): { label: string; icon: string } => {
  const weatherMap: Record<number, { label: string; icon: string }> = {
    0: { label: "Cerah", icon: "sunny" },
    1: { label: "Cerah Berawan", icon: "partly_cloudy_day" },
    2: { label: "Berawan", icon: "cloud" },
    3: { label: "Mendung", icon: "cloud" },
    45: { label: "Berkabut", icon: "foggy" },
    48: { label: "Kabut Es", icon: "foggy" },
    51: { label: "Gerimis Ringan", icon: "rainy" },
    53: { label: "Gerimis", icon: "rainy" },
    55: { label: "Gerimis Lebat", icon: "rainy" },
    61: { label: "Hujan Ringan", icon: "rainy" },
    63: { label: "Hujan", icon: "rainy" },
    65: { label: "Hujan Lebat", icon: "rainy" },
    71: { label: "Salju Ringan", icon: "weather_snow" },
    73: { label: "Salju", icon: "weather_snow" },
    75: { label: "Salju Lebat", icon: "weather_snow" },
    80: { label: "Hujan Lokal", icon: "rainy" },
    81: { label: "Hujan Lokal", icon: "rainy" },
    82: { label: "Hujan Lokal Lebat", icon: "rainy" },
    95: { label: "Badai Petir", icon: "thunderstorm" },
    96: { label: "Badai Petir & Hujan Es", icon: "thunderstorm" },
    99: { label: "Badai Petir & Hujan Es", icon: "thunderstorm" },
  };

  return weatherMap[code] || { label: "Tidak Diketahui", icon: "question_mark" };
};
