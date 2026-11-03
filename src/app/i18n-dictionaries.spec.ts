import ro from '../assets/i18n/ro.json';
import ru from '../assets/i18n/ru.json';

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
