# CarParty Car Models

This branch keeps relevant files for the cars of the __CarParty__ game, which used in the ___CarParty__ Godot Game_.

## Directory Layout

- CAD: Original step files, for the usage in your favorite CAD software.
- FBX: As exported in FBX format, but in an older version, not compatible with godot.
- FBX2013: Same files, but converted to FBX in version 2013, which can then be imported into godot.

## FAQ

### Is the design history for the models available? If not, why not?

While there exists partial design history for some model parts, the geometry moved through different software packages as the models and requirements evolved. Additionally, in many of the places where it exists, it has become so convoluted that it is (almost) unusable. If you require the design history, it probably makes more sense to recreate the particular parts from scratch.

## Car Models

(The actually interesting section.)

All car models have the same general dimensions to keep the race fair and the model similar enough. In general, every car is 1500 mm long (not counting addons as bumpers), 600 mm wide and 600 mm high (not including wheel height) while having a ground clearance of 100 mm with a wheel diameter of 200 mm. Some minor exceptions have been made for aesthetic reasons, these are limited to shortening the rear and/or front, and explicitly don't modify any of the details relevant for driving. Furthermore, all cars options use the same collision box in godot.

The wheel model is shared between all cars for the same fairness reason. The light models are shared as well, exactly two headlights (left, right), three taillights (left, right, center) and two rear brake lights (left, right). While this arguably doesn't make much sense design-wise, it does unify the visual style and would have been simpler if we ever decided to finely control the lights during the race.

### FirstCar

As the name suggests, this car was the first one. It even existed before any other part of the game was written as an exploration of whether we would be able to create 3D assets. Additionally, it was for the longest time the only car with the other car options being added rather late.

This car symbolizes a normal 4 to 5 person car. Please drive careful as to not endanger you or your fellow passengers.

![FirstCar](pictures/FirstCar%20v13.png)

### Transporter

The previous car transported persons, this car enabled you to move your stuff between places. It is _suggested_ to avoid flips with the hope of your goods arriving in the same condition as they were in on departure. But of course, your car, your rules. Still, please secure your load properly.

![Transporter](pictures/Transporter%20v2.png)

### Forklift

Have you already forked something today? Maybe flipped over your opponents? Due to health-safety regulations and a limited view forwards, this car is only allowed to drive _very slowly_. It is mandatory to _not ignore_ this restriction.

![Forklift](pictures/Forklift%20v3.png)

### CitiCar - _the cheese wedge_

'We want a chess car'. - chess, chess, cheess, chees, cheese - a _cheese_ car??? - Ok, here you go.

Taking strong inspiration from the iconic (Sebring-Vanguard) Citicar [(wikipedia)](https://en.wikipedia.org/wiki/Citicar), we proudly present you our interpretation. Probably just as slow as the original from 1970/1980, but considerably newer and instead of an electric motor it uses a magic motor that doesn't even seem to require any power. If you ever happen to meet one in real-life, please give it a hug and kindly greet it from its virtual sibling.

![CitiCar](pictures/CitiCar%20v2.png)
