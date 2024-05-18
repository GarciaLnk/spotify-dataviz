---
title: Top Artists
---

```js
import { dark as darkTheme } from "npm:vega-themes";
import { vlresize } from "./components/vlresize.js";
import { Legend } from "./components/legend.js";
import { interval } from "./components/interval.js";
import { treemap } from "./components/treemap.js";
```

# Top Artists Visualizations

These visualizations explore the popularity of top artists and genres based on their followers and popularity scores.

```js
const vegaChart = await vlresize({
  config: {
    ...(dark ? darkTheme : undefined),
    background: "transparent",
  },
  width: width,
  height: 400,
  data: {
    url: await FileAttachment("data/barchart_vega_data.csv").url(),
    format: { type: "csv" },
  },
  mark: "bar",
  encoding: {
    x: { field: "name", type: "nominal", sort: "-y" },
    y: { field: "popularity", type: "quantitative" },
    color: { field: "followers", type: "quantitative" },
    tooltip: [
      { field: "name", type: "nominal" },
      { field: "popularity", type: "quantitative" },
      { field: "followers", type: "quantitative" },
    ],
  },
});
```

<br>

## Vega-Lite Bar Chart

Static vertical bar chart that ranks all artists by popularity and colors by followers.

<div class="card" style="display: flex; flex-direction: column; gap: 1rem; min-width: 100%; padding: 16px;">
  ${vegaChart}
</div>

```js
const artists = await FileAttachment("data/barchart_data.csv").csv({
  typed: true,
});

const genres = ["Pop", "Rock", "Rap", "Hip Hop", "R&B"];
const genreInput = Inputs.select(genres, { label: "Selected genre" });
const genre = Generators.input(genreInput);

const color = Plot.scale({
  color: {
    type: "linear",
    scheme: "reds",
    domain: [d3.min(artists, (d) => d.popularity), 100],
    unknown: "var(--theme-foreground-muted)",
  },
});

function artistsChart(genre) {
  const filteredArtists = artists
    .filter((d) => d.genres === genre?.toLowerCase())
    .sort((a, b) => b.followers - a.followers);

  return Plot.plot({
    x: {
      label: "Followers",
      type: "log",
      domain: [
        d3.min(filteredArtists, (d) => d.followers) / 10,
        d3.max(filteredArtists, (d) => d.followers),
      ],
      clamp: true,
    },
    y: {
      label: "Artist",
    },
    marginTop: 20,
    marginRight: 20,
    marginBottom: 40,
    marginLeft: 120,
    width: width,
    height: 800,
    grid: true,
    color: { ...color, legend: true },
    marks: [
      Plot.barX(filteredArtists, {
        y: "name",
        x1: 1,
        x2: "followers",
        fill: "popularity",
        sort: { y: "-x" },
        tip: true,
      }),
      Plot.text(filteredArtists, {
        y: "name",
        x: d3.min(filteredArtists, (d) => d.followers) / 9,
        text: (d, i) => i + 1,
        fill: "black",
      }),
    ],
  });
}
```

<br>

## Plot Bar Chart

Horizontal bar chart that ranks artists by followers and colors by popularity.
This time the artists are divided by genre. The different genres can be selected from the dropdown.

<div class="card" style="display: flex; flex-direction: column; gap: 1rem; min-width: 100%; padding: 16px;">
  ${genreInput}
  ${artistsChart(genre)}
</div>

```js
const data = await FileAttachment("data/treemap_data.json").json();
const height = 800;
```

<br>

## D3 Zoomable Treemap

Zoomable treemap with three levels that can be navigated by clicking on the boxes, to go back to the previous level click on the header.
The size of the boxes is determined by the number of followers of the artists, whereas the color is determined by the popularity score.
The data can be filtered by minimum and maximum number of followers using the slider below the chart.

The treemap is three levels deep:

1. Genres: the top level aggregates the data of the artists by their respective genres (an artist can belong to multiple genres), showing the total number of followers and the average popularity score among all artists.

2. Artists: the second level shows the artists that belong to the selected genre.

3. Songs: the third level shows the most popular songs of the selected artist, clicking on the song will redirect to the song's Spotify page.

<div class="card" style="display: flex; flex-direction: column; gap: 1rem; min-width: 100%; padding: 16px;">
  ${treemap(data, width, height)}
</div>
