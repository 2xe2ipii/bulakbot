import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

export const getFileUnderTime = (timeStr: string): string => {
  if (!timeStr) return "";

  const [hStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  
  if (isNaN(h)) return "Invalid Time";

  h -= 1; // Buffer
  if (h < 0) h = 23;

  const suffix = h >= 12 ? 'PM' : 'AM';
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;

  const nextRaw = (h + 1) % 24;
  const nextSuffix = nextRaw >= 12 ? 'PM' : 'AM';
  let nextDisplayH = nextRaw % 12;
  if (nextDisplayH === 0) nextDisplayH = 12;

  return `${displayH}:00 ${suffix} - ${nextDisplayH}:00 ${nextSuffix}`;
};