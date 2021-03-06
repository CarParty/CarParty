extends Node

const epsilon = 0.001

const COLORS = [
	"#ffe478",
	"#3ca370",
	"#4da6ff",
	"#ffffeb",
	"#43434f",
	"#e36956",
	"#b0305c",
	"#73275c",
	"#ff6b97",
]

var used_colors = []



var current_scene = null

var key
var clients = []
var player_names = {}
var player_speed = {}
var player_color = {}
var player_path_progress = {}
var clients_ready_for_track_json = []
var player_path = {}
var player_time_to_finish = {}
var race_time = -1
var player_finished = []

var isRestart = false
var track = "First"
# Night or day
var setting = ""
var setting_outline_color = { "Night": Color.black, "": Color.black}

func _ready():
	var root = get_tree().get_root()
	current_scene = root.get_child(root.get_child_count() - 1)
	
func get_unused_color():
	var unused_colors = subtract(COLORS, used_colors)
	if not unused_colors:
		randomize()
		return Color.from_hsv(randf(), .7, .79)
	used_colors.append(unused_colors[0])
	return unused_colors[0]


func goto_scene(path):
	# This function will usually be called from a signal callback,
	# or some other function in the current scene.
	# Deleting the current scene at this point is
	# a bad idea, because it may still be executing code.
	# This will result in a crash or unexpected behavior.

	# The solution is to defer the load to a later time, when
	# we can be sure that no code from the current scene is running:
	call_deferred("_deferred_goto_scene", path)
	
func _deferred_goto_scene(path):
	# It is now safe to remove the current scene
	current_scene.free()

	# Load the new scene.
	var s = ResourceLoader.load(path)

	# Instance the new scene.
	current_scene = s.instance()

	# Add it to the active scene, as child of root.
	get_tree().get_root().add_child(current_scene)

	# Optionally, to make it compatible with the SceneTree.change_scene() API.
	get_tree().set_current_scene(current_scene)
	
func time_to_string(time):
	var ms = fmod(time,1)*100
	var seconds = fmod(time,60)
	var minutes = fmod(time, 3600) / 60
	var str_elapsed = "%02d:%02d:%02d" % [minutes, seconds, ms]
	return str_elapsed

func restart():
	goto_scene("res://scenes/HostMenu.tscn")
	player_speed = {}
	clients_ready_for_track_json = []
	player_finished = []
	player_path = {}
	player_time_to_finish = {}
	for player_name in player_names:
		player_speed[player_name]=0
		player_time_to_finish[player_name]=-1
		player_path_progress[player_name] = 0
	race_time = -1
	isRestart = true
	used_colors = []
	
static func subtract(a: Array, b: Array) -> Array:
	var result := []
	var bag := {}
	for item in b:
		if not bag.has(item):
			bag[item] = 0
		bag[item] += 1
	for item in a:
		if bag.has(item):
			bag[item] -= 1
			if bag[item] == 0:
				bag.erase(item)
		else:
			result.append(item)
	return result
