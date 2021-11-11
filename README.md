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
		"me": "server",
		"code" "SNEK"
	}

If there is no server running on this code, the relay will not close the connection. Now clients can
log in by connecting and sending the first message

	{
		"me": "client",
		"code" "SNEK"
	}

Now the relay just relays WebSocket messages: all messages from the server are broadcasted to the
clients and all messages from the clients are sent to the server. The rest of the protocol is
handled in the game, the relay does not need to bother.
