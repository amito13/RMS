import type { PaymentMode } from '@/lib/db-types';

export const MODE_LABEL: Record<PaymentMode, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank: 'Bank transfer',
  cheque: 'Cheque',
  from_advance: 'From advance',
  other: 'Other',
};
