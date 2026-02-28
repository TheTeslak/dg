<template>
  <p>
    {{ $t('sponsors-desc') }}
  </p>

  <p flex="~ gap-2 wrap items-center">
    <SponsorButtonCollective />
    <span op50 text-sm>
      <a href="/articles/sponsorship-forwarding" target="_blank">{{ $t('sponsors-how-works') }}</a>
    </span>
  </p>
  <p flex="~ gap-2 wrap">
    <a
      href="https://github.com/sponsors/antfu"
      target="_blank"
      class="group btn-rose inline-block"
    >
      <div
        i-ph-heart-duotone
        group-hover="i-ph-heart-fill text-rose"
        transition-all duration-200 ease-out
      />
      {{ $t('sponsors-support-me') }}
    </a>
    <a
      href="https://afdian.com/a/antfu"
      target="_blank"
      class="group btn-yellow inline-block"
    >
      <div
        i-ph-lightning-duotone
        group-hover="i-ph-lightning-fill text-yellow"
        transition-all duration-200 ease-out
      />
      {{ $t('sponsors-afdian') }}
    </a>
  </p>
</template>
