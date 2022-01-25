import { Alignment, Fit, Layout, Rive } from 'rive-js';
import { Connection } from '../connection';
import { OverlayService } from '../overlay-manager/overlay.service';
import Animation from './carjump.riv';
import css from './waitingPhase.component.css';
import template from './waitingPhase.component.html';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export class WaitingPhaseComponent extends HTMLElement {
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

    // suggest rotation to landscape
    if (!window.matchMedia('(orientation: landscape)').matches) {
      OverlayService.Instance.openAsOverlay(document.createElement('rotate-overlay'));
    }
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

window.customElements.define('waiting-phase', WaitingPhaseComponent);

declare global {
  interface HTMLElementTagNameMap {
    'waiting-phase': WaitingPhaseComponent;
  }
}
