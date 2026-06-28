import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import CalendarScreen from './screens/Calendar/CalendarScreen';
import CostsScreen from './screens/Costs/CostsScreen';
import DashboardScreen from './screens/Dashboard/DashboardScreen';
import SettingsScreen from './screens/Settings/SettingsScreen';

const NAV_ITEMS = [
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/costs', label: 'Costs', icon: '💡' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="favicon.svg" alt="" />
          <span>Chalet Admin</span>
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
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/costs" element={<CostsScreen />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/calendar" replace />} />
        </Routes>
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
