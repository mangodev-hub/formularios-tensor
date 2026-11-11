import { calcularEdad, formatearFecha, formatearUSD, iniciales, textoExperiencia } from './formato';

describe('formato', () => {
  it('formatearFecha usa español y no corre el día por UTC', () => {
    expect(formatearFecha('2000-04-15')).toBe('15 de abril de 2000');
    expect(formatearFecha('2000-04-15T00:00:00')).toBe('15 de abril de 2000');
    expect(formatearFecha(null)).toBe('');
  });

  it('calcularEdad respeta si ya pasó el cumpleaños', () => {
    const hoy = new Date(2026, 10, 11); // 11 nov 2026
    expect(calcularEdad('2000-04-15', hoy)).toBe(26);
    expect(calcularEdad('2000-11-11', hoy)).toBe(26);
    expect(calcularEdad('2000-11-12', hoy)).toBe(25);
    expect(calcularEdad('', hoy)).toBeNull();
  });

  it('formatearUSD muestra el símbolo de dólar', () => {
    expect(formatearUSD(1200)).toContain('$');
    expect(formatearUSD(1200)).toMatch(/1[.,\s]?200$/); // sin decimales si es entero
    expect(formatearUSD(1200.5)).toMatch(/50$/);
  });

  it('iniciales toma la primera y la última palabra', () => {
    expect(iniciales('Ana María Pérez')).toBe('AP');
    expect(iniciales('  luis  ')).toBe('L');
    expect(iniciales('')).toBe('?');
  });

  it('textoExperiencia usa singular y plural', () => {
    expect(textoExperiencia(0)).toBe('Sin experiencia');
    expect(textoExperiencia(1)).toBe('1 año');
    expect(textoExperiencia(3)).toBe('3 años');
  });
});
