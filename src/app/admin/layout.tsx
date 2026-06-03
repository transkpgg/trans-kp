"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  FileBarChart, 
  CreditCard,
  LogOut,
  Menu,
  X,
  Bell
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { mockCurrentAdmin } from "@/lib/mock-data";

const adminNavItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Master User", href: "/admin/users", icon: Users },
  { name: "Hotel Visit", href: "/admin/hotel-visits", icon: Building2 },
  { name: "E-Toll", href: "/admin/etoll", icon: CreditCard },
  { name: "Laporan", href: "/admin/reports", icon: FileBarChart },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const adminUser = mockCurrentAdmin;

  return (
    <div className="min-h-screen bg-surface-950 flex relative">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 glass-card border-r border-y-0 border-l-0 rounded-none rounded-r-2xl lg:rounded-none lg:border-surface-800 lg:bg-surface-900/50 flex flex-col transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "lg:sticky lg:top-0 lg:h-screen"
      )}>
        <div className="p-6 border-b border-surface-800 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-brand-600">
              Trans KP
            </h1>
            <p className="text-[10px] text-surface-400 uppercase tracking-widest mt-1 font-semibold">Admin Panel</p>
          </div>
          <button 
            className="lg:hidden text-surface-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                  isActive 
                    ? "bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-inner shadow-brand-500/10" 
                    : "text-surface-400 hover:text-surface-100 hover:bg-surface-800/50"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isActive ? "bg-brand-500/20" : "bg-surface-800 group-hover:bg-surface-700"
                )}>
                  <Icon className={cn("w-4 h-4", isActive ? "text-brand-500" : "text-surface-400")} />
                </div>
                <span className="font-medium text-sm">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                )}
              </Link>
            );
          })}
        </div>
        
        <div className="p-4 border-t border-surface-800">
          <Link href="/login" className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors w-full group">
            <div className="p-1.5 rounded-lg bg-red-500/10 group-hover:bg-red-500/20">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm">Keluar</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50 h-16 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-surface-400 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-lg font-semibold text-white capitalize">
                {pathname.split("/").pop()?.replace("-", " ") || "Dashboard"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-surface-400 hover:text-white transition-colors rounded-full hover:bg-surface-800">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-surface-950" />
            </button>
            <div className="h-6 w-px bg-surface-700" />
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white leading-tight">{adminUser.full_name}</p>
                <p className="text-xs text-brand-400 leading-tight">{adminUser.role.replace("_", " ")}</p>
              </div>
              <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-sm font-medium text-white shadow-lg cursor-pointer ring-2 ring-transparent hover:ring-brand-500/50 transition-all">
                {getInitials(adminUser.full_name)}
              </div>
            </div>
          </div>
        </header>

        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-[40%] h-[30%] bg-brand-500/5 rounded-full blur-[150px] pointer-events-none" />

        {/* Content */}
        <div className="flex-1 p-4 lg:p-8 relative z-10 overflow-x-hidden">
          {children}
        </div>
      </main>

    </div>
  );
}
