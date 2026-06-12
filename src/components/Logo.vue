<template>
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
    <title>{{ $t('a11y-site-logo') }}</title>
    <mask id="mask0_1167_476" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="12" y="11" width="52" height="78">
      <path
        d="M29.3093 85L35.1004 52.4419H15L46.6907 15L40.8996 47.5581H61L29.3093 85Z"
        fill="white"
        stroke="white"
        stroke-width="2"
      />
    </mask>
    <g mask="url(#mask0_1167_476)">
      <path
        class="path1"
        d="M59.5 47.5581H40.8996L46.6907 15L15 52.4419H35.1004L29.3093 85L61 47.5581H51.5"
        stroke="black"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </g>
  </svg>
</template>

<style scoped>
@media (prefers-reduced-motion) {
  .path1 {
    animation: none !important;
    stroke-dasharray: unset !important;
  }
}
@media print {
  .path1 {
    animation: none !important;
    stroke-dasharray: unset !important;
  }
}
@keyframes grow {
  0% {
    stroke-dashoffset: 1px;
    stroke-dasharray: 0 350px;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  40% {
    stroke-dasharray: 350px 0;
  }
  85% {
    stroke-dasharray: 350px 0;
  }
  95%,
  to {
    stroke-dasharray: 0 350px;
  }
}
.path1 {
  stroke-dashoffset: 1px;
  stroke-dasharray: 350px 0;
  animation: grow 10s ease forwards infinite;
  transform-origin: center;
  stroke: #303030;
  animation-delay: 0s;
}
.dark .path1 {
  stroke: #fdfdfd;
}
</style>
