document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const isHome = location.pathname.endsWith("index.html") || location.pathname === "/";
  const pageOrder = ["index.html", "about.html", "client-work.html", "photography.html", "behind.html", "electra.html"];

  if (isHome) body.classList.add("home-page");
  if (!isHome) body.classList.add("page-in");

  // Smooth accent morph setup
  const accentMap = {
    "index.html": "blue",
    "about.html": "violet",
    "client-work.html": "teal",
    "photography.html": "pink",
    "behind.html": "orange",
    "electra.html": "purple"
  };

  document.querySelectorAll("a[href]").forEach(link => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return;

    link.addEventListener("click", e => {
      e.preventDefault();

      const current = location.pathname.split("/").pop() || "index.html";
      const next = href.split("/").pop();
      const currentIndex = pageOrder.indexOf(current);
      const nextIndex = pageOrder.indexOf(next);

      let direction = "forward";
      if (nextIndex < currentIndex) direction = "backward";

      const nextAccent = accentMap[next] || "blue";
      body.setAttribute("data-accent", nextAccent);

      body.classList.remove("page-in");
      body.classList.add("page-out", `dir-${direction}`);

      setTimeout(() => {
        window.location.href = href;
      }, 450);
    });
  });
});
