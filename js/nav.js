/* nav.js
   Handles:
   - Mobile hamburger menu toggle
   - Scroll-reveal via IntersectionObserver
   - Parallax: disable background-attachment:fixed on iOS Safari
     (it does not work there and creates a broken look)
*/

(function () {
  'use strict';

  /* ── Hamburger menu ───────────────────────────────────────── */
  var hamburger = document.getElementById('hamburger');
  var nav       = document.getElementById('site-nav');

  if (hamburger && nav) {

    function openMenu() {
      hamburger.setAttribute('aria-expanded', 'true');
      nav.classList.add('is-open');
    }

    function closeMenu() {
      hamburger.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    }

    hamburger.addEventListener('click', function () {
      var isOpen = hamburger.getAttribute('aria-expanded') === 'true';
      if (isOpen) { closeMenu(); } else { openMenu(); }
    });

    /* Close when a nav link is clicked */
    nav.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    /* Close when clicking outside the menu */
    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !nav.contains(e.target)) {
        closeMenu();
      }
    });

    /* Close on Escape */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && hamburger.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        hamburger.focus();
      }
    });
  }


  /* ── Scroll-reveal ────────────────────────────────────────── */
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll('.reveal, .reveal-group').forEach(function (el) {
      observer.observe(el);
    });
  } else {
    /* Fallback: reveal everything immediately */
    document.querySelectorAll('.reveal, .reveal-group').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }


  /* ── Header: deepen blur once user scrolls past the hero ───── */
  /*
     Adds .site-header--scrolled when the page has scrolled more
     than 60 px
  */
  var header = document.querySelector('.site-header');
  if (header) {
    function updateHeaderScroll() {
      header.classList.toggle('site-header--scrolled', window.scrollY > 60);
    }
    window.addEventListener('scroll', updateHeaderScroll, { passive: true });
    updateHeaderScroll(); /* apply immediately on load (e.g. after back-nav) */
  }


  /* ── Disable parallax on iOS ──────────────────────────────── */
  /*
     background-attachment: fixed is broken on iOS Safari and
     causes images to render at incorrect positions. We fall
     back to scroll attachment on those devices.
  */
  var isIOS = /iP(hone|ad|od)/i.test(navigator.userAgent)
           || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    document.querySelectorAll('.section--parallax').forEach(function (el) {
      el.style.backgroundAttachment = 'scroll';
    });
  }

})();
