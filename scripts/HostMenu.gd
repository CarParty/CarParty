extends Control

# Code creation
const ascii_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

# QR-Code
const QR_CODE_PATH_OS = "resources\\qrcode\\code.png"
const QR_CODE_PATH_GODOT = "res://resources/qrcode/code.png"
const QR_CODE_FOLDER_GODOT = "res://resources/qrcode"
const ZINT_BINARY_OS = "resources\\qrcode\\zint"

export var websocket_url = "wss://xn--bci0938m.ml/ws"
var _client = WebSocketClient.new()

var key

func gen_unique_string(length: int) -> String:
	var result = ""
	var rng = RandomNumberGenerator.new()
	rng.randomize()
	for _i in range(length):
		result += ascii_letters[rng.randi_range(0, ascii_letters.length()-1)]
	return result

func _ready():
	randomize()
	# guess key until we have a valid one
	key = gen_unique_string(4)
	# QR Code
	load_qr_code()
	$HTTPRequest.connect("request_completed", self, "_qrcode_request_completed")
	$MarginContainer/VBoxContainer2/VBoxContainer/CenterContainer2/HBoxContainer/Gamecode.text = key
	
	# Connect base signals to get notified of connection open, close, and errors.
	_client.connect("connection_closed", self, "_closed")
	_client.connect("connection_error", self, "_closed")
	_client.connect("connection_established", self, "_connected")
	# This signal is emitted when not using the Multiplayer API every time
	# a full packet is received.
	# Alternatively, you could check get_peer(1).get_available_packets() in a loop.
	_client.connect("data_received", self, "_on_data")

	# Initiate connection to the given URL.
	var err = _client.connect_to_url(websocket_url)
	if err != OK:
		print("Unable to connect")
		set_process(false)
		
	
func load_qr_code():
	$HTTPRequest.request("https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&color=263138&data=https://xn--bci0938m.ml/")


func _qrcode_request_completed(result, response_code, headers, body):
	if response_code == 200:
		var image = Image.new()
		var image_error = image.load_png_from_buffer(body)
		if image_error != OK:
			print("Error in image download:", result, response_code)
		var texture = ImageTexture.new()
		texture.create_from_image(image)
		$MarginContainer/VBoxContainer2/VBoxContainer/CenterContainer2/HBoxContainer/TextureRect.texture = texture
	else:
		print("Error in HTTP Request:", result, response_code)

func get_resized_texture(t: Texture, width: int = 0, height: int = 0):
	var image = t.get_data()
	if width > 0 && height > 0:
		image.resize(width, height)
	var itex = ImageTexture.new()
	itex.create_from_image(image)
	return itex

func _on_BackButton_pressed():
	get_tree().change_scene("res://scenes/StartMenu.tscn")
	
func _on_StartButton_pressed():
	get_tree().change_scene("res://scenes/Game.tscn")


func _on_HostMenu_tree_exited():
	# TODO: on exit close websocket and stuff
	pass


# websocket stuff below
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
	var message: Dictionary = {"action": "login_server","server_code": key}
	var packet: PoolByteArray = JSON.print(message).to_utf8()
	_client.get_peer(1).put_packet(packet)
	print("Sent message: "+packet.get_string_from_utf8())
	
	var message2: Dictionary = {"action": "login_client","server_code": key,"client_id": "467123746"}
	var packet2: PoolByteArray = JSON.print(message2).to_utf8()
	_client.get_peer(1).put_packet(packet2)
	print("Sent message: "+packet2.get_string_from_utf8())
	
	var message3: Dictionary = {"receiver_id": "467123746",	"any_json_here": "dont_care"}
	var packet3: PoolByteArray = JSON.print(message3).to_utf8()
	_client.get_peer(1).put_packet(packet3)
	print("Sent message: "+packet3.get_string_from_utf8())

func _on_data():
	# Print the received packet, you MUST always use get_peer(1).get_packet
	# to receive data from server, and not get_packet directly when not
	# using the MultiplayerAPI.
	print("Got data from server: ", _client.get_peer(1).get_packet().get_string_from_utf8())

func _process(delta):
	# Call this in _process or _physics_process. Data transfer, and signals
	# emission will only happen when calling this function.
	_client.poll()
