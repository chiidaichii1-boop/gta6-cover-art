// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos loaded;
// ?shot=cover shows the cover alone, drawn at its export size. Query parameters:
// size (square|portrait|wide), layout, grade, title, subtitle, photos (comma list of
// sample names), titleColor, titlePos. window.__shotReady is set once painted.
export async function runShot(shot, query, setupShot) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photos = query.get('photos');
  await setupShot({
    size: query.get('size') ?? 'square',
    layout: query.get('layout') ?? 'hero3',
    grade: query.get('grade') ?? 'sunset',
    title: query.get('title') ?? 'Sunset Run',
    subtitle: query.get('subtitle') ?? 'one last ride down the coast',
    titleColor: query.get('titleColor') ?? '#ffffff',
    titlePos: query.get('titlePos') ?? 'bottom',
    photos: photos ? photos.split(',') : ['pier', 'boulevard', 'friends-neon', 'man-rooftop'],
  });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
