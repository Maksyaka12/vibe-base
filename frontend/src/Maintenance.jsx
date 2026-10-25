import './maintenance.css';

// Shown on every page while Vibe Hub is being upgraded (see MAINTENANCE in main.jsx).
export default function Maintenance() {
  return (
    <main className="mt-root">
      <div className="mt-grid" aria-hidden="true" />
      <div className="mt-glow" aria-hidden="true" />

      <section className="mt-card">
        <div className="mt-logo">
          <span className="mt-ring" aria-hidden="true" />
          <span className="mt-ring mt-ring-2" aria-hidden="true" />
          <img src="/new-logo.png" alt="Vibe Hub" />
        </div>

        <div className="mt-badge">
          <span className="mt-dot" />
          Upgrade in progress
        </div>

        <h1 className="mt-title">
          Vibe Hub is <span>upgrading</span>
        </h1>
        <p className="mt-sub">We're building something better. Back very soon.</p>

        <div className="mt-progress" aria-hidden="true">
          <span />
        </div>
        <div className="mt-foot">Coming soon</div>
      </section>
    </main>
  );
}
