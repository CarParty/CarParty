import { Connection } from '../connection';
import css from './namingPhase.component.css';
import template from './namingPhase.component.html';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export class NamingPhaseComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;
  private inputEl: HTMLInputElement;
  private buttonEl: HTMLButtonElement;

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

    this.inputEl = this.shadow.getElementById('username') as HTMLInputElement;
    this.buttonEl = this.shadow.getElementById('submitButton') as HTMLButtonElement;

    this.root = shadow.getElementById('root');
    if (!this.root) {
      console.error('root not found');
      return;
    }

    this.buttonEl.addEventListener('click', this.sendName);

    // setTimeout(() => this.sendName()); // remove once godot prevents starting without everyone being ready
  }

  private sendName = () => {
    let name = this.inputEl.value;
    if (!name || name.trim().length === 0) {
      name = navigator.userAgent;
    }
    this.appendTextNode(`sending player name ${name}`);
    console.log('sending player name', this.connection);
    this.connection?.send({ action: 'player_name', name });
  }

  private appendTextNode(value: string): void {
    const tag = document.createElement('p');
    tag.textContent = value;
    this.root?.appendChild(tag);
  }

  public connectedCallback(): void { }

  public disconnectedCallback(): void { }
}

window.customElements.define('naming-phase', NamingPhaseComponent);

declare global {
  interface HTMLElementTagNameMap {
    'naming-phase': NamingPhaseComponent;
  }
}