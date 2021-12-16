extends Node

export var websocket_url = "wss://cp.linus.space/ws"
var _server = WebSocketClient.new()

signal addPlayerName(client_id, client_name)
signal rmPlayerName(client_id)
signal respawn_car(client_id)
signal drift_car(client_id, pressed)


# Declare member variables here. Examples:
# var a = 2
# var b = "text"


# Called when the node enters the scene tree for the first time.
func _ready():
	_setup_client()
	
func _setup_client():
	Global.clients = []
	Global.player_names = {}
	_server = WebSocketClient.new()
	# Connect base signals to get notified of connection open, close, and errors.
	Client._server.connect("connection_closed", self, "_closed")
	Client._server.connect("connection_error", self, "_closed")
	Client._server.connect("connection_established", self, "_connected")
	Client._server.connect("data_received", self, "_on_data")

func connect_to_url():
	var err = _server.connect_to_url(websocket_url)
	if err != OK:
		print("Unable to connect")
		set_process(false)
		
func reset_connection():
	_setup_client()
	
func send_global_message(action: String, data: Dictionary):
	var message: Dictionary
	message = {"action": action}
	for key in data:
		message[key] = data[key]
	var packet: PoolByteArray = JSON.print(message).to_utf8()
	_server.get_peer(1).set_write_mode(WebSocketPeer.WRITE_MODE_TEXT)
	_server.get_peer(1).put_packet(packet)
	# print("Sent message: "+packet.get_string_from_utf8())
	
func send_client_message(action: String, data: Dictionary, client_id: String):
	var message: Dictionary
	message = {"action": action, "receiver_id": client_id}
	for key in data:
		message[key] = data[key]
	var packet: PoolByteArray = JSON.print(message).to_utf8()
	_server.get_peer(1).set_write_mode(WebSocketPeer.WRITE_MODE_TEXT)
	_server.get_peer(1).put_packet(packet)
	print("Sent message: "+packet.get_string_from_utf8())
	
func start_phase_player(phase: String, player_id: String):
	var message: Dictionary
	match phase:
		"naming":
			message = {"receiver_id": player_id,"action": "phase_change","phase": "naming"}
		"drawing":
			message = {"receiver_id": player_id,"action": "phase_change","phase": "drawing"}
		"racing":
			message = {"receiver_id": player_id,"action": "phase_change","phase": "racing"}
		"waiting":
			message = {"receiver_id": player_id,"action": "phase_change","phase": "waiting"}
		"ending":
			message = {"receiver_id": player_id,"action": "phase_change","phase": "ending"}
		_:
			print("Wtf is a "+phase+" phase?!?")
	var packet: PoolByteArray = JSON.print(message).to_utf8()
	_server.get_peer(1).set_write_mode(WebSocketPeer.WRITE_MODE_TEXT)
	_server.get_peer(1).put_packet(packet)
	print("Sent message: "+packet.get_string_from_utf8())


func start_phase_global(phase: String):
	var message: Dictionary
	match phase:
		"naming":
			message = {"action": "phase_change","phase": "naming"}
		"drawing":
			message = {"action": "phase_change","phase": "drawing"}
		"racing":
			message = {"action": "phase_change","phase": "racing"}
		"waiting":
			message = {"action": "phase_change","phase": "waiting"}
		"ending":
			message = {"action": "phase_change","phase": "ending"}
		_:
			print("Wtf is a "+phase+" phase?!?")
	var packet: PoolByteArray = JSON.print(message).to_utf8()
	_server.get_peer(1).set_write_mode(WebSocketPeer.WRITE_MODE_TEXT)
	_server.get_peer(1).put_packet(packet)
	print("Sent message: "+packet.get_string_from_utf8())


func _closed(was_clean = false):
	# was_clean will tell you if the disconnection was correctly notified
	# by the remote peer before closing the socket.
	print("Closed, clean: ", was_clean)
	set_process(false)


func _connected(proto = ""):
	# This is called on connection, "proto" will be the selected WebSocket
	# sub-protocol (which is optional)
	print("Connected with protocol: ", proto)
	# You MUST always use get_peer(1).put_packet to send data to server,
	# and not put_packet directly when not using the MultiplayerAPI.
	var message: Dictionary = {"action": "login_server","server_code": Global.key}
	var packet: PoolByteArray = JSON.print(message).to_utf8()
	_server.get_peer(1).set_write_mode(WebSocketPeer.WRITE_MODE_TEXT)
	_server.get_peer(1).put_packet(packet)
	# print("Sent message: "+packet.get_string_from_utf8())


func _on_data():
	# Print the received packet, you MUST always use get_peer(1).get_packet
	# to receive data from server, and not get_packet directly when not
	# using the MultiplayerAPI.
	var data = _server.get_peer(1).get_packet()
	var parsed_data: Dictionary = JSON.parse(data.get_string_from_utf8()).result
	
	if parsed_data.has("action"):
		# print("Received with action: ", parsed_data.action)
		match parsed_data.action:
			"connect":
				if Global.current_scene.name != "HostMenu":
					return
				Global.clients.append(parsed_data.client_id)
				Global.player_speed[parsed_data.client_id] = 0
				Global.player_time_to_finish[parsed_data.client_id] = -1
				randomize()
				Global.player_color[parsed_data.client_id] = Color.from_hsv(randf(), .7, .79)
				var player_color = {}
				player_color["color"] = "#"+Global.player_color[parsed_data.client_id].to_html(false)
				send_client_message("color_transmission", player_color, parsed_data.client_id)
				start_phase_player("naming", parsed_data.client_id)
				print("Client connected "+parsed_data.client_id)
			"disconnect":
				randomize()
				Global.player_color[parsed_data.client_id] = Color.from_hsv(randf(), .7, .79)
				var player_color = {}
				player_color["color"] = "#"+Global.player_color[parsed_data.client_id].to_html(false)
				send_client_message("color_transmission", player_color, parsed_data.client_id)
				start_phase_player("naming", parsed_data.client_id)
				Global.clients.erase(parsed_data.client_id)
				Global.player_names.erase(parsed_data.client_id)
				emit_signal("rmPlayerName",parsed_data.client_id)
				print("Client disconnected "+parsed_data.client_id)
			"player_name":
				Global.player_names[parsed_data.client_id] = parsed_data.name
				emit_signal("addPlayerName",parsed_data.client_id, parsed_data.name)
				start_phase_player("waiting", parsed_data.client_id)
				print("Player connected: "+Global.player_names[parsed_data.client_id])
			"speed_change":
				Global.player_speed[parsed_data.client_id] = parsed_data.value
			"ready_for_track_json":
				Global.clients_ready_for_track_json.append(parsed_data.client_id)
				print("Client ready for track json:", parsed_data.client_id)
			"path_transmission":
				Global.player_path[parsed_data.client_id] = parsed_data.path
				print("Client submited path: "+str(parsed_data.client_id))
			"reset_car":
				emit_signal("respawn_car",parsed_data.client_id)
			"drift_car":
				emit_signal("drift_car",parsed_data.client_id, parsed_data.start)
			_:
				print("Action not implemented: "+str(parsed_data))
	else:
		print("Error: received packet had no action field!")
		
	
	
	
	
func _process(_delta):
	# Call this in _process or _physics_process. Data transfer, and signals
	# emission will only happen when calling this function.
	_server.poll()
