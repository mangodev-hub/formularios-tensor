import { FormControl } from '@angular/forms';

import {
  correoValido,
  edadMinima,
  enteroEnRango,
  fechaNoAnteriorAHoy,
  fechaNoFutura,
  hoyISO,
  mayorQue,
  mensajeError,
  minimoSeleccionados,
  minimoTexto,
  telefonoValido,
} from './candidato.validators';

const HOY = () => '2026-11-11';

describe('validadores de candidato', () => {
  it('hoyISO usa la fecha local con ceros a la izquierda', () => {
    expect(hoyISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('fechaNoFutura rechaza mañana y acepta hoy y el pasado', () => {
    const v = fechaNoFutura(HOY);
    expect(v(new FormControl('2026-11-12'))).toEqual({ fechaFutura: true });
    expect(v(new FormControl('2026-11-11T00:00:00'))).toBeNull();
    expect(v(new FormControl('2000-04-15'))).toBeNull();
    expect(v(new FormControl(null))).toBeNull();
  });

  it('edadMinima(18) exige 18 años cumplidos a la fecha de hoy', () => {
    const v = edadMinima(18, HOY);
    expect(v(new FormControl('2008-11-11'))).toBeNull(); // cumple 18 hoy
    expect(v(new FormControl('2008-11-12'))).toEqual({ edadMinima: { anios: 18 } }); // los cumple mañana
    expect(v(new FormControl('2026-11-11'))).toEqual({ edadMinima: { anios: 18 } });
    expect(mensajeError({ edadMinima: { anios: 18 } })).toBe('Debes tener al menos 18 años.');
  });

  it('fechaNoAnteriorAHoy rechaza ayer y acepta hoy y el futuro', () => {
    const v = fechaNoAnteriorAHoy(HOY);
    expect(v(new FormControl('2026-11-10'))).toEqual({ fechaPasada: true });
    expect(v(new FormControl('2026-11-11'))).toBeNull();
    expect(v(new FormControl('2026-12-01T00:00:00'))).toBeNull();
  });

  it('minimoTexto ignora los espacios al inicio y al final', () => {
    const v = minimoTexto(3);
    expect(v(new FormControl('  ab  '))).toEqual({ minimoTexto: { requerido: 3, actual: 2 } });
    expect(v(new FormControl('Ana'))).toBeNull();
    expect(v(new FormControl('   '))).toBeNull(); // vacío: lo reporta Validators.required
  });

  it('enteroEnRango valida entero entre 0 y 50', () => {
    const v = enteroEnRango(0, 50);
    expect(v(new FormControl(0))).toBeNull();
    expect(v(new FormControl('50'))).toBeNull();
    expect(v(new FormControl(51))).toEqual({ rango: { min: 0, max: 50 } });
    expect(v(new FormControl(-1))).toEqual({ rango: { min: 0, max: 50 } });
    expect(v(new FormControl(2.5))).toEqual({ noEntero: true });
    expect(v(new FormControl('abc'))).toEqual({ noNumero: true });
  });

  it('mayorQue(0) rechaza 0 y negativos', () => {
    const v = mayorQue(0);
    expect(v(new FormControl(0))).toEqual({ mayorQue: { limite: 0 } });
    expect(v(new FormControl(-100))).toEqual({ mayorQue: { limite: 0 } });
    expect(v(new FormControl('1200'))).toBeNull();
  });

  it('correoValido exige dominio con extensión', () => {
    const v = correoValido();
    expect(v(new FormControl('ana.ejemplo@correo.test'))).toBeNull();
    expect(v(new FormControl('ana@correo'))).toEqual({ correo: true });
    expect(v(new FormControl('ana correo.test'))).toEqual({ correo: true });
  });

  it('mensajeError traduce los errores al español', () => {
    expect(mensajeError(null)).toBe('');
    expect(mensajeError({ required: true }, 'Acepta el tratamiento de datos.')).toBe('Acepta el tratamiento de datos.');
    expect(mensajeError({ minimoTexto: { requerido: 30, actual: 12 } })).toBe(
      'Escribe al menos 30 caracteres (llevas 12).',
    );
    expect(mensajeError({ rango: { min: 0, max: 50 } })).toBe('Debe estar entre 0 y 50.');
    expect(mensajeError({ minimoSeleccion: { requerido: 1 } })).toBe('Selecciona al menos una opción.');
  });

  it('telefonoValido acepta 7–15 dígitos ignorando espacios y guiones', () => {
    const v = telefonoValido();
    expect(v(new FormControl('0990000000'))).toBeNull();
    expect(v(new FormControl('099-000 0000'))).toBeNull();
    expect(v(new FormControl('+593990000000'))).toBeNull();
    expect(v(new FormControl('12345'))).toEqual({ telefono: true });
    expect(v(new FormControl('09900abc00'))).toEqual({ telefono: true });
    expect(v(new FormControl('1234567890123456'))).toEqual({ telefono: true });
  });

  it('minimoSeleccionados exige al menos una habilidad', () => {
    const v = minimoSeleccionados(1);
    expect(v(new FormControl([]))).toEqual({ minimoSeleccion: { requerido: 1 } });
    expect(v(new FormControl(null))).toEqual({ minimoSeleccion: { requerido: 1 } });
    expect(v(new FormControl(['Ionic']))).toBeNull();
  });
});
