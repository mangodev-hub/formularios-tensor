import { Injectable } from '@angular/core';
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';

import { db } from '../firebase';
import type { Candidato, Cargo, Habilidad, Modalidad, NivelAcademico, NuevoCandidato } from '../models/candidato.model';
import { COLECCION_CANDIDATOS } from '../models/candidato.model';

/** Tiempo máximo de espera de una escritura antes de avisar al usuario. */
const TIEMPO_LIMITE_MS = 15_000;

/** Error de la app con un código propio, para distinguirlo de los de Firebase. */
export class ErrorCandidatos extends Error {
  constructor(
    readonly code: 'sin-conexion' | 'tiempo-agotado',
    message: string,
  ) {
    super(message);
    this.name = 'ErrorCandidatos';
  }
}

/**
 * Único punto de acceso a la colección `candidatos` de Cloud Firestore.
 * Los componentes no importan `firebase/firestore`: llaman a este servicio.
 */
@Injectable({ providedIn: 'root' })
export class CandidatosService {
  private readonly coleccion = collection(db, COLECCION_CANDIDATOS);

  /**
   * Guarda un candidato como documento nuevo (ID automático) y devuelve ese ID.
   * Cada campo se guarda como atributo propio y `creadoEn` lo asigna el servidor.
   */
  async crear(candidato: NuevoCandidato): Promise<string> {
    // Sin red, Firestore deja la escritura en cola y la promesa no termina:
    // mejor avisar de inmediato que dejar el spinner girando.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ErrorCandidatos('sin-conexion', 'Sin conexión a internet.');
    }

    const referencia = await conTiempoLimite(
      addDoc(this.coleccion, { ...candidato, creadoEn: serverTimestamp() }),
      TIEMPO_LIMITE_MS,
    );
    return referencia.id;
  }

  /** Todos los candidatos, del más reciente al más antiguo. */
  async listar(): Promise<Candidato[]> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ErrorCandidatos('sin-conexion', 'Sin conexión a internet.');
    }

    const consulta = query(this.coleccion, orderBy('creadoEn', 'desc'));
    const resultado = await conTiempoLimite(getDocs(consulta), TIEMPO_LIMITE_MS);
    return resultado.docs.map((documento) => aCandidato(documento.id, documento.data()));
  }
}

/**
 * Convierte los datos crudos de Firestore en un `Candidato`.
 * Es tolerante: si un documento antiguo o editado a mano trae un campo faltante,
 * se usa un valor vacío en lugar de romper la lista.
 */
export function aCandidato(id: string, datos: Record<string, unknown>): Candidato {
  const texto = (v: unknown) => (typeof v === 'string' ? v : '');
  const numero = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
  const creadoEn = datos['creadoEn'] as { toDate?: () => Date } | null | undefined;

  return {
    id,
    nombres: texto(datos['nombres']),
    correo: texto(datos['correo']),
    telefono: texto(datos['telefono']),
    fechaNacimiento: texto(datos['fechaNacimiento']),
    cargo: texto(datos['cargo']) as Cargo,
    nivelAcademico: texto(datos['nivelAcademico']) as NivelAcademico,
    experienciaAnios: numero(datos['experienciaAnios']),
    modalidad: texto(datos['modalidad']) as Modalidad,
    habilidades: Array.isArray(datos['habilidades']) ? (datos['habilidades'] as Habilidad[]) : [],
    fechaDisponibilidad: texto(datos['fechaDisponibilidad']),
    aspiracionSalarial: numero(datos['aspiracionSalarial']),
    resumen: texto(datos['resumen']),
    consentimiento: true,
    creadoEn: typeof creadoEn?.toDate === 'function' ? creadoEn.toDate() : null,
  };
}

function conTiempoLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(
      () => rechazar(new ErrorCandidatos('tiempo-agotado', 'El servidor no respondió a tiempo.')),
      ms,
    );
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador));
}

/** Traduce cualquier error de guardado/consulta a un mensaje claro para el usuario. */
export function mensajeErrorFirestore(error: unknown): string {
  const codigo = (error as { code?: unknown } | null)?.code;
  switch (codigo) {
    case 'sin-conexion':
      return 'Sin conexión a internet. Conéctate e inténtalo de nuevo.';
    case 'tiempo-agotado':
    case 'unavailable':
    case 'deadline-exceeded':
      return 'El servidor no respondió. Revisa tu conexión e inténtalo de nuevo.';
    case 'permission-denied':
      return 'Firestore rechazó la operación: revisa las reglas de seguridad de la colección "candidatos".';
    case 'invalid-argument':
      return 'Firestore rechazó los datos enviados. Revisa el formulario.';
    case 'resource-exhausted':
      return 'Se superó la cuota de Firebase. Inténtalo más tarde.';
    default:
      return 'Ocurrió un error inesperado al comunicarse con Firestore. Inténtalo de nuevo.';
  }
}
