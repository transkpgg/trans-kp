"use client";

import { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { MapPin, Plus, Search, Edit, Trash2, X, Route, CheckCircle2, Ban, DownloadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { INDONESIA_CITIES } from "@/lib/indonesia-cities";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const emptyForm = { city: "", province: "", distance_km: "", notes: "", is_active: true };

export default function DestinationsPage() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/admin/destinations") {
      router.replace("/admin/master?tab=destinations");
    }
  }, [pathname, router]);
  const { data, mutate, isLoading } = useSWR("/api/destinations", fetcher);
  const destinations: any[] = Array.isArray(data) ? data : [];

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return destinations.filter(
      (d) => d.city.toLowerCase().includes(q) || (d.province || "").toLowerCase().includes(q)
    );
  }, [destinations, search]);

  const activeCount = destinations.filter((d) => d.is_active).length;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (d: any) => {
    setEditing(d);
    setForm({
      city: d.city,
      province: d.province || "",
      distance_km: d.distance_km ? String(d.distance_km) : "",
      notes: d.notes || "",
      is_active: d.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(editing ? `/api/destinations/${editing.id}` : "/api/destinations", {
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
        toast.error(result.message || "Gagal menyimpan kota tujuan");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (d: any) => {
    if (!confirm(`Hapus kota tujuan ${d.city}?`)) return;
    const res = await fetch(`/api/destinations/${d.id}`, { method: "DELETE" });
    const result = await res.json();
    if (res.ok) {
      toast.success(result.message);
      mutate();
    } else {
      toast.error(result.message || "Gagal menghapus");
    }
  };

  const toggleActive = async (d: any) => {
    await fetch(`/api/destinations/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !d.is_active }),
    });
    mutate();
  };

  // Impor daftar kota Indonesia bawaan ke master (yang sudah ada dilewati)
  const importDefaultCities = async () => {
    if (!confirm(`Impor ${INDONESIA_CITIES.length} kota bawaan ke Master Luar Kota?`)) return;
    setIsImporting(true);
    const existing = new Set(destinations.map((d) => d.city.toLowerCase()));
    let added = 0;
    for (const city of INDONESIA_CITIES) {
      if (existing.has(city.toLowerCase())) continue;
      const res = await fetch("/api/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      });
      if (res.ok) added++;
    }
    setIsImporting(false);
    toast.success(`${added} kota berhasil diimpor`);
    mutate();
  };

  const inputCls =
    "w-full bg-surface-950 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50";
  const labelCls = "text-xs font-semibold uppercase tracking-wider text-surface-400";

  return (
    <div className="space-y-6 slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Master Luar Kota</h1>
          <p className="text-sm text-surface-400 mt-1">Kelola daftar kota tujuan perjalanan luar kota untuk Bon Pengemudi.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={importDefaultCities}
            disabled={isImporting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-surface-700 text-surface-200 hover:bg-surface-800 transition-colors disabled:opacity-60"
          >
            <DownloadCloud className="w-5 h-5" />
            {isImporting ? "Mengimpor..." : "Impor Kota Bawaan"}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all"
          >
            <Plus className="w-5 h-5" />
            Tambah Kota Tujuan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Kota Tujuan", value: destinations.length, icon: MapPin, color: "text-brand-400 bg-brand-500/10" },
          { label: "Aktif", value: activeCount, icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10" },
          { label: "Nonaktif", value: destinations.length - activeCount, icon: Ban, color: "text-surface-400 bg-surface-800" },
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
              placeholder="Cari kota atau provinsi..."
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
                <th className="px-4 py-3">Kota Tujuan</th>
                <th className="px-4 py-3">Provinsi</th>
                <th className="px-4 py-3">Jarak</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-surface-500">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-surface-500">
                    Belum ada kota tujuan. Tambahkan manual atau gunakan &quot;Impor Kota Bawaan&quot;.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">
                      <span className="inline-flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-brand-400" />{d.city}</span>
                      {d.notes && <p className="text-xs text-surface-500 font-normal ml-5">{d.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-surface-300">{d.province || "-"}</td>
                    <td className="px-4 py-3 text-surface-300">
                      {d.distance_km ? (
                        <span className="inline-flex items-center gap-1"><Route className="w-3.5 h-3.5" />{d.distance_km} km</span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(d)}
                        className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border transition-colors",
                          d.is_active
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-surface-900/50 text-surface-400 border-surface-700"
                        )}
                      >
                        {d.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(d)} className="p-2 rounded-lg text-surface-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(d)} className="p-2 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Hapus">
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
              <h2 className="text-lg font-bold text-white">{editing ? "Edit Kota Tujuan" : "Tambah Kota Tujuan"}</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-surface-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Kota Tujuan <span className="text-red-400">*</span></label>
              <input
                required
                placeholder="Contoh: Bandung"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Provinsi</label>
                <input
                  placeholder="Contoh: Jawa Barat"
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Jarak (km)</label>
                <input
                  type="number"
                  min={0}
                  value={form.distance_km}
                  onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
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
              Kota tujuan aktif
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
