<script>
  import { onMount } from 'svelte';

  let { name = 'Chuy', avatar = '/pfp.jpg' } = $props();
  let nm = $state(name);
  let av = $state(avatar);
  let status = $state('');
  let uploading = $state(false);
  let saving = $state(false);
  let clock = $state('');
  let fileInput;

  onMount(() => {
    const t = () => (clock = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    t();
    const i = setInterval(t, 10000);
    return () => clearInterval(i);
  });

  async function onFile(ev) {
    const f = ev.target.files?.[0];
    if (!f) return;
    uploading = true;
    status = 'subiendo foto…';
    const fd = new FormData();
    fd.append('file', f);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) { status = '✗ ' + (await res.text()); uploading = false; return; }
      const r = await res.json();
      av = r.url;
      status = 'foto lista — guarda para aplicar';
    } catch (e) {
      status = '✗ ' + e.message;
    }
    uploading = false;
    ev.target.value = '';
  }

  async function save() {
    saving = true;
    status = 'guardando…';
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: nm, avatar: av }),
      });
      if (!res.ok) { status = '✗ ' + (await res.text()); saving = false; return; }
      const r = await res.json();
      nm = r.name; av = r.avatar;
      status = '✓ perfil guardado';
    } catch (e) {
      status = '✗ ' + e.message;
    }
    saving = false;
  }
</script>

<div class="w2k">
  <div class="win">
    <div class="tb">
      <span class="ttl">Panel de control</span>
      <span class="wbtns"><span class="wb">_</span><span class="wb">▢</span><a class="wb" href="/" aria-label="Cerrar">✕</a></span>
    </div>
    <div class="menubar"><span><u>A</u>rchivo</span><span><u>P</u>erfil</span><span>A<u>y</u>uda</span></div>
    <div class="winbody">
      <p class="hi">Hola, {nm}.</p>

      <div class="profile">
        <img class="pfp sunken" src={av} alt="" />
        <div class="fields">
          <button class="btn" type="button" onclick={() => fileInput.click()} disabled={uploading}>Cambiar foto…</button>
          <input bind:this={fileInput} type="file" accept="image/*" onchange={onFile} hidden />
          <label>Nombre <input type="text" bind:value={nm} maxlength="24" /></label>
        </div>
      </div>

      <div class="actions">
        <button class="btn primary" onclick={save} disabled={saving || uploading}>Guardar perfil</button>
        <span class="status">{status}</span>
      </div>

      <div class="links">
        <a class="link" href="/editor">✍ Editar diario / blog</a>
        <a class="link" href="/">🏠 Ver el sitio</a>
        <a class="link out" href="/logout">⏻ Cerrar sesión</a>
      </div>
    </div>
  </div>

  <div class="taskbar"><button class="btn start">▣ Inicio</button><div class="tray">{clock}</div></div>
</div>

<style>
  .win { width: min(460px, 100%); margin: 4vh auto 0; }
  .winbody { padding: 18px; }
  .hi { margin: 0 0 16px; color: #333; font-size: 13px; }
  .profile { display: flex; gap: 16px; align-items: center; }
  .pfp { width: 92px; height: 92px; object-fit: cover; image-rendering: pixelated; flex: 0 0 auto; }
  .fields { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
  .fields .btn { align-self: flex-start; }
  .actions { display: flex; align-items: center; gap: 12px; margin: 18px 0 8px; }
  .status { font-size: 12px; color: #0a4a0a; }
  .links { display: flex; flex-direction: column; gap: 2px; border-top: 1px solid #808080; padding-top: 10px; margin-top: 6px; }
  .link { color: #0a246a; text-decoration: none; padding: 7px 6px; font-size: 14px; }
  .link:hover { background: #0a246a; color: #fff; }
  .link.out { color: #a00000; }
  .start { font-weight: bold; }
</style>
