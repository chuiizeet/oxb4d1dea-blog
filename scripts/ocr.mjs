// OCR de imágenes manuscritas con Claude (visión).
//
// Uso:
//   npm run ocr -- <ruta-imagen> [salida.md]
//
// Necesita la variable de entorno ANTHROPIC_API_KEY.
// Devuelve una transcripción APROXIMADA: revísala y corrígela a mano.
//
// Modelo por defecto: claude-opus-4-8. Para usar uno más barato:
//   OCR_MODEL=claude-sonnet-4-6 npm run ocr -- foto.jpg

import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const imgPath = process.argv[2];
const outPath = process.argv[3];

if (!imgPath) {
  console.error('Uso: npm run ocr -- <ruta-imagen> [salida.md]');
  process.exit(1);
}

const MEDIA = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

const ext = path.extname(imgPath).toLowerCase().slice(1);
const mediaType = MEDIA[ext];
if (!mediaType) {
  console.error(`Formato no soportado: .${ext} (usa jpg, png, webp o gif)`);
  process.exit(1);
}

const data = (await readFile(imgPath)).toString('base64');

const client = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno

const res = await client.messages.create({
  model: process.env.OCR_MODEL || 'claude-opus-4-8',
  max_tokens: 4000,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
        {
          type: 'text',
          text:
            'Transcribe el texto manuscrito de esta imagen de un diario personal, en español. ' +
            'Devuelve SOLO la transcripción en texto plano, conservando los saltos de párrafo. ' +
            'Si una palabra es ilegible, escríbela como [ilegible]. No añadas comentarios.',
        },
      ],
    },
  ],
});

const text = res.content
  .filter((b) => b.type === 'text')
  .map((b) => b.text)
  .join('\n')
  .trim();

if (outPath) {
  await writeFile(outPath, text + '\n');
  console.error(`✓ Transcripción (borrador) escrita en ${outPath} — revísala y corrígela.`);
} else {
  console.log(text);
}
