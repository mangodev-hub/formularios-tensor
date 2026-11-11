# CLAUDE.md — TalentFlow (registro empresarial de hojas de vida)

App móvil MVP para que Talento Humano de la empresa ficticia **TalentFlow S. A.** registre y consulte
perfiles de candidatos. Taller de *Desarrollo de Aplicaciones Móviles*: Ionic + Angular standalone +
Firebase Cloud Firestore, con animaciones Rive en la interfaz.

Responde y escribe la UI, los comentarios y el README en **español**.

## Stack (versiones reales del proyecto)

- Angular **22** standalone (sin NgModules), TypeScript 6, `@angular/build`.
- Ionic **9** (`@ionic/angular` 9.x). En Ionic 9 los componentes standalone se importan **desde
  `@ionic/angular`** (ya no existe `@ionic/angular/standalone`). Cada componente usado en una plantilla
  debe ir en el `imports: [...]` del `@Component`, y cada ícono registrarse con `addIcons()` de `ionicons`.
- Firebase JS SDK 13 modular (`firebase/app`, `firebase/firestore`), inicializado en `src/app/firebase.ts`.
  Sin Analytics. No usar `@angular/fire`.
- Rive: runtime web `@rive-app/canvas` 2.50 (instalado). Fuentes de las animaciones en [rive-src/](rive-src/)
  (proyecto Rive CLI, RML). Skill `rive` instalada en `.claude/skills/rive`.
- Tests: Vitest (unit, `*.spec.ts`), Playwright (e2e en `e2e/`). Lint: ESLint + Prettier (`@ionic/prettier-config`).

## Comandos

```bash
npm start              # ng serve → http://localhost:4200
npm run build
npm run lint           # eslint --max-warnings 0 + typecheck e2e + prettier --check
npm run lint:fix
npm run test:unit      # vitest
npm run test:e2e       # playwright
npm run android:sync   # ng build + cap sync android
npm run android:apk    # APK debug → android/app/build/outputs/apk/debug/app-debug.apk
```

Android (Capacitor 8, solo pruebas locales; el usuario NO publica en tiendas): SDK en `C:\Android\Sdk`
(`android/local.properties`, ignorado por git), JDK 21 en `C:\Program Files\Java\jdk-21`. appId
`ec.talentflow.registro`. El APK debug se instala a mano; no generar builds firmados de release salvo que se pida.

## Requisitos funcionales (del enunciado — no negociables)

Dos vistas:

1. **Registrar candidato** (`/registro`): formulario por bloques (tarjetas), validado antes de enviar.
2. **Consultar candidatos** (`/candidatos`): lista desde Firestore con nombre, cargo, modalidad y
   experiencia; detalle completo en modal (o pantalla `/candidatos/:id`).

Obligatorio además: spinner/indicador durante operaciones async, toast de éxito/error, limpiar el
formulario tras guardar, `creadoEn: serverTimestamp()`, y que el componente **no** contenga la lógica de
Firestore (va en `CandidatosService`).

### Campos y validaciones (Reactive Forms tipados)

| Campo | Control Ionic | Validación |
|---|---|---|
| `nombres` | `ion-input` | requerido, minLength 3 |
| `correo` | `ion-input type="email"` | requerido, `correoValido()` (exige dominio con extensión) |
| `telefono` | `ion-input type="tel"` | requerido, 7–15 dígitos ignorando espacios/guiones (`telefonoValido()`) |
| `fechaNacimiento` | `ion-datetime` (rueda, en hoja inferior) | requerida, no futura, edad ≥ 18 (`edadMinima`) |
| `cargo` | `ion-select` | requerido; Desarrollador móvil, Analista de datos, Diseñador UX/UI, Soporte TI |
| `nivelAcademico` | `ion-radio-group` + `ion-radio` | requerido; Bachillerato, Tecnología, Tercer nivel, Posgrado |
| `experienciaAnios` | `ion-input type="number"` | entero 0–50 |
| `modalidad` | `ion-segment` | Presencial, Híbrida, Remota |
| `habilidades` | `ion-checkbox` (varios) | al menos 1; Angular, Ionic, JavaScript, Python, SQL, Git, Firebase |
| `fechaDisponibilidad` | `ion-datetime` | requerida, ≥ hoy |
| `aspiracionSalarial` | `ion-input type="number"` | > 0 |
| `resumen` | `ion-textarea` (con contador) | requerido, minLength 30 |
| `consentimiento` | `ion-checkbox` | `Validators.requiredTrue` |

Reglas de implementación:

- Mostrar errores **junto al campo**: `errorText` nativo en `ion-input`/`ion-textarea`/`ion-select`/`ion-checkbox`
  (texto de `mensajeError()`), y `<ion-note color="danger" class="error-campo">` **debajo** para fechas, radio-group
  (su `errorText` nativo se dibuja arriba de la lista), segment y habilidades, con `mostrarError()`.
- Fechas: `ion-item` botón que abre `ion-modal` hoja inferior (`.tf-hoja-fecha` en global.scss) con `ion-datetime`.
  No usar `ion-datetime-button`: con valor `null` muestra la fecha de hoy y parece llenado.
- La app es **zoneless** (sin zone.js): todo estado que cambie tras un `await` debe ser `signal`.
- `provideIonicAngular({ useSetInputAPI: true })` está activo: los `componentProps` de `ModalController` llegan
  a `input()` con signals (así funciona `CandidatoDetalleComponent`).
- Formatos de presentación (fecha, USD, edad, iniciales) en `src/app/utils/formato.ts`, no en el modelo.
- Si `ng serve` falla porque un `templateUrl` aún no existía cuando se creó el `.ts`, puede no recuperarse: reiniciarlo.
- En `onSubmit()`: si el form es inválido → `markAllAsTouched()`, toast de aviso y **no** llamar al servicio.
- Fechas: guardarlas como string `YYYY-MM-DD` (tal como el modelo de referencia). Comparar contra la fecha
  local de hoy, no UTC.
- Números: convertir a `number` antes de guardar (los `ion-input type=number` pueden entregar string).
- Guardar **atributos separados** en el documento, nunca un JSON serializado como texto.

## Arquitectura objetivo

```
src/app/
├── models/candidato.model.ts          # interface Candidato + constantes de opciones (CARGOS, NIVELES, ...)
├── services/candidatos.service.ts     # único lugar que toca Firestore: crear(), listar(), obtener(id)
├── firebase.ts                        # initializeApp(environment.firebase) + export const db
├── validators/candidato.validators.ts # fechaNoFutura, fechaNoAnteriorAHoy, telefonoValido, enteroEnRango, ...
├── shared/rive-player/                # componente <app-rive> reutilizable (canvas + inputs/eventos)
├── pages/registro/                    # formulario
├── pages/candidatos/                  # lista + modal de detalle
└── app.component.ts                   # ion-tabs: Registrar | Candidatos
src/assets/rive/*.riv                  # animaciones exportadas desde rive-src/
```

- `CandidatosService` (`providedIn: 'root'`): `crear(c)` → `addDoc(collection(db,'candidatos'), {...c, creadoEn: serverTimestamp()})`
  (hecho: falla rápido sin red y a los 15 s; los errores se traducen con `mensajeErrorFirestore()`);
  `listar()` → `getDocs(query(collection(db,'candidatos'), orderBy('creadoEn','desc')))` mapeando `id` + `data()`.
  Convertir `creadoEn` (Timestamp) a `Date` al leer.
- Estado en componentes con **signals** (`signal`, `computed`); `inject()` en lugar de constructor.
- Reemplazar la ruta `home` del starter por las rutas reales y eliminar `src/app/home/`.

## Firebase

- Configuración web en `src/environments/environment.ts` como `firebase: { apiKey, authDomain, projectId, ... }`.
  La config web de Firebase no es secreta, pero **nunca** commitear cuentas de servicio, claves privadas ni
  `google-services.json` de admin.
- Reglas de práctica (documentar en el README que **no son aptas para producción**):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /candidatos/{documento} {
      allow read: if true;
      allow create: if true;            // ideal: validar tipos/campos con request.resource.data
      allow update, delete: if false;
    }
  }
}
```

- Solo datos ficticios (correos `@correo.test`).

## Rive

- Fuentes en [rive-src/](rive-src/) — es un proyecto **Rive CLI**: lee y sigue [rive-src/AGENTS.md](rive-src/AGENTS.md)
  antes de editar. Nunca adivinar tipos/propiedades RML: `rive schema <Tipo>`, `rive docs <tema>`.
- **`rive-src/scene.rml` es GENERADO** por `rive-src/generar.mjs`: edita el script y ejecuta `node generar.mjs`.
  Artboards: `Flo` (VM `Flo`: triggers `celebrar`, `error`), `Envio` (VM `Envio`: bool `guardando`, triggers
  `exito`, `fallo`), `Vacio` (sin VM, bucle). Máquina de estados en todos: `Maquina`. Se usan view models, no los
  inputs de state machine (obsoletos).
- Ciclo: `node generar.mjs` → `rive . --verify` → `rive inspect . --summary` (sin `problems`) → capturas con
  `printf 'artboard Flo\nadvance 0.5s\ndata celebrar=1\nadvance 0.25s\nscreenshot build/x.png\nquit\n' | rive . --commands`.
- Publicar (desde `rive-src/`, requiere `rive login`; cuenta contra 50 publicaciones/mes del plan gratuito):
  `rive . --publish --output-dir=../src/assets/rive` → `src/assets/rive/talentflow.riv`. **No** usar `rive push`.
- **Marca de agua:** el plan gratuito antepone ~1,5 s de pantalla "RIVE" a cada animación. Decisión del usuario:
  Rive en Flo y Vacío; el guardado usa overlay Ionic (`ANIMACIONES_RIVE.envio = false` en
  `shared/rive-player`). No ocultar ni esquivar la marca de agua (licencia de Rive).
- En la app: `<app-rive artboard="Flo">` (`shared/rive-player`): descarga el .riv una vez, sirve `rive.wasm` local
  (asset en angular.json), muestra el `<ng-content>` como respaldo si no carga, `disparar()`/`fijar()` encolan
  hasta que carga. `[conDatos]="false"` para artboards sin view model.
- En la app: las animaciones son decorativas → cada canvas lleva `aria-hidden="true"`, se respeta
  `prefers-reduced-motion` (mostrar estado estático), se llama `rive.cleanup()` en `ngOnDestroy`, y ninguna
  animación bloquea el flujo del formulario. La lógica (validar, guardar) vive en Angular; Rive solo recibe
  inputs del state machine (`trigger`/`boolean`/`number`) y emite eventos.
- Mantener los nombres de state machines e inputs sincronizados entre el `.rml` y el código (constantes en
  el componente).

## Entregable

Repositorio público con un `README.md` propio (reemplazará el enunciado): integrantes, objetivo, tecnologías y
componentes Ionic, arquitectura, modelo de datos, instalación, capturas en `docs/capturas/`, ≥5 casos de prueba
(2 de validación fallida), reglas de seguridad y limitaciones. Antes de entregar, cerrar las reglas públicas.
