use std::collections::HashMap;
use tokio::net::{TcpListener, TcpStream};
use futures_util::{StreamExt, SinkExt};
use serde::{Serialize, Deserialize};
use eyre::{Result, eyre};
use lazy_static::lazy_static;
use tokio::sync::{mpsc, watch};
use tokio_tungstenite::tungstenite::Message;
use std::sync::{Arc, Mutex};
use core::ops::Deref;

// A channel message is sent from the server to the clients. It can either be a literal
// message or a directive to disconnect the connection if the server disconnects.
// From the clients to the server, only literal messages are sent.
#[derive(Debug, PartialEq, Clone)]
enum ChannelMessage {
    Message(Message),
    // Disconnect the connection because server disconnected
    Disconnect,
    // Standard watch message
    NoOp
}

lazy_static! {
    static ref CLIENT_SENDERS: Arc<Mutex<HashMap<String, mpsc::Sender<Message>>>> = Arc::new(Mutex::new(HashMap::new()));
    static ref CLIENT_RECEIVERS: Arc<Mutex<HashMap<String, watch::Receiver<ChannelMessage>>>> = Arc::new(Mutex::new(HashMap::new()));
}

pub async fn run_relay(ip: &str, port: u32) -> Result<()> {
    let listener = TcpListener::bind(format!("{}:{}", ip, port)).await?;

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(accept_connection_with_print(stream));
    }
    Ok(())
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
enum ServerOrClient {
    #[serde(rename = "server")]
    Server,
    #[serde(rename = "client")]
    Client
}
#[derive(Serialize, Deserialize, Debug, PartialEq)]
struct LoginMessage {
    me: ServerOrClient,
    code: String
}

async fn accept_connection_with_print(stream: TcpStream) {
    let handle = accept_connection(stream);
    let out = handle.await.unwrap();
    println!("Handle had result {:?}", out);
}

async fn accept_connection(stream: TcpStream) -> Result<()> {
    let addr = stream.peer_addr().expect("connected streams should have a peer address");
    println!("Peer address: {}", addr);

    let ws_stream = tokio_tungstenite::accept_async(stream)
        .await
        .expect("Error during the websocket handshake occurred");

    println!("New WebSocket connection: {}", addr);

    let (mut write, mut read) = ws_stream.split();

    // First, the connecting server / client needs to send a login message of the form
    // {
    //  "me": "server/client",
    //  "code": "ABCD"
    // }
    let login_message = read.next().await.ok_or_else(|| eyre!("login message not recieved"))??;
    let login_message: LoginMessage = serde_json::from_str(&login_message.into_text()?)?;
    println!("{:?}", login_message);

    if login_message.me == ServerOrClient::Server {
        // Create new channels for this sender
        let (mpsc_sender, mut mpsc_reciever) = mpsc::channel(32);
        let (watch_sender, watch_reciever) = watch::channel(ChannelMessage::NoOp);
        // Update channels
        {
            let mut senders_map = CLIENT_SENDERS.lock().unwrap();
            let mut recievers_map = CLIENT_RECEIVERS.lock().unwrap();
            if senders_map.contains_key(&login_message.code) || recievers_map.contains_key(&login_message.code) {
                return Err(eyre!("code already exists: {}", login_message.code));
            }
            senders_map.insert(login_message.code.to_string(), mpsc_sender);
            recievers_map.insert(login_message.code.to_string(), watch_reciever);
        }
        // Put this into closure to definitely close the map connection
        let select_result: Result<()> = async {
            loop {
                tokio::select! {
                    Some(message) = read.next() => {
                        watch_sender.send(ChannelMessage::Message(message?))?;
                    }
                    Some(message) = mpsc_reciever.recv() => {
                        write.send(message).await?;
                    }
                }
            }
        }.await;
        // Remove this server from maps
        {
            let mut senders_map = CLIENT_SENDERS.lock().unwrap();
            let mut recievers_map = CLIENT_RECEIVERS.lock().unwrap();
            senders_map.remove(&login_message.code);
            recievers_map.remove(&login_message.code);
        }
        // Disconnect clients
        watch_sender.send(ChannelMessage::Disconnect)?;

        select_result?;
        // Done :)
    } else if login_message.me == ServerOrClient::Client {
        let sender: mpsc::Sender<Message>;
        let mut receiver: watch::Receiver<ChannelMessage>;
        {
            let senders_map = CLIENT_SENDERS.lock().unwrap();
            let recievers_map = CLIENT_RECEIVERS.lock().unwrap();
            sender = senders_map.get(&login_message.code).ok_or_else(|| eyre!("server with this code does not exist: {}"))?.clone();
            receiver = recievers_map.get(&login_message.code).ok_or_else(|| eyre!("server with this code does not exist: {}"))?.clone();
        }
        loop {
            tokio::select! {
                Some(message) = read.next() => {
                    sender.send(message?).await?;
                }
                Ok(_) = receiver.changed() => {
                    let message: ChannelMessage;
                    {
                        let borrow = receiver.borrow_and_update();
                        message = borrow.deref().clone();
                    }
                    match message {
                        // Relay literal messages from server
                        ChannelMessage::Message(message) => {
                            write.send(message).await?;
                        },
                        // Disconnect if server disconnects
                        ChannelMessage::Disconnect => {
                            break;
                        },
                        ChannelMessage::NoOp => {
                        },
                    }
                }
            }
        }
    }
    Ok(())
}
