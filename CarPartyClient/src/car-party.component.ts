import './acceleration/acceleration.component';
import { AccelerationComponent } from './acceleration/acceleration.component';
import template from './car-party.component.html';
import { Connection } from './connection';
import { JoinPhaseComponent } from './join-phase/joinPhase.component';
import { Phase } from './messages';
import { NamingPhaseComponent } from './naming-phase/namingPhase.component';
import { WaitingPhaseComponent } from './waiting-phase/waitingPhase.component';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

export type LocalPhase = Phase | 'join';

export class CarPartyComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;

  private currentPhaseView?: JoinPhaseComponent | NamingPhaseComponent | WaitingPhaseComponent | AccelerationComponent;

  private connection: Connection;

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

    this.root = shadow.getElementById('root');
    if (!this.root) {
      console.error('root not found');
      return;
    }

    this.connection.subscribe('phase_change', phase => {
      console.log('phase_change', phase);
      this.switchPhase(phase);
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
        this.currentPhaseView = document.createElement('join-phase');
        break;
      case Phase.racing:
        this.currentPhaseView = document.createElement('car-acceleration');
        break;
      case Phase.ending:
        this.currentPhaseView = document.createElement('join-phase');
        break;
      default:
        console.log('unmatched phase');
        this.currentPhaseView = document.createElement('join-phase');
    }
    console.log(this.currentPhaseView);
    this.currentPhaseView.classList.add('full-height');
    this.currentPhaseView.connection = this.connection;
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
