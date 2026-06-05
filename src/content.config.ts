import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Diario: entradas personales. Cada una puede tener una foto manuscrita
// (image) cuya transcripción vive en el cuerpo del .md.
const diario = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/diario' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(), // ruta explícita (override)
    exfile: z.coerce.number().int().min(1).max(16).optional(), // EX file 1–16 (default 1)
    mood: z.string().optional(),
  }),
});

// Blog: posts varios (misc, técnico, etc.). Lectura limpia.
const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    summary: z.string().optional(),
  }),
});

export const collections = { diario, blog };
