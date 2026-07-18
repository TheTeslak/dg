import type { Plugin } from 'unified'
import type { Code, Effects, State, Token, TokenizeContext } from 'micromark-util-types'

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    inlineAttribute: 'inlineAttribute'
    inlineAttributeAttributes: 'inlineAttributeAttributes'
    inlineAttributeLabel: 'inlineAttributeLabel'
    inlineAttributeMarker: 'inlineAttributeMarker'
  }
}

interface InlineAttributeToken extends Token {
  _definition?: string
  _kind?: 'glossary' | 'muted'
  _term?: string
}

function isWhitespace(code: Code) {
  return code === 32 || code === 9
}

function isNameStart(code: Code) {
  return code != null && (code >= 65 && code <= 90 || code >= 97 && code <= 122)
}

function isName(code: Code) {
  return isNameStart(code) || code != null && (code >= 48 && code <= 57 || code === 45 || code === 58 || code === 95)
}

function character(code: Code) {
  return code == null || code < 0 ? '' : String.fromCodePoint(code)
}

function inlineAttributeSyntax() {
  return {
    text: {
      91: { name: 'inlineAttribute', tokenize: tokenizeInlineAttribute },
    },
  }
}

function tokenizeInlineAttribute(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  let wrapper: InlineAttributeToken
  let labelDepth = 0
  let labelHasContent = false
  let name = ''
  let quote = 0
  let value = ''
  const attrs = new Map<string, string>()
  let mutedIndex = 0
  const muted = '.muted'

  return start

  function start(code: Code) {
    if (code !== 91)
      return nok(code)
    wrapper = effects.enter('inlineAttribute') as InlineAttributeToken
    effects.enter('inlineAttributeMarker')
    effects.consume(code)
    effects.exit('inlineAttributeMarker')
    effects.enter('inlineAttributeLabel')
    effects.enter('chunkText', { contentType: 'text' })
    labelDepth = 1
    return label
  }

  function label(code: Code): State | undefined {
    if (code == null || code === -4 || code === -5 || code === -3)
      return nok(code)
    if (code === 92) {
      labelHasContent = true
      effects.consume(code)
      return labelEscape
    }
    if (code === 91) {
      labelHasContent = true
      labelDepth += 1
      effects.consume(code)
      return label
    }
    if (code === 93) {
      labelDepth -= 1
      if (labelDepth === 0) {
        if (!labelHasContent)
          return nok(code)
        effects.exit('chunkText')
        effects.exit('inlineAttributeLabel')
        effects.enter('inlineAttributeMarker')
        effects.consume(code)
        effects.exit('inlineAttributeMarker')
        return attributesOpen
      }
    }
    labelHasContent = true
    effects.consume(code)
    return label
  }

  function labelEscape(code: Code) {
    if (code == null)
      return nok(code)
    effects.consume(code)
    return label
  }

  function attributesOpen(code: Code) {
    if (code !== 123)
      return nok(code)
    effects.enter('inlineAttributeAttributes')
    effects.consume(code)
    return attributeStart
  }

  function attributeStart(code: Code): State | undefined {
    if (isWhitespace(code)) {
      effects.consume(code)
      return attributeStart
    }
    if (code === 46 && attrs.size === 0) {
      mutedIndex = 0
      return mutedValue(code)
    }
    if (code === 125) {
      if (!attrs.get('term')?.trim() || !attrs.get('definition')?.trim())
        return nok(code)
      wrapper._kind = 'glossary'
      wrapper._term = attrs.get('term')!.trim()
      wrapper._definition = attrs.get('definition')!.trim()
      return close(code)
    }
    if (!isNameStart(code))
      return nok(code)
    name = character(code)
    effects.consume(code)
    return attributeName
  }

  function mutedValue(code: Code): State | undefined {
    if (code !== muted.codePointAt(mutedIndex))
      return nok(code)
    effects.consume(code)
    mutedIndex += 1
    if (mutedIndex === muted.length) {
      wrapper._kind = 'muted'
      return mutedEnd
    }
    return mutedValue
  }

  function mutedEnd(code: Code): State | undefined {
    if (isWhitespace(code)) {
      effects.consume(code)
      return mutedEnd
    }
    return code === 125 ? close(code) : nok(code)
  }

  function attributeName(code: Code): State | undefined {
    if (isName(code)) {
      name += character(code)
      effects.consume(code)
      return attributeName
    }
    if (name !== 'term' && name !== 'definition')
      return nok(code)
    return beforeEquals(code)
  }

  function beforeEquals(code: Code): State | undefined {
    if (isWhitespace(code)) {
      effects.consume(code)
      return beforeEquals
    }
    if (code !== 61)
      return nok(code)
    effects.consume(code)
    return beforeQuote
  }

  function beforeQuote(code: Code): State | undefined {
    if (isWhitespace(code)) {
      effects.consume(code)
      return beforeQuote
    }
    if (code !== 34 && code !== 39)
      return nok(code)
    quote = code
    value = ''
    effects.consume(code)
    return quotedValue
  }

  function quotedValue(code: Code): State | undefined {
    if (code == null || code < 0)
      return nok(code)
    if (code === 92) {
      effects.consume(code)
      return quotedEscape
    }
    if (code === quote) {
      effects.consume(code)
      attrs.set(name, value)
      return attributeStart
    }
    value += character(code)
    effects.consume(code)
    return quotedValue
  }

  function quotedEscape(code: Code) {
    if (code == null || code < 0)
      return nok(code)
    value += character(code)
    effects.consume(code)
    return quotedValue
  }

  function close(code: Code) {
    effects.consume(code)
    effects.exit('inlineAttributeAttributes')
    effects.exit('inlineAttribute')
    return ok
  }
}

function inlineAttributeFromMarkdown(): any {
  return {
    enter: {
      inlineAttribute(this: any, token: InlineAttributeToken) {
        const properties = token._kind === 'muted'
          ? { className: ['muted'] }
          : {
              className: ['glossary-term'],
              dataGlossaryTerm: '',
              dataTerm: token._term,
              dataDefinition: token._definition,
              tabIndex: 0,
              role: 'button',
              ariaLabel: token._term,
              ariaExpanded: 'false',
              ariaHasPopup: 'dialog',
            }
        this.enter({
          type: 'inlineAttribute',
          children: [],
          data: { hName: 'span', hProperties: properties },
        }, token)
      },
    },
    exit: {
      inlineAttribute(this: any, token: InlineAttributeToken) {
        this.exit(token)
      },
    },
  }
}

function addExtension(data: Record<string, unknown>, field: string, value: unknown) {
  const list = (data[field] ||= []) as unknown[]
  list.push(value)
}

const remarkInlineAttrsSyntax: Plugin = function () {
  const data = this.data() as Record<string, unknown>
  addExtension(data, 'micromarkExtensions', inlineAttributeSyntax())
  addExtension(data, 'fromMarkdownExtensions', inlineAttributeFromMarkdown())
}

export default remarkInlineAttrsSyntax
