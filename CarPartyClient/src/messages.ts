export type ClientMessage = LoginMessageI | SpeedChangeMessageI | SetPlayerNameMessageI;

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

export type ServerMessage = PhaseChangeMessageI;
export type ServerActions = ServerMessage['action'];

export type PhaseChangeMessageI = {
  action: 'phase_change';
  phase: Phase
};

export enum Phase {
  'naming' = 'naming',
  'waiting' = 'waiting',
  'drawing' = 'drawing',
  'racing' = 'racing',
  'ending' = 'ending'
}
