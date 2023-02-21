import type { Handle, RequestEvent } from '@sveltejs/kit'

interface RouteGuard {
  path: RegExp | string | (string | RegExp)[]
  allow: (event: RequestEvent) => boolean
  redirectTo?: string
  onAllowFail?: (event: RequestEvent) => void
}

export type ProtectRoutesConfig = RouteGuard[]

const checkPath = (path: RegExp | string, pathname: string) =>
  typeof path === 'string' ? pathname === path : path.test(pathname)

export default function protectRoutes(config: ProtectRoutesConfig) {
  const handle: Handle = ({ event, resolve }) => {
    for (const rule of config) {
      console.debug(`Testing rule "${rule.path}" on path: ${event.url.pathname}`)
      const matched = Array.isArray(rule.path)
        ? rule.path.some((path) => checkPath(path, event.url.pathname))
        : checkPath(rule.path, event.url.pathname)

      if (matched) {
        console.debug(`   * Matched "${rule.path}" to path: ${event.url.pathname}`)
        if (!rule.allow(event)) {
          if (rule.onAllowFail) {
            rule.onAllowFail(event)
          } else {
            console.debug(`   * Redirecting to ${rule.redirectTo || '/'}`)
            return new Response(null, {
              status: 303,
              headers: {
                Location: rule.redirectTo || '/',
              },
            })
          }
        }
        break
      }
    }

    return resolve(event)
  }

  return handle
}
