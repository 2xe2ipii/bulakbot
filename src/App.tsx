import { useState, useEffect } from 'react';
import { useForm, FormProvider, type SubmitHandler, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ScanLine, Send, Bike, Store, ChevronUp, ChevronDown } from 'lucide-react';

import { OrderSchema, type OrderFormValues } from './lib/schema';
import { submitOrderToSheet } from './lib/gas';
import { cn, formatCurrency } from './lib/utils';

// --- NEW IMPORTS ---
import { FormInput, FormSelect } from './components/ui/FormFields';
import { DateSelector } from './components/DateSelector';
import { ParsingDrawer } from './components/ParsingDrawer';

function App() {
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  // Default to Today's date
  const defaultValues: DefaultValues<OrderFormValues> = {
    targetDate: new Date(), 
    status: 'UNPAID', type: 'DELIVERY', mop: 'G-CASH', 
    deliveredTo: '', orderedBy: '', contactNumber: '', address: '', cardMessage: '',
    code: '', others: '', orderSummary: '', notes: '', deliveryTime: '', 
    flowers: { localRed: 0, localPink: 0, localWhite: 0, importedRed: 0, twoTonePink: 0, chinaPink: 0, sunflower: 0, carnation: 0, tulips: 0, stargazer: 0 },
    total: 0, balance: 0, amountPaid: 0, deliveryFee: 0
  };

  const methods = useForm<OrderFormValues>({
    resolver: zodResolver(OrderSchema) as any,
    defaultValues
  });

  const { register, handleSubmit, setValue, watch, reset, getValues, formState: { errors } } = methods;
  
  // Watch inputs for calculations
  const amountPaid = watch("amountPaid");
  const balance = watch("balance"); 
  const isPickUp = watch("type") === 'PICK UP';

  // --- AUTOMATIC CALCULATION & STATUS ---
  useEffect(() => {
    const p = Number(getValues('amountPaid')) || 0;
    const b = Number(getValues('balance')) || 0;
    const newTotal = p + b;
    
    if (getValues('total') !== newTotal) setValue('total', newTotal);

    let newStatus = 'UNPAID';
    if (b === 0 && p > 0) newStatus = 'PAID';
    else if (p > 0 && b > 0) newStatus = 'DOWNPAYMENT';
    else if (p === 0 && b > 0) newStatus = 'UNPAID';
    
    if (getValues('status') !== newStatus) setValue('status', newStatus as any);
  }, [amountPaid, balance, setValue, getValues]);

  const onSubmit: SubmitHandler<OrderFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      data.total = data.amountPaid + data.balance;
      await submitOrderToSheet(data);
      if(confirm("Submitted! Clear form?")) reset();
    } catch (error) {
      alert("Error: " + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-gray-50 pb-32 font-sans text-gray-900">
        
        {/* HEADER */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm">
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
          <ParsingDrawer 
            isOpen={isParsing} 
            onClose={() => setIsParsing(false)} 
            onParseComplete={(hasFlowers) => { if(hasFlowers) setShowInventory(true); }}
          />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* TYPE SELECTOR */}
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-200">
               <div className="grid grid-cols-2 gap-2">
                  {['DELIVERY', 'PICK UP'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setValue('type', type as any);
                        if(type === 'PICK UP') setValue('deliveryFee', 0);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 py-4 rounded-xl border-2 font-black transition-all",
                        watch('type') === type 
                          ? "border-pink-600 bg-pink-600 text-white shadow-lg shadow-pink-200" 
                          : "border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100"
                      )}
                    >
                      {type === 'DELIVERY' ? <Bike size={28} /> : <Store size={28} />}
                      <span className="text-sm">{type}</span>
                    </button>
                  ))}
               </div>
            </div>

            {/* --- MODULAR DATE SELECTOR --- */}
            <DateSelector isPickUp={isPickUp} />

            {/* DETAILS */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-pink-600">Contact Details</h2>
              <FormInput label={isPickUp ? "Pick Up By" : "Delivered To"} name="deliveredTo" register={register} errors={errors} />
              <FormInput label="Contact #" name="contactNumber" register={register} errors={errors} type="text" placeholder="09xxxxxxxxx" />
              <FormInput label="Ordered By" name="orderedBy" register={register} errors={errors} />
              {!isPickUp && <FormInput label="Address" name="address" type="textarea" register={register} errors={errors} />}
              <FormInput label="Card Message" name="cardMessage" type="textarea" register={register} errors={errors} />
            </div>

            {/* ORDER SPECS */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-pink-600">Order Details</h2>
              <FormInput label="Order Summary" name="orderSummary" register={register} errors={errors} placeholder="e.g. 1 Dozen Red Roses" />
              <div className="grid grid-cols-2 gap-3">
                 <FormInput label="Code" name="code" register={register} errors={errors} placeholder="e.g. R01" />
                 <FormInput label="Others" name="others" register={register} errors={errors} placeholder="Add-ons..." />
              </div>
              <FormInput label="Internal Notes" name="notes" type="textarea" register={register} errors={errors} />
            </div>

            {/* INVENTORY */}
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
                  {['localRed', 'localPink', 'localWhite', 'importedRed', 'twoTonePink', 'chinaPink', 'sunflower', 'carnation', 'tulips', 'stargazer'].map((f) => (
                    // @ts-ignore
                    <FormInput key={f} label={f.replace(/([A-Z])/g, ' $1').trim()} name={`flowers.${f}`} type="number" register={register} errors={errors} />
                  ))}
                </div>
              )}
            </div>

            {/* PAYMENT */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
               <div className="flex justify-between items-center">
                  <h2 className="text-xs font-black uppercase tracking-widest text-pink-600">Payment</h2>
                  <div className={cn("px-2 py-1 rounded text-xs font-bold", watch('status') === 'PAID' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                    {watch('status')}
                  </div>
               </div>
              <FormSelect 
                label="MOP" name="mop" register={register} errors={errors} 
                options={[{label: 'G-CASH', value: 'G-CASH'}, {label: 'CASH', value: 'CASH'}, {label: 'MAYA', value: 'MAYA'}, {label: 'BANK', value: 'BANK'}, {label: 'OTHER', value: 'OTHER'}]} 
              />
              <div className="grid grid-cols-2 gap-3">
                 <FormInput label="Payment Sent" name="amountPaid" type="number" step="0.01" register={register} errors={errors} />
                 <FormInput label="Balance" name="balance" type="number" step="0.01" register={register} errors={errors} />
              </div>
              {!isPickUp && <FormInput label="Del. Fee" name="deliveryFee" type="number" step="0.01" register={register} errors={errors} />}
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
    </FormProvider>
  );
}

export default App;