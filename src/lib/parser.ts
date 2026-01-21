import type { OrderFormValues } from './schema';

// Helper to clean price strings (e.g., "PHP 2,500.00" -> 2500)
const parsePrice = (str: string): number => {
  const clean = str.replace(/[^\d.]/g, ''); // Remove non-digits/dots
  return parseFloat(clean) || 0;
};

// Helper to parse the "FLOWERS" line specifically
const parseFlowers = (line: string) => {
  // FIX: Initialize with the EXACT keys from your new Schema
  const flowers: OrderFormValues['flowers'] = {
    localRed: 0, 
    localPink: 0, 
    localWhite: 0, 
    importedRed: 0, 
    twoTonePink: 0,
    chinaPink: 0, 
    sunflower: 0, 
    carnation: 0, 
    tulips: 0, 
    stargazer: 0
  };

  const lowerLine = line.toLowerCase();

  // FIX: Updated Regex Mappings for the new keys
  const mappings: { key: keyof typeof flowers; regex: RegExp }[] = [
    { key: 'localRed', regex: /(\d+)\s*(local red)/ },
    { key: 'localPink', regex: /(\d+)\s*(local pink)/ },
    { key: 'localWhite', regex: /(\d+)\s*(local white)/ },
    { key: 'importedRed', regex: /(\d+)\s*(imported|imp red|imp)/ },
    { key: 'twoTonePink', regex: /(\d+)\s*(two tone|two-tone)/ },
    { key: 'chinaPink', regex: /(\d+)\s*(china|china pink)/ },
    { key: 'sunflower', regex: /(\d+)\s*(sunflower|sun)/ },
    { key: 'carnation', regex: /(\d+)\s*(carnation)/ },
    { key: 'tulips', regex: /(\d+)\s*(tulips)/ },
    { key: 'stargazer', regex: /(\d+)\s*(stargazer)/ },
  ];

  mappings.forEach(map => {
    const match = lowerLine.match(map.regex);
    if (match && match[1]) {
      flowers[map.key] = parseInt(match[1], 10);
    }
  });

  return flowers;
};

export const parseOrderText = (text: string): Partial<OrderFormValues> => {
  const lines = text.split('\n');
  const result: Partial<OrderFormValues> = {};

  lines.forEach(line => {
    const cleanLine = line.trim();
    
    // --- Logistics ---
    if (cleanLine.startsWith('DATE:')) {
      const dateStr = cleanLine.replace('DATE:', '').trim();
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        result.targetDate = dateObj;
      }
    }

    if (cleanLine.startsWith('TIME:')) {
      result.deliveryTime = cleanLine.replace('TIME:', '').trim();
    }

    if (cleanLine.includes('PICK UP | DELIVERY:')) {
      const val = cleanLine.split(':')[1]?.trim().toUpperCase();
      if (val === 'PICK UP' || val === 'DELIVERY') {
        result.type = val;
      }
    }

    // --- Customer Info ---
    if (cleanLine.startsWith('DELIVERED TO:')) result.deliveredTo = cleanLine.replace('DELIVERED TO:', '').trim();
    if (cleanLine.startsWith('ORDERED BY:')) result.orderedBy = cleanLine.replace('ORDERED BY:', '').trim();
    // Keep '09' by treating as string
    if (cleanLine.startsWith('CONTACT #:')) result.contactNumber = cleanLine.replace('CONTACT #:', '').trim();
    if (cleanLine.startsWith('ADDRESS:')) result.address = cleanLine.replace('ADDRESS:', '').trim();
    if (cleanLine.startsWith('CARD MESSAGE:')) result.cardMessage = cleanLine.replace('CARD MESSAGE:', '').trim();
    if (cleanLine.startsWith('MOP:')) result.mop = cleanLine.replace('MOP:', '').trim();
    
    if (cleanLine.startsWith('STATUS:')) {
      const status = cleanLine.replace('STATUS:', '').trim().toUpperCase();
      if (['PAID', 'UNPAID', 'DOWNPAYMENT', 'INCOMPLETE'].includes(status)) {
        // @ts-ignore
        result.status = status; 
      }
    }

    // --- Order Details ---
    if (cleanLine.startsWith('CODE:')) result.code = cleanLine.replace('CODE:', '').trim();
    if (cleanLine.startsWith('OTHERS:')) result.others = cleanLine.replace('OTHERS:', '').trim();
    if (cleanLine.startsWith('NOTES:')) result.notes = cleanLine.replace('NOTES:', '').trim();

    // --- Flower Parsing ---
    if (cleanLine.startsWith('FLOWERS:')) {
      const flowers = parseFlowers(cleanLine.replace('FLOWERS:', '').trim());
      const values = Object.values(flowers) as number[];
      const hasFlowers = values.some(v => v > 0);
      if (hasFlowers) result.flowers = flowers;
    }

    // --- Financials ---
    if (cleanLine.startsWith('DELIVERY FEE:')) result.deliveryFee = parsePrice(cleanLine);
    if (cleanLine.startsWith('TOTAL:')) {
        const total = parsePrice(cleanLine);
        result.total = total;
    }
  });

  // Auto-calculate paid if status is explicitly PAID in text
  if (result.status === 'PAID' && result.total) {
    result.amountPaid = result.total;
  }

  // Fallback Summary
  if (!result.orderSummary && result.flowers) {
    result.orderSummary = "Assorted Flowers"; 
  }

  return result;
};