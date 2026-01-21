import type { OrderFormValues } from "./schema";

// This detects if we are running inside Google Apps Script
const isGasEnvironment = typeof window !== 'undefined' && (window as any).google?.script?.run;

export const submitOrderToSheet = (data: OrderFormValues): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isGasEnvironment) {
      // PROD: Call the backend function 'processOrder'
      (window as any).google.script.run
        .withSuccessHandler(() => resolve())
        .withFailureHandler((err: any) => reject(err))
        .processOrder(JSON.stringify(data)); // Pass as JSON string to be safe
    } else {
      // DEV: Log to console and pretend to wait
      console.log("DEV MODE: Submitting Order...", data);
      setTimeout(() => {
        alert("DEV MODE: Order 'Submitted' (Check Console)");
        resolve();
      }, 1000);
    }
  });
};