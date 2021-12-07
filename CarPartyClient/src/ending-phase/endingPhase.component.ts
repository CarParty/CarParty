import { Alignment, Fit, Layout, Rive } from 'rive-js';
import { Connection } from '../connection';
import Animation from './carhole.riv';
import css from './endingPhase.component.css';
import template from './endingPhase.component.html';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export class EndingPhaseComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;

  public connection?: Connection;

  static get observedAttributes(): string[] {
    return ['color'];
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
    if (!this.root) {
      console.error('root not found');
      return;
    }

    const riveAnimation = new Rive({
      src: Animation,
      canvas: this.shadow.getElementById('canvas'),
      autoplay: true
    });
    riveAnimation.layout = new Layout({ fit: Fit.Cover, alignment: Alignment.Center });
    console.log(riveAnimation);
  }

  private appendTextNode(value: string): void {
    const tag = document.createElement('p');
    tag.textContent = value;
    this.root?.appendChild(tag);
  }

  public attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    console.log(name, oldValue, newValue);
    switch (name) {
      case 'color':
        if (this.root) {
          this.root.style.backgroundColor = newValue;
        }
        break;
    }
  }

  public connectedCallback(): void { }

  public disconnectedCallback(): void { }
}

window.customElements.define('ending-phase', EndingPhaseComponent);

declare global {
  interface HTMLElementTagNameMap {
    'ending-phase': EndingPhaseComponent;
  }
}
