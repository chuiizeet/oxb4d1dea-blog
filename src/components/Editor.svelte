<script>
  import { onMount } from 'svelte';
  import { renderMarkdown } from '../lib/markdown.js';

  let { entries = [], moods = [], media = [] } = $props();

  const today = () => new Date().toISOString().slice(0, 10);
  const blank = () => ({
    id: null, type: 'diario', title: '', date: today(),
    mood: 'fine', exfile: 1, image: '', summary: '', tags: '', body: '', published: true,
    attachments: [],
  });

  let list = $state([...entries]);
  let f = $state(blank());
  let status = $state('');
  let saving = $state(false);
  let uploading = $state(false);
  let library = $state([...media]);
  let picked = $state(null);
  let revs = $state([]);
  let clock = $state('');

  let exNN = $derived(String(f.exfile).padStart(2, '0'));
  let bodyHtml = $derived(renderMarkdown(f.body || ''));
  let bodyEl;
  let showBig = $state(false);
  // Escape cierra el modal solo si Vim está OFF (con Vim, Escape = volver a modo normal)
  function onKey(e) { if (showBig && !vimOn && e.key === 'Escape') showBig = false; }

  function insertDate(el = bodyEl) {
    const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const mark = `\n\n@fecha: ${today}\n\n`;
    if (el && typeof el.selectionStart === 'number') {
      const i = el.selectionStart;
      f.body = f.body.slice(0, i) + mark + f.body.slice(i);
    } else {
      f.body += mark;
    }
  }

  // ── modo amplio: CodeMirror 6 + Vim (carga dinámica, solo en cliente) ──
  let cmEl = $state(null);
  let cmView = null;
  let vimOn = $state(false);
  let vimMode = $state('normal');
  let _vimComp = null;
  let _vimFn = null;
  let _creating = false;
  let _exDefined = false;
  let dark = $state(false);
  let _themeComp = null;
  let _darkTheme = null;

  async function createCM() {
    _creating = true;
    const [{ EditorView }, { Compartment }, { markdown }, vimmod, { basicSetup }] = await Promise.all([
      import('@codemirror/view'),
      import('@codemirror/state'),
      import('@codemirror/lang-markdown'),
      import('@replit/codemirror-vim'),
      import('codemirror'),
    ]);
    const { vim, Vim, getCM } = vimmod;
    _vimFn = vim;
    _vimComp = new Compartment();
    _themeComp = new Compartment();
    _darkTheme = EditorView.theme({
      '&': { color: '#e6e6e6', backgroundColor: '#1e1e1e' },
      '.cm-content': { caretColor: '#fff' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#fff' },
      '.cm-gutters': { backgroundColor: '#181818', color: '#6f6f6f', border: 'none' },
      '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.05)' },
      '.cm-activeLineGutter': { backgroundColor: 'rgba(255,255,255,0.08)' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: '#33415e' },
      '.cm-fat-cursor': { background: '#e6e6e6', color: '#1e1e1e' },
    }, { dark: true });
    if (!_exDefined) {
      // comandos ex tipo vim para guardar / salir del modal
      Vim.defineEx('quit', 'q', () => { showBig = false; });
      Vim.defineEx('write', 'w', () => { save(); });
      Vim.defineEx('wquit', 'wq', () => { save(); showBig = false; });
      Vim.defineEx('xit', 'x', () => { save(); showBig = false; });
      _exDefined = true;
    }
    cmView?.destroy();
    cmView = new EditorView({
      doc: f.body || '',
      parent: cmEl,
      extensions: [
        _vimComp.of(vimOn ? vim() : []),
        _themeComp.of(dark ? _darkTheme : []),
        basicSetup,
        markdown(),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ spellcheck: 'true', lang: 'es', autocapitalize: 'sentences' }),
        EditorView.updateListener.of((u) => { if (u.docChanged) f.body = u.state.doc.toString(); }),
      ],
    });
    const cm = getCM(cmView);
    if (cm) cm.on('vim-mode-change', (e) => { vimMode = e?.mode || 'normal'; });
    _creating = false;
    cmView.focus();
  }

  function toggleVim() {
    vimOn = !vimOn;
    vimMode = 'normal';
    try { localStorage.setItem('vim', vimOn ? '1' : '0'); } catch (e) {}
    // recrear el editor para que el listener de modo quede con vim activo
    if (showBig && cmEl) createCM();
  }

  function toggleDark() {
    dark = !dark;
    try { localStorage.setItem('editor-dark', dark ? '1' : '0'); } catch (e) {}
    if (cmView && _themeComp) cmView.dispatch({ effects: _themeComp.reconfigure(dark ? _darkTheme : []) });
  }

  function insertDateCM() {
    if (!cmView) return;
    const d = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const mark = `\n\n@fecha: ${d}\n\n`;
    const pos = cmView.state.selection.main.head;
    cmView.dispatch({ changes: { from: pos, insert: mark }, selection: { anchor: pos + mark.length } });
    cmView.focus();
  }

  $effect(() => {
    if (showBig && cmEl && !cmView && !_creating) createCM();
    else if (!showBig && cmView) { cmView.destroy(); cmView = null; }
  });

  onMount(() => {
    try { const v = localStorage.getItem('vim'); if (v !== null) vimOn = v === '1'; } catch (e) {}
    try { const d = localStorage.getItem('editor-dark'); if (d !== null) dark = d === '1'; } catch (e) {}
    const t = () => (clock = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    t();
    const i = setInterval(t, 10000);
    return () => clearInterval(i);
  });

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
      attachments: (e.attachments || []).map((a) => ({ url: a.url, caption: a.caption || '' })),
    };
    status = '';
    picked = null;
    loadRevs(e.id);
  }
  function nuevo() {
    f = blank();
    status = '';
    picked = null;
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
      attachments: f.attachments,
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
      const m = await res.json();
      library = [m, ...library];
      picked = m;
      status = '✓ subido — elige: insertar en el texto o usar de portada';
    } catch (e) {
      status = '✗ ' + e.message;
    }
    uploading = false;
    ev.target.value = '';
  }
  function insertUrl(m) {
    if (!m) return;
    f.body +=
      m.kind === 'video'
        ? `\n\n<video src="${m.url}" controls style="max-width:100%"></video>\n\n`
        : `\n\n![](${m.url})\n\n`;
  }
  function attach(m) {
    if (m) f.attachments = [...f.attachments, { url: m.url, caption: '' }];
  }
  function removeAtt(i) {
    f.attachments = f.attachments.filter((_, j) => j !== i);
  }

  function restore(rev) {
    if (!confirm('¿Restaurar esta versión? Reemplaza lo que tienes en el formulario (no se guarda hasta que des Guardar).')) return;
    const s = rev.snapshot || {};
    f = {
      ...f,
      type: s.type ?? f.type, title: s.title ?? f.title,
      date: (s.date || '').slice(0, 10) || f.date,
      mood: s.mood || 'fine', exfile: s.exfile ?? 1, image: s.image || '',
      summary: s.summary || '', tags: (s.tags || []).join(', '), body: s.body || '',
      attachments: (s.attachments || []).map((a) => ({ url: a.url, caption: a.caption || '' })),
    };
    status = 'restaurado (revisa y guarda para confirmar)';
  }
  const fmtTs = (t) => new Date(t).toLocaleString('es-ES');
</script>

<div class="w2k" class:dark={dark}>
  <div class="win">
    <div class="tb">
      <img class="ttlico" src="/win2k/editor.png" alt="" /><span class="ttl">EDITOR — diario &amp; blog</span>
      <span class="wbtns"><span class="wb">_</span><span class="wb">▢</span><a class="wb" href="/panel" aria-label="Cerrar">✕</a></span>
    </div>
    <div class="menubar"><span><u>A</u>rchivo</span><span><u>E</u>dición</span><span><u>V</u>er</span><span>A<u>y</u>uda</span><button class="darkbtn" type="button" onclick={toggleDark} title="Tema claro / oscuro">{dark ? '☀ Claro' : '🌙 Oscuro'}</button></div>

    <div class="winbody">
      <div class="ed">
        <aside class="side">
          <button class="btn new" onclick={nuevo}>+ Nueva entrada</button>
          <div class="entries sunken">
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

          <label>Título <input type="text" bind:value={f.title} placeholder="título" spellcheck="true" lang="es" /></label>

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
            <label>Resumen <input type="text" bind:value={f.summary} placeholder="resumen (blog)" spellcheck="true" lang="es" /></label>
          {/if}

          {#if f.attachments.length}
            <div class="atts">
              <span class="plabel">Imágenes adjuntas (galería tipo Polaroid en el diario)</span>
              {#each f.attachments as a, i}
                <div class="att">
                  <img class="attimg" src={a.url} alt="" />
                  <input class="attcap" type="text" placeholder="descripción (opcional)" bind:value={f.attachments[i].caption} />
                  <button class="btn small" type="button" onclick={() => removeAtt(i)}>quitar</button>
                </div>
              {/each}
            </div>
          {/if}

          <label>Tags <input type="text" bind:value={f.tags} placeholder="coma, separadas" /></label>

          <div class="media">
            <label class="mlabel">Media — subir foto/video
              <input type="file" accept="image/*,video/*,audio/*" onchange={onFile} disabled={uploading} />
            </label>
            {#if library.length}
              <div class="lib">
                {#each library as m}
                  <button class="libitem" class:on={picked === m} type="button" title={m.caption ?? ''} onclick={() => (picked = m)}>
                    {#if m.kind === 'video'}<video src={m.url} muted></video>{:else}<img src={m.url} alt="" />{/if}
                  </button>
                {/each}
              </div>
              {#if picked}
                <div class="picked">
                  <span class="mhint">seleccionada →</span>
                  <button class="btn" type="button" onclick={() => insertUrl(picked)}>Insertar en el texto</button>
                  {#if picked.kind === 'photo'}<button class="btn" type="button" onclick={() => attach(picked)}>Adjuntar a la entrada</button>{/if}
                </div>
              {:else}
                <div class="mhint">Tu media subida — haz click en una para usarla.</div>
              {/if}
            {/if}
          </div>

          <div class="bodywrap">
            <div class="bcol">
              <div class="blabel">
                <span>Cuerpo (markdown)</span>
                <span class="blabtns">
                  <button class="btn small" type="button" title="Escribir en grande" onclick={() => (showBig = true)}>⛶ Ampliar</button>
                  <button class="btn small" type="button" onclick={() => insertDate()}>📅 fecha de hoy</button>
                </span>
              </div>
              <textarea bind:this={bodyEl} bind:value={f.body} rows="14" placeholder="escribe aquí…" spellcheck="true" lang="es"></textarea>
            </div>
            <div class="bcol">
              <span class="plabel">Vista previa</span>
              <div class="prose sunken">{@html bodyHtml}</div>
            </div>
          </div>

          <div class="actions">
            <button class="btn primary" onclick={save} disabled={saving}>Guardar</button>
            {#if f.id}<button class="btn del" onclick={del}>Borrar</button>{/if}
            <span class="status">{status}</span>
          </div>

          {#if f.id && revs.length}
            <div class="revs">
              <div class="rh">Historial ({revs.length})</div>
              {#each revs as r}
                <div class="rrow">
                  <span class="rt">{fmtTs(r.created_at)}</span>
                  <span class="rn">{r.note ?? ''}</span>
                  <button class="btn small" type="button" onclick={() => restore(r)}>restaurar</button>
                </div>
              {/each}
            </div>
          {/if}
        </main>
      </div>
    </div>
  </div>

  <div class="taskbar"><button class="btn start"><img class="startico" src="/win2k/start.png" alt="" />Inicio</button><div class="tray">{clock}</div></div>

  {#if showBig}
    <div class="bigedit" role="dialog" aria-modal="true">
      <div class="bigbar">
        <span class="bigttl">✎ Cuerpo — modo amplio</span>
        {#if vimOn}
          <span class="vimmode" data-mode={vimMode}>{vimMode.toUpperCase()}</span>
          <span class="vimhint">:w guarda · :q sale</span>
        {/if}
        <button class="btn small" type="button" class:vimon={vimOn} onclick={toggleVim} title="Modo Vim">Vim: {vimOn ? 'ON' : 'OFF'}</button>
        <button class="btn small" type="button" onclick={toggleDark} title="Tema claro / oscuro">{dark ? '☀' : '🌙'}</button>
        <button class="btn small" type="button" onclick={insertDateCM}>📅 fecha de hoy</button>
        <button class="btn primary" type="button" onclick={() => (showBig = false)}>✓ Listo</button>
      </div>
      <div class="bigwrap">
        <div class="cm" bind:this={cmEl}></div>
        <div class="prose sunken bigprose">{@html bodyHtml}</div>
      </div>
    </div>
  {/if}
</div>

<svelte:window onkeydown={onKey} />

<style>
  .win { max-width: 1100px; margin: 0 auto; }
  .winbody { padding: 12px; }
  .ed { display: grid; grid-template-columns: 1fr; gap: 12px; }

  .side { display: flex; flex-direction: column; gap: 8px; }
  .new { width: 100%; font-weight: bold; }
  .entries { display: flex; flex-direction: column; max-height: 40vh; overflow: auto; }
  .erow {
    display: flex; justify-content: space-between; gap: 8px; align-items: baseline;
    background: transparent; border: none; border-bottom: 1px solid #e6e3db; color: #000;
    padding: 7px 9px; font: inherit; font-size: 13px; text-align: left; cursor: pointer;
  }
  .erow:hover, .erow.on { background: #0a246a; color: #fff; }
  .erow .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .erow .m { color: #666; font-size: 11px; }
  .erow:hover .m, .erow.on .m { color: #c9d4ee; }
  .logout { color: #0a246a; font-size: 12px; }

  .form { display: flex; flex-direction: column; gap: 12px; }
  .row { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; }
  .form label { flex: 1; min-width: 0; }
  .chk { flex: 0 0 auto; flex-direction: row; align-items: center; gap: 6px; }
  .chk input { width: auto; }
  .exprev { width: 52px; height: 52px; object-fit: cover; flex: 0 0 auto; border: 2px solid; border-color: #808080 #fff #fff #808080; }

  .media { display: flex; flex-direction: column; gap: 8px; border: 1px solid #808080; background: #cdc9c1; padding: 10px; }
  .mlabel { font-size: 12px; color: #222; }
  .lib { display: flex; flex-wrap: wrap; gap: 6px; }
  .libitem { width: 60px; height: 60px; padding: 0; cursor: pointer; background: #fff; overflow: hidden; border: 2px solid; border-color: #808080 #fff #fff #808080; }
  .libitem.on { border: 2px solid #0a246a; }
  .libitem img, .libitem video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .picked { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .mhint { font-size: 12px; color: #444; }
  .atts { display: flex; flex-direction: column; gap: 6px; }
  .att { display: flex; align-items: center; gap: 10px; }
  .attimg { width: 48px; height: 48px; object-fit: cover; flex: 0 0 auto; border: 2px solid; border-color: #808080 #fff #fff #808080; }
  .attcap { flex: 1; min-width: 0; }

  .bodywrap { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: stretch; }
  .bcol { display: flex; flex-direction: column; gap: 4px; }
  .plabel { font-size: 12px; color: #222; }
  .blabel { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; color: #222; }
  .blabtns { display: flex; gap: 6px; }

  /* modal "modo amplio" para escribir el cuerpo a gusto */
  .bigedit { position: fixed; inset: 0; z-index: 300; background: var(--face); display: flex; flex-direction: column; gap: 8px; padding: 10px; }
  .bigbar { display: flex; align-items: center; gap: 10px; }
  .bigttl { flex: 1; font-weight: bold; font-size: 14px; color: #222; }
  .bigwrap { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; gap: 10px; }
  .bigwrap textarea { width: 100%; height: 100%; resize: none; font-size: 15px; }
  .bigedit .bigprose { height: 100%; max-height: none; min-height: 0; overflow: auto; }
  .cm { height: 100%; min-height: 0; overflow: hidden; background: #fff; border: 2px solid; border-color: var(--sh) var(--hl) var(--hl) var(--sh); }
  .cm :global(.cm-editor) { height: 100%; }
  .cm :global(.cm-editor.cm-focused) { outline: none; }
  .cm :global(.cm-scroller) { font-family: ui-monospace, 'Courier New', monospace; font-size: 15px; line-height: 1.6; }
  .btn.vimon { border-color: var(--dk) var(--hl) var(--hl) var(--dk); box-shadow: inset 1px 1px 0 var(--sh); font-weight: bold; }
  .vimmode { font-weight: bold; font-size: 12px; letter-spacing: 0.12em; padding: 3px 10px; background: #0a246a; color: #fff; }
  .vimmode[data-mode='insert'] { background: #0a7a0a; }
  .vimmode[data-mode='visual'] { background: #9a5a00; }
  .vimmode[data-mode='replace'] { background: #9a0000; }
  .vimhint { font-size: 11px; color: #555; }
  @media (max-width: 760px) {
    .bigwrap { grid-template-columns: 1fr; }
    .bigprose { display: none; }
  }
  .prose {
    color: #111; padding: 12px 14px; min-height: 320px; max-height: 60vh; overflow: auto; line-height: 1.6; font-size: 14px;
  }
  .prose :global(h1), .prose :global(h2), .prose :global(h3) { color: #0a246a; margin: 0.7em 0 0.3em; line-height: 1.3; }
  .prose :global(p) { margin: 0 0 0.8em; }
  .prose :global(img), .prose :global(video) { max-width: 100%; height: auto; display: block; margin: 8px 0; }
  .prose :global(a) { color: #0a4ac0; }
  .prose :global(ul), .prose :global(ol) { margin: 0 0 0.8em; padding-left: 1.4em; }
  .prose :global(hr) { border: none; border-top: 1px dashed #aaa; margin: 14px 0; }
  .prose :global(code) { background: #eee; padding: 1px 5px; border-radius: 2px; }
  .prose :global(blockquote) { border-left: 3px solid #ccc; margin: 0 0 0.8em; padding-left: 10px; color: #555; }
  .prose :global(:first-child) { margin-top: 0; }
  .prose :global(.datemark) { text-align: center; color: #8a7f63; font-style: italic; font-size: 0.85em; letter-spacing: 0.08em; margin: 1.4em 0; }

  .actions { display: flex; align-items: center; gap: 12px; margin-top: 4px; flex-wrap: wrap; }
  .del { color: #a00000; }
  .btn.small { padding: 2px 8px; font-size: 11px; }
  .status { font-size: 12px; color: #0a4a0a; }

  .revs { border-top: 1px solid #808080; margin-top: 8px; padding-top: 10px; display: flex; flex-direction: column; gap: 4px; }
  .rh { color: #444; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; }
  .rrow { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #333; }
  .rrow .rt { min-width: 160px; }
  .rrow .rn { flex: 1; color: #666; }

  /* botón de tema (menubar) */
  .darkbtn { margin-left: auto; background: transparent; border: none; font: inherit; font-size: 12px; cursor: pointer; color: inherit; padding: 0 2px; }
  .darkbtn:hover { text-decoration: underline; }

  /* ---- dark mode: superficies blancas del editor ---- */
  :global(.w2k.dark) .erow { color: #e2e2e2; border-bottom-color: #333; }
  :global(.w2k.dark) .erow .m { color: #8f8f8f; }
  :global(.w2k.dark) .media { background: #2a2a2a; }
  :global(.w2k.dark) .libitem { background: #1e1e1e; }
  :global(.w2k.dark) .mlabel,
  :global(.w2k.dark) .plabel,
  :global(.w2k.dark) .blabel,
  :global(.w2k.dark) .mhint,
  :global(.w2k.dark) .rh,
  :global(.w2k.dark) .rrow { color: #c2c2c2; }
  :global(.w2k.dark) .rrow .rn { color: #8f8f8f; }
  :global(.w2k.dark) .bigttl { color: #e6e6e6; }
  :global(.w2k.dark) .vimhint { color: #9a9a9a; }
  :global(.w2k.dark) .status { color: #6fd06f; }
  :global(.w2k.dark) .del { color: #ff6b6b; }
  :global(.w2k.dark) .cm { background: #1e1e1e; }
  :global(.w2k.dark) .prose { color: #dcdcdc; }
  :global(.w2k.dark) .prose :global(h1),
  :global(.w2k.dark) .prose :global(h2),
  :global(.w2k.dark) .prose :global(h3) { color: #84acec; }
  :global(.w2k.dark) .prose :global(a) { color: #6fb0ff; }
  :global(.w2k.dark) .prose :global(code) { background: #333; }
  :global(.w2k.dark) .prose :global(blockquote) { border-left-color: #555; color: #aaa; }

  .start { font-weight: bold; }

  @media (min-width: 820px) {
    .ed { grid-template-columns: 250px 1fr; align-items: start; }
    .entries { max-height: 64vh; }
  }
  @media (max-width: 720px) {
    .bodywrap { grid-template-columns: 1fr; }
  }
</style>
