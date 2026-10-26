// Image carousels on case-study pages. Without this script the track still
// scrolls and swipes (CSS scroll-snap); this adds arrows, dots and arrow keys.
(function () {
  document.querySelectorAll('.carousel').forEach(function (carousel) {
    var track = carousel.querySelector('.carousel-track');
    var slides = track.querySelectorAll('.carousel-slide');
    if (slides.length < 2) return;

    function button(cls, label, text) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.setAttribute('aria-label', label);
      b.textContent = text;
      return b;
    }

    var prev = button('carousel-btn carousel-prev', 'Previous image', '‹');
    var next = button('carousel-btn carousel-next', 'Next image', '›');
    var dots = document.createElement('div');
    dots.className = 'carousel-dots';
    var dotButtons = Array.prototype.map.call(slides, function (_, i) {
      var d = button('carousel-dot', 'Show image ' + (i + 1) + ' of ' + slides.length, '');
      d.addEventListener('click', function () { go(i); });
      dots.appendChild(d);
      return d;
    });
    carousel.append(prev, next, dots);
    carousel.classList.add('is-ready');

    function current() {
      return Math.round(track.scrollLeft / track.clientWidth);
    }
    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
      update(i); // reflect the target straight away; the scroll listener catches swipes
    }
    function update(i) {
      if (typeof i !== 'number') i = current();
      prev.disabled = i === 0;
      next.disabled = i === slides.length - 1;
      dotButtons.forEach(function (d, j) { d.setAttribute('aria-current', j === i ? 'true' : 'false'); });
    }

    prev.addEventListener('click', function () { go(current() - 1); });
    next.addEventListener('click', function () { go(current() + 1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current() - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current() + 1); }
    });
    var t;
    track.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(update, 60); });
    window.addEventListener('resize', update);
    update();
  });
})();
