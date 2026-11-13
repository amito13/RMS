import { addMonths } from 'date-fns';

import type { NewTenantInput, PaymentMode } from '@/lib/db-types';
import { nextDueDate, toDay, today } from '@/lib/dates';

import type { PickedFile } from './documents';

export type AadhaarSlot = 'aadhaar_front' | 'aadhaar_back' | 'aadhaar_pdf';

export type AddTenantForm = {
  // Step 1: person
  full_name: string;
  /** 10 digits, without +91. */
  phone: string;
  member_count: number;
  alt_phone: string;
  permanent_address: string;
  occupation: string;
  emergency_name: string;
  emergency_phone: string;
  aadhaar_last4: string;
  // Step 2: unit and rent
  unit_id: string | null;
  shift_date: Date;
  monthly_rent: string;
  rent_due_day: string;
  /** For tenants who already live there: when the next rent is due. */
  next_due: Date;
  // Step 3: advance and agreement
  advance_agreed: string;
  advance_received: string;
  advance_mode: PaymentMode;
  agreement_start: Date;
  term_months: number;
  notice_period_days: string;
  // Step 4: documents
  docs: Partial<Record<AadhaarSlot, PickedFile>>;
  // Which defaults the landlord has overridden, so we stop auto-filling them.
  touched: { rent: boolean; dueDay: boolean; nextDue: boolean; start: boolean };
};

export function emptyForm(unitId: string | null, noticeDays: number): AddTenantForm {
  const t = today();
  return {
    full_name: '',
    phone: '',
    member_count: 1,
    alt_phone: '',
    permanent_address: '',
    occupation: '',
    emergency_name: '',
    emergency_phone: '',
    aadhaar_last4: '',
    unit_id: unitId,
    shift_date: t,
    monthly_rent: '',
    rent_due_day: String(t.getDate()),
    next_due: t,
    advance_agreed: '',
    advance_received: '',
    advance_mode: 'cash',
    agreement_start: t,
    term_months: 11,
    notice_period_days: String(noticeDays),
    docs: {},
    touched: { rent: false, dueDay: false, nextDue: false, start: false },
  };
}

/** True when the tenant moved in before today (an existing tenant being entered). */
export function movedInEarlier(form: AddTenantForm): boolean {
  return form.shift_date < today();
}

/** The first rent RMS will track: the move-in date, or the next due date for existing tenants. */
export function firstDueDate(form: AddTenantForm): Date {
  return movedInEarlier(form) ? form.next_due : form.shift_date;
}

export function agreementEnd(form: AddTenantForm): Date {
  return addMonths(form.agreement_start, form.term_months);
}

/** Applies a new move-in date and refreshes the defaults that follow from it. */
export function withShiftDate(form: AddTenantForm, date: Date): AddTenantForm {
  const dueDay = form.touched.dueDay ? Number(form.rent_due_day) || date.getDate() : date.getDate();
  return {
    ...form,
    shift_date: date,
    rent_due_day: form.touched.dueDay ? form.rent_due_day : String(date.getDate()),
    agreement_start: form.touched.start ? form.agreement_start : date,
    next_due: form.touched.nextDue ? form.next_due : nextDueDate(dueDay),
  };
}

export function withDueDay(form: AddTenantForm, value: string): AddTenantForm {
  const digits = value.replace(/\D/g, '').slice(0, 2);
  const day = Number(digits);
  return {
    ...form,
    rent_due_day: digits,
    touched: { ...form.touched, dueDay: true },
    next_due: !form.touched.nextDue && day >= 1 && day <= 31 ? nextDueDate(day) : form.next_due,
  };
}

export type Errors = Partial<Record<string, string>>;

const PHONE = /^[6-9]\d{9}$/;

export function validateStep(step: number, f: AddTenantForm): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!f.full_name.trim()) e.full_name = 'Enter the tenant’s name.';
    if (!PHONE.test(f.phone)) e.phone = 'Enter a 10-digit mobile number.';
    if (f.alt_phone && !PHONE.test(f.alt_phone)) e.alt_phone = 'Enter a 10-digit mobile number, or leave it empty.';
    if (f.emergency_phone && !PHONE.test(f.emergency_phone))
      e.emergency_phone = 'Enter a 10-digit mobile number, or leave it empty.';
    if (f.aadhaar_last4 && !/^\d{4}$/.test(f.aadhaar_last4)) e.aadhaar_last4 = 'Enter exactly 4 digits.';
  }
  if (step === 1) {
    if (!f.unit_id) e.unit_id = 'Pick the unit the tenant is renting.';
    if (!(Number(f.monthly_rent) > 0)) e.monthly_rent = 'Enter the monthly rent.';
    const day = Number(f.rent_due_day);
    if (!(day >= 1 && day <= 31)) e.rent_due_day = 'Enter a day from 1 to 31.';
    if (movedInEarlier(f) && f.next_due < today()) e.next_due = 'Pick today or a later date.';
  }
  if (step === 2) {
    const agreed = Number(f.advance_agreed || 0);
    const received = Number(f.advance_received || 0);
    if (received > agreed) e.advance_received = 'This is more than the advance agreed.';
    const notice = Number(f.notice_period_days);
    if (f.notice_period_days === '' || !(notice >= 0 && notice <= 180))
      e.notice_period_days = 'Enter 0 to 180 days.';
  }
  return e;
}

const optional = (v: string) => (v.trim() ? v.trim() : undefined);
const phone = (v: string) => (v ? `+91${v}` : undefined);

export function toInput(f: AddTenantForm): NewTenantInput {
  const received = Number(f.advance_received || 0);
  return {
    tenant: {
      full_name: f.full_name.trim(),
      phone: `+91${f.phone}`,
      member_count: f.member_count,
      alt_phone: phone(f.alt_phone),
      permanent_address: optional(f.permanent_address),
      occupation: optional(f.occupation),
      emergency_name: optional(f.emergency_name),
      emergency_phone: phone(f.emergency_phone),
      aadhaar_last4: optional(f.aadhaar_last4),
    },
    tenancy: {
      unit_id: f.unit_id!,
      shift_date: toDay(f.shift_date),
      monthly_rent: Number(f.monthly_rent),
      rent_due_day: Number(f.rent_due_day),
      first_due_date: toDay(firstDueDate(f)),
      advance_agreed: Number(f.advance_agreed || 0),
      notice_period_days: Number(f.notice_period_days),
    },
    agreement: { start_date: toDay(f.agreement_start), term_months: f.term_months },
    advance: received > 0 ? { amount: received, mode: f.advance_mode } : undefined,
  };
}
