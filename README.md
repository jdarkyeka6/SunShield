# SunShield ☀️🚗

SunShield recommends which side of the car to sit on for an **entire trip**, based on the route and the predicted position of the sun.

## V0.1

- Current-location GPS
- Destination search
- Real driving route calculation
- Per-segment vehicle heading
- Sun azimuth + altitude prediction at the time each segment is reached
- Weighted left/right exposure score
- One whole-trip recommendation: **SIT LEFT**, **SIT RIGHT**, or **EITHER SIDE**
- Mobile-first UI

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Deploy

Import this GitHub repository into Vercel. No environment variables are required for V0.1.

## Prototype services

V0.1 uses OpenStreetMap Nominatim for destination geocoding and the public OSRM routing service for route calculation. These are suitable for early testing; a production release should move to a dedicated routing/geocoding provider with appropriate usage limits and reliability guarantees.
