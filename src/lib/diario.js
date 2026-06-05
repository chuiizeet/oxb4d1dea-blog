// Resuelve la imagen de una entrada del diario.
// Prioridad: image explícita > exfile por número (1–16) > default 01.
export function diarioImage(data) {
  if (data?.image) return data.image;
  const n = Math.min(16, Math.max(1, Math.round(data?.exfile ?? 1)));
  return `/exfiles/${String(n).padStart(2, '0')}.png`;
}
