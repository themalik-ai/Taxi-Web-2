/* ============================================================
   CULLINAN CHAUFFEURS — Admin Dashboard Script
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     CHANGE THIS PASSWORD before going live.
     ---------------------------------------------------------- */
  const DASHBOARD_PASSWORD = 'admin';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const BOOKINGS_KEY = 'cullinan_bookings';
  const SESSION_KEY = 'cullinan_admin_session';

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

  function formatMoney(n) {
    return '£' + Number(n).toLocaleString('en-GB');
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ================= LOCK SCREEN ================= */
  const lockScreen = $('#lockScreen');
  const dashboard = $('#dashboard');

  function unlock() {
    sessionStorage.setItem(SESSION_KEY, '1');
    lockScreen.style.display = 'none';
    dashboard.style.display = 'grid';
    render();
  }

  function lock() {
    sessionStorage.removeItem(SESSION_KEY);
    dashboard.style.display = 'none';
    lockScreen.style.display = 'grid';
    $('#lockPassword').value = '';
    $('#lockPassword').focus();
  }

  if (sessionStorage.getItem(SESSION_KEY) === '1') unlock();

  $('#lockForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = $('#lockPassword').value.trim();
    if (val === DASHBOARD_PASSWORD) {
      unlock();
    } else {
      $('#lockPassword').style.borderColor = '#c96a5b';
      $('#lockPassword').value = '';
      $('#lockPassword').placeholder = 'Incorrect password — try again';
      setTimeout(() => {
        $('#lockPassword').style.borderColor = '';
        $('#lockPassword').placeholder = 'Password';
      }, 2500);
    }
  });

  $('#lockBtn').addEventListener('click', lock);

  /* ================= RENDER ================= */
  const body = $('#bookingsBody');

  function filteredList() {
    const q = ($('#searchInput').value || '').trim().toLowerCase();
    const status = $('#statusFilter').value;
    const trip = $('#tripFilter').value;

    return loadBookings().filter(b => {
      if (status && b.status !== status) return false;
      if (trip && b.tripLabel !== trip) return false;
      if (q) {
        const hay = [
          b.ref, b.fullName, b.email, b.phone, b.pickup, b.dropoff,
          b.vehicle, b.company, b.flightNo
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function render() {
    const all = loadBookings();
    const list = filteredList();

    /* Stats */
    const active = all.filter(b => b.status !== 'Cancelled');
    $('#statTotal').textContent = all.length;
    $('#statNew').textContent = all.filter(b => b.status === 'New').length;
    $('#statConfirmed').textContent = all.filter(b => b.status === 'Confirmed').length;
    $('#statCompleted').textContent = all.filter(b => b.status === 'Completed').length;
    $('#statRevenue').textContent = formatMoney(
      active.reduce((sum, b) => sum + (Number(b.estimate) || 0), 0)
    );

    /* Table */
    if (!list.length) {
      body.innerHTML = `<tr class="empty-row"><td colspan="8">${
        all.length ? 'No bookings match your filters.' :
        'No bookings yet. Bookings submitted on the website will appear here.'
      }</td></tr>`;
      return;
    }

    body.innerHTML = list.map(b => `
      <tr data-ref="${esc(b.ref)}">
        <td><span class="ref-code">${esc(b.ref)}</span></td>
        <td class="client-cell">
          <strong>${esc(b.fullName)}</strong>
          <span>${esc(b.phone)}</span>
        </td>
        <td class="route-cell">
          <span>${esc(b.pickup)} <span class="route-arrow">→</span> ${esc(b.dropoff)}</span>
          <span style="color:#6a645a">${esc(b.tripLabel)}${b.hours ? ' · ' + esc(b.hours) + 'h' : ''}</span>
        </td>
        <td>
          <span>${esc(b.date)}</span><br>
          <span style="color:#6a645a">${esc(b.time)}${b.returnDate ? ' · ret ' + esc(b.returnDate) : ''}</span>
        </td>
        <td>${esc(b.vehicle)}<br><span style="color:#6a645a">${esc(b.passengers)} pax</span></td>
        <td><strong style="color:#e0be7e;font-family:'Cormorant Garamond',serif;font-size:1.15rem">${formatMoney(b.estimate)}</strong></td>
        <td>
          <select class="status-select" data-ref="${esc(b.ref)}">
            ${['New','Confirmed','Completed','Cancelled'].map(s =>
              `<option value="${s}" ${b.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </td>
        <td>
          <div class="row-actions">
            <button class="act-btn view-btn" data-ref="${esc(b.ref)}">View</button>
            <a class="act-btn wa" href="https://wa.me/${esc(String(b.phone).replace(/[^\d]/g, ''))}?text=${encodeURIComponent('Hello ' + b.fullName + ', this is Cullinan Chauffeurs regarding your booking ' + b.ref + '.')}" target="_blank" rel="noopener">WhatsApp</a>
            <button class="act-btn danger del-btn" data-ref="${esc(b.ref)}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    /* Bind row actions */
    $$('.status-select', body).forEach(sel => {
      sel.addEventListener('change', () => {
        const list = loadBookings();
        const item = list.find(x => x.ref === sel.dataset.ref);
        if (item) {
          item.status = sel.value;
          saveBookings(list);
          render();
        }
      });
    });

    $$('.del-btn', body).forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete booking ' + btn.dataset.ref + '? This cannot be undone.')) return;
        saveBookings(loadBookings().filter(x => x.ref !== btn.dataset.ref));
        render();
      });
    });

    $$('.view-btn', body).forEach(btn => {
      btn.addEventListener('click', () => openDrawer(btn.dataset.ref));
    });
  }

  $('#searchInput').addEventListener('input', render);
  $('#statusFilter').addEventListener('change', render);
  $('#tripFilter').addEventListener('change', render);

  /* ================= DRAWER ================= */
  const drawer = $('#drawer');
  const backdrop = $('#drawerBackdrop');

  function openDrawer(ref) {
    const b = loadBookings().find(x => x.ref === ref);
    if (!b) return;

    $('#drawerContent').innerHTML = `
      <h2>${esc(b.fullName)}</h2>
      <span class="dr-ref">${esc(b.ref)} · ${esc(b.status)}</span>

      <div class="dr-section">
        <h3>Journey</h3>
        <div class="dr-row"><span>Type</span><strong>${esc(b.tripLabel)}</strong></div>
        <div class="dr-row"><span>Pick-up</span><strong>${esc(b.pickup)}</strong></div>
        <div class="dr-row"><span>Drop-off</span><strong>${esc(b.dropoff)}</strong></div>
        <div class="dr-row"><span>Date & Time</span><strong>${esc(b.date)} · ${esc(b.time)}</strong></div>
        ${b.returnDate ? `<div class="dr-row"><span>Return</span><strong>${esc(b.returnDate)}</strong></div>` : ''}
        ${b.hours ? `<div class="dr-row"><span>Duration</span><strong>${esc(b.hours)} hours</strong></div>` : ''}
        ${b.flightNo ? `<div class="dr-row"><span>Flight</span><strong>${esc(b.flightNo)}</strong></div>` : ''}
      </div>

      <div class="dr-section">
        <h3>Vehicle & Fare</h3>
        <div class="dr-row"><span>Vehicle</span><strong>${esc(b.vehicle)}</strong></div>
        <div class="dr-row"><span>Passengers</span><strong>${esc(b.passengers)}</strong></div>
        <div class="dr-row"><span>Estimated Fare</span><strong style="color:#e0be7e;font-size:1.15rem">${formatMoney(b.estimate)}</strong></div>
      </div>

      <div class="dr-section">
        <h3>Client</h3>
        <div class="dr-row"><span>Email</span><strong>${esc(b.email)}</strong></div>
        <div class="dr-row"><span>Phone</span><strong>${esc(b.phone)}</strong></div>
        ${b.company ? `<div class="dr-row"><span>Company</span><strong>${esc(b.company)}</strong></div>` : ''}
        <div class="dr-row"><span>Submitted</span><strong>${new Date(b.createdAt).toLocaleString('en-GB')}</strong></div>
      </div>

      ${b.notes ? `
      <div class="dr-section">
        <h3>Special Requests</h3>
        <div class="dr-notes">${esc(b.notes)}</div>
      </div>` : ''}

      <div class="dr-actions">
        <a class="btn btn-gold" href="https://wa.me/${esc(String(b.phone).replace(/[^\d]/g, ''))}?text=${encodeURIComponent('Hello ' + b.fullName + ', this is Cullinan Chauffeurs regarding your booking ' + b.ref + '.')} " target="_blank" rel="noopener">Message on WhatsApp</a>
        <a class="btn btn-line" href="mailto:${esc(b.email)}?subject=${encodeURIComponent('Your Cullinan Booking ' + b.ref)}">Send Email</a>
      </div>
    `;

    drawer.classList.add('open');
    backdrop.classList.add('open');
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
  }

  $('#drawerClose').addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });

  /* ================= CSV EXPORT ================= */
  $('#exportBtn').addEventListener('click', () => {
    const list = filteredList();
    if (!list.length) {
      alert('No bookings to export.');
      return;
    }
    const cols = ['ref','status','fullName','email','phone','company','tripLabel',
      'pickup','dropoff','date','time','returnDate','hours','flightNo',
      'vehicle','passengers','estimate','notes','createdAt'];
    const head = cols.join(',');
    const rows = list.map(b =>
      cols.map(c => '"' + String(b[c] == null ? '' : b[c]).replace(/"/g, '""') + '"').join(',')
    );
    const csv = [head, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cullinan-bookings-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* ================= DEMO DATA ================= */
  $('#seedBtn').addEventListener('click', () => {
    if (loadBookings().length && !confirm('This adds demo bookings alongside your existing ones. Continue?')) return;

    const demo = [
      {
        ref: 'CC-' + Math.floor(100000 + Math.random() * 900000),
        tripType: 'airport', tripLabel: 'Airport Transfer',
        pickup: 'Heathrow Airport Terminal 5', dropoff: 'The Ritz, Piccadilly',
        date: '2026-10-20', time: '14:30', returnDate: '', hours: '',
        flightNo: 'EK001', vehicle: 'Mercedes S-Class', passengers: '2',
        fullName: 'James Ashford', email: 'james.ashford@example.com',
        phone: '+44 7700 900123', company: 'Ashford Capital',
        notes: 'Please have chilled water and a newspaper ready.',
        estimate: 165, status: 'New', createdAt: new Date().toISOString()
      },
      {
        ref: 'CC-' + Math.floor(100000 + Math.random() * 900000),
        tripType: 'hourly', tripLabel: 'By The Hour',
        pickup: 'Canary Wharf', dropoff: 'As-directed',
        date: '2026-10-22', time: '09:00', returnDate: '', hours: '8',
        flightNo: '', vehicle: 'Mercedes V-Class & EQV', passengers: '6',
        fullName: 'Sara Khalid', email: 'sara.k@example.com',
        phone: '+971 50 123 4567', company: 'Gulf Ventures',
        notes: 'Full-day roadshow across London for visiting delegation.',
        estimate: 520, status: 'Confirmed', createdAt: new Date().toISOString()
      },
      {
        ref: 'CC-' + Math.floor(100000 + Math.random() * 900000),
        tripType: 'one-way', tripLabel: 'One Way',
        pickup: 'Gatwick North Terminal', dropoff: 'Claridge’s, Mayfair',
        date: '2026-10-18', time: '18:45', returnDate: '', hours: '',
        flightNo: 'BA281', vehicle: 'Range Rover', passengers: '3',
        fullName: 'Emily & Michael Turner', email: 'emily.turner@example.com',
        phone: '+44 7700 900555', company: '',
        notes: 'Honeymoon return — champagne in the car please.',
        estimate: 270, status: 'Completed', createdAt: new Date().toISOString()
      }
    ];

    saveBookings([...loadBookings(), ...demo]);
    render();
  });

})();
