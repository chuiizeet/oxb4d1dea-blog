<script>
  import { onMount } from 'svelte';
  import Crt from './Crt.svelte';

  let {
    image = '',
    pages = [],          // fragmentos HTML del cuerpo (separados por ---)
    title = '',
    num = '',
    date = '',
    attachments = [],    // [{ url, caption }]
  } = $props();

  // página 0 = portada (solo EX file); resto = texto sobre el EX file atenuado
  let items = $derived([{ type: 'cover' }, ...pages.map((html) => ({ type: 'text', html }))]);
  let total = $derived(Math.max(1, items.length));

  let page = $state(0);
  let booted = $state(false);
  let showPhotos = $state(false);
  let bigPhoto = $state(null);

  let cur = $derived(items[Math.min(page, items.length - 1)] ?? { type: 'cover' });

  function next() { if (page < total - 1) page += 1; }
  function prev() { if (page > 0) page -= 1; }

  function onKey(e) {
    if (showPhotos) {
      if (e.key === 'Escape') { if (bigPhoto) bigPhoto = null; else showPhotos = false; }
      return;
    }
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
  }

  onMount(() => {
    requestAnimationFrame(() => { booted = true; });
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
      {#if attachments.length}
        <button class="clip" onclick={() => (showPhotos = true)}>📷 ver fotos ({attachments.length})</button>
      {/if}
    </header>

    <div class="stage">
      <button class="arrow left" onclick={prev} disabled={page === 0} aria-label="Anterior"></button>

      <div class="content">
        {#if image}<img class="bg" class:dim={cur.type === 'text'} src={image} alt={title} />{/if}
        {#if cur.type === 'text'}
          {#key page}<div class="text">{@html cur.html}</div>{/key}
        {/if}
      </div>

      <button class="arrow right" onclick={next} disabled={page >= total - 1} aria-label="Siguiente"></button>
    </div>

    <footer class="ftr">
      <span class="count">{page + 1} / {total}</span>
      <a class="back" href="/">◄ VOLVER</a>
    </footer>
  </div>
  <Crt />

  {#if showPhotos}
    <div class="gallery" role="dialog">
      <div class="gbar">
        <span class="gtitle">📷 FOTOS ({attachments.length})</span>
        <button class="gclose" onclick={() => { showPhotos = false; bigPhoto = null; }}>✕ cerrar</button>
      </div>
      <div class="ggrid">
        {#each attachments as a}
          <button class="gcell" onclick={() => (bigPhoto = a)}>
            <img src={a.url} alt={a.caption} />
            {#if a.caption}<span class="gcap">{a.caption}</span>{/if}
          </button>
        {/each}
      </div>
    </div>

    {#if bigPhoto}
      <div class="lightbox" onclick={() => (bigPhoto = null)}>
        <figure class="polaroid big" onclick={(e) => e.stopPropagation()}>
          <div class="pframe"><img src={bigPhoto.url} alt={bigPhoto.caption} /></div>
          <figcaption class="pcap">
            {#if bigPhoto.caption}<span class="ptext">{bigPhoto.caption}</span>{/if}
            <span class="pdate">{date}</span>
          </figcaption>
        </figure>
        <button class="gclose lbclose" onclick={() => (bigPhoto = null)}>✕</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  :root {
    --green: #5bff8f;
    --green-soft: #9dffc1;
    --green-dim: #2c7a4d;
  }

  .re { position: fixed; inset: 0; background: #000; font-family: ui-monospace, 'SF Mono', 'Courier New', monospace; }

  .screen {
    position: absolute;
    top: 0; bottom: 0; left: 50%;
    transform: translateX(-50%);
    width: min(100%, var(--crt-w));
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
  .clip {
    background: transparent;
    border: 1px solid var(--green-dim);
    color: var(--green-soft);
    font: inherit;
    font-size: 11px;
    letter-spacing: 0.15em;
    padding: 5px 12px;
    margin-top: 10px;
    cursor: pointer;
  }
  .clip:hover { background: rgba(91, 255, 143, 0.12); }

  .stage {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(14px, 4vw, 44px);
    min-height: 0;
  }
  .content { flex: 1; min-width: 0; height: 100%; position: relative; display: flex; align-items: center; justify-content: center; }

  /* EX file: siempre presente; se atenúa cuando hay texto */
  .bg {
    position: absolute;
    inset: 0;
    margin: auto;
    max-width: 100%;
    max-height: min(62vh, 600px);
    object-fit: contain;
    filter: drop-shadow(0 18px 40px rgba(0, 0, 0, 0.8));
    transition: filter 0.35s ease;
    z-index: 0;
  }
  .bg.dim { filter: brightness(0.28) drop-shadow(0 18px 40px rgba(0, 0, 0, 0.85)); }

  /* texto estilo juego: blanco con contorno negro, sobre el EX file */
  .text {
    position: relative;
    z-index: 2;
    max-width: min(620px, 88vw);
    max-height: 66vh;
    overflow: auto;
    color: #fff;
    font-size: clamp(18px, 3vw, 26px);
    line-height: 1.7;
    text-align: left;
    -webkit-text-stroke: 0.7px #000;
    text-shadow: 1px 1px 0 #000, -1px 1px 0 #000, 0 0 7px rgba(0, 0, 0, 0.95);
    animation: appear 0.3s ease both;
  }
  .text :global(p) { margin: 0 0 1em; }
  .text :global(:last-child) { margin-bottom: 0; }
  .text :global(strong) { color: #fff; }
  .text :global(a) { color: var(--green-soft); }
  .text :global(ul), .text :global(ol) { margin: 0 0 1em; padding-left: 1.3em; text-align: left; }
  .text :global(img), .text :global(video) { max-width: 100%; height: auto; -webkit-text-stroke: 0; }
  @keyframes appear { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

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
  .arrow.left { border-width: 26px 34px 26px 0; border-color: transparent var(--green) transparent transparent; }
  .arrow.right { border-width: 26px 0 26px 34px; border-color: transparent transparent transparent var(--green); }
  .arrow:hover:not(:disabled) { transform: scale(1.18); }
  .arrow:active:not(:disabled) { transform: scale(0.92); }
  .arrow:disabled { opacity: 0.12; cursor: default; filter: none; animation: none; }
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

  /* foto adjunta estilo Polaroid (lightbox) */
  .polaroid {
    background: #f6f1e4;
    padding: 12px 12px 0;
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.75);
    transform: rotate(-1.6deg);
    max-width: min(360px, 82vw);
  }
  .polaroid .pframe { background: #0c0c0c; overflow: hidden; }
  .polaroid img { display: block; width: 100%; max-height: 44vh; object-fit: cover; }
  .pcap { padding: 12px 8px 16px; text-align: center; color: #2a241a; font-family: 'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive; }
  .ptext { display: block; font-size: 16px; line-height: 1.3; }
  .pdate { display: block; font-size: 11px; color: #7a6f5a; margin-top: 6px; letter-spacing: 0.08em; }

  /* galería: overlay al frente, grid + lightbox */
  .gallery { position: fixed; inset: 0; z-index: 200; background: rgba(0, 0, 0, 0.96); display: flex; flex-direction: column; }
  .gbar { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--green-dim); }
  .gtitle { color: var(--green-soft); font-size: 13px; letter-spacing: 0.18em; }
  .gclose { background: transparent; border: 1px solid var(--green-dim); color: var(--green-soft); font: inherit; font-size: 12px; letter-spacing: 0.1em; padding: 7px 16px; cursor: pointer; }
  .gclose:hover { background: rgba(91, 255, 143, 0.12); }
  .ggrid { flex: 1; min-height: 0; overflow: auto; padding: 22px; display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); align-content: start; }
  .gcell { background: #f6f1e4; padding: 8px 8px 0; border: none; cursor: pointer; box-shadow: 0 8px 22px rgba(0, 0, 0, 0.6); transform: rotate(-1.2deg); }
  .gcell:nth-child(even) { transform: rotate(1.4deg); }
  .gcell:hover { filter: brightness(1.05); }
  .gcell img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; background: #0c0c0c; }
  .gcap { display: block; padding: 8px 4px 12px; color: #2a241a; font-family: 'Segoe Script', 'Bradley Hand', 'Comic Sans MS', cursive; font-size: 13px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lightbox { position: fixed; inset: 0; z-index: 210; background: rgba(0, 0, 0, 0.92); display: flex; align-items: center; justify-content: center; padding: 24px; }
  .polaroid.big { transform: none; max-width: min(520px, 92vw); cursor: default; }
  .polaroid.big img { max-height: 70vh; }
  .lbclose { position: fixed; top: 14px; right: 18px; padding: 5px 12px; }

  @media (max-width: 560px) {
    .arrow.left { border-width: 20px 26px 20px 0; }
    .arrow.right { border-width: 20px 0 20px 26px; }
    .stage { gap: 10px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .screen, .text, .arrow { transition: none; animation: none; }
  }
</style>
