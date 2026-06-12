<script>
  import { onMount } from 'svelte';

  let { sections = [] } = $props();

  let secs = $state([...sections]);
  let selSec = $state(null);
  const blankItem = () => ({ id: null, title: '', sub: '', description: '', cover: '', url: '' });
  let f = $state(blankItem());
  let mode = $state('edit'); // 'edit' (item actual) | 'change' (item nuevo)
  let note = $state('');
  let sec = $state({ id: null, label: '', icon: '', position: 0, published: true });
  let revs = $state([]);
  let status = $state('');
  let busy = $state(false);
  let clock = $state('');
  let fileInput;

  const currentItem = (s) => s?.items?.find((it) => it.current) ?? null;

  function selectSection(s) {
    selSec = s;
    sec = { id: s.id, label: s.label, icon: s.icon, position: s.position, published: s.published };
    const cur = currentItem(s);
    f = cur ? { id: cur.id, title: cur.title, sub: cur.sub, description: cur.description, cover: cur.cover, url: cur.url } : blankItem();
    mode = cur ? 'edit' : 'change';
    note = '';
    status = '';
    loadRevs(cur?.id);
  }

  async function loadRevs(id) {
    revs = [];
    if (!id) return;
    try {
      const r = await fetch('/api/item-revisions?itemId=' + id);
      if (r.ok) revs = await r.json();
    } catch {}
  }

  onMount(() => {
    const t = () => (clock = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    t();
    const i = setInterval(t, 10000);
    const h = location.hash.slice(1);
    const start = (h && secs.find((s) => s.id === h)) || secs[0];
    if (start) selectSection(start);
    return () => clearInterval(i);
  });

  function startChange() { mode = 'change'; f = blankItem(); note = ''; status = 'Item nuevo — al crear, el actual se archiva.'; }
  function cancelChange() { selectSection(selSec); }

  function reloadTo(id) { location.hash = id || (selSec?.id ?? ''); location.reload(); }

  async function onFile(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    busy = true;
    status = 'subiendo…';
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!r.ok) { status = '✗ ' + (await r.text()); busy = false; return; }
      const j = await r.json();
      f.cover = j.url;
      status = 'imagen lista';
    } catch (e) { status = '✗ ' + e.message; }
    busy = false;
    ev.target.value = '';
  }

  async function saveItem() {
    if (!f.title.trim()) { status = '✗ falta el título'; return; }
    busy = true;
    status = 'guardando…';
    try {
      const r = mode === 'change'
        ? await fetch('/api/change-item', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sectionId: selSec.id, ...f, note }) })
        : await fetch('/api/save-item', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...f, note }) });
      if (!r.ok) { status = '✗ ' + (await r.text()); busy = false; return; }
      status = '✓ guardado';
      setTimeout(() => reloadTo(selSec.id), 500);
    } catch (e) { status = '✗ ' + e.message; busy = false; }
  }

  async function saveSection() {
    busy = true;
    status = 'guardando sección…';
    try {
      const r = await fetch('/api/save-section', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...sec, position: Number(sec.position) || 0 }) });
      if (!r.ok) { status = '✗ ' + (await r.text()); busy = false; return; }
      const j = await r.json();
      status = '✓ sección guardada';
      setTimeout(() => reloadTo(sec.id || j.id), 500);
    } catch (e) { status = '✗ ' + e.message; busy = false; }
  }

  async function newSection() {
    const r = await fetch('/api/save-section', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label: 'Nueva sección', icon: '⬚', position: secs.length }) });
    if (r.ok) { const j = await r.json(); reloadTo(j.id); }
  }

  async function delSection() {
    if (!sec.id) return;
    if (!confirm('¿Borrar esta sección y TODOS sus items e historial?')) return;
    const r = await fetch('/api/delete-section', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: sec.id }) });
    if (r.ok) { location.hash = ''; location.reload(); }
  }

  async function makeCurrent(it) {
    if (!confirm('¿Poner este item como actual? El actual se archiva.')) return;
    const r = await fetch('/api/set-current', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sectionId: selSec.id, itemId: it.id }) });
    if (r.ok) reloadTo(selSec.id);
  }

  async function delItem(it) {
    if (!confirm('¿Borrar este item del historial de la sección?')) return;
    const r = await fetch('/api/delete-item', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: it.id }) });
    if (r.ok) reloadTo(selSec.id);
  }

  function restore(rev) {
    if (!confirm('¿Restaurar esta versión al formulario? (no se guarda hasta que des Guardar)')) return;
    const s = rev.snapshot || {};
    f = { ...f, title: s.title ?? '', sub: s.sub ?? '', description: s.description ?? '', cover: s.cover ?? '', url: s.url ?? '' };
    status = 'restaurado (revisa y guarda)';
  }
  const fmtTs = (t) => new Date(t).toLocaleString('es-ES');
  const fmtD = (t) => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<div class="w2k">
  <div class="win">
    <div class="tb">
      <span class="ttl">ITEMS — inventario</span>
      <span class="wbtns"><span class="wb">_</span><span class="wb">▢</span><a class="wb" href="/panel" aria-label="Cerrar">✕</a></span>
    </div>
    <div class="menubar"><span><u>A</u>rchivo</span><span><u>E</u>dición</span><span>A<u>y</u>uda</span></div>

    <div class="winbody">
      <div class="ed">
        <aside class="side">
          <button class="btn new" onclick={newSection}>+ Nueva sección</button>
          <div class="list sunken">
            {#each secs as s}
              <button class="erow" class:on={selSec?.id === s.id} onclick={() => selectSection(s)}>
                <span class="ic">{s.icon || '▤'}</span>
                <span class="t">{s.label || '(sección)'}{#if s.slot && s.slot !== 'grid'} <em class="hdr">header</em>{/if}</span>
                <span class="m">{s.items.length}</span>
              </button>
            {/each}
          </div>
          <a class="logout" href="/logout">cerrar sesión</a>
        </aside>

        <main class="form">
          {#if selSec}
            <fieldset class="box">
              <legend>Sección</legend>
              <div class="row">
                <label class="ico">Icono <input type="text" bind:value={sec.icon} /></label>
                <label class="grow">Nombre <input type="text" bind:value={sec.label} spellcheck="true" lang="es" /></label>
                <label class="pos">Pos <input type="text" bind:value={sec.position} /></label>
                <label class="chk"><input type="checkbox" bind:checked={sec.published} /> visible</label>
              </div>
              <div class="rowbtns">
                <button class="btn" onclick={saveSection} disabled={busy}>Guardar sección</button>
                <button class="btn del" onclick={delSection}>Borrar sección</button>
              </div>
            </fieldset>

            <fieldset class="box">
              <legend>{mode === 'change' ? '➕ Item nuevo (el actual se archiva)' : 'Item actual'}</legend>
              <label>Título <input type="text" bind:value={f.title} spellcheck="true" lang="es" /></label>
              <label>Subtítulo <input type="text" bind:value={f.sub} placeholder="(autor / artista…)" spellcheck="true" lang="es" /></label>
              <label>Link (opcional) <input type="text" bind:value={f.url} placeholder="https://…" /></label>
              <div class="media">
                <label class="mlabel">Imagen
                  <input type="file" accept="image/*" bind:this={fileInput} onchange={onFile} disabled={busy} />
                </label>
                {#if f.cover}<div class="cover"><img src={f.cover} alt="" /><button class="btn small" type="button" onclick={() => (f.cover = '')}>quitar</button></div>{/if}
              </div>
              <label>Descripción <textarea bind:value={f.description} rows="3" spellcheck="true" lang="es"></textarea></label>
              <label>Motivo del cambio (por qué) <input type="text" bind:value={note} placeholder="ej. terminé el libro…" spellcheck="true" lang="es" /></label>
              <div class="rowbtns">
                <button class="btn primary" onclick={saveItem} disabled={busy}>{mode === 'change' ? 'Crear item' : 'Guardar edición'}</button>
                {#if mode === 'change'}
                  <button class="btn" onclick={cancelChange}>cancelar</button>
                {:else}
                  <button class="btn" onclick={startChange}>Cambiar de item</button>
                {/if}
                <span class="status">{status}</span>
              </div>
            </fieldset>

            <fieldset class="box">
              <legend>Items de esta sección ({selSec.items.length})</legend>
              {#each selSec.items as it}
                <div class="trow">
                  <span class="tic">{it.cover ? '🖼' : '▤'}</span>
                  <span class="tt">{it.title || '(sin título)'}</span>
                  {#if it.current}
                    <span class="badge">actual · desde {fmtD(it.started_at)}</span>
                  {:else}
                    <span class="tm">{fmtD(it.started_at)}</span>
                    <button class="btn small" onclick={() => makeCurrent(it)}>volver a poner</button>
                  {/if}
                  <button class="btn small" onclick={() => delItem(it)}>borrar</button>
                </div>
              {/each}
            </fieldset>

            {#if mode === 'edit' && revs.length}
              <fieldset class="box">
                <legend>Ediciones del item actual ({revs.length})</legend>
                {#each revs as r}
                  <div class="rrow">
                    <span class="rt">{fmtTs(r.created_at)}</span>
                    <span class="rn">{r.note ?? '(sin motivo)'}</span>
                    <button class="btn small" onclick={() => restore(r)}>restaurar</button>
                  </div>
                {/each}
              </fieldset>
            {/if}
          {/if}
        </main>
      </div>
    </div>
  </div>

  <div class="taskbar"><button class="btn start">▣ Inicio</button><div class="tray">{clock}</div></div>
</div>

<style>
  .win { max-width: 1000px; margin: 0 auto; }
  .winbody { padding: 12px; }
  .ed { display: grid; grid-template-columns: 1fr; gap: 12px; }

  .side { display: flex; flex-direction: column; gap: 8px; }
  .new { width: 100%; font-weight: bold; }
  .list { display: flex; flex-direction: column; max-height: 50vh; overflow: auto; }
  .erow { display: flex; align-items: center; gap: 8px; background: transparent; border: none; border-bottom: 1px solid #e6e3db; color: #000; padding: 8px 9px; font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
  .erow:hover, .erow.on { background: #0a246a; color: #fff; }
  .erow .ic { flex: 0 0 auto; }
  .erow .t { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .erow .hdr { font-style: normal; font-size: 9px; background: #c8a000; color: #000; padding: 0 4px; border-radius: 2px; vertical-align: middle; }
  .erow:hover .hdr, .erow.on .hdr { background: #ffd84a; }
  .erow .m { color: #888; font-size: 11px; }
  .erow:hover .m, .erow.on .m { color: #c9d4ee; }
  .logout { color: #0a246a; font-size: 12px; }

  .form { display: flex; flex-direction: column; gap: 12px; }
  .box { border: 1px solid; border-color: #fff #808080 #808080 #fff; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; margin: 0; }
  .box legend { font-size: 12px; color: #222; padding: 0 4px; font-weight: bold; }
  .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; }
  .form label { flex: 1; min-width: 0; }
  .ico { flex: 0 0 70px; }
  .grow { flex: 3; }
  .pos { flex: 0 0 64px; }
  .chk { flex: 0 0 auto; flex-direction: row; align-items: center; gap: 6px; }
  .chk input { width: auto; }
  .rowbtns { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .del { color: #a00000; }
  .btn.small { padding: 2px 8px; font-size: 11px; }
  .status { font-size: 12px; color: #0a4a0a; }

  .media { display: flex; flex-direction: column; gap: 8px; border: 1px solid #808080; background: #cdc9c1; padding: 10px; }
  .mlabel { font-size: 12px; color: #222; }
  .cover { display: flex; align-items: center; gap: 10px; }
  .cover img { width: 64px; height: 64px; object-fit: contain; background: #fff; border: 2px solid; border-color: #808080 #fff #fff #808080; }

  .trow { display: flex; align-items: center; gap: 8px; font-size: 12px; border-bottom: 1px solid #e6e3db; padding: 5px 2px; }
  .trow .tic { flex: 0 0 auto; }
  .trow .tt { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .badge { background: #0a246a; color: #fff; font-size: 10px; padding: 2px 6px; flex: 0 0 auto; }
  .tm { color: #777; font-size: 11px; flex: 0 0 auto; }

  .rrow { display: flex; align-items: center; gap: 10px; font-size: 12px; border-bottom: 1px solid #e6e3db; padding: 5px 2px; }
  .rrow .rt { flex: 0 0 auto; min-width: 150px; }
  .rrow .rn { flex: 1; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .start { font-weight: bold; }

  @media (min-width: 820px) {
    .ed { grid-template-columns: 230px 1fr; align-items: start; }
    .list { max-height: 72vh; }
  }
</style>
