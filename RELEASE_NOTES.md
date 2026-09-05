# Sun Shield 1.0

Release candidate for the first App Store version.

## What is in 1.0

- Current-location GPS is optional; users can type both endpoints instead.
- Australian place search and autocomplete.
- Real driving-route calculation.
- Interactive route map.
- Per-segment road heading and predicted sun azimuth/altitude.
- Whole-trip weighted left/right sun exposure analysis.
- **SIT LEFT**, **SIT RIGHT**, or **EITHER SIDE** recommendation.
- Explanation of why a side was chosen, including side changes and strongest exposure point.
- Journey time, distance, daylight time, sun-position timeline, and exposure breakdown.
- Privacy policy and support pages for the App Store release.
- iPhone safe-area polish and release metadata aligned to version 1.0.

## Known limitations

Sun Shield predicts sun direction and likely direct side-window exposure. It does not model buildings, trees, clouds, tunnels, window tint, vehicle geometry, or exact lane position.

The current route and geocoding implementation uses OpenStreetMap Nominatim and the public OSRM routing service. Before meaningful production scale, these should be replaced with a production-grade provider or infrastructure with suitable reliability and usage limits.
