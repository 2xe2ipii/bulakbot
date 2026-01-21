import { z } from 'zod';

// --- Helper Schemas ---

// Regex to strictly match "HH:MM AM/PM" format
const timeStringSchema = z.string().regex(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i, {
  message: "Time must be in format HH:MM AM/PM (e.g. 10:30 AM)",
});

// --- Main Order Schema ---

export const OrderSchema = z.object({
  // Logistics
  targetDate: z.date({ required_error: "Date is required" }),
  deliveryTime: timeStringSchema, // Input: "10:30 AM"
  type: z.enum(['PICK UP', 'DELIVERY']),
  
  // Customer Info
  status: z.enum(['PAID', 'UNPAID', 'DOWNPAYMENT']).default('UNPAID'),
  mop: z.string().min(1, "Mode of Payment is required"), // Cash, G-Cash, etc.
  deliveredTo: z.string().min(1, "Recipient Name is required"),
  orderedBy: z.string().min(1, "Customer Name is required"),
  contactNumber: z.string().min(1, "Contact # is required"), // We keep as string to preserve '09'
  address: z.string().optional(), // Optional because 'Pick Up' might not need it
  cardMessage: z.string().optional(),

  // Flower Inventory (Integers only, non-negative)
  flowers: z.object({
    sun: z.number().int().min(0).default(0),
    impLocal: z.number().int().min(0).default(0),
    chinaRed: z.number().int().min(0).default(0),
    localRed: z.number().int().min(0).default(0),
    pink: z.number().int().min(0).default(0),
    white: z.number().int().min(0).default(0),
    carnation: z.number().int().min(0).default(0),
    stargazer: z.number().int().min(0).default(0),
    mums: z.number().int().min(0).default(0),
    gypso: z.number().int().min(0).default(0),
  }),

  // Order Details
  code: z.string().default(""), // Bouquet Code
  others: z.string().default(""), // Add-ons
  orderSummary: z.string().default(""), // "Flowers + Others"
  notes: z.string().default(""),

  // Financials
  deliveryFee: z.number().min(0).default(0),
  total: z.number().min(0, "Total must be positive"),
  amountPaid: z.number().min(0).default(0), 
  // 'Balance' is derived: total - amountPaid (Calculated at submit time)
});

// Extract the Type for use in React components
export type OrderFormValues = z.infer<typeof OrderSchema>;