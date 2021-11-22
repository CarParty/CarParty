import { Connection } from '../connection';
import css from './acceleration.component.css';
import template from './acceleration.component.html';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;
cssContainer.id = 'transitionStyles';

export class AccelerationComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;

  private controlEl: HTMLDivElement;

  public connection?: Connection;

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

    this.controlEl = this.shadow.getElementById('control') as HTMLDivElement;
    this.controlEl.style.top = '45%';

    this.root = shadow.getElementById('root');
    if (!this.root) {
      console.error('root not found');
      return;
    }

    this.root.addEventListener('mousedown', event => this.onThrottleMove(event.clientY));
    this.root.addEventListener('mousemove', event => this.onThrottleMove(event.clientY));
    this.root.addEventListener('touchstart', event => this.onThrottleMove(event.touches[0].clientY));
    this.root.addEventListener('touchmove', event => this.onThrottleMove(event.touches[0].clientY));
  }

  private onThrottleMove(value: number): void {
    const throttle = value / window.innerHeight;
    this.controlEl.style.top = `${Math.max(5, Math.min(95, throttle * 100)) - 5}%`;
    this.connection?.send({ action: 'speed_change', value: throttle * -2 + 1 });
  }

  public connectedCallback(): void {
  }

  public disconnectedCallback(): void {
  }
}

window.customElements.define('car-acceleration', AccelerationComponent);

declare global {
  interface HTMLElementTagNameMap {
    'car-acceleration': AccelerationComponent;
  }
}
