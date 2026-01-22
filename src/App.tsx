import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ScanLine, ChevronDown, ChevronUp, Send, Bike, Store } from 'lucide-react';

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

  const defaultDate = new Date('2026-02-14T00:00:00');

  const defaultValues: DefaultValues<OrderFormValues> = {
    targetDate: defaultDate,
    status: 'UNPAID',
    type: 'DELIVERY',
    mop: 'G-CASH', 
    deliveredTo: '', orderedBy: '', contactNumber: '', address: '', cardMessage: '',
    code: '', others: '', orderSummary: '', notes: '',
    deliveryTime: '', 
    flowers: { 
      localRed: 0, localPink: 0, localWhite: 0, importedRed: 0, twoTonePink: 0,
      chinaPink: 0, sunflower: 0, carnation: 0, tulips: 0, stargazer: 0 
    },
    total: 0, balance: 0, amountPaid: 0, deliveryFee: 0
  };

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(OrderSchema) as any,
    defaultValues
  });

  const { register, handleSubmit, setValue, watch, reset, getValues, formState: { errors } } = form;
  
  // Watch inputs to auto-calculate Total
  const amountPaid = watch("amountPaid");
  const balance = watch("balance"); 
  
  const targetDate = watch("targetDate");
  const deliveryTime = watch("deliveryTime");
  const orderType = watch("type");
  const isPickUp = orderType === 'PICK UP';

  // --- AUTOMATIC CALCULATION & STATUS ---
  useEffect(() => {
    const p = Number(getValues('amountPaid')) || 0;
    const b = Number(getValues('balance')) || 0;
    
    // Total is simply the sum of what was paid + what is left
    const newTotal = p + b;
    
    // Update the hidden 'total' field for submission
    if (getValues('total') !== newTotal) {
        setValue('total', newTotal);
    }

    // Determine Status
    let newStatus = 'UNPAID';
    if (b === 0 && p > 0) newStatus = 'PAID';
    else if (p > 0 && b > 0) newStatus = 'DOWNPAYMENT';
    else if (p === 0 && b > 0) newStatus = 'UNPAID';
    // Edge case: Both 0 (New form) -> UNPAID
    
    if (getValues('status') !== newStatus) {
      setValue('status', newStatus as any);
    }
  }, [amountPaid, balance, setValue, getValues]);

  const onParse = () => {
    if (!parseText) return;
    const parsedData = parseOrderText(parseText);
    
    (Object.keys(parsedData) as Array<keyof OrderFormValues>).forEach((key) => {
       const value = parsedData[key];
       if (value !== undefined && value !== null) {
          // @ts-ignore
          setValue(key, value, { shouldValidate: true, shouldDirty: true });
       }
    });
    
    const hasFlowers = Object.values(parsedData.flowers || {}).some(v => v > 0);
    if (hasFlowers) setShowInventory(true);
    
    setIsParsing(false);
    setParseText("");
  };

  const onSubmit: SubmitHandler<OrderFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      // Final sanity check on Total
      data.total = data.amountPaid + data.balance;
      await submitOrderToSheet(data);
      if(confirm("Submitted! Clear?")) reset();
    } catch (error) {
      alert("Error: " + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setQuickTime = (hour: number) => {
    const hStr = hour.toString().padStart(2, '0');
    setValue('deliveryTime', `${hStr}:00`);
  };

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
          
          {/* ORDER TYPE SELECTOR */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-200">
             <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setValue('type', 'DELIVERY')}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-4 rounded-xl border-2 font-black transition-all",
                    !isPickUp 
                      ? "border-pink-600 bg-pink-600 text-white shadow-lg shadow-pink-200" 
                      : "border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100"
                  )}
                >
                  <Bike size={28} /> 
                  <span className="text-sm">DELIVERY</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue('type', 'PICK UP');
                    setValue('deliveryFee', 0); 
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-4 rounded-xl border-2 font-black transition-all",
                    isPickUp 
                      ? "border-pink-600 bg-pink-600 text-white shadow-lg shadow-pink-200" 
                      : "border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100"
                  )}
                >
                  <Store size={28} /> 
                  <span className="text-sm">PICK UP</span>
                </button>
             </div>
          </div>

          {/* SECTION 1: DATE & TIME */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-pink-600">
              {isPickUp ? "Pick Up Schedule" : "Delivery Schedule"}
            </h2>
            
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
              <label className="text-sm font-bold text-gray-700 uppercase tracking-tight mb-2 block">
                 {isPickUp ? "Pick Up Time" : "Delivery Time"}
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(h => {
                  const hStr = h.toString().padStart(2, '0');
                  const val = `${hStr}:00`;
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

          {/* SECTION 2: DETAILS */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-pink-600">Contact Details</h2>
            
            <FormInput 
              label={isPickUp ? "Pick Up By" : "Delivered To"} 
              name="deliveredTo" 
              register={register} errors={errors} 
            />
            
            <FormInput label="Contact #" name="contactNumber" register={register} errors={errors} type="text" placeholder="09xxxxxxxxx" />
            <FormInput label="Ordered By" name="orderedBy" register={register} errors={errors} />

            {!isPickUp && (
              <FormInput label="Address" name="address" type="textarea" register={register} errors={errors} />
            )}
            
            <FormInput label="Card Message" name="cardMessage" type="textarea" register={register} errors={errors} />
          </div>

          {/* SECTION 3: ORDER SPECS */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-pink-600">Order Details</h2>

            <FormInput label="Order Summary" name="orderSummary" register={register} errors={errors} placeholder="e.g. 1 Dozen Red Roses" />
            <div className="grid grid-cols-2 gap-3">
               <FormInput label="Code" name="code" register={register} errors={errors} placeholder="e.g. R01" />
               <FormInput label="Others" name="others" register={register} errors={errors} placeholder="Add-ons..." />
            </div>
            <FormInput label="Internal Notes" name="notes" type="textarea" register={register} errors={errors} />
          </div>

          {/* SECTION 4: INVENTORY */}
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
              <div className="p-5 grid grid-cols-2 gap-3 bg-white border-t border-gray-100">
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

          {/* SECTION 5: PAYMENT (Updated to match your design) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
             <div className="flex justify-between items-center">
                <h2 className="text-xs font-black uppercase tracking-widest text-pink-600">Payment</h2>
                <div className={cn("px-2 py-1 rounded text-xs font-bold", getValues('status') === 'PAID' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                  {watch('status')}
                </div>
             </div>

            <FormSelect 
              label="MOP" name="mop" register={register} errors={errors} 
              options={[{label: 'G-CASH', value: 'G-CASH'}, {label: 'CASH', value: 'CASH'}, {label: 'MAYA', value: 'MAYA'}, {label: 'BANK', value: 'BANK'}, {label: 'OTHER', value: 'OTHER'}]} 
            />

            <div className="grid grid-cols-2 gap-3">
               {/* FIX: User enters Payment Sent (Amount Paid) */}
               <FormInput label="Payment Sent" name="amountPaid" type="number" step="0.01" register={register} errors={errors} />
               
               {/* FIX: User enters Balance */}
               <FormInput label="Balance" name="balance" type="number" step="0.01" register={register} errors={errors} />
            </div>
            
            {!isPickUp && (
              <FormInput label="Del. Fee" name="deliveryFee" type="number" step="0.01" register={register} errors={errors} />
            )}
             
             {/* Total Display (Calculated) */}
             <div className="mt-2 p-4 bg-gray-900 rounded-xl flex justify-between items-center text-white">
                <span className="text-sm font-bold uppercase text-gray-400">Total</span>
                <span className="text-2xl font-black">{formatCurrency(Number(amountPaid) + Number(balance))}</span>
             </div>
          </div>

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