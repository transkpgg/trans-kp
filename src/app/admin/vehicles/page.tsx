"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Car, Plus, Search, Edit, Trash2, X, Users, CheckCircle2, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const VEHICLE_TYPES = ["Mobil", "Minibus", "Bus", "Truk", "Motor"];

const emptyForm = { nopol: "", name: "", type: "Mobil", capacity: "", notes: "", is_active: true };

export default function VehiclesPage() {
  const { data, mutate, isLoading } = useSWR("/api/vehicles", fetcher);
  const vehicles: any[] = Array.isArray(data) ? data : [];

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vehicles.filter(
      (v) => v.nopol.toLowerCase().includes(q) || v.name.toLowerCase().includes(q) || v.type.toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  const activeCount = vehicles.filter((v) => v.is_active).length;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (v: any) => {
    setEditing(v);
    setForm({
      nopol: v.nopol,
      name: v.name,
      type: v.type,
      capacity: v.capacity ? String(v.capacity) : "",
      notes: v.notes || "",
      is_active: v.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(editing ? `/api/vehicles/${editing.id}` : "/api/vehicles", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message);
        setIsModalOpen(false);
        mutate();
      } else {
        toast.error(result.message || "Gagal menyimpan kendaraan");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (v: any) => {
    if (!confirm(`Hapus kendaraan ${v.nopol}?`)) return;
    const res = await fetch(`/api/vehicles/${v.id}`, { method: "DELETE" });
    const result = await res.json();
    if (res.ok) {
      toast.success(result.message);
      mutate();
    } else {
      toast.error(result.message || "Gagal menghapus");
    }
  };

  const toggleActive = async (v: any) => {
    await fetch(`/api/vehicles/${v.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !v.is_active }),
    });
    mutate();
  };

  const inputCls =
    "w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50";
  const labelCls = "text-xs font-semibold uppercase tracking-wider text-surface-400";

  return (
    <div className="space-y-6 slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Master Kendaraan</h1>
          <p className="text-sm text-surface-400 mt-1">Kelola data kendaraan operasional (Nopol) untuk Bon Pengemudi.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all"
        >
          <Plus className="w-5 h-5" />
          Tambah Kendaraan
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Kendaraan", value: vehicles.length, icon: Car, color: "text-brand-400 bg-brand-500/10" },
          { label: "Aktif", value: activeCount, icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10" },
          { label: "Nonaktif", value: vehicles.length - activeCount, icon: Ban, color: "text-surface-400 bg-surface-800" },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-surface-400 uppercase font-semibold tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
            <input
              type="text"
              placeholder="Cari nopol, nama, atau tipe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(inputCls, "pl-10")}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-surface-400 border-b border-surface-800 bg-surface-900/50">
                <th className="px-4 py-3">Nopol</th>
                <th className="px-4 py-3">Nama Kendaraan</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">Kapasitas</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-surface-500">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-surface-500">Belum ada data kendaraan.</td></tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-white">{v.nopol}</td>
                    <td className="px-4 py-3 text-surface-200">
                      {v.name}
                      {v.notes && <p className="text-xs text-surface-500">{v.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-surface-300">{v.type}</td>
                    <td className="px-4 py-3 text-surface-300">
                      {v.capacity ? (
                        <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{v.capacity}</span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(v)}
                        className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border transition-colors",
                          v.is_active
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-surface-900/50 text-surface-400 border-surface-700"
                        )}
                      >
                        {v.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(v)} className="p-2 rounded-lg text-surface-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(v)} className="p-2 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="glass-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editing ? "Edit Kendaraan" : "Tambah Kendaraan"}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Nopol <span className="text-red-400">*</span></label>
              <input
                required
                placeholder="Contoh: B 1234 ABC"
                value={form.nopol}
                onChange={(e) => setForm({ ...form, nopol: e.target.value.toUpperCase() })}
                className={cn(inputCls, "uppercase")}
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Nama / Merk Kendaraan <span className="text-red-400">*</span></label>
              <input
                required
                placeholder="Contoh: Toyota Hiace"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Tipe</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                  {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Kapasitas (Kursi)</label>
                <input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Catatan</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
            </div>

            <label className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="accent-brand-500 w-4 h-4" />
              Kendaraan aktif
            </label>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-surface-700 text-surface-300 hover:bg-surface-800 transition-colors">
                Batal
              </button>
              <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 rounded-xl gradient-brand font-medium text-white disabled:opacity-60">
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
