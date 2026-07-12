export type MessageVars = Record<string, string | number>

/**
 * A message is either a plain template string with `{var}` placeholders or a
 * function for messages that need plural rules / selectors (the counterpart
 * of Fluent select expressions in the original `dg` project).
 */
export type Message = string | ((vars: MessageVars) => string)

export type MessageDictionary = Record<string, Message>

export function plural(locale: string, n: number): Intl.LDMLPluralRule {
  return new Intl.PluralRules(locale).select(n)
}
