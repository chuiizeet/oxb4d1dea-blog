<script>
  import { onMount } from 'svelte';

  let booting = $state(true);
  let biosLines = $state([]);
  let showProgram = $state(false);
  let showCd = $state(false);
  let showKbd = $state(false);
  let showAbout = $state(false);
  let showMenu = $state(false);
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

  const BIOS = [
    'Umbrella BIOS  v4.90.1009',
    '(C) Umbrella Inc. 1996-1998',
    '',
    'Main Processor   : Pentium II 450MHz',
    'Memory Testing   : 65536K  OK',
    '',
    'Detecting IDE Primary Master  ... RODEM-HDD',
    'Detecting IDE Secondary Master... CD-SYSTEM',
    '',
    'RODEM Security Module .......... OK',
    'Biohazard Containment ......... STABLE',
    '',
    'Starting UMBRELLA OS...',
  ];

  let topZ = 30;
  let _t = [];
  let _i = [];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); _t.push(id); return id; };

  function tick() {
    clock = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function typeBios(i) {
    if (i >= BIOS.length) { later(finishBoot, 700); return; }
    biosLines = [...biosLines, BIOS[i]];
    later(() => typeBios(i + 1), i === 0 ? 150 : BIOS[i] === '' ? 70 : 230);
  }
  function finishBoot() {
    booting = false;
    startDesktop();
  }
  function startDesktop() {
    later(() => (showProgram = true), 250);
    later(() => (showCd = true), 850);
    later(() => (showKbd = true), 1350);
    let n = 0;
    const di = setInterval(() => { n = (n % 5) + 1; dots = '.'.repeat(n); }, 220);
    _i.push(di);
    later(() => { clearInterval(di); dots = '.....'; ready = true; input?.focus(); }, 1750);
  }

  function reboot() {
    showMenu = false;
    showProgram = showCd = showKbd = showAbout = ready = false;
    biosLines = []; dots = ''; pw = ''; phase = 'idle'; termMsg = '';
    booting = true;
    typeBios(0);
  }
  function reopen() { showCd = true; showKbd = true; showMenu = false; }

  onMount(() => {
    tick();
    _i.push(setInterval(tick, 10000));
    typeBios(0);
    return () => { _t.forEach(clearTimeout); _i.forEach(clearInterval); };
  });

  // arrastrar por la barra de título (desktop) + traer al frente
  function draggable(node) {
    const handle = node.querySelector('.tb');
    if (!handle) return;
    let sx, sy, sl, st;
    function move(e) {
      node.style.left = sl + (e.clientX - sx) + 'px';
      node.style.top = st + (e.clientY - sy) + 'px';
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    }
    function down(e) {
      node.style.zIndex = ++topZ;
      if (window.innerWidth <= 700 || e.target.closest('.wb')) return;
      node.style.left = node.offsetLeft + 'px';
      node.style.top = node.offsetTop + 'px';
      node.style.right = 'auto';
      sx = e.clientX; sy = e.clientY; sl = node.offsetLeft; st = node.offsetTop;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }
    handle.addEventListener('pointerdown', down);
    return { destroy() { handle.removeEventListener('pointerdown', down); } };
  }

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
        later(() => (window.location.href = '/editor'), 950);
      } else {
        phase = 'denied';
        termMsg = 'ACCESS DENIED';
        pw = '';
        later(() => { if (phase === 'denied') { phase = 'idle'; termMsg = ''; input?.focus(); } }, 1500);
      }
    } catch {
      phase = 'denied';
      termMsg = 'CONNECTION ERROR';
    }
  }
</script>

{#if booting}
  <div class="bios">
    {#each biosLines as l}<div class="bln">{l}</div>{/each}
    <span class="cur">█</span>
    <div class="biosfoot">Press DEL to enter SETUP, ESC to skip memory test</div>
  </div>
{/if}

<div class="desktop">
  {#if showProgram}
    <div class="win program" class:shake={phase === 'denied'} use:draggable>
      <div class="tb"><span class="ttl">PROGRAM ( 1:1 )</span><span class="wbtns"><span class="wb">_</span><span class="wb">▢</span><span class="wb x">✕</span></span></div>
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
    <div class="win cd" use:draggable>
      <div class="tb"><span class="ttl">repeat cdsystem</span><span class="wbtns"><span class="wb">_</span><span class="wb">▢</span><span class="wb x" onclick={() => (showCd = false)}>✕</span></span></div>
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
    <div class="win keyboard" use:draggable>
      <div class="tb"><span class="ttl">KEYBOARD ( 1:1 )</span><span class="wbtns"><span class="wb">_</span><span class="wb">▢</span><span class="wb x" onclick={() => (showKbd = false)}>✕</span></span></div>
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

  {#if showAbout}
    <div class="win about" use:draggable>
      <div class="tb"><span class="ttl">Acerca de</span><span class="wbtns"><span class="wb x" onclick={() => (showAbout = false)}>✕</span></span></div>
      <div class="body abody">
        <p><b>UMBRELLA "RODEM" SYSTEM</b><br />blog &amp; diario de Chuy</p>
        <p>Homenaje a Resident Evil 2.<br />Fondo: <i>The Queen Is Dead</i> 🎸</p>
        <button class="repeat" type="button" onclick={() => (showAbout = false)}>Aceptar</button>
      </div>
    </div>
  {/if}

  <div class="taskbar">
    <button class="file" class:on={showMenu} onclick={() => (showMenu = !showMenu)}>▣ File</button>
    <div class="tray">{clock}</div>
  </div>

  {#if showMenu}
    <div class="menu-backdrop" onclick={() => (showMenu = false)}></div>
    <div class="filemenu">
      <button onclick={reopen}>Re-abrir ventanas</button>
      <button onclick={() => { showAbout = true; showMenu = false; }}>Acerca de…</button>
      <button onclick={reboot}>Reiniciar sistema</button>
    </div>
  {/if}
</div>

<style>
  .bios {
    position: fixed; inset: 0; z-index: 9999;
    background: #000; color: #c8c8c8;
    font-family: ui-monospace, 'Courier New', monospace; font-size: 14px; line-height: 1.5;
    padding: 30px 28px; white-space: pre-wrap;
  }
  .bios .bln { min-height: 1.5em; }
  .bios .cur { animation: blink 1s steps(1) infinite; }
  .biosfoot { position: absolute; left: 28px; bottom: 26px; color: #8a8a8a; }
  @keyframes blink { 50% { opacity: 0; } }

  .desktop {
    --face: #d4d0c8; --hl: #ffffff; --sh: #808080; --dk: #404040;
    --blue1: #0a246a; --blue2: #a6caf0;
    position: fixed; inset: 0; overflow: auto;
    background: #14201a url('/login_bg_mobile.png') center / cover no-repeat;
    image-rendering: pixelated;
    font-family: Tahoma, 'MS Sans Serif', system-ui, sans-serif;
  }
  @media (min-width: 700px) { .desktop { background-image: url('/login_bg_desktop.png'); } }
  .desktop::after {
    content: ''; position: fixed; inset: 0; pointer-events: none;
    background: repeating-linear-gradient(rgba(0, 0, 0, 0.14) 0 1px, transparent 1px 3px); opacity: 0.5;
  }

  .win {
    position: absolute; background: var(--face);
    border: 2px solid; border-color: var(--hl) var(--dk) var(--dk) var(--hl);
    box-shadow: inset -1px -1px 0 var(--sh), inset 1px 1px 0 var(--face), 2px 2px 6px rgba(0, 0, 0, 0.55);
    color: #1a1a14; animation: pop 0.16s ease-out; z-index: 10;
  }
  .program { left: 4%; top: 6%; width: min(700px, 94vw); z-index: 20; }
  .cd { left: 62%; top: 13%; width: min(330px, 88vw); z-index: 24; }
  .keyboard { left: 9%; top: 53%; width: min(820px, 96vw); z-index: 22; }
  .about { left: calc(50% - 160px); top: 26%; width: min(320px, 88vw); z-index: 40; }
  @keyframes pop { from { transform: scale(0.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .win.shake { animation: shake 0.36s; }
  @keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }

  .tb {
    display: flex; align-items: center; gap: 4px; padding: 2px 2px 2px 6px;
    background: linear-gradient(90deg, var(--blue1), var(--blue2)); cursor: default; touch-action: none;
  }
  .ttl { flex: 1; font-size: 13px; font-weight: bold; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3); }
  .wbtns { display: flex; gap: 2px; flex: 0 0 auto; }
  .wb {
    width: 19px; height: 17px; display: grid; place-items: center; font-size: 11px; line-height: 1; color: #000;
    background: var(--face); border: 1px solid; border-color: var(--hl) var(--dk) var(--dk) var(--hl); box-shadow: inset -1px -1px 0 var(--sh);
  }
  .wb.x { cursor: pointer; }

  .body { padding: 12px; font-size: 13px; }
  .screen { background: rgba(8, 16, 10, 0.55); color: #dfe9d6; font-family: ui-monospace, 'Courier New', monospace; padding: 14px 16px; }
  .screen .ln { line-height: 1.55; white-space: pre-wrap; letter-spacing: 0.06em; }
  .screen .big { font-weight: bold; }
  .screen .ln.sp { height: 9px; }
  .ver { float: right; }
  .user { color: #7cfc9a; }
  .pwline { display: flex; align-items: center; }
  .prompt { font-weight: bold; }
  .pwline input { flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: #7cfc9a; font: inherit; letter-spacing: 0.2em; caret-color: #7cfc9a; }
  .msg { margin-top: 8px; }
  .msg.ok { color: #5bff8f; text-shadow: 0 0 10px #46f08a; }
  .msg.bad { color: #ff6a5a; text-shadow: 0 0 10px #ff5a4a; }

  .cdbody { display: flex; gap: 12px; }
  .cover { width: 92px; height: 92px; object-fit: cover; image-rendering: pixelated; border: 1px solid var(--sh); flex: 0 0 auto; }
  .cdinfo { flex: 1; min-width: 0; }
  .counter { font-family: ui-monospace, monospace; font-size: 22px; color: #1f8a1f; font-weight: bold; }
  .counter span { opacity: 0.7; }
  .toc { font-style: italic; font-size: 13px; margin: 3px 0 8px; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bars { display: flex; flex-direction: column; gap: 4px; }
  .bar { height: 11px; background: #3a3a34; border: 1px solid var(--sh); }
  .bar i { display: block; height: 100%; }
  .bar i.r { background: #d11; width: 70%; animation: eqA 1.4s ease-in-out infinite alternate; }
  .bar i.y { background: #c9c20e; width: 45%; animation: eqB 1.1s ease-in-out infinite alternate; }
  .bar i.m { background: #c11ac1; width: 85%; animation: eqC 1.7s ease-in-out infinite alternate; }
  @keyframes eqA { to { width: 38%; } }
  @keyframes eqB { to { width: 82%; } }
  @keyframes eqC { to { width: 52%; } }
  .repeat { margin-top: 10px; background: var(--face); font: inherit; font-size: 13px; padding: 3px 14px; cursor: pointer; border: 1px solid; border-color: var(--hl) var(--dk) var(--dk) var(--hl); box-shadow: inset -1px -1px 0 var(--sh); }
  .repeat:active { border-color: var(--dk) var(--hl) var(--hl) var(--dk); box-shadow: inset 1px 1px 0 var(--sh); }

  .abody { line-height: 1.6; }
  .abody p { margin: 0 0 10px; }

  .kb { display: flex; flex-direction: column; gap: 6px; padding: 14px; }
  .krow { display: flex; gap: 6px; justify-content: center; }
  .key {
    flex: 1; min-width: 0; aspect-ratio: 1 / 0.8; background: var(--face);
    border: 1px solid; border-color: var(--hl) var(--dk) var(--dk) var(--hl); box-shadow: inset -1px -1px 0 var(--sh);
    font: inherit; font-size: 17px; font-weight: bold; color: #2a2a22; cursor: pointer;
  }
  .key.wide { flex: 1.4; font-size: 12px; }
  .key:active { border-color: var(--dk) var(--hl) var(--hl) var(--dk); box-shadow: inset 1px 1px 0 var(--sh); }

  .taskbar {
    position: fixed; left: 0; right: 0; bottom: 0; height: 32px;
    display: flex; align-items: center; justify-content: space-between;
    background: var(--face); border-top: 2px solid var(--hl); padding: 0 5px; z-index: 50;
  }
  .file { background: var(--face); font: inherit; font-size: 13px; font-weight: bold; padding: 3px 14px; cursor: pointer; border: 1px solid; border-color: var(--hl) var(--dk) var(--dk) var(--hl); box-shadow: inset -1px -1px 0 var(--sh); }
  .file.on, .file:active { border-color: var(--dk) var(--hl) var(--hl) var(--dk); box-shadow: inset 1px 1px 0 var(--sh); }
  .tray { border: 1px solid; border-color: var(--sh) var(--hl) var(--hl) var(--sh); padding: 3px 14px; font-size: 13px; }

  .menu-backdrop { position: fixed; inset: 0; z-index: 58; }
  .filemenu {
    position: fixed; bottom: 32px; left: 5px; z-index: 60; min-width: 190px;
    background: var(--face); border: 2px solid; border-color: var(--hl) var(--dk) var(--dk) var(--hl);
    box-shadow: inset -1px -1px 0 var(--sh), 2px 2px 6px rgba(0, 0, 0, 0.5);
    display: flex; flex-direction: column; padding: 3px;
  }
  .filemenu button { text-align: left; background: transparent; border: none; padding: 8px 14px; font: inherit; font-size: 13px; color: #1a1a14; cursor: pointer; }
  .filemenu button:hover { background: var(--blue1); color: #fff; }

  @media (max-width: 700px) {
    .desktop { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px 0 44px; }
    .win { position: static; width: 94vw; }
    .keyboard { display: none; }
  }
</style>
