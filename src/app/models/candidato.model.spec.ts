import { aNuevoCandidato, CARGOS, HABILIDADES, MODALIDADES, NIVELES_ACADEMICOS } from './candidato.model';

describe('modelo Candidato', () => {
  it('tiene las opciones mínimas que pide el enunciado', () => {
    expect(CARGOS.length).toBeGreaterThanOrEqual(4);
    expect(NIVELES_ACADEMICOS).toEqual(['Bachillerato', 'Tecnología', 'Tercer nivel', 'Posgrado']);
    expect(MODALIDADES).toEqual(['Presencial', 'Híbrida', 'Remota']);
    expect(HABILIDADES).toContain('Firebase');
  });

  it('aNuevoCandidato normaliza el valor del formulario', () => {
    const doc = aNuevoCandidato({
      nombres: '  Ana   Pérez ',
      correo: ' Ana.Ejemplo@Correo.TEST ',
      telefono: '099-000 0000',
      fechaNacimiento: '2000-04-15T00:00:00',
      cargo: 'Desarrollador móvil',
      nivelAcademico: 'Tercer nivel',
      experienciaAnios: '3',
      modalidad: 'Híbrida',
      habilidades: ['Ionic', 'Angular', 'Git'],
      fechaDisponibilidad: '2026-12-01',
      aspiracionSalarial: '1200',
      resumen: '  Desarrolladora de aplicaciones móviles con experiencia.  ',
      consentimiento: true,
    });

    expect(doc).toEqual({
      nombres: 'Ana Pérez',
      correo: 'ana.ejemplo@correo.test',
      telefono: '0990000000',
      fechaNacimiento: '2000-04-15',
      cargo: 'Desarrollador móvil',
      nivelAcademico: 'Tercer nivel',
      experienciaAnios: 3,
      modalidad: 'Híbrida',
      habilidades: ['Ionic', 'Angular', 'Git'],
      fechaDisponibilidad: '2026-12-01',
      aspiracionSalarial: 1200,
      resumen: 'Desarrolladora de aplicaciones móviles con experiencia.',
      consentimiento: true,
    });
  });
});
