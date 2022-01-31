import css from './instructionsOverlay.component.css';
import template from './instructionsOverlay.component.html';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export class InstructionsOverlayComponent extends HTMLElement {
  private shadow: ShadowRoot;

  static get observedAttributes(): string[] {
    return [];
  }

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'closed' });
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/styles.css';
    this.shadow.appendChild(link);
    this.shadow.appendChild(templateEl.content.cloneNode(true));
    this.shadow.appendChild(cssContainer.cloneNode(true));
    this.shadow.getElementById('root')?.addEventListener('click', this.close);
    this.shadow.addEventListener('click', this.close);
  }

  public close = () => {
    this.dispatchEvent(new CustomEvent('close'));
  }

  public attributeChangedCallback(name: string, oldValue: string, newValue: string): void { }

  public connectedCallback(): void { }

  public disconnectedCallback(): void { }
}

window.customElements.define('drawing-instructions-overlay', InstructionsOverlayComponent);

declare global {
  interface HTMLElementTagNameMap {
    'drawing-instructions-overlay': InstructionsOverlayComponent;
  }
}
