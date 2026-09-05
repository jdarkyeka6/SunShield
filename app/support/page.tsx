export const metadata = {
  title: 'Support | Sun Shield',
  description: 'Help and support for the Sun Shield app.'
};

const card: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #f1e7c8',
  borderRadius: 18,
  padding: '20px 22px',
  marginTop: 14
};

export default function SupportPage() {
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
        lineHeight: 1.65
      }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>☀️</div>
        <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.1 }}>Sun Shield Support</h1>
        <p style={{ color: '#6b7280', marginTop: 10 }}>Help with routes, location and sun-side recommendations.</p>

        <section style={card}>
          <h2 style={{ marginTop: 0 }}>Location is not working</h2>
          <p>
            Current Location is optional. You can type a starting place instead. If you want to use GPS, make sure location access is enabled for Sun Shield in your device settings, then try again.
          </p>
        </section>

        <section style={card}>
          <h2 style={{ marginTop: 0 }}>A place or route cannot be found</h2>
          <p>
            Try entering a more specific suburb, address or place name. Route and place-search services also need an internet connection and can occasionally be unavailable.
          </p>
        </section>

        <section style={card}>
          <h2 style={{ marginTop: 0 }}>The recommendation looks unexpected</h2>
          <p>
            Sun Shield analyses the driving route, estimated travel time, road direction and predicted sun position. Buildings, trees, clouds, tunnels, window tint and exact lane position are not currently modelled, so real-world glare can differ from the estimate.
          </p>
        </section>

        <section style={card}>
          <h2 style={{ marginTop: 0 }}>Privacy</h2>
          <p>
            Sun Shield does not create accounts or store your location history. You can read the full <a href="/privacy/">Privacy Policy</a>.
          </p>
        </section>

        <section style={card}>
          <h2 style={{ marginTop: 0 }}>Still need help?</h2>
          <p>
            Report a problem on the Sun Shield project page and include your device model, iOS version, what you entered, and what happened.
          </p>
          <p style={{ marginBottom: 0 }}>
            <a href="https://github.com/jdarkyeka6/SunShield/issues">Open Sun Shield support issues</a>
          </p>
        </section>

        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 24 }}>
          Sun Shield 1.0 · Last updated 5 September 2026
        </p>
      </article>
    </main>
  );
}
