import json
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

data = open("polygon.json").read()


data = json.loads(data)
for plot_area in data:
    coords = data[plot_area]["Road"]

    plt.figure(figsize=(8, 8))
    plt.axis('equal')
    for coord in coords:
        coords_x = []
        coords_z = []
        for triple in coord:
            coords_x.append(-triple[0])
            coords_z.append(triple[1])
        plt.fill(coords_x, coords_z)

    for area in data[plot_area]:
        if not area.startswith("Finish") and area != "Area":
            continue
        bounding_box = data[plot_area][area]
        rect = patches.Rectangle((-bounding_box["position"][0], bounding_box["position"][1]), -bounding_box["size"][0], bounding_box["size"][1], facecolor="none", edgecolor="r", linewidth=1)
        plt.gca().add_patch(rect)
        
    plt.show()
