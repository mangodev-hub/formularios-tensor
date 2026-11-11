import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { LIMITES, soloFecha } from '../models/candidato.model';

/**
 * Validadores propios del formulario de candidatos.
 * Todos devuelven `null` cuando el control está vacío: la obligatoriedad se
 * controla aparte con `Validators.required`, así cada error tiene su propio mensaje.
 */

/** Fecha de hoy en hora local con formato `YYYY-MM-DD` (no UTC, para no adelantar el día en Ecuador). */
export function hoyISO(hoy: Date = new Date()): string {
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

function vacio(valor: unknown): boolean {
  return valor === null || valor === undefined || (typeof valor === 'string' && valor.trim() === '');
}

/** La fecha no puede ser posterior a hoy. Error: `{ fechaFutura: true }`. */
export function fechaNoFutura(hoy: () => string = hoyISO): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (vacio(control.value)) return null;
    return soloFecha(control.value) > hoy() ? { fechaFutura: true } : null;
  };
}

/** `2026-11-11` menos 18 años → `2008-11-11`. */
export function restarAnios(fechaISO: string, anios: number): string {
  const anio = Number(fechaISO.slice(0, 4)) - anios;
  return `${String(anio).padStart(4, '0')}${fechaISO.slice(4, 10)}`;
}

/** Fecha de nacimiento de alguien con al menos `anios` cumplidos hoy. Error: `{ edadMinima: { anios } }`. */
export function edadMinima(anios: number, hoy: () => string = hoyISO): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (vacio(control.value)) return null;
    return soloFecha(control.value) > restarAnios(hoy(), anios) ? { edadMinima: { anios } } : null;
  };
}

/** La fecha no puede ser anterior a hoy (hoy sí se permite). Error: `{ fechaPasada: true }`. */
export function fechaNoAnteriorAHoy(hoy: () => string = hoyISO): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (vacio(control.value)) return null;
    return soloFecha(control.value) < hoy() ? { fechaPasada: true } : null;
  };
}

/** Longitud mínima sin contar espacios al inicio/fin. Error: `{ minimoTexto: { requerido, actual } }`. */
export function minimoTexto(minimo: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (vacio(control.value)) return null;
    const actual = String(control.value).trim().length;
    return actual < minimo ? { minimoTexto: { requerido: minimo, actual } } : null;
  };
}

/**
 * Correo con usuario, `@` y dominio con extensión (`ana@correo.test`).
 * Más estricto que `Validators.email`, que acepta `ana@correo`. Error: `{ correo: true }`.
 */
export function correoValido(): ValidatorFn {
  const patron = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return (control: AbstractControl): ValidationErrors | null => {
    if (vacio(control.value)) return null;
    return patron.test(String(control.value).trim()) ? null : { correo: true };
  };
}

/**
 * Teléfono de 7 a 15 dígitos, con `+` opcional. Ignora espacios y guiones
 * (igual que `aNuevoCandidato` al guardar). Error: `{ telefono: true }`.
 */
export function telefonoValido(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (vacio(control.value)) return null;
    const limpio = String(control.value).replace(/[\s-]/g, '');
    return LIMITES.telefonoPatron.test(limpio) ? null : { telefono: true };
  };
}

/** Número entero dentro de `[min, max]`. Errores: `{ noNumero }`, `{ noEntero }` o `{ rango: { min, max } }`. */
export function enteroEnRango(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (vacio(control.value)) return null;
    const numero = Number(control.value);
    if (Number.isNaN(numero)) return { noNumero: true };
    if (!Number.isInteger(numero)) return { noEntero: true };
    return numero < min || numero > max ? { rango: { min, max } } : null;
  };
}

/** Número estrictamente mayor que `limite`. Errores: `{ noNumero }` o `{ mayorQue: { limite } }`. */
export function mayorQue(limite: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (vacio(control.value)) return null;
    const numero = Number(control.value);
    if (Number.isNaN(numero)) return { noNumero: true };
    return numero > limite ? null : { mayorQue: { limite } };
  };
}

/**
 * Traduce los errores de un control al mensaje que se muestra junto al campo.
 * Devuelve el primero según prioridad, o `''` si el control es válido.
 */
export function mensajeError(errores: ValidationErrors | null, requerido = 'Este campo es obligatorio.'): string {
  if (!errores) return '';
  if (errores['required']) return requerido;
  if (errores['minimoTexto']) {
    const { requerido: min, actual } = errores['minimoTexto'] as { requerido: number; actual: number };
    return `Escribe al menos ${min} caracteres (llevas ${actual}).`;
  }
  if (errores['correo']) return 'Ingresa un correo válido, por ejemplo ana@correo.test.';
  if (errores['telefono']) return 'Ingresa entre 7 y 15 dígitos (puede iniciar con +).';
  if (errores['fechaFutura']) return 'La fecha no puede ser posterior a hoy.';
  if (errores['edadMinima']) return `Debes tener al menos ${(errores['edadMinima'] as { anios: number }).anios} años.`;
  if (errores['fechaPasada']) return 'La fecha no puede ser anterior a hoy.';
  if (errores['noNumero']) return 'Ingresa un número.';
  if (errores['noEntero']) return 'Ingresa un número entero, sin decimales.';
  if (errores['rango']) {
    const { min, max } = errores['rango'] as { min: number; max: number };
    return `Debe estar entre ${min} y ${max}.`;
  }
  if (errores['mayorQue']) return `Debe ser mayor que ${(errores['mayorQue'] as { limite: number }).limite}.`;
  if (errores['minimoSeleccion']) {
    const { requerido: min } = errores['minimoSeleccion'] as { requerido: number };
    return min === 1 ? 'Selecciona al menos una opción.' : `Selecciona al menos ${min} opciones.`;
  }
  return 'Valor no válido.';
}

/** Un arreglo (p. ej. habilidades marcadas) con al menos `minimo` elementos. Error: `{ minimoSeleccion: { requerido } }`. */
export function minimoSeleccionados(minimo: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const cantidad = Array.isArray(control.value) ? control.value.length : 0;
    return cantidad < minimo ? { minimoSeleccion: { requerido: minimo } } : null;
  };
}
