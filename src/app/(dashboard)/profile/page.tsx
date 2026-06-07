"use client";

import { User, Briefcase, Camera, LogOut, ShieldCheck } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useRouter } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ProfilePage() {
  const router = useRouter();
  const { data: meData } = useSWR("/api/auth/me", fetcher);
  const currentUser = meData?.user || { full_name: "Memuat...", jabatan: "...", nik: "-", role: "-", username: "-" };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  return (
    <div className="space-y-6 pb-6 slide-up">
      
      {/* Avatar Header */}
      <div className="flex flex-col items-center justify-center pt-8 pb-6">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full gradient-brand flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-brand-500/20">
            {getInitials(currentUser.full_name)}
          </div>
          <button className="absolute bottom-0 right-0 p-2 rounded-full bg-surface-800 border border-surface-600 text-white hover:bg-surface-700 transition-colors shadow-lg">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <h1 className="text-xl font-bold text-white">{currentUser.full_name}</h1>
        <p className="text-brand-400 font-medium text-sm mt-1">{currentUser.jabatan}</p>
      </div>

      {/* Info List */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-800 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-surface-800">
            <User className="w-5 h-5 text-surface-300" />
          </div>
          <div>
            <p className="text-xs text-surface-400">Nomor Induk Karyawan (NIK)</p>
            <p className="font-medium text-white">{currentUser.nik}</p>
          </div>
        </div>
        
        <div className="p-4 border-b border-surface-800 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-surface-800">
            <Briefcase className="w-5 h-5 text-surface-300" />
          </div>
          <div>
            <p className="text-xs text-surface-400">Jabatan</p>
            <p className="font-medium text-white">{currentUser.jabatan}</p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-surface-800">
            <ShieldCheck className="w-5 h-5 text-surface-300" />
          </div>
          <div>
            <p className="text-xs text-surface-400">Username / Hak Akses</p>
            <p className="font-medium text-white">{currentUser.username} <span className="text-brand-400 text-xs ml-2 capitalize">({currentUser.role.replace("_", " ")})</span></p>
          </div>
        </div>
      </div>

      {/* Note about editing */}
      <div className="p-4 rounded-xl bg-surface-900/50 border border-surface-800 text-center">
        <p className="text-xs text-surface-400">Perubahan data profil atau password hanya dapat dilakukan oleh Administrator.</p>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 font-medium transition-colors mt-8">
        <LogOut className="w-5 h-5" />
        Keluar
      </button>

      <p className="text-center text-xs text-surface-500 pt-4">App Version {process.env.APP_VERSION || "1.0.0"}</p>
    </div>
  );
}
