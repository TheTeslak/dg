import type { Plugin } from 'unified'
import type { Event, Extension, State, Token, TokenizeContext, Tokenizer } from 'micromark-util-types'
import { splice } from 'micromark-util-chunked'
import { resolveAll } from 'micromark-util-resolve-all'

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    mark: 'mark'
    markSequence: 'markSequence'
    markSequenceTemporary: 'markSequenceTemporary'
    markText: 'markText'
  }
}

interface MarkToken extends Token {
  _close?: boolean
  _open?: boolean
}

const tokenizer = {
  name: 'mark',
  tokenize: tokenizeMark,
  resolveAll: resolveAllMark,
}

function markSyntax(): Extension {
  return {
    text: { 61: tokenizer },
    insideSpan: { null: [tokenizer] },
    attentionMarkers: { null: [61] },
  }
}

function resolveAllMark(events: Event[], context: TokenizeContext): Event[] {
  let index = -1
  while (++index < events.length) {
    const closeToken = events[index][1] as MarkToken
    if (events[index][0] !== 'enter' || closeToken.type !== 'markSequenceTemporary' || !closeToken._close)
      continue

    let open = index
    while (open--) {
      const openToken = events[open][1] as MarkToken
      if (events[open][0] !== 'exit' || openToken.type !== 'markSequenceTemporary' || !openToken._open)
        continue

      closeToken.type = 'markSequence'
      openToken.type = 'markSequence'
      const mark: Token = {
        type: 'mark',
        start: { ...openToken.start },
        end: { ...closeToken.end },
      }
      const content: Token = {
        type: 'markText',
        start: { ...openToken.end },
        end: { ...closeToken.start },
      }
      const nextEvents: Event[] = [
        ['enter', mark, context],
        ['enter', openToken, context],
        ['exit', openToken, context],
        ['enter', content, context],
      ]
      const insideSpan = context.parser.constructs.insideSpan.null
      if (insideSpan)
        splice(nextEvents, nextEvents.length, 0, resolveAll(insideSpan, events.slice(open + 1, index), context))
      splice(nextEvents, nextEvents.length, 0, [
        ['exit', content, context],
        ['enter', closeToken, context],
        ['exit', closeToken, context],
        ['exit', mark, context],
      ])
      splice(events, open - 1, index - open + 3, nextEvents)
      index = open + nextEvents.length - 2
      break
    }
  }

  for (const event of events) {
    if (event[1].type === 'markSequenceTemporary')
      event[1].type = 'data'
  }
  return events
}

function tokenizeMark(this: TokenizeContext, effects: Parameters<Tokenizer>[0], ok: Parameters<Tokenizer>[1], nok: Parameters<Tokenizer>[2]): State {
  const previous = this.previous
  const events = this.events
  let size = 0
  return start

  function start(code: Parameters<State>[0]) {
    if (previous === 61 && events[events.length - 1]?.[1].type !== 'characterEscape')
      return nok(code)
    effects.enter('markSequenceTemporary')
    return more(code)
  }

  function more(code: Parameters<State>[0]) {
    if (code === 61) {
      if (size >= 2)
        return nok(code)
      effects.consume(code)
      size += 1
      return more
    }
    if (size !== 2)
      return nok(code)
    const token = effects.exit('markSequenceTemporary') as MarkToken
    token._open = true
    token._close = true
    return ok(code)
  }
}

function markFromMarkdown(): any {
  return {
    canContainEols: ['mark'],
    enter: {
      mark(this: any, token: Token) {
        this.enter({ type: 'mark', children: [], data: { hName: 'mark' } } as any, token)
      },
    },
    exit: {
      mark(this: any, token: Token) {
        this.exit(token)
      },
    },
  }
}

function addExtension(data: Record<string, unknown>, field: string, value: unknown) {
  const list = (data[field] ||= []) as unknown[]
  list.push(value)
}

const remarkMarkSyntax: Plugin = function () {
  const data = this.data() as Record<string, unknown>
  addExtension(data, 'micromarkExtensions', markSyntax())
  addExtension(data, 'fromMarkdownExtensions', markFromMarkdown())
}

export default remarkMarkSyntax
