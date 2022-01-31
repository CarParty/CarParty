import { Easing, Tween, update } from '@tweenjs/tween.js';
import template from './animatedSplash.component.html';
import css from './animatedSplash.component.scss';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export class AnimatedSplashComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;

  private pathEl: HTMLElement;
  private pathEls: HTMLElement[];
  private penEl: HTMLElement;
  private carEl: HTMLElement;
  private partyEl: HTMLElement;

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

    this.root = this.shadow.getElementById('root');
    this.pathEl = this.shadow.getElementById('path') as HTMLElement;
    this.pathEls = [
      this.shadow.getElementById('path0') as HTMLElement,
      this.shadow.getElementById('path1') as HTMLElement,
      this.shadow.getElementById('path2') as HTMLElement,
      this.shadow.getElementById('path3') as HTMLElement,
      this.shadow.getElementById('path4') as HTMLElement,
      this.shadow.getElementById('path5') as HTMLElement,
      this.shadow.getElementById('path6') as HTMLElement
    ];
    this.penEl = this.shadow.getElementById('pen') as HTMLElement;
    this.carEl = this.shadow.getElementById('car') as HTMLElement;
    this.partyEl = this.shadow.getElementById('party') as HTMLElement;

    // get the current time point to our tweening library (animation loop)
    function animate(time: number): void {
      requestAnimationFrame(animate);
      update(time);
    }
    requestAnimationFrame(animate);

    // setTimeout(() => this.ripplePath(), 1000);
    setTimeout(() => this.intro(), 1000);
  }

  private intro(): void {
    new Tween({ i: 0 }).to({ i: 100 }, 2000).onUpdate(upd => {
      this.penEl.style.transform = `translateZ(${-550 + upd.i * 5.5}px)`;
      this.pathEl.style.transform = `translateY(${550 - upd.i * 5.5}px)`;
      this.carEl.style.transform = `translateZ(${-550 + upd.i * 5.5}px)`;
    }).start()
      .onComplete(() => this.intro2());
  }

  private intro2(): void {
    new Tween({ i: 0 }).to({ i: 100 }, 2000).easing(
      Easing.Elastic.Out).onUpdate(upd => {
        this.partyEl.style.transform = `translateY(${-250 + upd.i * 2.5}px)`;
      }).start()
      .onComplete(() => setTimeout(() => this.ripplePath(), 1000));
  }


  private ripplePath(): void {
    console.log('rippleP');
    const posFunction = (time: number) => time <= 0 || time >= 2 * Math.PI ? 0 : Math.sin(time);

    new Tween({ i: 0 }).to({ i: 3 * Math.PI }, 7500).onUpdate(upd => {
      this.penEl.style.transform = `translateX(${posFunction(upd.i) * 90}px)`;
      this.pathEls.forEach((el, offset) => {
        el.style.transform = `translateX(${posFunction(upd.i - offset * 0.5) * 90}px)`;
      });
      this.carEl.style.transform = `translateX(${posFunction(upd.i - 3) * 90}px)`;
    }).start()
      .onComplete(() => setTimeout(() => this.ripplePath(), 1000));
  }

  public attributeChangedCallback(name: string, oldValue: string, newValue: string): void { }

  public connectedCallback(): void { }

  public disconnectedCallback(): void { }
}

window.customElements.define('animated-splash', AnimatedSplashComponent);

declare global {
  interface HTMLElementTagNameMap {
    'animated-splash': AnimatedSplashComponent;
  }
}
