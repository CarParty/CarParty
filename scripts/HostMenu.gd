extends Control

# Code creation
const ascii_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

var scene_path_to_load

func gen_unique_string(length: int) -> String:
	var result = ""
	var rng = RandomNumberGenerator.new()
	rng.randomize()
	for _i in range(length):
		result += ascii_letters[rng.randi_range(0, ascii_letters.length()-1)]
	return result

func _ready():
	
	# guess key until we have a valid one
	Global.key = gen_unique_string(4)
	# QR Code
	load_qr_code()
	$HTTPRequest.connect("request_completed", self, "_qrcode_request_completed")
	$MarginContainer/VBoxContainer2/HBoxContainer2/VBoxContainer/CenterContainer2/HBoxContainer/Gamecode.text = Global.key
	
	Client.connect_to_url()	
	Client.connect("addPlayerName", self, "addPlayerName")
	Client.connect("rmPlayerName", self, "rmPlayerName")
	
	if OS.is_debug_build():
		$MarginContainer/VBoxContainer2/HBoxContainer2/VBoxContainer/CenterContainer4/HBoxContainer/Link.text = "staging.car-party.de"
	
func load_qr_code():
	var url = "car-party.de"
	if OS.is_debug_build():
		url = "staging.car-party.de"
	$HTTPRequest.request("https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=Q&margin=0&data=https://" + url + "/?room=" + Global.key)


func _qrcode_request_completed(result, response_code, _headers, body):
	if response_code == 200:
		var image = Image.new()
		var image_error = image.load_png_from_buffer(body)
		if image_error != OK:
			print("Error in image download:", result, response_code)
		var texture = ImageTexture.new()
		texture.create_from_image(image)
		$MarginContainer/VBoxContainer2/HBoxContainer2/VBoxContainer/CenterContainer2/HBoxContainer/TextureRect.texture = texture
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
	Client.reset_connection()
	Global.goto_scene("res://scenes/StartMenu.tscn")
	
	
func _on_StartButton_pressed():
	for player in Global.clients:
		if not Global.player_names.has(player):
			Global.clients.erase(player)
			Global.player_names.erase(player)
			rmPlayerName(player)
			print("Client disconnected "+player)
	if Global.player_names.size() > 0:
		scene_path_to_load = "res://scenes/Game.tscn"
		$FadeIn.show()
		$FadeIn.fade_in()
	
func _on_FadeIn_fade_finished():
	if scene_path_to_load == "res://scenes/Game.tscn":
		print("Drawing phase started.")
		Client.start_phase_global("drawing")
	Global.goto_scene(scene_path_to_load)


func _on_HostMenu_tree_exited():
	pass


# websocket stuff below
func _process(_delta):
	if Global.player_names.size() <= 0:
		$MarginContainer/VBoxContainer2/HBoxContainer/StartButton.disabled = true
	else:
		$MarginContainer/VBoxContainer2/HBoxContainer/StartButton.disabled = false

	$MarginContainer2/VBoxContainer/Waiting.text = "waiting for " + str(Global.clients.size()-Global.player_names.size()) + " .."
	$MarginContainer/VBoxContainer2/HBoxContainer2/VBoxContainer/CenterContainer3/HBoxContainer/PlayerAmountNumber.text = str(Global.clients.size())

func addPlayerName(id, name):
	var container = HBoxContainer.new()
	container.name = id
	print(id)
	var font = DynamicFont.new()
	font.font_data = load("res://resources/fonts/Clickuper.ttf")
	font.size = 30
	var font2 = DynamicFont.new()
	font2.font_data = load("res://resources/fonts/Clickuper.ttf")
	font2.size = 20
	
	var label = Label.new()
	label.size_flags_vertical = false;
	label.text = "   " + name + "  "
	label.set("custom_fonts/font", font)
	container.add_child(label)
	
	var kickButton = Button.new()
	kickButton.name = id
	kickButton.text = "kick?"
	kickButton.set("custom_fonts/font", font2)
	kickButton.size_flags_vertical = false;
	kickButton.connect("pressed", self, "_kickButton_pressed", [kickButton])
	container.add_child(kickButton)
	$MarginContainer2/VBoxContainer/VBoxContainer.add_child(container)

func _kickButton_pressed(kickButton):
	var id = kickButton.name
	Global.clients.erase(id)
	Global.player_names.erase(id)
	rmPlayerName(id)
	print("Client disconnected "+id)
	
func rmPlayerName(id):
	if get_node("MarginContainer2/VBoxContainer/VBoxContainer/" +id) != null:
		get_node("MarginContainer2/VBoxContainer/VBoxContainer/" +id).queue_free()


func _on_Link_pressed():
	var url = "car-party.de"
	if OS.is_debug_build():
		url = "staging.car-party.de"
	OS.shell_open("http://" + url + "/?room=" + Global.key)


func _on_First_pressed():
	Global.track = "First";
func _on_Forest_pressed():
	Global.track = "Forest";
func _on_Eight_pressed():
	Global.track = "Eight";


func _on_Night_toggled(button_pressed):
	if Global.setting != "Night":
		Global.setting = "Night"
	else:
		Global.setting = ""
