export function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item : ""));
}

export function readObjectArray<T extends Record<string, unknown>>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is T => Boolean(item) && typeof item === "object"
  );
}
