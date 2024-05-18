// See https://observablehq.com/framework/config for documentation.
export default {
  // The project’s title; used in the sidebar and webpage titles.
  // title: "Visual Analytics",

  // The pages and sections in the sidebar. If you don’t specify this option,
  // all pages will be listed in alphabetical order. Listing pages explicitly
  // lets you organize them into sections and have unlisted pages.
  pages: [
    { name: "Top Artists", path: "/top-artists" },
    { name: "Artist Trends", path: "/artist-trends" },
    { name: "Features & Popularity", path: "/popularity-features" },
    { name: "Streaming History", path: "/streaming-history" },
  ],

  // Content to add to the head of the page, e.g. for a favicon:
  head: '<link rel="icon" href="favicon.png" type="image/png" sizes="32x32">',

  // The path to the source root.
  root: "src",

  // Some additional configuration options and their defaults:
  theme: ["air", "midnight"], // try "light", "dark", "slate", etc.
  header: "", // what to show in the header (HTML)
  footer: "Built by Alberto García", // what to show in the footer (HTML)
  sidebar: true, // whether to show the sidebar
  // toc: true, // whether to show the table of contents
  // pager: true, // whether to show previous & next links in the footer
  // output: "dist", // path to the output root for build
  // search: true, // activate search
  linkify: true, // convert URLs in Markdown to links
  typographer: false, // smart quotes and other typographic improvements
  cleanUrls: true, // drop .html from URLs
};
