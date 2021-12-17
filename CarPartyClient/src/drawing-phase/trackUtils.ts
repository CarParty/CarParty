import { Chunk, Rectangle, Track } from './track';
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
    start: startChunk ?? chunks.values().next().value // manually decide start chunk if unset
  };
}

export function optimizeTrack(track: Track): Track {
  track.chunks.forEach(chunk => {
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

export function transformCoordinateSystem(track: Track): Track {
  const [scaleX, scaleY] = [50, 50];
  const [translateX, translateY] = [0, 0];
  track.chunks.forEach(chunk => {
    chunk.boundingBox.x = scaleX * chunk.boundingBox.x + translateX;
    chunk.boundingBox.y = scaleY * chunk.boundingBox.y + translateY;
    chunk.boundingBox.width = scaleX * chunk.boundingBox.width;
    chunk.boundingBox.height = scaleY * chunk.boundingBox.height;
    chunk.finish.forEach(finish => {
      finish.boundingBox.x = scaleX * finish.boundingBox.x + translateX;
      finish.boundingBox.y = scaleY * finish.boundingBox.y + translateY;
      finish.boundingBox.width = scaleX * finish.boundingBox.width;
      finish.boundingBox.height = scaleY * finish.boundingBox.height;
    });
    chunk.road.forEach(polygon => polygon.forEach(point => {
      point.x = scaleX * point.x + translateX;
      point.y = scaleY * point.y + translateY;
    }));
  });
  return track;
}
