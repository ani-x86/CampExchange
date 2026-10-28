export interface UpiUriParams {
  pa: string; // payee VPA
  pn: string; // payee name
  am?: number; // amount in INR
  tn?: string; // transaction note
}

export const buildUpiUri = ({ pa, pn, am, tn }: UpiUriParams): string => {
  const params = new URLSearchParams();
  params.set('pa', pa);
  params.set('pn', pn);
  if (typeof am === 'number' && am > 0) {
    params.set('am', am.toFixed(2));
  }
  params.set('cu', 'INR');
  if (tn) {
    params.set('tn', tn);
  }
  return `upi://pay?${params.toString()}`;
};

export const isValidUpiId = (upiId: string): boolean => {
  return /^[\w.\-]{2,}@[\w]{2,}$/.test(upiId);
};
