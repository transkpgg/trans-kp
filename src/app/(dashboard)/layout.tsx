"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, History, Building2, User, LogOut } from "lucide-react";
import { cn, getGreeting, getInitials } from "@/lib/utils";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const navItems = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Hotel", href: "/hotel-visit", icon: Building2 },
  { name: "Profil", href: "/profile", icon: User },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: meData } = useSWR("/api/auth/me", fetcher);
  const currentUser = meData?.user || { full_name: "Memuat...", jabatan: "..." };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col md:flex-row relative">
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-64 flex-col border-r border-surface-800 bg-surface-900/50 backdrop-blur-xl h-screen sticky top-0">
        <div className="p-6 border-b border-surface-800">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-brand-600">
            Trans KP
          </h1>
          <p className="text-xs text-surface-400 mt-1">Sistem Absensi Karyawan</p>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/home");
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  isActive 
                    ? "bg-brand-500/10 text-brand-400 border border-brand-500/20" 
                    : "text-surface-400 hover:text-surface-100 hover:bg-surface-800/50"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-brand-500" : "text-surface-500")} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
        
        <div className="p-4 border-t border-surface-800 space-y-3">
          <div className="flex items-center gap-3 glass-card p-3">
            <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-sm font-medium text-white shadow-lg">
              {getInitials(currentUser.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser.full_name}</p>
              <p className="text-xs text-surface-400 truncate">{currentUser.jabatan}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors w-full group">
            <div className="p-1.5 rounded-lg bg-red-500/10 group-hover:bg-red-500/20">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative pb-20 md:pb-0 max-w-lg mx-auto md:max-w-none w-full">
        {/* Mobile Header (hidden on desktop) */}
        <header className="md:hidden sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-surface-400">{getGreeting()},</p>
              <p className="text-sm font-semibold text-white">{currentUser.full_name}</p>
            </div>
            <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-sm font-medium text-white shadow-lg shadow-brand-500/20">
              {getInitials(currentUser.full_name)}
            </div>
          </div>
        </header>
        
        {/* Decorative background elements for main content */}
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex-1 p-4 md:p-8 z-10 w-full relative">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-900/80 backdrop-blur-xl border-t border-surface-800/80 pb-safe">
        <div className="flex items-center justify-around p-2 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/home");
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "bottom-nav-item py-2 px-3 rounded-xl",
                  isActive ? "active bg-brand-500/10" : ""
                )}
              >
                <Icon className={cn("w-6 h-6 mb-1 transition-transform", isActive ? "scale-110 text-brand-500" : "text-surface-500")} />
                <span className="text-[10px] font-medium leading-none">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
