/** Formats a Date as a human-readable relative time string. */
export const formatRelativeTime = (date: Date): string => {
  const elapsed = Math.floor((Date.now() - date.getTime()) / 1000);
  if (elapsed < 60) return `Last updated ${elapsed}s ago`;
  if (elapsed < 3600) return `Last updated ${Math.floor(elapsed / 60)}m ago`;
  return `Last updated ${Math.floor(elapsed / 3600)}h ago`;
};

/** Converts an epoch millisecond string to a locale-formatted date string. */
export const toLocaleString = (epochTimeStamp: string): string => {
  return new Date(parseInt(epochTimeStamp)).toLocaleString();
};

/** Attempts JSON.parse; returns parsed object on success or the raw string on failure. */
export const getJsonOrRawData = (str: string): unknown => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
};
