import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Star, CheckCircle, FileText,
  ClipboardList, Clock, User, Settings, ChevronRight,
  Menu, X
} from 'lucide-react';

const navItems = [
  { label: 'Overview',     icon: LayoutDashboard, to: '/dashboard',               end: true },
  { label: 'My Benefits',  icon: Star,            to: '/dashboard/benefits',       end: false },
  { label: 'Eligibility',  icon: CheckCircle,     to: '/dashboard/eligibility',    end: false },
  { label: 'Documents',    icon: FileText,        to: '/dashboard/documents',      end: false },
  { label: 'Applications', icon: ClipboardList,   to: '/dashboard/applications',   end: false },
  { label: 'Deadlines',    icon: Clock,           to: '/dashboard/deadlines',      end: false },
];

const bottomItems = [
  { label: 'Profile',  icon: User,     to: '/dashboard/profile',  end: false },
  { label: 'Settings', icon: Settings, to: '/dashboard/settings', end: false },
];

function NavItem({ label, icon: Icon, to, end }: { label: string; icon: React.ElementType; to: string; end: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => [
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
        isActive
          ? 'bg-navy-50 text-navy-700'
          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800',
      ].join(' ')}
    >
      {({ isActive }) => (
        <>
          <Icon size={16} className={isActive ? 'text-navy-600' : 'text-neutral-400 group-hover:text-neutral-500'} />
          <span className="flex-1">{label}</span>
          {isActive && <ChevronRight size={13} className="text-navy-400" />}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside
      className="hidden lg:flex flex-col w-56 shrink-0 border-r border-neutral-200 bg-white sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto"
      aria-label="Dashboard sidebar"
    >
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(item => <NavItem key={item.to} {...item} />)}
      </nav>
      <div className="px-3 py-4 border-t border-neutral-100 space-y-0.5">
        {bottomItems.map(item => <NavItem key={item.to} {...item} />)}
      </div>
    </aside>
  );
}

// Mobile bottom navigation
const mobileItems = [
  { label: 'Home',         icon: LayoutDashboard, to: '/dashboard',             end: true },
  { label: 'Benefits',     icon: Star,            to: '/dashboard/benefits',    end: false },
  { label: 'Applications', icon: ClipboardList,   to: '/dashboard/applications',end: false },
  { label: 'Documents',    icon: FileText,        to: '/dashboard/documents',   end: false },
  { label: 'Profile',      icon: User,            to: '/dashboard/profile',     end: false },
];

export function MobileNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 safe-area-pb"
      aria-label="Mobile navigation"
    >
      <div className="flex">
        {mobileItems.map(({ label, icon: Icon, to, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => [
              'flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-navy-700' : 'text-neutral-400',
            ].join(' ')}
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// Collapsible sidebar for tablet
export function CollapsibleSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="lg:hidden absolute top-3 left-4 z-30 p-2 bg-white border border-neutral-200 rounded-lg shadow-card text-neutral-600 hover:bg-neutral-50"
        onClick={() => setOpen(!open)}
        aria-label="Toggle sidebar"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      {open && (
        <>
          <div className="lg:hidden fixed inset-0 z-20 bg-black/20" onClick={() => setOpen(false)} />
          <aside className="lg:hidden fixed top-16 left-0 bottom-0 z-30 w-56 bg-white border-r border-neutral-200 overflow-y-auto animate-slide-up">
            <nav className="px-3 py-4 space-y-0.5">
              {navItems.map(item => <NavItem key={item.to} {...item} />)}
            </nav>
            <div className="px-3 py-4 border-t border-neutral-100 space-y-0.5">
              {bottomItems.map(item => <NavItem key={item.to} {...item} />)}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
