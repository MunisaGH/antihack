const COUNTRY_CODE = '998';
const COUNTRY_PREFIX = `+${COUNTRY_CODE}`;
const MAX_LOCAL_DIGITS = 9;

/**
 * O'zbekiston telefon raqamini +998 XX XXX XX XX ko'rinishida formatlaydi.
 * Kiruvchi qiymatdan faqat raqamlar olinadi va 998 boshlanmasa qo'shiladi.
 */
export function formatUzPhone(input: string): string {
  const raw = (input || '').replace(/\D/g, '');

  let digits = raw;
  if (digits.startsWith(COUNTRY_CODE)) digits = digits.slice(3);
  digits = digits.slice(0, MAX_LOCAL_DIGITS);

  let out = COUNTRY_PREFIX;
  if (digits.length > 0) out += ' ' + digits.slice(0, 2);
  if (digits.length > 2) out += ' ' + digits.slice(2, 5);
  if (digits.length > 5) out += ' ' + digits.slice(5, 7);
  if (digits.length > 7) out += ' ' + digits.slice(7, 9);
  return out;
}

export function unformatPhone(formatted: string): string {
  return (formatted || '').replace(/\s+/g, '');
}

export function isCompleteUzPhone(value: string): boolean {
  return unformatPhone(value).length === 1 + COUNTRY_CODE.length + MAX_LOCAL_DIGITS;
}
