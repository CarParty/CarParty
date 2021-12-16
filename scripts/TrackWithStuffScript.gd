extends Spatial

export(String) var first_area

func is_area_first(area: String):
    return area == first_area