const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const openAiKeyPattern = /\bsk-[A-Za-z0-9_-]{20,}\b/g;
const genericSecretPattern = /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[^"'\s]{8,}/gi;

export function redactSensitiveText(value: string) {
  return value
    .replace(openAiKeyPattern, "[redacted_secret]")
    .replace(genericSecretPattern, (match) => {
      const separator = match.includes("=") ? "=" : ":";
      const [label] = match.split(separator);
      return `${label?.trim() ?? "secret"}${separator} [redacted_secret]`;
    })
    .replace(emailPattern, "[redacted_email]")
    .replace(phonePattern, "[redacted_phone]");
}
