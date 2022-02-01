import { AnimatedSplashComponent } from './animated-splash/animatedSplash.component';
import template from './car-party.component.html';
import css from './car-party.component.scss';
import { Connection } from './connection';
import { DrawingPhaseComponent } from './drawing-phase/drawingPhase.component';
import { EndingPhaseComponent } from './ending-phase/endingPhase.component';
import { JoinPhaseComponent } from './join-phase/joinPhase.component';
import { HexColor, Phase } from './messages';
import { NamingPhaseComponent } from './naming-phase/namingPhase.component';
import { OverlayService } from './overlay-manager/overlay.service';
import { RacingPhaseComponent } from './racing-phase/racingPhase.component';
import { WaitingPhaseComponent } from './waiting-phase/waitingPhase.component';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export type LocalPhase = Phase | 'join';

export class CarPartyComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;
  private dividerEl: HTMLDivElement;
  private outletSmallEl: HTMLDivElement;

  private splashEl: AnimatedSplashComponent;
  private currentPhaseView?: JoinPhaseComponent | NamingPhaseComponent | WaitingPhaseComponent | DrawingPhaseComponent | RacingPhaseComponent | EndingPhaseComponent;

  private connection: Connection;

  private carColor: HexColor | null = null;

  static get observedAttributes(): string[] {
    return [];
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

    this.connection = new Connection();

    this.dividerEl = this.shadow.getElementById('divider') as HTMLDivElement;
    this.outletSmallEl = this.shadow.getElementById('outletSmall') as HTMLDivElement;
    this.splashEl = this.shadow.getElementById('splash') as AnimatedSplashComponent;

    this.root = this.shadow.getElementById('root');
    if (!this.root) {
      console.error('root not found');
      return;
    }

    this.connection.subscribeToClose(() => OverlayService.Instance.openAsModal(document.createElement('disconnect-modal')));

    this.connection.subscribe('phase_change', data => {
      console.log('phase_change', data.phase);
      this.switchPhase(data.phase);
    });

    this.connection.subscribe('color_transmission', data => {
      this.carColor = data.color;
      if (this.root) {
        // this.root.style.backgroundColor = this.carColor;
      }
    });

    this.connection.subscribe('vibrate', data => {
      if (window.navigator.vibrate) {
        window.navigator.vibrate(data.pattern);
      }
    });

    this.splashEl.connection = this.connection;

    this.switchPhase('join');
  }

  private switchPhase = (phase: LocalPhase) => {
    this.currentPhaseView?.remove();
    let useLargeOutlet = true;
    switch (phase) {
      case 'join':
        this.currentPhaseView = document.createElement('join-phase');
        useLargeOutlet = false;
        break;
      case Phase.naming:
        this.currentPhaseView = document.createElement('naming-phase');
        useLargeOutlet = false;
        break;
      case Phase.waiting:
        this.currentPhaseView = document.createElement('waiting-phase');
        useLargeOutlet = false;
        break;
      case Phase.drawing:
        this.currentPhaseView = document.createElement('drawing-phase');
        break;
      case Phase.racing:
        this.currentPhaseView = document.createElement('racing-phase');
        break;
      case Phase.ending:
        this.currentPhaseView = document.createElement('ending-phase');
        useLargeOutlet = false;
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
    if (useLargeOutlet) {
      this.dividerEl.classList.add('d-none');
      this.root?.appendChild(this.currentPhaseView);
    } else {
      this.dividerEl.classList.remove('d-none');
      this.outletSmallEl.appendChild(this.currentPhaseView);
    }
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
