---
title: Features & Popularity
---

```js
import { pairplot, brush } from "./components/pairplot.js";
import { interval } from "./components/interval.js";

const data = await FileAttachment("data/pairplot_data.csv").csv({
  typed: true,
});

const padding = 28;
const maxWidth = 768;

const featuresInput = Inputs.checkbox(
  [
    "Acousticness",
    "Danceability",
    "Energy",
    "Valence",
    "Instrumentalness",
    "Speechiness",
    "Liveness",
  ],
  {
    value: ["Acousticness", "Danceability", "Energy", "Valence"],
    label: "Features",
  }
);
featuresInput.style.minWidth = "100%";
featuresInput.style.display = "flex";
featuresInput.style.justifyContent = "center";
featuresInput.style.paddingLeft = padding + "px";
const features = Generators.input(featuresInput);

const thresholdInput = interval([0, 100], {
  step: 1,
  value: [0, 100],
  label: "Popularity threshold",
  scale: d3.scaleLinear().domain([0, 100]).range([0, 1]),
});
thresholdInput.style.display = "flex";
thresholdInput.style.justifyContent = "center";
const threshold = Generators.input(thresholdInput);
```

# Features & Popularity Visualization

This scatterplot matrix shows the relationship between the different features of the songs and their popularity.

Each cell in the matrix shows a scatterplot of two features, with the diagonal showing the distribution of each feature. The circles are colored by the popularity of the song and they can be brushed to highlight a subset of the data.

Using the checkboxes, you can select the features to display in the matrix, and the slider allows you to filter the songs by their popularity. These controls are located below the matrix.

<div class="card" style="display: flex; flex-direction: column; gap: 1rem; min-width: 100%; padding: 16px;">
  ${pairplot(data.filter(
    (d) =>
      d.popularity >= threshold[0] &&
      d.popularity <= threshold[1]
  ), Math.min(width, maxWidth), padding, features)}
  ${featuresInput}
  ${thresholdInput}
</div>
