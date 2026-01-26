import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { SlidersHorizontal, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  format, isSameDay, isValid, 
  startOfMonth, startOfWeek, addDays, 
  addMonths, subMonths, isSameMonth, isToday 
} from 'date-fns';

// --- CUSTOM CALENDAR COMPONENT ---
function CustomCalendarModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  selectedDate,
  title = "Select Date"
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelect: (d: Date) => void;
  selectedDate?: Date | null;
  title?: string;
}) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  if (!isOpen) return null;

  const monthStart = startOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const calendarDays = Array.from({ length: 42 }, (_, i) => addDays(startDate, i));
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER: Solid #093D09 (No Gradients) */}
        <div className="bg-[#093D09] p-5 text-white flex justify-between items-center">
             <div>
                <p className="text-emerald-100 font-bold text-xs uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-2xl font-black tracking-tight">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
             </div>
             <div className="flex gap-1">
                <button 
                  type="button" 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  type="button" 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
             </div>
        </div>

        {/* Calendar Body */}
        <div className="p-5 bg-white dark:bg-gray-800">
          <div className="grid grid-cols-7 mb-3">
            {weekDays.map(d => (
              <div key={d} className="text-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isDayToday = isToday(day);

              return (
                <button
                  key={idx}
                  type="button" 
                  onClick={() => { onSelect(day); onClose(); }}
                  className={cn(
                    "h-10 w-full rounded-lg text-sm font-bold flex items-center justify-center transition-all",
                    !isCurrentMonth && "text-gray-300 dark:text-gray-700", 
                    isCurrentMonth && !isSelected && "text-gray-700 dark:text-gray-300 hover:bg-[#093D09]/10 hover:text-[#093D09] dark:hover:text-emerald-400",
                    isCurrentMonth && isDayToday && !isSelected && "text-[#093D09] dark:text-emerald-400 font-black bg-[#093D09]/10",
                    isSelected && "bg-[#093D09] text-white shadow-md"
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-600">
          <button 
            type="button" 
            onClick={onClose}
            className="w-full py-3 rounded-xl text-xs font-black text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
const DEFAULT_PRESETS = [
  '2026-02-13T00:00:00',
  '2026-02-14T00:00:00',
  '2026-02-15T00:00:00'
];

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

type CalendarMode = 
  | { type: 'SELECT_TARGET' } 
  | { type: 'EDIT_PRESET'; index: number } 
  | null;

export function DateSelector({ isPickUp }: { isPickUp: boolean }) {
  const { setValue, watch, register } = useFormContext(); 
  const targetDate = watch('targetDate');
  const deliveryTime = watch('deliveryTime');

  const [presets, setPresets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jb_date_presets');
      return saved ? JSON.parse(saved) : DEFAULT_PRESETS;
    } catch (e) {
      return DEFAULT_PRESETS;
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>(null);

  useEffect(() => {
    localStorage.setItem('jb_date_presets', JSON.stringify(presets));
  }, [presets]);

  const handlePresetClick = (isoString: string) => {
    setValue('targetDate', new Date(isoString), { shouldDirty: true });
  };

  const handleCalendarSelect = (date: Date) => {
    if (calendarMode?.type === 'SELECT_TARGET') {
        setValue('targetDate', date, { shouldDirty: true });
    } 
    else if (calendarMode?.type === 'EDIT_PRESET') {
        const newPresets = [...presets];
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        newPresets[calendarMode.index] = `${year}-${month}-${day}T00:00:00`;
        setPresets(newPresets);
    }
    setCalendarMode(null);
  };

  const isCustomDate = targetDate && isValid(new Date(targetDate)) && !presets.some(p => isSameDay(new Date(p), new Date(targetDate)));

  const setQuickTime = (h: number) => {
    setValue('deliveryTime', `${h.toString().padStart(2, '0')}:00`, { shouldDirty: true });
  };

  return (
    <>
      <CustomCalendarModal 
        isOpen={!!calendarMode} 
        onClose={() => setCalendarMode(null)}
        selectedDate={
            calendarMode?.type === 'SELECT_TARGET' 
                ? (targetDate ? new Date(targetDate) : new Date())
                : (calendarMode?.type === 'EDIT_PRESET' ? new Date(presets[calendarMode.index]) : new Date())
        }
        onSelect={handleCalendarSelect}
        title={calendarMode?.type === 'EDIT_PRESET' ? "Change Preset Date" : "Select Date"}
      />

      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
        
        {/* --- DATE SCHEDULE SECTION --- */}
        <div className="space-y-3">
          <div className="flex justify-between items-center h-6">
            {/* STYLED with #093D09 */}
            <h2 className={cn("text-xs font-black uppercase tracking-widest transition-colors", isEditing ? "text-red-500" : "text-[#093D09] dark:text-emerald-400")}>
              {isEditing ? "Editing Presets..." : (isPickUp ? "Pick Up Schedule" : "Delivery Schedule")}
            </h2>
            <button 
              type="button" 
              onClick={() => setIsEditing(!isEditing)}
              className={cn("transition-colors active:scale-95", isEditing ? "text-red-500 bg-red-50 p-1.5 rounded-lg" : "text-gray-400 hover:text-[#093D09] dark:hover:text-emerald-400")}
              title="Configure Presets"
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>

          <div className={cn("grid gap-3 transition-all", isEditing ? "grid-cols-3" : "grid-cols-4")}>
            {presets.map((iso, idx) => {
              const dateObj = new Date(iso);
              if (!isValid(dateObj)) return null;

              const isSelected = !isEditing && targetDate && isValid(new Date(targetDate)) && isSameDay(dateObj, new Date(targetDate));

              return (
                <button 
                  key={idx} 
                  type="button"
                  onClick={() => {
                      if (isEditing) {
                          setCalendarMode({ type: 'EDIT_PRESET', index: idx });
                      } else {
                          handlePresetClick(iso);
                      }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all active:scale-95 relative overflow-hidden",
                    isEditing 
                        ? "border-red-200 bg-red-50/50 text-red-700 hover:border-red-300" // Edit Mode
                        : isSelected 
                            ? "border-[#093D09] bg-[#093D09] text-white shadow-md" // Selected (#093D09)
                            : "border-transparent bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-[#093D09]/5 dark:hover:bg-gray-600" // Default
                  )}
                >
                    <span className={cn("text-[10px] font-bold uppercase mb-0.5", isSelected ? "text-emerald-100" : "text-gray-400 dark:text-gray-500")}>{format(dateObj, 'MMM')}</span>
                    <span className="text-2xl font-black leading-none">{format(dateObj, 'd')}</span>
                    
                    {isEditing && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full" />
                    )}
                </button>
              );
            })}

            {/* 4th Box: OTHER */}
            {!isEditing && (
                <button
                   type="button"
                   onClick={() => setCalendarMode({ type: 'SELECT_TARGET' })} 
                   className={cn(
                    "relative flex flex-col items-center justify-center rounded-xl border-2 transition-all cursor-pointer active:scale-95",
                     isCustomDate
                      ? "border-[#093D09] bg-[#093D09] text-white shadow-md"
                      : "border-transparent bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-[#093D09]/5 dark:hover:bg-gray-600"
                   )}
                >
                   {!isCustomDate && <span className="text-[10px] font-bold uppercase mb-1 text-gray-400 dark:text-gray-500">OTHER</span>}
                   
                   {isCustomDate && targetDate ? (
                     <>
                       <span className="text-[10px] font-bold uppercase mb-0.5 text-emerald-100">{format(new Date(targetDate), 'MMM')}</span>
                       <span className="text-2xl font-black leading-none">{format(new Date(targetDate), 'd')}</span>
                     </>
                   ) : (
                     <CalendarIcon size={20} className="text-gray-300 dark:text-gray-500" />
                   )}
                </button>
            )}
          </div>
        </div>

        {/* --- TIME SELECTION SECTION --- */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight block">
              {isPickUp ? "Pick Up Time" : "Delivery Time"}
          </label>
          
          <div className="grid grid-cols-4 gap-3">
            {HOURS.map(h => {
               const timeString = `${h.toString().padStart(2, '0')}:00`;
               const isSelected = deliveryTime === timeString;
               const displayHour = h > 12 ? h - 12 : h;

               return (
                <button
                    key={h}
                    type="button"
                    onClick={() => setQuickTime(h)}
                    className={cn(
                    "py-3 rounded-xl text-lg font-bold border-2 transition-all active:scale-95",
                    isSelected
                        ? "bg-white dark:bg-gray-700 border-[#093D09] text-[#093D09] dark:text-emerald-400 shadow-sm" 
                        : "bg-white dark:bg-gray-700 border-transparent text-gray-500 dark:text-gray-400 hover:bg-[#093D09]/5 dark:hover:bg-gray-600"
                    )}
                >
                    {displayHour}
                </button>
               );
            })}
          </div>

          <input 
              type="time" 
              {...register('deliveryTime')}
              className="w-full h-12 px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#093D09] focus:border-transparent"
          />
        </div>
      </div>
    </>
  );
}