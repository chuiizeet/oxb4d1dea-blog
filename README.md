# 0xb4d1dea

Blog personal con Astro + Svelte. Diario (estilo visor de archivos de Resident
Evil clásico) y posts varios.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:4321
```

## Escribir

- **Diario:** crea un `.md` en `src/content/diario/`. Si tienes foto manuscrita,
  ponla en `public/diario/` y referénciala con `image:` en el frontmatter.
- **Blog:** crea un `.md` en `src/content/blog/`.

Frontmatter del diario:

```yaml
---
title: Mi día
date: 2026-06-04
tags: [diario]
image: /diario/mi-dia.jpg   # opcional
mood: cansado               # opcional
---
La transcripción / texto va aquí.
```

## OCR del diario (transcripción aproximada)

```bash
cp .env.example .env        # pon tu ANTHROPIC_API_KEY
npm run ocr -- public/diario/mi-dia.jpg
# o escribe el borrador a un archivo:
npm run ocr -- public/diario/mi-dia.jpg src/content/diario/mi-dia.md
```

Genera un borrador con Claude; revísalo y corrígelo en el `.md`.

## Build / deploy

```bash
npm run build      # genera dist/ (estático)
```

Despliega `dist/` en cualquier hosting estático (DigitalOcean App Platform como
"Static Site", Netlify, Cloudflare Pages…). El OCR corre en local, así que la
API key nunca llega al hosting.
