import { Easing, Tween } from '@tweenjs/tween.js';
import { HexColor, Phase } from '../messages';
import { Connection } from './../connection';
import template from './animatedSplash.component.html';
import css from './animatedSplash.component.scss';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

export class AnimatedSplashComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;

  private sceneEl: HTMLElement;
  private pathEl: HTMLElement;
  private pathEls: HTMLElement[];
  private penEl: HTMLElement;
  private carEl: HTMLElement;
  private partyEl: HTMLElement;
  private paintBucketEl: HTMLElement;
  private splatEl: HTMLElement;
  private splatEls: HTMLElement[];
  private rampEl: HTMLElement;

  private currentTween?: Tween<any>;

  public connection?: Connection;
  private carColor: HexColor | null = '#f38054';
  private sideAndColor = false;

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
    this.sceneEl = this.shadow.getElementById('scene') as HTMLElement;
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
    this.paintBucketEl = this.shadow.getElementById('paintbucket') as HTMLElement;
    this.splatEl = this.shadow.getElementById('splat') as HTMLElement;
    this.splatEls = [
      this.shadow.getElementById('splat0') as HTMLElement,
      this.shadow.getElementById('splat1') as HTMLElement,
      this.shadow.getElementById('splat2') as HTMLElement,
      this.shadow.getElementById('splat3') as HTMLElement,
      this.shadow.getElementById('splat4') as HTMLElement,
      this.shadow.getElementById('splat5') as HTMLElement,
      this.shadow.getElementById('splat6') as HTMLElement,
      this.shadow.getElementById('splat7') as HTMLElement
    ];
    this.rampEl = this.shadow.getElementById('ramp') as HTMLElement;

    setTimeout(() => {
      this.connection?.subscribe('color_transmission', data => {
        this.carColor = data.color;
      });

      this.connection?.subscribe('phase_change', data => {
        console.log('phase_change', data.phase);
        if (data.phase === Phase.waiting) {
          if (!this.sideAndColor) {
            this.transitionToSide();
          }
        }
      });
    });

    if (!this.sideAndColor) {
      setTimeout(() => this.intro(), 1000);
      // setTimeout(() => this.transitionToSide(), 7000);
    } else {
      setTimeout(() => this.jump(), 1000);
    }
  }

  private intro(): void {
    this.currentTween = new Tween({ i: 0 }).to({ i: 100 }, 2000)
      .easing(Easing.Back.Out)
      .onUpdate(upd => {
        this.penEl.style.transform = `translateZ(${-550 + upd.i * 5.5}px)`;
        this.pathEl.style.transform = `translateY(${550 - upd.i * 5.5}px)`;
        this.carEl.style.transform = `translateZ(${-550 + upd.i * 5.5}px)`;
      }).start()
      .onComplete(() => this.intro2());
  }

  private intro2(): void {
    this.currentTween = new Tween({ i: -250 }).to({ i: 0 }, 2000)
      .easing(Easing.Elastic.Out)
      .onUpdate(upd => {
        this.partyEl.style.transform = `translateY(${upd.i}px)`;
      }).start()
      .onComplete(() => setTimeout(() => this.ripplePath(), 1000));
  }

  private ripplePath(): void {
    const posFunction = (time: number) => time <= 0 || time >= 2 * Math.PI ? 0 : Math.sin(time);

    this.currentTween = new Tween({ i: 0 }).to({ i: 3 * Math.PI }, 7500)
      .onUpdate(upd => {
        this.penEl.style.transform = `translateX(${posFunction(upd.i) * 90}px)`;
        this.pathEls.forEach((el, offset) => {
          el.style.transform = `translateX(${posFunction(upd.i - offset * 0.5) * 90}px)`;
        });
        this.carEl.style.transform = `translateX(${posFunction(upd.i - 3) * 90}px)`;
      }).repeat(Infinity).repeatDelay(1000).start();
  }

  private resetRipplePath(): void {
    this.currentTween?.stop();
    this.pathEl.style.transform = 'translateY(0px)';
    this.penEl.style.transform = 'translateX(0px)';
    this.pathEls.forEach((el, offset) => {
      el.style.transform = 'translateX(0px)';
    });
    this.carEl.style.transform = 'translateX(0px)';
  }

  private transitionToSide(): void {
    this.sceneEl.classList.add('enable-transitions');
    this.resetRipplePath();
    this.sceneEl.classList.add('side-rotation');
    this.sceneEl.classList.remove('default-rotation');
    this.penEl.style.transform = 'translateX(-90px) translateZ(40px)';
    this.carEl.style.transform = 'translateX(-80px)';
    new Tween({ x: 0, y: 0 }).to({ x: -520, y: -210 }, 3000)
      .onUpdate(upd => {
        this.partyEl.style.transform = `translateY(${upd.y}px) translateZ(${upd.x}px)`;
      }).delay(3000).start()
      .onStart(() => this.sceneEl.classList.remove('enable-transitions'))
      .onComplete(() => setTimeout(() => this.recolor(), 1000));
  }

  private recolor(): void {
    this.root?.style.setProperty('--new-car-color', this.carColor);
    this.splatEl.classList.remove('d-none');
    this.paintBucketEl.classList.remove('d-none');
    this.currentTween = new Tween({ x: 190 }).to({ x: 0 }, 2000)
      .onUpdate(upd => {
        this.paintBucketEl.style.transform = `translateZ(${upd.x}px)`;
      }).start()
      .onComplete(() => {
        this.paintBucketEl.classList.add('paintbucket-shaking');
        const velocities = [10, 27, 16, 9, 24, 18, 32, 13];
        this.currentTween = new Tween({ i: 0 }).to({ i: 50 }, 5000)
          .onUpdate(upd => {
            this.splatEls.forEach((el, index) => {
              el.style.transform = `translateY(${Math.min(0, -400 + upd.i * velocities[index])}px)`;
            });
          }).delay(1000).start()
          .onComplete(() => {
            this.paintBucketEl.classList.add('d-none');
            this.root?.style.setProperty('--car-color', this.carColor);
            this.splatEl.classList.add('clear');
            setTimeout(() => this.splatEl.classList.add('d-none'), 4000);
            this.sideAndColor = true;
            setTimeout(() => this.jump(), 4000);
          });
      });
  }

  private jump(): void {
    const rotFunction = (time: number) => time < 230 ? 0 : time > 325 ? (time <= 520 ? 19 : 19 - (time - 520) / (1500 - 520) * 19) : (time - 230) / (325 - 230) * 19;
    const heightFunction = (time: number) => time < 280 ? 0 : time < 320 ? (time - 280) / (320 - 280) * 10 : time > 550 ? (time <= 800 ? 120 : 140 - (time - 800) / (1500 - 800) * 140) : (time - 320) / (550 - 320) * 140;
    this.currentTween = new Tween({ i: 0 }).to({ i: 1500 }, 5000)
      .onUpdate(upd => {
        this.carEl.style.transform = `rotateX(${rotFunction(upd.i)}deg) translateY(-${heightFunction(upd.i)}px) translateX(-80px)`;
        this.rampEl.style.transform = `translateZ(${410 - upd.i}px)`;
      }).repeat(Infinity).repeatDelay(5000).start()
      .onStart(() => {
        this.rampEl.style.transform = 'translateZ(410px)';
        this.rampEl.classList.remove('d-none');
        this.sceneEl.classList.add('enable-fast-transitions');
      })
      .onComplete(() => {
        this.rampEl.classList.add('d-none');
        this.sceneEl.classList.remove('enable-fast-transitions');
      });
  }

  public attributeChangedCallback(name: string, oldValue: string, newValue: string): void { }

  public connectedCallback(): void { }

  public disconnectedCallback(): void {
    this.currentTween?.stop();
  }
}

window.customElements.define('animated-splash', AnimatedSplashComponent);

declare global {
  interface HTMLElementTagNameMap {
    'animated-splash': AnimatedSplashComponent;
  }
}
