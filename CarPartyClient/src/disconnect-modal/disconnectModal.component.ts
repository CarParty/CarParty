import css from './disconnectModal.component.css';
import template from './disconnectModal.component.html';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export class DisconnectModalComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;
  private closeButtonEl: HTMLButtonElement;

  static get observedAttributes(): string[] {
    return [];
  }

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'closed' });
    this.shadow = shadow;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/styles.css';
    this.shadow.appendChild(link);
    shadow.appendChild(templateEl.content.cloneNode(true));
    shadow.appendChild(cssContainer.cloneNode(true));

    this.root = shadow.getElementById('root');
    this.closeButtonEl = shadow.getElementById('close') as HTMLButtonElement;
    this.closeButtonEl.addEventListener('click', this.close);
  }

  private close = () => {
    this.dispatchEvent(new CustomEvent('close'));
  }

  public attributeChangedCallback(name: string, oldValue: string, newValue: string): void { }

  public connectedCallback(): void { }

  public disconnectedCallback(): void { }
}

window.customElements.define('disconnect-modal', DisconnectModalComponent);

declare global {
  interface HTMLElementTagNameMap {
    'disconnect-modal': DisconnectModalComponent;
  }
}
