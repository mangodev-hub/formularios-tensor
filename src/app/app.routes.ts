import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'registro',
        title: 'Registrar candidato · TalentFlow',
        loadComponent: () => import('./pages/registro/registro.page').then((m) => m.RegistroPage),
      },
      {
        path: 'candidatos',
        title: 'Candidatos · TalentFlow',
        loadComponent: () => import('./pages/candidatos/candidatos.page').then((m) => m.CandidatosPage),
      },
      { path: '', redirectTo: 'registro', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'registro' },
];
