"use client";

import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ClipboardCheck, Printer, X } from "lucide-react";

export function ChecklistDocumentModal({ item, onClose }: { item: any; onClose: () => void }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="glass-card max-w-3xl w-full my-6 overflow-hidden rounded-2xl border border-surface-700 shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-surface-700 flex items-center justify-between bg-surface-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-brand-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">Lembar Ceklist Fisik Kendaraan</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak
            </button>
            <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded-lg text-surface-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body (Replikasi Kertas Cetak PT Gudang Garam Tbk. Kediri) */}
        <div className="p-6 overflow-y-auto bg-white text-black font-sans space-y-4 print:p-0">
          {/* Header Surat */}
          <div className="border-b-2 border-black pb-3 text-center relative">
            <p className="text-xs font-bold tracking-wider text-left uppercase">PT. GUDANG GARAM Tbk. Kediri</p>
            {item.destination && (
              <span className="absolute top-0 right-0 text-sm font-bold font-serif italic text-blue-900">
                {item.destination}
              </span>
            )}
            <h3 className="text-base sm:text-lg font-extrabold uppercase mt-2 tracking-tight">
              CEK LIST KONDISI KENDARAAN
            </h3>
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider">
              SEBELUM KEBERANGKATAN
            </h4>
          </div>

          {/* Table Header Info */}
          <table className="w-full border-collapse border border-black text-xs">
            <tbody>
              <tr>
                <td className="border border-black p-2 font-bold w-1/4 bg-gray-100">Nomor Polisi</td>
                <td className="border border-black p-2 font-bold text-sm tracking-wider font-mono">{item.nopol}</td>
                <td className="border border-black p-2 font-bold w-1/4 bg-gray-100">Jam Pemeriksaan</td>
                <td className="border border-black p-2 font-mono">{item.inspection_time || "-"}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-bold bg-gray-100">Posisi Kilometer</td>
                <td className="border border-black p-2 font-bold font-mono">{item.kilometer?.toLocaleString()} KM</td>
                <td className="border border-black p-2 font-bold bg-gray-100">Posisi Indikator BBM</td>
                <td className="border border-black p-2 font-bold font-mono">{item.fuel_level}</td>
              </tr>
            </tbody>
          </table>

          {/* Table Checklist Items */}
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-black p-1.5 text-left w-1/3">Komponen Yang Diperiksa</th>
                <th className="border border-black p-1.5 text-center w-1/5">Kosong / Rusak</th>
                <th className="border border-black p-1.5 text-center w-1/5">Kurang / Kurang Baik</th>
                <th className="border border-black p-1.5 text-center w-1/5">Cukup / Baik / Ada</th>
              </tr>
            </thead>
            <tbody>
              {/* KONDISI MESIN & CAIRAN */}
              <CheckRowItem label="Oli Mesin" val={item.engine_oil} optKosong="Kosong" optKurang="Kurang" optBaik="Cukup" />
              <CheckRowItem label="Air Radiator" val={item.radiator_water} optKosong="Kosong" optKurang="Kurang" optBaik="Cukup" />
              <CheckRowItem label="Accu / Air Accu" val={item.battery_water} optKosong="Kosong" optKurang="Kurang" optBaik="Cukup" />
              <CheckRowItem label="Oli Powersteer" val={item.power_steering_oil} optKosong="Kosong" optKurang="Kurang" optBaik="Cukup" />
              <CheckRowItem label="V. Belt / Multibelt" val={item.v_belt} optKosong="Rusak" optKurang="Kurang Baik" optBaik="Baik" />
              <CheckRowItem label="Understell" val={item.understell} optKosong="Rusak" optKurang="Kurang Baik" optBaik="Baik" />
              <CheckRowItem label="Indikator Dash Board" val={item.dashboard_indicator} optKosong="Rusak" optKurang="Kurang Baik" optBaik="Baik" />
              <CheckRowItem label="Kondisi Mesin" val={item.engine_condition} optKosong="Rusak" optKurang="Kurang Baik" optBaik="Baik" />

              {/* KELENGKAPAN */}
              <tr className="bg-gray-100 font-bold">
                <td colSpan={4} className="border border-black p-1 uppercase text-[11px]">KELENGKAPAN</td>
              </tr>
              <CheckRowItem label="Kunci Roda" val={item.wheel_wrench} optKosong="Rusak" optKurang="Tidak Ada" optBaik="Ada" />
              <CheckRowItem label="Dongkrak" val={item.jack} optKosong="Rusak" optKurang="Tidak Ada" optBaik="Ada" />
              <CheckRowItem label="Segitiga Pengaman" val={item.safety_triangle} optKosong="Rusak" optKurang="Tidak Ada" optBaik="Ada" />
              <CheckRowItem label="Kotak P3K" val={item.first_aid_box} optKosong="Rusak" optKurang="Tidak Ada" optBaik="Ada" />
              <CheckRowItem label="STNK + Pajak (PKB)" val={item.stnk_pkb} optKosong="Rusak" optKurang="Tidak Ada" optBaik="Ada" />

              {/* BAN */}
              <tr className="bg-gray-100 font-bold">
                <td colSpan={4} className="border border-black p-1 uppercase text-[11px]">BAN UTAMA & BAN SEREP</td>
              </tr>
              <CheckRowItem label="Kondisi Ban Utama" val={item.main_tire_condition} optKosong="Rusak" optKurang="Kurang Baik" optBaik="Baik" />
              <CheckRowItem label="Kondisi Ban Serep" val={item.spare_tire_condition} optKosong="Rusak" optKurang="Kurang Baik" optBaik="Baik" />

              {/* ACCESORIES */}
              <tr className="bg-gray-100 font-bold">
                <td colSpan={4} className="border border-black p-1 uppercase text-[11px]">ACCESORIES & LAMPU</td>
              </tr>
              <CheckRowItem label="Kondisi AC" val={item.ac_condition} optKosong="Tidak dingin" optKurang="Kurang dingin" optBaik="Dingin" />
              <CheckRowItem label="Radio / Tape" val={item.radio_tape} optKosong="Rusak" optKurang="Tidak Ada" optBaik="Baik" />
              <CheckRowItem label="Pemantik Rokok" val={item.cigarette_lighter} optKosong="Rusak" optKurang="Tidak Ada" optBaik="Baik" />
              <CheckRowItem label="Lampu-Lampu" val={item.lights_condition} optKosong="Rusak" optKurang="Tidak Ada" optBaik="Baik" />

              {/* REM */}
              <tr className="bg-gray-100 font-bold">
                <td colSpan={4} className="border border-black p-1 uppercase text-[11px]">SISTEM REM</td>
              </tr>
              <CheckRowItem label="Kerja Rem" val={item.brake_operation} optKosong="Rusak" optKurang="Kurang Baik" optBaik="Baik" />
              <CheckRowItem label="Minyak Rem / Kopling" val={item.brake_fluid} optKosong="Kosong" optKurang="Kurang" optBaik="Baik" />
              <CheckRowItem label="Rem Tangan" val={item.hand_brake} optKosong="Rusak" optKurang="Kurang Baik" optBaik="Baik" />
            </tbody>
          </table>

          {/* Keterangan Lampu & Catatan */}
          {(item.lights_notes || item.general_notes) && (
            <div className="p-2 border border-black text-xs space-y-1 bg-gray-50">
              {item.lights_notes && <p><strong>Keterangan Lampu:</strong> {item.lights_notes}</p>}
              {item.general_notes && <p><strong>Catatan Tambahan:</strong> {item.general_notes}</p>}
            </div>
          )}

          {/* Tanda Tangan Footer Sesuai Dokumen Fisik */}
          <div className="pt-4 text-xs">
            <p className="font-bold text-right mb-2">
              Kediri, {format(new Date(item.date), "dd MMMM yyyy", { locale: id })}
            </p>
            <div className="grid grid-cols-3 text-center border-t border-black pt-2">
              <div>
                <p className="font-bold">Yang membuat,</p>
                <p className="text-[11px] text-gray-700">Pengemudi</p>
                <div className="h-16 flex items-center justify-center my-1">
                  {item.driver_signature ? (
                    <img src={item.driver_signature} alt="TTD Pengemudi" className="max-h-14 object-contain" />
                  ) : (
                    <span className="text-gray-400 italic text-[10px]">(Sudah diverifikasi)</span>
                  )}
                </div>
                <p className="font-bold uppercase tracking-tight">({item.driver_name || "..................."})</p>
              </div>

              <div>
                <p className="font-bold">Menyetujui,</p>
                <p className="text-[11px] text-gray-700">Perawatan (Teknisi)</p>
                <div className="h-16 flex items-center justify-center my-1">
                  {item.technician_signature ? (
                    <img src={item.technician_signature} alt="TTD Teknisi" className="max-h-14 object-contain" />
                  ) : (
                    <span className="text-gray-400 italic text-[10px]">(Sudah diverifikasi)</span>
                  )}
                </div>
                <p className="font-bold uppercase tracking-tight">({item.technician_name || "..................."})</p>
              </div>

              <div>
                <p className="font-bold">Mengetahui,</p>
                <p className="text-[11px] text-gray-700">Pengawas</p>
                <div className="h-16 flex items-center justify-center my-1">
                  {item.supervisor_signature ? (
                    <img src={item.supervisor_signature} alt="TTD Pengawas" className="max-h-14 object-contain" />
                  ) : (
                    <span className="text-gray-400 italic text-[10px]">(Sudah diverifikasi)</span>
                  )}
                </div>
                <p className="font-bold uppercase tracking-tight">({item.supervisor_name || "..................."})</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckRowItem({
  label,
  val,
  optKosong,
  optKurang,
  optBaik,
}: {
  label: string;
  val: string;
  optKosong: string;
  optKurang: string;
  optBaik: string;
}) {
  return (
    <tr>
      <td className="border border-black p-1 font-medium">{label}</td>
      <td className="border border-black p-1 text-center font-bold font-mono">
        {val === optKosong ? "✓ " + optKosong : ""}
      </td>
      <td className="border border-black p-1 text-center font-bold font-mono">
        {val === optKurang ? "✓ " + optKurang : ""}
      </td>
      <td className="border border-black p-1 text-center font-bold font-mono">
        {val === optBaik ? "✓ " + optBaik : ""}
      </td>
    </tr>
  );
}
