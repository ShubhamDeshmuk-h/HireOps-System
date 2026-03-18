export function formatUtcToLocal(utcString) {
  if (!utcString) return '';
  const date = new Date(utcString);
  if (isNaN(date)) return utcString; // fallback if invalid
  return date.toLocaleString();
} 