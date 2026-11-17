import { useEffect, useState } from 'react'

export type Route =
  | { screen: 'menu' }
  | { screen: 'stats' }
  | { screen: 'lesson'; lessonId: string }

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '')
  if (path === 'stats') {
    return { screen: 'stats' }
  }
  if (path.startsWith('lesson/')) {
    const lessonId = path.slice('lesson/'.length)
    if (lessonId.length > 0) {
      return { screen: 'lesson', lessonId: decodeURIComponent(lessonId) }
    }
  }
  return { screen: 'menu' }
}

export function navigate(path: string): void {
  window.location.hash = path
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parseHash(window.location.hash),
  )

  useEffect(() => {
    const update = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  return route
}
