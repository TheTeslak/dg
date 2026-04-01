import { component$ } from '@qwik.dev/core'

export const Logo = component$(() => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      class="h-12 w-12"
    >
      <path
        d="M43.8252 39.3048C43.5 29 38 27 31 35.5C16.9959 58.4158 35 61 42.5 46C44.4559 42.5 45.5001 37 45.5001 37C44.8789 42.2731 43.8252 45.9801 43.8252 50C43.8252 56.6285 48 57.9 54.5 48.4C60.5 40.9 68.5 27.5 72 15.5C74.4792 7 70.5 4.5 64 16.5C55 31.5 50.7595 59 52.3 78C53.8038 96.5469 63 97.5 61 79.5C59.5082 66.0734 52 42.5 45.5001 33C48 38.5 57 52 65.5 58.5"
        class="logo-path"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
      />
    </svg>
  )
})
