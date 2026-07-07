/* gallery.js
   Lightweight lightbox for the image gallery.
   Opens a full-screen overlay when a gallery item is clicked.
   Handles keyboard navigation and focus trapping (WCAG).

   Animation note: the lightbox uses CSS opacity/visibility transitions
   controlled by the .is-open class, not the HTML hidden attribute.
   The hidden attribute is removed on init so CSS owns the closed state.
*/

(function () {
  'use strict';

  var grid        = document.getElementById('gallery-grid');
  var lightbox    = document.getElementById('lightbox');
  var closeBtn    = document.getElementById('lightbox-close');
  var lightboxImg = document.getElementById('lightbox-img');
  var captionEl   = document.getElementById('lightbox-caption');

  if (!grid || !lightbox) return;

  /* Switch from HTML hidden attribute to CSS class — enables fade transition */
  lightbox.removeAttribute('hidden');

  var lastFocused   = null;
  var clearSrcTimer = null;

  /* ── Open lightbox ──────────────────────────────────────── */
  grid.addEventListener('click', function (e) {
    var item = e.target.closest('.gallery-item');
    if (!item) return;

    lastFocused = item;

    /* Cancel any pending src-clear from a previous close */
    clearTimeout(clearSrcTimer);

    /* Read image src and caption from data attributes on the button,
       falling back to the nested <img> element's attributes. */
    var imgEl   = item.querySelector('img');
    var src     = item.dataset.src     || (imgEl ? imgEl.src : '');
    var alt     = item.dataset.alt     || (imgEl ? imgEl.alt : '');
    var caption = item.dataset.caption || '';

    lightboxImg.src       = src;
    lightboxImg.alt       = alt;
    captionEl.textContent = caption;

    /* Trigger the CSS fade + scale-up transition */
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    /* Move focus to the close button so keyboard users can act */
    closeBtn.focus();
  });


  /* ── Close helpers ──────────────────────────────────────── */
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';

    /* Clear src after the fade-out finishes (matches CSS transition duration) */
    clearSrcTimer = setTimeout(function () {
      lightboxImg.src = '';
    }, 300);

    /* Return focus to the item that opened the lightbox */
    if (lastFocused) lastFocused.focus();
  }

  closeBtn.addEventListener('click', closeLightbox);

  /* Click on the dark backdrop (outside the inner panel) closes it */
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  /* Escape key */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) {
      closeLightbox();
    }
  });


  /* ── Focus trap ─────────────────────────────────────────── */
  /*
     While the lightbox is open, Tab should cycle only among
     elements inside it (WCAG 2.1 success criterion 2.1.2).
  */
  lightbox.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !lightbox.classList.contains('is-open')) return;

    var focusable = Array.from(lightbox.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) { return !el.disabled; });

    if (focusable.length === 0) return;

    var first = focusable[0];
    var last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

})();
