import type { ElementRef } from '@angular/core';
import { afterNextRender, Component, DestroyRef, inject, input, signal, viewChild } from '@angular/core';
import { Alignment, Fit, Layout, Rive, RuntimeLoader } from '@rive-app/canvas';

/** El motor WASM se sirve desde la app (angular.json → assets/rive), así funciona sin CDN. */
RuntimeLoader.setWasmUrl('assets/rive/rive.wasm');

/** Archivo con los artboards de TalentFlow (fuente: rive-src/, ver CLAUDE.md). */
export const ARCHIVO_RIVE = 'assets/rive/talentflow.riv';

/**
 * Qué animaciones usan Rive. El plan gratuito de Rive antepone ~1,5 s de pantalla "RIVE"
 * (marca de agua) a cada animación: tolerable al abrir una pantalla (Flo, Vacío), pero tapa
 * casi todo el guardado. Por eso `envio` está apagado y el guardado usa un overlay Ionic.
 * Con un plan sin marca de agua: republicar el .riv y poner `envio: true`.
 */
export const ANIMACIONES_RIVE = { envio: false } as const;

/**
 * El .riv se descarga una sola vez y se comparte entre instancias: el overlay de envío
 * se monta al guardar y así no depende de la red en ese momento.
 */
const archivos = new Map<string, Promise<ArrayBuffer>>();
function descargar(src: string): Promise<ArrayBuffer> {
  let archivo = archivos.get(src);
  if (!archivo) {
    archivo = fetch(src)
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} al pedir ${src}`);
        return respuesta.arrayBuffer();
      })
      .catch((error: unknown) => {
        archivos.delete(src); // permite reintentar más tarde
        throw error;
      });
    archivos.set(src, archivo);
  }
  return archivo;
}

/**
 * Reproduce un artboard de Rive. Es decorativo (`aria-hidden`).
 *
 * - Mientras carga, o si el .riv no existe o falla, muestra el contenido proyectado (`<ng-content>`)
 *   como respaldo; la app nunca depende de la animación.
 * - Con `prefers-reduced-motion` no reproduce: queda la pose inicial, estática.
 * - La lógica vive en Angular; aquí solo se disparan triggers o se fijan booleanos del view model.
 */
@Component({
  selector: 'app-rive',
  template: `
    <canvas #lienzo aria-hidden="true" [class.oculto]="!listo()"></canvas>
    @if (!listo()) {
      <div class="respaldo"><ng-content /></div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    canvas.oculto {
      position: absolute;
      inset: 0;
      visibility: hidden;
    }
    .respaldo {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
    }
  `,
})
export class RivePlayerComponent {
  /** Nombre del artboard dentro del .riv (`Flo`, `Envio`, `Vacio`). */
  readonly artboard = input.required<string>();
  readonly src = input(ARCHIVO_RIVE);
  readonly stateMachine = input('Maquina');
  /** `false` para artboards sin view model (p. ej. `Vacio`), así no se intenta enlazar datos. */
  readonly conDatos = input(true);

  /** `true` cuando el archivo cargó y el canvas ya dibuja. */
  readonly listo = signal(false);

  private readonly reducirMovimiento =
    typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  /** `true` si la animación está cargada y en movimiento (no con movimiento reducido). */
  readonly reproduce = (): boolean => this.listo() && !this.reducirMovimiento;

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private rive?: Rive;
  private observador?: ResizeObserver;

  private destruido = false;

  constructor() {
    afterNextRender(() => void this.iniciar());
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.observador?.disconnect();
      this.rive?.cleanup();
    });
  }

  /** Cambios pedidos antes de que el archivo cargue; se aplican en `onLoad`. */
  private readonly pendientes: (() => void)[] = [];

  /** Dispara un trigger del view model (p. ej. `celebrar`, `error`, `exito`). */
  disparar(nombre: string): void {
    this.aplicar(() => this.rive?.viewModelInstance?.trigger(nombre)?.trigger());
  }

  /** Cambia un booleano del view model (p. ej. `guardando`). */
  fijar(nombre: string, valor: boolean): void {
    this.aplicar(() => {
      const propiedad = this.rive?.viewModelInstance?.boolean(nombre);
      if (propiedad) propiedad.value = valor;
    });
  }

  private aplicar(cambio: () => void): void {
    if (this.listo()) cambio();
    else this.pendientes.push(cambio);
  }

  private async iniciar(): Promise<void> {
    const canvas = this.lienzo().nativeElement;
    const reducirMovimiento = this.reducirMovimiento;

    try {
      const archivo = await descargar(this.src());
      if (this.destruido) return;

      const rive = new Rive({
        buffer: archivo.slice(0), // copia: el runtime puede quedarse con el buffer
        canvas,
        artboard: this.artboard(),
        stateMachine: this.stateMachine(),
        autoplay: !reducirMovimiento,
        autoBind: this.conDatos(),
        layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
        onLoad: () => {
          rive.resizeDrawingSurfaceToCanvas();
          this.listo.set(true);
          this.pendientes.splice(0).forEach((cambio) => cambio());
        },
        onLoadError: () => {
          console.warn(`[TalentFlow] No se pudo cargar la animación Rive "${this.artboard()}"; se usa el respaldo.`);
          this.listo.set(false);
        },
      });
      this.rive = rive;

      // Redimensiona la superficie de dibujo al tamaño real (y densidad de píxeles) del canvas.
      this.observador = new ResizeObserver(() => {
        if (this.listo()) rive.resizeDrawingSurfaceToCanvas();
      });
      this.observador.observe(canvas);
    } catch (error) {
      console.warn('[TalentFlow] Rive no disponible; se usa el respaldo.', error);
    }
  }
}
