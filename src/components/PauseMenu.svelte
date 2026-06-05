<script>
  let {
    entries = [],
    name = 'Chuy',
    avatar = '/pfp.jpg',
    condition = 'fine',
    equip = null, // { art }  -> pixel art
    item = null,  // { cover, title, artist, url } -> portada de disco
  } = $props();

  let tab = $state('todo'); // todo | diario | blog
  let list = $derived(tab === 'todo' ? entries : entries.filter((e) => e.type === tab));
  let sel = $state(entries[0] ?? null);
  $effect(() => {
    sel = list[0] ?? null;
  });

  const tabs = [
    { id: 'todo', label: 'TODO' },
    { id: 'diario', label: 'DIARIO' },
    { id: 'blog', label: 'BLOG' },
  ];

  // estados tipo RE2 + estados de ánimo propios. Cada uno: color, velocidad y
  // forma de onda del ECG. (pathLength=100 normaliza el "dibujado" de la línea.)
  const CONDITIONS = {
    fine:    { label: 'FINE',    color: '#4cf05c', dur: 2.4, points: '0,22 58,22 70,22 78,9 86,35 94,22 128,22 136,9 144,35 152,22 200,22' },
    caution: { label: 'CAUTION', color: '#ffd23c', dur: 1.8, points: '0,22 40,22 48,12 54,30 60,16 66,26 72,22 110,22 120,10 126,32 132,18 138,24 144,22 200,22' },
    danger:  { label: 'DANGER',  color: '#ff4a3d', dur: 1.1, points: '0,22 26,22 32,5 38,39 44,8 50,38 56,22 88,22 94,6 100,40 106,9 112,37 118,22 158,22 166,8 174,36 182,22 200,22' },
    poison:  { label: 'POISON',  color: '#b06cff', dur: 2.6, points: '0,22 20,14 40,30 60,12 80,32 100,14 120,30 140,12 160,32 180,16 200,22' },
    sadness: { label: 'SADNESS', color: '#5a93d6', dur: 3.8, points: '0,24 56,24 86,24 96,28 106,22 116,27 128,24 160,25 200,26' },
    tired:   { label: 'TIRED',   color: '#9aa6c6', dur: 3.2, points: '0,23 70,23 82,18 90,27 98,23 150,23 162,19 170,26 178,23 200,23' },
    hyped:   { label: 'HYPED',   color: '#ffae3c', dur: 0.95, points: '0,22 24,22 30,7 36,37 42,11 48,33 54,22 78,22 84,7 90,37 96,11 102,33 108,22 132,22 138,7 144,37 150,22 200,22' },
    calm:    { label: 'CALM',    color: '#44e0d0', dur: 3.0, points: '0,22 30,20 60,24 90,20 120,24 150,20 180,24 200,22' },
  };
  let cond = $derived(CONDITIONS[condition] ?? CONDITIONS.fine);
</script>

<div class="menu">
  <!-- consola: portrait (alto) + tabs (arriba) + slots (condition/equip/item) -->
  <section class="console">
    <div class="portrait panel">
      <img class="pfp" src={avatar} alt={name} />
      <span class="name">{name}</span>
    </div>

    <nav class="tabs" aria-label="secciones">
      {#each tabs as t}
        <button
          class="tab"
          class:active={tab === t.id}
          onclick={() => (tab = t.id)}
          aria-pressed={tab === t.id}
        >{t.label}</button>
      {/each}
    </nav>

    <div class="slots">
      <div class="cond panel" style="--c: {cond.color}">
        <svg class="ecg" viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true">
          <polyline pathLength="100" points={cond.points} style="animation-duration: {cond.dur}s" />
        </svg>
        <div class="srow">
          <span class="label">CONDITION</span>
          <span class="value">{cond.label}</span>
        </div>
      </div>

      <div class="equip panel">
        <div class="cell">
          {#if equip?.art}
            <img src={equip.art} alt="" />
          {:else}
            <span class="ph">▦</span>
          {/if}
        </div>
        <div class="srow"><span class="label">EQUIP</span></div>
      </div>

      <a
        class="item panel"
        href={item?.url || undefined}
        target={item?.url ? '_blank' : undefined}
        rel="noopener"
        aria-label={item?.title ? `Disco: ${item.title}` : 'Disco'}
      >
        {#if item?.cover}
          <img src={item.cover} alt={item.title ?? ''} />
        {:else}
          <span class="ph">♪</span>
        {/if}
      </a>
    </div>
  </section>

  <!-- preview + descripción (objeto seleccionado) -->
  <section class="preview panel" aria-live="polite">
    {#if sel}
      {#if sel.image}
        <div class="thumb"><img src={sel.image} alt="" loading="lazy" /></div>
      {:else}
        <div class="thumb empty"><span>{sel.type === 'diario' ? '✎' : '▤'}</span></div>
      {/if}
      <div class="info">
        <div class="ptitle">{sel.title}</div>
        <div class="pmeta">{sel.type.toUpperCase()} · {sel.dateLabel}</div>
        {#if sel.summary}<p class="pdesc">{sel.summary}</p>{/if}
      </div>
    {:else}
      <p class="pdesc">Sin archivos todavía.</p>
    {/if}
  </section>

  <!-- grilla de ítems = entradas -->
  <section class="grid" aria-label="archivos">
    {#each list as e}
      <a
        class="slot panel"
        class:sel={sel === e}
        href={e.href}
        onmouseenter={() => (sel = e)}
        onfocus={() => (sel = e)}
      >
        <span class="glyph">{e.type === 'diario' ? '✎' : '▤'}</span>
        <span class="stitle">{e.title}</span>
        <span class="smeta">{e.type} · {e.dateLabel}</span>
      </a>
    {/each}
  </section>
</div>

<style>
  :root {
    --ink: #e7ecf8;
    --muted: #9aa6c6;
    --green: #4cf05c;
    --red: #ff4a3d;
    --slot-a: #3c5187;
    --slot-b: #233561;
    --hi: #93a0cf;
    --lo: #090d20;
  }

  .menu {
    min-height: 100dvh;
    width: 100%;
    max-width: var(--crt-w); /* proporción CRT */
    margin-inline: auto;
    box-sizing: border-box;
    padding: clamp(12px, 4vw, 28px);
    background: radial-gradient(120% 90% at 50% 0%, #1a2348 0%, #0a0f24 60%, #05070f 100%);
    color: var(--ink);
    font-family: ui-monospace, 'SF Mono', 'Courier New', monospace;
    display: grid;
    gap: 10px;
    grid-template-columns: 1fr;
    grid-template-areas: 'console' 'preview' 'grid';
    align-content: start;
  }

  .panel {
    background: linear-gradient(180deg, var(--slot-a), var(--slot-b));
    border: 2px solid;
    border-color: var(--hi) var(--lo) var(--lo) var(--hi);
  }

  /* ---- consola superior ---- */
  .console {
    grid-area: console;
    display: grid;
    gap: 4px 8px;
    grid-template-columns: auto 1fr;
    grid-template-areas:
      'portrait tabs'
      'portrait slots';
    align-items: stretch;
  }

  .portrait {
    grid-area: portrait;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px;
  }
  .pfp {
    width: 104px;
    max-width: 26vw;
    aspect-ratio: 1;
    object-fit: cover;
    image-rendering: pixelated;
    border: 1px solid var(--lo);
    background: #0c1430;
  }
  .name { color: var(--ink); font-size: 14px; letter-spacing: 0.04em; }

  .tabs {
    grid-area: tabs;
    display: flex;
    gap: 6px;
    align-items: flex-end;
    justify-content: flex-end; /* de derecha a izquierda, como RE2 */
  }
  .tab {
    flex: 0 0 auto;
    text-align: center;
    background: linear-gradient(180deg, #44568a, #2b3a64);
    border: 2px solid;
    border-color: var(--hi) var(--lo) var(--lo) var(--hi);
    color: var(--ink);
    font: inherit;
    font-size: 11px;
    letter-spacing: 0.12em;
    padding: 4px 14px;
    cursor: pointer;
  }
  .tab.active { color: var(--red); text-shadow: 0 0 8px rgba(255, 74, 61, 0.6); }
  .tab:hover { filter: brightness(1.15); }

  /* ---- slots: condition | equip (rect iguales) | item (cuadrado) ---- */
  .slots {
    grid-area: slots;
    display: flex;
    gap: 8px;
    align-items: stretch;
  }
  .cond,
  .equip {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 8px 12px;
  }
  .cond,
  .equip,
  .item {
    background:
      repeating-linear-gradient(0deg, rgba(150, 190, 220, 0.06) 0 1px, transparent 1px 11px),
      repeating-linear-gradient(90deg, rgba(150, 190, 220, 0.06) 0 1px, transparent 1px 14px),
      linear-gradient(180deg, #0c1830, #050b1a);
  }
  .ecg { width: 100%; height: 34px; }
  .ecg polyline {
    fill: none;
    stroke: var(--c, var(--green));
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 0 4px var(--c, var(--green)));
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: ecg 2.4s linear infinite;
  }
  @keyframes ecg { to { stroke-dashoffset: 0; } }
  .srow { display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px; gap: 8px; }
  .label { color: var(--muted); font-size: 11px; letter-spacing: 0.15em; }
  .value { color: var(--c, var(--green)); font-size: 15px; letter-spacing: 0.12em; text-shadow: 0 0 8px var(--c, var(--green)); }

  .equip .cell {
    flex: 1;
    display: grid;
    place-items: center;
    overflow: hidden;
    min-height: 34px;
  }
  .equip .cell img { max-width: 100%; max-height: 100%; object-fit: contain; image-rendering: pixelated; }
  .ph { color: var(--muted); font-size: 24px; }

  .item {
    flex: 0 0 auto;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    overflow: hidden;
    padding: 0;
    text-decoration: none;
  }
  .item img { width: 100%; height: 100%; object-fit: cover; }
  .item .ph { font-size: 26px; }

  /* ---- preview ---- */
  .preview {
    grid-area: preview;
    display: flex;
    gap: 12px;
    padding: 12px;
    align-items: flex-start;
    min-height: 96px;
  }
  .thumb {
    flex: none;
    width: 96px;
    height: 96px;
    display: grid;
    place-items: center;
    background: #0c1430;
    border: 1px solid var(--lo);
    overflow: hidden;
  }
  .thumb img { width: 100%; height: 100%; object-fit: cover; }
  .thumb.empty span { font-size: 34px; color: var(--muted); }
  .info { min-width: 0; }
  .ptitle { color: var(--ink); font-size: 16px; margin-bottom: 4px; }
  .pmeta { color: var(--green); font-size: 11px; letter-spacing: 0.12em; margin-bottom: 8px; }
  .pdesc { color: var(--muted); font-size: 13px; line-height: 1.5; margin: 0; }

  /* ---- grilla de ítems ---- */
  .grid {
    grid-area: grid;
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    align-content: start;
  }
  .slot {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    text-decoration: none;
    color: var(--ink);
    min-height: 56px;
  }
  .slot .glyph { color: var(--muted); font-size: 18px; text-align: center; }
  .slot .stitle { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .slot .smeta { color: var(--muted); font-size: 11px; letter-spacing: 0.06em; }
  .slot:hover,
  .slot:focus-visible,
  .slot.sel {
    border-color: var(--red);
    box-shadow: 0 0 10px rgba(255, 74, 61, 0.35);
    outline: none;
  }

  /* ---- desktop: dos columnas ---- */
  @media (min-width: 860px) {
    .menu {
      grid-template-columns: minmax(280px, 1fr) 1.55fr;
      grid-template-areas:
        'console console'
        'preview grid';
      gap: 12px;
    }
    .preview { flex-direction: column; position: sticky; top: 12px; }
    .thumb { width: 100%; height: 200px; }
    .grid { grid-template-columns: 1fr 1fr; }
  }

  /* ---- móvil: portrait horizontal, slots envuelven ---- */
  @media (max-width: 600px) {
    .console {
      grid-template-columns: 1fr;
      grid-template-areas: 'portrait' 'tabs' 'slots';
    }
    .portrait { flex-direction: row; justify-content: flex-start; gap: 14px; }
    .pfp { width: 64px; max-width: none; }
    .slots { flex-wrap: wrap; }
    .cond { flex: 1 1 100%; }
    .equip { flex: 1 1 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ecg polyline { animation: none; stroke-dashoffset: 0; }
  }
</style>
