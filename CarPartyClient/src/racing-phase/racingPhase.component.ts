import { Connection } from '../connection';
import './acceleration/acceleration.component';
import { AccelerationComponent } from './acceleration/acceleration.component';
import template from './racingPhase.component.html';
import css from './racingPhase.component.scss';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export class RacingPhaseComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;
  private accelerationEl: AccelerationComponent;
  private resetButtonEl: HTMLButtonElement;
  private driftButtonEl: HTMLButtonElement;

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

    this.accelerationEl = document.createElement('car-acceleration');
    this.accelerationEl.classList.add('full-height');
    this.accelerationEl.onThrottleChange = (value) => {
      this.connection?.send({ action: 'speed_change', value });
    };

    this.resetButtonEl = shadow.getElementById('resetButton') as HTMLButtonElement;
    this.resetButtonEl.addEventListener('click', this.reset);
    this.driftButtonEl = shadow.getElementById('driftButton') as HTMLButtonElement;
    this.driftButtonEl.addEventListener('mousedown', this.startDrift);
    this.driftButtonEl.addEventListener('mouseup', this.stopDrift);
    this.driftButtonEl.addEventListener('mouseleave', this.stopDrift);
    this.driftButtonEl.addEventListener('touchstart', this.startDrift);
    this.driftButtonEl.addEventListener('touchend', this.stopDrift);

    this.root = shadow.getElementById('root');
    if (!this.root) {
      console.error('root not found');
      return;
    }

    this.root.appendChild(this.accelerationEl);
  }

  private reset = (event: MouseEvent) => {
    this.connection?.send({ action: 'reset_car' });
  }

  private startDrift = (event: MouseEvent | TouchEvent) => {
    this.connection?.send({ action: 'drift_car', start: true });
  }

  private stopDrift = (event: MouseEvent | TouchEvent) => {
    this.connection?.send({ action: 'drift_car', start: false });
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

window.customElements.define('racing-phase', RacingPhaseComponent);

declare global {
  interface HTMLElementTagNameMap {
    'racing-phase': RacingPhaseComponent;
  }
}
