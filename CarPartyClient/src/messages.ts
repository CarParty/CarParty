import { Point, Track } from './drawing-phase/transportTrack';

export type ClientMessage = LoginMessageI
  | SpeedChangeMessageI
  | SetPlayerNameMessageI
  | ReadyForTrackMessageI
  | PathProgressUpdateMessageI
  | SendPathDataMessageI;

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
  action: 'path_transmission',
  path: Record<string, Point[]>
};


export type ServerMessage = PhaseChangeMessageI | TrackDataMessageI;
export type ServerActions = ServerMessage['action'];
export interface ServerActionsMap { // I don't like this, there has to be a better way
  'phase_change': PhaseChangeMessageI;
  'track_transmission': TrackDataMessageI;
}

export type PhaseChangeMessageI = {
  action: 'phase_change';
  phase: Phase
};

export type TrackDataMessageI = {
  action: 'track_transmission',
  track: Track
};

export enum Phase {
  'naming' = 'naming',
  'waiting' = 'waiting',
  'drawing' = 'drawing',
  'racing' = 'racing',
  'ending' = 'ending'
}
