/* Render the handbook's Markdown diagrams locally; retain accessible source and isolate failures. */
function label(tag, key, fallback) {
  const element = document.createElement(tag);
  element.dataset.docsCopy = key;
  element.textContent = fallback;
  return element;
}

function loadMermaid(assets) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('vendor/mermaid-11.15.0.min.js', assets).href;
    script.onload = () => resolve(window.mermaid);
    script.onerror = () => reject(new Error('Diagram renderer unavailable'));
    document.head.append(script);
  });
}

export async function renderDiagrams(assets) {
  const blocks = [...document.querySelectorAll('pre > code.language-mermaid')];
  if (!blocks.length) return;
  const figures = blocks.map((code, index) => {
    const pre = code.parentElement;
    const figure = document.createElement('figure');
    figure.className = 'docs-diagram';
    figure.dataset.diagramState = 'loading';
    const caption = label('span', 'diagram', 'Diagram');
    caption.id = `docs-diagram-caption-${index}`;
    const header = document.createElement('figcaption'); header.className = 'docs-diagram-header';
    const fit = label('button', 'diagramFit', 'Fit to width');
    fit.type = 'button'; fit.setAttribute('aria-pressed', 'false');
    fit.addEventListener('click', () => {
      const fitted = figure.dataset.diagramFit !== 'true';
      figure.dataset.diagramFit = String(fitted); fit.setAttribute('aria-pressed', String(fitted));
    });
    header.append(caption, fit);
    const canvas = document.createElement('div');
    canvas.className = 'docs-diagram-canvas';
    canvas.setAttribute('aria-labelledby', caption.id);
    const status = label('p', 'diagramLoading', 'Rendering diagram…');
    status.setAttribute('role', 'status');
    const details = document.createElement('details');
    details.className = 'docs-diagram-source';
    details.append(label('summary', 'diagramSource', 'View diagram source'));
    pre.before(figure);
    details.append(pre);
    figure.append(header, status, canvas, details);
    return { figure, canvas, status, details, source: code.textContent, index };
  });
  let mermaid;
  try {
    mermaid = await loadMermaid(assets);
    mermaid.initialize({
      startOnLoad: false, securityLevel: 'strict', theme: 'base',
      fontFamily: 'Inter, system-ui, sans-serif', htmlLabels: false,
      themeVariables: { primaryColor: '#edf5ff', primaryTextColor: '#142943',
        primaryBorderColor: '#087ee2', lineColor: '#5c7087', secondaryColor: '#f6f9fd' },
    });
    await document.fonts.ready;
  } catch { /* Each diagram retains a useful source fallback below. */ }
  for (const item of figures) {
    try {
      if (!mermaid) throw new Error('Renderer unavailable');
      await mermaid.parse(item.source);
      const { svg } = await mermaid.render(`docs-mermaid-${item.index}`, item.source, item.canvas);
      // Mermaid's strict renderer sanitizes the SVG; never inject raw diagram source as HTML.
      item.canvas.innerHTML = svg;
      const image = item.canvas.querySelector('svg');
      image.setAttribute('role', 'img');
      image.setAttribute('aria-labelledby', `docs-diagram-caption-${item.index}`);
      image.style.width = `${image.viewBox.baseVal.width}px`;
      item.canvas.tabIndex = 0;
      item.status.remove();
      item.figure.dataset.diagramState = 'ready';
    } catch (error) {
      console.warn('Documentation diagram could not render', error);
      item.canvas.replaceChildren();
      item.details.open = true;
      item.status.dataset.docsCopy = 'diagramFailed';
      item.status.textContent = 'The diagram could not be rendered. Its source is available below.';
      item.figure.dataset.diagramState = 'failed';
    }
  }
}
