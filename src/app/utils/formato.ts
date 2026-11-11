/** Utilidades de presentación (solo formato, sin lógica de negocio). */

const LOCALE = 'es-EC';

/** `2000-04-15` (o `2000-04-15T00:00:00`) → `15 de abril de 2000`. Usa la fecha local para no correr el día por UTC. */
export function formatearFecha(valor: string | null | undefined): string {
  const partes = aPartes(valor);
  if (!partes) return '';
  const [anio, mes, dia] = partes;
  return new Date(anio, mes - 1, dia).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** `Date` → `11 nov 2026, 15:28`. */
export function formatearFechaHora(fecha: Date | null | undefined): string {
  if (!fecha) return 'Pendiente';
  return fecha.toLocaleString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** `1200` → `$1.200`; `1200.5` → `$1.200,50`. */
export function formatearUSD(valor: number): string {
  const decimales = Number.isInteger(valor) ? 0 : 2;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}

/** Años cumplidos a la fecha `hoy` (por defecto, hoy). */
export function calcularEdad(fechaNacimiento: string, hoy: Date = new Date()): number | null {
  const partes = aPartes(fechaNacimiento);
  if (!partes) return null;
  const [anio, mes, dia] = partes;
  let edad = hoy.getFullYear() - anio;
  const yaCumplio = hoy.getMonth() + 1 > mes || (hoy.getMonth() + 1 === mes && hoy.getDate() >= dia);
  if (!yaCumplio) edad--;
  return edad;
}

/** `Ana María Pérez` → `AP` (primera y última palabra). */
export function iniciales(nombres: string): string {
  const palabras = nombres.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '?';
  const primera = palabras[0][0];
  const ultima = palabras.length > 1 ? palabras[palabras.length - 1][0] : '';
  return (primera + ultima).toUpperCase();
}

/** `1` → `1 año`, `3` → `3 años`, `0` → `Sin experiencia`. */
export function textoExperiencia(anios: number): string {
  if (anios === 0) return 'Sin experiencia';
  return `${anios} ${anios === 1 ? 'año' : 'años'}`;
}

function aPartes(valor: string | null | undefined): [number, number, number] | null {
  const [anio, mes, dia] = (valor ?? '').slice(0, 10).split('-').map(Number);
  return anio && mes && dia ? [anio, mes, dia] : null;
}
