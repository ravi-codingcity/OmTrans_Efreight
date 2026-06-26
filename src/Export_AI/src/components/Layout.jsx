import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FilePlus2, Settings as SettingsIcon, FileStack, IndianRupee } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const navItem = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

// Embedded Export-AI workspace. The main app owns the top navbar + auth/logout,
// so this layout is just the AI workspace sub-navigation + content area.
export default function Layout() {
  const { user, isAdmin } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <FileStack className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-slate-800">Export AI</p>
              <p className="text-[11px] text-slate-400">
                Document Intelligence · {user?.roleLabel || (user?.role === 'admin' ? 'Super Admin' : 'Export User')}
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/" end className={navItem}>
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </NavLink>
            <NavLink to="/jobs/new" className={navItem}>
              <FilePlus2 className="h-4 w-4" /> New Analysis
            </NavLink>
            {isAdmin && (
              <NavLink to="/costing" className={navItem}>
                <IndianRupee className="h-4 w-4" /> AI Costing &amp; Usage
              </NavLink>
            )}
            <NavLink to="/settings" className={navItem}>
              <SettingsIcon className="h-4 w-4" /> Settings
            </NavLink>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-6xl p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
