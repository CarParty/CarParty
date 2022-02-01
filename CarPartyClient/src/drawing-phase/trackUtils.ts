import { startsWith } from '../additionalTypes';
import { Chunk, Point, Polygon, Rectangle, Track } from './track';
import * as transportTrack from './transportTrack';

export function convertTransportTrack(tTrack: transportTrack.Track): Track {
  const chunks = new Map<string, Chunk>();
  let startChunk: Chunk | null = null;

  // initial convert
  for (const [key, tChunk] of Object.entries(tTrack)) {
    const finishKeys = Object.keys(tChunk).filter((k): k is `Finish#${string}` => startsWith(k, 'Finish#'));
    const chunk = {
      name: key,
      road: tChunk.Road.map(triangle => triangle.map(([x, y]) => ({ x, y }))),
      holes: [],
      boundingBox: new Rectangle({
        x: tChunk.Area.position[0],
        y: tChunk.Area.position[1],
        width: tChunk.Area.size[0],
        height: tChunk.Area.size[1]
      }, tChunk.Area.rotation),
      finish: finishKeys.map(finishKey => ({
        fromChunkName: finishKey.replace('Finish#', ''),
        boundingBox: new Rectangle({
          x: tChunk[finishKey].position[0],
          y: tChunk[finishKey].position[1],
          width: tChunk[finishKey].size[0],
          height: tChunk[finishKey].size[1]
        }, tChunk[finishKey].rotation)
      })
      ),
      start: []
    };
    chunks.set(key, chunk);
    if (tChunk.isFirst && !startChunk) {
      startChunk = chunk;
    }
  }

  // add finish areas in polygon representation
  chunks.forEach(chunk =>
    chunk.finish.forEach(finish =>
      // complexity is due to manually applying the rotation
      // rotation origin is (x,y)
      // please note that the angle is inverted !
      finish.boundingPolygon = [
        finish.boundingBox.p1,
        finish.boundingBox.p2,
        finish.boundingBox.p3,
        finish.boundingBox.p4,
      ]
    )
  );

  // set cross references
  // -> finish area ('next' chunk)
  chunks.forEach(chunk =>
    chunk.finish.forEach(finish =>
      finish.from = chunks.get(finish.fromChunkName)
    )
  );
  // -> start area ('previous' chunk)
  chunks.forEach(chunk =>
    chunk.finish.forEach(finish =>
      chunks.get(finish.from?.name ?? '')?.start.push(chunk)
    )
  );

  return {
    chunks,
    start: startChunk ?? chunks.values().next().value // pick 'first' chunk as arbitrary start chunk if unset
  };
}

export function optimizeTrack(track: Track): Track {

  // 'helper' function
  const optimizationIteration = (chunk: Chunk): boolean => {
    let madeOptimization = false;
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
              let count = 0;
              for (let iter = (lineIndex2 + 2) % polygon2.length; iter !== lineIndex2; iter = (iter + 1) % polygon2.length) {
                polygon.splice(lineIndex + 1 + count++, 0, polygon2[iter]);
              }
              chunk.road.splice(polygonIndex2, 1);
              madeOptimization = true;
              break base;
            }

          }
        }

      }
    }
    return madeOptimization;
  };

  // main stuff <- here the magic ~~happens~~ is called to happen
  track.chunks.forEach(chunk => {
    let madeOptimization = true;
    while (madeOptimization) {
      madeOptimization = optimizationIteration(chunk);
    }
  });

  // if three points lie in a straight line, remove the middle one
  track.chunks.forEach(chunk =>
    chunk.road.forEach(polygon =>
      simplifyStraightLinesInplace(polygon)
    )
  );

  // hunt holes (find & eliminate)
  track.chunks.forEach(chunk => {
    chunk.road.forEach(polygon => {
      let madeOptimization = true;
      while (madeOptimization) {
        madeOptimization = false;
        if (polygon.length > 10) {
          for (let i = 0; i < polygon.length; i++) {
            const next = (i + 1) % polygon.length;
            const next2 = (i + 2) % polygon.length;

            if (polygon[i].x === polygon[next2].x && polygon[i].y === polygon[next2].y) {
              console.log('hole left dangling line');
              madeOptimization = true;
              const numToRemove = 2;
              const remainingLength = Math.min(polygon.length - 1 - next, numToRemove);
              if (remainingLength > 0) {
                polygon.splice(next, remainingLength);
              }
              if (numToRemove - remainingLength > 0) {
                polygon.splice(0, numToRemove - remainingLength);
              }
            } else if (polygon[i].x === polygon[next].x && polygon[i].y === polygon[next].y) {
              console.log('hole left dangling line');
              madeOptimization = true;
              polygon.splice(next, 1);
            }
          }
          if (madeOptimization) {
            continue;
          }

          for (let i = 0; i < polygon.length; i++) {
            const next = (i + 1) % polygon.length;
            const next2 = (i + 2) % polygon.length;
            const next3 = (i + 3) % polygon.length;
            const next4 = (i + 4) % polygon.length;
            const next5 = (i + 5) % polygon.length;
            const next6 = (i + 6) % polygon.length;

            if (polygon[i].x === polygon[next4].x && polygon[i].y === polygon[next4].y) {
              console.log('found hole4');
              madeOptimization = true;
              chunk.holes.push([{ ...polygon[i] }, polygon[next], polygon[next2], polygon[next3]]);
              const numToRemove = 4;
              const remainingLength = Math.min(polygon.length - 1 - next, numToRemove);
              if (remainingLength > 0) {
                polygon.splice(next, remainingLength);
              }
              if (numToRemove - remainingLength > 0) {
                polygon.splice(0, numToRemove - remainingLength);
              }
              break;
            }
            if (polygon[i].x === polygon[next5].x && polygon[i].y === polygon[next5].y) {
              console.log('found hole5');
              madeOptimization = true;
              chunk.holes.push([{ ...polygon[i] }, polygon[next], polygon[next2], polygon[next3], polygon[next4]]);
              const numToRemove = 5;
              const remainingLength = Math.min(polygon.length - 1 - next, numToRemove);
              if (remainingLength > 0) {
                polygon.splice(next, remainingLength);
              }
              if (numToRemove - remainingLength > 0) {
                polygon.splice(0, numToRemove - remainingLength);
              }
              break;
            }
            if (polygon[i].x === polygon[next6].x && polygon[i].y === polygon[next6].y) {
              console.log('found hole6');
              madeOptimization = true;
              chunk.holes.push([{ ...polygon[i] }, polygon[next], polygon[next2], polygon[next3], polygon[next4], polygon[next5]]);
              const numToRemove = 6;
              const remainingLength = Math.min(polygon.length - 1 - next, numToRemove);
              if (remainingLength > 0) {
                polygon.splice(next, remainingLength);
              }
              if (numToRemove - remainingLength > 0) {
                polygon.splice(0, numToRemove - remainingLength);
              }
              break;
            }
          }
        }
      }
    });
    chunk.holes.forEach(polygon => {
      for (let i = 0; i < polygon.length; i++) {
        const next = (i + 1) % polygon.length;
        const next2 = (i + 2) % polygon.length;

        if (polygon[i].x === polygon[next2].x && polygon[i].y === polygon[next2].y) {
          const numToRemove = 2;
          const remainingLength = Math.min(polygon.length - 1 - next, numToRemove);
          if (remainingLength > 0) {
            polygon.splice(next, remainingLength);
          }
          if (numToRemove - remainingLength > 0) {
            polygon.splice(0, numToRemove - remainingLength);
          }
        } else if (polygon[i].x === polygon[next].x && polygon[i].y === polygon[next].y) {
          polygon.splice(next, 1);
        }
      }
    });
  });

  return track;
}

export function simplifyStraightLinesInplace(polygon: Polygon): void {
  for (let i = 0; i < polygon.length; i++) {
    const next = (i + 1) % polygon.length;
    const next2 = (i + 2) % polygon.length;
    if ((polygon[i].x === polygon[next].x && polygon[next].x === polygon[next2].x)
      || ((polygon[i].y === polygon[next].y && polygon[next].y === polygon[next2].y))) {
      polygon.splice(next, 1);
      i--;
    }
  }
}

export function transformCoordinateSystem(track: Track, { scale, translate }: { scale: Point, translate: Point }): Track {
  track.chunks.forEach(chunk => {
    chunk.boundingBox.x = scale.x * chunk.boundingBox.x + translate.x;
    chunk.boundingBox.y = scale.y * chunk.boundingBox.y + translate.y;
    chunk.boundingBox.width = scale.x * chunk.boundingBox.width;
    chunk.boundingBox.height = scale.y * chunk.boundingBox.height;
    chunk.finish.forEach(finish => {
      finish.boundingBox.x = scale.x * finish.boundingBox.x + translate.x;
      finish.boundingBox.y = scale.y * finish.boundingBox.y + translate.y;
      finish.boundingBox.width = scale.x * finish.boundingBox.width;
      finish.boundingBox.height = scale.y * finish.boundingBox.height;
      finish.boundingPolygon = finish.boundingPolygon?.map(({ x, y }) => ({ x: scale.x * x + translate.x, y: scale.y * y + translate.y }));
    });
    chunk.road.forEach(polygon => polygon.forEach(point => {
      point.x = scale.x * point.x + translate.x;
      point.y = scale.y * point.y + translate.y;
    }));
    chunk.holes.forEach(polygon => polygon.forEach(point => {
      point.x = scale.x * point.x + translate.x;
      point.y = scale.y * point.y + translate.y;
    }));
  });
  return track;
}

/**
 * The offset direction should in theory be configurable through offsetDirection=1 or =-1,
 * in practice, only =1 works, to obtain the other direction, reverse the order in the input polygon instead :|
 */
export function offsetPolygon(polygon: Polygon, offsetDistance: number, offsetDirection: number): Polygon {

  const offsetedPolygon: Polygon = [];

  for (let curr = 0; curr < polygon.length; curr++) {
    const prev = (curr + polygon.length - 1) % polygon.length;
    const next = (curr + 1) % polygon.length;

    const vn = {
      x: polygon[next].x - polygon[curr].x,
      y: polygon[next].y - polygon[curr].y
    };
    const vnn = normalizeVector(vn);
    const nnn = {
      x: vnn.y,
      y: -vnn.x
    };

    const vp = {
      x: polygon[curr].x - polygon[prev].x,
      y: polygon[curr].y - polygon[prev].y
    };
    const vpn = normalizeVector(vp);
    const npn = {
      x: vpn.y * offsetDirection,
      y: -vpn.x * offsetDirection
    };

    const bis = {
      x: (nnn.x + npn.x) * offsetDirection,
      y: (nnn.y + npn.y) * offsetDirection
    };

    const bisn = normalizeVector(bis);
    const bislen = offsetDistance / Math.sqrt(1 + nnn.x * npn.x + nnn.y * npn.y);

    offsetedPolygon.push({
      x: polygon[curr].x + bislen * bisn.x,
      y: polygon[curr].y + bislen * bisn.y
    });
  }

  return offsetedPolygon;
}

function normalizeVector({ x, y }: Point): Point {
  const distance = Math.sqrt(x * x + y * y);
  return { x: x / distance, y: y / distance };
}

function distanceSquared(p1: Point, p2: Point): number {
  return Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
}

export function chopSharpSpikes(polygon: Polygon): Polygon {
  const chopped = polygon.map<Point>(({ x, y }) => ({ x, y }));
  for (let i = 0; i < chopped.length; i++) {
    const next = (i + 1) % chopped.length;
    const next2 = (i + 2) % chopped.length;
    const next3 = (i + 3) % chopped.length;

    if (true) {
      // const lineIntersect = intersect(chopped[i], chopped[next], chopped[next2], chopped[next3]);
      const lineIntersect = closestPointOnLine(chopped[i], chopped[next], chopped[next2]);
      if (lineIntersect
        && (Math.abs(lineIntersect.x - chopped[next].x) > 1 || Math.abs(lineIntersect.y - chopped[next].y) > 1)
        && pointOnLine(chopped[i], chopped[next], lineIntersect)
        && distanceSquared(chopped[i], chopped[next]) + distanceSquared(chopped[next], chopped[next2]) > 3 * (distanceSquared(chopped[i], lineIntersect) + distanceSquared(lineIntersect, chopped[next2]))
        && angle(chopped[i], chopped[next], chopped[next2]) < 0.05
      ) {
        // console.log('chop, chop1', angle(chopped[i], chopped[next], chopped[next2]));
        // chopped.splice(next, 1);
        if (Math.abs(lineIntersect.x - chopped[i].x) < 0.01 && Math.abs(lineIntersect.y - chopped[i].y) < 0.01) {
          chopped.splice(next, 1);
        } else {
          chopped[next] = lineIntersect;
        }
        i--;
        continue;
      }
    }
    if (true) {
      // const lineIntersect = intersect(chopped[i], chopped[next], chopped[next2], chopped[next3]);
      const lineIntersect = closestPointOnLine(chopped[next], chopped[next2], chopped[i]);
      if (lineIntersect
        && (Math.abs(lineIntersect.x - chopped[next].x) > 1 || Math.abs(lineIntersect.y - chopped[next].y) > 1)
        // && pointOnLine(chopped[i], chopped[next], lineIntersect)
        && distanceSquared(chopped[i], chopped[next]) + distanceSquared(chopped[next], chopped[next2]) > 1.45 * (distanceSquared(chopped[i], lineIntersect) + distanceSquared(lineIntersect, chopped[next2]))
        && angle(chopped[i], chopped[next], chopped[next2]) < 0.05
      ) {
        // chopped.splice(next, 1);
        // console.log('chop, chop2', angle(chopped[i], chopped[next], chopped[next2]));
        if (Math.abs(lineIntersect.x - chopped[next2].x) < 0.01 && Math.abs(lineIntersect.y - chopped[next2].y) < 0.01) {
          chopped.splice(next, 1);
        } else {
          chopped[next] = lineIntersect;
        }
        i--;
      }
    }

    /*const distance12 = distanceSquared(chopped[i], chopped[next]);
    const distance23 = distanceSquared(chopped[next], chopped[next2]);
    const distance13 = distanceSquared(chopped[i], chopped[next2]);

    if (distance12 + distance23 > distance13 * 1.5) {
      chopped.splice(next, 1);
      i--;
    }*/
  }
  simplifyStraightLinesInplace(chopped);
  for (let i = 0; i < chopped.length; i++) {
    const next = (i + 1) % chopped.length;
    const next2 = (i + 2) % chopped.length;

    if (chopped[i].x === chopped[next2].x && chopped[i].y === chopped[next2].y) {
      const numToRemove = 2;
      const remainingLength = Math.min(chopped.length - 1 - next, numToRemove);
      if (remainingLength > 0) {
        chopped.splice(next, remainingLength);
      }
      if (numToRemove - remainingLength > 0) {
        chopped.splice(0, numToRemove - remainingLength);
      }
    } else if (chopped[i].x === chopped[next].x && chopped[i].y === chopped[next].y) {
      chopped.splice(next, 1);
    }
  }
  return chopped;
}

// based on
// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return FALSE if the lines don't intersect
function intersect(p1: Point, p2: Point, p3: Point, p4: Point): Point | false {

  // Check if none of the lines are of length 0
  if ((p1.x === p2.x && p1.y === p2.y) || (p3.x === p4.x && p3.y === p4.y)) {
    return false;
  }

  const denominator = ((p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y));

  // Lines are parallel
  if (denominator === 0) {
    return false;
  }

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return false;
  }

  // Return a object with the x and y coordinates of the intersection
  return {
    x: p1.x + ua * (p2.x - p1.x),
    y: p1.y + ua * (p2.y - p1.y)
  };
}

function pointOnLine(l1: Point, l2: Point, p: Point): boolean {
  return Math.abs((p.y - l1.y) * (l2.x - l1.x) - (l2.y - l1.y) * (p.x - l1.x)) < 0.0001;
}


function closestPointOnLine(v: Point, w: Point, p: Point): Point {
  const l2 = distanceSquared(v, w);
  if (l2 === 0) {
    return v;
  }
  const t = Math.max(0, Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2));
  return {
    x: v.x + t * (w.x - v.x),
    y: v.y + t * (w.y - v.y)
  };
}

//    a
//  /
// b this angle
//  \
//   c
function angle(a: Point, b: Point, c: Point): number {
  const ab = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  const bc = Math.sqrt(Math.pow(b.x - c.x, 2) + Math.pow(b.y - c.y, 2));
  const ac = Math.sqrt(Math.pow(c.x - a.x, 2) + Math.pow(c.y - a.y, 2));
  return Math.acos((bc * bc + ab * ab - ac * ac) / (2 * bc * ab));
}

export type PointWithIndex = Point & { index: number, adjusted?: boolean };
export type PolygonWithIndex = PointWithIndex[];
export function augmentPolygonWithIndex(polygon: Polygon): PolygonWithIndex {
  return polygon.map((p, i) => ({ ...p, index: i }));
}

export function splitCrossingPolygons(polygon: PolygonWithIndex): PolygonWithIndex[] {
  const collect: PolygonWithIndex[] = [];
  base: for (let i = 0; i < polygon.length; i++) {
    const iS = (i + 1) % polygon.length;
    for (let j = iS + 1; j < polygon.length; j++) {
      const jS = (j + 1) % polygon.length;
      if (jS === i) {
        continue;
      }
      const testIntersect = intersect(polygon[i], polygon[iS], polygon[j], polygon[jS]);
      if (testIntersect) {
        const new1 = [...polygon.slice(0, i + 1), { ...testIntersect, index: -1 }, ...(jS !== 0 ? polygon.slice(jS) : [])];
        const new2 = [{ ...testIntersect, index: -1 }, ...polygon.slice(iS, j + 1)];
        // simplification: we only ever get small artifacts and the smaller polygon is always non-self-crossing
        collect.push(new1.length < new2.length ? new1 : new2);
        polygon = new1.length >= new2.length ? new1 : new2;
        i--;
        break;
      }
    }
  }
  return [polygon, ...collect];
}

export function windingOrder(polygon: Polygon): boolean {
  // find point with smallest y (and largest x in case of ties)
  // -> point is definitely on convex hull
  const point = polygon.reduce((bestIndex, currentPoint, currentIndex) =>
    polygon[bestIndex].y < currentPoint.y
      ? bestIndex
      : currentPoint.y < polygon[bestIndex].y
        ? currentIndex
        : polygon[bestIndex].x > currentPoint.x
          ? bestIndex
          : currentPoint.x > polygon[bestIndex].x
            ? currentIndex
            : bestIndex,
    0);

  const a = polygon[(point - 1 + polygon.length) % polygon.length];
  const b = polygon[point];
  const c = polygon[(point + 1) % polygon.length];

  return (b.x - a.x) * (c.y - a.y) - (c.y - a.x) * (b.y - a.y) > 0;
}

export function enlargeInlay(track: Track, chopped: Polygon, offseted: PolygonWithIndex): PolygonWithIndex {

  for (let i = 0; i < offseted.length; i++) {
    const iS = (i + 1) % offseted.length;

    const o = offseted[i].index;
    const oS = offseted[iS].index;

    if (o === -1 || oS === -1) {
      continue;
    }

    const c1 = offseted[i]; // chopped[(o - 1 + chopped.length) % chopped.length];
    const c2 = closestPointOnLine(chopped[o], chopped[oS], offseted[i]); // chopped[o];
    const c3 = closestPointOnLine(chopped[o], chopped[oS], offseted[iS]); // chopped[oS];
    const c4 = offseted[iS]; // chopped[(oS + 1) % chopped.length];

    const c1c2 = normalizeVector(minus(c2, c1));
    const c4c3 = normalizeVector(minus(c3, c4));

    const test = add(c2, c1c2);
    let found = false;
    track.chunks.forEach(chunk => {
      if (!found && chunk.road.some(poly => pointInPolygon(test, poly))) {
        found = true;
      }
    });
    const test2 = add(c3, c4c3);
    let found2 = false;
    track.chunks.forEach(chunk => {
      if (!found2 && chunk.road.some(poly => pointInPolygon(test2, poly))) {
        found2 = true;
      }
    });
    if (found && found2) {
      // offseted[i] = { ...closestPointOnLine(c2, c3, offseted[i]), index: o };
      // offseted[iS] = { ...closestPointOnLine(c2, c3, offseted[iS]), index: oS };
      offseted[i] = { ...c2, index: o, adjusted: true };
      offseted[iS] = { ...c3, index: oS, adjusted: true };
    }
  }

  return offseted;
}

export function generateBorderPairs(inner: PolygonWithIndex, outer: Polygon): [Point, Point][][] {
  const TARGET_LENGTH = 50;
  let index = 0;
  const pairs: [Point, Point][][] = [];
  let currentSegment: [Point, Point][] | null = null;
  while (index < inner.length) {
    const nextInnerPoint = inner[index];
    let nextOuterPoint: Point;
    if (nextInnerPoint.index === -1 /*|| nextInnerPoint.adjusted*/) {
      /*if (currentSegment !== null) {
        currentSegment = null;
      }*/
      const suggest = inner.find((v, i) => v.index !== -1 && i > index);
      if (suggest && currentSegment && currentSegment.length > 0) {
        nextOuterPoint = closestPointOnLine(currentSegment[currentSegment.length - 1][1], outer[suggest.index], nextInnerPoint);
      }
    }
    nextOuterPoint = outer[nextInnerPoint.index];
    if (nextOuterPoint) {
      if (currentSegment === null) {
        currentSegment = [];
        pairs.push(currentSegment);
      }
      const lastPointPair = currentSegment[currentSegment.length - 1];
      if (currentSegment.length > 0 && distanceSquared(lastPointPair[0], nextInnerPoint) > TARGET_LENGTH * TARGET_LENGTH) {
        const dir = normalizeVector(minus(nextInnerPoint, lastPointPair[0]));
        const distance = Math.sqrt(distanceSquared(lastPointPair[0], nextInnerPoint));
        for (let progress = 0; progress < distance;
          progress += (distance - progress >= 1.5 * TARGET_LENGTH) || distance - progress < TARGET_LENGTH
            ? TARGET_LENGTH
            : Math.max((distance - progress) / 2, TARGET_LENGTH / 2)) { // complex update function get nicely spaced segments
          // console.log(progress, distance);
          if (progress === 0) {
            // just makes the math simpler
            continue;
          }
          const intermediateInnerPoint = add(lastPointPair[0], multiply(progress, dir));
          const intermediateOuterPoint = closestPointOnLine(lastPointPair[1], nextOuterPoint, intermediateInnerPoint);
          currentSegment.push([intermediateInnerPoint, intermediateOuterPoint]);
        }
        currentSegment.push([nextInnerPoint, nextOuterPoint]);
      } else {
        currentSegment.push([nextInnerPoint, nextOuterPoint]);
      }
    }
    index++;
  }

  // close segments
  pairs.forEach(segment => {
    const first = segment[0];
    const last = segment[segment.length - 1];
    if (distanceSquared(last[0], first[0]) > TARGET_LENGTH * TARGET_LENGTH) {
      const dir = normalizeVector(minus(first[0], last[0]));
      const distance = Math.sqrt(distanceSquared(last[0], first[0]));
      for (let progress = 0; progress < distance;
        progress += (distance - progress >= 1.5 * TARGET_LENGTH) || distance - progress < TARGET_LENGTH
          ? TARGET_LENGTH
          : Math.max((distance - progress) / 2, TARGET_LENGTH / 2)) { // complex update function get nicely spaced segments
        // console.log(progress, distance);
        if (progress === 0) {
          // just makes the math simpler
          continue;
        }
        const intermediateInnerPoint = add(last[0], multiply(progress, dir));
        const intermediateOuterPoint = closestPointOnLine(last[1], first[1], intermediateInnerPoint);
        segment.push([intermediateInnerPoint, intermediateOuterPoint]);
      }
      segment.push([first[0], first[1]]);
    } else {
      segment.push([first[0], first[1]]);
    }
  });

  return pairs;
}

export function pointInConvexPolygon(point: Point, polygon: Polygon): boolean {
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

export function pointInPolygon(p: Point, polygon: Polygon): boolean {
  // based on https://stackoverflow.com/a/29915728
  // which references https://github.com/substack/point-in-polygon
  // which is based on https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];

    const inter = ((pi.y > p.y) !== (pj.y > p.y))
      && (p.x < (pj.x - pi.x) * (p.y - pi.y) / (pj.y - pi.y) + pi.x);
    if (inter) {
      inside = !inside;
    }
  }

  return inside;
}

function add(p1: Point, p2: Point): Point {
  return { x: p1.x + p2.x, y: p1.y + p2.y };
}

function minus(p1: Point, p2: Point): Point {
  return { x: p1.x - p2.x, y: p1.y - p2.y };
}

function multiply(n: number, p: Point): Point {
  return { x: n * p.x, y: n * p.y };
}
