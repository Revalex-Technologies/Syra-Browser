import isPropValid from '@emotion/is-prop-valid';
import { StyleSheetManager } from 'styled-components';
import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { WeatherWrap, ForecastPanel } from './style';

type Current = {
  temperature: number;
  windspeed?: number;
  weathercode?: number;
};

type Daily = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weathercode: number[];
};

type LocationInfo = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
};

function isUSLocale(): boolean {
  try {
    const lang = navigator.language || '';
    return (
      /(^en-US|\bUS\b)/i.test(lang) ||
      (Intl.DateTimeFormat().resolvedOptions().timeZone || '').includes(
        'America/',
      )
    );
  } catch {
    return false;
  }
}

function codeToEmoji(code?: number) {
  if (code === undefined) return '❓';
  if (code === 0) return '☀️';
  if ([1, 2].includes(code)) return '🌤️';
  if (code === 3) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '☁️';
}

async function getWeather(lat: number, lon: number, fahrenheit: boolean) {
  const unit = fahrenheit ? 'fahrenheit' : 'celsius';
  const windUnit = fahrenheit ? 'mph' : 'kmh';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=${unit}&windspeed_unit=${windUnit}&timezone=auto&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function searchCity(q: string): Promise<LocationInfo[]> {
  if (!q) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=5&name=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
  }));
}

const STORAGE_KEY = 'weather.location.v1';

export const Weather = observer(() => {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [current, setCurrent] = React.useState<Current | null>(null);
  const [daily, setDaily] = React.useState<Daily | null>(null);
  const [open, setOpen] = React.useState<boolean>(false);
  const [loc, setLoc] = React.useState<LocationInfo | null>(null);
  const [query, setQuery] = React.useState<string>('');
  const [results, setResults] = React.useState<LocationInfo[]>([]);
  const [fahrenheit, setFahrenheit] = React.useState<boolean>(isUSLocale());

  const persistLoc = (l: LocationInfo): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(l));
    } catch {}
  };
  const loadStored = (): LocationInfo | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };

  const loadWeather = React.useCallback(
    (l: LocationInfo): void => {
      setLoading(true);
      setError(null);
      setLoc(l);
      persistLoc(l);
      getWeather(l.latitude, l.longitude, fahrenheit)
        .then((data) => {
          setCurrent(data.current_weather);
          setDaily(data.daily);
          setLoading(false);
        })
        .catch((e: any) => {
          setError(String(e));
          setLoading(false);
        });
    },
    [fahrenheit],
  );

  // Initial location: stored -> geolocation -> fallback (no cleanup return).
  React.useEffect(() => {
    const stored = loadStored();
    if (stored) {
      loadWeather(stored);
      return;
    }
    const fallback = () =>
      loadWeather({
        name: 'New York, US',
        latitude: 40.7128,
        longitude: -74.006,
      });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          loadWeather({
            name: 'My Location',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => fallback(),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      );
    } else {
      fallback();
    }
  }, [loadWeather]);

  // Re-fetch when units toggle
  React.useEffect(() => {
    if (loc) loadWeather(loc);
  }, [fahrenheit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced city search, always returns cleanup.
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      searchCity(query)
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const useMyLocation = (): void => {
    setError(null);
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        loadWeather({
          name: 'My Location',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (e: any) => setError(e.message || 'Location unavailable'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  };

  const toggle = (): void => setOpen((v) => !v);

  if (error) {
    return (
      <WeatherWrap
        aria-label="Weather error"
        title={error}
        onClick={toggle}
        data-clickable
      >
        ⚠️ Weather • Click to open
        <button
          className="retry"
          onClick={(e: any) => {
            e.stopPropagation();
            setError(null);
            useMyLocation();
          }}
        >
          Use My Location
        </button>
      </WeatherWrap>
    );
  }
  if (loading || !current) {
    return (
      <WeatherWrap aria-label="Loading weather" onClick={toggle} data-clickable>
        ⏳ Loading…
      </WeatherWrap>
    );
  }

  return (
    <>
      <WeatherWrap
        aria-expanded={open}
        aria-label="Current weather, click to show forecast"
        onClick={toggle}
        data-clickable
        title={loc ? `Weather for ${loc.name}` : 'Weather'}
      >
        <span className="emoji">{codeToEmoji(current.weathercode)}</span>
        <span className="temp">{Math.round(current.temperature)}°</span>
        <span className="caret">{open ? '▴' : '▾'}</span>
      </WeatherWrap>
      {open && daily && (
        <ForecastPanel role="dialog" aria-label="7 day forecast">
          <div className="controls">
            <div className="loc">{loc ? loc.name : 'Unknown location'}</div>
            <button onClick={useMyLocation} className="small">
              Use My Location
            </button>
            <label className="toggle">
              <input
                type="checkbox"
                checked={fahrenheit}
                onChange={(e: any) => setFahrenheit(e.target.checked)}
              />
              <span>{fahrenheit ? '°F' : '°C'}</span>
            </label>
          </div>

          <div className="search">
            <input
              type="text"
              placeholder="Search city..."
              value={query}
              onChange={(e: any) => setQuery(e.target.value)}
            />
            {results.length > 0 && (
              <div className="results">
                {results.map((r) => (
                  <div
                    key={`${r.latitude},${r.longitude}`}
                    className="result"
                    onClick={() => {
                      setQuery('');
                      setResults([]);
                      loadWeather(r);
                    }}
                  >
                    {r.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {daily.time.slice(0, 7).map((d, i) => (
            <div className="row" key={d}>
              <div className="day">
                {new Date(d).toLocaleDateString(undefined, {
                  weekday: 'short',
                })}
              </div>
              <div className="icon">{codeToEmoji(daily.weathercode[i])}</div>
              <div className="temps">
                <span className="max">
                  {Math.round(daily.temperature_2m_max[i])}°
                </span>
                <span className="min">
                  {Math.round(daily.temperature_2m_min[i])}°
                </span>
              </div>
            </div>
          ))}
        </ForecastPanel>
      )}
    </>
  );
});
