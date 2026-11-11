import { aCandidato, ErrorCandidatos, mensajeErrorFirestore } from './candidatos.service';

describe('aCandidato', () => {
  it('convierte un documento de Firestore y su Timestamp', () => {
    const fecha = new Date(2026, 10, 11, 15, 28);
    const c = aCandidato('abc123', {
      nombres: 'Ana Pérez',
      cargo: 'Desarrollador móvil',
      experienciaAnios: 3,
      habilidades: ['Ionic', 'Git'],
      aspiracionSalarial: 1200,
      creadoEn: { toDate: () => fecha },
    });
    expect(c.id).toBe('abc123');
    expect(c.nombres).toBe('Ana Pérez');
    expect(c.experienciaAnios).toBe(3);
    expect(c.habilidades).toEqual(['Ionic', 'Git']);
    expect(c.creadoEn).toBe(fecha);
  });

  it('tolera campos faltantes y un creadoEn todavía pendiente', () => {
    const c = aCandidato('x', { creadoEn: null });
    expect(c.nombres).toBe('');
    expect(c.habilidades).toEqual([]);
    expect(c.experienciaAnios).toBe(0);
    expect(c.creadoEn).toBeNull();
  });
});

describe('mensajeErrorFirestore', () => {
  it('explica los errores de reglas de seguridad', () => {
    expect(mensajeErrorFirestore({ code: 'permission-denied' })).toContain('reglas de seguridad');
  });

  it('distingue la falta de conexión y el tiempo agotado', () => {
    expect(mensajeErrorFirestore(new ErrorCandidatos('sin-conexion', ''))).toContain('Sin conexión');
    expect(mensajeErrorFirestore(new ErrorCandidatos('tiempo-agotado', ''))).toContain('no respondió');
    expect(mensajeErrorFirestore({ code: 'unavailable' })).toContain('no respondió');
  });

  it('usa un mensaje genérico para errores desconocidos', () => {
    expect(mensajeErrorFirestore(new Error('x'))).toContain('error inesperado');
    expect(mensajeErrorFirestore(null)).toContain('error inesperado');
  });
});
