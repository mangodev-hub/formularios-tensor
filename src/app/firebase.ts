import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

import { environment } from '../environments/environment';

/** Instancia única de Firebase (evita inicializarla dos veces con recarga en caliente). */
export const firebaseApp = getApps().length ? getApp() : initializeApp(environment.firebase);

/** Base de datos Cloud Firestore. Solo `CandidatosService` debe usarla. */
export const db = getFirestore(firebaseApp);
