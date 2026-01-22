import { z } from 'zod';

const timeStringSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
  message: "Time is required",
});

export const OrderSchema = z.object({
  targetDate: z.coerce.date(), 
  deliveryTime: timeStringSchema, 
  type: z.enum(['PICK UP', 'DELIVERY']),
  status: z.enum(['PAID', 'UNPAID', 'DOWNPAYMENT', 'INCOMPLETE']).default('UNPAID'),
  mop: z.string().min(1, "Mode of Payment is required"),
  deliveredTo: z.string().min(1, "Recipient Name is required"),
  orderedBy: z.string().min(1, "Customer Name is required"),
  
  contactNumber: z.string().min(11, "Mobile number must be 11 digits").regex(/^09\d{9}$/, "Must start with 09"),
  
  address: z.string().optional(),
  cardMessage: z.string().optional(),
  
  flowers: z.object({
    localRed: z.number().int().min(0).default(0),
    localPink: z.number().int().min(0).default(0),
    localWhite: z.number().int().min(0).default(0),
    importedRed: z.number().int().min(0).default(0),
    twoTonePink: z.number().int().min(0).default(0),
    chinaPink: z.number().int().min(0).default(0),
    sunflower: z.number().int().min(0).default(0),
    carnation: z.number().int().min(0).default(0),
    tulips: z.number().int().min(0).default(0),
    stargazer: z.number().int().min(0).default(0),
  }),
  
  code: z.string().default(""),
  others: z.string().default(""),
  orderSummary: z.string().default(""),
  
  notes: z.string().default(""),
  deliveryFee: z.number().min(0).default(0),
  
  // Financials
  total: z.number().min(0, "Total must be positive"),
  balance: z.number().default(0), // NEW: User types this
  amountPaid: z.number().default(0), // Calculated hidden field
});

export type OrderFormValues = z.infer<typeof OrderSchema>;