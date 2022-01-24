import { OverlayService } from './overlay.service';
import css from './overlayManager.component.css';
import template from './overlayManager.component.html';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export class OverlayManagerComponent extends HTMLElement {
  private shadow: ShadowRoot;

  private modalContainerEl: HTMLDivElement;
  private backdropEl: HTMLDivElement;

  private overlayEl?: HTMLElement;

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

    this.modalContainerEl = document.createElement('div');
    this.modalContainerEl.classList.add('overlay', 'slide-in-left', 'slide-in-left-center', 'top-50', 'w-100');
    this.shadow.appendChild(this.modalContainerEl);

    this.backdropEl = document.createElement('div');
    this.backdropEl.classList.add('backdrop', 'fade', 'd-none');
    this.backdropEl.addEventListener('click', this.closeModal);
    this.shadow.appendChild(this.backdropEl);

    OverlayService.Instance.register({
      openModal: element => {
        if (this.overlayEl) {
          this.overlayEl.remove();
        }
        this.overlayEl = element;
        this.overlayEl.classList.add('w-100');
        this.overlayEl.addEventListener('close', this.closeModal);
        this.modalContainerEl.appendChild(this.overlayEl);

        this.backdropEl.classList.remove('d-none');
        setTimeout(() => {
          this.backdropEl.classList.add('show');
          this.modalContainerEl.classList.add('show');
        }, 100);
      }
    });
  }

  private closeModal = () => {
    this.modalContainerEl.classList.remove('show');
    this.backdropEl.classList.remove('show');
    setTimeout(() => {
      this.backdropEl.classList.add('d-none');
      this.overlayEl?.remove();
    }, 500);
  }

  public attributeChangedCallback(name: string, oldValue: string, newValue: string): void { }

  public connectedCallback(): void { }

  public disconnectedCallback(): void { }
}

window.customElements.define('overlay-manager', OverlayManagerComponent);

declare global {
  interface HTMLElementTagNameMap {
    'overlay-manager': OverlayManagerComponent;
  }
}
