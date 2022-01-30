export type Track = {
  chunks: Map<string, Chunk>;
  start: Chunk;
};

export type Chunk = {
  name: string;
  road: Polygon[];
  holes: Polygon[];
  boundingBox: Rectangle;
  finish: {
    from?: Chunk;
    fromChunkName: string,
    boundingBox: Rectangle;
    boundingPolygon?: Polygon;
    svgEl?: SVGRectElement;
  }[];
  start: Chunk[];
  roadSvgContainerEl?: SVGGElement;
  roadSvgEls?: SVGPolygonElement[];
  roadBorderSvgEls?: SVGPolygonElement[];
};

type PositionAndSize = { x: number, y: number, width: number, height: number };
type BoundingPositions = { x1: number, x2: number, y1: number, y2: number };
export class Rectangle {

  public x: number;
  public y: number;
  public width: number;
  public height: number;

  get p1(): Point {
    return { x: this.x, y: this.y };
  }

  get p2(): Point {
    return {
      x: this.x + this.width * Math.cos(-this.rotation),
      y: this.y + this.width * Math.sin(-this.rotation)
    };
  }

  get p3(): Point {
    return {
      x: this.x + this.width * Math.cos(-this.rotation) + this.height * Math.sin(this.rotation),
      y: this.y + this.width * Math.sin(-this.rotation) + this.height * Math.cos(-this.rotation)
    };
  }

  get p4(): Point {
    return {
      x: this.x + this.height * Math.sin(this.rotation),
      y: this.y + this.height * Math.cos(-this.rotation)
    };
  }

  constructor(values: PositionAndSize | BoundingPositions, public rotation: number = 0) {
    if ('x' in values) {
      this.x = values.x;
      this.y = values.y;
      this.width = values.width;
      this.height = values.height;
    } else {
      this.x = Math.min(values.x1, values.x2);
      this.y = Math.min(values.y1, values.y2);
      this.width = Math.abs(values.x2 - values.x1);
      this.height = Math.abs(values.y2 - values.y1);
    }
  }
}

export type Polygon = Point[];

export type Point = {
  x: number;
  y: number;
};
