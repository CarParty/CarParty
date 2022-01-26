import template from './animatedSplash.component.html';
import css from './animatedSplash.component.scss';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export class AnimatedSplashComponent extends HTMLElement {
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
    link.href = 'assets/styles.css';
    this.shadow.appendChild(link);
    shadow.appendChild(templateEl.content.cloneNode(true));
    shadow.appendChild(cssContainer.cloneNode(true));

    this.root = shadow.getElementById('root');
  }

  public attributeChangedCallback(name: string, oldValue: string, newValue: string): void { }

  public connectedCallback(): void { }

  public disconnectedCallback(): void { }
}

window.customElements.define('animated-splash', AnimatedSplashComponent);

declare global {
  interface HTMLElementTagNameMap {
    'animated-splash': AnimatedSplashComponent;
  }
}
