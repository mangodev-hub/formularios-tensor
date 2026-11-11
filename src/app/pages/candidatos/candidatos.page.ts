import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { RefresherCustomEvent, ViewWillEnter } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonRouterLink,
  IonSkeletonText,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  cloudOfflineOutline,
  folderOpenOutline,
  homeOutline,
  personAddOutline,
  refreshOutline,
  swapHorizontalOutline,
  timeOutline,
} from 'ionicons/icons';

import type { Candidato, Modalidad } from '../../models/candidato.model';
import { ICONOS_MODALIDAD } from '../../models/candidato.model';
import { CandidatosService, mensajeErrorFirestore } from '../../services/candidatos.service';
import { RivePlayerComponent } from '../../shared/rive-player/rive-player.component';
import { iniciales, textoExperiencia } from '../../utils/formato';

import { CandidatoDetalleComponent } from './candidato-detalle.component';

type Estado = 'cargando' | 'listo' | 'error';

/** Consulta de candidatos guardados en Firestore. */
@Component({
  selector: 'app-candidatos',
  templateUrl: 'candidatos.page.html',
  styleUrls: ['candidatos.page.scss'],
  imports: [
    RivePlayerComponent,
    RouterLink,
    IonRouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonText,
    IonSpinner,
    IonSkeletonText,
  ],
})
export class CandidatosPage implements ViewWillEnter {
  private readonly servicio = inject(CandidatosService);
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);

  readonly candidatos = signal<Candidato[]>([]);
  readonly estado = signal<Estado>('cargando');
  readonly mensajeError = signal('');
  /** Recarga en segundo plano (ya hay datos en pantalla). */
  readonly recargando = signal(false);

  readonly total = computed(() => this.candidatos().length);
  readonly esqueletos = [1, 2, 3, 4, 5];

  readonly iniciales = iniciales;
  readonly textoExperiencia = textoExperiencia;

  constructor() {
    addIcons({
      businessOutline,
      cloudOfflineOutline,
      folderOpenOutline,
      homeOutline,
      personAddOutline,
      refreshOutline,
      swapHorizontalOutline,
      timeOutline,
    });
  }

  /** Cada vez que se entra a la pestaña: así aparecen los candidatos recién registrados. */
  ionViewWillEnter(): void {
    void this.cargar();
  }

  icono(modalidad: Modalidad): string {
    return ICONOS_MODALIDAD[modalidad] ?? 'briefcase-outline';
  }

  async cargar(): Promise<void> {
    if (this.recargando()) return;
    const hayDatos = this.estado() === 'listo';
    if (hayDatos) this.recargando.set(true);
    else this.estado.set('cargando');

    try {
      this.candidatos.set(await this.servicio.listar());
      this.estado.set('listo');
    } catch (error) {
      console.error('[TalentFlow] Error al consultar candidatos:', error);
      const mensaje = mensajeErrorFirestore(error);
      if (hayDatos) {
        // Conserva la lista anterior y solo avisa.
        await this.avisarError(mensaje);
      } else {
        this.mensajeError.set(mensaje);
        this.estado.set('error');
      }
    } finally {
      this.recargando.set(false);
    }
  }

  async refrescar(evento: RefresherCustomEvent): Promise<void> {
    await this.cargar();
    await evento.target.complete();
  }

  async verDetalle(candidato: Candidato): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: CandidatoDetalleComponent,
      componentProps: { candidato },
    });
    await modal.present();
  }

  private async avisarError(mensaje: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      color: 'danger',
      icon: 'cloud-offline-outline',
      duration: 5000,
      position: 'bottom',
      buttons: [{ text: 'OK', role: 'cancel' }],
    });
    await toast.present();
  }
}
