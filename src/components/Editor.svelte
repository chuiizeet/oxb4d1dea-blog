<script>
  let { entries = [], moods = [] } = $props();

  const today = () => new Date().toISOString().slice(0, 10);
  const blank = () => ({
    id: null, type: 'diario', title: '', date: today(),
    mood: 'fine', exfile: 1, image: '', summary: '', tags: '', body: '', published: true,
  });

  let list = $state([...entries]);
  let f = $state(blank());
  let status = $state('');
  let saving = $state(false);
  let uploading = $state(false);
  let lastUpload = $state(null);
  let revs = $state([]);

  let exNN = $derived(String(f.exfile).padStart(2, '0'));

  async function loadRevs(id) {
    revs = [];
    if (!id) return;
    try {
      const res = await fetch('/api/revisions?entryId=' + id);
      if (res.ok) revs = await res.json();
    } catch {}
  }

  function loadEntry(e) {
    f = {
      id: e.id, type: e.type, title: e.title, date: e.date,
      mood: e.mood || 'fine', exfile: e.exfile ?? 1, image: e.image || '',
      summary: e.summary || '', tags: (e.tags || []).join(', '), body: e.body || '',
      published: e.published,
    };
    status = '';
    lastUpload = null;
    loadRevs(e.id);
  }
  function nuevo() {
    f = blank();
    status = '';
    lastUpload = null;
    revs = [];
  }

  async function save() {
    if (!f.title.trim()) { status = '✗ falta el título'; return; }
    saving = true; status = 'guardando…';
    const payload = {
      id: f.id, type: f.type, title: f.title.trim(), date: f.date,
      mood: f.type === 'diario' ? f.mood : null,
      exfile: f.type === 'diario' ? Number(f.exfile) : null,
      image: f.image || null,
      summary: f.type === 'blog' ? f.summary : null,
      tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
      body: f.body, published: f.published,
    };
    try {
      const res = await fetch('/api/save-entry', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) { status = '✗ ' + (await res.text()); saving = false; return; }
      const saved = await res.json();
      f.id = saved.id;
      const item = {
        id: saved.id, type: saved.type, slug: saved.slug, title: payload.title, body: payload.body,
        mood: payload.mood || '', exfile: payload.exfile, image: payload.image || '',
        summary: payload.summary || '', tags: payload.tags, published: payload.published, date: f.date,
      };
      const idx = list.findIndex((x) => x.id === saved.id);
      if (idx >= 0) list[idx] = item; else list = [item, ...list];
      status = `✓ guardado (${saved.type}/${saved.slug})`;
      loadRevs(saved.id);
    } catch (e) {
      status = '✗ ' + e.message;
    }
    saving = false;
  }

  async function del() {
    if (!f.id) return;
    if (!confirm('¿Borrar esta entrada? No se puede deshacer.')) return;
    try {
      const res = await fetch('/api/delete-entry', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: f.id }),
      });
      if (!res.ok) { status = '✗ ' + (await res.text()); return; }
      list = list.filter((x) => x.id !== f.id);
      nuevo();
      status = 'entrada borrada';
    } catch (e) {
      status = '✗ ' + e.message;
    }
  }

  async function onFile(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    uploading = true; status = 'subiendo…';
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) { status = '✗ ' + (await res.text()); uploading = false; return; }
      lastUpload = await res.json();
      status = '✓ subido';
    } catch (e) {
      status = '✗ ' + e.message;
    }
    uploading = false;
    ev.target.value = '';
  }
  function insertMedia() {
    if (!lastUpload) return;
    f.body +=
      lastUpload.kind === 'video'
        ? `\n\n<video src="${lastUpload.url}" controls style="max-width:100%"></video>\n\n`
        : `\n\n![](${lastUpload.url})\n\n`;
  }
  function useAsImage() {
    if (lastUpload) f.image = lastUpload.url;
  }

  function restore(rev) {
    const s = rev.snapshot || {};
    f = {
      ...f,
      type: s.type ?? f.type, title: s.title ?? f.title,
      date: (s.date || '').slice(0, 10) || f.date,
      mood: s.mood || 'fine', exfile: s.exfile ?? 1, image: s.image || '',
      summary: s.summary || '', tags: (s.tags || []).join(', '), body: s.body || '',
    };
    status = 'restaurado (revisa y guarda para confirmar)';
  }
  const fmtTs = (t) => new Date(t).toLocaleString('es-ES');
</script>

<div class="ed">
  <aside class="side">
    <button class="new" onclick={nuevo}>+ NUEVA</button>
    <div class="entries">
      {#each list as e}
        <button class="erow" class:on={f.id === e.id} onclick={() => loadEntry(e)}>
          <span class="t">{e.title || '(sin título)'}</span>
          <span class="m">{e.type}{e.published ? '' : ' · borrador'}</span>
        </button>
      {/each}
    </div>
    <a class="logout" href="/logout">cerrar sesión</a>
  </aside>

  <main class="form">
    <div class="row">
      <label>Tipo
        <select bind:value={f.type}>
          <option value="diario">diario</option>
          <option value="blog">blog</option>
        </select>
      </label>
      <label>Fecha <input type="date" bind:value={f.date} /></label>
      <label class="chk"><input type="checkbox" bind:checked={f.published} /> publicado</label>
    </div>

    <label>Título <input type="text" bind:value={f.title} placeholder="título" /></label>

    {#if f.type === 'diario'}
      <div class="row">
        <label>Mood
          <select bind:value={f.mood}>
            {#each moods as m}<option value={m.id}>{m.label}</option>{/each}
          </select>
        </label>
        <label>EX file
          <select bind:value={f.exfile}>
            {#each Array.from({ length: 16 }) as _, i}
              <option value={i + 1}>{String(i + 1).padStart(2, '0')}</option>
            {/each}
          </select>
        </label>
        <img class="exprev" src={`/exfiles/${exNN}.png`} alt="" />
      </div>
    {:else}
      <label>Resumen <input type="text" bind:value={f.summary} placeholder="resumen (blog)" /></label>
    {/if}

    <label>Tags <input type="text" bind:value={f.tags} placeholder="coma, separadas" /></label>

    <!-- media -->
    <div class="media">
      <label class="mlabel">Media (foto/video)
        <input type="file" accept="image/*,video/*,audio/*" onchange={onFile} disabled={uploading} />
      </label>
      {#if lastUpload}
        <div class="mprev">
          {#if lastUpload.kind === 'video'}
            <video src={lastUpload.url} muted></video>
          {:else}
            <img src={lastUpload.url} alt="" />
          {/if}
          <button type="button" onclick={insertMedia}>insertar en cuerpo</button>
          {#if lastUpload.kind === 'photo'}<button type="button" onclick={useAsImage}>usar de portada</button>{/if}
        </div>
      {/if}
    </div>

    <label>Cuerpo (markdown)
      <textarea bind:value={f.body} rows="12" placeholder="escribe aquí…"></textarea>
    </label>

    <div class="actions">
      <button class="save" onclick={save} disabled={saving}>GUARDAR</button>
      {#if f.id}<button class="del" onclick={del}>borrar</button>{/if}
      <span class="status">{status}</span>
    </div>

    {#if f.id && revs.length}
      <div class="revs">
        <div class="rh">Historial ({revs.length})</div>
        {#each revs as r}
          <div class="rrow">
            <span class="rt">{fmtTs(r.created_at)}</span>
            <span class="rn">{r.note ?? ''}</span>
            <button type="button" onclick={() => restore(r)}>restaurar</button>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<style>
  .ed {
    min-height: 100dvh;
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    padding: clamp(12px, 3vw, 24px);
    background: radial-gradient(120% 90% at 50% 0%, #14110d, #060504);
    color: #e7e2d4;
    font-family: ui-monospace, 'SF Mono', 'Courier New', monospace;
  }
  .side { display: flex; flex-direction: column; gap: 8px; }
  .new { background: transparent; border: 1px solid #3a3122; color: #c89b5a; padding: 8px; font: inherit; letter-spacing: 0.1em; cursor: pointer; }
  .entries { display: flex; flex-direction: column; gap: 4px; max-height: 30vh; overflow: auto; }
  .erow { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; background: #16110b; border: 1px solid #211d18; color: #d9d2c4; padding: 8px 10px; font: inherit; text-align: left; cursor: pointer; }
  .erow.on { border-color: #c89b5a; }
  .erow .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .erow .m { color: #8c8475; font-size: 11px; }
  .logout { color: #8c8475; font-size: 12px; text-decoration: underline; }

  .form { display: flex; flex-direction: column; gap: 12px; }
  .row { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; }
  label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #b7ae9a; letter-spacing: 0.06em; flex: 1; min-width: 0; }
  .chk { flex-direction: row; align-items: center; gap: 6px; flex: 0 0 auto; }
  input[type='text'], input[type='date'], select, textarea {
    background: #100c08; border: 1px solid #3a3122; color: #ece5d2; padding: 9px 10px; font: inherit; width: 100%;
  }
  textarea { resize: vertical; line-height: 1.5; }
  .exprev { width: 52px; height: 52px; object-fit: cover; border: 1px solid #211d18; background: #0c1430; flex: 0 0 auto; }

  .media { display: flex; flex-direction: column; gap: 8px; border: 1px dashed #3a3122; padding: 10px; }
  .mlabel input[type='file'] { color: #b7ae9a; }
  .mprev { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .mprev img, .mprev video { width: 80px; height: 80px; object-fit: cover; border: 1px solid #211d18; }
  .mprev button, .del { background: transparent; border: 1px solid #3a3122; color: #c89b5a; padding: 5px 10px; font: inherit; cursor: pointer; }

  .actions { display: flex; align-items: center; gap: 14px; margin-top: 4px; }
  .save { background: #1f7a45; border: 1px solid #46f08a; color: #eafff0; padding: 10px 22px; font: inherit; letter-spacing: 0.12em; cursor: pointer; }
  .save:disabled { opacity: 0.5; cursor: default; }
  .del { color: #ff7a6a; border-color: #5a2a24; }
  .status { font-size: 13px; color: #9dffc1; }

  .revs { border-top: 1px solid #211d18; margin-top: 8px; padding-top: 10px; display: flex; flex-direction: column; gap: 4px; }
  .rh { color: #8c8475; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; }
  .rrow { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #b7ae9a; }
  .rrow .rt { min-width: 160px; }
  .rrow .rn { flex: 1; color: #8c8475; }
  .rrow button { background: transparent; border: 1px solid #3a3122; color: #c89b5a; padding: 3px 8px; font: inherit; font-size: 11px; cursor: pointer; }

  @media (min-width: 820px) {
    .ed { grid-template-columns: 260px 1fr; align-items: start; }
    .entries { max-height: 70vh; }
  }
</style>
