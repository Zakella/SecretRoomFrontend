/** localStorage key: timestamp (ms) until which the hint bubble stays quiet. */
export const CHAT_HINT_STORAGE = 'sr_chat_hint_until';
/** Pause after the widget appears before the hint pops up. */
export const CHAT_HINT_DELAY_MS = 5000;
/** How long the hint stays quiet after it was dismissed or the chat was opened. */
export const CHAT_HINT_SNOOZE_MS = 24 * 60 * 60 * 1000;

/** true while the snooze is on. Missing, garbage or past value, blocked storage — no snooze. */
export function isChatHintSnoozed(storage: Storage | null | undefined, now: number): boolean {
  try {
    const raw = storage?.getItem(CHAT_HINT_STORAGE);
    if (!raw || !/^\d{1,16}$/.test(raw)) return false;
    return Number(raw) > now;
  } catch {
    return false;
  }
}

/** Starts a 24 h snooze. Blocked storage (private mode) is ignored: the hint just comes back next time. */
export function snoozeChatHint(storage: Storage | null | undefined, now: number): void {
  try {
    storage?.setItem(CHAT_HINT_STORAGE, String(now + CHAT_HINT_SNOOZE_MS));
  } catch {
    // private mode / blocked storage
  }
}

/** true on the checkout page: `/:lang/checkout`. Query and fragment are ignored. */
export function isCheckoutUrl(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0];
  const segments = path.split('/').filter(Boolean);
  return segments.length === 2 && (segments[0] === 'ro' || segments[0] === 'ru') && segments[1] === 'checkout';
}
