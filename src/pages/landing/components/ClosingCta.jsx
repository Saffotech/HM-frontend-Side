import { Link } from 'react-router-dom';
import { ROUTES } from '@/shared/constants';
import './ClosingCta.css';

function scrollToModules() {
  const el = document.getElementById('modules');
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', `${ROUTES.HOME}#modules`);
}

export default function ClosingCta() {
  return (
    <section className="landing-close">
      <div className="landing-container">
        <div className="landing-close__panel">
          <h2>Bring Your Hospital Workflows Together.</h2>
          <p>Explore SaffoCare and discover a more organized way to manage your hospital operations.</p>
          <div className="landing-close__actions">
            <button type="button" className="landing-btn landing-btn--primary landing-btn--lg" onClick={scrollToModules}>
              Explore Modules
            </button>
            <Link to={`${ROUTES.LOGIN}?switch=1`} className="landing-close__staff">
              Staff Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
