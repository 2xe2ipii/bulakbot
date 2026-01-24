import type { OrderFormValues } from './schema';

// --- TIME HELPERS ---

const normalizeTime = (raw: string): string => {
  if (!raw) return "";
  
  // Clean up
  const clean = raw.toLowerCase().replace(/\s+/g, '');
  
  // Regex to capture start and optional end time with am/pm
  // Matches: "2:30", "2:30pm", "2:30-3:00pm", "2-3pm"
  const rangeMatch = clean.match(/^(\d{1,2}(?:[:.]\d{2})?)(?:(?:-|to)(\d{1,2}(?:[:.]\d{2})?))?([ap]m)?$/);
  
  if (!rangeMatch) {
      // Fallback: try to just grab the first valid time-looking thing
      const fallback = clean.match(/(\d{1,2}(?:[:.]\d{2})?)([ap]m)?/);
      if(!fallback) return "";
      return formatHhMm(fallback[1], fallback[2]);
  }

  let [_, startStr, endStr, suffix] = rangeMatch;

  // If we have a range "2-3pm", and start has no suffix, we infer it.
  // Logic: If end is PM, and start < end, start is likely PM too (2-3pm).
  // If start > end (11-1pm), start is likely AM.
  let startSuffix = suffix;
  
  if (startStr && endStr && suffix) {
     const startVal = parseFloat(startStr.replace(':', '.'));
     const endVal = parseFloat(endStr.replace(':', '.'));
     
     if (suffix === 'pm') {
         // e.g. 2-3pm -> 2pm. 11-1pm -> 11am.
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
   let [hStr, mStr] = timeStr.replace('.', ':').split(':');
   let h = parseInt(hStr, 10);
   if (!mStr) mStr = "00";

   if (suffix === 'pm' && h < 12) h += 12;
   if (suffix === 'am' && h === 12) h = 0;

   // Force 24h format string return to avoid ambiguity
   return `${h.toString().padStart(2, '0')}:${mStr}`;
};

const parsePrice = (str: string): number => {
  if (!str) return 0;
  const clean = str.replace(/[^\d.]/g, ''); 
  return parseFloat(clean) || 0;
};

// --- ADVANCED FLOWER PARSING ---

const extractQty = (str: string): number | null => {
  const match = str.match(/\b(\d+)\s*(?:pc|pcs|doz|stem|stems)?\b/);
  return match ? parseInt(match[1], 10) : null;
};

const parseFlowers = (text: string) => {
  const flowers: OrderFormValues['flowers'] = {
    localRed: 0, localPink: 0, localWhite: 0, importedRed: 0, twoTonePink: 0,
    chinaPink: 0, sunflower: 0, carnation: 0, tulips: 0, stargazer: 0
  };

  const lowerText = text.toLowerCase();

  // 1. SPLIT ITEMS
  // Split by newline OR comma, but IGNORE commas inside parentheses
  // Regex: Split by , or \n if not followed by ) without a preceding (
  const segments = lowerText.split(/,|\n/g).map(s => s.trim()).filter(s => s);

  segments.forEach(segment => {
    // Basic quantity extraction for the segment
    // e.g. "3 pcs local roses (red)" -> qty 3
    let mainQty = extractQty(segment) || 0; 
    
    // Identify Category
    const isImported = segment.includes('imported') || segment.includes('ecuador');
    const isLocal = segment.includes('local') || (!isImported && segment.includes('rose')); // Default to local if just "roses"
    const isRose = segment.includes('rose');

    // --- CHECK FOR PARENTHESES BREAKDOWN ---
    // e.g. "3 pcs local (1 red, 2 pink)" or "3 pcs local (red)"
    const parenMatch = segment.match(/\((.*?)\)/);
    
    if (parenMatch && isRose) {
       const inside = parenMatch[1];
       // Split inside by comma or plus or &
       const parts = inside.split(/,|&|\+/).map(p => p.trim());
       
       // Heuristic: If we find specific counts inside, we use them.
       // If we find NO counts inside, we apply the mainQty to the found type.

       parts.forEach(part => {
          const subQty = extractQty(part);
          const count = subQty !== null ? subQty : (parts.length === 1 ? mainQty : 0);
          
          // MAPPING INSIDE PARENS
          if (isImported) {
             if (part.includes('two') || part.includes('tone')) flowers.twoTonePink += count;
             else if (part.includes('china') || part.includes('fuschia')) flowers.chinaPink += count;
             else if (part.includes('red')) flowers.importedRed += count;
          } else {
             // Local
             if (part.includes('red')) flowers.localRed += count;
             else if (part.includes('white')) flowers.localWhite += count;
             else if (part.includes('pink') || part.includes('old')) flowers.localPink += count;
          }
       });

       // If we successfully parsed types inside the parens, we are done with this segment.
       return; 
    }

    // --- NO PARENTHESES BREAKDOWN (or not a rose breakdown) ---
    // e.g. "3 pcs local red roses" or "10 two-tone"

    if (segment.includes('sunflower') || segment.includes('sun')) {
        flowers.sunflower += mainQty;
        return;
    }
    if (segment.includes('carnation')) {
        flowers.carnation += mainQty;
        return;
    }
    if (segment.includes('stargazer') || segment.includes('star')) {
        flowers.stargazer += mainQty;
        return;
    }
    if (segment.includes('tulip')) {
        flowers.tulips += mainQty;
        return;
    }

    // ROSE LOGIC (Main String)
    if (isImported) {
        if (segment.includes('two') || segment.includes('tone')) flowers.twoTonePink += mainQty;
        else if (segment.includes('china') || segment.includes('fuschia')) flowers.chinaPink += mainQty;
        else if (segment.includes('red')) flowers.importedRed += mainQty;
        // Default imported to red if no color specified
        else if (segment.includes('imported') && !segment.includes('local')) flowers.importedRed += mainQty;
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
  
  let currentSection: 'NONE' | 'RECIPIENT' | 'SENDER' | 'SUMMARY' = 'NONE';
  
  // Pre-split by lines
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);

  lines.forEach(line => {
    const lower = line.toLowerCase();

    // SECTION DETECTION
    if (lower.match(/^order summary/)) { currentSection = 'SUMMARY'; return; }
    if (lower.match(/delivered to|recipient/)) { currentSection = 'RECIPIENT'; if (!result.type) result.type = 'DELIVERY'; return; }
    if (lower.match(/^\(?pick\s*up\s*by/)) { currentSection = 'RECIPIENT'; result.type = 'PICK UP'; return; }
    if (lower.match(/ordered by|customer/)) { currentSection = 'SENDER'; return; }
    
    // STOP WORDS for Summary
    if (currentSection === 'SUMMARY' && lower.match(/^(total|down|gsh|payment|date|time|name|address|contact)/)) {
        currentSection = 'NONE';
    }

    // --- SUMMARY CAPTURE ---
    if (currentSection === 'SUMMARY') {
        // Capture text for the "Order Summary" text field
        if (!result.orderSummary) result.orderSummary = line;
        else result.orderSummary += "\n" + line;

        // Try to find the Code (e.g. A3, I3)
        const possibleCode = line.match(/\b([A-Z]{1}\d{1,2})\b/); // Matches A3, R10
        if (possibleCode && !result.code) result.code = possibleCode[1];
    }

    // --- FIELD PARSING ---

    // Date
    const dateMatch = line.match(/^(?:DATE|TARGET DATE)(?:.*:)?\s*(.*)/i);
    if (dateMatch) {
      let dStr = dateMatch[1].trim();
      // Add current year if missing
      if (!dStr.match(/\d{4}/)) dStr += ` ${new Date().getFullYear()}`;
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) result.targetDate = d;
    }

    // Time
    const timeMatch = line.match(/^(?:TIME|DELIVERY TIME)\s*[:.]?\s*(.*)/i);
    if (timeMatch) {
        result.deliveryTime = normalizeTime(timeMatch[1]);
    }

    // Financials
    if (lower.startsWith('total')) {
        result.total = parsePrice(line);
        // Default status logic
        result.balance = result.total;
    }
    if (lower.startsWith('downpayment') || lower.startsWith('dp') || lower.startsWith('paid')) {
        result.amountPaid = parsePrice(line);
    }
    if (lower.includes('delivery fee')) {
        result.deliveryFee = parsePrice(line);
    }

    // Context Fields (Name, Contact, Addr)
    const nameMatch = line.match(/^Name\s*[:.]\s*(.*)/i);
    if (nameMatch) {
       const val = nameMatch[1].trim();
       if (currentSection === 'RECIPIENT') {
           result.deliveredTo = val;
           if (result.type === 'PICK UP') result.orderedBy = val; // Default for pickup
       }
       else if (currentSection === 'SENDER') result.orderedBy = val;
    }

    const contactMatch = line.match(/^(?:Contact|Mobile|Cp|Phone)\s*(?:No|Number|#)?\.?\s*[:.]?\s*([0-9\s-]+)/i);
    if (contactMatch) {
       const val = contactMatch[1].replace(/[^\d]/g, ''); // Clean non-digits
       if (currentSection === 'SENDER') result.contactNumber = val;
       else if (currentSection === 'RECIPIENT') {
           if (!result.contactNumber) result.contactNumber = val;
       }
    }

    const addressMatch = line.match(/^(?:Complete Address|Address|Loc)\s*[:.]\s*(.*)/i);
    if (addressMatch) result.address = addressMatch[1].trim();

    const msgMatch = line.match(/^(?:Short greetings|Message|Card|Greetings)\s*[:.]\s*(.*)/i);
    if (msgMatch) result.cardMessage = msgMatch[1].trim();

  });

  // Parse Flowers from full text
  const flowers = parseFlowers(text);
  if (Object.values(flowers).some(x => x > 0)) result.flowers = flowers;

  // Final Math Reconciliation
  if (result.total && result.amountPaid) {
      result.balance = result.total - result.amountPaid;
      if (result.balance <= 0) result.status = 'PAID';
      else result.status = 'DOWNPAYMENT';
  }

  // Fallback Type
  if (!result.type) {
      result.type = (text.toLowerCase().includes('pick up')) ? 'PICK UP' : 'DELIVERY';
  }

  return result;
};