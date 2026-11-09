/** Mirrors the backend rule: ≥10 characters and at least 3 of lower/upper/digit/symbol. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return 'Use at least 10 characters'
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length
  if (classes < 3) return 'Mix at least three of: lowercase, uppercase, digits, symbols'
  return null
}

export const PASSWORD_HINT = 'At least 10 characters, mixing three of: lowercase, uppercase, digits, symbols.'
