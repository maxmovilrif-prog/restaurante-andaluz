import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FileText,
  BarChart3,
  Moon,
  Sun,
  UtensilsCrossed,
  Menu,
  X,
  Users,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/admin/inventario', label: 'Inventario', icon: Package },
  { to: '/admin/facturas', label: 'Facturas', icon: FileText },
  { to: '/admin/informes', label: 'Informes', icon: BarChart3 },
  { to: '/admin/personal', label: 'Personal', icon: Users },
];

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`
          }
        >
          <Icon size={18} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function FooterActions({ theme, toggleTheme, onLogout }) {
  return (
    <div className="mt-auto space-y-1 p-3">
      <button
        onClick={toggleTheme}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      </button>
      <button
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
      >
        <LogOut size={18} />
        Cerrar sesión
      </button>
    </div>
  );
}

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-white">
            <UtensilsCrossed size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Restaurante Andaluz</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Panel de Administración</p>
          </div>
        </div>
        <NavItems />
        <FooterActions theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-neutral-900">
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-white">
                  <UtensilsCrossed size={18} />
                </div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Restaurante Andaluz</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-neutral-500">
                <X size={20} />
              </button>
            </div>
            <NavItems onNavigate={() => setMobileOpen(false)} />
            <FooterActions theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-neutral-600 dark:text-neutral-300">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white">
              <UtensilsCrossed size={16} />
            </div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Restaurante Andaluz</p>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
