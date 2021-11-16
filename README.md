# The CarParty Websocket Relay

## The problem
The game CarParty runs on a big screen with many small screens as the controllers. These should
communicate over the WebSocket protocol. But there is no guarantee that the partys are in an open
network that just allows WebSocket servers. 

## (Hopefully) the solution
This relay runs in the internet and provides a single, global WebSocket server for all CarParty
games. The game server is a formally a WebSocket client to the relay. When a server logs in, it
guesses a game code that the players will type in, will connect to the relay and send the first
message

	{
		"action": "login_server",
		"server_code" "SNEK"
	}

If there is no server running on this code, the relay will not close the connection. Now clients can
log in by connecting and sending the first message

	{
		"action": "login_client",
		"server_code" "SNEK",
		"client_id": "467123746"
	}

(Note: It is possible that multiple clients have the same `client_id`, but not possible that multiple
servers have the same `server_code`. It is recommended that clients use a persistent random number.)

Now the relay just relays WebSocket messages: all messages from the server are broadcasted to the
clients and all messages from the clients are sent to the server. Aditionally, the server is
informed about connecting and disconnecting clients with this message:

	{
		"action": "connect / disconnect"
		"client_id": <id of client>
	}

The relay always equips incoming messages from clients with a `client_id` field that is the id of
the client that has sent the message. This means messages from clients must always be in JSON
format.

The server can send messages to specific clients instead of broadcasting by sending them in JSON map
format with a `receiver_id` field equipped with the `client_id` of the intended receiver. If there
are multiple clients with this id, both will get them, if there are no clients with the id, silently
nobody will get the message. Example:

	{
		"receiver_id": "467123746",
		"any_json_here": "dont_care"
	}

## Errors & Disconnects

The relay basically does not communicate errors with the clients (but will log them). It will
immediately disconnect any client that does not conform with the expected format. If for instance
the server code does not exist, for now there is also just a silent disconnect implemented.  Once
the server disconnects, all clients will be disconnected as well.

## Installation / Running
[Install Rust](https://www.rust-lang.org/tools/install). Run
	
	cargo build --release

Now you can use the help with

	./target/release/carparty-relay -h
