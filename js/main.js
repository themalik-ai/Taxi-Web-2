/* ============================================================
   CULLINAN CHAUFFEURS — Main Script
   Interactions + Booking System
   ============================================================ */

(function () {
  'use strict';

  /* ---------------- Helpers ---------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const BOOKINGS_KEY = 'cullinan_bookings';

  const VEHICLES = {
    'e-class':    { name: 'Mercedes E-Class',        hourly: 55,  day: 440,  heathrow: 140 },
    'v-class':    { name: 'Mercedes V-Class & EQV',  hourly: 65,  day: 520,  heathrow: 180 },
    's-class':    { name: 'Mercedes S-Class',        hourly: 75,  day: 600,  heathrow: 165 },
    'bmw-7':      { name: 'BMW 7 Series M760e',      hourly: 75,  day: 600,  heathrow: 165 },
    'range-rover':{ name: 'Range Rover',             hourly: 90,  day: 720,  heathrow: 290 },
    'bespoke':    { name: 'Rolls-Royce / Bentley',   hourly: 150, day: 1200, heathrow: 450 }
  };

  const TRIP_LABELS = {
    'airport':    'Airport Transfer',
    'one-way':    'One Way',
    'round-trip': 'Round Trip',
    'hourly':     'By The Hour'
  };

  function loadBookings() {
    try {
      return JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveBookings(list) {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
  }

  function makeRef() {
    return 'CC-' + Math.floor(100000 + Math.random() * 900000);
  }

  function formatMoney(n) {
    return '£' + Number(n).toLocaleString('en-GB');
  }

  /* ---------------- Scroll progress ---------------- */
  const progress = $('#scrollProgress');
  function updateProgress() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    if (progress) progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  }

  /* ---------------- Sticky nav state ---------------- */
  const nav = $('#nav');
  function updateNav() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    const toTop = $('#toTop');
    if (toTop) toTop.classList.toggle('show', window.scrollY > 700);
  }

  window.addEventListener('scroll', () => {
    updateProgress();
    updateNav();
    updateScrollSpy();
  }, { passive: true });

  /* ---------------- Mobile menu ---------------- */
  const hamburger = $('#hamburger');
  const navLinks = $('#navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
    $$('.nav-link', navLinks).forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }

  /* ---------------- Scroll spy ---------------- */
  const spySections = ['home', 'services', 'fleet', 'experience', 'booking', 'faq', 'contact']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  function updateScrollSpy() {
    const pos = window.scrollY + 140;
    let current = spySections[0];
    spySections.forEach(sec => {
      if (sec.offsetTop <= pos) current = sec;
    });
    $$('.nav-link').forEach(l => {
      const href = l.getAttribute('href') || '';
      l.classList.toggle('active', current && href === '#' + current.id);
    });
  }

  /* ---------------- Reveal on scroll ---------------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  $$('.reveal').forEach(el => revealObserver.observe(el));

  /* ---------------- Animated counters ---------------- */
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.target || '0');
      const duration = 1600;
      const start = performance.now();
      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toString();
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.6 });

  $$('.counter').forEach(el => counterObserver.observe(el));

  /* ---------------- Testimonials slider ---------------- */
  const track = $('#testiTrack');
  if (track) {
    const cards = $$('.testi-card', track);
    const dotsWrap = $('#testiDots');
    let index = 0;
    let autoTimer;

    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'testi-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Testimonial ' + (i + 1));
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    });

    function goTo(i) {
      index = (i + cards.length) % cards.length;
      track.style.transform = 'translateX(-' + index * 100 + '%)';
      $$('.testi-dot', dotsWrap).forEach((d, di) => d.classList.toggle('active', di === index));
      restartAuto();
    }

    function restartAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(() => goTo(index + 1), 6500);
    }

    const prev = $('#testiPrev');
    const next = $('#testiNext');
    if (prev) prev.addEventListener('click', () => goTo(index - 1));
    if (next) next.addEventListener('click', () => goTo(index + 1));
    restartAuto();
  }

  /* ---------------- Back to top ---------------- */
  const toTop = $('#toTop');
  if (toTop) {
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------------- Footer year ---------------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============================================================
     BOOKING SYSTEM
     ============================================================ */

  const bookingForm = $('#bookingForm');
  const quickBook = $('#quickBook');

  /* Default date = tomorrow */
  function defaultDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  const bookDate = $('#bookDate');
  const qbDate = $('#qbDate');
  const returnDate = $('#returnDate');
  if (bookDate) bookDate.min = new Date().toISOString().split('T')[0];
  if (qbDate) qbDate.min = new Date().toISOString().split('T')[0];
  if (returnDate) returnDate.min = new Date().toISOString().split('T')[0];
  if (bookDate && !bookDate.value) bookDate.value = defaultDate();
  if (qbDate && !qbDate.value) qbDate.value = defaultDate();
  const bookTime = $('#bookTime');
  if (bookTime && !bookTime.value) bookTime.value = '10:00';
  const qbTime = $('#qbTime');
  if (qbTime && !qbTime.value) qbTime.value = '10:00';

  /* ----- Trip type UI toggles ----- */
  const tripTypeSel = $('#tripType');
  const hoursField = $('#hoursField');
  const returnDateField = $('#returnDateField');

  function syncTripTypeUI() {
    if (!tripTypeSel) return;
    const v = tripTypeSel.value;
    if (hoursField) hoursField.style.display = v === 'hourly' ? '' : 'none';
    if (returnDateField) returnDateField.style.display = v === 'round-trip' ? '' : 'none';
    const dropoffField = $('#dropoff');
    if (dropoffField) {
      const optional = v === 'hourly';
      dropoffField.placeholder = optional ? 'As-directed (optional)' : 'e.g. The Ritz, Piccadilly';
      if (optional) dropoffField.removeAttribute('required');
      else dropoffField.setAttribute('required', '');
    }
    updateEstimate();
  }

  if (tripTypeSel) tripTypeSel.addEventListener('change', syncTripTypeUI);

  /* ----- Fare estimate ----- */
  function getSelectedVehicle() {
    const checked = $('input[name="vehicle"]:checked');
    if (!checked) return { key: 's-class', ...VEHICLES['s-class'] };
    return { key: checked.value, ...VEHICLES[checked.value] };
  }

  function isHeathrowRoute() {
    const p = ($('#pickup') ? $('#pickup').value : '').toLowerCase();
    const d = ($('#dropoff') ? $('#dropoff').value : '').toLowerCase();
    return p.includes('heathrow') || d.includes('heathrow') || p.includes('lhr') || d.includes('lhr');
  }

  function computeEstimate() {
    const type = tripTypeSel ? tripTypeSel.value : 'airport';
    const vehicle = getSelectedVehicle();
    const hours = $('#hours') ? parseInt($('#hours').value, 10) || 3 : 3;

    let amount = 0;
    let note = '';

    if (type === 'hourly') {
      const h = Math.max(3, hours);
      amount = h >= 8 ? vehicle.day * (h / 8) : vehicle.hourly * h;
      amount = Math.round(amount);
      note = `Based on ${h} hours · ${vehicle.name}` + (h >= 8 ? ' (day-rate equivalent)' : ' (3 hour minimum)') + '.';
    } else if (type === 'round-trip') {
      amount = vehicle.hourly * 6;
      note = `Based on 2 × 3-hour journeys · ${vehicle.name}. One-way estimates doubled.`;
      if (isHeathrowRoute()) {
        amount = vehicle.heathrow * 2;
        note = `Return airport transfer · ${vehicle.name}.`;
      }
    } else if (type === 'airport' && isHeathrowRoute()) {
      amount = vehicle.heathrow;
      note = `Heathrow ↔ Central London fixed rate · ${vehicle.name}.`;
    } else {
      amount = vehicle.hourly * 3;
      note = `From-price based on 3 hours · ${vehicle.name}. Final quote confirmed by your concierge.`;
    }

    return { amount, note, vehicle };
  }

  function updateEstimate() {
    const box = $('#estimateBox');
    if (!box) return;
    const { amount, note } = computeEstimate();
    const val = $('#estimateValue');
    const noteEl = $('#estimateNote');
    if (val) val.textContent = formatMoney(amount);
    if (noteEl) noteEl.textContent = note + ' Final quote confirmed by your concierge.';
  }

  $$('#vehicleSelect input[name="vehicle"]').forEach(r => r.addEventListener('change', updateEstimate));
  if ($('#hours')) $('#hours').addEventListener('change', updateEstimate);
  if ($('#pickup')) $('#pickup').addEventListener('input', debounce(updateEstimate, 400));
  if ($('#dropoff')) $('#dropoff').addEventListener('input', debounce(updateEstimate, 400));

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  /* ----- Multi-step navigation ----- */
  function showStep(n) {
    $$('.b-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === String(n)));
    $$('.b-step').forEach(s => {
      const step = parseInt(s.dataset.step, 10);
      s.classList.toggle('active', step === n);
      s.classList.toggle('done', step < n);
    });
    const wrap = $('.booking-wrap');
    if (wrap) {
      const y = wrap.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    if (n === 2) updateEstimate();
  }

  function validatePanel(n) {
    let ok = true;
    const panel = $(`.b-panel[data-panel="${n}"]`);
    if (!panel) return true;
    $$('input, select, textarea', panel).forEach(field => {
      field.classList.remove('error');
      if (!field.hasAttribute('required')) return;
      if (field.type === 'checkbox') {
        if (!field.checked) {
          ok = false;
          field.closest('.b-check') && (field.closest('.b-check').style.color = '#c96a5b');
        }
        return;
      }
      const val = (field.value || '').trim();
      let valid = val !== '';
      if (field.type === 'email' && val) valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if (!valid) {
        ok = false;
        field.classList.add('error');
      }
    });
    return ok;
  }

  $$('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = btn.closest('.b-panel');
      const n = parseInt(current.dataset.panel, 10);
      if (!validatePanel(n)) {
        const firstErr = $('.error', current);
        if (firstErr) firstErr.focus();
        return;
      }
      showStep(parseInt(btn.dataset.next, 10));
    });
  });

  $$('[data-prev]').forEach(btn => {
    btn.addEventListener('click', () => showStep(parseInt(btn.dataset.prev, 10)));
  });

  /* ----- Quick book bar → full form ----- */
  if (quickBook) {
    quickBook.addEventListener('submit', (e) => {
      e.preventDefault();
      const map = {
        qbType: 'tripType',
        qbPickup: 'pickup',
        qbDropoff: 'dropoff',
        qbDate: 'bookDate',
        qbTime: 'bookTime'
      };
      Object.entries(map).forEach(([from, to]) => {
        const src = $('#' + from);
        const dest = $('#' + to);
        if (src && dest && src.value) dest.value = src.value;
      });
      syncTripTypeUI();
      showStep(1);
      const booking = $('#booking');
      if (booking) booking.scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ----- Fleet "Book Now" buttons ----- */
  $$('.book-vehicle').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.vehicle;
      const radio = $(`#vehicleSelect input[value="${key}"]`);
      if (radio) {
        radio.checked = true;
        updateEstimate();
      }
      showStep(2);
      const booking = $('#booking');
      if (booking) booking.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ----- Service quick links set trip type ----- */
  $$('.text-link[data-trip]').forEach(link => {
    link.addEventListener('click', () => {
      if (tripTypeSel) {
        tripTypeSel.value = link.dataset.trip;
        syncTripTypeUI();
      }
    });
  });

  /* ----- Submit booking ----- */
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validatePanel(3)) {
        const firstErr = $('.b-panel[data-panel="3"] .error');
        if (firstErr) firstErr.focus();
        return;
      }
      const terms = $('#terms');
      if (terms && !terms.checked) {
        terms.closest('.b-check').style.color = '#c96a5b';
        return;
      }

      const { amount, vehicle } = computeEstimate();
      const booking = {
        ref: makeRef(),
        tripType: tripTypeSel.value,
        tripLabel: TRIP_LABELS[tripTypeSel.value] || tripTypeSel.value,
        pickup: $('#pickup').value.trim(),
        dropoff: ($('#dropoff').value.trim() || 'As-directed'),
        date: $('#bookDate').value,
        time: $('#bookTime').value,
        returnDate: $('#returnDate') ? $('#returnDate').value : '',
        hours: tripTypeSel.value === 'hourly' ? ($('#hours') ? $('#hours').value : '3') : '',
        flightNo: $('#flightNo').value.trim(),
        vehicle: vehicle.name,
        passengers: $('#passengers').value,
        fullName: $('#fullName').value.trim(),
        email: $('#email').value.trim(),
        phone: $('#phone').value.trim(),
        company: $('#company').value.trim(),
        notes: $('#notes').value.trim(),
        estimate: amount,
        status: 'New',
        createdAt: new Date().toISOString()
      };

      const list = loadBookings();
      list.unshift(booking);
      saveBookings(list);

      /* Fill success panel */
      bookingForm.style.display = 'none';
      $('#bookingSteps').style.display = 'none';
      const success = $('#bookingSuccess');
      success.style.display = 'block';

      $('#successName').textContent = booking.fullName.split(' ')[0] || 'valued guest';
      $('#successRef').textContent = booking.ref;

      const summary = $('#successSummary');
      summary.innerHTML = `
        <div class="ss-row"><span>Reference</span><strong>${booking.ref}</strong></div>
        <div class="ss-row"><span>Journey</span><strong>${booking.tripLabel}</strong></div>
        <div class="ss-row"><span>Route</span><strong>${booking.pickup} → ${booking.dropoff}</strong></div>
        <div class="ss-row"><span>Date & Time</span><strong>${booking.date} · ${booking.time}</strong></div>
        <div class="ss-row"><span>Vehicle</span><strong>${booking.vehicle}</strong></div>
        <div class="ss-row"><span>Passengers</span><strong>${booking.passengers}</strong></div>
        <div class="ss-row"><span>Estimated Fare</span><strong>${formatMoney(booking.estimate)}</strong></div>
      `;

      /* WhatsApp deep link with full context */
      const waMsg =
`Hello Cullinan Chauffeur, I have just submitted a booking request.

Booking Ref: ${booking.ref}
Name: ${booking.fullName}
Journey: ${booking.tripLabel}
Pick-up: ${booking.pickup}
Drop-off: ${booking.dropoff}
Date: ${booking.date} at ${booking.time}${booking.returnDate ? ' (return ' + booking.returnDate + ')' : ''}${booking.hours ? ' · ' + booking.hours + ' hours' : ''}
Vehicle: ${booking.vehicle}
Passengers: ${booking.passengers}
Estimated Fare: ${formatMoney(booking.estimate)}${booking.flightNo ? '\nFlight: ' + booking.flightNo : ''}${booking.notes ? '\nNotes: ' + booking.notes : ''}

Please confirm availability. Thank you.`;

      const waLink = $('#whatsappSend');
      if (waLink) {
        waLink.href = 'https://wa.me/447773399007?text=' + encodeURIComponent(waMsg);
      }

      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ----- New booking reset ----- */
  const newBookingBtn = $('#newBookingBtn');
  if (newBookingBtn) {
    newBookingBtn.addEventListener('click', () => {
      $('#bookingSuccess').style.display = 'none';
      bookingForm.style.display = 'block';
      $('#bookingSteps').style.display = 'flex';
      bookingForm.reset();
      if (bookDate) bookDate.value = defaultDate();
      if (bookTime) bookTime.value = '10:00';
      syncTripTypeUI();
      showStep(1);
    });
  }

  /* ----- Init ----- */
  syncTripTypeUI();
  updateProgress();
  updateNav();
  updateScrollSpy();

  /* Expose for admin page reuse */
  window.Cullinan = { loadBookings, saveBookings, formatMoney, VEHICLES, TRIP_LABELS };
})();
