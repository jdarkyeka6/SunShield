'use client';

import { FormEvent, useMemo, useState } from 'react';
import SunCalc from 'suncalc';

type Point = { lat: number; lon: number };
type SearchResult = Point & { name: string };
type Analysis = {
  seat: 'LEFT' | 'RIGHT' | 'EITHER';
  left: number;
  right: number;
  advantage: number;
  durationMin: number;
  distanceKm: number;
  destination: string;
};

const rad = (n: number) => (n * Math.PI) / 180;
const deg = (n: number) => (n * 180) / Math.PI;
const norm180 = (n: number) => ((n + 540) % 360) - 180;

function bearing(a: Point, b: Point) {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

function sunBearing(date: Date, p: Point) {
  const pos = SunCalc.getPosition(date, p.lat, p.lon);
  return {
    azimuth: (deg(pos.azimuth) + 180 + 360) % 360,
    altitude: deg(pos.altitude)
  };
}

function exposureFor(relative: number, altitude: number, seconds: number) {
  if (altitude <= 0) return 0;
  const sideFactor = Math.max(0, Math.sin(rad(Math.abs(relative))));
  const altitudeFactor = Math.max(0.15, Math.cos(rad(Math.min(85, altitude))));
  return seconds * sideFactor * altitudeFactor;
}

async function geocode(query: string): Promise<SearchResult> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Destination search failed.');
  const items = await res.json();
  if (!items?.length) throw new Error('Could not find that destination.');
  return { lat: Number(items[0].lat), lon: Number(items[0].lon), name: items[0].display_name };
}

async function getRoute(start: Point, end: Point) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson&annotations=duration,distance`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not calculate a driving route.');
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No driving route found.');
  return data.routes[0];
}

function analyseRoute(route: any, destination: string): Analysis {
  const coords: [number, number][] = route.geometry.coordinates;
  const durations: number[] = route.legs?.[0]?.annotation?.duration ?? [];
  const startTime = Date.now();
  let elapsed = 0;
  let left = 0;
  let right = 0;

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

    if (relative > 0) right += exposure;
    else if (relative < 0) left += exposure;

    elapsed += seconds;
  }

  const total = left + right;
  const difference = total ? Math.abs(left - right) / total : 0;
  let seat: Analysis['seat'] = 'EITHER';
  if (total > 1 && difference >= 0.12) seat = left < right ? 'LEFT' : 'RIGHT';

  return {
    seat,
    left,
    right,
    advantage: Math.round(difference * 100),
    durationMin: Math.round(route.duration / 60),
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    destination
  };
}

export default function Home() {
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const percentages = useMemo(() => {
    if (!analysis) return { left: 50, right: 50 };
    const total = analysis.left + analysis.right;
    if (!total) return { left: 0, right: 0 };
    return {
      left: Math.round((analysis.left / total) * 100),
      right: Math.round((analysis.right / total) * 100)
    };
  }, [analysis]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!destination.trim()) return;
    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const start = await new Promise<Point>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Location is not supported on this device.'));
        navigator.geolocation.getCurrentPosition(
          p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
          () => reject(new Error('SunShield needs your location to analyse the trip.')),
          { enableHighAccuracy: true, timeout: 12000 }
        );
      });
      const end = await geocode(destination);
      const route = await getRoute(start, end);
      setAnalysis(analyseRoute(route, end.name));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
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
            <p className="muted">SunShield checks the sun across your entire route before you leave.</p>

            <form onSubmit={submit}>
              <label>FROM</label>
              <div className="field static">📍 Current location</div>
              <label>TO</label>
              <input
                className="field"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Fremantle, WA"
                autoComplete="off"
              />
              <button disabled={loading || !destination.trim()}>
                {loading ? 'ANALYSING ROUTE…' : 'CHECK MY TRIP'}
              </button>
            </form>
            {error && <div className="error">{error}</div>}
          </div>
        ) : (
          <div className="resultCard">
            <button className="back" onClick={() => setAnalysis(null)}>← New trip</button>
            <div className="eyebrow">BEST SIDE FOR THIS TRIP</div>
            <div className={`seat ${analysis.seat.toLowerCase()}`}>
              <span>{analysis.seat === 'LEFT' ? '←' : analysis.seat === 'RIGHT' ? '→' : '↔'}</span>
              <strong>{analysis.seat === 'EITHER' ? 'EITHER SIDE' : `SIT ${analysis.seat}`}</strong>
            </div>
            <p className="reason">
              {analysis.seat === 'EITHER'
                ? 'Sun exposure is too similar to make one side worth choosing.'
                : `${analysis.advantage}% stronger overall recommendation for the ${analysis.seat.toLowerCase()} side.`}
            </p>

            <div className="stats">
              <div><span>🚗</span><b>{analysis.durationMin} min</b><small>journey</small></div>
              <div><span>📏</span><b>{analysis.distanceKm} km</b><small>route</small></div>
            </div>

            <div className="exposure">
              <div className="barRow"><span>LEFT</span><div className="bar"><i style={{ width: `${percentages.left}%` }} /></div><b>{percentages.left}%</b></div>
              <div className="barRow"><span>RIGHT</span><div className="bar"><i style={{ width: `${percentages.right}%` }} /></div><b>{percentages.right}%</b></div>
            </div>

            <p className="destination">To: {analysis.destination}</p>
            <p className="note">Recommendation is calculated once for the whole route. SunShield will never tell you to swap seats mid-trip.</p>
          </div>
        )}

        <footer>SunShield V0.1 · Route + sun analysis runs when you ask for it.</footer>
      </section>
    </main>
  );
}