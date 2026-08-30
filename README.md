# SunShield ☀️🚗

SunShield recommends which side of the car to sit on for an **entire trip**, based on the route and the predicted position of the sun.

## V0.2

- Current-location GPS
- Destination search and autocomplete
- Real driving route calculation
- Interactive route map
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

## Web deployment

Import this repository into Vercel. No environment variables are required for V0.2.

## iOS / App Store

The `ios-app` branch is configured as a real Capacitor iOS app using bundle ID:

```text
com.jake.sunshield
```

The web app is statically exported and bundled inside the iOS app rather than simply opening the Vercel site.

A GitHub Actions workflow on this branch installs dependencies, builds the static app, generates the native Xcode project, adds the iOS location permission text, applies Sun Shield app artwork, and commits the generated `ios/` project back to the branch.

After the workflow finishes, the native project is at:

```text
ios/App/App.xcodeproj
```

For future web changes, run:

```bash
npm run ios:sync
```

or let the branch workflow regenerate the iOS project.

## Prototype services

V0.2 uses OpenStreetMap Nominatim for destination geocoding and the public OSRM routing service for route calculation. These are suitable for early testing; a production release should move to a dedicated routing/geocoding provider with appropriate usage limits and reliability guarantees.
