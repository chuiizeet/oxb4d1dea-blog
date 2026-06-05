<!-- Overlay CRT: scanlines + viñeta + flicker sutil. Solo decorativo. -->
<div class="crt" aria-hidden="true"></div>

<style>
  .crt {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 50;
  }
  .crt::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0) 0,
      rgba(0, 0, 0, 0) 2px,
      rgba(0, 0, 0, 0.16) 3px,
      rgba(0, 0, 0, 0) 4px
    );
  }
  .crt::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      rgba(0, 0, 0, 0) 55%,
      rgba(0, 0, 0, 0.55) 100%
    );
    animation: flick 4s infinite steps(60);
  }
  @keyframes flick {
    0%, 100% { opacity: 0.96; }
    50% { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .crt::after { animation: none; }
  }
</style>
