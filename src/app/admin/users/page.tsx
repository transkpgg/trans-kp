"use client";

import { useState, useRef } from "react";
import { Search, Plus, Filter, MoreVertical, Edit, UserX, CheckCircle, Shield, Trash2, Upload, Download, X } from "lucide-react";
import { mockCurrentAdmin } from "@/lib/mock-data";
import useSWR from "swr";
import { User } from "@/types";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UsersPage() {
  const { data: users, error, mutate } = useSWR("/api/users", fetcher);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [nik, setNik] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [role, setRole] = useState("karyawan");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userData = Array.isArray(users) ? users : [];

  const filteredUsers = userData.filter((user: any) => {
    const matchesSearch = user.full_name.toLowerCase().includes(search.toLowerCase()) || 
                          user.nik.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'super_admin': return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30">Super Admin</span>;
      case 'admin_cabang': return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-brand-500/15 text-brand-400 border border-brand-500/30">Admin</span>;
      default: return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-surface-600/30 text-surface-300 border border-surface-600/50">Karyawan</span>;
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const url = editUserId ? `/api/users/${editUserId}` : "/api/users";
      const method = editUserId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nik, full_name: fullName, username, password, position: jabatan, role
        })
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.message);
      } else {
        setIsModalOpen(false);
        resetForm();
        mutate(); // refresh data
      }
    } catch (e) {
      alert("Error saving user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditUserId(user.id);
    setNik(user.nik);
    setFullName(user.full_name);
    setUsername(user.username);
    setPassword(""); // Jangan tampilkan password yang sudah di-hash
    setJabatan(user.position || user.jabatan || "");
    setRole(user.role);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.message);
      } else {
        mutate();
      }
    } catch (e) {
      alert("Error deleting user");
    }
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditUserId(null);
    setNik("");
    setFullName("");
    setUsername("");
    setPassword("");
    setJabatan("");
    setRole("karyawan");
  };

  const downloadTemplate = () => {
    const templateData = [
      { NIK: "TKP-001", "Nama Lengkap": "Contoh Nama", Username: "contoh", Password: "password123", Jabatan: "Driver", Role: "karyawan" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template User");
    XLSX.writeFile(wb, "Template_Import_User.xlsx");
    toast.success("Template berhasil diunduh!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/users/import", {
        method: "POST",
        body: formData
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`Berhasil import ${result.imported} user`, {
          description: result.skipped > 0 ? `${result.skipped} data dilewati (NIK/Username sudah ada)` : undefined
        });
        mutate();
      } else {
        toast.error(result.message || "Gagal mengimport data");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };


  if (!users) return <div className="p-8 text-center text-white">Loading...</div>;

  return (
    <div className="space-y-6 slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Manajemen Pengguna</h1>
          <p className="text-sm text-surface-400 mt-1">Kelola data karyawan dan hak akses aplikasi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-700 font-medium text-surface-300 hover:bg-surface-800 hover:text-white transition-all text-sm"
          >
            <Download className="w-4 h-4" />
            Template
          </button>
          <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 font-medium text-emerald-400 hover:bg-emerald-500/10 transition-all text-sm cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload className="w-4 h-4" />
            {isUploading ? "Mengupload..." : "Import Excel"}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          </label>
          <button 
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all text-sm"
          >
            <Plus className="w-5 h-5" />
            Tambah User
          </button>
        </div>
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
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              className="w-full pl-10 pr-10 py-2.5 bg-surface-900 border border-surface-700 text-white rounded-xl focus:outline-none focus:border-brand-500 transition-colors placeholder:text-surface-600"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-white transition-colors"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <select 
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-surface-900 border border-surface-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 appearance-none"
            >
              <option value="all">Semua Role</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin_cabang">Admin</option>
              <option value="karyawan">Karyawan</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-surface-300">
            <thead className="bg-surface-900/50 text-surface-400 border-b border-surface-800">
              <tr>
                <th className="p-4 font-medium">Pengguna</th>
                <th className="p-4 font-medium">Jabatan</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {filteredUsers.map((user: any) => (
                <tr key={user.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center font-bold text-white shadow-lg">
                        {user.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-white">{user.full_name}</div>
                        <div className="text-xs text-surface-500">{user.nik}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">{user.position || user.jabatan}</td>
                  <td className="p-4">{getRoleBadge(user.role)}</td>
                  <td className="p-4">
                    {user.is_active ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Aktif
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                        <UserX className="w-3.5 h-3.5" />
                        Nonaktif
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(user)} className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm fade-in">
          <div className="glass-card w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-surface-700">
              <h2 className="text-xl font-bold text-white">
                {editUserId ? "Edit Pengguna" : "Tambah Pengguna Baru"}
              </h2>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">NIK</label>
                  <input value={nik} onChange={e=>setNik(e.target.value)} type="text" className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" placeholder="TKP-xxx" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">Nama Lengkap</label>
                  <input value={fullName} onChange={e=>setFullName(e.target.value)} type="text" className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" placeholder="John Doe" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">Nama User (Login)</label>
                  <input value={username} onChange={e=>setUsername(e.target.value)} type="text" className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" placeholder="johndoe" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">Password</label>
                  <input value={password} onChange={e=>setPassword(e.target.value)} type="text" className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" placeholder="••••••••" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">Jabatan</label>
                  <select value={jabatan} onChange={e=>setJabatan(e.target.value)} className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500">
                    <option value="">Pilih Jabatan</option>
                    <option value="Driver">Driver</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-300">Role</label>
                  <select value={role} onChange={e=>setRole(e.target.value)} className="w-full bg-surface-900 border border-surface-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500">
                    <option value="karyawan">Karyawan</option>
                    <option value="admin_cabang">Admin</option>
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
                onClick={handleSave} disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg transition-all"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
