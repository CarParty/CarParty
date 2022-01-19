extends Node2D

const placement_colors = [
	preload("res://resources/textures/Texture1.tres"),
	preload("res://resources/textures/Texture2.tres"),
	preload("res://resources/textures/Texture3.tres"),
	preload("res://resources/textures/Texture4.tres"),
	"res://resources/textures/Gradient4.tres",
	"res://resources/textures/Gradient4.tres",
	"res://resources/textures/Gradient4.tres",
	"res://resources/textures/Gradient4.tres",
]

func change_placement(counter):
	$CenterContainer/AnimationPlayer.playback_speed = 4
	if str(counter) != $CenterContainer/HBoxContainer/NumberLabel.text:
		$CenterContainer/AnimationPlayer.play("Change")
		$CenterContainer/Light2D.texture = placement_colors[min(counter,3)]
		if counter < 2:
			$CenterContainer/HBoxContainer/EndingLabel.text = 'st'
		elif counter < 3:
			$CenterContainer/HBoxContainer/EndingLabel.text = 'nd'
		elif counter < 4:
			$CenterContainer/HBoxContainer/EndingLabel.text = 'rd'
		else:
			$CenterContainer/HBoxContainer/EndingLabel.text = 'th'
		$CenterContainer/HBoxContainer/NumberLabel.text = str(counter)
		#$CenterContainer/AnimationPlayer.stop()
