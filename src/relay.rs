use eyre::{eyre, Result};
use futures_util::{SinkExt, StreamExt};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::value::Value;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, watch};
use tokio::time::{interval, Duration};
use tokio_stream::{wrappers::WatchStream};
use tokio_tungstenite::tungstenite::Message;

lazy_static! {
    static ref CLIENT_SENDERS: Arc<Mutex<HashMap<String, mpsc::Sender<Message>>>> =
        Arc::new(Mutex::new(HashMap::new()));
    static ref CLIENT_RECEIVERS: Arc<Mutex<HashMap<String, watch::Receiver<Message>>>> =
        Arc::new(Mutex::new(HashMap::new()));
}

pub async fn run_relay(ip: &str, port: u32) -> Result<()> {
    let listener = TcpListener::bind(format!("{}:{}", ip, port)).await?;

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(accept_connection_with_print(stream));
    }
    Ok(())
}

// Send by clients and servers to inform relay
#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
enum Login {
    LoginServer,
    LoginClient,
}
#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
struct LoginMessage {
    action: Login,
    server_code: String,
    client_id: Option<String>,
}

// Sent by relay to inform servers
#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
enum ConnectOrDisconnect {
    Connect,
    Disconnect,
}
#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
struct ClientConnectionMessage {
    action: ConnectOrDisconnect,
    client_id: String,
}

async fn accept_connection_with_print(stream: TcpStream) {
    let handle = accept_connection(stream);
    let out = handle.await;
    if let Err(err) = out {
        println!("Handle had result: {}", err);
    }
}

async fn accept_connection(stream: TcpStream) -> Result<()> {
    let addr = stream.peer_addr()?;

    let ws_stream = tokio_tungstenite::accept_async(stream).await?;

    println!("New WebSocket connection: {}", addr);

    let (mut write, mut read) = ws_stream.split();

    // First, the connecting server / client needs to send a login message of the form
    // {
    //  "me": "server/client",
    //  "code": "ABCD"
    // }
    let login_message = read
        .next()
        .await
        .ok_or_else(|| eyre!("login message not recieved"))??;
    let login_message: LoginMessage = serde_json::from_str(&login_message.into_text()?)?;
    println!("{:?}", login_message);

    if login_message.action == Login::LoginServer {
        // Create new channels for this sender
        let (mpsc_sender, mut mpsc_reciever) = mpsc::channel(2048);
        let (watch_sender, watch_reciever) = watch::channel(Message::Text("".to_string()));
        // Update channels
        {
            let mut senders_map = CLIENT_SENDERS.lock().unwrap();
            let mut recievers_map = CLIENT_RECEIVERS.lock().unwrap();
            if senders_map.contains_key(&login_message.server_code)
                || recievers_map.contains_key(&login_message.server_code)
            {
                return Err(eyre!("code already exists: {}", login_message.server_code));
            }
            senders_map.insert(login_message.server_code.to_string(), mpsc_sender);
            recievers_map.insert(login_message.server_code.to_string(), watch_reciever);
        }
        // Create a timer for pings and pongs
        let mut ping_timer = interval(Duration::from_secs(1));

        // Put this into closure to definitely close the map connection
        let select_result: Result<()> = async {
            loop {
                tokio::select! {
                    Some(message) = read.next() => {
                        match message {
                            // Handle disconnect gracefully
                            Ok(Message::Close(_close_frame)) => {
                                return Ok(());
                            },
                            Ok(Message::Text(text)) => {
                                println!("Recv from Godot: {:?}", text);
                                watch_sender.send(Message::Text(text))?;
                            }
                            Ok(Message::Ping(data)) => {
                                write.send(Message::Ping(data)).await?;
                            }
                            Ok(Message::Pong(_data)) => {
                                // TODO: handle the pongs
                            }
                            message => {
                                message?;
                            }
                        }
                    }
                    // Message sanity is checked in client loop
                    Some(message) = mpsc_reciever.recv() => {
                        write.send(message).await?;
                    }
                    _tick = ping_timer.tick() => {
                        write.send(Message::Ping(Vec::new())).await?;
                    }
                }
            }
        }
        .await;
        println!(
            "Server is finished listening with result {:?}",
            select_result
        );
        // Remove this server from maps
        {
            let mut senders_map = CLIENT_SENDERS.lock().unwrap();
            let mut recievers_map = CLIENT_RECEIVERS.lock().unwrap();
            senders_map.remove(&login_message.server_code);
            recievers_map.remove(&login_message.server_code);
        }
        // Disconnect clients
        watch_sender.send(Message::Close(None))?;

        select_result?;
        // Done :)
    } else if login_message.action == Login::LoginClient {
        let client_id = login_message
            .client_id
            .ok_or_else(|| eyre!("client {} has not set its id", addr))?;
        let sender: mpsc::Sender<Message>;
        let receiver: watch::Receiver<Message>;
        {
            let senders_map = CLIENT_SENDERS.lock().unwrap();
            let recievers_map = CLIENT_RECEIVERS.lock().unwrap();
            sender = senders_map
                .get(&login_message.server_code)
                .ok_or_else(|| eyre!("server with this code does not exist: {}"))?
                .clone();
            receiver = recievers_map
                .get(&login_message.server_code)
                .ok_or_else(|| eyre!("server with this code does not exist: {}"))?
                .clone();
        }
        sender
            .send(Message::Text(serde_json::to_string(
                &ClientConnectionMessage {
                    action: ConnectOrDisconnect::Connect,
                    client_id: client_id.to_string(),
                },
            )?))
            .await?;
        // Create a timer for pings and pongs
        let mut ping_timer = interval(Duration::from_secs(1));
        
        let mut watch_stream = WatchStream::new(receiver);
        // Put this into closure to definitely send the disconnect message
        let select_result: Result<()> = async {
            loop {
                tokio::select! {
                    Some(message) = read.next() => {
                        match message {
                            // Just accept disconnects, but don't relay to server because it needs to
                            // stay online
                            Ok(Message::Close(_close_frame)) => {
                                return Ok(());
                            },
                            Ok(Message::Text(text)) => {
                                let data: Value = serde_json::from_str(&text)?;
                                match data {
                                    Value::Object(map) => {
                                        let mut map = map.clone();
                                        map.insert("client_id".to_string(), Value::String(client_id.to_string()));
                                        let data = Value::Object(map);
                                        sender.send(Message::Text(serde_json::to_string(&data)?)).await?;
                                    }
                                    _other => {
                                        // >:( you need to send objects!
                                    }
                                }
                            }
                            Ok(Message::Ping(data)) => {
                                write.send(Message::Ping(data)).await?;
                            }
                            Ok(Message::Pong(_data)) => {
                                // TODO: handle the pongs
                            }
                            message => {
                                message?;
                            }
                        }
                    }
                    Some(message) = watch_stream.next() => {
                        // The server can basically send anything and the clients will get it.
                        // But if it specifically sends a json map with the field "receiver_id",
                        // then it is not broadcasted but sent to that specific receiver. This
                        // cursed code sees if this is the case and if so, if this receiver is
                        // meant.
                        match message {
                            Message::Text(text) => {
                                println!("Sending to {}: {:?}", client_id, text);
                                match serde_json::from_str(&text) {
                                    Ok(Value::Object(map)) => {
                                        let map = map.clone();
                                        if map.contains_key("receiver_id") {
                                            if map["receiver_id"] == client_id {
                                                write.send(Message::Text(text)).await?;
                                            }
                                        } else {
                                            write.send(Message::Text(text)).await?;
                                        }
                                    }
                                    _ => {
                                        write.send(Message::Text(text)).await?;
                                    }
                                }
                            },
                            _ => {
                                write.send(message).await?;
                            }
                        }
                    }
                    _tick = ping_timer.tick() => {
                        write.send(Message::Ping(Vec::new())).await?;
                    }
                }
            }
        }.await;
        sender
            .send(Message::Text(serde_json::to_string(
                &ClientConnectionMessage {
                    action: ConnectOrDisconnect::Disconnect,
                    client_id: client_id.to_string(),
                },
            )?))
            .await?;
        select_result?;
    }
    Ok(())
}
