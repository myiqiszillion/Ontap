/**
 * NTMK Navigation Router
 * Manages SPA screens, history push, active tabs, and responsive layout states
 */

const AppRouter = {
  currentRoute: 'dashboard',

  ROUTES: ['onboarding', 'dashboard', 'subjects', 'topics', 'quiz', 'study', 'flashcard', 'practice', 'result', 'announcements', 'diagnostic', 'planner', 'checker', 'mistakes', 'custom-exam', 'importer'],


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

    // Update desktop header active tabs (Finding A1: Structure and active state)
    document.querySelectorAll('.header-nav-desktop .nav-item-btn').forEach(btn => {
      const target = btn.getAttribute('data-route');
      const isActive = target === routeId;
      btn.classList.toggle('active', isActive);
      if (isActive) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    // Update mobile bottom bar active tabs
    document.querySelectorAll('.mobile-bottom-nav .mob-nav-item').forEach(btn => {
      const target = btn.getAttribute('data-route');
      const isActive = target === routeId;
      btn.classList.toggle('active', isActive);
      if (isActive) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    // Toggle onboarding isolation state on body (Finding U2: Full nav competes with onboarding)
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('is-onboarding', routeId === 'onboarding');
    }

    // Trigger view-specific render hooks (Full lifecycle execution for all SPA views)
    if (routeId === 'dashboard') {
      if (typeof DashboardView !== 'undefined') DashboardView.render();
    } else if (routeId === 'subjects') {
      if (typeof SubjectExplorer !== 'undefined') SubjectExplorer.render();
    } else if (routeId === 'onboarding') {
      if (typeof Onboarding !== 'undefined') Onboarding.render();
    } else if (routeId === 'diagnostic') {
      if (typeof DiagnosticView !== 'undefined') DiagnosticView.init(param || 'welcome');
    } else if (routeId === 'planner') {
      if (typeof PlannerView !== 'undefined') PlannerView.init();
    } else if (routeId === 'custom-exam') {
      if (typeof CustomExam !== 'undefined') {
        const currentSub = (typeof app !== 'undefined' && app.currentSubject) ? app.currentSubject : 'lichsu11';
        CustomExam.init(param || currentSub);
      }
    } else if (routeId === 'checker') {
      if (typeof Checker !== 'undefined') {
        const currentSub = (typeof app !== 'undefined' && app.currentSubject) ? app.currentSubject : 'lichsu11';
        Checker.init(param || currentSub);
      }
    } else if (routeId === 'mistakes') {
      if (typeof MistakeView !== 'undefined') MistakeView.render();
    } else if (routeId === 'importer') {
      if (typeof SmartImporterView !== 'undefined') SmartImporterView.init();
    } else if (routeId === 'announcements') {
      if (typeof app !== 'undefined' && app.loadAnnouncements) app.loadAnnouncements();
    }

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppRouter;
}
