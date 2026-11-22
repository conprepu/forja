import { ForjaDB } from '../../src/db/db'
import { seedDb } from '../../src/db/seed'

let n = 0

/** Base nueva y aislada (con seed) para cada test. */
export async function freshDb(seed = true): Promise<ForjaDB> {
  const db = new ForjaDB(`forja-test-${++n}-${Math.random().toString(36).slice(2)}`)
  await db.open()
  if (seed) await seedDb(db)
  return db
}

/** Prototipo con datos de todo tipo, con la forma real del estado S. */
export const protoState = () => ({
  core: {
    profile: { sex: 'm', age: 30, height: 178, weight: 80, act: 1.55, goal: 'ganar' },
    goals: { kcal: 2800, p: 170, c: 320, f: 80, water: 10 },
    rest: 120,
    routines: [
      { id: 'r1', name: 'Push', last: 1700000000000, ex: [{ eid: 'bench', sets: 4, reps: '5-8', rest: 150 }, { eid: 'ohp', sets: 3, reps: '', rest: 90 }] },
      { id: 'r2', name: 'Pull', ex: [{ eid: 'pull', sets: 0, reps: '6-10', rest: 90 }] },
    ],
    customEx: [
      { id: 'x1a', n: 'Press landmine', m: 'Hombros', eq: 'Barra', k: 'w', custom: 1 },
      { id: 'x2b', n: 'Dominada lastrada', m: 'Espalda', eq: '', k: 'bw', custom: 1 },
    ],
    customFoods: [{ id: 'cf1', n: 'Tamal de rajas', k: 190, p: 5, c: 24, f: 8, sg: 150, sl: '1 tamal' }],
    recents: ['b3', 'cf1'],
    meals: [
      {
        id: 'm1',
        n: 'Desayuno de siempre',
        items: [
          { id: 'e1', fid: 'b10', n: 'Huevo entero', g: 100, k: 143, p: 12.6, c: 0.7, f: 9.5 },
          { id: 'e2', fid: null, n: 'Agregado rápido', g: 0, k: 200, p: 10, c: 20, f: 5 },
        ],
      },
    ],
    body: [
      { d: '2026-11-01', w: 79.5 },
      { d: '2026-11-15', w: 80.2 },
    ],
    active: {
      id: 'a1',
      name: 'Push',
      rid: 'r1',
      start: 1700000500000,
      ex: [
        {
          eid: 'bench',
          rest: 150,
          reps: '5-8',
          note: 'cuidar hombro',
          sets: [
            { t: 'w', kg: '40', r: '10', done: true },
            { t: 'n', kg: '', r: '', done: false },
          ],
        },
      ],
    },
    u: 123,
  },
  w: {
    '2026-10': {
      items: [
        {
          id: 'w1',
          name: 'Push',
          rid: 'r1',
          start: 1698000000000,
          end: 1698003600000,
          prs: 1,
          ex: [
            {
              eid: 'bench',
              rest: 150,
              note: '',
              sets: [
                { t: 'w', kg: 40, r: 10 },
                { t: 'n', kg: 80, r: 5 },
                { t: 'd', kg: 60, r: 8 },
                { t: 'x', kg: 80, r: 7 },
              ],
            },
          ],
        },
      ],
      u: 1,
    },
    '2026-11': {
      items: [{ id: 'w2', name: 'Libre', start: 1700000000000, end: 1700001000000, ex: [{ eid: 'squat', sets: [{ t: 'n', kg: 100, r: 5 }] }] }],
      u: 2,
    },
  },
  f: {
    '2026-11': {
      days: {
        '2026-11-20': {
          m: {
            b: [{ id: 'd1', fid: 'b10', n: 'Huevo entero', g: 150, k: 215, p: 19, c: 1, f: 14.3 }],
            l: [{ id: 'd2', fid: 'cf1', n: 'Tamal de rajas', g: 150, k: 285, p: 7.5, c: 36, f: 12 }],
            d: [],
            s: [{ id: 'd3', fid: null, n: 'Agregado rápido', g: 0, k: 150, p: 3, c: 20, f: 6 }],
          },
          water: 6,
        },
        '2026-11-21': { m: { b: [], l: [], d: [], s: [] }, water: 0 },
      },
      u: 3,
    },
  },
})
