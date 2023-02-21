import type { IconSource } from '@steeze-ui/svelte-icon/types'

// these icons use this struct match the IconSource format so we can use their Icon wrapper component

export const LensWithRays = {
  default: {
    a: {
      fill: 'none',
      viewBox: '0 0 24 24',
      stroke: 'currentColor',
    },
    path: [
      { d: 'M 0 6 L 6 6 24 12', fill: 'none', 'stroke-width': '1.3', 'stroke-linecap': 'round' },
      { d: 'M 0 18 L 6 18 24 12', fill: 'none', 'stroke-width': '1.3', 'stroke-linecap': 'round' },
      { d: 'M 0 12 L 6 12 24 12', fill: 'none', 'stroke-width': '1.5', 'stroke-linecap': 'round' },
      { d: 'M7,12a3,11 0 1,0 6,0a3,11 0 1,0 -6,0', fill: 'none', 'stroke-width': '2' },
    ],
  },
} as IconSource

export const EngineeringDrawing = {
  default: {
    a: {
      xmlns: 'http://www.w3.org/2000/svg',
      fill: 'none',
      viewBox: '0 0 24 24',
      stroke: 'currentColor',
    },
    rect: [
      {
        x: '1',
        y: '1',
        width: '22',
        height: '22',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
      },
    ],
    path: [
      { d: 'M 0 5 H 18 v -5', fill: 'none', 'stroke-width': '1' },
      { d: 'M 15 24 v -5 h 9', fill: 'none', 'stroke-width': '1' },
      { d: 'M 3 9 l 2 2 2 -2 2 2 2 -2 2 2', fill: 'none', 'stroke-width': '1' },
      { d: 'M 3 14 l 2 2 2 -2 2 2 2 -2 2 2', fill: 'none', 'stroke-width': '1' },
      { d: 'M16.5,12a1.5,4 0 1,0 3,0a1.5,4 0 1,0 -3,0', fill: 'currentColor' },
    ],
  },
} as IconSource
