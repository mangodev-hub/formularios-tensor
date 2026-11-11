/** Nombre de la colección de Firestore donde se guardan los perfiles. */
export const COLECCION_CANDIDATOS = 'candidatos';

// ---------------------------------------------------------------------------
// Opciones de los campos de selección (fuente única para formulario y vistas)
// ---------------------------------------------------------------------------

export const CARGOS = ['Desarrollador móvil', 'Analista de datos', 'Diseñador UX/UI', 'Soporte TI'] as const;

export const NIVELES_ACADEMICOS = ['Bachillerato', 'Tecnología', 'Tercer nivel', 'Posgrado'] as const;

export const MODALIDADES = ['Presencial', 'Híbrida', 'Remota'] as const;

export const HABILIDADES = ['Angular', 'Ionic', 'JavaScript', 'Python', 'SQL', 'Git', 'Firebase'] as const;

export type Cargo = (typeof CARGOS)[number];
export type NivelAcademico = (typeof NIVELES_ACADEMICOS)[number];
export type Modalidad = (typeof MODALIDADES)[number];
export type Habilidad = (typeof HABILIDADES)[number];

/** Ícono (ionicons) que representa cada modalidad en formulario, lista y detalle. */
export const ICONOS_MODALIDAD: Record<Modalidad, string> = {
  Presencial: 'business-outline',
  Híbrida: 'swap-horizontal-outline',
  Remota: 'home-outline',
};

// ---------------------------------------------------------------------------
// Límites de validación (usados por el formulario y por los mensajes de error)
// ---------------------------------------------------------------------------

export const LIMITES = {
  nombresMin: 3,
  resumenMin: 30,
  resumenMax: 600,
  experienciaMin: 0,
  experienciaMax: 50,
  /** Edad laboral mínima para postular. */
  edadMinima: 18,
  /** Dígitos permitidos en el teléfono, con `+` opcional al inicio. */
  telefonoPatron: /^\+?\d{7,15}$/,
} as const;

// ---------------------------------------------------------------------------
// Modelo de datos
// ---------------------------------------------------------------------------

/**
 * Datos que el usuario captura en el formulario. Cada propiedad se guarda como
 * un atributo independiente del documento de Firestore.
 * Las fechas se guardan como texto `YYYY-MM-DD` (fecha local, sin hora).
 */
export interface NuevoCandidato {
  nombres: string;
  correo: string;
  telefono: string;
  fechaNacimiento: string;
  cargo: Cargo;
  nivelAcademico: NivelAcademico;
  experienciaAnios: number;
  modalidad: Modalidad;
  habilidades: Habilidad[];
  fechaDisponibilidad: string;
  aspiracionSalarial: number;
  resumen: string;
  consentimiento: true;
}

/** Candidato leído desde Firestore. */
export interface Candidato extends NuevoCandidato {
  id: string;
  /** Marca de creación (`serverTimestamp()`); `null` mientras el servidor no la asigna. */
  creadoEn: Date | null;
}

/** Valor crudo del formulario: los controles de Ionic pueden entregar texto, `null` o fechas con hora. */
export interface ValorFormularioCandidato {
  nombres: string | null;
  correo: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  cargo: Cargo | null;
  nivelAcademico: NivelAcademico | null;
  experienciaAnios: number | string | null;
  modalidad: Modalidad | null;
  habilidades: Habilidad[] | null;
  fechaDisponibilidad: string | null;
  aspiracionSalarial: number | string | null;
  resumen: string | null;
  consentimiento: boolean | null;
}

/**
 * Convierte el valor (ya validado) del formulario en el documento que se guarda:
 * recorta espacios, normaliza el correo, convierte números y deja las fechas como `YYYY-MM-DD`.
 */
export function aNuevoCandidato(valor: ValorFormularioCandidato): NuevoCandidato {
  return {
    nombres: (valor.nombres ?? '').trim().replace(/\s+/g, ' '),
    correo: (valor.correo ?? '').trim().toLowerCase(),
    telefono: (valor.telefono ?? '').replace(/[\s-]/g, ''),
    fechaNacimiento: soloFecha(valor.fechaNacimiento),
    cargo: valor.cargo as Cargo,
    nivelAcademico: valor.nivelAcademico as NivelAcademico,
    experienciaAnios: Number(valor.experienciaAnios),
    modalidad: valor.modalidad as Modalidad,
    habilidades: [...(valor.habilidades ?? [])],
    fechaDisponibilidad: soloFecha(valor.fechaDisponibilidad),
    aspiracionSalarial: Number(valor.aspiracionSalarial),
    resumen: (valor.resumen ?? '').trim(),
    consentimiento: true,
  };
}

/** `ion-datetime` entrega `2000-04-15T00:00:00`; nos quedamos con `2000-04-15`. */
export function soloFecha(valor: string | null | undefined): string {
  return (valor ?? '').slice(0, 10);
}
