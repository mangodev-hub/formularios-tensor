import { Component, computed, inject, input } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  briefcaseOutline,
  businessOutline,
  calendarOutline,
  callOutline,
  cashOutline,
  checkmarkDoneOutline,
  closeOutline,
  codeSlashOutline,
  giftOutline,
  homeOutline,
  mailOutline,
  ribbonOutline,
  rocketOutline,
  swapHorizontalOutline,
  timeOutline,
} from 'ionicons/icons';

import type { Candidato } from '../../models/candidato.model';
import { ICONOS_MODALIDAD } from '../../models/candidato.model';
import {
  calcularEdad,
  formatearFecha,
  formatearFechaHora,
  formatearUSD,
  iniciales,
  textoExperiencia,
} from '../../utils/formato';

/** Hoja de vida completa de un candidato. Se abre con `ModalController` desde la lista. */
@Component({
  selector: 'app-candidato-detalle',
  templateUrl: 'candidato-detalle.component.html',
  styleUrls: ['candidato-detalle.component.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonChip,
  ],
})
export class CandidatoDetalleComponent {
  private readonly modalCtrl = inject(ModalController);

  /** Lo entrega `ModalController.create({ componentProps: { candidato } })`. */
  readonly candidato = input.required<Candidato>();

  readonly iniciales = computed(() => iniciales(this.candidato().nombres));
  readonly edad = computed(() => calcularEdad(this.candidato().fechaNacimiento));
  readonly iconoModalidad = computed(() => ICONOS_MODALIDAD[this.candidato().modalidad] ?? 'briefcase-outline');

  // Formatos para la plantilla
  readonly formatearFecha = formatearFecha;
  readonly formatearFechaHora = formatearFechaHora;
  readonly formatearUSD = formatearUSD;
  readonly textoExperiencia = textoExperiencia;

  constructor() {
    addIcons({
      briefcaseOutline,
      businessOutline,
      calendarOutline,
      callOutline,
      cashOutline,
      checkmarkDoneOutline,
      closeOutline,
      codeSlashOutline,
      giftOutline,
      homeOutline,
      mailOutline,
      ribbonOutline,
      rocketOutline,
      swapHorizontalOutline,
      timeOutline,
    });
  }

  cerrar(): void {
    void this.modalCtrl.dismiss();
  }
}
