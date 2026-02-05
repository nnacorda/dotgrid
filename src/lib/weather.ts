// Moon Phase Calculation

export type MoonPhaseData = {
  index: number; // 0-7
  name: string;
};

const MOON_PHASE_NAMES = [
  "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
  "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent",
];

export function getMoonPhase(date: Date): MoonPhaseData {
  // Reference: known new moon on January 6, 2000 at 18:14 UTC
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const synodicMonth = 29.53058770576;
  const daysSinceNew = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
  const normalizedPhase = ((daysSinceNew % synodicMonth) + synodicMonth) % synodicMonth;
  const phaseIndex = Math.round((normalizedPhase / synodicMonth) * 8) % 8;
  return { index: phaseIndex, name: MOON_PHASE_NAMES[phaseIndex] };
}

// Weather Types

export type WeatherData = {
  temp: number;
  weatherCode: number;
  fetchedAt: string;
};

export type GeoLocation = {
  lat: number;
  lon: number;
  city?: string;
  fetchedAt: string;
};

// Cache helpers

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getCachedLocation(): GeoLocation | null {
  return getItem<GeoLocation | null>("weather-location", null);
}

export function getCachedWeather(date: string): WeatherData | null {
  return getItem<WeatherData | null>(`weather-${date}`, null);
}

// Fetch IP-based geolocation
export async function fetchLocation(): Promise<GeoLocation | null> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) return null;
    const data = await res.json();
    const loc: GeoLocation = {
      lat: data.latitude,
      lon: data.longitude,
      city: data.city,
      fetchedAt: new Date().toISOString(),
    };
    setItem("weather-location", loc);
    return loc;
  } catch {
    return null;
  }
}

// Fetch weather from Open-Meteo (free, no API key)
export async function fetchWeather(
  lat: number,
  lon: number,
  date: string
): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto&forecast_days=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const weather: WeatherData = {
      temp: Math.round(data.current.temperature_2m),
      weatherCode: data.current.weather_code,
      fetchedAt: new Date().toISOString(),
    };
    setItem(`weather-${date}`, weather);
    return weather;
  } catch {
    return null;
  }
}

// WMO weather code → description
export function getWeatherDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "";
}
