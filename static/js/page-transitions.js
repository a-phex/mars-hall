document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const path = location.pathname.split("/").pop() || "index.html";
  const pageOrder = [
    "index.html",       // 0
    "about.html",       // 1
    "client-work.html", // 2
    "photography.html", // 3
    "behind.html",      // 4
    "electra.html"      // 5
  ];

  // Mark homepage for CSS (so it keeps cinematic intro)
  if (path === "index.html" || path === "") body.classList.add("home-page");
  else body.classList.add("page-in");

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

      const next = href.split("/").pop() || "index.html";
      const currentIndex = pageOrder.indexOf(path);
      const nextIndex = pageOrder.indexOf(next);

      // Only animate if both pages exist in the list
      if (currentIndex === -1 || nextIndex === -1) {
        window.location.href = href;
        return;
      }

      // Determine direction based on index order
      const direction = nextIndex > currentIndex ? "forward" : "backward";

      // Set accent tint before leaving
      const nextAccent = accentMap[next] || "blue";
      body.setAttribute("data-accent", nextAccent);

      // Apply exit animation classes
      body.classList.remove("page-in");
      body.classList.add("page-out", `dir-${direction}`);

      setTimeout(() => {
        window.location.href = href;
      }, 450);
    });
  });
});
