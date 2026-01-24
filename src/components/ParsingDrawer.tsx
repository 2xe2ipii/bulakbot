import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { parseOrderText } from '../lib/parser';
import type { OrderFormValues } from '../lib/schema';
import { X, Sparkles, ClipboardPaste } from 'lucide-react';

interface ParsingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onParseComplete: (hasFlowers: boolean) => void;
}

export function ParsingDrawer({ isOpen, onClose, onParseComplete }: ParsingDrawerProps) {
  const [parseText, setParseText] = useState("");
  const { setValue } = useFormContext();

  const handleParse = () => {
    if (!parseText) return;
    const parsedData = parseOrderText(parseText);

    (Object.keys(parsedData) as Array<keyof OrderFormValues>).forEach((key) => {
       const value = parsedData[key];
       if (value !== undefined && value !== null) {
          // @ts-ignore
          setValue(key, value, { shouldValidate: true, shouldDirty: true });
       }
    });
    
    const hasFlowers = parsedData.flowers && Object.values(parsedData.flowers).some(v => v > 0);
    setParseText("");
    onParseComplete(!!hasFlowers);
    onClose();
  };

  const handlePaste = async () => {
      try {
          const text = await navigator.clipboard.readText();
          setParseText(text);
      } catch (err) {
          console.error("Clipboard access failed", err);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center backdrop-blur-sm animate-in fade-in duration-200">
      {/* RESTORED: rounded-t-2xl */}
      <div className="bg-gray-50 w-full h-[85vh] rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 relative overflow-hidden">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white rounded-t-2xl">
           <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h3 className="font-black text-xl text-gray-900 leading-none">Smart Scan</h3>
                </div>
           </div>
           <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
             <X size={20} className="text-gray-500" />
           </button>
        </div>

        {/* Text Area Container */}
        <div className="flex-1 p-6 relative">
            <textarea
            className="w-full h-full p-6 bg-white rounded-xl border border-gray-200 font-mono text-sm leading-relaxed focus:border-orange-500 focus:ring-4 focus:ring-orange-100 focus:outline-none resize-none shadow-sm transition-all text-gray-800 placeholder:text-gray-400"
            placeholder="Paste order slip here..."
            value={parseText}
            onChange={(e) => setParseText(e.target.value)}
            />
            
            {!parseText && (
                <button 
                    onClick={handlePaste}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 text-orange-400 hover:text-orange-600 transition-colors group"
                >
                    <div className="bg-white p-4 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                        <ClipboardPaste size={32} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Tap to Paste</span>
                </button>
            )}
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-white border-t border-gray-200 pb-10">
            <button 
                onClick={handleParse} 
                disabled={!parseText}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 rounded-xl font-black text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                <Sparkles size={20} />
                EXTRACT DATA
            </button>
        </div>
      </div>
    </div>
  );
}