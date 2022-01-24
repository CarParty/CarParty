export class OverlayService {
  private static instance: OverlayService;

  private openModal?: (element: HTMLElement) => void;

  private constructor() { }

  public static get Instance(): OverlayService {
    return this.instance || (this.instance = new this());
  }

  public openAsModal(element: HTMLElement): void {
    if (this.openModal) {
      this.openModal(element);
    }
  }

  register({ openModal }: { openModal: (element: HTMLElement) => void }): void {
    this.openModal = openModal;
    console.log('openModal', this.openModal);
  }
}
