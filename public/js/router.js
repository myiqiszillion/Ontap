/**
 * NTMK Navigation Router
 * Manages SPA screens, history push, active tabs, and responsive layout states
 */

const AppRouter = {
  currentRoute: 'dashboard',

  ROUTES: ['onboarding', 'dashboard', 'subjects', 'topics', 'quiz', 'study', 'flashcard', 'practice', 'result', 'announcements', 'diagnostic'],

  init() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    window.addEventListener('popstate', () => this.handleHashChange());
  },

  handleHashChange() {
    const raw = window.location.hash.replace(/^#/, '').trim();
    if (!raw) return;

    const [route, param] = raw.split('/');
    if (this.ROUTES.includes(route)) {
      this.navigate(route, param, false);
    }
  },

  navigate(routeId, param = null, updateHash = true) {
    if (!this.ROUTES.includes(routeId)) {
      routeId = 'dashboard';
    }

    this.currentRoute = routeId;

    if (updateHash) {
      const hashStr = param ? `#${routeId}/${param}` : `#${routeId}`;
      if (window.location.hash !== hashStr) {
        history.pushState(null, '', hashStr);
      }
    }

    // Hide all screen sections
    document.querySelectorAll('.screen').forEach(el => {
      el.classList.remove('on');
      el.setAttribute('aria-hidden', 'true');
    });

    // Show active screen
    const targetEl = document.getElementById(`screen-${routeId}`);
    if (targetEl) {
      targetEl.classList.add('on');
      targetEl.removeAttribute('aria-hidden');
    }

    // Update desktop header active tabs
    document.querySelectorAll('.header-nav-desktop .nav-item-btn').forEach(btn => {
      const target = btn.getAttribute('data-route');
      btn.classList.toggle('active', target === routeId);
    });

    // Update mobile bottom bar active tabs
    document.querySelectorAll('.mobile-bottom-nav .mob-nav-item').forEach(btn => {
      const target = btn.getAttribute('data-route');
      btn.classList.toggle('active', target === routeId);
    });

    // Trigger view-specific render hooks
    if (routeId === 'dashboard') {
      DashboardView.render();
    } else if (routeId === 'subjects') {
      SubjectExplorer.render();
    } else if (routeId === 'onboarding') {
      Onboarding.render();
    } else if (routeId === 'diagnostic') {
      if (window.DiagnosticView) DiagnosticView.render(param || 'welcome');
    }

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppRouter;
}
