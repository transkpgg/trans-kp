"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Car, Plus, Search, Edit, Trash2, X, CheckCircle2, Ban, Upload, FileSpreadsheet, Fuel } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const VEHICLE_TYPES = ["Mobil", "Minibus", "Bus", "Truk", "Motor"];

const emptyForm = { nopol: "", type: "Mobil", fuel_consumption: "", notes: "", is_active: true };

export default function VehiclesPage() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/admin/vehicles") {
      router.replace("/admin/master?tab=vehicles");
    }
  }, [pathname, router]);

  const { data, mutate, isLoading } = useSWR("/api/vehicles", fetcher);
  const vehicles: any[] = Array.isArray(data) ? data : [];

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vehicles.filter(
      (v) =>
        v.nopol.toLowerCase().includes(q) ||
        (v.type || "").toLowerCase().includes(q) ||
        (v.name || "").toLowerCase().includes(q) ||
        (v.notes || "").toLowerCase().includes(q)
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
      type: v.type || v.name || "Mobil",
      fuel_consumption:
        v.fuel_consumption !== null && v.fuel_consumption !== undefined ? String(v.fuel_consumption) : "",
      notes: v.notes || "",
      is_active: v.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        name: form.type, // nama kendaraan otomatis disinkronkan dengan jenis kendaraan
      };
      const res = await fetch(editing ? `/api/vehicles/${editing.id}` : "/api/vehicles", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  // Download template Excel untuk impor kendaraan
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Nopol: "B 1234 ABC", "Jenis Kendaraan": "Mobil", "Konsumsi BBM (1 L/km)": 10 },
      { Nopol: "D 5678 XYZ", "Jenis Kendaraan": "Minibus", "Konsumsi BBM (1 L/km)": 8.5 },
    ]);
    ws["!cols"] = [{ wch: 18 }, { wch: 22 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kendaraan");
    XLSX.writeFile(wb, "Template_Kendaraan.xlsx");
  };

  // Impor kendaraan dari file Excel
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/vehicles/import", { method: "POST", body: formData });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message);
        if (result.errors?.length) {
          toast.warning(
            result.errors.slice(0, 5).join("\n") +
              (result.errors.length > 5 ? `\n...dan ${result.errors.length - 5} lainnya` : "")
          );
        }
        mutate();
      } else {
        toast.error(result.message || "Gagal mengimpor file");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-surface-700 text-surface-200 hover:bg-surface-800 transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            Download Template
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-surface-700 text-surface-200 hover:bg-surface-800 transition-colors disabled:opacity-60"
          >
            <Upload className="w-5 h-5 text-sky-400" />
            {isUploading ? "Mengimpor..." : "Import Excel"}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-brand font-medium text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all"
          >
            <Plus className="w-5 h-5" />
            Tambah Kendaraan
          </button>
        </div>
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
              placeholder="Cari nopol, jenis kendaraan..."
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
                <th className="px-4 py-3">Jenis Kendaraan</th>
                <th className="px-4 py-3">Konsumsi BBM (1 L/km)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-surface-500">
                    Memuat data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-surface-500">
                    Belum ada data kendaraan. Tambahkan manual atau gunakan &quot;Import Excel&quot;.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-white">
                      <span className="inline-flex items-center gap-2">
                        <Car className="w-3.5 h-3.5 text-brand-400" />
                        {v.nopol}
                      </span>
                      {v.notes && <p className="text-xs text-surface-500 font-normal ml-5">{v.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-surface-200">
                      {v.type || v.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-surface-300">
                      {v.fuel_consumption !== null && v.fuel_consumption !== undefined ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-800 border border-surface-700 text-amber-300 font-mono text-xs">
                          <Fuel className="w-3 h-3 text-amber-400" />
                          1 : {v.fuel_consumption} km
                        </span>
                      ) : (
                        <span className="text-surface-500">-</span>
                      )}
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
                        <button
                          onClick={() => openEdit(v)}
                          className="p-2 rounded-lg text-surface-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(v)}
                          className="p-2 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Hapus"
                        >
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
              <label className={labelCls}>Jenis Kendaraan <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                <input
                  required
                  placeholder="Contoh: Mobil, Minibus, Hiace, dll."
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className={inputCls}
                  list="vehicle-types-list"
                />
                <datalist id="vehicle-types-list">
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Konsumsi BBM (1 Liter / km)</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min={0}
                  placeholder="Contoh: 10 (artinya 1 liter untuk 10 km)"
                  value={form.fuel_consumption}
                  onChange={(e) => setForm({ ...form, fuel_consumption: e.target.value })}
                  className={cn(inputCls, "pr-16")}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-surface-400 pointer-events-none">
                  km / L
                </span>
              </div>
              <p className="text-[11px] text-surface-500">Format: jarak (km) yang dapat ditempuh per 1 liter bahan bakar.</p>
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
