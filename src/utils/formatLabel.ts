/**
 * Converts a snake_case JSON field name into a human-readable Title Case label.
 * e.g. "opening_name" -> "Opening Name"
 */
export const formatFieldLabel = (key: string): string =>
  key
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
