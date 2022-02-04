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
  private riveAnimation: Rive;

  public connection?: Connection;

  static get observedAttributes(): string[] {
    return ['color'];
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

    this.root = this.shadow.getElementById('root');

    // setup animation
    this.riveAnimation = new Rive({
      src: Animation,
      canvas: this.shadow.getElementById('canvas'),
      autoplay: true
    });
    this.riveAnimation.layout = new Layout({ fit: Fit.Cover, alignment: Alignment.Center });
    console.log(this.riveAnimation);
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
          // this.root.style.backgroundColor = newValue;
        }
        break;
    }
  }

  public connectedCallback(): void { }

  public disconnectedCallback(): void {
    this.riveAnimation.stop();
  }
}

window.customElements.define('ending-phase', EndingPhaseComponent);

declare global {
  interface HTMLElementTagNameMap {
    'ending-phase': EndingPhaseComponent;
  }
}
