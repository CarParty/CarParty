export class OverlayService {
  private static instance: OverlayService;

  private openModal?: (element: HTMLElement) => void;
  private openOverlay?: (element: HTMLElement) => void;
  private close?: () => void;

  private constructor() { }

  public static get Instance(): OverlayService {
    return this.instance || (this.instance = new this());
  }

  public openAsModal(element: HTMLElement): void {
    if (this.openModal) {
      this.openModal(element);
    }
  }

  public openAsOverlay(element: HTMLElement): void {
    if (this.openOverlay) {
      this.openOverlay(element);
    }
  }

  public closeOverlay(): void {
    if (this.close) {
      this.close();
    }
  }

  register({ openModal, openOverlay, close }: {
    openModal: (element: HTMLElement) => void,
    openOverlay: (element: HTMLElement) => void,
    close: () => void
  }): void {
    this.openModal = openModal;
    this.openOverlay = openOverlay;
    this.close = close;
  }
}
