import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Settings, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, isSameDay, isValid } from 'date-fns';

// Default presets (Feb 13-15, 2026) - Fixed to Local Time (No 'Z')
const DEFAULT_PRESETS = [
  '2026-02-13T00:00:00',
  '2026-02-14T00:00:00',
  '2026-02-15T00:00:00'
];

export function DateSelector({ isPickUp }: { isPickUp: boolean }) {
  const { setValue, watch } = useFormContext(); 
  const targetDate = watch('targetDate');
  const deliveryTime = watch('deliveryTime');

  // Load presets from LocalStorage or use default
  const [presets, setPresets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jb_date_presets');
      return saved ? JSON.parse(saved) : DEFAULT_PRESETS;
    } catch (e) {
      return DEFAULT_PRESETS;
    }
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    localStorage.setItem('jb_date_presets', JSON.stringify(presets));
  }, [presets]);

  const handlePresetClick = (isoString: string) => {
    // Create date from string to ensure local time midnight
    setValue('targetDate', new Date(isoString), { shouldDirty: true });
  };

  const handlePresetChange = (index: number, val: string) => {
    const newPresets = [...presets];
    if (val) {
        // val is YYYY-MM-DD
        newPresets[index] = `${val}T00:00:00`; 
        setPresets(newPresets);
    }
  };

  // Safe check for custom date
  const isCustomDate = targetDate && isValid(new Date(targetDate)) && !presets.some(p => isSameDay(new Date(p), new Date(targetDate)));

  const setQuickTime = (h: number) => {
    setValue('deliveryTime', `${h.toString().padStart(2, '0')}:00`, { shouldDirty: true });
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xs font-black uppercase tracking-widest text-pink-600">
          {isPickUp ? "Pick Up Schedule" : "Delivery Schedule"}
        </h2>
        <button 
          type="button" 
          onClick={() => setIsEditing(!isEditing)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* DATE BUTTONS */}
      <div className="grid grid-cols-4 gap-2">
        {presets.map((iso, idx) => {
          const dateObj = new Date(iso);
          if (!isValid(dateObj)) return null;

          const isSelected = targetDate && isValid(new Date(targetDate)) && isSameDay(dateObj, new Date(targetDate));

          return isEditing ? (
            <input 
              key={idx}
              type="date"
              className="border rounded p-1 text-xs w-full"
              value={format(dateObj, 'yyyy-MM-dd')}
              onChange={(e) => handlePresetChange(idx, e.target.value)}
            />
          ) : (
            <button
              key={iso}
              type="button"
              onClick={() => handlePresetClick(iso)}
              className={cn(
                "flex flex-col items-center justify-center py-2 rounded-xl border-2 transition-all active:scale-95",
                isSelected 
                  ? "border-pink-600 bg-pink-50 text-pink-700 shadow-sm" 
                  : "border-gray-100 bg-white text-gray-500 hover:border-pink-200"
              )}
            >
              <span className="text-[10px] font-bold uppercase">{format(dateObj, 'MMM')}</span>
              <span className="text-xl font-black leading-none">{format(dateObj, 'd')}</span>
            </button>
          );
        })}

        {/* CUSTOM DATE BUTTON */}
        <div className={cn(
            "relative flex flex-col items-center justify-center rounded-xl border-2 transition-all",
             isCustomDate
              ? "border-pink-600 bg-pink-50 text-pink-700 shadow-sm"
              : "border-gray-100 bg-white text-gray-500 hover:border-pink-200"
        )}>
           <span className="text-[10px] font-bold uppercase mb-1">OTHER</span>
           <Calendar size={16} className={cn("absolute", isCustomDate ? "opacity-20" : "text-gray-400")} />
           <input 
              type="date"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                if(e.target.valueAsDate) {
                  setValue('targetDate', e.target.valueAsDate, { shouldDirty: true });
                }
              }}
           />
           {isCustomDate && targetDate && (
             <span className="text-xs font-bold z-10">{format(new Date(targetDate), 'MM/dd')}</span>
           )}
        </div>
      </div>

      {/* TIME SELECTION */}
      <div>
        <label className="text-sm font-bold text-gray-700 uppercase tracking-tight mb-2 block">
            {isPickUp ? "Pick Up Time" : "Delivery Time"}
        </label>
        <div className="grid grid-cols-6 gap-2 mb-3">
        {[8, 9, 10, 11, 13, 14, 15, 16].map(h => (
            <button
                key={h}
                type="button"
                onClick={() => setQuickTime(h)}
                className={cn(
                "py-1 rounded text-xs font-bold border transition-colors",
                deliveryTime === `${h.toString().padStart(2, '0')}:00` 
                    ? "bg-gray-800 text-white border-gray-800" 
                    : "bg-white text-gray-600 border-gray-200"
                )}
            >
                {h > 12 ? h - 12 : h}
            </button>
        ))}
        </div>
        <input 
            type="time" 
            {...useFormContext().register('deliveryTime')}
            className="w-full p-2 border border-gray-300 rounded-lg text-center font-bold"
        />
      </div>
    </div>
  );
}