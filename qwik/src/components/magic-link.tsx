import type { JSXOutput } from '@qwik.dev/core'
import { magicLinks } from '../lib/magic-links'

interface MagicLinkProps {
  text: keyof typeof magicLinks
}

export function MagicLink(props: MagicLinkProps): JSXOutput {
  const resolved = magicLinks[props.text]

  return (
    <a
      href={resolved.link}
      class="markdown-magic-link markdown-magic-link-link"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span
        class="markdown-magic-link-image"
        style={`background-image: url('${resolved.imageUrl}');`}
      />
      {props.text}
    </a>
  )
}
