extends Camera

# Controls how fast the camera moves
export var lerp_speed = 5

# Set the target node in the Inspector
export (NodePath) var target_path = null
# Desired position of camera, relative to target. (0, 5, 7), for example, would be behind and above.
export (Vector3) var offset = Vector3(0, 0.8, -2)
var target = null

func _ready():
	pass

func _physics_process(delta):
	# If there's no target, don't do anything
	if !target:
		return
	# Find the destination - target's position + the offset
	var target_pos = target.global_transform.translated(offset)
	# Interpolate the current position with the destination
	
	global_transform = global_transform.interpolate_with(target_pos, lerp_speed * delta)
	
	# Always be pointing at the target
	look_at(target.global_transform.origin, Vector3.UP)
