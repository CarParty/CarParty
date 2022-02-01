import { ClientMessage, ServerActions, ServerActionsMap, ServerMessage } from './messages';

export class Connection {

  private readonly URL = 'wss://cp.linus.space/ws';
  private ws?: WebSocket;

  private listeners = new Map<ServerActions, ((data: any/*ServerMessage*/) => void)[]>();
  private closeListeners: (() => void)[] = [];

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
    this.closeListeners.forEach(sub => sub());
  }

  public subscribeToClose(listener: () => void): () => void {
    this.closeListeners.push(listener);
    return () => this.closeListeners = this.closeListeners.filter(l => l !== listener);
  }

  private onError = (event: Event) => {
    console.log(event);
  }

  private onMessage = (event: MessageEvent<any>) => {
    const message: ServerMessage = JSON.parse(event.data);
    console.log(message.action);
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
    console.log(data.action);
    const json = JSON.stringify(data);
    this.ws?.send(json);
  }
}
