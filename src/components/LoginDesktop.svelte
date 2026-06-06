<script>
  import { onMount } from 'svelte';

  let showProgram = $state(false);
  let showCd = $state(false);
  let showKbd = $state(false);
  let ready = $state(false);
  let dots = $state('');
  let pw = $state('');
  let phase = $state('idle'); // idle | checking | granted | denied
  let termMsg = $state('');
  let clock = $state('');
  let input;

  const ROWS = [
    ['ESC', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', '⌫'],
    ['I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', '↵'],
    ['R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  ];

  function tick() {
    clock = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  onMount(() => {
    tick();
    const ci = setInterval(tick, 10000);
    const t = [];
    t.push(setTimeout(() => (showProgram = true), 300));
    t.push(setTimeout(() => (showCd = true), 950));
    t.push(setTimeout(() => (showKbd = true), 1500));
    let n = 0;
    const di = setInterval(() => { n = (n % 5) + 1; dots = '.'.repeat(n); }, 220);
    t.push(setTimeout(() => { clearInterval(di); dots = '.....'; ready = true; input?.focus(); }, 1900));
    return () => { clearInterval(ci); clearInterval(di); t.forEach(clearTimeout); };
  });

  function key(k) {
    if (phase === 'checking' || phase === 'granted') return;
    if (k === 'ESC') { pw = ''; }
    else if (k === '⌫') { pw = pw.slice(0, -1); }
    else if (k === '↵') { submit(); return; }
    else { pw += k.toLowerCase(); }
    input?.focus();
  }

  async function submit(e) {
    e?.preventDefault();
    if (phase === 'checking' || phase === 'granted') return;
    phase = 'checking';
    termMsg = 'ACCESSING...';
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const r = await res.json().catch(() => ({ ok: false }));
      if (r.ok) {
        phase = 'granted';
        termMsg = 'ACCESS GRANTED';
        setTimeout(() => (window.location.href = '/editor'), 950);
      } else {
        phase = 'denied';
        termMsg = 'ACCESS DENIED';
        pw = '';
        setTimeout(() => {
          if (phase === 'denied') { phase = 'idle'; termMsg = ''; input?.focus(); }
        }, 1500);
      }
    } catch {
      phase = 'denied';
      termMsg = 'CONNECTION ERROR';
    }
  }
</script>

<div class="desktop">
  {#if showProgram}
    <div class="win program" class:shake={phase === 'denied'}>
      <div class="tb"><span class="cnr"></span><span class="ttl">PROGRAM ( 1:1 )</span><span class="cnr"></span></div>
      <div class="body screen">
        <div class="ln big">UMBRELLA "RODEM" SYSTEM<span class="ver">Ver 5.0</span></div>
        <div class="ln big">Culture Experiment Room Staff Registry.</div>
        <div class="ln sp"></div>
        <div class="ln big">Accessing{dots}</div>
        {#if ready}
          <div class="ln sp"></div>
          <div class="ln big">Enter your user name.</div>
          <div class="ln big">&gt;<span class="user">chuy</span></div>
          <div class="ln sp"></div>
          <div class="ln big">Enter password.</div>
          <form onsubmit={submit} class="pwline">
            <span class="prompt">&gt;</span>
            <input
              bind:this={input}
              bind:value={pw}
              type="password"
              autocomplete="current-password"
              spellcheck="false"
              disabled={phase === 'checking' || phase === 'granted'}
            />
          </form>
          {#if termMsg}
            <div class="ln big msg" class:ok={phase === 'granted'} class:bad={phase === 'denied'}>{termMsg}</div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}

  {#if showCd}
    <div class="win cd">
      <div class="tb"><span class="cnr"></span><span class="ttl">repeat cdsystem</span><span class="cnr"></span></div>
      <div class="body cdbody">
        <img class="cover" src="/login_bg_mobile.png" alt="" />
        <div class="cdinfo">
          <div class="counter">77 <span>52</span></div>
          <div class="toc">the queen is dead</div>
          <div class="bars">
            <div class="bar"><i class="r"></i></div>
            <div class="bar"><i class="y"></i></div>
            <div class="bar"><i class="m"></i></div>
          </div>
          <button class="repeat" type="button">repeat</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showKbd}
    <div class="win keyboard">
      <div class="tb"><span class="cnr"></span><span class="ttl">KEYBOARD ( 1:1 )</span><span class="cnr"></span></div>
      <div class="body kb">
        {#each ROWS as row}
          <div class="krow">
            {#each row as k}
              <button class="key" class:wide={k.length > 1} onclick={() => key(k)}>{k}</button>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="taskbar">
    <button class="file">▣ File</button>
    <div class="tray">{clock}</div>
  </div>
</div>

<style>
  .desktop {
    position: fixed;
    inset: 0;
    overflow: auto;
    background: #14201a url('/login_bg_mobile.png') center / cover no-repeat;
    image-rendering: pixelated;
    font-family: Tahoma, 'MS Sans Serif', system-ui, sans-serif;
  }
  @media (min-width: 700px) {
    .desktop { background-image: url('/login_bg_desktop.png'); }
  }
  .desktop::after {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(rgba(0, 0, 0, 0.14) 0 1px, transparent 1px 3px);
    opacity: 0.5;
  }

  .win {
    position: absolute;
    background: #c8c8c0;
    border: 2px solid;
    border-color: #f4f4ee #6f6f68 #6f6f68 #f4f4ee;
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.55);
    color: #1a1a14;
    animation: pop 0.16s ease-out;
    z-index: 10;
  }
  .program { left: 5%; top: 7%; width: min(560px, 92vw); z-index: 20; }
  .cd { left: 60%; top: 16%; width: min(250px, 84vw); z-index: 24; }
  .keyboard { left: 12%; top: 55%; width: min(640px, 94vw); z-index: 22; }
  @keyframes pop { from { transform: scale(0.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .win.shake { animation: shake 0.36s; }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }

  .tb { display: flex; align-items: center; gap: 6px; padding: 2px 3px; border-bottom: 1px solid #6f6f68; }
  .cnr { width: 13px; height: 11px; flex: 0 0 auto; background: #c8c8c0; border: 1px solid; border-color: #f4f4ee #6f6f68 #6f6f68 #f4f4ee; }
  .ttl { flex: 1; text-align: center; font-size: 12px; font-weight: bold; letter-spacing: 0.06em; color: #222; }
  .body { padding: 10px; font-size: 12px; }

  /* terminal RODEM: el álbum se ve detrás, atenuado */
  .screen {
    background: rgba(8, 16, 10, 0.55);
    color: #dfe9d6;
    font-family: ui-monospace, 'Courier New', monospace;
    padding: 12px 14px;
  }
  .screen .ln { line-height: 1.5; white-space: pre-wrap; letter-spacing: 0.06em; }
  .screen .big { font-weight: bold; }
  .screen .ln.sp { height: 8px; }
  .ver { float: right; }
  .user { color: #7CFC9A; }
  .pwline { display: flex; align-items: center; }
  .prompt { font-weight: bold; }
  .pwline input { flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: #7CFC9A; font: inherit; letter-spacing: 0.2em; caret-color: #7CFC9A; }
  .msg { margin-top: 8px; }
  .msg.ok { color: #5bff8f; text-shadow: 0 0 10px #46f08a; }
  .msg.bad { color: #ff6a5a; text-shadow: 0 0 10px #ff5a4a; }

  /* cdsystem */
  .cdbody { display: flex; gap: 10px; }
  .cover { width: 74px; height: 74px; object-fit: cover; image-rendering: pixelated; border: 1px solid #6f6f68; flex: 0 0 auto; }
  .cdinfo { flex: 1; min-width: 0; }
  .counter { font-family: ui-monospace, monospace; font-size: 18px; color: #2a8f2a; font-weight: bold; }
  .counter span { color: #2a8f2a; opacity: 0.7; }
  .toc { font-style: italic; font-size: 12px; margin: 2px 0 6px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bars { display: flex; flex-direction: column; gap: 3px; }
  .bar { height: 9px; background: #3a3a34; border: 1px solid #6f6f68; }
  .bar i { display: block; height: 100%; }
  .bar i.r { background: #d11; width: 70%; animation: eqA 1.4s ease-in-out infinite alternate; }
  .bar i.y { background: #c9c20e; width: 45%; animation: eqB 1.1s ease-in-out infinite alternate; }
  .bar i.m { background: #c11ac1; width: 85%; animation: eqC 1.7s ease-in-out infinite alternate; }
  @keyframes eqA { to { width: 38%; } }
  @keyframes eqB { to { width: 82%; } }
  @keyframes eqC { to { width: 52%; } }
  .repeat { margin-top: 8px; background: #c8c8c0; border: 2px solid; border-color: #f4f4ee #6f6f68 #6f6f68 #f4f4ee; padding: 2px 12px; font: inherit; font-size: 12px; cursor: pointer; }

  /* teclado en pantalla */
  .kb { display: flex; flex-direction: column; gap: 5px; }
  .krow { display: flex; gap: 5px; justify-content: center; }
  .key {
    flex: 1; min-width: 0;
    aspect-ratio: 1 / 0.78;
    background: #c8c8c0;
    border: 2px solid; border-color: #f4f4ee #6f6f68 #6f6f68 #f4f4ee;
    font: inherit; font-size: 15px; font-weight: bold; color: #2a2a22; cursor: pointer;
  }
  .key.wide { flex: 1.4; font-size: 11px; }
  .key:active { border-color: #6f6f68 #f4f4ee #f4f4ee #6f6f68; }

  .taskbar {
    position: fixed; left: 0; right: 0; bottom: 0; height: 30px;
    display: flex; align-items: center; justify-content: space-between;
    background: #c8c8c0; border-top: 2px solid #f4f4ee; padding: 0 5px; z-index: 50;
  }
  .file { background: #c8c8c0; border: 2px solid; border-color: #f4f4ee #6f6f68 #6f6f68 #f4f4ee; padding: 3px 12px; font: inherit; font-size: 12px; font-weight: bold; cursor: pointer; }
  .tray { border: 1px solid; border-color: #6f6f68 #fff #fff #6f6f68; padding: 3px 12px; font-size: 12px; }

  @media (max-width: 700px) {
    .desktop { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px 0 44px; }
    .win { position: static; width: 94vw; }
    .keyboard { display: none; } /* en móvil se usa el teclado nativo tocando el campo */
  }
</style>
