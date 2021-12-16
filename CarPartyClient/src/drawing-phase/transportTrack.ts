export type Track = Record<string, Chunk>;

export type Chunk = {
  isFirst?: boolean;
  Road: Road;
  Area: Area;
  TrackObject?: Road;
  [K: `Finish#${string}`]: Area;
};

export type Area = {
  position: Point;
  size: Point;
  rotation?: number;
};

export type Road = Triangle[];

export type Triangle = [Point, Point, Point];

export type Point = [number, number];