let confettiFrameId = null;

function launchConfetti(durationMs = 3000) {
  const existing = document.getElementById("atopedia-confetti");
  existing?.remove();
  if (confettiFrameId) cancelAnimationFrame(confettiFrameId);

  const canvas = document.createElement("canvas");
  canvas.id = "atopedia-confetti";
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;pointer-events:none;";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const colors = ["#008523", "#68c878", "#ffffff", "#ffd700", "#ff6b6b", "#4ecdc4"];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener("resize", resize);

  const particles = Array.from({ length: 100 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    size: Math.random() * 7 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: Math.random() * 4 - 2,
    vy: Math.random() * 4 + 3,
    rotation: Math.random() * 360,
    spin: Math.random() * 8 - 4,
  }));

  const start = performance.now();

  function draw(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.rotation += particle.spin;

      if (particle.y > canvas.height + 20) {
        particle.y = -20;
        particle.x = Math.random() * canvas.width;
      }

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate((particle.rotation * Math.PI) / 180);
      ctx.fillStyle = particle.color;
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
      ctx.restore();
    });

    if (now - start < durationMs) {
      confettiFrameId = requestAnimationFrame(draw);
    } else {
      window.removeEventListener("resize", resize);
      canvas.remove();
      confettiFrameId = null;
    }
  }

  confettiFrameId = requestAnimationFrame(draw);
}

function showVictoryBanner(journey) {
  const existing = document.getElementById("atopedia-victory-banner");
  existing?.remove();

  const banner = document.createElement("div");
  banner.id = "atopedia-victory-banner";
  banner.innerHTML = `
    <p class="atopedia-victory-title">Made it!</p>
    <p class="atopedia-victory-subtitle">Open A to Pedia to share your journey</p>
  `;
  document.body.appendChild(banner);

  setTimeout(() => banner.remove(), 4000);
}

function showVictoryCelebration(journey) {
  launchConfetti(3000);
  showVictoryBanner(journey);
}
