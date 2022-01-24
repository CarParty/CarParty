import { Connection } from '../connection';
import { requestFullscreen } from '../fullscreenUtils';
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

  private confirmEmpty = false;

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
    this.inputEl.addEventListener('keypress', event => event.key === 'Enter' ? this.sendName() : null);

    const suppliedName = new URLSearchParams(window.location.search).get('name');
    if (suppliedName) {
      this.inputEl.value = suppliedName;
      setTimeout(this.sendName);
    }

    setTimeout(() => this.inputEl.focus());
  }

  private sendName = () => {
    // try to request full-screen
    requestFullscreen();

    let name = this.inputEl.value;
    if (!name || name.trim().length === 0) {
      if (!this.confirmEmpty) {
        this.buttonEl.textContent = 'Use default name?';
        this.buttonEl.classList.add('btn-warning');
        this.buttonEl.classList.remove('btn-primary');
        this.confirmEmpty = true;
        return;
      } else {
        name = 'Player';
      }
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
