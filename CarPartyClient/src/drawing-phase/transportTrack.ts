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
  rotation?: `(${number}, ${number}, ${number})`; // why exactly is this a string of a numeric 3-tuple?
};

export type Road = Triangle[];

export type Triangle = [Point, Point, Point];

export type Point = [number, number];
