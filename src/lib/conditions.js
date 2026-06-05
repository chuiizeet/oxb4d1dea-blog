// Estados tipo RE2 + estados de ánimo propios. Cada uno: color, velocidad y
// forma de onda del ECG (pathLength=100 normaliza el "dibujado" de la línea).
export const CONDITIONS = {
  fine:    { label: 'FINE',    color: '#4cf05c', dur: 2.4, points: '0,22 58,22 70,22 78,9 86,35 94,22 128,22 136,9 144,35 152,22 200,22' },
  caution: { label: 'CAUTION', color: '#ffd23c', dur: 1.8, points: '0,22 40,22 48,12 54,30 60,16 66,26 72,22 110,22 120,10 126,32 132,18 138,24 144,22 200,22' },
  danger:  { label: 'DANGER',  color: '#ff4a3d', dur: 1.1, points: '0,22 26,22 32,5 38,39 44,8 50,38 56,22 88,22 94,6 100,40 106,9 112,37 118,22 158,22 166,8 174,36 182,22 200,22' },
  poison:  { label: 'POISON',  color: '#b06cff', dur: 2.6, points: '0,22 20,14 40,30 60,12 80,32 100,14 120,30 140,12 160,32 180,16 200,22' },
  sadness: { label: 'SADNESS', color: '#5a93d6', dur: 3.8, points: '0,24 56,24 86,24 96,28 106,22 116,27 128,24 160,25 200,26' },
  tired:   { label: 'TIRED',   color: '#45cdff', dur: 3.2, points: '0,23 70,23 82,18 90,27 98,23 150,23 162,19 170,26 178,23 200,23' },
  hyped:   { label: 'HYPED',   color: '#ffae3c', dur: 0.95, points: '0,22 24,22 30,7 36,37 42,11 48,33 54,22 78,22 84,7 90,37 96,11 102,33 108,22 132,22 138,7 144,37 150,22 200,22' },
  calm:    { label: 'CALM',    color: '#44e0d0', dur: 3.0, points: '0,22 30,20 60,24 90,20 120,24 150,20 180,24 200,22' },
};

// mood en texto (español/inglés) -> id de condition
export const MOOD_ALIAS = {
  sad: 'sadness', triste: 'sadness',
  tired: 'tired', cansado: 'tired',
  calm: 'calm', tranquilo: 'calm', calmado: 'calm',
  fine: 'fine', bien: 'fine',
  hyped: 'hyped', feliz: 'hyped', emocionado: 'hyped',
  poison: 'poison', enfermo: 'poison',
  caution: 'caution', alerta: 'caution',
  danger: 'danger', mal: 'danger',
};

export function moodToCondition(mood) {
  const m = (mood ?? '').toString().toLowerCase().trim();
  return MOOD_ALIAS[m] ?? m;
}

export function moodColor(mood) {
  const id = moodToCondition(mood);
  return (CONDITIONS[id] ?? CONDITIONS.fine).color;
}
