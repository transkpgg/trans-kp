import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-trans-kp-2024'
);

async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    if (!payload.id) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        nik: true,
        full_name: true,
        username: true,
        role: true,
        jabatan: true,
      }
    });
    return user;
  } catch (e) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const isTeknisi = user.jabatan === 'Teknisi';
    const isMaintenanceAdmin = user.jabatan === 'Admin Perawatan Kendaraan';
    const isSuperAdmin = user.role === 'super_admin' || user.role === 'admin';

    if (!isTeknisi && !isMaintenanceAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { message: 'Akses ditolak: Menu ini khusus untuk Teknisi dan Admin Perawatan Kendaraan' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const formatType = searchParams.get('format') || 'penumpang';
    const scope = searchParams.get('scope') || 'filtered';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};

    if (scope !== 'all') {
      if (status && status !== 'all') {
        if (status === 'laik') {
          where.status = 'Baik / Laik Jalan';
        } else if (status === 'perbaikan') {
          where.status = 'Perlu Perbaikan';
        } else {
          where.status = status;
        }
      }

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = new Date(`${startDate}T00:00:00.000Z`);
        }
        if (endDate) {
          where.date.lte = new Date(`${endDate}T23:59:59.999Z`);
        }
      }

      if (search) {
        where.OR = [
          { nopol: { contains: search, mode: 'insensitive' } },
          { driver_name: { contains: search, mode: 'insensitive' } },
          { technician_name: { contains: search, mode: 'insensitive' } },
          { destination: { contains: search, mode: 'insensitive' } },
          { general_notes: { contains: search, mode: 'insensitive' } },
          { checklist_no: { contains: search, mode: 'insensitive' } },
        ];
      }
    }

    const checklists = await prisma.vehicleChecklist.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        technician: {
          select: {
            id: true,
            nik: true,
            full_name: true,
            username: true,
          }
        }
      }
    });

    const vehicles = await prisma.vehicle.findMany({
      select: {
        nopol: true,
        type: true,
        name: true,
      }
    });

    const wb = XLSX.utils.book_new();
    let fileName = '';

    const sortedAllItems = [...checklists].sort((a: any, b: any) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return (b.inspection_time || '').localeCompare(a.inspection_time || '');
    });

    if (formatType === 'penumpang') {
      const groupedByDate: Record<string, any[]> = {};
      sortedAllItems.forEach((item: any) => {
        const dStr = item.date ? format(new Date(item.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        if (!groupedByDate[dStr]) {
          groupedByDate[dStr] = [];
        }
        groupedByDate[dStr].push(item);
      });

      const dateKeys = Object.keys(groupedByDate).sort().reverse();
      const hasMultipleDates = dateKeys.length > 1;

      // SHEET 1: SEMUA DATA (Semua ceklis muncul bersamaan di sheet utama)
      const mainRows: any[][] = sortedAllItems.map((c: any, index: number) => {
        const vMatch = vehicles.find((v: any) =>
          v.nopol?.replace(/\s+/g, '').toUpperCase() === (c.nopol || '').replace(/\s+/g, '').toUpperCase()
        );
        const jenisKend = vMatch?.type || vMatch?.name || 'Mini Bus';

        let formattedKm = c.kilometer || '-';
        const cleanKm = Number(String(c.kilometer).replace(/[^0-9]/g, ''));
        if (!isNaN(cleanKm) && cleanKm > 0) {
          formattedKm = cleanKm.toLocaleString('en-US');
        }

        const formattedJam = (c.inspection_time || '-').replace(':', '.');
        const formattedTgl = c.date ? format(new Date(c.date), 'dd/MM/yyyy') : '-';
        const tujuan = c.destination || '-';
        const pengemudi = c.driver_name || c.technician_name || '-';
        const keterangan = c.status === 'Baik / Laik Jalan' ? 'Siap' : (c.general_notes || c.status || '-');

        if (hasMultipleDates) {
          return [
            index + 1,
            c.nopol || '-',
            jenisKend,
            formattedTgl,
            formattedJam,
            formattedKm,
            pengemudi,
            tujuan,
            keterangan,
          ];
        } else {
          return [
            index + 1,
            c.nopol || '-',
            jenisKend,
            formattedKm,
            formattedJam,
            pengemudi,
            tujuan,
            keterangan,
          ];
        }
      });

      let mainSubtitle = '';
      if (dateKeys.length === 1) {
        mainSubtitle = `TANGGAL ${format(new Date(dateKeys[0]), 'd MMMM yyyy', { locale: id })}`;
      } else if (dateKeys.length > 1) {
        const newest = format(new Date(dateKeys[0]), 'd MMM yyyy', { locale: id });
        const oldest = format(new Date(dateKeys[dateKeys.length - 1]), 'd MMM yyyy', { locale: id });
        mainSubtitle = `PERIODE: ${oldest} s/d ${newest}`;
      } else {
        mainSubtitle = `TANGGAL ${format(new Date(), 'd MMMM yyyy', { locale: id })}`;
      }

      const mainHeader = hasMultipleDates
        ? ['No Urut', 'No Pol', 'Jenis Kend.', 'Tanggal', 'Jam', 'KM', 'Pengemudi', 'Tujuan', 'Keterangan']
        : ['No Urut', 'No Pol', 'Jenis Kend.', 'KM', 'Jam', 'Pengemudi', 'Tujuan', 'Keterangan'];

      const mainSheetData: any[][] = [
        [],
        [],
        ['LAPORAN CHEK LIST KENDARAAN PENUMPANG'],
        [mainSubtitle],
        [],
        mainHeader,
        ...mainRows,
      ];

      const wsMain = XLSX.utils.aoa_to_sheet(mainSheetData);
      const maxColIdx = mainHeader.length - 1;
      wsMain['!merges'] = [
        { s: { r: 2, c: 0 }, e: { r: 2, c: maxColIdx } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: maxColIdx } },
      ];

      wsMain['!cols'] = [
        { wch: 8 },
        { wch: 15 },
        { wch: 14 },
        ...(hasMultipleDates ? [{ wch: 13 }] : []),
        { wch: 10 },
        { wch: 14 },
        { wch: 24 },
        { wch: 18 },
        { wch: 15 },
      ];

      const mainSheetName = hasMultipleDates ? 'Semua Ceklis' : (dateKeys.length > 0 ? format(new Date(dateKeys[0]), 'ddMMMyy', { locale: id }) : 'Ceklis');
      XLSX.utils.book_append_sheet(wb, wsMain, mainSheetName);

      // JIKA LEBIH DARI 1 TANGGAL: Tambahkan tab per tanggal
      if (hasMultipleDates) {
        dateKeys.forEach((dateKey) => {
          const items = groupedByDate[dateKey];
          const dateObj = new Date(dateKey);
          const tabName = format(dateObj, 'ddMMMyy', { locale: id });
          const singleDateTitle = format(dateObj, 'd MMMM yyyy', { locale: id });

          const dailyRows: any[][] = items.map((c: any, idx: number) => {
            const vMatch = vehicles.find((v: any) =>
              v.nopol?.replace(/\s+/g, '').toUpperCase() === (c.nopol || '').replace(/\s+/g, '').toUpperCase()
            );
            const jenisKend = vMatch?.type || vMatch?.name || 'Mini Bus';

            let formattedKm = c.kilometer || '-';
            const cleanKm = Number(String(c.kilometer).replace(/[^0-9]/g, ''));
            if (!isNaN(cleanKm) && cleanKm > 0) {
              formattedKm = cleanKm.toLocaleString('en-US');
            }

            const formattedJam = (c.inspection_time || '-').replace(':', '.');
            const tujuan = c.destination || '-';
            const pengemudi = c.driver_name || c.technician_name || '-';
            const keterangan = c.status === 'Baik / Laik Jalan' ? 'Siap' : (c.general_notes || c.status || '-');

            return [
              idx + 1,
              c.nopol || '-',
              jenisKend,
              formattedKm,
              formattedJam,
              pengemudi,
              tujuan,
              keterangan,
            ];
          });

          const dailySheetData: any[][] = [
            [],
            [],
            ['LAPORAN CHEK LIST KENDARAAN PENUMPANG'],
            [`TANGGAL ${singleDateTitle}`],
            [],
            ['No Urut', 'No Pol', 'Jenis Kend.', 'KM', 'Jam', 'Pengemudi', 'Tujuan', 'Keterangan'],
            ...dailyRows,
          ];

          const wsDaily = XLSX.utils.aoa_to_sheet(dailySheetData);
          wsDaily['!merges'] = [
            { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
          ];
          wsDaily['!cols'] = [
            { wch: 8 },
            { wch: 15 },
            { wch: 14 },
            { wch: 14 },
            { wch: 10 },
            { wch: 24 },
            { wch: 18 },
            { wch: 15 },
          ];

          XLSX.utils.book_append_sheet(wb, wsDaily, tabName);
        });
      }

      fileName = `Laporan_Chek_List_Kendaraan_Penumpang_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    } else {
      const exportData = sortedAllItems.map((c: any, index: number) => {
        const vMatch = vehicles.find((v: any) =>
          v.nopol?.replace(/\s+/g, '').toUpperCase() === (c.nopol || '').replace(/\s+/g, '').toUpperCase()
        );
        return {
          'No': index + 1,
          'No Ceklis': c.checklist_no || '-',
          'Tanggal': format(new Date(c.date), 'dd/MM/yyyy'),
          'Jam': c.inspection_time || '-',
          'Nomor Polisi': c.nopol,
          'Jenis Kendaraan': vMatch?.type || vMatch?.name || 'Mobil',
          'Kilometer (KM)': c.kilometer,
          'Indikator BBM': c.fuel_level,
          'Tujuan Keberangkatan': c.destination || '-',
          'Status Kelayakan': c.status,
          'Nama Pengemudi': c.driver_name || '-',
          'Teknisi Pemeriksa': c.technician_name || '-',
          'Pengawas': c.supervisor_name || '-',
          'Oli Mesin': c.engine_oil,
          'Air Radiator': c.radiator_water,
          'Accu / Air Accu': c.battery_water,
          'Oli Powersteer': c.power_steering_oil,
          'V. Belt': c.v_belt,
          'Understell': c.understell,
          'Indikator Dashboard': c.dashboard_indicator,
          'Kondisi Mesin': c.engine_condition,
          'Kunci Roda': c.wheel_wrench,
          'Dongkrak': c.jack,
          'Segitiga Pengaman': c.safety_triangle,
          'Kotak P3K': c.first_aid_box,
          'STNK / PKB': c.stnk_pkb,
          'Ban Utama': c.main_tire_condition,
          'Ban Serep': c.spare_tire_condition,
          'Kondisi AC': c.ac_condition,
          'Radio / Tape': c.radio_tape,
          'Pemantik Rokok': c.cigarette_lighter,
          'Lampu-Lampu': c.lights_condition,
          'Catatan Lampu': c.lights_notes || '-',
          'Kerja Rem': c.brake_operation,
          'Minyak Rem': c.brake_fluid,
          'Rem Tangan': c.hand_brake,
          'Catatan Umum': c.general_notes || '-',
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Data Ceklis Lengkap');
      fileName = `Rekap_Lengkap_Ceklis_Kendaraan_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    }

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating Excel export:', error);
    return NextResponse.json({ message: 'Gagal mengekspor data Excel' }, { status: 500 });
  }
}
