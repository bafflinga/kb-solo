import type { Route } from './useHashRoute'

export function routeKey(route: Route): string {
  return route.screen === 'lesson' ? `lesson:${route.lessonId}` : route.screen
}
