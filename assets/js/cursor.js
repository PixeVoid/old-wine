/* Custom cursor: instant dot + lagging ring, grows on interactive targets,
   with a light magnetic pull on [data-magnetic] elements. */
(function () {
  if (window.matchMedia("(hover: none)").matches) return;

  const dot = document.getElementById("cursor");
  const ring = document.getElementById("cursorFollow");
  if (!dot || !ring) return;

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;

  window.addEventListener("pointermove", (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });

  (function follow() {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(follow);
  })();

  // Hover state on anything clickable
  const hoverSel = "a, button, [data-magnetic], [data-magnetic-card], input, textarea";
  document.querySelectorAll(hoverSel).forEach((el) => {
    el.addEventListener("pointerenter", () => ring.classList.add("is-hover"));
    el.addEventListener("pointerleave", () => ring.classList.remove("is-hover"));
  });

  // Magnetic pull
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const strength = 0.35;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "translate(0, 0)";
      el.style.transition = "transform .5s cubic-bezier(0.16,1,0.3,1)";
      setTimeout(() => (el.style.transition = ""), 500);
    });
  });

  // Slight tilt on work cards
  document.querySelectorAll("[data-magnetic-card]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateY(${px * 6}deg) rotateX(${-py * 6}deg) translateZ(6px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "perspective(900px) rotateY(0) rotateX(0)";
    });
  });
})();
