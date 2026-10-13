import { format, isWeekend, addDays, startOfDay, isBefore, isAfter, isSameDay } from "date-fns";
import { id as localeId } from "date-fns/locale";

export interface MealSlotDef {
  key: "ekstra_03" | "pagi_08" | "siang_12" | "malam_19" | "ekstra_21";
  label: string;
  timeStr: string; // "03:00"
  hour: number;
  minute: number;
  workdayRate: number;
  holidayRate: number;
}

export const MEAL_SLOT_DEFS: MealSlotDef[] = [
  {
    key: "ekstra_03",
    label: "Ekstra (E)",
    timeStr: "03:00",
    hour: 3,
    minute: 0,
    workdayRate: 20000,
    holidayRate: 40000,
  },
  {
    key: "pagi_08",
    label: "Pagi (P)",
    timeStr: "08:00",
    hour: 8,
    minute: 0,
    workdayRate: 25000,
    holidayRate: 50000,
  },
  {
    key: "siang_12",
    label: "Siang (S)",
    timeStr: "12:00",
    hour: 12,
    minute: 0,
    workdayRate: 25000,
    holidayRate: 50000,
  },
  {
    key: "malam_19",
    label: "Malam (M)",
    timeStr: "19:00",
    hour: 19,
    minute: 0,
    workdayRate: 25000,
    holidayRate: 50000,
  },
  {
    key: "ekstra_21",
    label: "Ekstra (E)",
    timeStr: "21:00",
    hour: 21,
    minute: 0,
    workdayRate: 20000,
    holidayRate: 40000,
  },
];

export const OVERNIGHT_RATES = {
  workday: 25000,
  holiday: 50000,
};

export const DEFAULT_CIGARETTE_RATE = 4050; // Jatah uang rokok per hari

export interface DayMealItem {
  key: string;
  label: string;
  timeStr: string;
  rate: number;
  active: boolean;
}

export type DriverCategory = "organik" | "penunjang";

export interface DayCalculation {
  dateStr: string; // "YYYY-MM-DD"
  formattedDate: string; // "Senin, 14 Okt 2024"
  dayName: string; // "Senin"
  isHoliday: boolean; // default true for Sunday only (Saturday is workday)
  meals: DayMealItem[];
  overnight: {
    rate: number;
    active: boolean;
  };
  cigarette: {
    rate: number;
    active: boolean;
  };
  subtotal: number;
}

export interface UpdCalculationResult {
  departureTime: string;
  returnTime: string;
  totalDays: number;
  totalMealAllowance: number;
  totalOvernightAllowance: number;
  totalCigaretteAllowance: number;
  grandTotal: number;
  driverCategory?: DriverCategory;
  days: DayCalculation[];
}

/**
 * Menghitung rincian UPD berdasarkan rentang tanggal-jam berangkat dan kepulangan
 * Ketentuan:
 * 1. Hari Sabtu TIDAK masuk hari libur tanggal merah (hari kerja biasa). Default libur hanya Minggu.
 * 2. Kenaikan tarif tanggal merah HANYA berlaku untuk Pengemudi Organik. Pengemudi Penunjang tetap tarif hari kerja normal.
 */
export function calculateUpd(
  departure: Date | string,
  arrival: Date | string,
  cigaretteRate: number = DEFAULT_CIGARETTE_RATE,
  existingDaysConfig?: Partial<DayCalculation>[],
  driverCategory: DriverCategory = "organik"
): UpdCalculationResult {
  const depDate = new Date(departure);
  const arrDate = new Date(arrival);

  if (isNaN(depDate.getTime()) || isNaN(arrDate.getTime()) || arrDate < depDate) {
    return {
      departureTime: "",
      returnTime: "",
      totalDays: 0,
      totalMealAllowance: 0,
      totalOvernightAllowance: 0,
      totalCigaretteAllowance: 0,
      grandTotal: 0,
      driverCategory,
      days: [],
    };
  }

  const days: DayCalculation[] = [];
  let cur = startOfDay(depDate);
  const end = startOfDay(arrDate);

  let dayIdx = 0;
  while (!isAfter(cur, end)) {
    const dateStr = format(cur, "yyyy-MM-dd");
    const dayName = format(cur, "EEEE", { locale: localeId });
    const formattedDate = format(cur, "EEEE, dd MMM yyyy", { locale: localeId });

    // Cek apakah ada konfigurasi tersimpan sebelumnya (misal user switch hari libur / uncheck makan)
    const prevConfig = existingDaysConfig?.find((d) => d.dateStr === dateStr);

    // Aturan: Hari Sabtu TIDAK masuk hari libur tanggal merah. Default libur HANYA hari Minggu (getDay() === 0)
    const defaultIsHoliday = cur.getDay() === 0;
    const isHoliday = prevConfig !== undefined && typeof prevConfig.isHoliday === "boolean" 
      ? prevConfig.isHoliday 
      : defaultIsHoliday;

    const isFirstDay = isSameDay(cur, depDate);
    const isLastDay = isSameDay(cur, arrDate);

    // Hitung waktu aktif dinas pada hari ini
    const startHour = isFirstDay ? depDate.getHours() + depDate.getMinutes() / 60 : 0;
    const endHour = isLastDay ? arrDate.getHours() + arrDate.getMinutes() / 60 : 24;

    // Untuk tanggal merah tidak termasuk pengemudi penunjang, tapi untuk pengemudi organik
    const isHolidayForDriver = isHoliday && driverCategory === "organik";

    // Evaluasi 5 slot makan
    const meals: DayMealItem[] = MEAL_SLOT_DEFS.map((slot) => {
      const slotHour = slot.hour + slot.minute / 60;
      const rate = isHolidayForDriver ? slot.holidayRate : slot.workdayRate;

      // Apakah secara otomatis tercakup dalam jam dinas
      const autoActive = startHour <= slotHour && endHour >= slotHour;

      // Cek apakah user telah mengubah checklist manual
      let active = autoActive;
      if (prevConfig?.meals) {
        const prevMeal = prevConfig.meals.find((m) => m.key === slot.key);
        if (prevMeal && typeof prevMeal.active === "boolean") {
          active = prevMeal.active;
        }
      }

      return {
        key: slot.key,
        label: slot.label,
        timeStr: slot.timeStr,
        rate,
        active,
      };
    });

    // Evaluasi Bermalam (B)
    const overnightRate = isHolidayForDriver ? OVERNIGHT_RATES.holiday : OVERNIGHT_RATES.workday;
    // Otomatis aktif jika dinas berlanjut ke hari berikutnya (bukan hari terakhir)
    const autoOvernight = !isLastDay;
    let overnightActive = autoOvernight;
    if (prevConfig?.overnight && typeof prevConfig.overnight.active === "boolean") {
      overnightActive = prevConfig.overnight.active;
    }

    // Evaluasi Uang Rokok
    const cigRate = cigaretteRate;
    let cigaretteActive = true;
    if (prevConfig?.cigarette && typeof prevConfig.cigarette.active === "boolean") {
      cigaretteActive = prevConfig.cigarette.active;
    }

    // Subtotal hari ini
    const mealsTotal = meals.reduce((sum, m) => sum + (m.active ? m.rate : 0), 0);
    const overnightTotal = overnightActive ? overnightRate : 0;
    const cigaretteTotal = cigaretteActive ? cigRate : 0;
    const subtotal = mealsTotal + overnightTotal + cigaretteTotal;

    days.push({
      dateStr,
      formattedDate,
      dayName,
      isHoliday,
      meals,
      overnight: {
        rate: overnightRate,
        active: overnightActive,
      },
      cigarette: {
        rate: cigRate,
        active: cigaretteActive,
      },
      subtotal,
    });

    cur = addDays(cur, 1);
    dayIdx++;
  }

  // Hitung agregat
  let totalMealAllowance = 0;
  let totalOvernightAllowance = 0;
  let totalCigaretteAllowance = 0;

  days.forEach((day) => {
    day.meals.forEach((m) => {
      if (m.active) totalMealAllowance += m.rate;
    });
    if (day.overnight.active) totalOvernightAllowance += day.overnight.rate;
    if (day.cigarette.active) totalCigaretteAllowance += day.cigarette.rate;
  });

  const grandTotal = totalMealAllowance + totalOvernightAllowance + totalCigaretteAllowance;

  return {
    departureTime: depDate.toISOString(),
    returnTime: arrDate.toISOString(),
    totalDays: days.length,
    totalMealAllowance,
    totalOvernightAllowance,
    totalCigaretteAllowance,
    grandTotal,
    driverCategory,
    days,
  };
}
