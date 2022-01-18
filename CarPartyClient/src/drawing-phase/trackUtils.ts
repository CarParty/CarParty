import { startsWith } from '../additionalTypes';
import { Chunk, Point, Rectangle, Track } from './track';
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
        { x: finish.boundingBox.x, y: finish.boundingBox.y },
        {
          x: finish.boundingBox.x + finish.boundingBox.width * Math.cos(-finish.boundingBox.rotation),
          y: finish.boundingBox.y + finish.boundingBox.width * Math.sin(-finish.boundingBox.rotation)
        },
        {
          x: finish.boundingBox.x + finish.boundingBox.width * Math.cos(-finish.boundingBox.rotation) + finish.boundingBox.height * Math.sin(finish.boundingBox.rotation),
          y: finish.boundingBox.y + finish.boundingBox.width * Math.sin(-finish.boundingBox.rotation) + finish.boundingBox.height * Math.cos(-finish.boundingBox.rotation)
        },
        {
          x: finish.boundingBox.x + finish.boundingBox.height * Math.sin(finish.boundingBox.rotation),
          y: finish.boundingBox.y + finish.boundingBox.height * Math.cos(-finish.boundingBox.rotation)
        },
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
  track.chunks.forEach(chunk => {
    let madeOptimization = true;
    while (madeOptimization) {
      madeOptimization = false;

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

    }
  });

  return track;
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
  });
  return track;
}
