import { component$, Slot } from '@qwik.dev/core'
import { SiteShell } from '../components/site-shell'

export default component$(() => {
  return (
    <SiteShell>
      <Slot />
    </SiteShell>
  )
})
