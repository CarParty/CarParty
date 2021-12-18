import { Point, Track } from './drawing-phase/transportTrack';

export type ClientMessage = LoginMessageI
  | SpeedChangeMessageI
  | SetPlayerNameMessageI
  | ReadyForTrackMessageI
  | PathProgressUpdateMessageI
  | SendPathDataMessageI
  | ResetCarMessageI
  | DriftCarMessageI;

export type LoginMessageI = {
  action: 'login_client';
  server_code: string;
  client_id: string;
};

export type SpeedChangeMessageI = {
  action: 'speed_change';
  value: number;
};

export type SetPlayerNameMessageI = {
  action: 'player_name';
  name: string;
};

export type ReadyForTrackMessageI = {
  action: 'ready_for_track_json';
};

export type PathProgressUpdateMessageI = {
  action: 'path_progress_update';
  area: string;
};

export type SendPathDataMessageI = {
  action: 'path_transmission';
  path: Record<string, Point[]>;
  retry: number;
};

export type ResetCarMessageI = {
  action: 'reset_car';
};

export type DriftCarMessageI = {
  action: 'drift_car';
  start: boolean;
};


export type ServerMessage = ServerActionsMap[ServerActions];
export type ServerActions = keyof ServerActionsMap;
export interface ServerActionsMap { // not great, but at least not completely duplicated as before
  'phase_change': PhaseChangeMessageI;
  'color_transmission': CarColorMessageI;
  'track_transmission': TrackDataMessageI;
}

export type PhaseChangeMessageI = {
  action: 'phase_change';
  phase: Phase;
};

export type CarColorMessageI = {
  action: 'color_transmission';
  color: HexColor;
};

export type TrackDataMessageI = {
  action: 'track_transmission';
  track: Track;
};

export enum Phase {
  'naming' = 'naming',
  'waiting' = 'waiting',
  'drawing' = 'drawing',
  'racing' = 'racing',
  'ending' = 'ending'
}

export type HexColor = `#${string}`;
/*type HexLower = Uppercase<'0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'>;
type HexLargerUppercase = Uppercase<'A' | 'B' | 'C' | 'D' | 'E' | 'F'>;
type HexLargerLowercase = Lowercase<HexLargerUppercase>;
type HexSymbol = HexLower | HexLargerUppercase | HexLargerLowercase;

// source: https://stackoverflow.com/a/68767912
export type HexColor<T extends string> =
  T extends `#${HexSymbol}${HexSymbol}${HexSymbol}${infer Rest1}`
  ? (Rest1 extends ``
    ? never // change to _T_ to enable three-digit hex color
    : (
      Rest1 extends `${HexSymbol}${HexSymbol}${HexSymbol}`
      ? T  // six-digit hex color
      : never
    )
  )
  : never;
function hex<T extends string>(s: HexColor<T>): T {
  return s;
}*/
