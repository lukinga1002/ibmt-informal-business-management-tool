/**
 * Offline queue for duplicate-sensitive writes.
 *
 * A write that cannot be sent is kept on this device with its idempotency key
 * and replayed unchanged when the connection returns, so a queued action can
 * never be recorded twice. No business record is stored here — only the action
 * the user took, waiting to be submitted.
 */

const KEY = 'ibmt.queue.v1';

function readAll() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable (private mode) — the write fails honestly instead */
  }
}

export const offlineQueue = {
  list: readAll,
  size: () => readAll().length,
  enqueue(entry) {
    const items = readAll();
    if (items.some((item) => item.idempotencyKey === entry.idempotencyKey)) return;
    items.push({ ...entry, queued_at: new Date().toISOString() });
    writeAll(items);
  },
  remove(idempotencyKey) {
    writeAll(readAll().filter((item) => item.idempotencyKey !== idempotencyKey));
  },
  clear() {
    writeAll([]);
  },
};