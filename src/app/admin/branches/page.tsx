"use client";

import { useState } from "react";
import { Building, MapPin, Edit, Trash2, Plus, Users, Navigation } from "lucide-react";
import { mockBranches } from "@/lib/mock-data";

export default function BranchesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6 slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manajemen Cabang</h1>
          <p className="text-sm text-surface-400 mt-1">Kelola data cabang kantor dan area geofence.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all"
        >
          <Plus className="w-5 h-5" />
          Tambah Cabang
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockBranches.map((branch) => (
          <div key={branch.id} className="glass-card overflow-hidden flex flex-col group">
            <div className="h-32 bg-surface-800 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ 
                backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)',
                backgroundSize: '10px 10px'
              }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-brand-500/50 bg-brand-500/10 flex items-center justify-center">
                <Navigation className="w-6 h-6 text-brand-500" />
              </div>
              <div className="absolute top-3 right-3">
                {branch.is_active ? (
                  <span className="px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 backdrop-blur-md border border-emerald-500/30">
                    Aktif
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-surface-900/50 text-surface-400 backdrop-blur-md border border-surface-700">
                    Nonaktif
                  </span>
                )}
              </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-white mb-2">{branch.name}</h3>
              <p className="text-sm text-surface-400 flex items-start gap-2 mb-4">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-surface-500" />
                {branch.address}
              </p>
              
              <div className="mt-auto pt-4 border-t border-surface-800 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-surface-500 uppercase font-semibold">Radius Geofence</p>
                  <p className="font-mono text-brand-400 font-medium mt-1">{branch.radius_meters} meter</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase font-semibold">Koordinat</p>
                  <p className="font-mono text-white text-xs mt-1 truncate" title={`${branch.latitude}, ${branch.longitude}`}>
                    {branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-surface-900/50 border-t border-surface-800 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1.5 text-xs font-medium text-surface-400">
                <Users className="w-4 h-4" /> 15 Karyawan
              </div>
              <div className="flex gap-2">
                <button className="p-1.5 text-surface-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-md transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="glass-card w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-surface-700">
              <h2 className="text-xl font-bold text-white">Tambah Cabang Baru</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-300">Nama Cabang</label>
                <input type="text" className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500" placeholder="Kantor Cabang Baru" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-300">Alamat Lengkap</label>
                <textarea rows={2} className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500" placeholder="Jalan Raya..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">Latitude</label>
                  <input type="number" step="any" className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500" placeholder="-7.xxx" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">Longitude</label>
                  <input type="number" step="any" className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500" placeholder="112.xxx" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-surface-300">Radius Toleransi (Meter)</label>
                <input type="number" defaultValue={100} className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500" />
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 bg-surface-900/50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-surface-700 font-medium text-white hover:bg-surface-800 transition-colors">
                Batal
              </button>
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg transition-all">
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
