import { Legend } from "./legend.js";
import { interval } from "./interval.js";
import * as d3 from "d3";

export function treemap(data, width, height) {
  const maxFollowers = data.children.reduce((max, genre) => {
    const genreMax = genre.children.reduce(
      (max, artist) => Math.max(max, artist.followers),
      0
    );
    return Math.max(max, genreMax);
  }, 0);

  // Formatting utilities.
  const format = d3.format(",d");
  const capitalize = (s) => {
    return s
      .split(/(\s|\-|\_)/g)
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join("");
  };
  const name = (d) =>
    d
      .ancestors()
      .reverse()
      .map((d) => capitalize(d.data.name))
      .join("/");

  const thresholdInput = interval([100, maxFollowers], {
    step: "any",
    width: width,
    value: [100, maxFollowers],
    label: "Followers threshold",
    format: ([start, end]) => `${format(start)} to ${format(end)}`,
    color: "mediumseagreen",
    scale: d3.scaleLog().domain([100, maxFollowers]).range([0, 1]),
  });

  function createColorScale(root) {
    const values = [];

    root.children.forEach((child) => {
      if (!!child.children || zoomLevel == 2)
        values.push(child.data.popularity);
    });

    const scale = d3.scaleSequential(
      [
        Math.floor((d3.min(values) ?? 0) / 10) * 10,
        Math.ceil((d3.max(values) ?? 100) / 10) * 10,
      ],
      d3.interpolateBuGn
    );

    return scale;
  }

  const legendDiv = document.createElement("div");

  function getBrightness(color) {
    const rgb = d3.color(color)?.rgb() ?? { r: 0, g: 0, b: 0 };
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  }

  // This custom tiling function adapts the built-in binary tiling function
  // for the appropriate aspect ratio when the treemap is zoomed-in.
  function tile(node, x0, y0, x1, y1) {
    d3.treemapBinary(node, 0, 0, width, height);
    for (const child of node.children) {
      child.x0 = x0 + (child.x0 / width) * (x1 - x0);
      child.x1 = x0 + (child.x1 / width) * (x1 - x0);
      child.y0 = y0 + (child.y0 / height) * (y1 - y0);
      child.y1 = y0 + (child.y1 / height) * (y1 - y0);
    }
  }

  let hierarchy = d3
    .hierarchy(data)
    .sum((d) => d.value)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  let root = d3.treemap().tile(tile)(hierarchy);

  function setHierarchy(minFollowers = 1, maxFollowers = Infinity) {
    const dataClone = structuredClone(data);
    dataClone.children = dataClone.children.map((genre) => {
      genre.children = genre.children.filter(
        (artist) =>
          artist.followers >= minFollowers && artist.followers <= maxFollowers
      );
      return genre;
    });

    hierarchy = d3
      .hierarchy(dataClone)
      .sum((d) => d.value)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    root = d3.treemap().tile(tile)(hierarchy);
  }
  setHierarchy(thresholdInput.value[0], thresholdInput.value[1]);

  // Create the scales.
  const x = d3.scaleLinear().rangeRound([0, width]);
  const y = d3.scaleLinear().rangeRound([0, height]);

  // Create the SVG container.
  const svg = d3
    .create("svg")
    .attr("viewBox", [0.5, -30.5, width, height + 30])
    .attr("width", width)
    .attr("height", height + 30)
    .attr("style", "max-width: 100%; height: auto;")
    .style("font", "10px sans-serif");

  let zoomLevel = 0;
  let lastZoomed = null;
  // Display the root.
  let group = svg.append("g").call(render, root);

  thresholdInput.addEventListener("change", async () => {
    setHierarchy(thresholdInput.value[0], thresholdInput.value[1]);
    const restore = zoomLevel === 1 ? true : false;
    zoomLevel = 0;
    x.domain([root.x0, root.x1]);
    y.domain([root.y0, root.y1]);
    group.remove();
    group = svg.insert("g", "*").call(render, root);
    if (restore) {
      const node = group
        .selectAll("g")
        .data(root.children.concat(root))
        .join("g");
      node.filter((d) => d.data.name === lastZoomed).dispatch("mousedown");
    }
  });

  function render(group, root) {
    const color = createColorScale(root);
    const legend = Legend(color, {
      title: "Popularity",
      width: Math.min(320, width),
    });

    legendDiv.innerHTML = "";
    legendDiv.append(legend);
    const node = group
      .selectAll("g")
      .data(root.children.concat(root))
      .join("g");

    node
      .filter((d) => (d === root ? d.parent : d.children))
      .attr("cursor", "pointer")
      .on("mousedown", (event, d) => (d === root ? zoomout(root) : zoomin(d)));

    node.append("title").text((d) => {
      return `${name(d)}\n${
        d !== root
          ? format(d.value) +
            " followers\n" +
            format(d.data.popularity) +
            "% popularity"
          : format(d.value) + " followers\n"
      }`;
    });

    node
      .append("a")
      .attr("xlink:href", (d) => d.data.url)
      .attr("target", "_blank")
      .append("rect")
      .attr("fill", (d) => (d === root ? "#fff" : color(d.data.popularity)))
      .attr("stroke", "rgba(0,0,0,0.1)");

    node
      .append("text")
      .attr("clip-path", (d) => d.clipUid)
      .attr("font-weight", (d) => (d === root ? "bold" : null))
      .attr("fill", (d) => {
        const fillColor = d === root ? "#fff" : color(d.data.popularity);
        return getBrightness(fillColor) > 127 ? "#000" : "#fff";
      })
      .selectAll("tspan")
      .data((d) =>
        (d === root ? name(d) : capitalize(d.data.name))
          .split("\n")
          .concat(
            d === root
              ? format(d.value) + " followers"
              : zoomLevel == 2
              ? format(d.data.popularity) + "%"
              : format(d.value)
          )
      )
      .join("tspan")
      .attr("x", 3)
      .attr(
        "y",
        (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`
      )
      .attr("fill-opacity", (d, i, nodes) =>
        i === nodes.length - 1 ? 0.7 : null
      )
      .attr("font-weight", (d, i, nodes) =>
        i === nodes.length - 1 ? "normal" : null
      )
      .text((d) => d);

    group.call(position, root);
  }

  function position(group, root) {
    group
      .selectAll("g")
      .attr("transform", (d) =>
        d === root ? `translate(0,-30)` : `translate(${x(d.x0)},${y(d.y0)})`
      )
      .select("rect")
      .attr("width", (d) => (d === root ? width : x(d.x1) - x(d.x0)))
      .attr("height", (d) => (d === root ? 30 : y(d.y1) - y(d.y0)));
  }

  // When zooming in, draw the new nodes on top, and fade them in.
  function zoomin(d) {
    zoomLevel++;
    if (zoomLevel === 1) {
      lastZoomed = d.data.name;
    }

    const group0 = group.attr("pointer-events", "none");
    const group1 = (group = svg.append("g").call(render, d));

    x.domain([d.x0, d.x1]);
    y.domain([d.y0, d.y1]);

    svg
      .transition()
      .duration(750)
      .call((t) => group0.transition(t).remove().call(position, d.parent))
      .call((t) =>
        group1
          .transition(t)
          .attrTween("opacity", () => d3.interpolate(0, 1))
          .call(position, d)
      );
  }

  // When zooming out, draw the old nodes on top, and fade them out.
  function zoomout(d) {
    zoomLevel--;
    if (zoomLevel === 0) {
      lastZoomed = null;
    }

    const group0 = group.attr("pointer-events", "none");
    const group1 = (group = svg.insert("g", "*").call(render, d.parent));

    x.domain([d.parent.x0, d.parent.x1]);
    y.domain([d.parent.y0, d.parent.y1]);

    svg
      .transition()
      .duration(750)
      .call((t) =>
        group0
          .transition(t)
          .remove()
          .attrTween("opacity", () => d3.interpolate(1, 0))
          .call(position, d)
      )
      .call((t) => group1.transition(t).call(position, d.parent));
  }

  const div = document.createElement("div");
  div.append(legendDiv);
  div.append(svg.node());
  div.append(thresholdInput);

  return div;
}
