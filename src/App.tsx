import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ScanLine, ChevronDown, ChevronUp, Send } from 'lucide-react';
// REMOVED unused imports: format, addDays

import { OrderSchema, type OrderFormValues } from './lib/schema';
import { parseOrderText } from './lib/parser';
import { submitOrderToSheet } from './lib/gas';
import { cn, formatCurrency } from './lib/utils';
import { FormInput, FormSelect } from './components/ui/FormFields';

function App() {
  const [isParsing, setIsParsing] = useState(false);
  const [parseText, setParseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  // Set default date to Feb 14
  const defaultDate = new Date('2026-02-14T00:00:00');

  const defaultValues: DefaultValues<OrderFormValues> = {
    targetDate: defaultDate,
    status: 'UNPAID',
    type: 'DELIVERY',
    mop: 'G-CASH', 
    deliveredTo: '', orderedBy: '', contactNumber: '', address: '', cardMessage: '',
    code: '', others: '', orderSummary: '', notes: '',
    deliveryTime: '', 
    // CORRECT FLOWERS (10)
    flowers: { 
      localRed: 0, localPink: 0, localWhite: 0, importedRed: 0, twoTonePink: 0,
      chinaPink: 0, sunflower: 0, carnation: 0, tulips: 0, stargazer: 0 
    },
    amountPaid: 0, deliveryFee: 0, total: 0,
  };

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(OrderSchema) as any,
    defaultValues
  });

  const { register, handleSubmit, setValue, watch, reset, getValues, formState: { errors } } = form;
  
  const total = watch("total");
  const amountPaid = watch("amountPaid");
  const targetDate = watch("targetDate");
  const deliveryTime = watch("deliveryTime");

  // FIX: ROBUST PAYMENT LOGIC
  useEffect(() => {
    // Cast to Number to be 100% sure we aren't doing string math
    const t = Number(getValues('total')) || 0;
    const p = Number(getValues('amountPaid')) || 0;
    const balance = t - p;

    let newStatus = 'UNPAID';
    
    // Exact match = PAID
    if (balance <= 0 && t > 0) {
      newStatus = 'PAID';
    } 
    // Partial payment = DOWNPAYMENT
    else if (p > 0 && p < t) {
      newStatus = 'DOWNPAYMENT';
    } 
    // No payment or full balance = UNPAID
    else {
      newStatus = 'UNPAID';
    }
    
    // Only update if changed to avoid loops
    if (getValues('status') !== newStatus) {
      setValue('status', newStatus as any);
    }
  }, [total, amountPaid, setValue, getValues]);

  const onParse = () => {
    if (!parseText) return;
    const parsedData = parseOrderText(parseText);
    (Object.keys(parsedData) as Array<keyof OrderFormValues>).forEach((key) => {
       // @ts-ignore
       setValue(key, parsedData[key]);
    });
    // Check strict numeric values for inventory trigger
    const hasFlowerCounts = Object.values(parsedData.flowers || {}).some(v => v > 0);
    if (hasFlowerCounts) setShowInventory(true);
    
    setIsParsing(false);
    setParseText("");
  };

  const onSubmit: SubmitHandler<OrderFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      await submitOrderToSheet(data);
      if(confirm("Submitted! Clear?")) reset();
    } catch (error) {
      alert("Error: " + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setQuickTime = (hour: number) => setValue('deliveryTime', `${hour}:00`);
  const setExactDate = (day: number) => setValue('targetDate', new Date(`2026-02-${day}T00:00:00`));

  return (
    <div className="min-h-screen bg-gray-50 pb-32 font-sans text-gray-900">
      
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-black text-pink-600 tracking-tighter">BULAKBOT</h1>
        <button 
          onClick={() => setIsParsing(true)}
          type="button"
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold active:scale-95 transition-all"
        >
          <ScanLine size={18} /> SCAN
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* PARSING DRAWER */}
        {isParsing && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
            <div className="bg-white w-full rounded-t-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200">
              <h3 className="font-bold text-lg border-b pb-2">Scan Order Slip</h3>
              <textarea
                className="w-full h-40 p-4 bg-gray-100 rounded-xl font-mono text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                placeholder="Paste here..."
                value={parseText}
                onChange={(e) => setParseText(e.target.value)}
                autoFocus
              />
              <button onClick={onParse} className="w-full bg-pink-600 text-white py-3 rounded-xl font-bold">PARSE</button>
              <button onClick={() => setIsParsing(false)} className="w-full text-gray-500 py-2">Cancel</button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* CARD 1: DATE & TIME */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-pink-600">When is this needed?</h2>
            
            <div className="grid grid-cols-3 gap-2">
              {[13, 14, 15].map(day => {
                const isSelected = targetDate && targetDate.getDate() === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setExactDate(day)}
                    className={cn(
                      "flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all active:scale-95",
                      isSelected 
                        ? "border-pink-600 bg-pink-50 text-pink-700 shadow-sm" 
                        : "border-gray-100 bg-white text-gray-500 hover:border-pink-200"
                    )}
                  >
                    <span className="text-xs font-bold uppercase">Feb</span>
                    <span className="text-2xl font-black">{day}</span>
                  </button>
                )
              })}
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 uppercase tracking-tight mb-2 block">Delivery Time</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(h => {
                  const val = `${h}:00`;
                  const isSelected = deliveryTime === val;
                  const display = h > 12 ? h - 12 : h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setQuickTime(h)}
                      className={cn(
                        "py-2 rounded-lg text-sm font-bold border transition-colors",
                        isSelected ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200"
                      )}
                    >
                      {display} {h >= 12 ? '' : ''}
                    </button>
                  )
                })}
              </div>
              <input 
                type="time" 
                {...register('deliveryTime')}
                className="w-full p-2 border border-gray-300 rounded-lg text-center font-bold"
              />
            </div>
          </div>

          {/* CARD 2: WHO & WHERE */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-pink-600">Details</h2>
            
            <FormSelect label="Type" name="type" register={register} errors={errors} options={[{label: 'DELIVERY', value: 'DELIVERY'}, {label: 'PICK UP', value: 'PICK UP'}]} />
            <FormInput label="Ordered By" name="orderedBy" register={register} errors={errors} />
            
            {/* FIX: Use type="text" to allow leading zeros like "09..." */}
            <FormInput label="Contact #" name="contactNumber" register={register} errors={errors} type="text" placeholder="09xxxxxxxxx" />
            
            <FormInput label="Delivered To" name="deliveredTo" register={register} errors={errors} />
            <FormInput label="Address" name="address" type="textarea" register={register} errors={errors} />
            <FormInput label="Card Message" name="cardMessage" type="textarea" register={register} errors={errors} />
          </div>

          {/* CARD 3: PAYMENT */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
             <div className="flex justify-between items-center">
                <h2 className="text-xs font-black uppercase tracking-widest text-pink-600">Payment</h2>
                <div className={cn("px-2 py-1 rounded text-xs font-bold", getValues('status') === 'PAID' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                  {watch('status')}
                </div>
             </div>

            <div className="grid grid-cols-2 gap-3">
              <FormSelect 
                label="MOP" name="mop" register={register} errors={errors} 
                options={[{label: 'G-CASH', value: 'G-CASH'}, {label: 'CASH', value: 'CASH'}, {label: 'MAYA', value: 'MAYA'}, {label: 'BANK', value: 'BANK'}, {label: 'OTHER', value: 'OTHER'}]} 
              />
              <FormInput label="Order Summary" name="orderSummary" register={register} errors={errors} placeholder="Bouquet type..." />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
               <FormInput label="Total" name="total" type="number" step="0.01" register={register} errors={errors} className="font-bold text-lg" />
               <FormInput label="Paid So Far" name="amountPaid" type="number" step="0.01" register={register} errors={errors} />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <FormInput label="Del. Fee" name="deliveryFee" type="number" step="0.01" register={register} errors={errors} />
               <FormInput label="Code" name="code" register={register} errors={errors} />
            </div>
            
            <FormInput label="Others (Add-ons)" name="others" register={register} errors={errors} />
             
             {/* Balance */}
             <div className="mt-2 p-3 bg-gray-900 rounded-xl flex justify-between items-center text-white">
                <span className="text-xs font-bold uppercase text-gray-400">Balance</span>
                <span className="text-xl font-black">{formatCurrency((Number(total) || 0) - (Number(amountPaid) || 0))}</span>
             </div>
          </div>

          {/* CARD 4: INVENTORY */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <button 
              type="button" 
              onClick={() => setShowInventory(!showInventory)}
              className="w-full flex justify-between items-center p-5 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">Inventory Counts</h2>
              {showInventory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {showInventory && (
              <div className="p-5 grid grid-cols-2 gap-3">
                <FormInput label="Local Red" name="flowers.localRed" type="number" register={register} errors={errors} />
                <FormInput label="Local Pink" name="flowers.localPink" type="number" register={register} errors={errors} />
                <FormInput label="Local White" name="flowers.localWhite" type="number" register={register} errors={errors} />
                <FormInput label="Imported Red" name="flowers.importedRed" type="number" register={register} errors={errors} />
                <FormInput label="Two-Tone Pink" name="flowers.twoTonePink" type="number" register={register} errors={errors} />
                <FormInput label="China Pink" name="flowers.chinaPink" type="number" register={register} errors={errors} />
                <FormInput label="Sunflower" name="flowers.sunflower" type="number" register={register} errors={errors} />
                <FormInput label="Carnation" name="flowers.carnation" type="number" register={register} errors={errors} />
                <FormInput label="Tulips" name="flowers.tulips" type="number" register={register} errors={errors} />
                <FormInput label="Stargazer" name="flowers.stargazer" type="number" register={register} errors={errors} />
              </div>
            )}
          </div>
          
          <FormInput label="Internal Notes" name="notes" type="textarea" register={register} errors={errors} />

          {/* FOOTER */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 z-40">
             <div className="max-w-md mx-auto">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-pink-600 text-white py-4 rounded-xl font-black text-lg shadow-lg active:scale-95 transition-all disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={20} /> SUBMIT</>}
                </button>
             </div>
          </div>

        </form>
      </main>
    </div>
  );
}

export default App;