extends Camera

# Controls how fast the camera moves
export var lerp_speed = 5

# Set the target node in the Inspector
export (NodePath) var target_path = null
# Desired position of camera, relative to target. (0, 5, 7), for example, would be behind and above.
export (Vector3) var offset = Vector3(0, 1.4, -2)
var target = null
var origin_offset = Vector3()
# clockwise:1,  counterclockwise:-1
var rotation_dir = 1
var camera_dist = 0
var camera_rotate_speed = 2
var camera_rotate_angle = 0
var max_angle = PI
var isRotate = false

func _ready():
	camera_dist = sqrt(pow(offset.x,2)+pow(offset.z,2))
	origin_offset.x = 0
	origin_offset.z = -camera_dist
	camera_rotate_angle = Vector2(-origin_offset.x,origin_offset.z).angle_to(Vector2(-offset.x,offset.z))
	pass

func _physics_process(delta):
	# If there's no target, don't do anything
	if !target:
		return
	
	if isRotate:
		rotate_camera(delta)
		
	# Find the destination - target's position + the offset
	var target_pos = target.global_transform.translated(offset)
	
	target_pos.origin.y = max(target_pos.origin.y, target.global_transform.origin.y + 0.5)
	# Interpolate the current position with the destination
	
	global_transform = global_transform.interpolate_with(target_pos, lerp_speed * delta)
	
	# Always be pointing at the target
	look_at(target.global_transform.origin, Vector3.UP)

func rotate_camera(delta):
	if camera_rotate_angle >= max_angle:
		return
	camera_rotate_angle += camera_rotate_speed*delta
	if camera_rotate_angle > max_angle:
		camera_rotate_angle = max_angle
	
	offset.x = rotation_dir*camera_dist*sin(camera_rotate_angle)
	offset.z = -camera_dist*cos(camera_rotate_angle)
	
func set_is_rotate():
	isRotate = true
	lerp_speed *= 2


