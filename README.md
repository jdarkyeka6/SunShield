# SunShield ☀️🚗

SunShield recommends which side of the car to sit on for an **entire trip**, based on the driving route and the predicted position of the sun. The main use case is reducing direct sunlight and screen glare while travelling.

## V1.0

- Optional current-location GPS
- Australian destination search and autocomplete
- Real driving route calculation
- Interactive route map
- Per-segment vehicle heading
- Sun azimuth + altitude prediction at the time each segment is reached
- Weighted left/right side-window exposure score
- Whole-trip recommendation: **SIT LEFT**, **SIT RIGHT**, or **EITHER SIDE**
- Explanation of why a side was chosen
- Journey, daylight, side-change and sun-position breakdowns
- Mobile-first UI with iPhone safe-area handling
- Public privacy policy and support pages for App Store submission

See [RELEASE_NOTES.md](./RELEASE_NOTES.md) for the 1.0 release summary.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Web deployment

The app is compatible with static hosting. No environment variables are currently required.

Public pages include:

- `/privacy/`
- `/support/`

## iOS / App Store

Sun Shield is configured as a Capacitor iOS app using bundle ID:

```text
com.jake.sunshield
```

The web app is statically exported and bundled inside the iOS app rather than simply opening a hosted website.

The native project is located at:

```text
ios/App/App.xcodeproj
```

The iOS marketing version is **1.0**. The TestFlight lane increments the build number before upload.

For future web changes, run:

```bash
npm run ios:sync
```

## Map and routing services

Sun Shield currently uses OpenStreetMap Nominatim for place search and the public OSRM routing service for route calculation. This is workable for testing and a small initial release, but meaningful production scale should move to a provider or infrastructure with appropriate reliability and usage limits.

## Privacy

Sun Shield does not create user accounts or store location history. See [PRIVACY.md](./PRIVACY.md) for the full policy.
