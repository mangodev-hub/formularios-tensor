// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

/**
 * Configuración web de Firebase (proyecto de práctica `formularios-a59ac`).
 * Estos valores identifican el proyecto y son públicos por diseño: la protección
 * real de los datos depende de las reglas de Firestore, no de ocultar esta config.
 */
export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyB0bP55E7_dHmZe072AX4i406ZiJLDpb0g',
    authDomain: 'formularios-a59ac.firebaseapp.com',
    projectId: 'formularios-a59ac',
    storageBucket: 'formularios-a59ac.firebasestorage.app',
    messagingSenderId: '796857822755',
    appId: '1:796857822755:web:30b1e3df87cd68419acb96',
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
