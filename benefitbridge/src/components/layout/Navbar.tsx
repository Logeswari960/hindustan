import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Bell } from 'lucide-react';
import { Button } from '../ui';
import { authApi } from '../../services/api';
import { backendConfigured, clearDemoSession } from '../../services/backendClient';

const navLinks = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Benefits',     href: '/search' },
  { label: 'Resources',    href: '/resources' },
  { label: 'About',        href: '/#about' },
];

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-sm' : 'text-[15px]';
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="BenefitBridge home">
      <div className={`${iconSize} rounded-lg bg-navy-700 flex items-center justify-center shrink-0`}>
        <svg viewBox="0 0 24 24" fill="none" className="w-[60%] h-[60%]" aria-hidden="true">
          <rect x="3" y="5" width="7" height="14" rx="1.5" fill="white" opacity="0.95"/>
          <rect x="12" y="5" width="9" height="9" rx="1.5" fill="#2a9a8b"/>
          <rect x="12" y="16" width="5" height="3" rx="1" fill="white" opacity="0.6"/>
        </svg>
      </div>
      <span className={`font-semibold text-navy-900 ${textSize} tracking-tight`}>BenefitBridge</span>
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isAdmin = location.pathname.startsWith('/admin');
  const leaveDashboard = async () => {
    clearDemoSession();
    if (backendConfigured) {
      await authApi.logout();
      navigate('/login');
    } else {
      navigate('/');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Logo />

          {/* Desktop nav — only on public pages */}
          {!isDashboard && !isAdmin && (
            <nav className="hidden md:flex items-center gap-0.5" aria-label="Main navigation">
              {navLinks.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-3 py-2 text-sm text-neutral-600 hover:text-navy-700 hover:bg-neutral-50 rounded-lg transition-colors font-medium"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}

          {isDashboard && (
            <nav className="hidden md:flex items-center gap-0.5" aria-label="Dashboard navigation">
              <span className="text-sm text-neutral-500">Dashboard</span>
            </nav>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {isDashboard ? (
              <>
                <Link to="/dashboard/notifications" aria-label="Notifications">
                  <button className="relative p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors">
                    <Bell size={18} />
                  </button>
                </Link>
                <Button variant="ghost" size="sm" onClick={leaveDashboard}>
                  {backendConfigured ? 'Sign out' : 'Exit dashboard'}
                </Button>
              </>
            ) : isAdmin ? (
              <Link to="/">
                <Button variant="ghost" size="sm">Exit admin</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link to="/onboarding">
                  <Button size="sm">Check my benefits</Button>
                </Link>
              </>
            )}

            {/* Mobile menu toggle */}
            {!isDashboard && !isAdmin && (
              <button
                className="md:hidden p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
                onClick={() => setOpen(!open)}
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
              >
                {open ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-neutral-100 bg-white animate-fade-in" role="navigation" aria-label="Mobile navigation">
          <div className="px-4 py-3 space-y-0.5">
            {navLinks.map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 rounded-lg font-medium transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-neutral-100 mt-2 flex flex-col gap-2">
              <Link to="/login" onClick={() => setOpen(false)}>
                <Button variant="secondary" size="sm" fullWidth>Sign in</Button>
              </Link>
              <Link to="/onboarding" onClick={() => setOpen(false)}>
                <Button size="sm" fullWidth>Check my benefits</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
