(() => {
  const header = document.querySelector(".site-header");
  if (!header) return;

  let lastScrollY = window.scrollY;
  let framePending = false;

  const updateHeader = () => {
    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - lastScrollY;

    if (currentScrollY <= 16 || scrollDelta < -4) {
      header.classList.remove("site-header--hidden");
    } else if (scrollDelta > 4) {
      header.classList.add("site-header--hidden");
    }

    lastScrollY = currentScrollY;
    framePending = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (framePending) return;
      framePending = true;
      window.requestAnimationFrame(updateHeader);
    },
    { passive: true }
  );
})();
