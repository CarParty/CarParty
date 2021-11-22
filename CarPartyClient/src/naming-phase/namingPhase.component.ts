import { Connection } from '../connection';
import css from './namingPhase.component.css';
import template from './namingPhase.component.html';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;
cssContainer.id = 'transitionStyles';

export class NamingPhaseComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;

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
    link.href = `${(window as any).moodleOpaqueResourcePath ?? 'assets/'}styles.css`;
    this.shadow.appendChild(link);
    shadow.appendChild(templateEl.content.cloneNode(true));
    shadow.appendChild(cssContainer.cloneNode(true));

    this.root = shadow.getElementById('root');
    if (!this.root) {
      console.error('root not found');
      return;
    }

    setTimeout(() => this.sendName());
  }

  private async sendName(): Promise<void> {
    this.appendTextNode('sending player name');
    console.log('sending player name', this.connection);
    this.connection?.send({ action: 'player_name', name: navigator.userAgent });
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
