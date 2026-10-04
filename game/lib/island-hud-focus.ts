// Pointer clicks on transient game controls should not leave Space attached to
// that button. Tab/Space/Enter activation keeps normal keyboard accessibility.
export const GAME_HUD = '.header-actions, .game-toolbar, .equipment-hotbar, .fishing-panel, .jump-button, .interact-prompt, .sailing-panel, .touch-movement, .dive-controls, .chart-toggle, .fleet-toggle, .advancement-toggle, .coastal-shortcuts';
export const GAME_DIALOG = '[role="dialog"], [aria-modal="true"], .market-offer, .fleet-panel, .voyage-chart';

export function returnPointerFocusToGame(
  target: Pick<Element, 'closest'> | null,
  clickCount: number,
  canvas: Pick<HTMLElement, 'focus'> | null,
) {
  if (clickCount < 1 || !target || !canvas) return false;
  const button = target.closest('button');
  if (!button || button.hasAttribute('disabled') || button.closest(GAME_DIALOG) || !button.closest(GAME_HUD)) return false;
  canvas.focus({preventScroll: true});
  return true;
}
