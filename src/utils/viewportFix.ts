/**
 * Viewport Fix for Mobile Keyboards
 *
 * On mobile browsers, the virtual keyboard pushes the viewport up,
 * but `100vh` / `inset-0` still refers to the full screen height.
 * This utility calculates the actual visible viewport height and
 * stores it in a CSS custom property `--app-height`.
 *
 * Usage: call `initViewportFix()` once at app startup.
 * Then use `height: var(--app-height, 100dvh)` instead of `h-screen` or `inset-0`.
 */

function setAppHeight() {
  const vh = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${vh}px`);
}

export function initViewportFix() {
  // Set initial value
  setAppHeight();

  // Listen to visualViewport resize (fires when keyboard opens/closes)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setAppHeight);
    window.visualViewport.addEventListener('scroll', setAppHeight);
  }

  // Fallback for browsers without visualViewport
  window.addEventListener('resize', setAppHeight);
}
