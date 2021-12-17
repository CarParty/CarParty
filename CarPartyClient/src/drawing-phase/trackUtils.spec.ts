import { Chunk, Polygon, Rectangle, Track } from './track';
import { optimizeTrack } from './trackUtils';

describe('Check track optimizations', () => {

  describe('in exhaustive 2 polygon orientations', () => {
    const zeroRectangle = new Rectangle({ x: 0, y: 0, width: 0, height: 0 });
    const chunk: Chunk = {
      name: 'test',
      road: [],
      boundingBox: zeroRectangle,
      finish: [],
      start: []
    };
    const chunks = new Map<string, Chunk>([[chunk.name, chunk]]);
    const track: Track = { chunks, start: chunk };

    describe('for both clockwise', () => {

      const polygon1: Polygon = [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 0 },
      ];
      const polygon2: Polygon = [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 0 },
      ];
      const polygonMerged: Polygon[] = [[
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 0 },
        { x: 1, y: 0 },
      ], [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
      ], [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ], [
        { x: 1, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 0 },
      ]];

      for (let shift1 = 0; shift1 < polygon1.length; shift1++) {
        for (let shift2 = 0; shift2 < polygon2.length; shift2++) {
          it(`when polygon1 shifted by ${shift1} and polygon2 shifted by ${shift2}`, () => {
            const polygon1Shifted: Polygon = [];
            for (let i = 0; i < polygon1.length; i++) {
              polygon1Shifted.push(polygon1[(i + shift1) % polygon1.length]);
            }
            const polygon2Shifted: Polygon = [];
            for (let i = 0; i < polygon2.length; i++) {
              polygon2Shifted.push(polygon2[(i + shift2) % polygon2.length]);
            }
            chunk.road = [polygon1Shifted, polygon2Shifted];
            const optimizedTrack = optimizeTrack(track);
            expect(optimizedTrack.start.road.length).toBe(1);
            expect(optimizedTrack.start.road[0]).toEqual(polygonMerged[shift1]);
          });
        }
      }
    });

    describe('for both anticlockwise', () => {

      const polygon1: Polygon = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ];
      const polygon2: Polygon = [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 1, y: 1 },
      ];
      const polygonMerged: Polygon[] = [[
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ], [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 0, y: 0 },
      ], [
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
      ], [
        { x: 0, y: 1 },
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 1, y: 1 },
      ]];

      for (let shift1 = 0; shift1 < polygon1.length; shift1++) {
        for (let shift2 = 0; shift2 < polygon2.length; shift2++) {
          it(`when polygon1 shifted by ${shift1} and polygon2 shifted by ${shift2}`, () => {
            const polygon1Shifted: Polygon = [];
            for (let i = 0; i < polygon1.length; i++) {
              polygon1Shifted.push(polygon1[(i + shift1) % polygon1.length]);
            }
            const polygon2Shifted: Polygon = [];
            for (let i = 0; i < polygon2.length; i++) {
              polygon2Shifted.push(polygon2[(i + shift2) % polygon2.length]);
            }
            chunk.road = [polygon1Shifted, polygon2Shifted];
            const optimizedTrack = optimizeTrack(track);
            expect(optimizedTrack.start.road.length).toBe(1);
            expect(optimizedTrack.start.road[0]).toEqual(polygonMerged[shift1]);
          });
        }
      }
    });
  });

});
