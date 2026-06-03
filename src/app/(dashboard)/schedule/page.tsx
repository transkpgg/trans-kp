"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, getDay, addMonths, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { mockSchedules, mockCurrentUser } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Day names for header (Sen - Min)
  const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  
  // Get empty cells for the first row (1 = Monday, 0 = Sunday)
  const startDay = getDay(monthStart);
  const emptyDays = startDay === 0 ? 6 : startDay - 1; // Adjust so Monday is first
  
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Determine shift for a day (simulated logic: alternate every week for demo)
  const getShiftForDay = (date: Date) => {
    const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, ...
    
    // Libur on Sunday
    if (dayOfWeek === 0) return null;
    
    // Week number of the year to alternate shifts
    const weekNum = Math.floor(date.getDate() / 7);
    const shiftIdx = weekNum % mockSchedules.length;
    
    return mockSchedules[shiftIdx];
  };

  const getShiftColor = (shiftName: string) => {
    if (shiftName.includes("Pagi")) return "bg-blue-500 text-white";
    if (shiftName.includes("Siang")) return "bg-amber-500 text-white";
    if (shiftName.includes("Malam")) return "bg-purple-500 text-white";
    return "bg-surface-600 text-white";
  };

  const getShiftDot = (shiftName: string) => {
    if (shiftName.includes("Pagi")) return "bg-blue-500";
    if (shiftName.includes("Siang")) return "bg-amber-500";
    if (shiftName.includes("Malam")) return "bg-purple-500";
    return "bg-surface-600";
  };

  const todayShift = getShiftForDay(new Date());

  return (
    <div className="space-y-6 slide-up">
      <h1 className="text-2xl font-bold text-white">Jadwal Kerja</h1>

      {/* Calendar Card */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white capitalize">
            {format(currentDate, "MMMM yyyy", { locale: id })}
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors">
              <ChevronLeft className="w-5 h-5 text-surface-200" />
            </button>
            <button onClick={nextMonth} className="p-2 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors">
              <ChevronRight className="w-5 h-5 text-surface-200" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-surface-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: emptyDays }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10 sm:h-14 rounded-xl bg-surface-900/30 border border-transparent" />
          ))}
          
          {daysInMonth.map((day, idx) => {
            const shift = getShiftForDay(day);
            const isCurrentDay = isToday(day);
            
            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "h-10 sm:h-14 rounded-xl flex flex-col items-center justify-center relative border transition-colors",
                  isCurrentDay ? "border-brand-500 bg-brand-500/10" : "border-surface-800 bg-surface-800/30 hover:bg-surface-800",
                  !isSameMonth(day, currentDate) && "opacity-30"
                )}
              >
                <span className={cn(
                  "text-sm font-medium",
                  isCurrentDay ? "text-brand-400" : "text-surface-200",
                  !shift && "text-red-400" // Libur
                )}>
                  {format(day, "d")}
                </span>
                
                {shift && (
                  <div className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mt-1", getShiftDot(shift.name))} />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-surface-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-surface-300">Pagi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-surface-300">Siang</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-xs text-surface-300">Malam</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-surface-800 border border-surface-600" />
            <span className="text-xs text-surface-300">Libur</span>
          </div>
        </div>
      </div>

      {/* Today's Shift Detail */}
      <h3 className="font-semibold text-white ml-1 mt-8 mb-4">Jadwal Hari Ini</h3>
      
      {todayShift ? (
        <div className="glass-card p-5 border-l-4 border-l-brand-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-brand-400 font-medium">{todayShift.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="w-5 h-5 text-white" />
                <p className="text-2xl font-bold text-white">
                  {todayShift.start_time} - {todayShift.end_time}
                </p>
              </div>
              <p className="text-sm text-surface-400 mt-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> {mockCurrentUser.branch_name}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-surface-800">
              <CalendarIcon className="w-6 h-6 text-brand-500" />
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 border-l-4 border-l-red-500 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
            <CalendarIcon className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-lg font-bold text-white">Hari Libur</p>
          <p className="text-sm text-surface-400 mt-1">Anda tidak ada jadwal kerja hari ini.</p>
        </div>
      )}
    </div>
  );
}
