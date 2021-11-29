export type Track = Record<string, Chunk>;

export type Chunk = {
  Road: Road;
  Area: Area;
  [K: `Finish#${string}`]: Area;
};

export type Area = {
  position: Point;
  size: Point;
};

export type Road = Triangle[];

export type Triangle = [Point, Point, Point];

export type Point = [number, number];
