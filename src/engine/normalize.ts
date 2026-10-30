// Typed answers are compared after case, extra spaces, and punctuation are removed.
// tools/extract/check_content.py normalizes the same way when it checks for duplicate answers.

export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]|_/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
}
