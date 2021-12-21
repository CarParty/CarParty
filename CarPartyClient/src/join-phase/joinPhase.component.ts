import { Connection } from '../connection';
import { DownloadModalComponent } from './download-modal/downloadModal.component';
import css from './joinPhase.component.css';
import template from './joinPhase.component.html';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export class JoinPhaseComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;
  private inputEl: HTMLInputElement;
  private buttonEl: HTMLButtonElement;
  private downloadButtonEl: HTMLButtonElement;
  private versionEl: HTMLDivElement;

  private downloadModal: DownloadModalComponent;
  private downloadModalContainer: HTMLElement | null;

  private roomId: string | null = null;

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

    this.inputEl = this.shadow.getElementById('roomcode') as HTMLInputElement;
    this.buttonEl = this.shadow.getElementById('submitButton') as HTMLButtonElement;
    this.downloadButtonEl = this.shadow.getElementById('downloadButton') as HTMLButtonElement;
    this.versionEl = this.shadow.getElementById('version') as HTMLDivElement;

    this.roomId = new URLSearchParams(window.location.search).get('room');

    this.downloadModal = this.shadow.getElementById('downloadModal') as DownloadModalComponent;
    this.downloadModalContainer = this.shadow.getElementById('downloadModalContainer');
    this.downloadModal.addEventListener('close', () => this.downloadModalContainer?.classList.remove('show'));

    this.root = shadow.getElementById('root');
    if (!this.root) {
      console.error('root not found');
      return;
    }

    this.buttonEl.addEventListener('click', this.submit);
    this.downloadButtonEl.addEventListener('click', () => this.downloadModalContainer?.classList.add('show'));
    this.inputEl.addEventListener('keypress', event => event.key === 'Enter' ? this.submit() : null);

    if (this.roomId) {
      console.log(this.roomId);
      this.appendTextNode(`using room id ${this.roomId}`);

      this.startConnection();
    }
  }

  private submit = () => {
    this.roomId = this.inputEl.value;
    this.startConnection();
  }

  private async startConnection(): Promise<void> {
    await this.connection?.connect();
    this.appendTextNode('websocket connected');
    this.enterRoom();
  }

  private async enterRoom(): Promise<void> {
    if (!this.roomId) {
      this.appendTextNode('invalid roomid - aborting');
      return;
    }
    const client_id = this.generateClientId();
    this.appendTextNode(`we are client ${client_id}`);
    this.appendTextNode('attempt to join room');
    this.connection?.send({ action: 'login_client', server_code: this.roomId.toUpperCase(), client_id });
  }

  private appendTextNode(value: string): void {
    const tag = document.createElement('p');
    tag.textContent = value;
    this.root?.appendChild(tag);
  }

  private generateClientId(): string {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    console.log(array[0]);
    return `${array[0]}`;
  }

  public connectedCallback(): void { }

  public disconnectedCallback(): void { }
}

window.customElements.define('join-phase', JoinPhaseComponent);

declare global {
  interface HTMLElementTagNameMap {
    'join-phase': JoinPhaseComponent;
  }
}
