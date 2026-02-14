<template>
  <svg class="w-24 h-auto" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1280 1280">
    <defs>
      <!-- Gradien Asli untuk Logo -->
      <linearGradient id="linear-gradient" x1="706.63" y1="1156" x2="592.37" y2="343" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="var(--color-logo-pink-start)"/>
        <stop offset="0.479" stop-color="var(--color-logo-pink-mid)"/>
        <stop offset="1" stop-color="var(--color-logo-pink-end)"/>
      </linearGradient>
      <linearGradient id="linear-gradient-2" x1="853.81" y1="1093" x2="447.19" y2="221" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="var(--color-white)"/>
        <stop offset="1" stop-color="var(--color-logo-white-dim)"/>
      </linearGradient>
      <linearGradient id="linear-gradient-3" x1="787.5" y1="905" x2="787.5" y2="172" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="var(--color-logo-pink-start)"/>
        <stop offset="1" stop-color="var(--color-logo-pink-alt-end)"/>
      </linearGradient>
      
      <!-- Gradien untuk Efek Kilap (dianimasikan dengan SMIL) -->
      <linearGradient id="shine-gradient" gradientUnits="userSpaceOnUse" x1="-100%" y1="0" x2="0%" y2="0">
        <stop offset="0%" stop-color="white" stop-opacity="0" />
        <stop offset="45%" stop-color="white" stop-opacity="0" />
        <stop offset="50%" stop-color="white" stop-opacity="0.5" />
        <stop offset="55%" stop-color="white" stop-opacity="0" />
        <stop offset="100%" stop-color="white" stop-opacity="0" />
        
        <animate attributeName="x1" from="-100%" to="200%" dur="3s" repeatCount="indefinite" />
        <animate attributeName="x2" from="0%" to="300%" dur="3s" repeatCount="indefinite" />
      </linearGradient>

    </defs>
    
    <!-- Grup untuk semua bentuk logo -->
    <g id="logo-group">
      <!-- Bentuk Logo Asli -->
      <rect data-name="Rounded Rectangle 2" fill="url(#linear-gradient)" x="233" y="343" width="833" height="813" rx="90" ry="90"/>
      <path data-name="Rounded Rectangle 3" fill="url(#linear-gradient-2)" d="M513,221H960a45,45,0,0,1,45,45v782a45,45,0,0,1-45,45H341a45,45,0,0,1-45-45V438A217,217,0,0,1,513,221Z"/>
      <rect data-name="Rounded Rectangle 4" fill="url(#linear-gradient-3)" x="509" y="172" width="557" height="733" rx="45" ry="45"/>
      
      <!-- Lapisan Kilap (duplikat bentuk pink dengan fill gradien kilap) -->
      <rect data-name="Shine on Rectangle 2" fill="url(#shine-gradient)" x="233" y="343" width="833" height="813" rx="90" ry="90"/>
      <rect data-name="Shine on Rectangle 4" fill="url(#shine-gradient)" x="509" y="172" width="557" height="733" rx="45" ry="45"/>
    </g>

  </svg>
</template>

<script setup lang="ts">
// No logic needed, just a static component
</script>

