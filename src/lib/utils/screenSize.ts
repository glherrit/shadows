import { browser } from '$app/environment'

const screens = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

export function screenIs(size: 'sm' | 'md' | 'lg' | 'xl' | '2xl') {
  return browser ? window.matchMedia(`(min-width: ${screens[size]})`).matches : false
}

export function makeScreenIsFn() {
  const sizes = {
    '2xl': false,
    xl: false,
    lg: false,
    md: false,
    sm: true,
  }
  if (browser) {
    if (window.matchMedia(`(min-width: ${screens['2xl']})`).matches) {
      sizes['2xl'] = true
      sizes.xl = true
      sizes.lg = true
      sizes.md = true
    } else if (window.matchMedia(`(min-width: ${screens['xl']})`).matches) {
      sizes.xl = true
      sizes.lg = true
      sizes.md = true
    } else if (window.matchMedia(`(min-width: ${screens['lg']})`).matches) {
      sizes.lg = true
      sizes.md = true
    } else if (window.matchMedia(`(min-width: ${screens['md']})`).matches) {
      sizes.md = true
    }
  }
  return (size: 'sm' | 'md' | 'lg' | 'xl' | '2xl') => sizes[size]
}
