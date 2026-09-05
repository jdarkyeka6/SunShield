'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import SunCalc from 'suncalc';
import RouteMap from './RouteMap';

type Point = { lat: number; lon: number };
type SearchResult = Point & { name: string; shortName: string };
type Side = 'LEFT' | 'RIGHT' | 'EITHER';

type SunSnapshot = {
  azimuth: number;
  altitude: number;
  direction: string;
};

type Analysis = {
  seat: Side;
  left: number;
  right: number;
  advantage: number;
  durationMin: number;
  distanceKm: number;
  origin: string;
  destination: string;
  route: [number, number][];
  start: Point;
  end: Point;
  departureLabel: string;
  arrivalLabel: string;
  daylightMin: number;
  leftSunMin: number;
  rightSunMin: number;
  frontSunMin: number;
  backSunMin: number;
  sideSwitches: number;
  strongestSide: Side;
  strongestMinute: number;
  strongestAltitude: number;
  confidence: 'Balanced' | 'Fair' | 'Strong' | 'Very strong';
  startSun: SunSnapshot;
  endSun: SunSnapshot;
};

const rad = (n: number) => (n * Math.PI) / 180;
const deg = (n: number) => (n * 180) / Math.PI;
const norm180 = (n: number) => ((n + 540) % 360) - 180;
const round1 = (n: number) => Math.round(n * 10) / 10;

function bearing(a: Point, b: Point) {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

function compassDirection(azimuth: number) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(azimuth / 45) % 8];
}

function sunBearing(date: Date, p: Point): SunSnapshot {
  const pos = SunCalc.getPosition(date, p.lat, p.lon);
  const azimuth = (deg(pos.azimuth) + 180 + 360) % 360;
  const altitude = deg(pos.altitude);
  return {
    azimuth,
    altitude,
    direction: compassDirection(azimuth)
  };
}

function exposureFor(relative: number, altitude: number, seconds: number) {
  if (altitude <= 0) return 0;
  const sideFactor = Math.max(0, Math.sin(rad(Math.abs(relative))));
  const altitudeFactor = Math.max(0.15, Math.cos(rad(Math.min(85, altitude))));
  return seconds * sideFactor * altitudeFactor;
}

function timeLabel(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function confidenceFor(advantage: number, daylightMin: number): Analysis['confidence'] {
  if (daylightMin < 1 || advantage < 12) return 'Balanced';
  if (advantage < 25) return 'Fair';
  if (advantage < 45) return 'Strong';
  return 'Very strong';
}

function toSearchResult(item: any): SearchResult {
  const name = String(item.display_name ?? '');
  return {
    lat: Number(item.lat),
    lon: Number(item.lon),
    name,
    shortName: name.split(',').slice(0, 2).join(',').trim() || name
  };
}

async function searchPlaces(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  if (query.trim().length < 2) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=au&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal });
  if (!res.ok) throw new Error('Place search failed.');
  const items = await res.json();
  return Array.isArray(items) ? items.map(toSearchResult) : [];
}

async function geocode(query: string): Promise<SearchResult> {
  const items = await searchPlaces(query);
  if (!items.length) throw new Error(`Could not find “${query}”.`);
  return items[0];
}

async function reverseGeocode(point: Point): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lon}&zoom=16`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return 'Current location';
    const data = await res.json();
    return data?.display_name || 'Current location';
  } catch {
    return 'Current location';
  }
}

async function getRoute(start: Point, end: Point) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson&annotations=duration,distance`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not calculate a driving route.');
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No driving route found.');
  return data.routes[0];
}

function getCurrentLocation(): Promise<Point> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not supported on this device.'));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => reject(new Error('Location permission was not granted. Type a starting place instead.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}

function analyseRoute(route: any, origin: string, destination: string, start: Point, end: Point): Analysis {
  const coords: [number, number][] = route.geometry.coordinates;
  const durations: number[] = route.legs?.[0]?.annotation?.duration ?? [];
  const startTime = Date.now();
  const arrivalTime = startTime + route.duration * 1000;

  let elapsed = 0;
  let left = 0;
  let right = 0;
  let daylightSeconds = 0;
  let leftSunSeconds = 0;
  let rightSunSeconds = 0;
  let frontSunSeconds = 0;
  let backSunSeconds = 0;
  let sideSwitches = 0;
  let previousSide: 'LEFT' | 'RIGHT' | null = null;
  let strongestScore = 0;
  let strongestSide: Side = 'EITHER';
  let strongestMinute = 0;
  let strongestAltitude = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const a = { lon: coords[i][0], lat: coords[i][1] };
    const b = { lon: coords[i + 1][0], lat: coords[i + 1][1] };
    const seconds = durations[i] ?? route.duration / Math.max(1, coords.length - 1);
    const midpoint = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
    const when = new Date(startTime + (elapsed + seconds / 2) * 1000);
    const heading = bearing(a, b);
    const sun = sunBearing(when, midpoint);
    const relative = norm180(sun.azimuth - heading);
    const exposure = exposureFor(relative, sun.altitude, seconds);

    if (sun.altitude > 0) {
      daylightSeconds += seconds;

      if (Math.abs(relative) <= 35) {
        frontSunSeconds += seconds;
      } else if (Math.abs(relative) >= 145) {
        backSunSeconds += seconds;
      }

      const currentSide: 'LEFT' | 'RIGHT' = relative > 0 ? 'RIGHT' : 'LEFT';
      if (currentSide === 'RIGHT') {
        rightSunSeconds += seconds;
        right += exposure;
      } else {
        leftSunSeconds += seconds;
        left += exposure;
      }

      if (Math.abs(relative) >= 20 && Math.abs(relative) <= 160) {
        if (previousSide && previousSide !== currentSide) sideSwitches += 1;
        previousSide = currentSide;
      }

      const intensity = seconds > 0 ? exposure / seconds : 0;
      if (intensity > strongestScore) {
        strongestScore = intensity;
        strongestSide = currentSide;
        strongestMinute = Math.max(0, Math.round((elapsed + seconds / 2) / 60));
        strongestAltitude = Math.round(sun.altitude);
      }
    }

    elapsed += seconds;
  }

  const total = left + right;
  const difference = total ? Math.abs(left - right) / total : 0;
  const advantage = Math.round(difference * 100);
  const daylightMin = Math.round(daylightSeconds / 60);

  let seat: Side = 'EITHER';
  if (total > 1 && difference >= 0.12) seat = left < right ? 'LEFT' : 'RIGHT';

  return {
    seat,
    left,
    right,
    advantage,
    durationMin: Math.round(route.duration / 60),
    distanceKm: round1(route.distance / 1000),
    origin,
    destination,
    route: coords,
    start,
    end,
    departureLabel: timeLabel(new Date(startTime)),
    arrivalLabel: timeLabel(new Date(arrivalTime)),
    daylightMin,
    leftSunMin: Math.round(leftSunSeconds / 60),
    rightSunMin: Math.round(rightSunSeconds / 60),
    frontSunMin: Math.round(frontSunSeconds / 60),
    backSunMin: Math.round(backSunSeconds / 60),
    sideSwitches,
    strongestSide,
    strongestMinute,
    strongestAltitude,
    confidence: confidenceFor(advantage, daylightMin),
    startSun: sunBearing(new Date(startTime), start),
    endSun: sunBearing(new Date(arrivalTime), end)
  };
}

type PlaceInputProps = {
  label: string;
  value: string;
  placeholder: string;
  suggestions: SearchResult[];
  searching: boolean;
  onChange: (value: string) => void;
  onPick: (result: SearchResult) => void;
};

function PlaceInput({ label, value, placeholder, suggestions, searching, onChange, onPick }: PlaceInputProps) {
  const [focused, setFocused] = useState(false);
  const show = focused && value.trim().length >= 2;

  return (
    <div className="placeGroup">
      <label>{label}</label>
      <div className="inputWrap">
        <input
          className="field"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 140)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
        {searching && <span className="searchSpinner" aria-label="Searching" />}
        {show && suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((item, i) => (
              <button
                type="button"
                className="suggestion"
                key={`${item.lat}-${item.lon}-${i}`}
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  onPick(item);
                  setFocused(false);
                }}
              >
                <span className="pin">⌖</span>
                <span><b>{item.shortName}</b><small>{item.name}</small></span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function usePlaceSuggestions(value: string, selected: SearchResult | null) {
  const [items, setItems] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (selected || value.trim().length < 2) {
      setItems([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        setItems(await searchPlaces(value, controller.signal));
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) setItems([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 550);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, selected]);

  return { items, searching };
}

function sunStatus(snapshot: SunSnapshot) {
  if (snapshot.altitude <= 0) return `below the horizon toward ${snapshot.direction}`;
  return `${Math.round(snapshot.altitude)}° high toward ${snapshot.direction}`;
}

export default function Home() {
  const [originText, setOriginText] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [originPoint, setOriginPoint] = useState<SearchResult | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<SearchResult | null>(null);
  const [useCurrent, setUseCurrent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const originSearch = usePlaceSuggestions(originText, originPoint);
  const destinationSearch = usePlaceSuggestions(destinationText, destinationPoint);

  const percentages = useMemo(() => {
    if (!analysis) return { left: 50, right: 50 };
    const total = analysis.left + analysis.right;
    if (!total) return { left: 0, right: 0 };
    return {
      left: Math.round((analysis.left / total) * 100),
      right: Math.round((analysis.right / total) * 100)
    };
  }, [analysis]);

  const explanation = useMemo(() => {
    if (!analysis) return [];
    if (analysis.daylightMin < 1) {
      return [
        'The sun is below the horizon for essentially the whole drive, so neither side has a meaningful sun advantage.',
        'SunShield still checks every route segment, but there is not enough direct sunlight to prefer one seat.'
      ];
    }

    if (analysis.seat === 'EITHER') {
      return [
        `The weighted exposure is close: ${percentages.left}% left versus ${percentages.right}% right.`,
        analysis.sideSwitches > 0
          ? `The sunny side changes ${analysis.sideSwitches} ${analysis.sideSwitches === 1 ? 'time' : 'times'}, which helps the two sides balance out.`
          : 'Neither side keeps a large enough advantage across the whole route.',
        'SunShield only makes a left/right call when the difference is large enough to be useful.'
      ];
    }

    const sunnySide = analysis.seat === 'LEFT' ? 'right' : 'left';
    const sunnyPercent = analysis.seat === 'LEFT' ? percentages.right : percentages.left;
    const safePercent = analysis.seat === 'LEFT' ? percentages.left : percentages.right;

    return [
      `The ${sunnySide} side receives about ${sunnyPercent}% of the route's weighted side-window sun, versus ${safePercent}% on the recommended side.`,
      analysis.strongestSide !== 'EITHER'
        ? `The strongest side-window hit is around ${analysis.strongestMinute} min into the trip, on the ${analysis.strongestSide.toLowerCase()} side, with the sun about ${analysis.strongestAltitude}° above the horizon.`
        : 'There is no single strong side-window sun segment on this trip.',
      analysis.sideSwitches > 0
        ? `The sun changes sides ${analysis.sideSwitches} ${analysis.sideSwitches === 1 ? 'time' : 'times'}, but the ${sunnySide} side still comes out sunnier overall.`
        : `The route keeps the sun biased toward the ${sunnySide} side for most of the useful daylight segments.`
    ];
  }, [analysis, percentages]);

  const canSubmit = destinationText.trim().length > 0 && (useCurrent || originText.trim().length > 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      let start: Point;
      let originName: string;

      if (useCurrent) {
        start = await getCurrentLocation();
        originName = await reverseGeocode(start);
      } else {
        const found = originPoint ?? await geocode(originText);
        start = found;
        originName = found.name;
      }

      const endFound = destinationPoint ?? await geocode(destinationText);
      const end = { lat: endFound.lat, lon: endFound.lon };
      const route = await getRoute(start, end);
      setAnalysis(analyseRoute(route, originName, endFound.name, start, end));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function resetTrip() {
    setAnalysis(null);
    setError('');
  }

  return (
    <main>
      <section className="shell">
        <header>
          <div className="logoMark">☀️</div>
          <div>
            <h1>SunShield</h1>
            <p>Avoid the sunny side.</p>
          </div>
        </header>

        {!analysis ? (
          <div className="heroCard">
            <div className="eyebrow">ONE SEAT. WHOLE TRIP.</div>
            <h2>Where are you going?</h2>
            <p className="muted">SunShield follows the actual driving route and tracks where the sun will be as you move.</p>

            <form onSubmit={submit}>
              <PlaceInput
                label="FROM"
                value={useCurrent ? '' : originText}
                placeholder={useCurrent ? 'Using current location' : 'Suburb, address or place'}
                suggestions={originSearch.items}
                searching={originSearch.searching}
                onChange={value => {
                  setOriginText(value);
                  setOriginPoint(null);
                  setUseCurrent(false);
                }}
                onPick={result => {
                  setOriginPoint(result);
                  setOriginText(result.shortName);
                  setUseCurrent(false);
                }}
              />

              <button
                type="button"
                className={`locationChoice ${useCurrent ? 'active' : ''}`}
                onClick={() => {
                  setUseCurrent(!useCurrent);
                  setOriginPoint(null);
                  setError('');
                }}
              >
                <span>◎</span>
                <span><b>{useCurrent ? 'Current location selected' : 'Use current location'}</b><small>{useCurrent ? 'Tap to type a start instead' : 'Optional · asks for GPS only if selected'}</small></span>
                <i>{useCurrent ? '✓' : '›'}</i>
              </button>

              <PlaceInput
                label="TO"
                value={destinationText}
                placeholder="Fremantle, WA"
                suggestions={destinationSearch.items}
                searching={destinationSearch.searching}
                onChange={value => {
                  setDestinationText(value);
                  setDestinationPoint(null);
                }}
                onPick={result => {
                  setDestinationPoint(result);
                  setDestinationText(result.shortName);
                }}
              />

              <button className="primary" disabled={loading || !canSubmit}>
                {loading ? 'ANALYSING ROUTE…' : 'CHECK MY TRIP'}
              </button>
            </form>
            {error && <div className="error">{error}</div>}

            <div className="miniExplainer">
              <span>☀️</span>
              <p><b>What it checks</b><small>Road direction, sun direction, sun height and the time you reach each part of the route.</small></p>
            </div>
            <p className="privacyHint">SunShield does not require GPS. Type both locations if you prefer.</p>
          </div>
        ) : (
          <div className="resultCard">
            <button className="back" onClick={resetTrip}>← New trip</button>
            <div className="eyebrow">BEST SIDE FOR THIS TRIP</div>
            <div className={`seat ${analysis.seat.toLowerCase()}`}>
              <span>{analysis.seat === 'LEFT' ? '←' : analysis.seat === 'RIGHT' ? '→' : '↔'}</span>
              <strong>{analysis.seat === 'EITHER' ? 'EITHER SIDE' : `SIT ${analysis.seat}`}</strong>
            </div>
            <p className="reason">
              {analysis.daylightMin < 1
                ? 'The sun is below the horizon for essentially the whole trip.'
                : analysis.seat === 'EITHER'
                  ? 'Both sides are close enough that swapping seats is not worth it.'
                  : `${analysis.confidence} recommendation · ${analysis.advantage}% overall advantage for the ${analysis.seat.toLowerCase()} side.`}
            </p>

            <div className="stats three">
              <div><span>🚗</span><b>{analysis.durationMin} min</b><small>journey</small></div>
              <div><span>📏</span><b>{analysis.distanceKm} km</b><small>route</small></div>
              <div><span>☀️</span><b>{analysis.daylightMin} min</b><small>sun above horizon</small></div>
            </div>

            <section className="whyCard">
              <div className="sectionTitle">
                <div><span>WHY?</span><b>Why SunShield picked this</b></div>
                <i>{analysis.confidence}</i>
              </div>
              <div className="whyList">
                {explanation.map((item, i) => (
                  <p key={item}><span>{i + 1}</span>{item}</p>
                ))}
              </div>
            </section>

            <section className="sunBreakdown">
              <div className="sectionTitle">
                <div><span>SUN BREAKDOWN</span><b>What happens during the drive</b></div>
              </div>
              <div className="detailGrid">
                <div><span>←</span><b>{analysis.leftSunMin} min</b><small>sun on left side</small></div>
                <div><span>→</span><b>{analysis.rightSunMin} min</b><small>sun on right side</small></div>
                <div><span>↔</span><b>{analysis.sideSwitches}</b><small>side {analysis.sideSwitches === 1 ? 'change' : 'changes'}</small></div>
                <div><span>⬆</span><b>{analysis.frontSunMin} min</b><small>sun mostly ahead</small></div>
              </div>
            </section>

            <div className="mapSection">
              <div className="mapHeading"><b>Your route</b><span>Drag or zoom the map</span></div>
              <RouteMap route={analysis.route} start={analysis.start} end={analysis.end} />
            </div>

            <section className="exposureCard">
              <div className="sectionTitle">
                <div><span>WEIGHTED EXPOSURE</span><b>Which side gets more direct side-window sun?</b></div>
              </div>
              <div className="exposure">
                <div className="barRow"><span>LEFT</span><div className="bar"><i style={{ width: `${percentages.left}%` }} /></div><b>{percentages.left}%</b></div>
                <div className="barRow"><span>RIGHT</span><div className="bar"><i style={{ width: `${percentages.right}%` }} /></div><b>{percentages.right}%</b></div>
              </div>
              <p className="microCopy">This is not just minutes. SunShield weights each route segment by sun angle and height, so a low sun hitting a side window matters more than weak side exposure.</p>
            </section>

            <section className="sunPath">
              <div className="sectionTitle">
                <div><span>SUN POSITION</span><b>Departure to arrival</b></div>
              </div>
              <div className="timeline">
                <div>
                  <span className="timeDot">A</span>
                  <p><small>{analysis.departureLabel} · DEPART</small><b>Sun {sunStatus(analysis.startSun)}</b></p>
                </div>
                <div>
                  <span className="timeDot">B</span>
                  <p><small>{analysis.arrivalLabel} · ARRIVE</small><b>Sun {sunStatus(analysis.endSun)}</b></p>
                </div>
              </div>
            </section>

            <div className="tripPlaces">
              <p><span>A</span><small>FROM</small><b>{analysis.origin}</b></p>
              <p><span>B</span><small>TO</small><b>{analysis.destination}</b></p>
            </div>

            <details className="method">
              <summary>How does SunShield work?</summary>
              <div>
                <p>SunShield breaks the driving route into small segments. For each segment it estimates when you will reach it, calculates the vehicle heading, and calculates the sun's azimuth and altitude at that location and time.</p>
                <p>It then works out whether the sun is to the left or right of the car and weights the segment by how directly the sun hits a side window. The whole route is combined into one recommendation.</p>
                <p><b>Reality check:</b> buildings, trees, clouds, tunnels, window tint and the exact road lane are not modelled yet. This predicts sun direction, not UV dose or medical sun safety.</p>
              </div>
            </details>

            <p className="note">One recommendation for the whole route. No mid-trip seat swapping.</p>
          </div>
        )}

        <footer>SunShield V0.3 · Route + time + sun-angle analysis.</footer>
      </section>
    </main>
  );
}
