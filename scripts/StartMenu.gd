extends Control

var scene_path_to_load

# Called when the node enters the scene tree for the first time.
func _ready():
	for button in $MarginContainer/Menu/CenterRow/Buttons.get_children():
		button.connect("pressed", self, "_on_Button_pressed", [button.scene_to_load])
		
func _on_Button_pressed(scene_to_load):
	scene_path_to_load = scene_to_load
	$FadeIn.show()
	$FadeIn.fade_in()

func _on_FadeIn_fade_finished():
	if scene_path_to_load == "exit":
		get_tree().quit()
	else:
		Global.goto_scene(scene_path_to_load)

