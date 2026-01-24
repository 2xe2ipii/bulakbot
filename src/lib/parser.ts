import type { OrderFormValues } from './schema';

// --- HELPERS ---

const parsePrice = (str: string): number => {
  if (!str) return 0;
  const clean = str.replace(/[^\d.]/g, ''); 
  return parseFloat(clean) || 0;
};

const normalizeTime = (raw: string): string => {
  if (!raw) return "";
  const clean = raw.toLowerCase().replace(/\s+/g, '');
  
  const rangeMatch = clean.match(/^(\d{1,2}(?:[:.]\d{2})?)(?:(?:-|to)(\d{1,2}(?:[:.]\d{2})?))?([ap]m)?$/);
  
  if (!rangeMatch) {
      const fallback = clean.match(/(\d{1,2}(?:[:.]\d{2})?)([ap]m)?/);
      if(!fallback) return "";
      return formatHhMm(fallback[1], fallback[2]);
  }

  let [_, startStr, endStr, suffix] = rangeMatch;
  let startSuffix = suffix;
  
  if (startStr && endStr && suffix) {
     const startVal = parseFloat(startStr.replace(':', '.'));
     const endVal = parseFloat(endStr.replace(':', '.'));
     
     if (suffix === 'pm') {
         if (startVal < 12 && startVal > endVal) startSuffix = 'am';
         else startSuffix = 'pm';
     } else {
         startSuffix = 'am';
     }
  }

  return formatHhMm(startStr, startSuffix);
};

const formatHhMm = (timeStr: string, suffix?: string): string => {
   if (!timeStr) return "";
   let [hStr, mStr] = timeStr.replace('.', ':').split(':');
   let h = parseInt(hStr, 10);
   if (!mStr) mStr = "00";

   if (suffix === 'pm' && h < 12) h += 12;
   if (suffix === 'am' && h === 12) h = 0;

   return `${h.toString().padStart(2, '0')}:${mStr}`;
};

// --- STRICT QUANTITY EXTRACTION (With Dozen Support) ---
const extractQty = (str: string): number | null => {
  // 1. Check for Dozen first (multiplier)
  const dozMatch = str.match(/\b(\d+)\s*(?:doz|dozen|dozens)\b/i);
  if (dozMatch) {
      return parseInt(dozMatch[1], 10) * 12;
  }

  // 2. Strict Unit Match: "3 pcs"
  const unitMatch = str.match(/\b(\d+)\s*(?:pc|pcs|stem|stems)\b/i);
  if (unitMatch) return parseInt(unitMatch[1], 10);

  // 3. Price Pattern: "500 - 3 sunflower"
  const priceDashMatch = str.match(/^\s*\d+[\s-]+\s*(\d+)\b/);
  if (priceDashMatch) return parseInt(priceDashMatch[1], 10);

  // 4. Fallback: Small numbers only
  const looseMatch = str.match(/\b(\d+)\b/);
  if (looseMatch) {
      const val = parseInt(looseMatch[1], 10);
      if (val < 100) return val; 
  }

  return null;
};

// --- SMART SPLITTER ---
const smartSplit = (text: string): string[] => {
  const segments: string[] = [];
  let current = "";
  let parenDepth = 0;

  for (const char of text) {
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;

    if ((char === '\n' || (char === ',' && parenDepth === 0))) {
      if (current.trim()) segments.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) segments.push(current.trim());
  return segments;
};

// --- FLOWER PARSING ENGINE ---

const parseFlowers = (text: string) => {
  const flowers: OrderFormValues['flowers'] = {
    localRed: 0, localPink: 0, localWhite: 0, importedRed: 0, twoTonePink: 0,
    chinaPink: 0, sunflower: 0, carnation: 0, tulips: 0, stargazer: 0
  };

  const lowerText = text.toLowerCase();
  const segments = smartSplit(lowerText);

  segments.forEach(segment => {
    if (segment.includes('delivery fee') || segment.includes('fee')) return;

    const rawQty = extractQty(segment);
    let mainQty = rawQty !== null ? rawQty : 1;
    
    // --- 1. HANDLE PARENTHESES ---
    const parenMatch = segment.match(/\((.*?)\)/);
    
    if (parenMatch) {
       const inside = parenMatch[1];
       const parts = inside.split(/,|&|\+/).map(p => p.trim());
       
       let parensParsed = false;

       parts.forEach(part => {
          const subQty = extractQty(part);
          // Only inherit mainQty if there is exactly one item inside parens and no subQty
          const count = subQty !== null ? subQty : (parts.length === 1 ? mainQty : 1);

          let matched = false;
          if (part.includes('two') || part.includes('tone')) { flowers.twoTonePink += count; matched = true; }
          else if (part.includes('china') || part.includes('fuschia')) { flowers.chinaPink += count; matched = true; }
          else if (part.includes('sunflower') || part.includes('sun')) { flowers.sunflower += count; matched = true; }
          else if (segment.includes('imported') || segment.includes('ecuador')) {
             if (part.includes('red')) { flowers.importedRed += count; matched = true; }
          } else {
             if (part.includes('red')) { flowers.localRed += count; matched = true; }
             else if (part.includes('white')) { flowers.localWhite += count; matched = true; }
             else if (part.includes('pink') || part.includes('old')) { flowers.localPink += count; matched = true; }
          }
          if (matched) parensParsed = true;
       });

       if (parensParsed) return; 
    }

    // --- 2. MAIN SEGMENT LOGIC ---

    if (segment.includes('two') || segment.includes('tone')) { flowers.twoTonePink += mainQty; return; }
    if (segment.includes('china') || segment.includes('fuschia')) { flowers.chinaPink += mainQty; return; }
    if (segment.includes('sunflower') || segment.includes('sun')) { flowers.sunflower += mainQty; return; }
    if (segment.includes('carnation')) { flowers.carnation += mainQty; return; }
    if (segment.includes('stargazer') || segment.includes('star')) { flowers.stargazer += mainQty; return; }
    if (segment.includes('tulip')) { flowers.tulips += mainQty; return; }

    const isImported = segment.includes('imported') || segment.includes('ecuador');
    const isLocal = segment.includes('local') || (!isImported && (segment.includes('rose') || segment.includes('flower'))); 

    if (isImported) {
        if (segment.includes('red')) flowers.importedRed += mainQty;
        else flowers.importedRed += mainQty; 
    } 
    else if (isLocal) {
        if (segment.includes('red')) flowers.localRed += mainQty;
        else if (segment.includes('white')) flowers.localWhite += mainQty;
        else if (segment.includes('pink') || segment.includes('old')) flowers.localPink += mainQty;
    }
  });

  return flowers;
};

// --- MAIN PARSER ---

export const parseOrderText = (text: string): Partial<OrderFormValues> => {
  const result: Partial<OrderFormValues> = {};
  
  let currentSection: 'NONE' | 'RECIPIENT' | 'SENDER' | 'SUMMARY' | 'NOTES' = 'NONE';
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  let summaryTextBlock = ""; 

  if (text.toLowerCase().includes('pick up')) result.type = 'PICK UP';
  else result.type = 'DELIVERY';

  lines.forEach(line => {
    const lower = line.toLowerCase();

    // Section Reset
    if (currentSection === 'SUMMARY' && lower.match(/^(total|down|gsh|payment|date|time|name|address|contact)/)) {
        currentSection = 'NONE';
    }

    // Section Detection
    if (lower.match(/^order summary/)) { currentSection = 'SUMMARY'; return; }
    if (lower.match(/delivered to|recipient/)) { currentSection = 'RECIPIENT'; return; }
    if (lower.match(/^\(?pick\s*up\s*by/)) { currentSection = 'RECIPIENT'; result.type = 'PICK UP'; return; }
    if (lower.match(/ordered by|customer/)) { currentSection = 'SENDER'; return; }
    if (lower.match(/^(notes|ps|nb|internal notes)[:.]/)) {
        currentSection = 'NOTES';
        const content = line.replace(/^(notes|ps|nb|internal notes)[:.]\s*/i, '').trim();
        if (content) result.notes = content;
        return; 
    }
    
    // --- Data Capture ---

    if (currentSection === 'NOTES') {
        if (!result.notes) result.notes = line;
        else result.notes += "\n" + line;
        return;
    }

    if (currentSection === 'SUMMARY') {
        if (!lower.includes('delivery fee') && !lower.includes('fee')) {
            if (!result.orderSummary) result.orderSummary = line;
            else result.orderSummary += "\n" + line;
            summaryTextBlock += line + "\n"; 
            const possibleCode = line.match(/\b([A-Z]{1,2}\d{1,2})\b/);
            if (possibleCode && !result.code) result.code = possibleCode[1];
        }
    }

    // --- Fields ---

    const dateMatch = line.match(/^(?:DATE|TARGET DATE)(?:.*:)?\s*(.*)/i);
    if (dateMatch) {
      let dStr = dateMatch[1].trim();
      if (!dStr.match(/\d{4}/)) dStr += ` ${new Date().getFullYear()}`;
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) result.targetDate = d;
    }

    const timeMatch = line.match(/^(?:TIME|DELIVERY TIME)\s*[:.]?\s*(.*)/i);
    if (timeMatch) result.deliveryTime = normalizeTime(timeMatch[1]);

    // Financials & Full Payment Logic
    if (lower.startsWith('total')) {
        result.total = parsePrice(line);
        
        // Check if the Total line itself says "paid" or "unpaid"
        if (lower.includes('paid') && !lower.includes('unpaid')) {
            result.amountPaid = result.total;
        } else if (lower.includes('unpaid')) {
            result.amountPaid = 0;
        }
        
        // Default Assumption if not overwritten later
        if (result.amountPaid === undefined) {
             result.balance = result.total;
        }
    }
    
    if (lower.startsWith('downpayment') || lower.startsWith('dp') || lower.startsWith('paid') || lower.startsWith('payment')) {
        if (lower.includes('full') || lower.includes('fully') || lower.includes('paid')) {
            // "Downpayment: Full Payment" or "Payment: Paid"
            // We need to know the Total to set this correctly. 
            // If Total matches parsed already, set amountPaid = total.
            // If total not found yet, we flag it? 
            // Simpler: If "Full", set a flag or try to parse number. 
            // If text is just "Full Payment" with no number, we rely on Total being found later or earlier.
            if (result.total) {
                result.amountPaid = result.total;
            } else {
                // If total not found yet, we can't set amountPaid safely to a number.
                // But usually Total comes before Downpayment in your template.
                // If not, we can infer it.
            }
        } else {
            result.amountPaid = parsePrice(line);
        }
    }

    if (lower.includes('delivery fee')) {
        result.deliveryFee = parsePrice(line);
    }

    const nameMatch = line.match(/^Name\s*[:.]\s*(.*)/i);
    if (nameMatch) {
       const val = nameMatch[1].trim();
       if (currentSection === 'RECIPIENT') {
           result.deliveredTo = val;
           if (result.type === 'PICK UP') result.orderedBy = val;
       }
       else if (currentSection === 'SENDER') result.orderedBy = val;
    }

    const contactMatch = line.match(/^(?:Contact|Mobile|Cp|Phone)\s*(?:No|Number|#)?\.?\s*[:.]?\s*([0-9\s-]+)/i);
    if (contactMatch) {
       const val = contactMatch[1].replace(/[^\d]/g, ''); 
       if (currentSection === 'SENDER') {
          result.contactNumber = val;
       } 
       else if (currentSection === 'RECIPIENT') {
           if (!result.contactNumber) result.contactNumber = val;
           if (result.type === 'DELIVERY') {
               if (result.deliveredTo && !result.deliveredTo.includes(val)) {
                   result.deliveredTo = `${result.deliveredTo} Contact No. ${val}`;
               }
           }
       }
    }

    const addressMatch = line.match(/^(?:Complete\s*Address|Address|Location|Loc|Landmark)(?:.*)?\s*[:.]\s*(.*)/i);
    if (addressMatch) result.address = addressMatch[1].trim();

    const msgMatch = line.match(/^(?:Short greetings|Message|Card|Greetings)\s*[:.]\s*(.*)/i);
    if (msgMatch) result.cardMessage = msgMatch[1].trim();
  });

  // Parse Flowers
  const textToScanForFlowers = summaryTextBlock.trim().length > 0 ? summaryTextBlock : text;
  const flowers = parseFlowers(textToScanForFlowers);
  if (Object.values(flowers).some(x => x > 0)) result.flowers = flowers;

  // Final Math & Status
  // If amountPaid was set to Total via "Full Payment" logic, ensure balance is 0
  if (result.total !== undefined) {
      // Re-check for Full Payment Flag in case Total came AFTER the Downpayment line
      // (Rare, but possible in loose text). 
      // Current logic assumes Total is found before or we used parsePrice.
      
      const paid = result.amountPaid || 0;
      result.balance = result.total - paid;
      
      if (result.balance <= 0) result.status = 'PAID';
      else if (paid > 0) result.status = 'DOWNPAYMENT';
      else result.status = 'UNPAID';
  }

  return result;
};