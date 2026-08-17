/** Click-to-load menus must not auto-open if Light Fire started or a newer click won. */
export function shouldOpenDeferredStartMenu(
  lightFireStarted: boolean,
  requestGen: number,
  currentGen: number,
): boolean {
  return !lightFireStarted && requestGen === currentGen;
}
