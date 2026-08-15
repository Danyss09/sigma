// Convierte un monto (ej. 1234.56) a texto en español para planillas,
// formato "MIL DOSCIENTOS TREINTA Y CUATRO DÓLARES 56/100".

const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DIECIS = [
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
  'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
];
const DECENAS = [
  '', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA',
  'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA',
];
const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
];

function convertirGrupo(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  let texto = '';
  const centena = Math.floor(n / 100);
  const resto = n % 100;

  if (centena > 0) texto += CENTENAS[centena] + ' ';

  if (resto >= 10 && resto < 20) {
    texto += DIECIS[resto - 10];
  } else {
    const decena = Math.floor(resto / 10);
    const unidad = resto % 10;
    if (decena > 0) {
      texto += DECENAS[decena];
      if (unidad > 0) texto += ' Y ' + UNIDADES[unidad];
    } else if (unidad > 0) {
      texto += UNIDADES[unidad];
    }
  }

  return texto.trim();
}

function enterosATexto(n: number): string {
  if (n === 0) return 'CERO';

  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;

  const partes: string[] = [];
  if (millones > 0) {
    partes.push(millones === 1 ? 'UN MILLÓN' : `${convertirGrupo(millones)} MILLONES`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'MIL' : `${convertirGrupo(miles)} MIL`);
  }
  if (resto > 0) {
    partes.push(convertirGrupo(resto));
  }

  return partes.join(' ').trim();
}

export function montoALetras(monto: number): string {
  const redondeado = Math.round(monto * 100) / 100;
  const parteEntera = Math.floor(redondeado);
  const centavos = Math.round((redondeado - parteEntera) * 100);
  const centavosTexto = String(centavos).padStart(2, '0');

  const enterosTexto = enterosATexto(parteEntera);
  const capitalizado =
    enterosTexto.charAt(0) + enterosTexto.slice(1).toLowerCase();

  return `${capitalizado} Dólares ${centavosTexto}/100`;
}
