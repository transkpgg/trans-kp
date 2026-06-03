"use client";

import { useState } from "react";
import { Search, Plus, Filter, MoreVertical, Edit, UserX, CheckCircle, Shield } from "lucide-react";
import { mockUsers, mockBranches, mockCurrentAdmin } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { User } from "@/types";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter users
  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(search.toLowerCase()) || 
                          user.nik.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    const matchesBranch = selectedBranch === "all" || user.branch_id === selectedBranch;
    return matchesSearch && matchesRole && matchesBranch;
  });

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'super_admin': return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30">Super Admin</span>;
      case 'admin_cabang': return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-brand-500/15 text-brand-400 border border-brand-500/30">Admin Cabang</span>;
      default: return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-surface-600/30 text-surface-300 border border-surface-600/50">Karyawan</span>;
    }
  };

  return (
    <div className="space-y-6 slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manajemen Pengguna</h1>
          <p className="text-sm text-surface-400 mt-1">Kelola data karyawan dan hak akses aplikasi.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all"
        >
          <Plus className="w-5 h-5" />
          Tambah User
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input 
              type="text" 
              placeholder="Cari nama atau NIK..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <select 
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-surface-900 border border-surface-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 appearance-none pr-10 relative"
            >
              <option value="all">Semua Role</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin_cabang">Admin Cabang</option>
              <option value="karyawan">Karyawan</option>
            </select>
            <select 
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-surface-900 border border-surface-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Cabang</option>
              {mockBranches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-surface-800 bg-surface-900/50">
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Info Karyawan</th>
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Kontak</th>
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Role & Penempatan</th>
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/50">
              {filteredUsers.length > 0 ? filteredUsers.map((user, idx) => (
                <tr key={user.id} className="hover:bg-surface-800/30 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center font-bold text-white">
                        {user.full_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.full_name}</p>
                        <p className="text-xs text-brand-400 font-mono mt-0.5">{user.nik}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-surface-200">{user.email}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{user.phone || '-'}</p>
                  </td>
                  <td className="p-4">
                    <div className="mb-1.5">{getRoleBadge(user.role)}</div>
                    <p className="text-xs text-surface-300">{user.branch_name}</p>
                    <p className="text-[10px] text-surface-500 mt-0.5">{user.jabatan}</p>
                  </td>
                  <td className="p-4">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-surface-800 text-surface-400 border border-surface-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-surface-500" /> Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-surface-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-surface-400">
                    Tidak ada data pengguna yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-surface-800 flex items-center justify-between text-sm text-surface-400 bg-surface-900/30">
          <p>Menampilkan {filteredUsers.length} dari {mockUsers.length} pengguna</p>
          <div className="flex gap-1">
            <button className="px-3 py-1 rounded-lg border border-surface-700 hover:bg-surface-800 disabled:opacity-50">Prev</button>
            <button className="px-3 py-1 rounded-lg border border-surface-700 bg-surface-800 text-white">1</button>
            <button className="px-3 py-1 rounded-lg border border-surface-700 hover:bg-surface-800 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* Add User Modal Placeholder */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="glass-card w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-surface-700">
              <h2 className="text-xl font-bold text-white">Tambah Pengguna Baru</h2>
              <p className="text-sm text-surface-400 mt-1">Masukkan data karyawan untuk memberikan akses aplikasi.</p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">NIK</label>
                  <input type="text" className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" placeholder="TKP-xxx" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">Nama Lengkap</label>
                  <input type="text" className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" placeholder="John Doe" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">Nama User (Login)</label>
                  <input type="text" className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" placeholder="johndoe" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">Password</label>
                  <input type="password" className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" placeholder="••••••••" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">Jabatan</label>
                  <select className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500">
                    <option value="">Pilih Jabatan</option>
                    <option value="Driver">Driver</option>
                    <option value="Admin Operasional">Admin Operasional</option>
                    <option value="Staff HRD">Staff HRD</option>
                    <option value="Mekanik">Mekanik</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">Role</label>
                  <select className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500">
                    <option value="karyawan">Karyawan</option>
                    {mockCurrentAdmin.role === "super_admin" && (
                      <option value="admin_cabang">Admin</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-surface-700 bg-surface-900/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-surface-700 font-medium text-white hover:bg-surface-800 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg transition-all"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
