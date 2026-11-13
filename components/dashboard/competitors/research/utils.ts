export function formatDate(date: string): string {
  const parsed = new Date(date);

  if (!Number.isFinite(parsed.getTime())) {
    return "Date unavailable";
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatCount(
  count: number,
  singular: string,
  plural = `${singular}s`
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
