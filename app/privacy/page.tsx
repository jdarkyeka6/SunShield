export const metadata = {
  title: 'Privacy Policy | Sun Shield',
  description: 'Privacy Policy for the Sun Shield app.'
};

export default function PrivacyPolicyPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#fffdf7',
      color: '#1f2937',
      padding: '48px 20px'
    }}>
      <article style={{
        width: '100%',
        maxWidth: 760,
        margin: '0 auto',
        background: '#ffffff',
        border: '1px solid #f1e7c8',
        borderRadius: 24,
        padding: '36px',
        boxShadow: '0 16px 50px rgba(0,0,0,0.06)',
        lineHeight: 1.65
      }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>☀️</div>
        <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.1 }}>Sun Shield Privacy Policy</h1>
        <p style={{ color: '#6b7280', marginTop: 10 }}>Last updated: 5 September 2026</p>

        <p>
          Sun Shield is designed to help users understand where the sun will be relative to a driving route. We aim to keep the app simple and privacy-friendly.
        </p>

        <h2>Data we collect</h2>
        <p>
          Sun Shield does not create user accounts and does not collect or store personal information on Sun Shield servers. We do not use advertising trackers, analytics SDKs, or sell personal information.
        </p>

        <h2>Location</h2>
        <p>
          If you choose to use your current location, Sun Shield accesses your device location only to provide app functionality such as finding your starting point, calculating a route, and estimating the position of the sun along that route.
        </p>
        <p>
          Sun Shield itself does not store your location history.
        </p>

        <h2>Third-party map and routing services</h2>
        <p>
          To provide destination search, maps, and route calculations, the app sends requests directly from your device to third-party services including OpenStreetMap Nominatim and the OSRM routing service. These requests may include search terms, map requests, and route coordinates needed to provide the requested feature.
        </p>
        <p>
          Those third-party services may process technical information associated with requests according to their own privacy practices. Sun Shield does not control their independent data handling practices.
        </p>

        <h2>Tracking and advertising</h2>
        <p>
          Sun Shield does not track users across apps or websites and does not contain third-party advertising.
        </p>

        <h2>Children</h2>
        <p>
          Sun Shield itself does not collect or store personal information from any users, including children. The app does not require an account or profile.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          This policy may be updated if Sun Shield changes how the app works or adds services that affect privacy. The latest version will be published on this page.
        </p>

        <h2>Contact</h2>
        <p>
          Privacy questions can be sent through the support contact provided with the Sun Shield App Store listing.
        </p>
      </article>
    </main>
  );
}
