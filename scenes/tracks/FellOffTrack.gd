extends Area


# Declare member variables here. Examples:
# var a = 2
# var b = "text"
signal fell_off_track(car)

# Called when the node enters the scene tree for the first time.
func _ready():
	pass # Replace with function body.


# Called every frame. 'delta' is the elapsed time since the previous frame.
#func _process(delta):
#	pass


func _on_FellOffTrack_body_entered(body):
	emit_signal("fell_off_track", body)
