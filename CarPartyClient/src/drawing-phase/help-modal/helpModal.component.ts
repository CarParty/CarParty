import css from './helpModal.component.css';
import template from './helpModal.component.html';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export class HelpModalComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;
  private closeButtonEl: HTMLButtonElement;
  private okButtonEl: HTMLButtonElement;

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
    this.okButtonEl = shadow.getElementById('ok') as HTMLButtonElement;
    this.okButtonEl.addEventListener('click', this.close);
  }

  private close = () => {
    this.dispatchEvent(new CustomEvent('close'));
  }

  public attributeChangedCallback(name: string, oldValue: string, newValue: string): void { }

  public connectedCallback(): void { }

  public disconnectedCallback(): void { }
}

window.customElements.define('help-modal', HelpModalComponent);

declare global {
  interface HTMLElementTagNameMap {
    'help-modal': HelpModalComponent;
  }
}
