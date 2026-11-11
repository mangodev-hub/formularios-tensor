import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { peopleOutline, personAddOutline } from 'ionicons/icons';

/** Contenedor de navegación: pestaña de registro y pestaña de consulta. */
@Component({
  selector: 'app-tabs',
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="registro">
          <ion-icon name="person-add-outline" aria-hidden="true" />
          <ion-label>Registrar</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="candidatos">
          <ion-icon name="people-outline" aria-hidden="true" />
          <ion-label>Candidatos</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  constructor() {
    addIcons({ personAddOutline, peopleOutline });
  }
}
