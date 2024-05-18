---
title: Artist Trends
---

```js
import { LineChart } from "./components/multiline.js";

const data = await FileAttachment("data/multiline_data.csv").csv({
  typed: true,
});

const lineChart = (data) =>
  LineChart(data, {
    x: (d) => d.week,
    y: (d) => d.rank_score,
    z: (d) => d.name,
    yLabel: "↑ Rank",
    width,
    height: 600,
    marginRight: width / 15,
    marginLeft: width / 15,
    color: "var(--theme-foreground-focus)",
    strokeOpacity: 1,
    mixBlendMode: "plus-darker",
    yDomain: [
      1,
      Math.min(
        1000,
        d3.max(data, (d) => d.rank_score)
      ),
    ],
    title: (d) => d.name + " #" + d.rank_score,
  });

const focus = Generators.input(lineChart);
const searchInput = Inputs.search(data, {
  placeholder: "Search artists...",
  columns: ["name"],
});
const search = Generators.input(searchInput);
```

# Artists Trends Visualization

This zoomable line chart shows the evolution of the rank of the artists over the last year (after the release of the dataset).

The artists can be filtered down by searching for their name in the search bar. Additionally, the chart can be zoomed in by selecting a region of interest, and zoomed out by clicking on the chart.

<div class="card" style="display: flex; flex-direction: column; gap: 1rem; min-width: 100%; padding: 16px;">
  ${searchInput}
  ${lineChart(search)}
</div>
