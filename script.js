'use strict';
const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() { navigation.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open navigation'); }
menu.addEventListener('click', () => { const open = navigation.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); });
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && navigation.classList.contains('open')) { closeMenu(); menu.focus(); } });
document.querySelector('#year').textContent = new Date().getFullYear();

// Native touch scrolling plus mouse dragging; no external libraries required.
const carousel = document.querySelector('.work-carousel');
const track = carousel.querySelector('.carousel-track');
const slides = [...track.querySelectorAll('.project-slide')];
const play = carousel.querySelector('.carousel-play');
const projectVideos = [...carousel.querySelectorAll('video')];
const videoPlaying = () => projectVideos.some(video => !video.paused && !video.ended);
const progress = carousel.querySelector('.carousel-progress span');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedMotion.matches;
let hovered = false;
let focused = false;
let visible = false;
let drag = null;
let suppressClick = false;
let timer;
const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
const positions = () => slides.map(slide => slide.offsetLeft - slides[0].offsetLeft);
function updateProgress() {
  const total = track.scrollWidth;
  progress.style.width = `${Math.min(100, (track.scrollLeft + track.clientWidth) / total * 100)}%`;
}
function schedule() {
  clearTimeout(timer);
  if (!videoPlaying() && !paused && !hovered && !focused && !drag && visible && !document.hidden) {
    timer = setTimeout(() => { advance(1); schedule(); }, 4500);
  }
}
function advance(direction) {
  const current = track.scrollLeft;
  const max = maxScroll();
  const stops = [...new Set(positions().map(position => Math.min(position, max)))];
  let target;
  if (direction > 0) target = current >= max - 3 ? 0 : stops.find(position => position > current + 3) ?? max;
  else target = current <= 3 ? max : stops.reverse().find(position => position < current - 3) ?? 0;
  track.scrollTo({left: target, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
}
function updatePlay() {
  play.innerHTML = paused ? 'Play <span aria-hidden="true"><svg class="ui-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/></svg></span>' : 'Pause <span aria-hidden="true"><svg class="ui-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 5v14M16 5v14"/></svg></span>';
  play.setAttribute('aria-label', paused ? 'Start automatic slideshow' : 'Pause automatic slideshow');
  play.setAttribute('aria-pressed', String(paused));
  schedule();
}
play.addEventListener('click', () => { paused = !paused; updatePlay(); });
carousel.querySelector('.carousel-prev').addEventListener('click', () => { advance(-1); schedule(); });
carousel.querySelector('.carousel-next').addEventListener('click', () => { advance(1); schedule(); });
track.addEventListener('keydown', event => {
  if (event.target.closest('video')) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault(); advance(event.key === 'ArrowRight' ? 1 : -1); schedule();
  }
});
carousel.addEventListener('mouseenter', () => { hovered = true; schedule(); });
carousel.addEventListener('mouseleave', () => { hovered = false; schedule(); });
carousel.addEventListener('focusin', () => { focused = true; schedule(); });
carousel.addEventListener('focusout', event => { focused = carousel.contains(event.relatedTarget); schedule(); });
track.addEventListener('dragstart', event => event.preventDefault());
track.addEventListener('pointerdown', event => {
  if (event.target.closest('video')) return;
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  drag = {id: event.pointerId, x: event.clientX, scroll: track.scrollLeft, moved: false};
  suppressClick = false;
  schedule();
});
track.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  const delta = event.clientX - drag.x;
  if (Math.abs(delta) > 5 && !drag.moved) {
    drag.moved = true;
    track.setPointerCapture(event.pointerId);
    track.classList.add('is-dragging');
  }
  if (drag.moved) { event.preventDefault(); track.scrollLeft = drag.scroll - delta; }
});
function endDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  suppressClick = drag.moved;
  if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
  drag = null;
  track.classList.remove('is-dragging');
  schedule();
  setTimeout(() => { suppressClick = false; }, 0);
}
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);
track.addEventListener('click', event => { if (suppressClick) { event.preventDefault(); event.stopPropagation(); } }, true);
track.addEventListener('scroll', () => { updateProgress(); schedule(); }, {passive: true});
document.addEventListener('visibilitychange', schedule);
window.addEventListener('resize', updateProgress);
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { paused = true; updatePlay(); } });
new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, {threshold: 0.15}).observe(track);
updatePlay();
updateProgress();

// Keep native video controls independent from dragging and carousel autoplay.
projectVideos.forEach(video => {
  const fitVideo = () => {
    if (video.videoWidth && video.videoHeight) video.closest('.project-slide').style.setProperty('--photo-ratio', video.videoWidth + ' / ' + video.videoHeight);
    updateProgress();
  };
  video.addEventListener('loadedmetadata', fitVideo);
  if (video.readyState >= 1) fitVideo();
  ['play', 'pause', 'ended'].forEach(event => video.addEventListener(event, schedule));
  new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting && !video.paused) video.pause();
  }, {threshold: 0}).observe(video);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) projectVideos.forEach(video => video.pause());
});
