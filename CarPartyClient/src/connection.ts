import { ClientMessage, ServerActions, ServerActionsMap, ServerMessage } from './messages';

export class Connection {

  private readonly URL = 'wss://cp.linus.space/ws';
  private ws?: WebSocket;

  private listeners = new Map<ServerActions, ((data: any/*ServerMessage*/) => void)[]>();

  constructor() { }

  async connect(): Promise<void> {
    console.log('listeners', this.listeners);
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.URL);
      this.ws.addEventListener('open', (event) => { resolve(); this.onOpen(event); });
      this.ws.addEventListener('close', this.onClose);
      this.ws.addEventListener('error', this.onError);
      this.ws.addEventListener('message', this.onMessage);
    });
  }

  private onOpen = (event: Event) => {
    console.log(event);
  }

  private onClose = (event: CloseEvent) => {
    console.log(event);
  }

  private onError = (event: Event) => {
    console.log(event);
  }

  private onMessage = (event: MessageEvent<any>) => {
    console.log(event);
    const message: ServerMessage = JSON.parse(event.data);
    this.listeners.get(message.action)?.forEach(sub => sub(message));
  }

  public subscribe<K extends ServerActions>(action: K, subscriber: (data: ServerActionsMap[K]) => void): () => void {
    if (!this.listeners.has(action)) {
      this.listeners.set(action, []);
    }
    const subscribers = this.listeners.get(action);
    subscribers?.push(subscriber);
    // return unsubscribe function
    return () => this.listeners.set(action, this.listeners.get(action)?.filter(sub => sub !== subscriber) ?? []);
  }

  public send(data: ClientMessage): void {
    const json = JSON.stringify(data);
    console.log(json);
    this.ws?.send(json);
  }
}
