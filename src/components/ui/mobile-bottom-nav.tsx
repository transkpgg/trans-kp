"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, User } from "lucide-react";
import useSWR from "swr";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: meData } = useSWR("/api/auth/me", fetcher);
  const role = meData?.user?.role;

  // Tentukan rute Dashboard sesuai role:
  const isMaintenanceAdmin = meData?.user?.jabatan === "Admin Perawatan Kendaraan";
  const dashboardHref = isMaintenanceAdmin 
    ? "/admin/vehicle-maintenance" 
    : role === "karyawan" 
      ? "/history" 
      : "/admin/dashboard";

  const isBerandaActive =
    pathname === "/home" ||
    pathname.startsWith("/hotel-visit") ||
    pathname.startsWith("/bon-pengemudi") ||
    pathname.startsWith("/vehicle-checklist") ||
    pathname === "/check-in" ||
    pathname === "/check-out" ||
    pathname === "/schedule";

  const isDashboardActive =
    pathname.startsWith("/admin") ||
    pathname === "/history";

  const isAkunActive = pathname.startsWith("/profile");

  const navItems = [
    {
      name: "Beranda",
      href: "/home",
      icon: Home,
      isActive: isBerandaActive,
    },
    {
      name: "Dashboard",
      href: dashboardHref,
      icon: LayoutDashboard,
      isActive: isDashboardActive,
    },
    {
      name: "Akun",
      href: "/profile",
      icon: User,
      isActive: isAkunActive,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 w-full max-w-full overflow-hidden bg-[#0B0F19]/95 backdrop-blur-xl border-t border-surface-800/80 shadow-[0_-4px_25px_rgba(0,0,0,0.6)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 px-3 rounded-xl transition-all duration-200 select-none group",
                active
                  ? "text-blue-500"
                  : "text-surface-400 hover:text-surface-200 hover:bg-surface-850/40 active:scale-95"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-6 h-6 transition-all duration-200",
                    active
                      ? "text-blue-500 scale-110 drop-shadow-[0_2px_10px_rgba(59,130,246,0.6)]"
                      : "text-surface-400 group-hover:text-surface-200"
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>
              <span
                className={cn(
                  "text-[11px] mt-1 tracking-wide leading-none transition-all duration-200",
                  active
                    ? "font-bold text-blue-500"
                    : "font-medium text-surface-400 group-hover:text-surface-200"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
