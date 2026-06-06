<script>
  import { onMount } from 'svelte';

  let showWarn = $state(false);
  let showSys = $state(false);
  let showTerm = $state(false);
  let sysLines = $state([]);
  let pw = $state('');
  let phase = $state('idle'); // idle | checking | granted | denied
  let termMsg = $state('');
  let clock = $state('');
  let input;

  const BOOT = [
    'UMBRELLA OS  [Versión 4.9.8]',
    '(C) Umbrella Corp.  Acceso restringido.',
    '> Iniciando núcleo .............. OK',
    '> Módulo de seguridad ........... OK',
    '> Contención T-Virus ............ ESTABLE',
    '> Conexión al mainframe ......... OK',
    '> Esperando autenticación...',
  ];

  function tick() {
    clock = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function typeBoot(i) {
    if (i >= BOOT.length) return;
    sysLines = [...sysLines, BOOT[i]];
    setTimeout(() => typeBoot(i + 1), 260);
  }

  onMount(() => {
    tick();
    const ci = setInterval(tick, 10000);
    const t = [];
    t.push(setTimeout(() => (showWarn = true), 350));
    t.push(setTimeout(() => { showSys = true; typeBoot(0); }, 1200));
    t.push(setTimeout(() => { showTerm = true; input?.focus(); }, 2700));
    return () => { clearInterval(ci); t.forEach(clearTimeout); };
  });

  async function submit(e) {
    e?.preventDefault();
    if (phase === 'checking' || phase === 'granted') return;
    phase = 'checking';
    termMsg = 'verificando credenciales...';
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
      termMsg = 'ERROR DE CONEXIÓN';
    }
  }
</script>

<div class="desktop">
  <div class="watermark" aria-hidden="true"><span class="umb wm"></span></div>

  {#if showWarn}
    <div class="win warn">
      <div class="tb red"><span class="tbi">⚠</span><span class="tt">Advertencia de bioseguridad</span><button class="x" onclick={() => (showWarn = false)}>✕</button></div>
      <div class="body warnbody">
        <span class="umb big"></span>
        <p>Brecha detectada en el Sector&nbsp;4.<br />Contención del <b>T-Virus</b>: activa.<br />Se requiere autenticación.</p>
      </div>
      <div class="btns"><button class="btn" onclick={() => (showWarn = false)}>Aceptar</button></div>
    </div>
  {/if}

  {#if showSys}
    <div class="win sys">
      <div class="tb"><span class="tbi">▤</span><span class="tt">SYSTEM.LOG</span><button class="x" onclick={() => (showSys = false)}>✕</button></div>
      <div class="body term small">
        {#each sysLines as l}<div class="ln">{l}</div>{/each}
      </div>
    </div>
  {/if}

  {#if showTerm}
    <div class="win termwin" class:shake={phase === 'denied'}>
      <div class="tb red"><span class="tbi">▣</span><span class="tt">UMBRELLA — TERMINAL</span><button class="x">✕</button></div>
      <div class="body term">
        <div class="ln dim">MAINFRAME — ACCESO RESTRINGIDO</div>
        <div class="ln">login: <span class="user">chuy</span></div>
        <form onsubmit={submit} class="pwline">
          <span>password:&nbsp;</span>
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
          <div class="ln msg" class:ok={phase === 'granted'} class:bad={phase === 'denied'}>&gt; {termMsg}</div>
        {/if}
      </div>
    </div>
  {/if}

  <div class="taskbar">
    <button class="start"><span class="umb sm"></span> Inicio</button>
    <div class="tray">{clock}</div>
  </div>
</div>

<style>
  .desktop {
    position: fixed;
    inset: 0;
    background: #0a6b62;
    overflow: hidden;
    font-family: Tahoma, 'MS Sans Serif', system-ui, sans-serif;
  }
  /* scanlines sutiles */
  .desktop::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(rgba(0, 0, 0, 0.16) 0 1px, transparent 1px 3px);
    opacity: 0.5;
  }
  .watermark { position: absolute; inset: 0; display: grid; place-items: center; }
  .umb {
    aspect-ratio: 1;
    background: conic-gradient(
      #d11 0 45deg, #fff 45deg 90deg, #d11 90deg 135deg, #fff 135deg 180deg,
      #d11 180deg 225deg, #fff 225deg 270deg, #d11 270deg 315deg, #fff 315deg 360deg
    );
    clip-path: polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%);
  }
  .umb.wm { width: min(60vmin, 460px); opacity: 0.06; }
  .umb.big { width: 42px; flex: 0 0 auto; }
  .umb.sm { width: 16px; display: inline-block; vertical-align: middle; }

  .win {
    position: absolute;
    width: min(380px, 88vw);
    background: #c3c3c3;
    border: 2px solid;
    border-color: #fdfdfd #6f6f6f #6f6f6f #fdfdfd;
    box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.45);
    color: #000;
    animation: pop 0.16s ease-out;
    z-index: 10;
  }
  .win.warn { left: 8%; top: 13%; }
  .win.sys { left: 26%; top: 28%; z-index: 12; }
  .win.termwin { left: 34%; top: 45%; width: min(440px, 92vw); z-index: 20; }
  @keyframes pop { from { transform: scale(0.93); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .win.shake { animation: shake 0.36s; }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }

  .tb {
    display: flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(90deg, #00007b, #1287d8);
    color: #fff;
    font-size: 12px;
    font-weight: bold;
    padding: 3px 4px;
    user-select: none;
  }
  .tb.red { background: linear-gradient(90deg, #6e0000, #c81e1e); }
  .tt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tbi { font-size: 12px; }
  .x {
    margin-left: auto;
    width: 18px; height: 16px;
    background: #c3c3c3;
    border: 1px solid; border-color: #fff #6f6f6f #6f6f6f #fff;
    color: #000; font-size: 9px; line-height: 1; cursor: pointer;
    flex: 0 0 auto;
  }
  .body { padding: 12px; font-size: 12px; }
  .warnbody { display: flex; gap: 12px; align-items: center; line-height: 1.5; }
  .warnbody p { margin: 0; }
  .btns { display: flex; justify-content: center; padding: 0 12px 12px; }
  .btn, .start {
    background: #c3c3c3;
    border: 2px solid; border-color: #fff #6f6f6f #6f6f6f #fff;
    padding: 3px 14px; font: inherit; font-size: 12px; cursor: pointer;
  }
  .btn:active, .start:active { border-color: #6f6f6f #fff #fff #6f6f6f; }

  .term {
    background: #040804;
    color: #46f08a;
    font-family: ui-monospace, 'Courier New', monospace;
  }
  .term.small { font-size: 11px; max-height: 116px; overflow: auto; color: #74e6a0; }
  .term .ln { white-space: pre-wrap; line-height: 1.55; }
  .term .dim { color: #2c9c5e; }
  .term .user { color: #9dffc1; }
  .pwline { display: flex; align-items: center; }
  .pwline input {
    flex: 1; min-width: 0;
    background: transparent; border: none; outline: none;
    color: #46f08a; font: inherit; caret-color: #46f08a;
  }
  .msg { margin-top: 6px; font-weight: bold; }
  .msg.ok { color: #5bff8f; text-shadow: 0 0 10px #46f08a; }
  .msg.bad { color: #ff5a4a; text-shadow: 0 0 10px #ff5a4a; }

  .taskbar {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 32px;
    display: flex; align-items: center; justify-content: space-between;
    background: #c3c3c3;
    border-top: 2px solid #fdfdfd;
    padding: 0 5px;
    z-index: 50;
  }
  .start { display: inline-flex; align-items: center; gap: 6px; font-weight: bold; }
  .tray {
    border: 1px solid; border-color: #6f6f6f #fff #fff #6f6f6f;
    padding: 3px 12px; font-size: 12px;
  }

  @media (max-width: 620px) {
    .desktop { display: flex; flex-direction: column; gap: 10px; padding: 12px 0 42px; align-items: center; }
    .win { position: static; width: 92vw; }
  }
</style>
