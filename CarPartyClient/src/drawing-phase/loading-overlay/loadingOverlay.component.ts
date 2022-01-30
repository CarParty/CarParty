import css from './loadingOverlay.component.css';
import template from './loadingOverlay.component.html';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export class LoadingOverlayComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private text1: HTMLParagraphElement;
  private text2: HTMLParagraphElement;

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
    this.text1 = this.shadow.getElementById('text1') as HTMLParagraphElement;
    this.text2 = this.shadow.getElementById('text2') as HTMLParagraphElement;
  }

  public updateStatus(text1: string, text2: string): void {
    this.text1.textContent = text1;
    this.text2.textContent = text2;
  }

  public close = () => {
    this.dispatchEvent(new CustomEvent('close'));
  }

  public attributeChangedCallback(name: string, oldValue: string, newValue: string): void { }

  public connectedCallback(): void { }

  public disconnectedCallback(): void { }
}

window.customElements.define('drawing-loading-overlay', LoadingOverlayComponent);

declare global {
  interface HTMLElementTagNameMap {
    'drawing-loading-overlay': LoadingOverlayComponent;
  }
}
