extends Node

export var websocket_url = "wss://cp.linus.space/ws"
var _server = null

signal addPlayerName(client_id, client_name)
signal rmPlayerName(client_id)
signal respawn_car(client_id)
signal drift_car(client_id, pressed)
signal exit_player(client_id)


# Declare member variables here. Examples:
# var a = 2
# var b = "text"


# Called when the node enters the scene tree for the first time.
func _ready():
	_setup_client()

func send_packet(bytes):
	if _server.get_peer(1).is_connected_to_host():
		_server.get_peer(1).set_write_mode(WebSocketPeer.WRITE_MODE_TEXT)
		_server.get_peer(1).put_packet(bytes)
	
func _setup_client():
	if(not Global.isRestart):
		Global.key = gen_random_string(4)
	Global.clients = []
	Global.player_names = {}
	_server = WebSocketClient.new()
	# Connect base signals to get notified of connection open, close, and errors.
	Client._server.connect("connection_closed", self, "_closed")
	Client._server.connect("connection_error", self, "_closed")
	Client._server.connect("connection_established", self, "_connected")
	Client._server.connect("data_received", self, "_on_data")
	print("Created a new server!!")

func connect_to_url():
	var err = _server.connect_to_url(websocket_url)
	if err != OK:
		print("Unable to connect")
		set_process(false)
	else:
		print("Connected to URL!!! " + websocket_url)
		
func reset_connection():
	_setup_client()
	
func send_global_message(action: String, data: Dictionary):
	var message: Dictionary
	message = {"action": action}
	for key in data:
		message[key] = data[key]
	var packet: PoolByteArray = JSON.print(message).to_utf8()
	send_packet(packet)
	# print("Sent message: "+packet.get_string_from_utf8())
	
func send_client_message(action: String, data: Dictionary, client_id: String):
	var message: Dictionary
	message = {"action": action, "receiver_id": client_id}
	for key in data:
		message[key] = data[key]
	var packet: PoolByteArray = JSON.print(message).to_utf8()
	send_packet(packet)
	
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
	send_packet(packet)
	print("Sent message: "+packet.get_string_from_utf8())


func start_phase_global(phase: String):
	for player in Global.clients:
		start_phase_player(phase, player)

func _closed(was_clean = false):
	# was_clean will tell you if the disconnection was correctly notified
	# by the remote peer before closing the socket.
	print("Closed, clean: ", was_clean)
	set_process(false)


func _connected(proto = ""):
	# guess key until we have a valid one
	# This is called on connection, "proto" will be the selected WebSocket
	# sub-protocol (which is optional)
	print("Connected with protocol: ", proto)
	# You MUST always use get_peer(1).put_packet to send data to server,
	# and not put_packet directly when not using the MultiplayerAPI.
	var message: Dictionary = {"action": "login_server","server_code": Global.key}
	var packet: PoolByteArray = JSON.print(message).to_utf8()
	send_packet(packet)
	print("Sent message: "+packet.get_string_from_utf8())
	
	
func send_global_message_by_chunk(action: String, message: Dictionary):
	var packet: String = JSON.print(message)
	var chars_per_packet = 5000
	#warning-ignore:integer_division
	var total_num_packets = (len(packet) / chars_per_packet) + 1
	var i = 0
	var poll_counter = 0
	while i * chars_per_packet < len(packet):
		if poll_counter >= 1:
			yield()
			poll_counter = 0
		var next_i = i + 1
		var last_char = min(next_i * chars_per_packet, len(packet))
		var part_packet = packet.substr(i * chars_per_packet, last_char - (i * chars_per_packet))

		var json = {
			"action": action,
			"packet_num": i,
			"total_num_packets": total_num_packets,
			"encoded_message": part_packet
		}
		var bytes: PoolByteArray = JSON.print(json).to_utf8()
#		print(JSON.print(json))
		send_packet(bytes)
		i = next_i
		poll_counter += 1


func sort_packets_by_id(a, b):
	return a.packet_num < b.packet_num

var partial_packets = {}
func track_message_handler(data: Dictionary):
	var client_id = data.client_id
	if not client_id in partial_packets:
		partial_packets[client_id] = []
	partial_packets[client_id].append(data)
	print("Got ", len(partial_packets[client_id]), " packets for ", client_id)
	if len(partial_packets[client_id]) == partial_packets[client_id][0].total_num_packets:
		partial_packets[client_id].sort_custom(self, "sort_packets_by_id")
		var final_packet = ""
		for packet in partial_packets[client_id]:
			final_packet += packet.encoded_path
		var packet_json = JSON.parse(final_packet).result
		Global.player_path[client_id] = packet_json
	
func _on_data():
	# Print the received packet, you MUST always use get_peer(1).get_packet
	# to receive data from server, and not get_packet diClient connectedrectly when not
	# using the MultiplayerAPI.
	var data = _server.get_peer(1).get_packet()
	var parsed_data: Dictionary = JSON.parse(data.get_string_from_utf8()).result
	
	if parsed_data.has("action"):
		match parsed_data.action:
			"connect":
				if Global.current_scene.name != "HostMenu":
					return
				Global.clients.append(parsed_data.client_id)
				Global.player_speed[parsed_data.client_id] = 0
				Global.player_time_to_finish[parsed_data.client_id] = -1
				Global.player_path_progress[parsed_data.client_id] = 0
				randomize()
				Global.player_color[parsed_data.client_id] = Color(Global.get_unused_color())
				var player_color = {}
				player_color["color"] = "#"+Global.player_color[parsed_data.client_id].to_html(false)
				send_client_message("color_transmission", player_color, parsed_data.client_id)
				start_phase_player("naming", parsed_data.client_id)
				print("Client connected "+parsed_data.client_id)
			"disconnect":
				Global.clients.erase(parsed_data.client_id)
				Global.player_names.erase(parsed_data.client_id)
				emit_signal("exit_player",parsed_data.client_id)
				emit_signal("rmPlayerName",parsed_data.client_id)
				print("Client disconnected "+parsed_data.client_id)
			"player_name":
				Global.player_names[parsed_data.client_id] = parsed_data.name
				emit_signal("addPlayerName",parsed_data.client_id, parsed_data.name)
				start_phase_player("waiting", parsed_data.client_id)
				print("Player connected: "+Global.player_names[parsed_data.client_id])
			"speed_change":
				if parsed_data.value != null:
					Global.player_speed[parsed_data.client_id] = parsed_data.value
			"ready_for_track_json":
				Global.clients_ready_for_track_json.append(parsed_data.client_id)
				print("Client ready for track json:", parsed_data.client_id)
			"path_transmission":
				Global.player_path_progress[parsed_data.client_id] = 100000
				track_message_handler(parsed_data)
			"reset_car":
				emit_signal("respawn_car",parsed_data.client_id)
			"drift_car":
				emit_signal("drift_car",parsed_data.client_id, parsed_data.start)
			"exit":
				emit_signal("exit_player",parsed_data.client_id)
			"path_progress_update":
				Global.player_path_progress[parsed_data.client_id] += 1 
				print(str(parsed_data))
			_:
				print("Action not implemented: "+str(parsed_data))
	else:
		print("Error: received packet had no action field!")
	
func restart_at_hostmenu():
	partial_packets = {}
	
	for client_id in Global.player_names:
		print("client_id  ",client_id)
		var player_color = {}
		player_color["color"] = "#"+Global.player_color[client_id].to_html(false)
		send_client_message("color_transmission", player_color, client_id)
		emit_signal("addPlayerName",client_id, Global.player_names[client_id])
		start_phase_player("waiting", client_id)
	
func _process(_delta):
	# Call this in _process or _physics_process. Data transfer, and signals
	# emission will only happen when calling this function.
	_server.poll()


const ascii_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
func gen_random_string(length: int) -> String:
	var result = ""
	var rng = RandomNumberGenerator.new()
	rng.randomize()
	for _i in range(length):
		result += ascii_letters[rng.randi_range(0, ascii_letters.length()-1)]
	return result
