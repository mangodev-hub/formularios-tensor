// Genera scene.rml (TalentFlow) a partir de piezas en JavaScript.
// Uso:  node generar.mjs   (luego: rive . --verify)
//
// El RML es muy verboso; este script evita repetir paints, keyframes y condiciones.
// scene.rml es un archivo GENERADO: edita este script, no el .rml.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Identificadores
// ---------------------------------------------------------------------------
let siguiente = 100;
const ids = new Map();
/** Id estable por nombre lógico (`ref('flo.cabeza')`). */
const ref = (nombre) => {
  if (!ids.has(nombre)) ids.set(nombre, `0:${siguiente++}`);
  return ids.get(nombre);
};

// ---------------------------------------------------------------------------
// Paleta (alineada con el tema de la app)
// ---------------------------------------------------------------------------
const C = {
  petroleo: '0F5B66',
  petroleoMedio: '1B6F7A',
  petroleoClaro: '4FC3CF',
  coral: 'F07A5F',
  crema: 'F6EBDD',
  blanco: 'FFFFFF',
  tinta: '1D2B2F',
  gris: 'B8C4C7',
  exito: '2DBE7E',
  error: 'E5484D',
  amarillo: 'FFC53D',
};

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------
const attrs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

const relleno = (hex, alfa = 'FF') => `<Fill name="Fill"><SolidColor colorValue="${alfa}${hex}" name="C"/></Fill>`;
const trazo = (hex, grosor, alfa = 'FF') =>
  `<Stroke thickness="${grosor}" cap="round" join="round" name="Stroke"><SolidColor colorValue="${alfa}${hex}" name="C"/></Stroke>`;

/** Shape con una geometría paramétrica. `geo` = Ellipse | Rectangle | Triangle | Star | Polygon. */
function forma(nombre, geo, { id, x, y, rotation, scaleX, scaleY, opacity, w, h, ox = 0.5, oy = 0.5, geoAttrs = {}, paints }) {
  const g = `<${geo} ${attrs({ width: w, height: h, originX: ox, originY: oy, ...geoAttrs })} name="Path"/>`;
  return `<Shape ${attrs({ x, y, rotation, scaleX, scaleY, opacity })} name="${nombre}"${id ? ` id="${id}"` : ''}>${g}${paints}</Shape>`;
}

/** Shape con un PointsPath. `vertices` = [[x, y, radio?], ...] con vértices rectos. */
function trayecto(nombre, vertices, { id, x, y, rotation, scaleX, scaleY, opacity, cerrado = true, paints }) {
  const v = vertices
    .map(([vx, vy, r]) => `<StraightVertex ${attrs({ x: vx, y: vy, radius: r })}/>`)
    .join('');
  return `<Shape ${attrs({ x, y, rotation, scaleX, scaleY, opacity })} name="${nombre}"${id ? ` id="${id}"` : ''}><PointsPath isClosed="${cerrado}" name="Path">${v}</PointsPath>${paints}</Shape>`;
}

/** Grupo (Node). Recuerda: el PRIMER hijo se pinta ENCIMA. */
const grupo = (nombre, { id, x, y, rotation, scaleX, scaleY, opacity }, hijos) =>
  `<Node ${attrs({ x, y, rotation, scaleX, scaleY, opacity })} name="${nombre}"${id ? ` id="${id}"` : ''}>${hijos.join('')}</Node>`;

// ---------------------------------------------------------------------------
// Animación
// ---------------------------------------------------------------------------
const SUAVE = '<CubicEaseInterpolator x1="0.42" y1="0" x2="0.58" y2="1"/>';

/**
 * pistas: [{ obj: id, prop: 'y', k: [[frame, valor], ...], tipo?: 'cubic'|'linear'|'hold' }]
 * Cada keyframe suaviza (ease-in-out) el tramo hacia el siguiente.
 */
function animacion(nombre, id, duracion, loop, pistas) {
  const porObjeto = new Map();
  for (const p of pistas) {
    if (!porObjeto.has(p.obj)) porObjeto.set(p.obj, []);
    porObjeto.get(p.obj).push(p);
  }
  const cuerpo = [...porObjeto.entries()]
    .map(([obj, ps]) => {
      const props = ps
        .map(({ prop, k, tipo = 'cubic' }) => {
          const kfs = k
            .map(([frame, valor, tipoKey], i) => {
              const ultimo = i === k.length - 1;
              const t = ultimo ? 'linear' : (tipoKey ?? tipo);
              const interior = t === 'cubic' ? SUAVE : '';
              return `<KeyFrameDouble value="${valor}" frame="${frame}" interpolationType="${t}">${interior}</KeyFrameDouble>`;
            })
            .join('');
          return `<KeyedProperty property="${prop}">${kfs}</KeyedProperty>`;
        })
        .join('');
      return `<KeyedObject objectId="${obj}">${props}</KeyedObject>`;
    })
    .join('');
  return `<LinearAnimation loopValue="${loop}" duration="${duracion}" name="${nombre}" id="${id}">${cuerpo}</LinearAnimation>`;
}

// ---------------------------------------------------------------------------
// Máquina de estados (condiciones desde el view model)
// ---------------------------------------------------------------------------
const siTrigger = (vm, prop) =>
  `<TransitionViewModelCondition><TransitionPropertyViewModelComparator><BindablePropertyTrigger><DataBindContext sourcePathIds="${vm}-${prop}" propertyKey="686"/></BindablePropertyTrigger></TransitionPropertyViewModelComparator><TransitionValueTriggerComparator/></TransitionViewModelCondition>`;

const siBooleano = (vm, prop, valor) =>
  `<TransitionViewModelCondition><TransitionPropertyViewModelComparator><BindablePropertyBoolean><DataBindContext sourcePathIds="${vm}-${prop}" propertyKey="634"/></BindablePropertyBoolean></TransitionPropertyViewModelComparator><TransitionValueBooleanComparator value="${valor}"/></TransitionViewModelCondition>`;

/** Transición; `alTerminar` espera a que la animación llegue al 100 %. */
const transicion = (destino, { condicion = '', ms = 200, alTerminar = false } = {}) =>
  `<StateTransition ${attrs({
    stateToId: destino,
    duration: ms,
    enableExitTime: alTerminar ? 'true' : undefined,
    exitTimeIsPercetange: alTerminar ? 'true' : undefined,
    exitTime: alTerminar ? 100 : undefined,
  })}>${condicion}</StateTransition>`;

const estado = (id, animId, x, y, transiciones = []) =>
  `<AnimationState x="${x}" y="${y}" animationId="${animId}" id="${id}">${transiciones.join('')}</AnimationState>`;

function maquina(prefijo, inicial, estados) {
  return `<StateMachine name="Maquina" id="${ref(`${prefijo}.sm`)}"><StateMachineLayer name="Principal" id="${ref(`${prefijo}.capa`)}"><AnyState x="0" y="-160"/><ExitState x="600" y="-160"/><EntryState x="0" y="0">${transicion(inicial, { ms: 0 })}</EntryState>${estados.join('')}</StateMachineLayer></StateMachine>`;
}

// ===========================================================================
// 1) FLO — búho reclutador (200 x 200)
//    View model "Flo": triggers `celebrar` y `error`.
// ===========================================================================
function flo() {
  const vm = ref('flo.vm');
  const pCelebrar = ref('flo.vm.celebrar');
  const pError = ref('flo.vm.error');

  const ojo = (lado, x) =>
    grupo(`Ojo${lado}`, { id: ref(`flo.ojo${lado}`), x, y: -38 }, [
      forma('Brillo', 'Ellipse', { x: 4, y: -3, w: 5, h: 5, paints: relleno(C.blanco) }),
      forma('Pupila', 'Ellipse', { x: 1, y: 2, w: 14, h: 14, paints: relleno(C.tinta) }),
      forma('Aro', 'Ellipse', { w: 38, h: 38, paints: trazo(C.tinta, 3) }),
      forma('Blanco', 'Ellipse', { w: 32, h: 32, paints: relleno(C.blanco) }),
    ]);

  const cabeza = grupo('Cabeza', { id: ref('flo.cabeza'), y: 0 }, [
    forma('Pico', 'Triangle', { y: -18, w: 14, h: 12, rotation: 3.1415927, paints: relleno(C.coral) }),
    forma('MejillaIzq', 'Ellipse', { x: -38, y: -20, w: 12, h: 7, opacity: 0.55, paints: relleno(C.coral) }),
    forma('MejillaDer', 'Ellipse', { x: 38, y: -20, w: 12, h: 7, opacity: 0.55, paints: relleno(C.coral) }),
    forma('Puente', 'Rectangle', { y: -40, w: 10, h: 3, paints: relleno(C.tinta) }),
    ojo('Izq', -22),
    ojo('Der', 22),
    forma('PenachoIzq', 'Triangle', { x: -36, y: -76, w: 22, h: 26, rotation: -0.35, paints: relleno(C.petroleo) }),
    forma('PenachoDer', 'Triangle', { x: 36, y: -76, w: 22, h: 26, rotation: 0.35, paints: relleno(C.petroleo) }),
    forma('Craneo', 'Ellipse', { y: -36, w: 106, h: 84, paints: relleno(C.petroleoMedio) }),
  ]);

  const ala = (lado, x) =>
    grupo(`Ala${lado}`, { id: ref(`flo.ala${lado}`), x, y: -4 }, [
      forma('Pluma', 'Ellipse', { w: 26, h: 58, oy: 0.1, paints: relleno(C.petroleo) }),
    ]);

  const corbatin = grupo('Corbatin', { y: 2 }, [
    forma('Nudo', 'Ellipse', { w: 7, h: 7, paints: relleno(C.coral) }),
    forma('LazoIzq', 'Triangle', { x: -7, w: 12, h: 12, rotation: -1.5707964, paints: relleno(C.coral) }),
    forma('LazoDer', 'Triangle', { x: 7, w: 12, h: 12, rotation: 1.5707964, paints: relleno(C.coral) }),
  ]);

  const cuerpo = grupo('Flo', { id: ref('flo.raiz'), x: 100, y: 118 }, [
    cabeza,
    corbatin,
    ala('Izq', -46),
    ala('Der', 46),
    forma('Panza', 'Ellipse', { y: 24, w: 58, h: 62, paints: relleno(C.crema) }),
    forma('Cuerpo', 'Ellipse', { y: 14, w: 96, h: 100, paints: relleno(C.petroleoMedio) }),
    forma('PataIzq', 'Ellipse', { x: -16, y: 63, w: 18, h: 9, paints: relleno(C.coral) }),
    forma('PataDer', 'Ellipse', { x: 16, y: 63, w: 18, h: 9, paints: relleno(C.coral) }),
  ]);

  const sombra = forma('Sombra', 'Ellipse', {
    id: ref('flo.sombra'),
    x: 100,
    y: 188,
    w: 78,
    h: 12,
    paints: relleno('000000', '26'),
  });

  // --- Animaciones ---
  const raiz = ref('flo.raiz');
  const ojoI = ref('flo.ojoIzq');
  const ojoD = ref('flo.ojoDer');
  const alaI = ref('flo.alaIzq');
  const alaD = ref('flo.alaDer');
  const cab = ref('flo.cabeza');
  const somb = ref('flo.sombra');

  const parpadeo = [
    [0, 1],
    [96, 1],
    [101, 0.1],
    [106, 1],
    [120, 1],
  ];
  const reposo = animacion('Reposo', ref('flo.anim.reposo'), 120, 'loop', [
    { obj: raiz, prop: 'y', k: [[0, 118], [60, 114], [120, 118]] },
    { obj: somb, prop: 'scaleX', k: [[0, 1], [60, 0.92], [120, 1]] },
    { obj: ojoI, prop: 'scaleY', k: parpadeo },
    { obj: ojoD, prop: 'scaleY', k: parpadeo },
    { obj: alaI, prop: 'rotation', k: [[0, 0], [60, 0.08], [120, 0]] },
    { obj: alaD, prop: 'rotation', k: [[0, 0], [60, -0.08], [120, 0]] },
  ]);

  const feliz = [
    [0, 1],
    [6, 0.45],
    [50, 0.45],
    [60, 1],
  ];
  const celebrar = animacion('Celebrar', ref('flo.anim.celebrar'), 60, 'oneShot', [
    { obj: raiz, prop: 'y', k: [[0, 118], [14, 88], [28, 118], [38, 102], [48, 118], [60, 118]] },
    { obj: somb, prop: 'scaleX', k: [[0, 1], [14, 0.6], [28, 1], [38, 0.8], [48, 1], [60, 1]] },
    { obj: alaI, prop: 'rotation', k: [[0, 0], [10, 2.3], [20, 0.6], [32, 2.3], [46, 0], [60, 0]] },
    { obj: alaD, prop: 'rotation', k: [[0, 0], [10, -2.3], [20, -0.6], [32, -2.3], [46, 0], [60, 0]] },
    { obj: ojoI, prop: 'scaleY', k: feliz },
    { obj: ojoD, prop: 'scaleY', k: feliz },
  ]);

  const error = animacion('Error', ref('flo.anim.error'), 72, 'oneShot', [
    { obj: cab, prop: 'rotation', k: [[0, 0], [12, 0.22], [24, -0.18], [36, 0.12], [48, -0.06], [60, 0], [72, 0]] },
    { obj: raiz, prop: 'y', k: [[0, 118], [10, 122], [60, 122], [72, 118]] },
    { obj: alaI, prop: 'rotation', k: [[0, 0], [10, -0.25], [60, -0.25], [72, 0]] },
    { obj: alaD, prop: 'rotation', k: [[0, 0], [10, 0.25], [60, 0.25], [72, 0]] },
    { obj: ojoI, prop: 'scaleY', k: [[0, 1], [8, 0.7], [64, 0.7], [72, 1]] },
    { obj: ojoD, prop: 'scaleY', k: [[0, 1], [8, 0.7], [64, 0.7], [72, 1]] },
  ]);

  const eReposo = ref('flo.e.reposo');
  const eCelebrar = ref('flo.e.celebrar');
  const eError = ref('flo.e.error');
  const sm = maquina('flo', eReposo, [
    estado(eReposo, ref('flo.anim.reposo'), 200, 0, [
      transicion(eCelebrar, { condicion: siTrigger(vm, pCelebrar), ms: 120 }),
      transicion(eError, { condicion: siTrigger(vm, pError), ms: 120 }),
    ]),
    estado(eCelebrar, ref('flo.anim.celebrar'), 400, -100, [transicion(eReposo, { alTerminar: true, ms: 200 })]),
    estado(eError, ref('flo.anim.error'), 400, 100, [transicion(eReposo, { alTerminar: true, ms: 200 })]),
  ]);

  const artboard = `<Artboard x="0" y="0" width="200" height="200" styleId="${ref('flo.estilo')}" viewModelId="${vm}" viewModelInstanceId="${ref('flo.vm.default')}" defaultStateMachineId="${ref('flo.sm')}" name="Flo" id="${ref('flo.artboard')}"><LayoutComponentStyle name="Estilo" id="${ref('flo.estilo')}"/>${cuerpo}${sombra}${sm}${reposo}${celebrar}${error}</Artboard>`;

  const viewModel = `<ViewModel defaultInstanceId="${ref('flo.vm.default')}" name="Flo" id="${vm}"><ViewModelPropertyTrigger name="celebrar" id="${pCelebrar}"/><ViewModelPropertyTrigger name="error" id="${pError}"/><ViewModelInstance exports="true" name="Default" id="${ref('flo.vm.default')}"><ViewModelInstanceTrigger viewModelPropertyId="${pCelebrar}"/><ViewModelInstanceTrigger viewModelPropertyId="${pError}"/></ViewModelInstance></ViewModel>`;

  return { artboard, viewModel };
}

// ===========================================================================
// 2) ENVÍO — la hoja de vida (avión de papel) viaja a la nube (240 x 160)
//    View model "Envio": booleano `guardando`, triggers `exito` y `fallo`.
// ===========================================================================
function envio() {
  const vm = ref('env.vm');
  const pGuardando = ref('env.vm.guardando');
  const pExito = ref('env.vm.exito');
  const pFallo = ref('env.vm.fallo');

  const nube = grupo('Nube', { id: ref('env.nube'), x: 172, y: 62 }, [
    forma('Base', 'Rectangle', { y: 12, w: 96, h: 28, geoAttrs: { cornerRadiusTL: 14 }, paints: relleno('D3ECEF') }),
    forma('BolaIzq', 'Ellipse', { x: -24, y: 4, w: 44, h: 36, paints: relleno('D3ECEF') }),
    forma('BolaCentro', 'Ellipse', { x: 2, y: -6, w: 54, h: 50, paints: relleno('D3ECEF') }),
    forma('BolaDer', 'Ellipse', { x: 26, y: 6, w: 40, h: 32, paints: relleno('D3ECEF') }),
  ]);

  const insignia = (nombre, color, simbolo) =>
    grupo(nombre, { id: ref(`env.${nombre}`), x: 172, y: 64, scaleX: 0, scaleY: 0 }, [
      ...simbolo,
      forma('Circulo', 'Ellipse', { w: 34, h: 34, paints: relleno(color) }),
    ]);

  const check = insignia('Check', C.exito, [
    trayecto('Marca', [[-8, 0], [-2, 6], [9, -6]], { cerrado: false, paints: trazo(C.blanco, 4) }),
  ]);
  const equis = insignia('Equis', C.error, [
    forma('Barra1', 'Rectangle', { w: 4, h: 16, rotation: 0.7853982, geoAttrs: { cornerRadiusTL: 2 }, paints: relleno(C.blanco) }),
    forma('Barra2', 'Rectangle', { w: 4, h: 16, rotation: -0.7853982, geoAttrs: { cornerRadiusTL: 2 }, paints: relleno(C.blanco) }),
  ]);

  const avion = grupo('Avion', { id: ref('env.avion'), x: 52, y: 112, rotation: -0.35 }, [
    trayecto('Pliegue', [[-10, 0], [20, 0], [-18, 10]], { paints: relleno('D36B54') }),
    trayecto('Ala', [[-18, -10], [20, 0], [-10, 0], [-18, 10]], { paints: relleno(C.coral) }),
  ]);

  const estela = forma('Estela', 'Ellipse', {
    id: ref('env.estela'),
    x: 44,
    y: 136,
    w: 40,
    h: 6,
    paints: relleno('000000', '1F'),
  });

  // --- Animaciones ---
  const av = ref('env.avion');
  const nb = ref('env.nube');
  const ok = ref('env.Check');
  const ko = ref('env.Equis');
  const es = ref('env.estela');

  const reposo = animacion('Reposo', ref('env.anim.reposo'), 120, 'loop', [
    { obj: av, prop: 'x', k: [[0, 52], [120, 52]] },
    { obj: av, prop: 'y', k: [[0, 112], [60, 104], [120, 112]] },
    { obj: av, prop: 'rotation', k: [[0, -0.35], [60, -0.28], [120, -0.35]] },
    { obj: av, prop: 'opacity', k: [[0, 1], [120, 1]] },
    { obj: av, prop: 'scaleX', k: [[0, 1], [120, 1]] },
    { obj: av, prop: 'scaleY', k: [[0, 1], [120, 1]] },
    { obj: es, prop: 'opacity', k: [[0, 1], [120, 1]] },
    { obj: nb, prop: 'y', k: [[0, 62], [60, 58], [120, 62]] },
    { obj: ok, prop: 'scaleX', k: [[0, 0], [120, 0]] },
    { obj: ok, prop: 'scaleY', k: [[0, 0], [120, 0]] },
    { obj: ko, prop: 'scaleX', k: [[0, 0], [120, 0]] },
    { obj: ko, prop: 'scaleY', k: [[0, 0], [120, 0]] },
  ]);

  // Vuelo en bucle: despega, entra a la nube, reaparece abajo (invisible) y repite.
  const volando = animacion('Volando', ref('env.anim.volando'), 66, 'loop', [
    // El keyframe 44 es `hold`: el avión salta (invisible) al punto de partida.
    { obj: av, prop: 'x', k: [[0, 52], [44, 160, 'hold'], [45, 52], [66, 52]] },
    { obj: av, prop: 'y', k: [[0, 112], [18, 98], [44, 64, 'hold'], [45, 112], [66, 112]] },
    { obj: av, prop: 'rotation', k: [[0, -0.35], [30, -0.55], [44, -0.4, 'hold'], [45, -0.35], [66, -0.35]] },
    { obj: av, prop: 'scaleX', k: [[0, 1], [32, 0.85], [44, 0.35, 'hold'], [45, 1], [66, 1]] },
    { obj: av, prop: 'scaleY', k: [[0, 1], [32, 0.85], [44, 0.35, 'hold'], [45, 1], [66, 1]] },
    { obj: av, prop: 'opacity', k: [[0, 0], [8, 1], [38, 1], [44, 0], [66, 0]] },
    { obj: es, prop: 'opacity', k: [[0, 1], [22, 0.3], [44, 0], [58, 1], [66, 1]] },
    { obj: nb, prop: 'scaleX', k: [[0, 1], [44, 1], [50, 1.06], [58, 1], [66, 1]] },
    { obj: nb, prop: 'scaleY', k: [[0, 1], [44, 1], [50, 1.06], [58, 1], [66, 1]] },
    { obj: ok, prop: 'scaleX', k: [[0, 0], [66, 0]] },
    { obj: ok, prop: 'scaleY', k: [[0, 0], [66, 0]] },
    { obj: ko, prop: 'scaleX', k: [[0, 0], [66, 0]] },
    { obj: ko, prop: 'scaleY', k: [[0, 0], [66, 0]] },
  ]);

  const exito = animacion('Exito', ref('env.anim.exito'), 48, 'oneShot', [
    { obj: av, prop: 'opacity', k: [[0, 0], [48, 0]] },
    { obj: es, prop: 'opacity', k: [[0, 0], [48, 0]] },
    { obj: nb, prop: 'scaleX', k: [[0, 1], [10, 1.12], [22, 1], [48, 1]] },
    { obj: nb, prop: 'scaleY', k: [[0, 1], [10, 1.12], [22, 1], [48, 1]] },
    { obj: ok, prop: 'scaleX', k: [[0, 0], [8, 0], [20, 1.25], [30, 1], [48, 1]] },
    { obj: ok, prop: 'scaleY', k: [[0, 0], [8, 0], [20, 1.25], [30, 1], [48, 1]] },
    { obj: ko, prop: 'scaleX', k: [[0, 0], [48, 0]] },
    { obj: ko, prop: 'scaleY', k: [[0, 0], [48, 0]] },
  ]);

  // Rebote: el avión choca con la nube y cae de vuelta.
  const fallo = animacion('Fallo', ref('env.anim.fallo'), 60, 'oneShot', [
    { obj: av, prop: 'opacity', k: [[0, 1], [60, 1]] },
    { obj: av, prop: 'scaleX', k: [[0, 0.6], [30, 1], [60, 1]] },
    { obj: av, prop: 'scaleY', k: [[0, 0.6], [30, 1], [60, 1]] },
    { obj: av, prop: 'x', k: [[0, 140], [30, 70], [60, 60]] },
    { obj: av, prop: 'y', k: [[0, 72], [30, 124], [60, 124]] },
    { obj: av, prop: 'rotation', k: [[0, -0.4], [30, 0.6], [60, 0.5]] },
    { obj: es, prop: 'opacity', k: [[0, 0], [30, 1], [60, 1]] },
    { obj: nb, prop: 'x', k: [[0, 172], [6, 166], [12, 178], [18, 168], [24, 172], [60, 172]] },
    { obj: ko, prop: 'scaleX', k: [[0, 0], [10, 0], [22, 1.25], [32, 1], [60, 1]] },
    { obj: ko, prop: 'scaleY', k: [[0, 0], [10, 0], [22, 1.25], [32, 1], [60, 1]] },
    { obj: ok, prop: 'scaleX', k: [[0, 0], [60, 0]] },
    { obj: ok, prop: 'scaleY', k: [[0, 0], [60, 0]] },
  ]);

  const eReposo = ref('env.e.reposo');
  const eVolando = ref('env.e.volando');
  const eExito = ref('env.e.exito');
  const eFallo = ref('env.e.fallo');
  const aVolar = () => transicion(eVolando, { condicion: siBooleano(vm, pGuardando, 'true'), ms: 150 });
  const sm = maquina('env', eReposo, [
    estado(eReposo, ref('env.anim.reposo'), 200, 0, [
      aVolar(),
      // Por si el guardado termina antes de que la máquina vea `guardando = true`.
      transicion(eExito, { condicion: siTrigger(vm, pExito), ms: 100 }),
      transicion(eFallo, { condicion: siTrigger(vm, pFallo), ms: 100 }),
    ]),
    estado(eVolando, ref('env.anim.volando'), 400, 0, [
      transicion(eExito, { condicion: siTrigger(vm, pExito), ms: 100 }),
      transicion(eFallo, { condicion: siTrigger(vm, pFallo), ms: 100 }),
    ]),
    estado(eExito, ref('env.anim.exito'), 600, -100, [aVolar()]),
    estado(eFallo, ref('env.anim.fallo'), 600, 100, [aVolar()]),
  ]);

  const artboard = `<Artboard x="260" y="0" width="240" height="160" styleId="${ref('env.estilo')}" viewModelId="${vm}" viewModelInstanceId="${ref('env.vm.default')}" defaultStateMachineId="${ref('env.sm')}" name="Envio" id="${ref('env.artboard')}"><LayoutComponentStyle name="Estilo" id="${ref('env.estilo')}"/>${check}${equis}${nube}${avion}${estela}${sm}${reposo}${volando}${exito}${fallo}</Artboard>`;

  const viewModel = `<ViewModel defaultInstanceId="${ref('env.vm.default')}" name="Envio" id="${vm}"><ViewModelPropertyBoolean name="guardando" id="${pGuardando}"/><ViewModelPropertyTrigger name="exito" id="${pExito}"/><ViewModelPropertyTrigger name="fallo" id="${pFallo}"/><ViewModelInstance exports="true" name="Default" id="${ref('env.vm.default')}"><ViewModelInstanceBoolean propertyValue="false" viewModelPropertyId="${pGuardando}"/><ViewModelInstanceTrigger viewModelPropertyId="${pExito}"/><ViewModelInstanceTrigger viewModelPropertyId="${pFallo}"/></ViewModelInstance></ViewModel>`;

  return { artboard, viewModel };
}

// ===========================================================================
// 3) VACÍO — una lupa revisa una carpeta sin hojas de vida (220 x 170)
//    Sin datos: solo un bucle.
// ===========================================================================
function vacio() {
  const lupa = grupo('Lupa', { id: ref('vac.lupa'), x: 150, y: 78, rotation: 0 }, [
    forma('Reflejo', 'Ellipse', { x: -6, y: -6, w: 8, h: 8, opacity: 0.9, paints: relleno(C.blanco) }),
    forma('Aro', 'Ellipse', { w: 40, h: 40, paints: trazo(C.petroleo, 6) }),
    forma('Cristal', 'Ellipse', { w: 40, h: 40, opacity: 0.55, paints: relleno(C.blanco) }),
    forma('Mango', 'Rectangle', { x: 22, y: 22, w: 9, h: 28, rotation: -0.7853982, geoAttrs: { cornerRadiusTL: 4 }, paints: relleno(C.coral) }),
  ]);

  const carpeta = grupo('Carpeta', { id: ref('vac.carpeta'), x: 104, y: 112 }, [
    forma('Frente', 'Rectangle', { y: 10, w: 128, h: 66, geoAttrs: { cornerRadiusTL: 10 }, paints: relleno('A9DCE2') }),
    forma('Hoja', 'Rectangle', { id: ref('vac.hoja'), y: -16, w: 92, h: 56, rotation: -0.06, geoAttrs: { cornerRadiusTL: 4 }, paints: relleno(C.blanco) }),
    forma('Fondo', 'Rectangle', { y: -2, w: 120, h: 80, geoAttrs: { cornerRadiusTL: 10 }, paints: relleno('7CC6CF') }),
    forma('Pestana', 'Rectangle', { x: -38, y: -42, w: 44, h: 18, geoAttrs: { cornerRadiusTL: 6 }, paints: relleno('7CC6CF') }),
  ]);

  const sombra = forma('Sombra', 'Ellipse', { x: 104, y: 152, w: 120, h: 10, paints: relleno('000000', '1A') });

  const lp = ref('vac.lupa');
  const hoja = ref('vac.hoja');
  const buscar = animacion('Buscar', ref('vac.anim.buscar'), 180, 'loop', [
    { obj: lp, prop: 'x', k: [[0, 150], [60, 78], [120, 128], [180, 150]] },
    { obj: lp, prop: 'y', k: [[0, 78], [60, 90], [120, 66], [180, 78]] },
    { obj: lp, prop: 'rotation', k: [[0, 0], [60, -0.18], [120, 0.12], [180, 0]] },
    { obj: hoja, prop: 'y', k: [[0, -16], [90, -20], [180, -16]] },
  ]);

  const eBuscar = ref('vac.e.buscar');
  const sm = maquina('vac', eBuscar, [estado(eBuscar, ref('vac.anim.buscar'), 200, 0)]);

  const artboard = `<Artboard x="540" y="0" width="220" height="170" styleId="${ref('vac.estilo')}" defaultStateMachineId="${ref('vac.sm')}" name="Vacio" id="${ref('vac.artboard')}"><LayoutComponentStyle name="Estilo" id="${ref('vac.estilo')}"/>${lupa}${carpeta}${sombra}${sm}${buscar}</Artboard>`;
  return { artboard };
}

// ===========================================================================
// Ensamblar
// ===========================================================================
const piezas = [flo(), envio(), vacio()];
const rml = `<Rive version="1" kind="fragment">\n${piezas.map((p) => p.artboard).join('\n')}\n${piezas
  .map((p) => p.viewModel ?? '')
  .join('\n')}\n</Rive>\n`;

const destino = join(dirname(fileURLToPath(import.meta.url)), 'scene.rml');
writeFileSync(destino, rml);
console.log(`scene.rml generado (${ids.size} ids, ${rml.length} bytes)`);
