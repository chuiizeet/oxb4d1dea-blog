<script>
  import { onMount } from 'svelte';
  import Crt from './Crt.svelte';

  let {
    image = '',
    pages = [],          // array de fragmentos HTML (texto)
    title = '',
    num = '',
    date = '',
  } = $props();

  let items = $derived([
    ...(image ? [{ type: 'image' }] : []),
    ...pages.map((html) => ({ type: 'text', html })),
  ]);
  let total = $derived(Math.max(1, items.length));

  let page = $state(0);
  let booted = $state(false);

  let cur = $derived(items[Math.min(page, items.length - 1)] ?? { type: 'text', html: '' });

  // HTML -> texto plano (para el typewriter). String puro: seguro en SSR.
  function htmlToText(html) {
    if (!html) return '';
    let t = html
      .replace(/<\/(p|div|h[1-6]|li|blockquote)\s*>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, '');
    t = t
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
    // colapsar saltos suaves dentro de cada párrafo; conservar el doble salto
    return t
      .split(/\n{2,}/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n\n');
  }

  let fullText = $derived(cur?.type === 'text' ? htmlToText(cur.html) : '');

  let typed = $state('');
  let typing = $state(false);
  let typeTimer = null;

  // lo que falta por escribir (se renderiza invisible para reservar el tamaño)
  let rest = $derived(fullText.slice(typed.length));

  function stopTimer() {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
  }

  function next() {
    if (typing) {            // primera flecha = completar el texto de golpe
      stopTimer();
      typed = fullText;
      typing = false;
      return;
    }
    if (page < total - 1) page += 1;
  }
  function prev() {
    stopTimer();
    if (page > 0) page -= 1;
  }

  function onKey(e) {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      prev();
    }
  }

  // typewriter: al entrar a una página de texto, escribe letra por letra
  $effect(() => {
    const text = cur?.type === 'text' ? fullText : '';
    stopTimer();
    typed = '';
    typing = false;
    if (!text) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { typed = text; return; }

    typing = true;
    let i = 0;
    typeTimer = setInterval(() => {
      i += 1;
      typed = text.slice(0, i);
      if (i >= text.length) { stopTimer(); typing = false; }
    }, 24);

    return stopTimer;
  });

  onMount(() => {
    requestAnimationFrame(() => { booted = true; });
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); stopTimer(); };
  });
</script>

<div class="re">
  <div class="screen" class:booted>
    <span class="c tl"></span><span class="c tr"></span>
    <span class="c bl"></span><span class="c br"></span>

    <header class="hdr">
      {#if num}<div class="num">ARCHIVO Nº{num}</div>{/if}
      <h1 class="ttl">{title}</h1>
      {#if date}<div class="date">{date}</div>{/if}
    </header>

    <div class="stage">
      <button class="arrow left" onclick={prev} disabled={page === 0} aria-label="Página anterior"></button>

      <div class="content">
        {#key page}
          <div class="slide">
            {#if cur.type === 'image' && image}
              <img class="render" src={image} alt={title} />
            {:else}
              <div class="card">
                <svg class="sheet" preserveAspectRatio="none" aria-hidden="true">
                  <filter id="crumple">
                    <feTurbulence type="fractalNoise" baseFrequency="0.0075" numOctaves="5" seed="11" result="n" />
                    <feDiffuseLighting in="n" surfaceScale="3.4" diffuseConstant="1.18" lighting-color="#e4d9bd" result="lit">
                      <feDistantLight azimuth="235" elevation="47" />
                    </feDiffuseLighting>
                  </filter>
                  <rect x="0" y="0" width="100%" height="100%" filter="url(#crumple)" />
                </svg>
                <div class="paper" aria-hidden="true">{typed}<span class="caret">▋</span><span class="ghost">{rest}</span></div>
                <p class="sr-only">{fullText}</p>
              </div>
            {/if}
          </div>
        {/key}
      </div>

      <button class="arrow right" onclick={next} disabled={page >= total - 1} aria-label="Página siguiente"></button>
    </div>

    <footer class="ftr">
      <span class="count">{page + 1} / {total}</span>
      <a class="back" href="/">◄ VOLVER</a>
    </footer>
  </div>
  <Crt />
</div>

<style>
  :root {
    --green: #5bff8f;
    --green-soft: #9dffc1;
    --green-dim: #2c7a4d;
  }

  .re {
    position: fixed;
    inset: 0;
    background: #000;
    font-family: ui-monospace, 'SF Mono', 'Courier New', monospace;
  }

  .screen {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: min(100%, var(--crt-w));   /* pantalla CRT centrada, letterbox a los lados */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: clamp(20px, 5vh, 56px) clamp(16px, 5vw, 64px);
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  .screen.booted { opacity: 1; }

  .c { position: absolute; width: 22px; height: 22px; border: 2px solid var(--green-dim); opacity: 0.7; }
  .tl { top: 16px; left: 16px; border-right: 0; border-bottom: 0; }
  .tr { top: 16px; right: 16px; border-left: 0; border-bottom: 0; }
  .bl { bottom: 16px; left: 16px; border-right: 0; border-top: 0; }
  .br { bottom: 16px; right: 16px; border-left: 0; border-top: 0; }

  .hdr { text-align: center; }
  .num { color: var(--green-dim); letter-spacing: 0.3em; font-size: 12px; margin-bottom: 8px; }
  .ttl {
    margin: 0;
    color: var(--green-soft);
    font-size: clamp(18px, 3.4vw, 26px);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    text-shadow: 0 0 12px rgba(91, 255, 143, 0.55);
  }
  .date { color: var(--green-dim); font-size: 11px; letter-spacing: 0.2em; margin-top: 8px; }

  .stage {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(14px, 4vw, 44px);
    min-height: 0;
  }
  .content { flex: 1; min-width: 0; height: 100%; display: flex; align-items: center; justify-content: center; }
  .slide {
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    max-height: 100%;
    animation: appear 0.32s ease both;
  }
  @keyframes appear {
    from { opacity: 0; transform: scale(0.97); }
    to { opacity: 1; transform: none; }
  }

  .render {
    max-width: 100%;
    max-height: min(58vh, 560px);
    object-fit: contain;
    filter: drop-shadow(0 18px 40px rgba(0, 0, 0, 0.8));
  }

  .card {
    position: relative;
    width: min(440px, 84vw);
    max-height: min(58vh, 560px);
    overflow: auto;
    padding: 28px 30px;
    background: #b9ad8d;
    box-shadow: 0 16px 44px rgba(0, 0, 0, 0.7);
  }
  .sheet { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; }
  .card::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    background:
      linear-gradient(118deg, rgba(255,255,255,0.14) 0 7%, transparent 8% 26%, rgba(0,0,0,0.10) 27% 29%, transparent 30% 62%, rgba(255,255,255,0.10) 63% 65%, transparent 66%),
      linear-gradient(202deg, rgba(0,0,0,0.08) 0 10%, transparent 11% 48%, rgba(255,255,255,0.09) 49% 51%, transparent 52% 80%, rgba(0,0,0,0.07) 81% 83%, transparent 84%),
      radial-gradient(ellipse at 50% 45%, transparent 52%, rgba(20,12,0,0.30) 100%);
  }
  .paper {
    position: relative;
    z-index: 1;
    color: #2a241a;
    line-height: 27px;
    font-size: 15px;
    white-space: pre-wrap;
    word-break: break-word;
    min-height: 27px;
  }
  /* texto aún no escrito: invisible pero ocupa espacio (reserva el tamaño) */
  .ghost { visibility: hidden; }
  .caret {
    color: #2a241a;
    animation: blink 1s steps(1) infinite;
  }
  @keyframes blink { 50% { opacity: 0; } }

  /* solo para lectores de pantalla / buscadores (texto completo) */
  .sr-only {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  /* flechas verdes */
  .arrow {
    flex: none;
    width: 0; height: 0;
    background: transparent;
    border-style: solid;
    cursor: pointer;
    filter: drop-shadow(0 0 6px rgba(91, 255, 143, 0.7));
    transition: transform 0.12s ease, opacity 0.2s ease;
  }
  .arrow.left {
    border-width: 26px 34px 26px 0;
    border-color: transparent var(--green) transparent transparent;
  }
  .arrow.right {
    border-width: 26px 0 26px 34px;
    border-color: transparent transparent transparent var(--green);
  }
  .arrow:hover:not(:disabled) { transform: scale(1.18); }
  .arrow:active:not(:disabled) { transform: scale(0.92); }
  .arrow:disabled { opacity: 0.12; cursor: default; filter: none; animation: none; }

  /* la flecha de avanzar "respira" para invitar a continuar */
  .arrow.right:not(:disabled) { animation: breathe 2.2s ease-in-out infinite; }
  @keyframes breathe {
    0%, 100% { filter: drop-shadow(0 0 4px rgba(91, 255, 143, 0.45)); opacity: 0.8; }
    50% { filter: drop-shadow(0 0 16px rgba(91, 255, 143, 1)); opacity: 1; }
  }

  .ftr {
    display: flex;
    align-items: center;
    gap: 18px;
    color: var(--green);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-shadow: 0 0 6px rgba(91, 255, 143, 0.4);
  }
  .back {
    color: var(--green-soft);
    text-decoration: none;
    border: 1px solid var(--green-dim);
    padding: 5px 11px;
    font-size: 11px;
    letter-spacing: 0.1em;
  }
  .back:hover { background: rgba(91, 255, 143, 0.1); }

  @media (max-width: 560px) {
    .arrow.left { border-width: 20px 26px 20px 0; }
    .arrow.right { border-width: 20px 0 20px 26px; }
    .stage { gap: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .screen, .slide, .arrow { transition: none; animation: none; }
    .caret { animation: none; }
  }
</style>
