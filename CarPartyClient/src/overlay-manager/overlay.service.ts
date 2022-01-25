export class OverlayService {
  private static instance: OverlayService;

  private openModal?: (element: HTMLElement) => void;
  private openOverlay?: (element: HTMLElement) => void;

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

  register({ openModal, openOverlay }: { openModal: (element: HTMLElement) => void, openOverlay: (element: HTMLElement) => void }): void {
    this.openModal = openModal;
    this.openOverlay = openOverlay;
  }
}
