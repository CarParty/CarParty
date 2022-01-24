import template from './car-party.component.html';
import { Connection } from './connection';
import { DisconnectModalComponent } from './disconnect-modal/disconnectModal.component';
import { DrawingPhaseComponent } from './drawing-phase/drawingPhase.component';
import { EndingPhaseComponent } from './ending-phase/endingPhase.component';
import { JoinPhaseComponent } from './join-phase/joinPhase.component';
import { HexColor, Phase } from './messages';
import { NamingPhaseComponent } from './naming-phase/namingPhase.component';
import { RacingPhaseComponent } from './racing-phase/racingPhase.component';
import { WaitingPhaseComponent } from './waiting-phase/waitingPhase.component';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

export type LocalPhase = Phase | 'join';

export class CarPartyComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;

  private disconnectModal: DisconnectModalComponent;
  private disconnectModalContainer: HTMLElement | null;

  private currentPhaseView?: JoinPhaseComponent | NamingPhaseComponent | WaitingPhaseComponent | DrawingPhaseComponent | RacingPhaseComponent | EndingPhaseComponent;

  private connection: Connection;

  private carColor: HexColor | null = null;

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

    this.connection = new Connection();

    this.disconnectModal = this.shadow.getElementById('disconnectModal') as DisconnectModalComponent;
    this.disconnectModalContainer = this.shadow.getElementById('disconnectModalContainer');
    this.disconnectModal.addEventListener('close', () => this.disconnectModalContainer?.classList.remove('show'));

    this.root = shadow.getElementById('root');
    if (!this.root) {
      console.error('root not found');
      return;
    }

    this.connection.subscribeToClose(() => this.disconnectModalContainer?.classList.add('show'));

    this.connection.subscribe('phase_change', data => {
      console.log('phase_change', data.phase);
      this.switchPhase(data.phase);
    });

    this.connection.subscribe('color_transmission', data => {
      this.carColor = data.color;
      if (this.root) {
        this.root.style.backgroundColor = this.carColor;
      }
    });

    this.connection.subscribe('vibrate', data => {
      if (window.navigator.vibrate) {
        window.navigator.vibrate(data.pattern);
      }
    });

    this.switchPhase('join');
  }

  private switchPhase = (phase: LocalPhase) => {
    this.currentPhaseView?.remove();
    switch (phase) {
      case 'join':
        this.currentPhaseView = document.createElement('join-phase');
        break;
      case Phase.naming:
        this.currentPhaseView = document.createElement('naming-phase');
        break;
      case Phase.waiting:
        this.currentPhaseView = document.createElement('waiting-phase');
        break;
      case Phase.drawing:
        this.currentPhaseView = document.createElement('drawing-phase');
        break;
      case Phase.racing:
        this.currentPhaseView = document.createElement('racing-phase');
        break;
      case Phase.ending:
        this.currentPhaseView = document.createElement('ending-phase');
        break;
      default:
        console.log('unmatched phase');
        this.currentPhaseView = document.createElement('join-phase');
    }
    console.log(this.currentPhaseView);
    this.currentPhaseView.classList.add('full-height');
    this.currentPhaseView.connection = this.connection;
    if (this.carColor) {
      this.currentPhaseView.setAttribute('color', this.carColor);
    }
    this.root?.appendChild(this.currentPhaseView);
  }

  public connectedCallback(): void {
  }

  public disconnectedCallback(): void {
  }
}

window.customElements.define('car-party', CarPartyComponent);

declare global {
  interface HTMLElementTagNameMap {
    'car-party': CarPartyComponent;
  }
}
