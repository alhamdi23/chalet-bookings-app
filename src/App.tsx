import { Suspense, lazy } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAppStore } from './store/AppStore';
import { resolveAppName, resolveLogoSrc } from './data/settings';
import SyncStatusBadge from './components/SyncStatusBadge';

// Screens are code-split so the initial bundle stays small and the app opens
// fast. Heavy dependencies (e.g. recharts used by Dashboard/Estimation) are now
// only downloaded when the user actually navigates to that screen.
const CalendarScreen = lazy(() => import('./screens/Calendar/CalendarScreen'));
const AvailabilityScreen = lazy(
  () => import('./screens/Availability/AvailabilityScreen'),
);
const CostsScreen = lazy(() => import('./screens/Costs/CostsScreen'));
const DashboardScreen = lazy(() => import('./screens/Dashboard/DashboardScreen'));
const EstimationScreen = lazy(
  () => import('./screens/Estimation/EstimationScreen'),
);
const SettingsScreen = lazy(() => import('./screens/Settings/SettingsScreen'));

const NAV_ITEMS = [
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/availability', label: 'Availability', icon: '🖼️' },
  { to: '/costs', label: 'Costs', icon: '💡' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/estimation', label: 'Estimation', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const { settings } = useAppStore();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={resolveLogoSrc(settings)} alt={resolveAppName(settings)} />
          <span>{resolveAppName(settings)}</span>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        <div className="sidebar-footer">
          <SyncStatusBadge />
        </div>
      </aside>

      <div className="mobile-status">
        <SyncStatusBadge />
      </div>

      <main className="main">
        <Suspense
          fallback={<div className="screen-loading">Loading…</div>}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            <Route path="/calendar" element={<CalendarScreen />} />
            <Route path="/availability" element={<AvailabilityScreen />} />
            <Route path="/costs" element={<CostsScreen />} />
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/estimation" element={<EstimationScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/calendar" replace />} />
          </Routes>
        </Suspense>
      </main>

      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
