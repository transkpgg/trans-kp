"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, Car, MapPin, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import UsersPage from "../users/page";
import VehiclesPage from "../vehicles/page";
import DestinationsPage from "../destinations/page";

function MasterDataContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTabParam = searchParams.get("tab") || "users";
  const [activeTab, setActiveTab] = useState(activeTabParam);

  useEffect(() => {
    setActiveTab(activeTabParam);
  }, [activeTabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.replace(`/admin/master?tab=${tabId}`, { scroll: false });
  };

  const tabs = [
    { id: "users", name: "Pengguna", icon: Users, desc: "Kelola akun pengguna & peran" },
    { id: "vehicles", name: "Kendaraan", icon: Car, desc: "Kelola nopol & kendaraan" },
    { id: "destinations", name: "Luar Kota (Tujuan)", icon: MapPin, desc: "Kelola kota tujuan SPD" },
  ];

  return (
    <div className="space-y-6 slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Master Data</h1>
              <p className="text-sm text-surface-400 mt-0.5">
                Kelola data master sistem (Pengguna, Kendaraan, dan Kota Tujuan).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-surface-800 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap shrink-0",
                isActive
                  ? "bg-brand-500/15 text-brand-400 border border-brand-500/30 shadow-lg shadow-brand-500/10 font-semibold"
                  : "text-surface-400 hover:text-white hover:bg-surface-800/60"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-brand-400" : "text-surface-500")} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div className="pt-2">
        {activeTab === "users" && <UsersPage />}
        {activeTab === "vehicles" && <VehiclesPage />}
        {activeTab === "destinations" && <DestinationsPage />}
      </div>
    </div>
  );
}

export default function MasterDataPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-surface-400">Memuat Master Data...</div>}>
      <MasterDataContent />
    </Suspense>
  );
}
