import { Tween } from '@tweenjs/tween.js';
import { Connection } from '../connection';
import { requestFullscreen } from '../fullscreenUtils';
import { SendPathDataMessageI } from '../messages';
import { SVG_NAMESPACE } from './../constants';
import { OverlayService } from './../overlay-manager/overlay.service';
import css from './drawingPhase.component.css';
import template from './drawingPhase.component.html';
import { LoadingOverlayComponent } from './loading-overlay/loadingOverlay.component';
import { Chunk, Point, Rectangle, Track } from './track';
import { augmentPolygonWithIndex, chopSharpSpikes, convertTransportTrack, enlargeInlay, generateBorderPairs, offsetPolygon, optimizeTrack, pointInConvexPolygon, pointInPolygon, splitCrossingPolygons, transformCoordinateSystem } from './trackUtils';
import * as transportTrack from './transportTrack';

const templateEl = document.createElement('template');
templateEl.innerHTML = template;

const cssContainer = document.createElement('style');
cssContainer.textContent = css;

type SavedPath = {
  order: string[];
  path: Record<string, transportTrack.Point[]>;
};

export class DrawingPhaseComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private root: HTMLElement | null;
  private svgRoot: SVGSVGElement;
  private trackGroupEl: SVGGElement;
  private roadEl: SVGGElement;
  private finishEl: SVGGElement;
  private boundingEl: SVGGElement;
  private pathEl: SVGPathElement;
  private currentPosMarkerEl: SVGCircleElement;
  private redrawButtonEl: HTMLButtonElement;
  private helpButtonEl: HTMLButtonElement;

  public connection?: Connection;
  private track: Track | null = null;
  private trackBoundingBox: Rectangle | null = null;
  private isDrawing = false;
  private drawingEnabled = false;
  private partialPaths: Map<string, Point[]> = new Map<string, Point[]>();
  private currentPartialPath: Point[] = [];
  private currentChunk: Chunk | null = null;
  private complete = false;
  private currentRotationInverse: DOMMatrix;

  private loadingOverlay: LoadingOverlayComponent;

  private readonly TRACK_PRE_TRANSFORM = { scale: { x: 50, y: 50 }, translate: { x: 0, y: 0 } };
  private readonly MAXIMUM_DRAW_DISTANCE = 25000;
  private readonly MINIMUM_DRAW_DISTANCE = 1000;

  static get observedAttributes(): string[] {
    return ['color'];
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

    this.root = shadow.getElementById('root');
    this.svgRoot = shadow.getElementById('svgtrack') as any as SVGSVGElement;

    this.trackGroupEl = document.createElementNS(SVG_NAMESPACE, 'g');
    const transform = this.svgRoot.createSVGTransform();
    transform.setRotate(0, 0, 0);
    this.trackGroupEl.transform.baseVal.appendItem(transform);
    this.svgRoot.appendChild(this.trackGroupEl);
    this.currentRotationInverse = transform.matrix.inverse();
    this.updateRotationInverse();

    // container for svg organization -> handle layering
    this.roadEl = document.createElementNS(SVG_NAMESPACE, 'g');
    this.trackGroupEl.appendChild(this.roadEl);
    this.finishEl = document.createElementNS(SVG_NAMESPACE, 'g');
    this.trackGroupEl.appendChild(this.finishEl);
    this.boundingEl = document.createElementNS(SVG_NAMESPACE, 'g');
    this.trackGroupEl.appendChild(this.boundingEl);

    this.pathEl = document.createElementNS(SVG_NAMESPACE, 'path');
    this.pathEl.style.stroke = 'green';
    this.pathEl.style.strokeWidth = '5';
    this.pathEl.style.fill = 'none';
    this.trackGroupEl.appendChild(this.pathEl);

    this.currentPosMarkerEl = document.createElementNS(SVG_NAMESPACE, 'circle');
    this.currentPosMarkerEl.style.stroke = 'green';
    this.currentPosMarkerEl.style.strokeWidth = '5';
    this.currentPosMarkerEl.style.fill = 'green';
    this.currentPosMarkerEl.setAttribute('r', '20');
    this.currentPosMarkerEl.classList.add('pulse');
    this.currentPosMarkerEl.style.display = 'none';
    this.trackGroupEl.appendChild(this.currentPosMarkerEl);

    this.redrawButtonEl = shadow.getElementById('redrawButton') as HTMLButtonElement;
    this.redrawButtonEl.addEventListener('click', this.handleRedraw);
    this.helpButtonEl = shadow.getElementById('helpButton') as HTMLButtonElement;
    this.helpButtonEl.addEventListener('click', () => {
      // try to request full-screen
      requestFullscreen();

      OverlayService.Instance.openAsModal(document.createElement('help-modal'));
    });

    this.loadingOverlay = document.createElement('drawing-loading-overlay');
    setTimeout(() => OverlayService.Instance.openAsOverlay(this.loadingOverlay));
    setTimeout(() => this.loadingOverlay.updateStatus('Establishing car connection', ''));

    if (!this.svgRoot) {
      console.error('root not found');
      return;
    }

    // request and handle track data
    setTimeout(() => {
      const trackFragments = new Map<number, string>();
      const unsubscribe = this.connection?.subscribe('track_transmission', (data) => {
        trackFragments.set(data.packet_num, data.encoded_message);
        console.log(`Currently got ${trackFragments.size}/${data.total_num_packets} fragments, last received: ${data.packet_num}`);
        this.loadingOverlay.updateStatus('Receiving environment', `${trackFragments.size}/${data.total_num_packets}`);
        if (trackFragments.size === data.total_num_packets) {
          const trackFragmentsList: string[] = [];
          trackFragments.forEach(frag => trackFragmentsList.push(frag));
          const tTrack: transportTrack.Track = JSON.parse(trackFragmentsList.join(''));
          if (unsubscribe) {
            unsubscribe();
          }
          this.setupTrack(tTrack);
        }
      });
      this.connection?.send({ action: 'ready_for_track_json' });
    });
    // uncomment below for quicker testing
    // this.setupTrack(TEST_TRACK);
    // this.setupTrack(TEST_TRACK5);
    // setTimeout(() => this.setupTrack(TEST_TRACK_VISUAL));

    // setup mouse events
    this.svgRoot.addEventListener('mousedown', this.startDraw);
    this.svgRoot.addEventListener('mousemove', this.continueDraw);
    this.svgRoot.addEventListener('mouseup', this.stopDraw);
    this.svgRoot.addEventListener('mouseleave', this.abortDraw);

    // setup touch events
    this.svgRoot.addEventListener('touchstart', this.startDraw);
    this.svgRoot.addEventListener('touchmove', this.continueDraw);
    this.svgRoot.addEventListener('touchend', this.stopDraw);
    this.svgRoot.addEventListener('touchcancel', this.abortDraw);
  }

  private setupTrack(track: transportTrack.Track): void {
    console.log(track);
    this.loadingOverlay.updateStatus('Loading environment', '');
    this.track = convertTransportTrack(track);
    this.loadingOverlay.updateStatus('Loading environment', 'done!');

    this.track.chunks.forEach(chunk => console.log('#Triangles', chunk.road.length));
    this.loadingOverlay.updateStatus('Optimizing environment', '');
    optimizeTrack(this.track);
    transformCoordinateSystem(this.track, this.TRACK_PRE_TRANSFORM);
    this.loadingOverlay.updateStatus('Optimizing environment', 'done!');
    this.track.chunks.forEach(chunk => console.log('#Polygons', chunk.road.length));
    console.log(this.track);

    // compute initial view area fragment -> boundingbox of complete track
    const boundingBoxes: Rectangle[] = [];
    this.track.chunks.forEach(chunk => boundingBoxes.push(chunk.boundingBox));
    this.trackBoundingBox = boundingBoxes.reduce((r1, r2) => new Rectangle({
      x1: Math.min(r1.p1.x, r1.p2.x, r1.p3.x, r1.p4.x, r2.p1.x, r2.p2.x, r2.p3.x, r2.p4.x),
      y1: Math.min(r1.p1.y, r1.p2.y, r1.p3.y, r1.p4.y, r2.p1.y, r2.p2.y, r2.p3.y, r2.p4.y),
      x2: Math.max(r1.p1.x, r1.p2.x, r1.p3.x, r1.p4.x, r2.p1.x, r2.p2.x, r2.p3.x, r2.p4.x),
      y2: Math.max(r1.p1.y, r1.p2.y, r1.p3.y, r1.p4.y, r2.p1.y, r2.p2.y, r2.p3.y, r2.p4.y)
    }));
    this.zoomToBox(this.trackBoundingBox);

    this.drawTrack();

    this.loadingOverlay.updateStatus('Get ready to draw', '');

    // debug: load a previously saved path
    if (new URLSearchParams(window.location.search).get('loadPath')) {
      const savedPath = localStorage.getItem('pathTransmission');
      if (savedPath) {
        this.sendPath(JSON.parse(savedPath));
      } else {
        setTimeout(() => this.startTrackDrawing(), 2000);
      }
    } else {
      setTimeout(() => this.startTrackDrawing(), 2000);
      // OverlayService.Instance.closeOverlay();
    }
  }

  private startDraw = (event: MouseEvent | TouchEvent) => {
    if (this.drawingEnabled) {
      this.isDrawing = true;
      const eventPoint = event instanceof MouseEvent ? event : event.touches[0];
      const point = this.screenToSvg({ x: eventPoint.clientX, y: eventPoint.clientY });
      if (this.pointInCurrentChunk(point) && this.pointCloseToLast(point)) {
        if (!this.checkAndHandlePointInFinishArea(point)) {
          this.currentPartialPath.push(point);
          this.drawPath();
        }
      }
    }
  }

  private continueDraw = (event: MouseEvent | TouchEvent) => {
    if (this.drawingEnabled && this.isDrawing) {
      const eventPoint = event instanceof MouseEvent ? event : event.touches[0];
      const point = this.screenToSvg({ x: eventPoint.clientX, y: eventPoint.clientY });
      if (this.pointInCurrentChunk(point) && this.pointCloseToLast(point)) {
        if (!this.checkAndHandlePointInFinishArea(point)) {
          this.currentPartialPath.push(point);
          this.drawPath();
        }
      }
    }
  }

  private stopDraw = (event: MouseEvent | TouchEvent) => {
    this.isDrawing = false;
    const eventPoint = event instanceof MouseEvent ? event : event.touches[0];
    const point = this.screenToSvg({ x: eventPoint.clientX, y: eventPoint.clientY });
    if (this.pointInCurrentChunk(point) && this.pointCloseToLast(point)) {
      this.checkAndHandlePointInFinishArea(point);
    }
  }

  private abortDraw = (event: MouseEvent | TouchEvent) => {
    this.isDrawing = false;
  }

  private handleRedraw = async () => {
    this.redrawButtonEl.disabled = true;
    if (this.currentPartialPath.length > 0) {
      // reset path for *current* area
      const copy = this.currentPartialPath; // copy current fragment to rewind it
      this.resetCurrentPartialPath();
      await this.rewindPath(copy);
    } else {
      // reset path for *previous* area
      if (!this.currentChunk) {
        return;
      }
      this.partialPaths.delete(this.currentChunk.name);
      const areaKeyCollector: string[] = [];
      this.partialPaths.forEach((_, key) => areaKeyCollector.push(key));
      const previousChunkName = areaKeyCollector[areaKeyCollector.length - 1];
      const copy = this.partialPaths.get(previousChunkName); // copy previous fragment to rewind it
      await this.moveToNextChunk(this.track?.chunks.get(previousChunkName), false);
      if (copy) {
        await this.rewindPath(copy);
      }
    }
    this.redrawButtonEl.disabled = false;
  }

  private resetCurrentPartialPath(): void {
    if (this.currentChunk) {
      if (this.currentChunk === this.track?.start) {
        const areas = this.track.start.start[0].finish.filter(finish => finish.from === this.track?.start);
        const startBox = areas.length > 0 ? areas[0].boundingBox : undefined ?? this.track.start.boundingBox;
        this.currentPartialPath = [{
          x: 0.25 * startBox.p1.x + 0.25 * startBox.p2.x + 0.25 * startBox.p3.x + 0.25 * startBox.p4.x,
          y: 0.25 * startBox.p1.y + 0.25 * startBox.p2.y + 0.25 * startBox.p3.y + 0.25 * startBox.p4.y
        }];
      } else {
        this.currentPartialPath = [];
      }
      this.partialPaths.set(this.currentChunk.name, this.currentPartialPath);
      this.drawPath();
    }
  }

  private checkAndHandlePointInFinishArea(point: Point): boolean {
    if (this.currentChunk) {
      for (const finish of this.currentChunk.finish) {
        if (finish.boundingPolygon) {
          if (pointInConvexPolygon(point, finish.boundingPolygon)) {
            this.moveToNextChunk(finish.from);
            return true;
          }
        }
      }
    }
    return false;
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
    const actualSize = { x: this.svgRoot.clientWidth, y: this.svgRoot.clientHeight };
    const targetSize = { x: this.svgRoot.viewBox.baseVal.width, y: this.svgRoot.viewBox.baseVal.height };
    const svgOffset = { x: this.svgRoot.viewBox.baseVal.x, y: this.svgRoot.viewBox.baseVal.y };

    const targetAspectRatio = targetSize.x / targetSize.y;
    const actualAspectRatio = actualSize.x / actualSize.y;

    const compensation = { x: 0, y: 0 };
    if (targetAspectRatio - actualAspectRatio < 0) {
      // wider than expected
      const actualSvgWidth = targetSize.y * actualAspectRatio;
      const svgTooWide = actualSvgWidth - targetSize.x;
      compensation.x = svgTooWide;
    } else {
      // taller than expected
      const actualSvgHeight = targetSize.x / actualAspectRatio;
      const svgTooTall = actualSvgHeight - targetSize.y;
      compensation.y = svgTooTall;
    }

    const beforeRotation = {
      x: svgOffset.x - compensation.x / 2 + screen.x / actualSize.x * (targetSize.x + compensation.x),
      y: svgOffset.y - compensation.y / 2 + screen.y / actualSize.y * (targetSize.y + compensation.y)
    };

    // and now for our last magic trick: inverse the possibly applied rotation
    // -> for this we pre-save the inverse of the current rotation matrix that transformed our track
    // -> do matrix multiplication ourselves, because built-in is weird
    const rotMatrix = this.currentRotationInverse;
    return {
      x: rotMatrix.a * beforeRotation.x + rotMatrix.c * beforeRotation.y + rotMatrix.e,
      y: rotMatrix.b * beforeRotation.x + rotMatrix.d * beforeRotation.y + rotMatrix.f
    };
  }

  private pointInCurrentChunk(point: Point): boolean {
    if (!this.currentChunk) {
      return false;
    }
    return this.currentChunk.road.some(poly => pointInPolygon(point, poly));
  }

  private pointCloseToLast(point: Point): boolean {
    const last = this.getLastPathPoint();
    const distanceSquared = Math.pow(point.x - last.x, 2) + Math.pow(point.y - last.y, 2);
    return distanceSquared <= this.MAXIMUM_DRAW_DISTANCE && distanceSquared >= this.MINIMUM_DRAW_DISTANCE;
  }

  private getLastPathPoint(): Point {
    let path: Point[];
    if (this.currentPartialPath.length > 0) {
      path = this.currentPartialPath;
    } else {
      const pathFragmentCollector: Point[][] = [];
      this.partialPaths.forEach(fragment => pathFragmentCollector.push(fragment));
      path = pathFragmentCollector[pathFragmentCollector.length - 2];
    }
    return path[path.length - 1];
  }

  private highlightCurrentChunk(): void {
    // clear highlighting from previous chunk
    this.track?.chunks.forEach(chunk => {
      // -> road
      chunk.roadSvgEls?.forEach(poly => {
        poly.style.stroke = 'lightgray';
        poly.style.fill = 'lightgray';
      });
      // -> finish areas
      chunk.finish.forEach(finish => {
        if (finish.svgEl) {
          finish.svgEl.style.stroke = 'none';
          finish.svgEl.style.fill = 'none';
          finish.svgEl.classList.remove('pulse');
        }
      });
    });

    // push current chunk's road to front to prevent occlusion from other chunks
    // (layering in svg: last element is in front)
    if (this.currentChunk?.roadSvgContainerEl) {
      this.roadEl.appendChild(this.currentChunk.roadSvgContainerEl);
    }

    // highlight current chunk
    // -> road
    this.currentChunk?.roadSvgEls?.forEach(poly => {
      poly.style.stroke = '#807e78';
      poly.style.fill = '#807e78';
    });
    // -> finish areas
    this.currentChunk?.finish.forEach(finish => {
      if (finish.svgEl) {
        finish.svgEl.style.stroke = 'blue';
        finish.svgEl.style.fill = 'blue';
        finish.svgEl.classList.add('pulse');
      }
    });
  }

  private updateRotationInverse(): void {
    this.currentRotationInverse = this.trackGroupEl.transform.baseVal.getItem(0).matrix.inverse();
  }

  private async startTrackDrawing(): Promise<void> {
    if (!this.track) {
      return;
    }

    await this.moveToNextChunk(this.track.start, false);

    this.currentPosMarkerEl.style.display = ''; // show position marker
    OverlayService.Instance.openAsOverlay(document.createElement('drawing-instructions-overlay'));
  }

  private async moveToNextChunk(nextChunk?: Chunk, canBeFinal = true): Promise<void> {
    this.drawingEnabled = false;
    this.isDrawing = false;

    this.currentChunk = nextChunk ?? null;
    if (!this.currentChunk) {
      return;
    }

    this.connection?.send({ action: 'path_progress_update', area: this.currentChunk.name });

    if (canBeFinal && this.currentChunk === this.track?.start) {
      // done, got full path
      this.complete = true;
      this.currentChunk = null;

      this.drawPath();

      // zoom out
      this.highlightCurrentChunk();
      if (this.trackBoundingBox) {
        this.zoomToBox(this.trackBoundingBox);
      }

      const [convertedPath, areaOrder] = this.convertPath(this.partialPaths);
      const transmission: SavedPath = {
        path: convertedPath,
        order: areaOrder
      };

      if (new URLSearchParams(window.location.search).get('savePath')) {
        localStorage.setItem('pathTransmission', JSON.stringify(transmission));
      }

      this.sendPath(transmission);
    } else {
      this.highlightCurrentChunk();
      await this.zoomToBox(this.currentChunk.boundingBox);

      this.resetCurrentPartialPath();

      this.drawingEnabled = true;
    }
  }

  private sendPath(transmission: SavedPath): void {
    // -> prepared for path message splitting (backwards-compatible)
    // ---> godot wants smaller websocket packets
    // -----> encode path, split it by length, transmit it fragment by fragment
    // -> remove old remains once godot code is updated

    const encodedPath = JSON.stringify(transmission.path);

    // set something sensible here ...
    // const MAX_PAYLOAD_SIZE = Number.MAX_SAFE_INTEGER; // transmit as EXACTLY one message PERIOD
    const MAX_PAYLOAD_SIZE = 16376 - JSON.stringify({ // try to intelligently guess the maximum allowed size
      action: 'path_transmission', order: transmission.order, packet_num: 1000, total_num_packets: 1000, encoded_path: ''
    } as SendPathDataMessageI).length - 100; // 'as SendPathDataMessageI' -> typecheck; 100 -> safety margin
    // const MAX_PAYLOAD_SIZE = 10000; // should be about fine, not too restrictive, not too careless

    const numFragments = Math.ceil(encodedPath.length / MAX_PAYLOAD_SIZE);
    for (let i = 0; i < numFragments; i++) {
      const fragment = encodedPath.substring(i * MAX_PAYLOAD_SIZE, (i + 1) * MAX_PAYLOAD_SIZE);
      this.connection?.send({ action: 'path_transmission', order: transmission.order, packet_num: i, total_num_packets: numFragments, encoded_path: fragment });
    }
  }

  private buildCurrentPath(): Point[] {
    const pathFragmentCollector: Point[][] = [];
    this.partialPaths.forEach(fragment => pathFragmentCollector.push(fragment));
    const fullPath = pathFragmentCollector.flat();
    if (this.complete) {
      fullPath.push(fullPath[0]); // complete loop visually with first position
    }
    return fullPath;
  }

  private drawPath(): void {
    const fullPath = this.buildCurrentPath();
    this.pathEl.setAttribute('d', `M${fullPath.map(point => `${point.x},${point.y}`).join(' L')}`);
    this.currentPosMarkerEl.cx.baseVal.value = fullPath[fullPath.length - 1].x;
    this.currentPosMarkerEl.cy.baseVal.value = fullPath[fullPath.length - 1].y;
  }

  /**
   * Used during redraw, animates the deletion of the supplied segment as a suffix of the normal path.
   */
  private async rewindPath(rewindSegment: Point[]): Promise<void> {
    const fullPath = this.buildCurrentPath();
    const fullPathString = `M${fullPath.map(point => `${point.x},${point.y}`).join(' L')}`;
    const additionalPoints = rewindSegment.map(point => `${point.x},${point.y}`);

    return new Promise<void>((resolve, reject) => {
      new Tween({ i: additionalPoints.length }).to({ i: 0 }, 1000)
        .onUpdate(upd => {
          const progress = Math.round(upd.i);
          const [pathString, markerPos] =
            (progress > 0) ? [
              `${fullPathString} L${additionalPoints.slice(0, progress).join(' L')}`,
              rewindSegment[progress - 1]
            ] : [
              fullPathString,
              fullPath[fullPath.length - 1]
            ];

          this.pathEl.setAttribute('d', pathString);
          this.currentPosMarkerEl.cx.baseVal.value = markerPos.x;
          this.currentPosMarkerEl.cy.baseVal.value = markerPos.y;
        })
        .start()
        .onComplete(() => {
          this.drawPath();
          resolve();
        });
    });
  }

  private drawTrack(): void {
    if (!this.track) {
      return;
    }

    let chunkCounter = 0;
    this.track.chunks.forEach(chunk => {
      chunkCounter++;
      this.loadingOverlay.updateStatus('Realizing environment', `${chunkCounter}/${this.track?.chunks.size}`);

      const road = document.createElementNS(SVG_NAMESPACE, 'g');
      chunk.roadSvgContainerEl = road;

      const roadChopped = chunk.road.map(polygon => chopSharpSpikes(polygon.reverse()));
      const innerRoadPolygons = roadChopped.map((chopped, index) => {
        const splitted = splitCrossingPolygons(augmentPolygonWithIndex(offsetPolygon(chopped, 10, 1)))
          .filter(fPoly => fPoly.every(point => pointInPolygon(point, chunk.road[index])))
          .filter(fPoly => fPoly.length > 3);
        // const splitted = [augmentPolygonWithIndex(offsetPolygon(polygonChopped, 10, 1))];
        // console.log('splitted', splitted);
        return this.track ? enlargeInlay(this.track, chopped, splitted[0]) : splitted[0];
      });

      chunk.roadBorderSvgEls = [];
      this.roadEl.appendChild(road);
      chunk.road.forEach((polygon, index) => {
        /*const polyOld = document.createElementNS(SVG_NAMESPACE, 'polygon');
        polyOld.style.stroke = 'green';
        polyOld.style.fill = 'green';
        polyOld.style.strokeWidth = '1';
        polygon.forEach(({ x, y }) => {
          const svgPoint = this.svgRoot.createSVGPoint();
          svgPoint.x = x;
          svgPoint.y = y;
          polyOld.points.appendItem(svgPoint);
        });
        road.appendChild(polyOld);
        chunk.roadBorderSvgEls.push(polyOld);*/

        const pairs = generateBorderPairs(innerRoadPolygons[index], roadChopped[index]);

        const pathRed = pairs.map(seg => {
          const temp = seg.filter((_, i) => seg.length % 2 === 0 || i !== seg.length - 1)
            .map(([p1, p2], i) =>
              i % 2 === 0
                ? `M${p1.x},${p1.y} L${p2.x},${p2.y}`
                : `L${p2.x},${p2.y} L${p1.x},${p1.y} Z`
            );
          return temp.join(' ');
        }).join(' ');
        const pathWhite = pairs.map(seg => {
          const temp = seg.filter((_, i) => i !== 0 && (seg.length % 2 === 1 || i !== seg.length - 1))
            .map(([p1, p2], i) =>
              i % 2 === 0
                ? `M${p1.x},${p1.y} L${p2.x},${p2.y}`
                : `L${p2.x},${p2.y} L${p1.x},${p1.y} Z`
            );
          return temp.join(' ');
        }).join(' ');

        const polyRed = document.createElementNS(SVG_NAMESPACE, 'path');
        polyRed.style.stroke = 'red';
        polyRed.style.fill = 'red';
        polyRed.style.strokeWidth = '1';
        polyRed.setAttribute('d', pathRed);
        road.appendChild(polyRed);
        chunk.roadBorderSvgEls?.push(polyRed);
        const polyWhite = document.createElementNS(SVG_NAMESPACE, 'path');
        polyWhite.style.stroke = 'white';
        polyWhite.style.fill = 'white';
        polyWhite.style.strokeWidth = '1';
        polyWhite.setAttribute('d', pathWhite);
        road.appendChild(polyWhite);
        chunk.roadBorderSvgEls?.push(polyWhite);
      });

      chunk.roadSvgEls = [];
      for (const innerRoadPolygon of innerRoadPolygons) {
        const poly = document.createElementNS(SVG_NAMESPACE, 'polygon');
        poly.style.stroke = 'black';
        poly.style.fill = 'lightgray';
        poly.style.strokeWidth = '1';
        // poly.style.opacity = '0.25';
        innerRoadPolygon.forEach(({ x, y }) => {
          const svgPoint = this.svgRoot.createSVGPoint();
          svgPoint.x = x;
          svgPoint.y = y;
          poly.points.appendItem(svgPoint);
        });
        road.appendChild(poly);
        chunk.roadSvgEls.push(poly);
      }

      for (const polygon of chunk.holes) {
        const offsetPoly = offsetPolygon([...polygon].reverse(), 10, 1);
        const poly = document.createElementNS(SVG_NAMESPACE, 'path');
        poly.style.stroke = 'black';
        poly.style.fill = 'url(#hole-pattern)';
        poly.style.fillRule = 'evenodd';
        poly.style.strokeWidth = '1';
        const outer = [...offsetPoly, offsetPoly[0]].map(({ x, y }) => `${x},${y}`).join(' L');
        const inner = [...polygon, polygon[0]].map(({ x, y }) => `${x},${y}`).join(' L');
        poly.setAttribute('d', `M${outer} M${inner}`);
        road.appendChild(poly);

        const poly2 = document.createElementNS(SVG_NAMESPACE, 'polygon');
        poly2.style.stroke = 'black';
        poly2.style.fill = 'white';
        poly2.style.strokeWidth = '1';
        [...polygon, polygon[0]].forEach(({ x, y }) => {
          const svgPoint = this.svgRoot.createSVGPoint();
          svgPoint.x = x;
          svgPoint.y = y;
          poly2.points.appendItem(svgPoint);
        });
        road.appendChild(poly2);
      }

      // useful for debugging
      /*const areaMarker = document.createElementNS(SVG_NAMESPACE, 'rect');
      areaMarker.style.stroke = 'red';
      areaMarker.style.fill = 'none';
      areaMarker.style.strokeWidth = '1';
      areaMarker.x.baseVal.value = chunk.boundingBox.x;
      areaMarker.y.baseVal.value = chunk.boundingBox.y;
      areaMarker.width.baseVal.value = chunk.boundingBox.width;
      areaMarker.height.baseVal.value = chunk.boundingBox.height;
      const transform = this.svgRoot.createSVGTransform();
      transform.setRotate(-1 * chunk.boundingBox.rotation * 180 / Math.PI, chunk.boundingBox.x, chunk.boundingBox.y);
      areaMarker.transform.baseVal.appendItem(transform);
      this.boundingEl.appendChild(areaMarker);*/

      chunk.finish.forEach(finish => {
        finish.svgEl = document.createElementNS(SVG_NAMESPACE, 'rect');
        finish.svgEl.style.stroke = 'none';
        finish.svgEl.style.fill = 'none';
        finish.svgEl.style.strokeWidth = '1';
        finish.svgEl.x.baseVal.value = finish.boundingBox.x;
        finish.svgEl.y.baseVal.value = finish.boundingBox.y;
        finish.svgEl.width.baseVal.value = finish.boundingBox.width;
        finish.svgEl.height.baseVal.value = finish.boundingBox.height;
        const transform = this.svgRoot.createSVGTransform();
        transform.setRotate(-1 * finish.boundingBox.rotation * 180 / Math.PI, finish.boundingBox.x, finish.boundingBox.y);
        finish.svgEl.transform.baseVal.appendItem(transform);
        this.finishEl.appendChild(finish.svgEl);
      });
    });
  }

  private async zoomToBox(box: Rectangle): Promise<void> {
    const transform = this.trackGroupEl.transform.baseVal.getItem(0);

    const goalTransform = this.svgRoot.createSVGTransform();
    goalTransform.setRotate(box.rotation * 180 / Math.PI, box.x, box.y);

    return new Promise<void>((resolve, reject) => {
      new Tween({
        x: this.svgRoot.viewBox.baseVal.x,
        y: this.svgRoot.viewBox.baseVal.y,
        width: this.svgRoot.viewBox.baseVal.width,
        height: this.svgRoot.viewBox.baseVal.height,
        // rotation: transform.angle,
        rotMatrix: transform.matrix // yes, we're tweening rotation matrices - no, I don't see any problem with that : P
      }).to({
        // add 0.05 * width/height on each side
        x: box.x - 0.05 * box.width,
        y: box.y - 0.05 * box.height,
        width: 1.1 * box.width,
        height: 1.1 * box.height,
        // rotation: box.rotation * 180 / Math.PI,
        rotMatrix: goalTransform.matrix
      }, 1000)
        .onUpdate(upd => {
          // console.log('tween update');
          this.svgRoot.viewBox.baseVal.x = upd.x;
          this.svgRoot.viewBox.baseVal.y = upd.y;
          this.svgRoot.viewBox.baseVal.width = upd.width;
          this.svgRoot.viewBox.baseVal.height = upd.height;
          // transform.setRotate(upd.rotation, box.x, box.y);
          transform.setMatrix(upd.rotMatrix);
        })
        .start()
        .onComplete(() => {
          this.updateRotationInverse();
          resolve();
        });
    });
  }

  private convertPath(path: Map<string, Point[]>): [Record<string, transportTrack.Point[]>, string[]] {
    const { scale, translate } = this.TRACK_PRE_TRANSFORM;

    const obj: Record<string, transportTrack.Point[]> = {};
    const order: string[] = [];
    path.forEach((fragment, key) => {
      obj[key] = fragment.map(point => [(point.x - translate.x) / scale.x, (point.y - translate.y) / scale.y]);
      order.push(key);
    });
    return [obj, order];
  }

  public attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    console.log(name, oldValue, newValue);
    switch (name) {
      case 'color':
        this.pathEl.style.stroke = newValue;
        this.currentPosMarkerEl.style.stroke = newValue;
        this.currentPosMarkerEl.style.fill = newValue;
        break;
    }
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
