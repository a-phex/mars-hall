// Deterministic, order-aware page transitions using sessionStorage
// Order:
// 1 index.html
// 2 about.html
// 3 client-work.html
// 4 photography.html
// 5 behind-the-scenes.html
// 6 electra-film.html

(function () {
  const PAGES = [
    "index.html",
    "about.html",
    "client-work.html",
    "photography.html",
    "behind-the-scenes.html",
    "electra-film.html",
  ];

  function filename(path) {
    const f = path.split("/").pop();
    return f && f.length ? f : "index.html";
  }

  const current = filename(location.pathname);

  // First load behaviour (fade-up on the very first visit)
  // We use a flag so it runs once per tab/session.
  if (!sessionStorage.getItem("visited")) {
    document.body.classList.add("first-load");
    sessionStorage.setItem("visited", "1");
  }

  // Read planned entry direction from previous page click (if any)
  const plannedEntry = sessionStorage.getItem("entryDirection"); // "from-left" | "from-right" | null
  if (plannedEntry === "from-left")  document.body.classList.add("slide-in-from-left");
  if (plannedEntry === "from-right") document.body.classList.add("slide-in-from-right");
  // Clear it so refreshes don't replay
  sessionStorage.removeItem("entryDirection");

  // Intercept internal nav clicks to set exit & next entry directions
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || /^https?:\/\//i.test(href)) return;

    e.preventDefault();

    const next = filename(href);
    const iCur = PAGES.indexOf(current);
    const iNext = PAGES.indexOf(next);

    // If either page isn't in our list, just go straight there
    if (iCur === -1 || iNext === -1) {
      window.location.href = href;
      return;
    }

    // Determine directions by index
    // Forward (next > current): current slides LEFT, next enters FROM RIGHT
    // Backward (next < current): current slides RIGHT, next enters FROM LEFT
    const exitClass   = iNext > iCur ? "slide-out-to-left"  : "slide-out-to-right";
    const entryPlanned = iNext > iCur ? "from-right"        : "from-left";

    // Store the planned entry direction for the next page load
    sessionStorage.setItem("entryDirection", entryPlanned);

    // Add exit class and navigate after animation ends
    document.body.classList.remove("slide-in-from-left", "slide-in-from-right", "first-load");
    document.body.classList.add(exitClass);

    setTimeout(() => { window.location.href = href; }, 450);
  });
})();
