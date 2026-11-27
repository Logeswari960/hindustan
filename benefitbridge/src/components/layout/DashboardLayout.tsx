import { Outlet } from 'react-router-dom';
import { Sidebar, MobileNav, CollapsibleSidebar } from './Sidebar';

export function DashboardLayout() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_top_left,_rgba(147,197,253,0.28),transparent_32rem),radial-gradient(circle_at_bottom_right,_rgba(196,181,253,0.22),transparent_28rem)]">
      <Sidebar />
      <CollapsibleSidebar />
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 pt-16 lg:pt-8 pb-24 lg:pb-8 max-w-full">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}
