import {
  CHAT_HINT_SNOOZE_MS,
  CHAT_HINT_STORAGE,
  isChatHintSnoozed,
  isCheckoutUrl,
  snoozeChatHint,
} from './chat-hint';

function fakeStorage(value: string | null): Storage {
  return {getItem: () => value, setItem: () => undefined} as unknown as Storage;
}

describe('chat hint snooze', () => {
  const NOW = 1_800_000_000_000;

  it('no value, no storage — not snoozed', () => {
    expect(isChatHintSnoozed(fakeStorage(null), NOW)).toBeFalse();
    expect(isChatHintSnoozed(null, NOW)).toBeFalse();
    expect(isChatHintSnoozed(undefined, NOW)).toBeFalse();
  });

  it('future timestamp — snoozed, past or equal — not', () => {
    expect(isChatHintSnoozed(fakeStorage(String(NOW + 1)), NOW)).toBeTrue();
    expect(isChatHintSnoozed(fakeStorage(String(NOW)), NOW)).toBeFalse();
    expect(isChatHintSnoozed(fakeStorage(String(NOW - 1)), NOW)).toBeFalse();
  });

  it('garbage — not snoozed', () => {
    for (const v of ['', 'abc', '12abc', '-5', '1e99', '{"a":1}', 'NaN', 'Infinity', '9'.repeat(30)]) {
      expect(isChatHintSnoozed(fakeStorage(v), NOW)).withContext(v).toBeFalse();
    }
  });

  it('snoozeChatHint writes now + 24 h and the value reads back as snoozed', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    } as unknown as Storage;
    snoozeChatHint(storage, NOW);
    expect(store.get(CHAT_HINT_STORAGE)).toBe(String(NOW + CHAT_HINT_SNOOZE_MS));
    expect(isChatHintSnoozed(storage, NOW + CHAT_HINT_SNOOZE_MS - 1)).toBeTrue();
    expect(isChatHintSnoozed(storage, NOW + CHAT_HINT_SNOOZE_MS)).toBeFalse();
  });

  it('storage that throws on get / set does not break anything', () => {
    const broken = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    } as unknown as Storage;
    expect(isChatHintSnoozed(broken, NOW)).toBeFalse();
    expect(() => snoozeChatHint(broken, NOW)).not.toThrow();
    expect(() => snoozeChatHint(null, NOW)).not.toThrow();
  });
});

describe('isCheckoutUrl', () => {
  it('matches /:lang/checkout, ignoring query and fragment', () => {
    expect(isCheckoutUrl('/ru/checkout')).toBeTrue();
    expect(isCheckoutUrl('/ro/checkout/')).toBeTrue();
    expect(isCheckoutUrl('/ro/checkout?utm=1')).toBeTrue();
    expect(isCheckoutUrl('/ru/checkout#pay')).toBeTrue();
  });

  it('does not match other pages', () => {
    expect(isCheckoutUrl('/')).toBeFalse();
    expect(isCheckoutUrl('/ru')).toBeFalse();
    expect(isCheckoutUrl('/ru/cart')).toBeFalse();
    expect(isCheckoutUrl('/ru/product/12/checkout')).toBeFalse();
    expect(isCheckoutUrl('/ru/search/checkout')).toBeFalse();
    expect(isCheckoutUrl('/en/checkout')).toBeFalse();
    expect(isCheckoutUrl('/ru/page?next=/ru/checkout')).toBeFalse();
    expect(isCheckoutUrl('/ru/checkouts')).toBeFalse();
  });
});
