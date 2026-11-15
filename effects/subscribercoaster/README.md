# subscribercoaster

A Pen created on CodePen.

Original URL: [https://codepen.io/cobra_winfrey/pen/VwYBRvj](https://codepen.io/cobra_winfrey/pen/VwYBRvj).

here's the part where I try to explain a bit of what's happening under the hood:

I've wrapped the SVG of the coaster although it wasn't entirely necessary as the form itself exists outside the wrapper- mainly just to hide any overflow and be sure transforms apply properly.

The SVG has multiple strokes, a couple as the tracks, one of which uses `<pattern>` as a stroke method in order to show the repeating gradient as a track, another with a slightly larger stroke-width to provide an outline for the prior track, and lastly one to mask over part of the track I wanted to keep hidden.

I'm then able to take that path's stroke properties and use it in my CSS offset-path, providing a path for the coaster itself to travel. 

Initially I'd attempted to do this with an element independent of the SVG itself but found that the path didn't respect the viewbox definitions, so wound up placing the coaster elements withing a `<foreignObject>` tag inside the SVG itself.

Where this really gets dicey is in that the `<foreignObject>` contents are sized and positioned relative to the scale of the SVG, which is much much larger than the viewbox definition. I know, I know- I could have simply whipped open Illustrator again and resized the document/viewbox to suit my needs here, but I prefer making everything super extra difficult, apparently, so px definitions within the SVG are roughly 1:50 or something.

The next step positioning the form atop the expected `<foreignObject>` contents, whcih are applied via jQuery on submit.
To that end, when the form is submitted, I'm pulling the form value, appending it to the `<foreignObject>` with a wrapping element with parameters set to split the characters and wrap them in <span> elements via Stephen Shaw's nifty Splitting.js plugin, which is called immediately after the append.

Since I've set this up to precisely handle 40 characters, I append the necessary empty `<span>` elements to total 40, with a unique class to keep them hidden. This helps a bit with the next part, distributing them along the offset-path, for which I use a SCSS loop and incrementally shift them by pixel values.

An important note on the text front: because we require even spacing between characters, a monospace font absolutely works best, and because Splitting.js offers us a data-attribute for each character in a `<span>` we can then leverage them as pseudo elements and position them directly in the center of our fixed-width spans. This also helps insomuch as upon submission we are removing the form to revela the `<foreignObject>` housing our text below it, so lining the two up is much easier.

After all of this, I let all the animations fly- the main one is taking our offset-distance from 0% (plus each incremented character's pixel value) to 100%, causing our coaster to follow the path til its terminal point. One tricky bit: the characters will be reversed upon flipping around the loops, and further find themselves on what appears to be the *outside* of the coaster path. To counter this I run a very fast animation to flip them with transforms in the midst of their first loop.
I also applied an animation to the wrapper itself to both zoom and translate along with the coaster's travel path, attempting my best to keep it in viewport.

Finally we reach the end of the ride and one final chained transform animation has the coaster blasting into the abyss.

Because there's so much touchy pixel-precision going on here, I thought it might be a good time to also leverage "squigglevision" to give an animated hand-drawn appearance to the entire pen- it's a fantastic trick for certain creative endeavors and Chris Coyier has an excellent post about it here: https://css-tricks.com/squigglevision-in-css-and-svg/