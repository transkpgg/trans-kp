"use client";

import { useState } from "react";
import { User, Mail, Phone, MapPin, Briefcase, Camera, LogOut, Lock, CheckCircle2, ChevronRight } from "lucide-react";
import { mockCurrentUser, mockDashboardStats } from "@/lib/mock-data";
import { getInitials, cn } from "@/lib/utils";

export default function ProfilePage() {
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  return (
    <div className="space-y-6 pb-6 slide-up">
      
      {/* Avatar Header */}
      <div className="flex flex-col items-center justify-center pt-4 pb-6">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full gradient-brand flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-brand-500/20">
            {getInitials(mockCurrentUser.full_name)}
          </div>
          <button className="absolute bottom-0 right-0 p-2 rounded-full bg-surface-800 border border-surface-600 text-white hover:bg-surface-700 transition-colors shadow-lg">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <h1 className="text-xl font-bold text-white">{mockCurrentUser.full_name}</h1>
        <p className="text-brand-400 font-medium text-sm mt-1">{mockCurrentUser.jabatan}</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3 text-center">
          <p className="text-xs text-surface-400 uppercase tracking-wide">Hadir</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">21</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xs text-surface-400 uppercase tracking-wide">Telat</p>
          <p className="text-xl font-bold text-amber-400 mt-1">2</p>
        </div>
        <div className="glass-card p-3 text-center">
          <p className="text-xs text-surface-400 uppercase tracking-wide">Absen</p>
          <p className="text-xl font-bold text-red-400 mt-1">0</p>
        </div>
      </div>

      {/* Info List */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-800 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-surface-800">
            <User className="w-5 h-5 text-surface-300" />
          </div>
          <div>
            <p className="text-xs text-surface-400">Nomor Induk Karyawan (NIK)</p>
            <p className="font-medium text-white">{mockCurrentUser.nik}</p>
          </div>
        </div>
        
        <div className="p-4 border-b border-surface-800 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-surface-800">
            <Briefcase className="w-5 h-5 text-surface-300" />
          </div>
          <div>
            <p className="text-xs text-surface-400">Role / Hak Akses</p>
            <p className="font-medium text-white capitalize">{mockCurrentUser.role}</p>
          </div>
        </div>

        <div className="p-4 border-b border-surface-800 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-surface-800">
            <Mail className="w-5 h-5 text-surface-300" />
          </div>
          <div>
            <p className="text-xs text-surface-400">Email</p>
            <p className="font-medium text-white">{mockCurrentUser.email}</p>
          </div>
        </div>

        <div className="p-4 border-b border-surface-800 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-surface-800">
            <Phone className="w-5 h-5 text-surface-300" />
          </div>
          <div>
            <p className="text-xs text-surface-400">Nomor Telepon</p>
            <p className="font-medium text-white">{mockCurrentUser.phone || '-'}</p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-surface-800">
            <MapPin className="w-5 h-5 text-surface-300" />
          </div>
          <div>
            <p className="text-xs text-surface-400">Cabang Penempatan</p>
            <p className="font-medium text-white">{mockCurrentUser.branch_name}</p>
          </div>
        </div>
      </div>

      <button className="w-full py-3.5 rounded-xl border border-surface-700 font-medium text-white hover:bg-surface-800 transition-colors">
        Edit Profil
      </button>

      {/* Change Password */}
      <div className="glass-card overflow-hidden">
        <button 
          onClick={() => setIsPasswordOpen(!isPasswordOpen)}
          className="w-full p-4 flex items-center justify-between hover:bg-surface-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-surface-400" />
            <span className="font-medium text-white">Ganti Password</span>
          </div>
          <ChevronRight className={cn("w-5 h-5 text-surface-500 transition-transform", isPasswordOpen && "rotate-90")} />
        </button>
        
        {isPasswordOpen && (
          <div className="p-4 border-t border-surface-800 bg-surface-900/30 space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-surface-400">Password Lama</label>
              <input type="password" placeholder="••••••••" className="w-full bg-surface-950 border border-surface-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-surface-400">Password Baru</label>
              <input type="password" placeholder="••••••••" className="w-full bg-surface-950 border border-surface-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            </div>
            <button className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors">
              Simpan Password
            </button>
          </div>
        )}
      </div>

      {/* Logout */}
      <button className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 font-medium transition-colors mt-8">
        <LogOut className="w-5 h-5" />
        Keluar
      </button>

      <p className="text-center text-xs text-surface-500 pt-4">App Version 1.0.0</p>
    </div>
  );
}
