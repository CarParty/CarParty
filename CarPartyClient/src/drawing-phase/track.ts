export type Track = {
  chunks: Map<string, Chunk>;
  start: Chunk;
};

export type Chunk = {
  name: string;
  road: Polygon[];
  boundingBox: Rectangle;
  finish: {
    from?: Chunk;
    fromChunkName: string,
    boundingBox: Rectangle;
  }[];
  start: Chunk[];
};

export type Rectangle = {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

export type Polygon = Point[];

export type Point = {
  x: number;
  y: number;
};
