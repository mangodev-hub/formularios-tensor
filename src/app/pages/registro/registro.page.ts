import { afterNextRender, Component, computed, inject, Injector, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonDatetime,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonProgressBar,
  IonRadio,
  IonRadioGroup,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircle,
  briefcaseOutline,
  businessOutline,
  calendarOutline,
  closeCircle,
  checkmarkCircle,
  documentTextOutline,
  ellipseOutline,
  homeOutline,
  personOutline,
  refreshOutline,
  saveOutline,
  shieldCheckmarkOutline,
  swapHorizontalOutline,
  timeOutline,
} from 'ionicons/icons';
import { merge } from 'rxjs';

import type { Cargo, Habilidad, Modalidad, NivelAcademico, NuevoCandidato } from '../../models/candidato.model';
import {
  aNuevoCandidato,
  CARGOS,
  HABILIDADES,
  LIMITES,
  ICONOS_MODALIDAD,
  MODALIDADES,
  NIVELES_ACADEMICOS,
} from '../../models/candidato.model';
import { CandidatosService, mensajeErrorFirestore } from '../../services/candidatos.service';
import { ANIMACIONES_RIVE, RivePlayerComponent } from '../../shared/rive-player/rive-player.component';
import { formatearFecha } from '../../utils/formato';
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
  restarAnios,
  telefonoValido,
} from '../../validators/candidato.validators';

/** Bloques visuales del formulario y los campos que agrupa cada uno (en orden de aparición). */
const SECCIONES = [
  { id: 'personales', titulo: 'Datos personales', campos: ['nombres', 'correo', 'telefono', 'fechaNacimiento'] },
  {
    id: 'perfil',
    titulo: 'Perfil profesional',
    campos: ['cargo', 'nivelAcademico', 'experienciaAnios', 'modalidad', 'habilidades'],
  },
  { id: 'disponibilidad', titulo: 'Disponibilidad', campos: ['fechaDisponibilidad', 'aspiracionSalarial'] },
  { id: 'presentacion', titulo: 'Presentación', campos: ['resumen'] },
  { id: 'consentimiento', titulo: 'Consentimiento', campos: ['consentimiento'] },
] as const;

type SeccionId = (typeof SECCIONES)[number]['id'];
type Campo = (typeof SECCIONES)[number]['campos'][number];

@Component({
  selector: 'app-registro',
  templateUrl: 'registro.page.html',
  styleUrls: ['registro.page.scss'],
  imports: [
    ReactiveFormsModule,
    RivePlayerComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonProgressBar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonIcon,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonRadioGroup,
    IonRadio,
    IonSegment,
    IonSegmentButton,
    IonCheckbox,
    IonDatetime,
    IonModal,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
  ],
})
export class RegistroPage {
  private readonly fb = inject(FormBuilder);
  private readonly toastCtrl = inject(ToastController);
  private readonly alertCtrl = inject(AlertController);
  private readonly candidatos = inject(CandidatosService);
  private readonly contenido = viewChild.required(IonContent);
  private readonly injector = inject(Injector);

  // Animaciones Rive (decorativas; la app funciona igual si no cargan)
  private readonly flo = viewChild<RivePlayerComponent>('flo');
  private readonly envio = viewChild<RivePlayerComponent>('envio');

  /** Ver ANIMACIONES_RIVE: apagado mientras el plan de Rive tenga marca de agua. */
  readonly animarEnvio = ANIMACIONES_RIVE.envio;

  /** Overlay del envío: `oculto` → `enviando` → `exito` | `fallo` → `oculto`. */
  readonly estadoEnvio = signal<'oculto' | 'enviando' | 'exito' | 'fallo'>('oculto');
  readonly textoEnvio = computed(
    () =>
      ({
        oculto: '',
        enviando: 'Enviando la hoja de vida…',
        exito: '¡Registro guardado!',
        fallo: 'No se pudo guardar',
      })[this.estadoEnvio()],
  );

  // Opciones expuestas a la plantilla
  readonly cargos = CARGOS;
  readonly niveles = NIVELES_ACADEMICOS;
  readonly habilidades = HABILIDADES;
  readonly secciones = SECCIONES;
  readonly limites = LIMITES;
  readonly modalidades: { valor: Modalidad; icono: string }[] = MODALIDADES.map((valor) => ({
    valor,
    icono: ICONOS_MODALIDAD[valor],
  }));

  /** Límites de los calendarios (fecha local de hoy). */
  readonly hoy = hoyISO();
  readonly fechaMinNacimiento = '1940-01-01';
  /** La rueda de fechas arranca aquí: no permite elegir a alguien menor de edad. */
  readonly fechaMaxNacimiento = restarAnios(this.hoy, LIMITES.edadMinima);
  readonly fechaMaxDisponibilidad = `${new Date().getFullYear() + 2}-12-31`;

  readonly form = this.fb.group({
    // Datos personales
    nombres: this.fb.nonNullable.control('', [Validators.required, minimoTexto(LIMITES.nombresMin)]),
    correo: this.fb.nonNullable.control('', [Validators.required, correoValido()]),
    telefono: this.fb.nonNullable.control('', [Validators.required, telefonoValido()]),
    fechaNacimiento: this.fb.control<string | null>(null, [
      Validators.required,
      fechaNoFutura(),
      edadMinima(LIMITES.edadMinima),
    ]),
    // Perfil profesional
    cargo: this.fb.control<Cargo | null>(null, Validators.required),
    nivelAcademico: this.fb.control<NivelAcademico | null>(null, Validators.required),
    experienciaAnios: this.fb.control<number | null>(0, [
      Validators.required,
      enteroEnRango(LIMITES.experienciaMin, LIMITES.experienciaMax),
    ]),
    modalidad: this.fb.control<Modalidad | null>(null, Validators.required),
    habilidades: this.fb.nonNullable.control<Habilidad[]>([], minimoSeleccionados(1)),
    // Disponibilidad
    fechaDisponibilidad: this.fb.control<string | null>(null, [Validators.required, fechaNoAnteriorAHoy()]),
    aspiracionSalarial: this.fb.control<number | null>(null, [Validators.required, mayorQue(0)]),
    // Presentación
    resumen: this.fb.nonNullable.control('', [Validators.required, minimoTexto(LIMITES.resumenMin)]),
    // Consentimiento
    consentimiento: this.fb.nonNullable.control(false, Validators.requiredTrue),
  });

  /** Se emite con cada cambio del formulario para que los `computed` se recalculen (app sin zone.js). */
  private readonly cambios = toSignal(merge(this.form.valueChanges, this.form.statusChanges));

  /** Estado de cada sección: `true` cuando todos sus campos son válidos. */
  readonly seccionCompleta = computed<Record<SeccionId, boolean>>(() => {
    this.cambios();
    const estado = {} as Record<SeccionId, boolean>;
    for (const s of SECCIONES) {
      estado[s.id] = s.campos.every((c) => this.form.controls[c].valid);
    }
    return estado;
  });

  readonly seccionesCompletas = computed(() => Object.values(this.seccionCompleta()).filter(Boolean).length);
  readonly progreso = computed(() => this.seccionesCompletas() / SECCIONES.length);

  /** `true` mientras se envía a Firestore (bloquea el botón y muestra el spinner). */
  readonly guardando = signal(false);

  constructor() {
    addIcons({
      alertCircle,
      briefcaseOutline,
      businessOutline,
      calendarOutline,
      closeCircle,
      checkmarkCircle,
      documentTextOutline,
      ellipseOutline,
      homeOutline,
      personOutline,
      refreshOutline,
      saveOutline,
      shieldCheckmarkOutline,
      swapHorizontalOutline,
      timeOutline,
    });
  }

  // ---------------------------------------------------------------------------
  // Ayudas para la plantilla
  // ---------------------------------------------------------------------------

  /** Mensaje para `errorText` (Ionic solo lo muestra cuando el campo es inválido y fue tocado). */
  error(campo: Campo, requerido?: string): string {
    return mensajeError(this.form.controls[campo].errors, requerido);
  }

  /** Para controles sin `errorText` propio (fechas, segment, habilidades). */
  mostrarError(campo: Campo): boolean {
    const control = this.form.controls[campo];
    return control.invalid && control.touched;
  }

  fechaLegible(campo: 'fechaNacimiento' | 'fechaDisponibilidad'): string {
    return formatearFecha(this.form.controls[campo].value);
  }

  habilidadMarcada(habilidad: Habilidad): boolean {
    return this.form.controls.habilidades.value.includes(habilidad);
  }

  alternarHabilidad(habilidad: Habilidad, marcada: boolean): void {
    const control = this.form.controls.habilidades;
    const actuales = control.value.filter((h) => h !== habilidad);
    // Conserva el orden del catálogo para que el documento quede ordenado.
    const nuevas = marcada ? HABILIDADES.filter((h) => h === habilidad || actuales.includes(h)) : actuales;
    control.setValue(nuevas);
    control.markAsTouched();
    control.markAsDirty();
  }

  marcarTocado(campo: Campo): void {
    this.form.controls[campo].markAsTouched();
  }

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------

  async enviar(): Promise<void> {
    if (this.guardando()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.irAlPrimerError();
      this.flo()?.disparar('error');
      const pendientes = SECCIONES.length - this.seccionesCompletas();
      await this.avisar(
        `Revisa los campos marcados en rojo (${pendientes} ${pendientes === 1 ? 'sección incompleta' : 'secciones incompletas'}).`,
        'warning',
      );
      return;
    }

    await this.guardar(aNuevoCandidato(this.form.getRawValue()));
  }

  /**
   * Envía a Firestore. Solo limpia el formulario si el guardado se confirmó.
   * Mientras tanto muestra la animación "Envío" (avión de papel → nube) como indicador de carga.
   */
  private async guardar(candidato: NuevoCandidato): Promise<void> {
    this.guardando.set(true);
    this.estadoEnvio.set('enviando');
    await this.esperarRender(); // el overlay (y su <app-rive>) se monta en este render
    this.envio()?.fijar('guardando', true);

    try {
      await this.candidatos.crear(candidato);
      this.envio()?.fijar('guardando', false);
      this.envio()?.disparar('exito');
      this.estadoEnvio.set('exito');
      await this.pausaAnimacion(1100);

      this.estadoEnvio.set('oculto');
      this.form.reset();
      await this.contenido().scrollToTop(400);
      this.flo()?.disparar('celebrar');
      await this.avisar(`¡Listo! ${candidato.nombres} quedó registrado en TalentFlow.`, 'success');
    } catch (error) {
      console.error('[TalentFlow] Error al guardar el candidato:', error);
      this.envio()?.fijar('guardando', false);
      this.envio()?.disparar('fallo');
      this.estadoEnvio.set('fallo');
      await this.pausaAnimacion(1300);

      this.estadoEnvio.set('oculto');
      this.flo()?.disparar('error');
      await this.avisar(`${mensajeErrorFirestore(error)} Tus datos siguen en el formulario.`, 'danger');
    } finally {
      this.estadoEnvio.set('oculto');
      this.guardando.set(false);
    }
  }

  /**
   * Deja ver el resultado (✓ / ✕) antes de cerrar el overlay.
   * Con Rive, solo si la animación de verdad se está reproduciendo.
   */
  private async pausaAnimacion(ms: number): Promise<void> {
    if (this.animarEnvio && !this.envio()?.reproduce()) return;
    await new Promise((resolver) => setTimeout(resolver, this.animarEnvio ? ms : 600));
  }

  private esperarRender(): Promise<void> {
    return new Promise((resolver) => afterNextRender(() => resolver(), { injector: this.injector }));
  }

  async confirmarLimpiar(): Promise<void> {
    if (this.form.pristine) return;
    const alerta = await this.alertCtrl.create({
      header: '¿Limpiar el formulario?',
      message: 'Se borrarán todos los datos ingresados.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Limpiar', role: 'destructive', handler: () => this.limpiar() },
      ],
    });
    await alerta.present();
  }

  limpiar(): void {
    this.form.reset();
  }

  private irAlPrimerError(): void {
    const campo = SECCIONES.flatMap((s) => s.campos).find((c) => this.form.controls[c].invalid);
    if (!campo) return;
    document.getElementById(`campo-${campo}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private async avisar(mensaje: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const iconos = { success: 'checkmark-circle', warning: 'alert-circle', danger: 'close-circle' };
    const toast = await this.toastCtrl.create({
      message: mensaje,
      color,
      icon: iconos[color],
      // Los errores se quedan más tiempo para que se alcancen a leer.
      duration: color === 'danger' ? 6000 : 3000,
      position: 'bottom',
      positionAnchor: 'pie-registro',
      buttons: [{ text: 'OK', role: 'cancel' }],
    });
    await toast.present();
  }
}
