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

    // Populate form
    (Object.keys(parsedData) as Array<keyof OrderFormValues>).forEach((key) => {
       const value = parsedData[key];
       if (value !== undefined && value !== null) {
          // @ts-ignore
          setValue(key, value, { shouldValidate: true, shouldDirty: true });
       }
    });
    
    // Check if we need to show inventory
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
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center backdrop-blur-sm animate-in fade-in duration-200">
      {/* Increased Height to 85vh */}
      <div className="bg-gray-50 w-full h-[85vh] rounded-t-[2rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white rounded-t-[2rem]">
           <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-100 rounded-lg text-pink-600">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h3 className="font-black text-xl text-gray-900 leading-none">Smart Scan</h3>
                    <p className="text-xs text-gray-500 font-medium">Paste order details below</p>
                </div>
           </div>
           <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
             <X size={20} className="text-gray-500" />
           </button>
        </div>

        {/* Text Area Container */}
        <div className="flex-1 p-5 relative">
            <textarea
            className="w-full h-full p-5 bg-white rounded-2xl border-2 border-gray-200 font-mono text-sm leading-relaxed focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 focus:outline-none resize-none shadow-sm transition-all"
            placeholder="Paste order slip here...
            
Example:
Name: Juan Dela Cruz
Address: Lipa City
Order: 1 Dozen Red Roses
Total: 1500"
            value={parseText}
            onChange={(e) => setParseText(e.target.value)}
            autoFocus
            />
            {/* Quick Paste Button inside text area */}
            {!parseText && (
                <button 
                    onClick={handlePaste}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 text-gray-400 hover:text-pink-600 transition-colors"
                >
                    <ClipboardPaste size={32} />
                    <span className="text-xs font-bold uppercase">Tap to Paste</span>
                </button>
            )}
        </div>

        {/* Footer Action */}
        <div className="p-5 bg-white border-t border-gray-200 pb-8">
            <button 
                onClick={handleParse} 
                disabled={!parseText}
                className="w-full bg-pink-600 disabled:bg-gray-300 text-white py-4 rounded-xl font-black text-lg shadow-xl shadow-pink-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                <Sparkles size={20} />
                EXTRACT DATA
            </button>
        </div>
      </div>
    </div>
  );
}