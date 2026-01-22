import type { OrderFormValues } from './schema';

// --- HELPERS ---

const parsePrice = (str: string): number => {
  if (!str) return 0;
  const clean = str.replace(/[^\d.]/g, ''); 
  return parseFloat(clean) || 0;
};

const normalizeTime = (raw: string): string => {
  if (!raw) return "";
  const startPart = raw.split('-')[0].trim();
  const clean = startPart.toUpperCase();
  
  const match = clean.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(AM|PM)?/);
  if (!match) return "";

  let [_, hStr, mStr, period] = match;
  let hour = parseInt(hStr, 10);
  if (!mStr) mStr = "00";

  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  return `${hour.toString().padStart(2, '0')}:${mStr}`;
};

const extractNumber = (text: string, keyword: string): number => {
  const regex = new RegExp(`\\b(\\d+)\\s*(?:pcs|pc|doz|stems|pieces)?\\s*.*${keyword}`);
  const match = text.match(regex);
  return match ? parseInt(match[1], 10) : 0;
};

// --- FLOWER PARSING ENGINE ---

const parseFlowers = (text: string) => {
  const flowers: OrderFormValues['flowers'] = {
    localRed: 0, localPink: 0, localWhite: 0, importedRed: 0, twoTonePink: 0,
    chinaPink: 0, sunflower: 0, carnation: 0, tulips: 0, stargazer: 0
  };

  const lowerText = text.toLowerCase();
  const lines = lowerText.split(/\r?\n/);

  lines.forEach(line => {
    const parenMatch = line.match(/\((.*?)\)/);
    
    if (parenMatch && parenMatch[1].match(/\d/)) {
      const content = parenMatch[1];
      if (line.includes('local') && (line.includes('rose') || line.includes('roses'))) {
        if (content.includes('red')) flowers.localRed += extractNumber(content, 'red');
        if (content.includes('white')) flowers.localWhite += extractNumber(content, 'white');
        if (content.includes('pink')) flowers.localPink += extractNumber(content, 'pink');
      }
      else if (line.includes('imported') || line.includes('ecuador')) {
         if (content.includes('red')) flowers.importedRed += extractNumber(content, 'red');
      }
      if (content.match(/\d/)) return; 
    }

    const mappings: { key: keyof typeof flowers; regex: RegExp }[] = [
      { key: 'localRed', regex: /(\d+)\s*.*?(local red|red local|red rose)/ },
      { key: 'localPink', regex: /(\d+)\s*.*?(local pink|pink local|old rose)/ },
      { key: 'localWhite', regex: /(\d+)\s*.*?(local white|white local|white rose)/ },
      { key: 'importedRed', regex: /(\d+)\s*.*?(imported|imp red|ecuador)/ },
      { key: 'twoTonePink', regex: /(\d+)\s*.*?(two tone|two-tone)/ },
      { key: 'chinaPink', regex: /(\d+)\s*.*?(china pink|china|fuschia)/ },
      { key: 'sunflower', regex: /(\d+)\s*.*?(sunflower|sun)/ },
      { key: 'carnation', regex: /(\d+)\s*.*?(carnation)/ },
      { key: 'tulips', regex: /(\d+)\s*.*?(tulip)/ },
      { key: 'stargazer', regex: /(\d+)\s*.*?(stargazer|star)/ },
    ];

    mappings.forEach(map => {
      const cleanLine = line.replace(/^\d+[\s-]+\s*/, '');
      const originalRegexStr = map.regex.source;
      const safeRegex = new RegExp(`\\b${originalRegexStr}`);
      
      const match = cleanLine.match(safeRegex);
      if (match && match[1]) {
        flowers[map.key] += parseInt(match[1], 10);
      }
    });
  });

  return flowers;
};

// --- MAIN PARSER ---

export const parseOrderText = (text: string): Partial<OrderFormValues> => {
  const result: Partial<OrderFormValues> = {};
  
  let currentSection: 'NONE' | 'RECIPIENT' | 'SENDER' | 'SUMMARY' = 'NONE';
  
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);

  lines.forEach(line => {
    const lower = line.toLowerCase();

    // STOP WORDS (Updated to include Downpayment variations)
    const isKeyLine = lower.match(/^[\(]?(date|time|name|contact|address|total|delivery fee|mop|code|ordered by|customer|pick up|delivered to|recipient|balance|paid|downpayment|down payment|dp)/);

    if (isKeyLine) {
       if (currentSection === 'SUMMARY') currentSection = 'NONE';
    }

    // --- 1. HEADER DETECTION ---

    if (lower.match(/^order summary/)) {
      currentSection = 'SUMMARY';
      return; 
    }

    if (lower.match(/delivered to|recipient/)) {
      currentSection = 'RECIPIENT';
      if (!result.type) result.type = 'DELIVERY'; 
      return; 
    }
    
    if (lower.match(/^\(?pick\s*up\s*by/)) {
      currentSection = 'RECIPIENT'; 
      result.type = 'PICK UP';
      return; 
    }

    if (lower.match(/ordered by|customer/)) {
      currentSection = 'SENDER';
      return;
    }

    // --- 2. SUMMARY CAPTURE ---
    if (currentSection === 'SUMMARY') {
      if (!lower.includes('total') && !lower.includes('fee') && !lower.includes('paid')) {
         if (!result.orderSummary) result.orderSummary = line;
         else result.orderSummary += "\n" + line; 
         
         const possibleCode = line.match(/\b([A-Z]{1,2}\d{1,2})\b/);
         if (possibleCode && !result.code) {
             result.code = possibleCode[1];
         }
         return; 
      }
    }

    // --- 3. FIELD PARSING ---

    const dateMatch = line.match(/^(?:DATE|TARGET DATE)(?:.*:)?\s*(.*)/i);
    if (dateMatch) {
      let dStr = dateMatch[1].trim();
      if (!dStr.match(/\d{4}/)) {
         dStr += ` ${new Date().getFullYear()}`;
      }
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) result.targetDate = d;
    }

    const timeMatch = line.match(/^(?:TIME|DELIVERY TIME)\s*[:.]?\s*(.*)/i);
    if (timeMatch) result.deliveryTime = normalizeTime(timeMatch[1]);

    const codeMatch = line.match(/^(?:CODE)(?:.*:)?\s*(.*)/i);
    if (codeMatch) result.code = codeMatch[1].trim();

    // FINANCIALS
    if (lower.startsWith('total')) {
        const totalVal = parsePrice(line);
        result.total = totalVal;
        
        if (lower.includes('paid') && !lower.includes('unpaid')) {
            // Case: "TOTAL: 3200 PAID"
            // @ts-ignore
            result.status = 'PAID';
            result.amountPaid = totalVal;
            result.balance = 0; 
        } else if (lower.includes('unpaid')) {
            // Case: "TOTAL: 3200 UNPAID"
            // @ts-ignore
            result.status = 'UNPAID';
            result.amountPaid = 0;
            result.balance = totalVal;
        } else {
            // Ambiguous "TOTAL: 3200" -> Assume unpaid/balance initially
            // We will reconcile this at the end if a "Downpayment" line exists
            result.balance = totalVal;
            result.amountPaid = 0;
        }
    }
    else if (lower.includes('delivery fee')) {
        result.deliveryFee = parsePrice(line);
    }
    else if (lower.startsWith('balance')) {
        result.balance = parsePrice(line);
    }
    // FIX: Catch Downpayment / Payment Sent lines
    else if (lower.startsWith('paid') || lower.startsWith('payment sent') || lower.startsWith('downpayment') || lower.startsWith('down payment') || lower.startsWith('dp')) {
        result.amountPaid = parsePrice(line);
    }

    // CONTEXT FIELDS
    const nameMatch = line.match(/^Name\s*[:.]\s*(.*)/i);
    if (nameMatch) {
      const val = nameMatch[1].trim();
      if (currentSection === 'RECIPIENT') {
         result.deliveredTo = val;
         if (result.type === 'PICK UP') result.orderedBy = val;
      }
      else if (currentSection === 'SENDER') result.orderedBy = val;
    }

    // CONTACT MATCHING
    const contactMatch = line.match(/^(?:Contact|Mobile|Cp|Phone)\s*(?:No|Number|#)?\.?\s*[:.]?\s*([0-9\s-]+)/i);
    if (contactMatch) {
       const val = contactMatch[1].replace(/[^\d]/g, '');
       
       if (currentSection === 'SENDER') {
         result.contactNumber = val;
       } 
       else if (currentSection === 'RECIPIENT') {
         if (result.type === 'DELIVERY') {
             if (result.deliveredTo && !result.deliveredTo.includes(val)) {
                result.deliveredTo = `${result.deliveredTo} Contact No. ${val}`;
             }
         }
         if (!result.contactNumber) {
            result.contactNumber = val;
         }
       }
    }

    const addressMatch = line.match(/^(?:Complete Address|Address|Loc)\s*[:.]\s*(.*)/i);
    if (addressMatch) {
       result.address = addressMatch[1].trim();
    }

    const msgMatch = line.match(/^(?:Short greetings|Message|Card|Greetings)\s*[:.]\s*(.*)/i);
    if (msgMatch) {
       result.cardMessage = msgMatch[1].trim();
    }
  });

  // FLOWERS
  const flowers = parseFlowers(text);
  if (Object.values(flowers).some(x => x > 0)) result.flowers = flowers;
  
  // DEFAULTS
  if (!result.type) {
    if (result.address && result.address.length > 5) result.type = 'DELIVERY';
    else if (text.toLowerCase().includes('pick up')) result.type = 'PICK UP';
    else result.type = 'DELIVERY'; 
  }

  // --- FINAL RECONCILIATION ---
  // Fix the math. If we found a Total and a specific Amount Paid (via Downpayment line),
  // we must update the Balance.
  if (result.total !== undefined && result.total > 0 && result.amountPaid !== undefined && result.amountPaid > 0) {
      result.balance = result.total - result.amountPaid;
  }

  return result;
};