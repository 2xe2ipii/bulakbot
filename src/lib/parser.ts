import type { OrderFormValues } from './schema';

// --- HELPERS ---

const parsePrice = (str: string): number => {
  if (!str) return 0;
  const clean = str.replace(/[^\d.]/g, ''); 
  return parseFloat(clean) || 0;
};

const normalizeTime = (raw: string): string => {
  if (!raw) return "";
  
  // Remove spaces and lowercase
  const clean = raw.toLowerCase().replace(/\s+/g, '');
  
  // Regex to capture: (Start)(Separator)(End)(Suffix)
  // Matches: "2:30", "2:30pm", "2:30-3:00pm", "2-3pm"
  const rangeMatch = clean.match(/^(\d{1,2}(?:[:.]\d{2})?)(?:(?:-|to)(\d{1,2}(?:[:.]\d{2})?))?([ap]m)?$/);
  
  if (!rangeMatch) {
      // Fallback: try to just grab the first valid time-looking thing
      const fallback = clean.match(/(\d{1,2}(?:[:.]\d{2})?)([ap]m)?/);
      if(!fallback) return "";
      return formatHhMm(fallback[1], fallback[2]);
  }

  let [_, startStr, endStr, suffix] = rangeMatch;

  // LOGIC: Infer start suffix from end suffix
  let startSuffix = suffix;
  
  if (startStr && endStr && suffix) {
     const startVal = parseFloat(startStr.replace(':', '.'));
     const endVal = parseFloat(endStr.replace(':', '.'));
     
     if (suffix === 'pm') {
         // Case: 2-3pm -> 2pm. 
         // Case: 11-1pm -> 11am
         if (startVal < 12 && startVal > endVal) startSuffix = 'am';
         else startSuffix = 'pm';
     } else {
         // e.g. 9-11am
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

// --- IMPROVED QUANTITY EXTRACTION ---
const extractQty = (str: string): number | null => {
  // 1. Strict Match: Look for number followed immediately by a unit (e.g. "3 pcs", "1 doz")
  // This prevents matching "500" in "500 - 3 pcs"
  const strictMatch = str.match(/\b(\d+)\s*(?:pc|pcs|doz|stem|stems)\b/i);
  if (strictMatch) return parseInt(strictMatch[1], 10);

  // 2. Price Cleaning: If no unit, assume the format might be "Price - Qty Item"
  // Remove potential price prefix (Digits followed by dash)
  // e.g. "500 - 3 sunflower" -> "3 sunflower"
  const cleanStr = str.replace(/^\s*\d+[\s-]+\s*/, '');

  // 3. Loose Match: Look for any remaining number
  const looseMatch = cleanStr.match(/\b(\d+)\b/);
  if (looseMatch) return parseInt(looseMatch[1], 10);

  return null;
};

// --- FLOWER PARSING ENGINE ---

const parseFlowers = (text: string) => {
  const flowers: OrderFormValues['flowers'] = {
    localRed: 0, localPink: 0, localWhite: 0, importedRed: 0, twoTonePink: 0,
    chinaPink: 0, sunflower: 0, carnation: 0, tulips: 0, stargazer: 0
  };

  const lowerText = text.toLowerCase();
  
  // Split logic: Split by comma or newline
  const segments = lowerText.split(/,|\n/g).map(s => s.trim()).filter(s => s);

  segments.forEach(segment => {
    const rawQty = extractQty(segment);
    // Default to 1 if item found but no quantity (e.g. "sunflower" -> 1 sunflower)
    let mainQty = rawQty !== null ? rawQty : 1;
    
    // --- 1. HANDLE PARENTHESES BREAKDOWN ---
    const parenMatch = segment.match(/\((.*?)\)/);
    
    if (parenMatch) {
       const inside = parenMatch[1];
       const parts = inside.split(/,|&|\+/).map(p => p.trim());
       
       let parensParsed = false;

       parts.forEach(part => {
          const subQty = extractQty(part);
          // Inside parens logic: 
          // If subQty found, use it. 
          // If list has multiple items but no qty, assume 1 each.
          // If list has single item with no qty, assume mainQty.
          const count = subQty !== null ? subQty : (parts.length === 1 ? mainQty : 1);

          let matched = false;
          if (part.includes('two') || part.includes('tone')) { flowers.twoTonePink += count; matched = true; }
          else if (part.includes('china') || part.includes('fuschia')) { flowers.chinaPink += count; matched = true; }
          else if (segment.includes('imported') || segment.includes('ecuador')) {
             if (part.includes('red')) { flowers.importedRed += count; matched = true; }
          } else {
             // Local defaults
             if (part.includes('red')) { flowers.localRed += count; matched = true; }
             else if (part.includes('white')) { flowers.localWhite += count; matched = true; }
             else if (part.includes('pink') || part.includes('old')) { flowers.localPink += count; matched = true; }
          }
          if (matched) parensParsed = true;
       });

       if (parensParsed) return; 
    }

    // --- 2. NO PARENTHESES LOGIC ---

    if (segment.includes('two') || segment.includes('tone')) {
        flowers.twoTonePink += mainQty; return;
    }
    if (segment.includes('china') || segment.includes('fuschia')) {
        flowers.chinaPink += mainQty; return;
    }
    if (segment.includes('sunflower') || segment.includes('sun')) {
        flowers.sunflower += mainQty; return;
    }
    if (segment.includes('carnation')) {
        flowers.carnation += mainQty; return;
    }
    if (segment.includes('stargazer') || segment.includes('star')) {
        flowers.stargazer += mainQty; return;
    }
    if (segment.includes('tulip')) {
        flowers.tulips += mainQty; return;
    }

    const isImported = segment.includes('imported') || segment.includes('ecuador');
    const isLocal = segment.includes('local') || (!isImported && segment.includes('rose'));

    if (isImported) {
        if (segment.includes('red')) flowers.importedRed += mainQty;
        else flowers.importedRed += mainQty; // Default to Red if unspec
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

  // 1. First Pass: Detect Type
  if (text.toLowerCase().includes('pick up')) result.type = 'PICK UP';
  else result.type = 'DELIVERY'; // Default

  lines.forEach(line => {
    const lower = line.toLowerCase();

    // SECTION RESET
    if (currentSection === 'SUMMARY' && lower.match(/^(total|down|gsh|payment|date|time|name|address|contact)/)) {
        currentSection = 'NONE';
    }

    // SECTION DETECTION
    if (lower.match(/^order summary/)) { currentSection = 'SUMMARY'; return; }
    if (lower.match(/delivered to|recipient/)) { currentSection = 'RECIPIENT'; return; }
    if (lower.match(/^\(?pick\s*up\s*by/)) { currentSection = 'RECIPIENT'; result.type = 'PICK UP'; return; }
    if (lower.match(/ordered by|customer/)) { currentSection = 'SENDER'; return; }
    
    // NOTES DETECTION
    if (lower.match(/^(notes|ps|nb|internal notes)[:.]/)) {
        currentSection = 'NOTES';
        const content = line.replace(/^(notes|ps|nb|internal notes)[:.]\s*/i, '').trim();
        if (content) result.notes = content;
        return; 
    }
    
    // --- NOTES CAPTURE ---
    if (currentSection === 'NOTES') {
        if (!result.notes) result.notes = line;
        else result.notes += "\n" + line;
        return;
    }

    // --- SUMMARY CAPTURE ---
    if (currentSection === 'SUMMARY') {
        if (!result.orderSummary) result.orderSummary = line;
        else result.orderSummary += "\n" + line;

        const possibleCode = line.match(/\b([A-Z]{1,2}\d{1,2})\b/);
        if (possibleCode && !result.code) result.code = possibleCode[1];
    }

    // --- FIELD PARSING ---

    // Date
    const dateMatch = line.match(/^(?:DATE|TARGET DATE)(?:.*:)?\s*(.*)/i);
    if (dateMatch) {
      let dStr = dateMatch[1].trim();
      if (!dStr.match(/\d{4}/)) dStr += ` ${new Date().getFullYear()}`;
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) result.targetDate = d;
    }

    // Time
    const timeMatch = line.match(/^(?:TIME|DELIVERY TIME)\s*[:.]?\s*(.*)/i);
    if (timeMatch) result.deliveryTime = normalizeTime(timeMatch[1]);

    // Financials
    if (lower.startsWith('total')) {
        result.total = parsePrice(line);
        result.balance = result.total; 
    }
    if (lower.startsWith('downpayment') || lower.startsWith('dp') || lower.startsWith('paid')) {
        result.amountPaid = parsePrice(line);
    }
    if (lower.includes('delivery fee')) {
        result.deliveryFee = parsePrice(line);
    }

    // Names
    const nameMatch = line.match(/^Name\s*[:.]\s*(.*)/i);
    if (nameMatch) {
       const val = nameMatch[1].trim();
       if (currentSection === 'RECIPIENT') {
           result.deliveredTo = val;
           if (result.type === 'PICK UP') result.orderedBy = val;
       }
       else if (currentSection === 'SENDER') result.orderedBy = val;
    }

    // Contact Numbers
    const contactMatch = line.match(/^(?:Contact|Mobile|Cp|Phone)\s*(?:No|Number|#)?\.?\s*[:.]?\s*([0-9\s-]+)/i);
    if (contactMatch) {
       const val = contactMatch[1].replace(/[^\d]/g, ''); 
       
       if (currentSection === 'SENDER') {
          result.contactNumber = val;
       } 
       else if (currentSection === 'RECIPIENT') {
           if (!result.contactNumber) result.contactNumber = val;
           
           // Only append to Name if DELIVERY
           if (result.type === 'DELIVERY') {
               if (result.deliveredTo && !result.deliveredTo.includes(val)) {
                   result.deliveredTo = `${result.deliveredTo} Contact No. ${val}`;
               }
           }
       }
    }

    const addressMatch = line.match(/^(?:Complete Address|Address|Loc)\s*[:.]\s*(.*)/i);
    if (addressMatch) result.address = addressMatch[1].trim();

    const msgMatch = line.match(/^(?:Short greetings|Message|Card|Greetings)\s*[:.]\s*(.*)/i);
    if (msgMatch) result.cardMessage = msgMatch[1].trim();

  });

  // Parse Flowers
  const flowers = parseFlowers(text);
  if (Object.values(flowers).some(x => x > 0)) result.flowers = flowers;

  // Final Math
  if (result.total && result.amountPaid) {
      result.balance = result.total - result.amountPaid;
      if (result.balance <= 0) result.status = 'PAID';
      else result.status = 'DOWNPAYMENT';
  }

  return result;
};