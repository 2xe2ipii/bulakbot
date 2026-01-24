import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { SlidersHorizontal, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  format, isSameDay, isValid, 
  startOfMonth, startOfWeek, addDays, 
  addMonths, subMonths, isSameMonth, isToday 
} from 'date-fns';

// --- CUSTOM CALENDAR COMPONENT (Fixed 6-Row Grid) ---
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

  // CONSTANT 6-ROW GRID LOGIC
  // We always start from the beginning of the week of the 1st of the month
  const monthStart = startOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  
  // We generate exactly 42 days (6 weeks * 7 days) to keep height stable
  const calendarDays = Array.from({ length: 42 }, (_, i) => addDays(startDate, i));
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
        
        {/* Header */}
        <div className="bg-white p-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="font-black text-xl text-gray-900 tracking-tight">{title}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
              {format(currentMonth, 'MMMM yyyy')}
            </p>
          </div>
          <div className="flex gap-1">
             <button 
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
          </div>
        </div>

        {/* Calendar Body */}
        <div className="p-5">
          {/* Days Header */}
          <div className="grid grid-cols-7 mb-3">
            {weekDays.map(d => (
              <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isDayToday = isToday(day);

              return (
                <button
                  key={idx}
                  onClick={() => { onSelect(day); onClose(); }}
                  className={cn(
                    "h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-all relative",
                    !isCurrentMonth && "text-gray-300",
                    isCurrentMonth && !isSelected && "text-gray-700 hover:bg-gray-50 hover:text-pink-600",
                    isCurrentMonth && isDayToday && !isSelected && "text-pink-600 bg-pink-50 ring-1 ring-pink-100",
                    isSelected && "bg-pink-600 text-white shadow-lg shadow-pink-200 scale-105 z-10"
                  )}
                >
                  {format(day, 'd')}
                  {isDayToday && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 bg-pink-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="w-full py-3 rounded-xl text-xs font-black text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---

// Default presets (Feb 13-15, 2026)
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

  // Load presets
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
        // Save as ISO string at midnight local
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

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-6">
        
        {/* --- DATE SCHEDULE SECTION --- */}
        <div className="space-y-3">
          <div className="flex justify-between items-center h-6">
            <h2 className={cn("text-xs font-black uppercase tracking-widest transition-colors", isEditing ? "text-orange-500" : "text-pink-600")}>
              {isEditing ? "Editing Presets..." : (isPickUp ? "Pick Up Schedule" : "Delivery Schedule")}
            </h2>
            <button 
              type="button" 
              onClick={() => setIsEditing(!isEditing)}
              className={cn("transition-colors active:scale-95", isEditing ? "text-orange-500 bg-orange-50 p-1.5 rounded-lg" : "text-gray-400 hover:text-pink-600")}
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
                    "flex flex-col items-center justify-center py-3 rounded-xl border transition-all active:scale-95 relative overflow-hidden",
                    isEditing 
                        ? "border-orange-200 bg-orange-50/50 text-orange-700 hover:border-orange-300" // Edit Mode
                        : isSelected 
                            ? "border-pink-600 bg-pink-50 text-pink-700 shadow-sm ring-1 ring-pink-600" // Selected
                            : "border-gray-100 bg-white text-gray-500 hover:border-pink-200 hover:bg-gray-50" // Default
                  )}
                >
                    <span className="text-[10px] font-bold uppercase mb-0.5">{format(dateObj, 'MMM')}</span>
                    <span className="text-2xl font-black leading-none">{format(dateObj, 'd')}</span>
                    
                    {/* Small edit indicator dot */}
                    {isEditing && (
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-orange-300 rounded-full" />
                    )}
                </button>
              );
            })}

            {/* 4th Box: CUSTOM DATE BUTTON (Hidden during Editing) */}
            {!isEditing && (
                <button
                   type="button"
                   onClick={() => setCalendarMode({ type: 'SELECT_TARGET' })} 
                   className={cn(
                    "relative flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer active:scale-95",
                     isCustomDate
                      ? "border-pink-600 bg-pink-50 text-pink-700 shadow-sm ring-1 ring-pink-600"
                      : "border-gray-100 bg-white text-gray-500 hover:border-pink-300 hover:bg-gray-50"
                   )}
                >
                   {!isCustomDate && <span className="text-[10px] font-bold uppercase mb-1">OTHER</span>}
                   
                   {isCustomDate && targetDate ? (
                     <>
                       <span className="text-[10px] font-bold uppercase mb-0.5">{format(new Date(targetDate), 'MMM')}</span>
                       <span className="text-2xl font-black leading-none">{format(new Date(targetDate), 'd')}</span>
                     </>
                   ) : (
                     <CalendarIcon size={20} className="text-gray-300" />
                   )}
                </button>
            )}
          </div>
        </div>

        {/* --- TIME SELECTION SECTION --- */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-tight block">
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
                    "py-3 rounded-xl text-lg font-bold border transition-all active:scale-95",
                    isSelected
                        ? "bg-white text-pink-600 border-pink-600 shadow-sm ring-1 ring-pink-600" 
                        : "bg-white text-gray-600 border-gray-200 hover:border-pink-300 hover:text-pink-500"
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
              className="w-full h-12 px-4 border border-gray-300 rounded-xl text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
      </div>
    </>
  );
}