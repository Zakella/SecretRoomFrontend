import ro from '../assets/i18n/ro.json';
import ru from '../assets/i18n/ru.json';
import {STORE_HOLD_STATUSES} from './widgets/store-hold/store-hold-api';
import {HOLD_ERROR_KEYS} from './widgets/store-hold/store-hold-dialog';

interface Dict {
  [key: string]: string | Dict;
}

/** Flattens nested dictionaries into dotted paths. */
function flatten(obj: Dict, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      Object.assign(out, flatten(value, path));
    } else {
      out[path] = value as string;
    }
  }
  return out;
}

const flatRo = flatten(ro as Dict);
const flatRu = flatten(ru as Dict);

/** Validators of each checkout form control (checkout.ts initForm); requiredTrue reports as 'required'. */
const VALIDATION_RULES: Record<string, string[]> = {
  email: ['required', 'pattern'],
  phone: ['required', 'pattern'],
  name: ['required', 'minlength', 'pattern'],
  lastname: ['required', 'minlength', 'pattern'],
  address: ['required', 'minlength'],
  city: ['required', 'minlength'],
  zip: ['required', 'pattern'],
  selectedShipping: ['required'],
  payment: ['required'],
  iAgree: ['required'],
};

/** Keys used by checkout.html (page, validation messages, steps). */
const CHECKOUT_KEYS = [
  'Address', 'Back', 'Checkout', 'City', 'Comment', 'Contact Information', 'Continue to Payment',
  'Continue to Shipping', 'Country', 'First Name', 'Free shipping from', 'Free', 'I agree', 'Information',
  'Last Name', 'Leave a comment for your order', 'Loading...', 'Login',
  'Payment Method', 'Payment', 'Phone', 'Place Order',
  'Postal Code', 'Processing...', 'Select shipping method', 'Shipping Address',
  'Shipping Method', 'Shipping', 'Size', 'Subtotal', 'Total', 'With terms and conditions', 'Your Order',
  'checkout.addressPlaceholder', 'checkout.alreadyHaveAccount',
  'checkout.createAccount', 'checkout.phonePlaceholder', 'checkout.removeUnavailable',
  'OnlinePayment', 'CashOnDelivery', 'CardOnDelivery',
  'errors.serverError', 'checkout.outOfStock', 'checkout.outOfStockGeneric', 'checkout.productUnavailable',
  'checkout.productNotFoundInCart',
  // Validation messages per field and rule, short reasons and labels for the hint under "Place order".
  ...Object.entries(VALIDATION_RULES).flatMap(([field, rules]) => [
    `checkout.fields.${field}`,
    ...rules.flatMap(rule => [`checkout.validation.${field}.${rule}`, `checkout.submitHint.${field}.${rule}`]),
  ]),
  'checkout.submitHint.title', 'checkout.submitHint.continueTitle', 'checkout.submitHint.emptyCart', 'checkout.submitHint.unavailable',
  // Country as stored by the backend; displayed through transloco.
  'Moldova, Republic of',
  // Order summary / order detail
  'Shipping address', 'Total paid',
];

/** SR-223: store hold button, dialog, picker and status page (storeHold.*), plus reused checkout texts. */
const STORE_HOLD_KEYS = [
  'storeHold.button', 'storeHold.title', 'storeHold.successTitle', 'storeHold.chooseStore',
  'storeHold.chooseSizeToHold', 'storeHold.pickerHint', 'storeHold.latinHint', 'storeHold.emailLabel',
  'storeHold.emailHint', 'storeHold.hint', 'storeHold.submit', 'storeHold.sending', 'storeHold.number',
  'storeHold.successHint', 'storeHold.openStatus', 'storeHold.close', 'storeHold.pageTitle', 'storeHold.pageIntro',
  'storeHold.check', 'storeHold.loading', 'storeHold.refresh', 'storeHold.createdAt',
  'storeHold.validation.numberRequired', 'storeHold.validation.numberPattern',
  ...['badName', 'badPhone', 'badEmail', 'badStore', 'outOfStock', 'productNotFound', 'holdNotFound', 'limitReached',
    'rateLimit', 'bot', 'sizeRequired', 'disabled', 'network', 'generic'].map(k => `storeHold.errors.${k}`),
  ...STORE_HOLD_STATUSES.flatMap(s => [`storeHold.status.${s}.title`, `storeHold.status.${s}.text`]),
  'storeHold.status.PENDING.textUntil', 'storeHold.status.unknown.title', 'storeHold.status.unknown.text',
  ...Object.values(HOLD_ERROR_KEYS).flatMap(rules => Object.values(rules)),
  'Size', 'Phone', 'First Name', 'Last Name', 'OutOfStock', 'cart.chooseSize',
];

describe('i18n dictionaries', () => {
  it('ru and ro have the same set of keys', () => {
    const onlyRu = Object.keys(flatRu).filter(k => !(k in flatRo));
    const onlyRo = Object.keys(flatRo).filter(k => !(k in flatRu));
    expect({missingInRo: onlyRu, missingInRu: onlyRo}).toEqual({missingInRo: [], missingInRu: []});
  });

  it('checkout keys exist in both dictionaries and are not empty', () => {
    const problems: string[] = [];
    for (const key of CHECKOUT_KEYS) {
      if (!flatRo[key]?.trim()) problems.push(`ro: ${key}`);
      if (!flatRu[key]?.trim()) problems.push(`ru: ${key}`);
    }
    expect(problems).toEqual([]);
  });

  it('store hold keys (SR-223) exist in both dictionaries and are not empty', () => {
    const problems: string[] = [];
    for (const key of STORE_HOLD_KEYS) {
      if (!flatRo[key]?.trim()) problems.push(`ro: ${key}`);
      if (!flatRu[key]?.trim()) problems.push(`ru: ${key}`);
    }
    expect(problems).toEqual([]);
  });

  it('store hold texts with a time or a limit keep their placeholder', () => {
    for (const flat of [flatRo, flatRu]) {
      expect(flat['storeHold.status.CONFIRMED.title']).toContain('{{time}}');
      expect(flat['storeHold.status.PENDING.textUntil']).toContain('{{time}}');
      expect(flat['storeHold.createdAt']).toContain('{{time}}');
      expect(flat['storeHold.errors.limitReached']).toContain('{{max}}');
      expect(flat['storeHold.validation.nameMax']).toContain('{{max}}');
      expect(flat['storeHold.hint']).toContain('10:00–21:00');
    }
  });

  it('promotion labels (SR-229) exist in both dictionaries and keep their placeholders', () => {
    for (const flat of [flatRo, flatRu]) {
      expect(flat['promo.percent']).toContain('{{percent}}');
      expect(flat['promo.nthPercent']).toContain('{{nth}}');
      expect(flat['promo.nthPercent']).toContain('{{percent}}');
      expect(flat['promo.buyXGetY']).toContain('{{buy}}');
      expect(flat['promo.buyXGetY']).toContain('{{free}}');
      expect(flat['promo.onlineOnly']?.trim()).toBeTruthy();
      expect(flat['promo.discount']?.trim()).toBeTruthy();
    }
  });

  it('shows the country, address heading in the right language', () => {
    expect(flatRo['Moldova, Republic of']).toBe('Republica Moldova');
    expect(flatRu['Moldova, Republic of']).toBe('Республика Молдова');
    expect(flatRo['Shipping Address']).toBe('Adresa de livrare');
    expect(flatRu['Shipping Address']).toBe('Адрес доставки');
  });

  it('ro uses comma-below diacritics, not cedilla variants', () => {
    const bad = Object.entries(flatRo)
      .filter(([k, v]) => /[şţŞŢ]/.test(v) || /[şţŞŢ]/.test(k))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });
});
