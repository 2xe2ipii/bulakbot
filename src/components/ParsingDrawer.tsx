import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { parseOrderText } from '../lib/parser';
import type { OrderFormValues } from '../lib/schema';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-t-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200">
        <div className="flex justify-between items-center border-b pb-2">
           <h3 className="font-bold text-lg">Scan Order Slip</h3>
           <button onClick={onClose} className="text-sm font-bold text-gray-400">CLOSE</button>
        </div>
        <textarea
          className="w-full h-40 p-4 bg-gray-100 rounded-xl font-mono text-sm focus:ring-2 focus:ring-pink-500 focus:outline-nonePk resize-none"
          placeholder="Paste order details here..."
          value={parseText}
          onChange={(e) => setParseText(e.target.value)}
          autoFocus
        />
        <button 
            onClick={handleParse} 
            className="w-full bg-pink-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-pink-200 active:scale-95 transition-all"
        >
            PARSE TEXT
        </button>
      </div>
    </div>
  );
}