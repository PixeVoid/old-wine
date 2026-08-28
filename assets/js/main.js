/* Preloader counter, scroll reveals, word-by-word lighting, and marquee. */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Preloader --------------------------------------------------------
  const preloader = document.getElementById("preloader");
  const counter = document.getElementById("counter");
  const bar = document.getElementById("progressBar");

  function runPreloader() {
    let n = 0;
    const dur = reduce ? 400 : 1900;
    const start = performance.now();
    (function tick(now) {
      const k = Math.min(1, (now - start) / dur);
      // ease-out
      const eased = 1 - Math.pow(1 - k, 3);
      n = Math.round(eased * 100);
      if (counter) counter.textContent = n;
      if (bar) bar.style.width = n + "%";
      if (k < 1) {
        requestAnimationFrame(tick);
      } else {
        if (window.__phoenixIgnite) window.__phoenixIgnite();
        setTimeout(() => {
          preloader && preloader.classList.add("is-done");
          document.body.classList.add("is-loaded");
          initReveals();
        }, 250);
      }
    })(start);
  }

  // ---- Reveals ----------------------------------------------------------
  function initReveals() {
    const items = document.querySelectorAll("[data-reveal], .section-head h2");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.2 });
    items.forEach((el, idx) => {
      // small stagger for grouped reveals
      el.style.transitionDelay = (idx % 5) * 0.06 + "s";
      io.observe(el);
    });

    // Word-by-word lighting for big statements
    document.querySelectorAll("[data-reveal-words]").forEach((block) => {
      const text = block.textContent.trim();
      block.textContent = "";
      text.split(/\s+/).forEach((w) => {
        const span = document.createElement("span");
        span.className = "word";
        span.textContent = w + " ";
        block.appendChild(span);
      });
      const words = block.querySelectorAll(".word");
      const lit = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            words.forEach((wd, i2) => {
              setTimeout(() => wd.classList.add("is-lit"), i2 * 45);
            });
            lit.disconnect();
          }
        });
      }, { threshold: 0.4 });
      lit.observe(block);
    });
  }

  // Trigger the hero title reveal once loaded (they use the span wrapper)
  window.addEventListener("load", () => {
    if (document.readyState === "complete") runPreloader();
  });
  if (document.readyState === "complete") runPreloader();
  else window.addEventListener("DOMContentLoaded", () => {
    // fallback if load never fires quickly
    setTimeout(() => { if (!document.body.classList.contains("is-loaded")) runPreloader(); }, 2500);
  });

  // ---- Nav hide on scroll down / show on scroll up ---------------------
  const nav = document.getElementById("nav");
  let lastY = 0;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    if (nav) {
      if (y > lastY && y > 200) nav.style.transform = "translateY(-120%)";
      else nav.style.transform = "translateY(0)";
      nav.style.transition = "transform .5s cubic-bezier(0.16,1,0.3,1)";
    }
    lastY = y;
  }, { passive: true });
})();
