---
title: Streaming History
---

```js
const streamingHistoryInput = Inputs.file({
  label: "Streaming History",
  accept: ".json",
  required: true,
});
const streamingHistoryFile = Generators.input(streamingHistoryInput);
```

```js
const streamingHistoryJson = streamingHistoryFile.json();
```

```js
const pastMonth =
  new Date(streamingHistoryJson[streamingHistoryJson.length - 1].endTime) -
  1000 * 60 * 60 * 24 * 30;
const pastYear =
  new Date(streamingHistoryJson[streamingHistoryJson.length - 1].endTime) -
  1000 * 60 * 60 * 24 * 400;

const minDateInput = Inputs.date({
  label: "Start date",
  value: pastYear,
  max: pastMonth,
  validate: (date) => !!date.value && new Date(date.value) <= pastMonth,
});
const minDate = Generators.input(minDateInput);
```

```js
const db = await DuckDBClient.of({
  streaming_history: streamingHistoryJson,
});
const filteredHistory = db.sql`WITH
filter_date_streaming AS (
    SELECT  strptime(endTime, '%Y-%m-%d %H:%M') AS date,
            artistName AS name,
            msPlayed AS value
    FROM streaming_history
    WHERE date >= ${minDate}
),
top_streaming AS (
    SELECT DATE_TRUNC('month', s.date) as date, s.name, s.value
    FROM filter_date_streaming s
    WHERE s.name IN (
        SELECT name
        FROM (
            SELECT name, SUM(value) as total_value
            FROM filter_date_streaming
            GROUP BY name
            ORDER BY total_value DESC
            LIMIT 250
        )
    )
),
all_combinations AS (
    SELECT date, name
    FROM (
        SELECT DISTINCT date FROM top_streaming
    ) dates
    CROSS JOIN (
        SELECT DISTINCT name FROM top_streaming
    ) names
),
streaming_with_all_combinations AS (
    SELECT ac.date, ac.name, COALESCE(ts.value, 0) AS value
    FROM all_combinations ac
    LEFT JOIN top_streaming ts ON ac.date = ts.date AND ac.name = ts.name
),
streaming_with_cumulative_value AS (
    SELECT  date,
            name,
            SUM(value) OVER (PARTITION BY name ORDER BY date) AS value
    FROM streaming_with_all_combinations
),
streaming_with_minutes AS (
    SELECT date, name, (value / (60 * 1000))::INT AS value
    FROM streaming_with_cumulative_value
),
streaming_with_max_value AS (
    SELECT date, name, MAX(value) AS value
    FROM streaming_with_minutes
    GROUP BY date, name
)
SELECT date, name, value FROM streaming_with_max_value
ORDER BY date ASC
  `;
```

```js
const data = filteredHistory.toArray() ?? [];

const duration = 250;
const n = 17;
const names = new Set(data.map((d) => d.name));

const barSize = 48;
const marginTop = 16;
const marginRight = 6;
const marginBottom = 6;
const marginLeft = 0;
const height = marginTop + barSize * n + marginBottom;

const x = d3.scaleLinear([0, 1], [marginLeft, width - marginRight]);
const y = d3
  .scaleBand()
  .domain(d3.range(n + 1))
  .rangeRound([marginTop, marginTop + barSize * (n + 1 + 0.1)])
  .padding(0.1);

const color = () => {
  const scale = d3.scaleOrdinal(d3.schemeTableau10);
  return (d) => scale(d.name);
};

const formatDate = d3.utcFormat("%d/%m/%Y");
const formatNumber = d3.format(",d");
const tickFormat = d3.format(",d");

const k = 10;

const datevalues = Array.from(
  d3.rollup(
    data,
    ([d]) => d.value,
    (d) => +d.date,
    (d) => d.name
  )
)
  .map(([date, data]) => [new Date(date), data])
  .sort(([a], [b]) => d3.ascending(a, b));

const keyframes = () => {
  const keyframes = [];
  let ka, a, kb, b;
  for ([[ka, a], [kb, b]] of d3.pairs(datevalues)) {
    for (let i = 0; i < k; ++i) {
      const t = i / k;
      keyframes.push([
        new Date(ka * (1 - t) + kb * t),
        rank((name) => (a?.get(name) ?? 0) * (1 - t) + (b?.get(name) ?? 0) * t),
      ]);
    }
  }
  keyframes.push([new Date(kb), rank((name) => b?.get(name) ?? 0)]);
  return keyframes;
};

const nameframes = d3.groups(
  keyframes().flatMap(([, data]) => data),
  (d) => d.name
);

const prev = new Map(
  nameframes.flatMap(([, data]) => d3.pairs(data, (a, b) => [b, a]))
);
const next = new Map(nameframes.flatMap(([, data]) => d3.pairs(data)));

function rank(value) {
  const data = Array.from(names, (name) => ({ name, value: value(name) }));
  data.sort((a, b) => d3.descending(a.value, b.value));
  for (let i = 0; i < data.length; ++i) data[i].rank = Math.min(n, i);
  return data;
}

function ticker(svg) {
  const now = svg
    .append("text")
    .style("font", `bold ${barSize}px var(--sans-serif)`)
    .style("font-variant-numeric", "tabular-nums")
    .style("fill", "var(--theme-foreground)")
    .attr("text-anchor", "end")
    .attr("x", width - 6)
    .attr("y", marginTop + barSize * (n - 0.45))
    .attr("dy", "0.32em")
    .text(formatDate(keyframes()[0][0]));

  return ([date], transition) => {
    transition.on("end", () => {
      now.text(formatDate(date));
    });
  };
}

function axis(svg) {
  const g = svg.append("g").attr("transform", `translate(0,${marginTop})`);

  const axis = d3
    .axisTop(x)
    .ticks(width / 160, tickFormat)
    .tickSizeOuter(0)
    .tickSizeInner(-barSize * (n + y.padding()));

  return (_, transition) => {
    g.transition(transition).call(axis);
    g.select(".tick:first-of-type text").remove();
    g.selectAll(".tick:not(:first-of-type) line").attr(
      "stroke",
      "var(--theme-background)"
    );
    g.select(".domain").remove();
  };
}

function textTween(a, b) {
  const i = d3.interpolateNumber(a, b);
  return function (t) {
    this.textContent = formatNumber(i(t)) + " minutes";
  };
}

function labels(svg) {
  let label = svg
    .append("g")
    .style("font", "bold 12px var(--sans-serif)")
    .style("font-variant-numeric", "tabular-nums")
    .style("fill", "var(--theme-foreground)")
    .attr("text-anchor", "end")
    .selectAll("text");

  return ([date, data], transition) =>
    (label = label
      .data(data.slice(0, n), (d) => d.name)
      .join(
        (enter) =>
          enter
            .append("text")
            .attr(
              "transform",
              (d) =>
                `translate(${x((prev?.get(d) ?? d).value)},${y(
                  (prev?.get(d) ?? d).rank
                )})`
            )
            .attr("y", y.bandwidth() / 2)
            .attr("x", -6)
            .attr("dy", "-0.25em")
            .text((d) => d.name)
            .call((text) =>
              text
                .append("tspan")
                .attr("fill-opacity", 0.7)
                .style("fill", "var(--theme-foreground)")
                .attr("font-weight", "normal")
                .attr("x", -6)
                .attr("dy", "1.15em")
            ),
        (update) => update,
        (exit) =>
          exit
            .transition(transition)
            .remove()
            .attr(
              "transform",
              (d) =>
                `translate(${x((next?.get(d) ?? d).value)},${y(
                  (next?.get(d) ?? d).rank
                )})`
            )
            .call((g) =>
              g
                .select("tspan")
                .tween("text", (d) =>
                  textTween(d.value, (next?.get(d) ?? d).value)
                )
            )
      )
      .call((bar) =>
        bar
          .transition(transition)
          .attr("transform", (d) => `translate(${x(d.value)},${y(d.rank)})`)
          .call((g) =>
            g
              .select("tspan")
              .tween("text", (d) =>
                textTween((prev?.get(d) ?? d).value, d.value)
              )
          )
      ));
}

function bars(svg) {
  let bar = svg.append("g").attr("fill-opacity", 0.6).selectAll("rect");

  return ([date, data], transition) =>
    (bar = bar
      .data(data.slice(0, n), (d) => d.name)
      .join(
        (enter) =>
          enter
            .append("rect")
            .attr("fill", color())
            .attr("height", y.bandwidth())
            .attr("x", x(0))
            .attr("y", (d) => y((prev?.get(d) ?? d).rank))
            .attr("width", (d) => x((prev?.get(d) ?? d).value) - x(0)),
        (update) => update,
        (exit) =>
          exit
            .transition(transition)
            .remove()
            .attr("y", (d) => y((next?.get(d) ?? d).rank))
            .attr("width", (d) => x((next?.get(d) ?? d).value) - x(0))
      )
      .call((bar) =>
        bar
          .transition(transition)
          .attr("y", (d) => y(d.rank))
          .attr("width", (d) => x(d.value) - x(0))
      ));
}

async function* barRaceChart() {
  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("style", "max-width: 100%; height: auto;");

  const updateBars = bars(svg);
  const updateAxis = axis(svg);
  const updateLabels = labels(svg);
  const updateTicker = ticker(svg);

  yield svg.node();

  while (true) {
    isReplaying = false;
    for (const keyframe of keyframes()) {
      const transition = svg
        .transition()
        .duration(duration)
        .ease(d3.easeLinear);

      // Extract the top bar’s value.
      x.domain([0, keyframe[1][0].value]);

      updateAxis(keyframe, transition);
      updateBars(keyframe, transition);
      updateLabels(keyframe, transition);
      updateTicker(keyframe, transition);

      invalidation.then(() => svg.interrupt());

      await transition.end();

      while (isPaused && !isReplaying) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (isReplaying) {
        break;
      }
    }

    while (!isReplaying) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

const barRace = barRaceChart();

let isReplaying;
const replay = document.createElement("button");
replay.textContent = "Replay";
replay.onclick = () => {
  isReplaying = true;
};

let isPaused = false;
let pause = document.createElement("button");
pause.textContent = "Pause";
pause.onclick = () => {
  isPaused = !isPaused;
  pause.textContent = isPaused ? "Resume" : "Pause";
};
```

# Streaming History Visualization

In this page you can load your Spotify streaming history (downloadable from your [Spotify account](https://www.spotify.com/account/privacy)) and visualize a bar chart race of your top artists by minutes listened to over time. After selecting your streaming history file, it will be processed within your browser and the chart will be displayed below.

Alongside the chart, a few controls will appear that allow you to select a start date to filter the data, and replay or pause the animation.

<div class="card" style="display: flex; flex-direction: column; gap: 1rem; min-width: 100%; padding: 16px;">
  ${streamingHistoryInput}
  <div style="display: flex; justify-content: space-between; gap: 1rem;">
    ${minDateInput}
    <div style="display: flex; gap: 1rem;">
        ${replay}
        ${pause}
    </div>
  </div>
  ${barRace}
</div>
