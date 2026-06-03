"use client";

import { useState } from "react";
import { MapPin, Target, Crosshair, Map, Navigation, Maximize, Building2 } from "lucide-react";
import { mockBranches, mockAttendances } from "@/lib/mock-data";
import { cn, formatTime } from "@/lib/utils";

export default function LocationsPage() {
  const [activeBranchId, setActiveBranchId] = useState(mockBranches[0].id);

  const activeBranch = mockBranches.find(b => b.id === activeBranchId) || mockBranches[0];
  
  // Filter recent check-ins for the active branch to show as pins on map
  const recentCheckins = mockAttendances
    .filter(a => a.branch_id === activeBranchId && a.check_in_lat)
    .slice(0, 15);

  return (
    <div className="space-y-6 slide-up h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-white">Monitoring Lokasi (Real-time)</h1>
        <p className="text-sm text-surface-400 mt-1">Pantau pergerakan karyawan dan area geofence cabang.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* Sidebar Branch List */}
        <div className="lg:col-span-1 glass-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-surface-800 bg-surface-900/50">
            <h3 className="font-semibold text-white">Daftar Cabang</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {mockBranches.map(branch => (
              <button
                key={branch.id}
                onClick={() => setActiveBranchId(branch.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl transition-all border",
                  activeBranchId === branch.id 
                    ? "bg-brand-500/20 border-brand-500 text-white" 
                    : "bg-surface-900/50 border-transparent text-surface-300 hover:bg-surface-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    activeBranchId === branch.id ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30" : "bg-surface-800"
                  )}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{branch.name}</p>
                    <p className={cn(
                      "text-xs truncate mt-0.5 font-mono",
                      activeBranchId === branch.id ? "text-brand-300" : "text-surface-500"
                    )}>
                      Radius {branch.radius_meters}m
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Simulated Map Area */}
        <div className="lg:col-span-3 glass-card flex flex-col overflow-hidden relative">
          
          {/* Map Header Overlay */}
          <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
            <div className="bg-surface-950/80 backdrop-blur-md border border-surface-800 rounded-xl p-3 shadow-2xl pointer-events-auto">
              <h3 className="font-bold text-white text-lg">{activeBranch.name}</h3>
              <p className="text-xs text-brand-400 font-mono mt-1 flex items-center gap-1">
                <Target className="w-3 h-3" /> {activeBranch.latitude}, {activeBranch.longitude}
              </p>
            </div>
            
            <div className="flex flex-col gap-2 pointer-events-auto">
              <button className="p-2.5 rounded-xl bg-surface-950/80 backdrop-blur-md border border-surface-800 text-white hover:bg-surface-800 transition-colors shadow-xl">
                <Navigation className="w-5 h-5" />
              </button>
              <button className="p-2.5 rounded-xl bg-surface-950/80 backdrop-blur-md border border-surface-800 text-white hover:bg-surface-800 transition-colors shadow-xl">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 z-10 bg-surface-950/80 backdrop-blur-md border border-surface-800 rounded-xl p-3 shadow-2xl pointer-events-auto">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Legenda</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-surface-300">
                <div className="w-3 h-3 rounded-full bg-brand-500 border border-white" /> Pusat Cabang
              </div>
              <div className="flex items-center gap-2 text-xs text-surface-300">
                <div className="w-3 h-3 rounded-full border border-dashed border-brand-500 bg-brand-500/10" /> Area Geofence
              </div>
              <div className="flex items-center gap-2 text-xs text-surface-300">
                <div className="w-3 h-3 rounded-full bg-emerald-500" /> Check In (Valid)
              </div>
              <div className="flex items-center gap-2 text-xs text-surface-300">
                <div className="w-3 h-3 rounded-full bg-amber-500" /> Check In (Suspect)
              </div>
            </div>
          </div>

          {/* Simulated Map Background */}
          <div className="flex-1 bg-[#0a1128] relative overflow-hidden">
            {/* Grid Pattern */}
            <div className="absolute inset-0" style={{ 
              backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
              backgroundSize: '30px 30px',
              opacity: 0.5
            }} />
            
            {/* Geographic abstract elements to look like a dark map */}
            <svg className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M0,50 Q20,20 40,60 T100,30" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
              <path d="M0,80 Q30,90 50,50 T100,70" fill="none" stroke="#3b82f6" strokeWidth="0.2" />
            </svg>

            {/* Centered Target Area (The Branch) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              {/* Geofence Radius Circle (Simulated scaling) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border-2 border-dashed border-brand-500/50 bg-brand-500/5 animate-[pulse_4s_ease-in-out_infinite]" />
              
              {/* Branch Pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] z-20 flex flex-col items-center">
                <div className="w-10 h-10 bg-brand-500 text-white rounded-t-full rounded-bl-full rotate-45 flex items-center justify-center shadow-lg shadow-brand-500/50 border-2 border-white">
                  <Building2 className="w-5 h-5 -rotate-45" />
                </div>
                <div className="w-2 h-1 bg-black/50 rounded-full blur-[2px] mt-1" />
              </div>

              {/* Simulated Check-in Pins scattered around */}
              {recentCheckins.map((record, i) => {
                // Generate deterministic but seemingly random offset based on ID
                // To keep them inside or slightly outside the 150px radius
                const isSuspect = record.gps_flag === 'suspect';
                const isOutside = record.gps_flag === 'outside_geofence';
                
                // Distribute within radius (mostly)
                const angle = (i * 137.5) * (Math.PI / 180); 
                let dist = (i % 5 + 1) * 20; 
                if (isOutside) dist = 180 + (i % 3) * 20; // Put outside geofence

                const x = Math.cos(angle) * dist;
                const y = Math.sin(angle) * dist;

                return (
                  <div 
                    key={`pin-${record.id}`}
                    className="absolute z-10 group cursor-pointer"
                    style={{ 
                      transform: `translate(${x}px, ${y}px)`,
                      left: '50%',
                      top: '50%'
                    }}
                  >
                    <div className={cn(
                      "w-3 h-3 rounded-full border-2 border-white shadow-lg",
                      isSuspect ? "bg-amber-500 animate-pulse" :
                      isOutside ? "bg-red-500" : "bg-emerald-500"
                    )} />
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      <p className="font-semibold text-white text-xs">{record.user_name}</p>
                      <p className="text-[10px] text-surface-400 mt-0.5">{record.check_in_time && formatTime(record.check_in_time)} WIB</p>
                      {isSuspect && <p className="text-[10px] text-amber-400 mt-0.5 font-bold">⚠️ GPS Suspect</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

// Ensure Building2 is used by returning something that definitely uses it
function IconWrapper() {
  return <Building2 />;
}
