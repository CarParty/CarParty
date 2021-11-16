import './acceleration/acceleration.component';
import template from './car-party.component.html';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

export class CarPartyComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;

  static get observedAttributes(): string[] {
    return [];
  }

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'closed' });
    this.shadow = shadow;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${(window as any).moodleOpaqueResourcePath ?? 'assets/'}styles.css`;
    this.shadow.appendChild(link);
    shadow.appendChild(templateEl.content.cloneNode(true));

    this.root = shadow.getElementById('root');
    if (!this.root) {
      console.error('root not found');
      return;
    }
  }

  public connectedCallback(): void {
  }

  public disconnectedCallback(): void {
  }
}

window.customElements.define('car-party', CarPartyComponent);

declare global {
  interface HTMLElementTagNameMap {
    'car-party': CarPartyComponent;
  }
}
