import { Tween, update } from '@tweenjs/tween.js';
import { Connection } from '../connection';
import css from './drawingPhase.component.css';
import template from './drawingPhase.component.html';
import { Chunk, Point, Polygon, Rectangle, Track } from './track';
import * as transportTrack from './transportTrack';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

const startsWith = <T extends string>(str: string, search: T): str is `${T}${string}` => str.startsWith(search);
const endsWith = <T extends string>(str: string, search: T): str is `${string}${T}` => str.endsWith(search);
const includes = <T extends string>(str: string, search: T): str is `${string}${T}${string}` => str.includes(search);

export class DrawingPhaseComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;
  private svgRoot: SVGSVGElement;
  private pathEl: SVGPathElement;
  private currentPosMarkerEl: SVGCircleElement;
  private redrawButtonEl: HTMLButtonElement;

  public connection?: Connection;
  private track: Track | null = null;
  private trackBoundingBox: Rectangle | null = null;
  private isDrawing = false;
  private drawingEnabled = false;
  private partialPaths: Map<string, Point[]> = new Map<string, Point[]>();
  private currentPartialPath: Point[] = [];
  private currentChunk: Chunk | null = null;
  private initialChunk: Chunk | null = null;
  private complete = false;

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

    // this.track = this.convertTransportTrack(TEST_TRACK);

    this.root = shadow.getElementById('root');
    this.svgRoot = shadow.getElementById('svgtrack') as any as SVGSVGElement;

    this.pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.pathEl.style.stroke = 'green';
    this.pathEl.style.strokeWidth = '5';
    this.pathEl.style.fill = 'none';
    this.svgRoot.appendChild(this.pathEl);

    this.currentPosMarkerEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.currentPosMarkerEl.style.stroke = 'green';
    this.currentPosMarkerEl.style.strokeWidth = '5';
    this.currentPosMarkerEl.style.fill = 'green';
    this.currentPosMarkerEl.setAttribute('r', '15');
    this.svgRoot.appendChild(this.currentPosMarkerEl);

    this.redrawButtonEl = shadow.getElementById('redrawButton') as HTMLButtonElement;
    this.redrawButtonEl.addEventListener('click', this.resetCurrentPartialPath);

    if (!this.svgRoot) {
      console.error('root not found');
      return;
    }

    // get the current time point to our tweening library
    function animate(time: number): void {
      requestAnimationFrame(animate);
      update(time);
    }
    requestAnimationFrame(animate);

    setTimeout(() => {
      this.connection?.subscribe('track_transmission', (data) => {
        this.setupTrack(data.track);
      });
      this.connection?.send({ action: 'ready_for_track_json' });
    });

    console.log('t', this.svgRoot);
    /*for (const [key, chunk] of Object.entries(TEST_TRACK)) {
      console.log(key);
      for (const triangle of chunk.Road) {
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.style.fill = 'none';
        poly.style.stroke = 'black';
        poly.style.strokeWidth = '1';
        triangle.forEach(([x, y]) => {
          const svgPoint = this.svgRoot.createSVGPoint();
          svgPoint.x = x * 20 + 500;
          svgPoint.y = y * 20 + 500;
          poly.points.appendItem(svgPoint);
        });
        this.svgRoot.appendChild(poly);
      }
      const areaMarker = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      areaMarker.style.fill = 'none';
      areaMarker.style.stroke = 'red';
      areaMarker.style.strokeWidth = '1';
      areaMarker.x.baseVal.value = chunk.Area.position[0] * 20 + 500;
      areaMarker.y.baseVal.value = chunk.Area.position[1] * 20 + 500;
      areaMarker.width.baseVal.value = chunk.Area.size[0] * 20;
      areaMarker.height.baseVal.value = chunk.Area.size[1] * 20;
      this.svgRoot.appendChild(areaMarker);
      const finishKey = Object.keys(chunk).filter(k => startsWith(k, 'Finish#'))[0];
      if (startsWith(finishKey, 'Finish#')) { // true by design, just for typecheck
        const finishMarker = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        finishMarker.style.fill = 'none';
        finishMarker.style.stroke = 'blue';
        finishMarker.style.strokeWidth = '1';
        finishMarker.x.baseVal.value = chunk[finishKey].position[0] * 20 + 500;
        finishMarker.y.baseVal.value = chunk[finishKey].position[1] * 20 + 500;
        finishMarker.width.baseVal.value = chunk[finishKey].size[0] * 20;
        finishMarker.height.baseVal.value = chunk[finishKey].size[1] * 20;
        this.svgRoot.appendChild(finishMarker);
      }
    }*/

    this.svgRoot.addEventListener('mousedown', event => {
      if (this.drawingEnabled) {
        console.log(event.clientX, event.clientY);
        this.isDrawing = true;
        const point = this.screenToSvg({ x: event.clientX, y: event.clientY });
        if (this.pointInCurrentChunk(point)) {
          this.currentPartialPath.push(point);
          this.drawPath();
        }
      }
    });
    this.svgRoot.addEventListener('mousemove', event => {
      if (this.drawingEnabled && this.isDrawing) {
        console.log(event.clientX, event.clientY);
        const point = this.screenToSvg({ x: event.clientX, y: event.clientY });
        if (this.pointInCurrentChunk(point)) {
          this.currentPartialPath.push(point);
          this.drawPath();
        }
      }
    });
    this.svgRoot.addEventListener('mouseup', event => {
      console.log('mouseup');
      this.isDrawing = false;
      const svg = this.screenToSvg({ x: event.clientX, y: event.clientY });
      if (this.currentChunk?.finish.boundingBox) {
        const box = this.currentChunk.finish.boundingBox;
        if (box.x1 <= svg.x && svg.x <= box.x2 && box.y1 <= svg.y && svg.y <= box.y2) {
          this.moveToNextChunk();
        }
      }
    });
    this.svgRoot.addEventListener('mouseleave', event => {
      console.log('mouseleave');
      this.isDrawing = false;
    });

    this.svgRoot.addEventListener('touchstart', event => {
      if (this.drawingEnabled) {
        console.log(event.touches[0].clientX, event.touches[0].clientY);
        this.isDrawing = true;
        const point = this.screenToSvg({ x: event.touches[0].clientX, y: event.touches[0].clientY });
        if (this.pointInCurrentChunk(point)) {
          this.currentPartialPath.push(point);
          this.drawPath();
        }
      }
    });
    this.svgRoot.addEventListener('touchmove', event => {
      if (this.drawingEnabled && this.isDrawing) {
        console.log(event.touches[0].clientX, event.touches[0].clientY);
        const point = this.screenToSvg({ x: event.touches[0].clientX, y: event.touches[0].clientY });
        if (this.pointInCurrentChunk(point)) {
          this.currentPartialPath.push(point);
          this.drawPath();
        }
      }
    });
    this.svgRoot.addEventListener('touchend', event => {
      console.log('touchend');
      this.isDrawing = false;
      const svg = this.currentPartialPath[this.currentPartialPath.length - 1];
      if (this.currentChunk?.finish.boundingBox) {
        const box = this.currentChunk.finish.boundingBox;
        if (box.x1 <= svg.x && svg.x <= box.x2 && box.y1 <= svg.y && svg.y <= box.x2) {
          this.moveToNextChunk();
        }
      }
    });
    this.svgRoot.addEventListener('touchcancel', event => {
      console.log('touchcancel');
      this.isDrawing = false;
    });
  }

  private setupTrack(track: transportTrack.Track): void {
    this.track = this.convertTransportTrack(track);

    this.track.forEach(chunk => console.log(chunk.road.length));
    this.optimizeTrack(this.track);
    this.transformCoordinateSystem(this.track);
    this.track.forEach(chunk => console.log(chunk.road.length));
    console.log(this.track);

    // compute initial view area fragment
    const boundingBoxes: Rectangle[] = [];
    this.track.forEach(chunk => boundingBoxes.push(chunk.boundingBox));
    this.trackBoundingBox = boundingBoxes.reduce((r1, r2) => ({
      x1: Math.min(r1.x1, r2.x1),
      y1: Math.min(r1.y1, r2.y1),
      x2: Math.max(r1.x2, r2.y2),
      y2: Math.max(r1.y2, r2.y2)
    }));
    this.zoomToBox(this.trackBoundingBox);

    // setTimeout(() => this.zoomToBox(this.track.get('Area1')?.boundingBox ?? { x1: -500, y1: -1500, x2: 500, y2: 0 }), 4000);
    // setTimeout(() => this.zoomToBox(this.track.get('Area2')?.boundingBox ?? { x1: -500, y1: -1500, x2: 500, y2: 0 }), 8000);
    // setTimeout(() => this.zoomToBox(this.track.get('Area1')?.boundingBox ?? { x1: -500, y1: -1500, x2: 500, y2: 0 }), 12000);
    // setTimeout(() => this.zoomToBox(this.track.get('Area2')?.boundingBox ?? { x1: -500, y1: -1500, x2: 500, y2: 0 }), 16000);

    this.drawTrack();

    setTimeout(() => this.startTrackDrawing(), 4000);
  }

  private resetCurrentPartialPath = () => {
    if (this.currentChunk) {
      if (this.currentChunk === this.initialChunk) {
        const startBox = this.initialChunk.start?.finish.boundingBox ?? this.initialChunk.boundingBox;
        this.currentPartialPath = [{
          x: 0.5 * (startBox.x1 + startBox.x2),
          y: 0.5 * (startBox.y1 + startBox.y2)
        }];
      } else {
        this.currentPartialPath = [];
      }
      this.partialPaths.set(this.currentChunk.name, this.currentPartialPath);
      this.drawPath();
    }
  }

  private screenToSvg(screen: Point): Point {
    // ok, so in theory this *could* be simple
    // screen position is a value [0, MAX_SCREEN],
    // which should be mapped to a value [MIN_SVG, MAX_SVG]
    // this is then a simple rescale and shift: MIN_SVG + position / MAX_SCREEN * (MAX_SVG - MIN_SVG)
    // BUT:
    // [MIN_SVG, MAX_SVG] might not actually be where we expect them to be
    // we set the svg viewbox to the boundingbox of the current chunk,
    // when the view area is larger (wider or taller), it includes some additional stuff not included in the boundingbox
    // then we might need to map to [MIN_SVG-epsilon, MAX_SVG+epsilon]
    // thus we first figure out in which direction we are larger
    // and afterwards compute how much we are larger
    const targetAspectRatio = this.svgRoot.viewBox.baseVal.width / this.svgRoot.viewBox.baseVal.height;
    const actualAspectRatio = this.svgRoot.clientWidth / this.svgRoot.clientHeight;

    const compensation = { x: 0, y: 0 };
    if (targetAspectRatio - actualAspectRatio < 0) {
      // wider than expected
      const actualSvgWidth = this.svgRoot.viewBox.baseVal.height * actualAspectRatio;
      const svgTooWide = actualSvgWidth - this.svgRoot.viewBox.baseVal.width;
      compensation.x = svgTooWide;
    } else {
      // taller than expected
      const actualSvgHeight = this.svgRoot.viewBox.baseVal.width / actualAspectRatio;
      const svgTooTall = actualSvgHeight - this.svgRoot.viewBox.baseVal.height;
      compensation.y = svgTooTall;
    }

    return {
      x: this.svgRoot.viewBox.baseVal.x - compensation.x / 2
        + screen.x / this.svgRoot.clientWidth * (this.svgRoot.viewBox.baseVal.width + compensation.x),
      y: this.svgRoot.viewBox.baseVal.y - compensation.y / 2
        + screen.y / this.svgRoot.clientHeight * (this.svgRoot.viewBox.baseVal.height + compensation.y)
    };
  }

  private pointInCurrentChunk(point: Point): boolean {
    if (!this.currentChunk) {
      return false;
    }
    return this.currentChunk.road.some(poly => this.pointInPolygon(point, poly));
  }

  private pointInPolygon(point: Point, polygon: Polygon): boolean {
    let posSign = 0;
    let negSign = 0;

    for (let i = 0; i < polygon.length; i++) {
      const polyPoint = polygon[i];
      if (point.x === polyPoint.x && point.y === polyPoint.y) {
        return true;
      }

      const polyPoint2 = polygon[(i + 1) % polygon.length];

      // cross product
      const d = (point.x - polyPoint.x) * (polyPoint2.y - polyPoint.y) - (point.y - polyPoint.y) * (polyPoint2.x - polyPoint.x);

      if (d > 0) { posSign++; }
      if (d < 0) { negSign++; }

      // both signs present -> point outside
      if (posSign > 0 && negSign > 0) {
        return false;
      }
    }

    return true;
  }

  private async startTrackDrawing(): Promise<void> {
    if (!this.track) {
      return;
    }

    this.initialChunk = this.track.values().next().value;
    if (!this.initialChunk) {
      return;
    }
    this.currentChunk = this.initialChunk;
    await this.zoomToBox(this.currentChunk.boundingBox);

    this.resetCurrentPartialPath();

    this.drawingEnabled = true;
  }

  private async moveToNextChunk(): Promise<void> {
    this.drawingEnabled = false;
    this.isDrawing = false;

    this.currentChunk = this.currentChunk?.finish.from ?? null;
    if (!this.currentChunk) {
      return;
    }
    if (this.currentChunk === this.initialChunk) {
      // done, got full path
      this.complete = true;
      this.currentChunk = null;

      /*// add first position to close loop (only visually? - check if the others want this position)
      const startBox = this.initialChunk.start?.finish.boundingBox ?? this.initialChunk.boundingBox;
      this.currentPartialPath.push({
        x: 0.5 * (startBox.x1 + startBox.x2),
        y: 0.5 * (startBox.y1 + startBox.y2)
      });*/
      this.drawPath();

      // zoom out
      if (this.trackBoundingBox) {
        this.zoomToBox(this.trackBoundingBox);
      }

      this.connection?.send({
        action: 'path_transmission',
        path: this.convertPath(this.partialPaths)
      });
    } else {
      await this.zoomToBox(this.currentChunk.boundingBox);

      this.resetCurrentPartialPath();

      this.drawingEnabled = true;
    }
  }

  private drawPath(): void {
    const pathFragmentCollector: Point[][] = [];
    this.partialPaths.forEach(fragment => pathFragmentCollector.push(fragment));
    const fullPath = pathFragmentCollector.flat();
    if (this.complete) {
      fullPath.push(fullPath[0]);
    }
    this.pathEl.setAttribute('d', `M${fullPath.map(point => `${point.x},${point.y}`).join(' L')}`);
    this.currentPosMarkerEl.cx.baseVal.value = fullPath[fullPath.length - 1].x;
    this.currentPosMarkerEl.cy.baseVal.value = fullPath[fullPath.length - 1].y;
  }

  private drawTrack(): void {
    if (!this.track) {
      return;
    }

    // figure out transformation function based on target view area - DEPRECATED
    let zoom = 1;
    let [offsetX, offsetY] = [0, 0];
    /*const chunkZoom = track.get('Area2');
    if (chunkZoom) {
      const [availableWidth, availableHeight] = [this.svgRoot.width.baseVal.value, this.svgRoot.height.baseVal.value];
      console.log(availableWidth, availableHeight);
      console.log(chunkZoom.boundingBox);
      const xZoom = availableWidth / (chunkZoom.boundingBox.x2 - chunkZoom.boundingBox.x1);
      const yZoom = availableHeight / (chunkZoom.boundingBox.y2 - chunkZoom.boundingBox.y1);
      console.log(xZoom, yZoom);
      zoom = Math.min(xZoom, yZoom);
      offsetX = -chunkZoom.boundingBox.x1 * zoom;
      if (xZoom !== zoom) {
        offsetX = 0.5 * offsetX + 0.5 * (availableWidth - chunkZoom.boundingBox.x2 * zoom);
      }
      offsetY = -chunkZoom.boundingBox.y1 * zoom;
      if (yZoom !== zoom) {
        offsetY = 0.5 * offsetY + 0.5 * (availableHeight - chunkZoom.boundingBox.y2 * zoom);
      }
      console.log(zoom, offsetX, offsetY);
    }*/

    // draw track
    const colors = ['black', 'yellow', 'grey', 'purple', 'orange', 'lime'];
    let colorIndex = -1;
    this.track.forEach(chunk => {
      colorIndex++;
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      // group.style.transform = `scale(${zoom}) translate(${offsetX}px, ${offsetY}px)`;
      this.svgRoot.appendChild(group);

      for (const polygon of chunk.road) {
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.style.fill = 'none';
        poly.style.stroke = colors[colorIndex % colors.length];
        poly.style.strokeWidth = '1';
        // scale(35) translate(15px,32px)
        // poly.style.transform = `scale(${zoom}) translate(${offsetX / zoom}px, ${offsetY / zoom}px)`;
        // poly.style.transform = `scale(2)`;
        polygon.forEach(({ x, y }) => {
          const svgPoint = this.svgRoot.createSVGPoint();
          svgPoint.x = x * zoom + offsetX;
          svgPoint.y = y * zoom + offsetY;
          poly.points.appendItem(svgPoint);
        });
        group.appendChild(poly);
        // break;
      }

      const areaMarker = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      areaMarker.style.fill = 'none';
      areaMarker.style.stroke = 'red';
      areaMarker.style.strokeWidth = '1';
      areaMarker.x.baseVal.value = chunk.boundingBox.x1 * zoom + offsetX;
      areaMarker.y.baseVal.value = chunk.boundingBox.y1 * zoom + offsetY;
      areaMarker.width.baseVal.value = (chunk.boundingBox.x2 - chunk.boundingBox.x1) * zoom;
      areaMarker.height.baseVal.value = (chunk.boundingBox.y2 - chunk.boundingBox.y1) * zoom;
      group.appendChild(areaMarker);

      const finishMarker = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      finishMarker.style.fill = 'none';
      finishMarker.style.stroke = 'blue';
      finishMarker.style.strokeWidth = '1';
      finishMarker.x.baseVal.value = chunk.finish.boundingBox.x1 * zoom + offsetX;
      finishMarker.y.baseVal.value = chunk.finish.boundingBox.y1 * zoom + offsetY;
      finishMarker.width.baseVal.value = (chunk.finish.boundingBox.x2 - chunk.finish.boundingBox.x1) * zoom;
      finishMarker.height.baseVal.value = (chunk.finish.boundingBox.y2 - chunk.finish.boundingBox.y1) * zoom;
      group.appendChild(finishMarker);
    });
  }

  private async zoomToBox(box: Rectangle): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      new Tween({
        x: this.svgRoot.viewBox.baseVal.x,
        y: this.svgRoot.viewBox.baseVal.y,
        width: this.svgRoot.viewBox.baseVal.width,
        height: this.svgRoot.viewBox.baseVal.height
      }).to({
        x: box.x1,
        y: box.y1,
        width: box.x2 - box.x1,
        height: box.y2 - box.y1,
      }, 200)
        .onUpdate(upd => {
          console.log('tween update');
          this.svgRoot.viewBox.baseVal.x = upd.x;
          this.svgRoot.viewBox.baseVal.y = upd.y;
          this.svgRoot.viewBox.baseVal.width = upd.width;
          this.svgRoot.viewBox.baseVal.height = upd.height;
        })
        .start()
        .onComplete(() => resolve());
    });
  }

  private convertPath(path: Map<string, Point[]>): Record<string, transportTrack.Point[]> {

    const [scaleX, scaleY] = [50, 50];
    const [translateX, translateY] = [0, 0];

    const obj: Record<string, transportTrack.Point[]> = {};
    path.forEach((fragment, key) => {
      obj[key] = fragment.map(point => [(point.x - translateX) / scaleX, (point.y - translateY) / scaleY]);
    });
    return obj;
  }

  private convertTransportTrack(tTrack: transportTrack.Track): Track {
    const track = new Map<string, Chunk>();

    // initial convert
    for (const [key, tChunk] of Object.entries(tTrack)) {
      const finishKey = Object.keys(tChunk).filter(k => startsWith(k, 'Finish#'))[0];
      if (startsWith(finishKey, 'Finish#')) { // true by design, just for typecheck
        track.set(key, {
          name: key,
          road: tChunk.Road.map(triangle => triangle.map(point => ({ x: point[0], y: point[1] }))),
          boundingBox: {
            x1: tChunk.Area.position[0],
            x2: tChunk.Area.position[0] + tChunk.Area.size[0],
            y1: tChunk.Area.position[1],
            y2: tChunk.Area.position[1] + tChunk.Area.size[1]
          },
          finish: {
            fromChunkName: finishKey.replace('Finish#', ''),
            boundingBox: {
              x1: tChunk[finishKey].position[0],
              x2: tChunk[finishKey].position[0] + tChunk[finishKey].size[0],
              y1: tChunk[finishKey].position[1],
              y2: tChunk[finishKey].position[1] + tChunk[finishKey].size[1]
            }
          }
        });
      }
    }

    // set cross references
    // -> finish area ('next' chunk)
    track.forEach(chunk => chunk.finish.from = track.get(chunk.finish.fromChunkName));
    // -> start area ('previous' chunk)
    track.forEach(chunk => {
      const nextChunk = track.get(chunk.finish.from?.name ?? '');
      if (nextChunk) {
        nextChunk.start = chunk;
      }
    });

    return track;
  }

  private optimizeTrack(track: Track): Track {
    track.forEach(chunk => {
      for (let polygonIndex = 0; polygonIndex < chunk.road.length; polygonIndex++) {
        const polygon = chunk.road[polygonIndex];
        base: for (let lineIndex = 0; lineIndex < polygon.length; lineIndex++) {
          const line = [polygon[lineIndex], polygon[(lineIndex + 1) % polygon.length]];

          for (let polygonIndex2 = polygonIndex + 1; polygonIndex2 < chunk.road.length; polygonIndex2++) {
            const polygon2 = chunk.road[polygonIndex2];
            for (let lineIndex2 = 0; lineIndex2 < polygon2.length; lineIndex2++) {
              const line2 = [polygon2[lineIndex2], polygon2[(lineIndex2 + 1) % polygon2.length]];

              //    0     3 4
              // 1:   1 2
              // 2:   3 2
              //    4     1 0
              if (line[0].x === line2[1].x && line[0].y === line2[1].y
                && line[1].x === line2[0].x && line[1].y === line2[0].y) {
                // contract polygons
                // console.log('contracting polygons');
                for (let iter = (lineIndex2 + 2) % polygon2.length; iter !== lineIndex2; iter = (iter + 1) % polygon2.length) {
                  polygon.splice(lineIndex + 1, 0, polygon2[iter]);
                }
                chunk.road.splice(polygonIndex2, 1);
                break base;
              }

            }
          }

        }
      }
    });

    return track;
  }

  private transformCoordinateSystem(track: Track): Track {
    const [scaleX, scaleY] = [50, 50];
    const [translateX, translateY] = [0, 0];
    track.forEach(chunk => {
      chunk.boundingBox.x1 = scaleX * chunk.boundingBox.x1 + translateX;
      chunk.boundingBox.y1 = scaleY * chunk.boundingBox.y1 + translateY;
      chunk.boundingBox.x2 = scaleX * chunk.boundingBox.x2 + translateX;
      chunk.boundingBox.y2 = scaleY * chunk.boundingBox.y2 + translateY;
      chunk.finish.boundingBox.x1 = scaleX * chunk.finish.boundingBox.x1 + translateX;
      chunk.finish.boundingBox.y1 = scaleY * chunk.finish.boundingBox.y1 + translateY;
      chunk.finish.boundingBox.x2 = scaleX * chunk.finish.boundingBox.x2 + translateX;
      chunk.finish.boundingBox.y2 = scaleY * chunk.finish.boundingBox.y2 + translateY;
      chunk.road.forEach(polygon => polygon.forEach(point => {
        point.x = scaleX * point.x + translateX;
        point.y = scaleY * point.y + translateY;
      }));
    });
    return track;
  }

  private appendTextNode(value: string): void {
    const tag = document.createElement('p');
    tag.textContent = value;
    this.root?.appendChild(tag);
  }

  public connectedCallback(): void { }

  public disconnectedCallback(): void { }
}

window.customElements.define('drawing-phase', DrawingPhaseComponent);

declare global {
  interface HTMLElementTagNameMap {
    'drawing-phase': DrawingPhaseComponent;
  }
}
