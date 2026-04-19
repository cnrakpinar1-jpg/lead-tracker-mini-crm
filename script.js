/* =====================================================================
   LEAD TRACKER — script.js
   Vanilla JavaScript | No frameworks | localStorage data layer

   SECTIONS:
     1.  Data layer       — read / write localStorage
     2.  Sample data      — seed 3 leads on first visit
     3.  App state        — current filter / sort / edit mode
     4.  Dashboard        — compute and render the six summary cards
     5.  Filter & sort    — apply search + dropdowns to the leads array
     6.  Helpers          — formatting, escaping, avatar initials & color
     7.  Rendering        — build and inject the leads table HTML
     8.  Modal            — open / close / populate the form
     9.  Validation       — check required fields and email format
    10.  CRUD             — create, update, delete leads in storage
    11.  Form submit       — wire the form to CRUD
    12.  Filter listeners  — search / dropdowns update state & re-render
    13.  Modal listeners   — open / close events
    14.  Export            — CSV and JSON file download
    15.  Reset             — wipe all leads with confirmation
    16.  Toast             — lightweight notification system
    17.  Init              — boot the app
   ===================================================================== */


/* =====================================================================
   1. DATA LAYER
   Everything reads and writes through these two functions.
   localStorage stores the leads array as a JSON string.
   ===================================================================== */

const STORAGE_KEY = 'leadtracker_v1';

/** Read all leads from localStorage. Always returns an array. */
function getLeads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return []; // return empty array if data is corrupt
  }
}

/** Write the full leads array back to localStorage. */
function saveLeads(leads) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

/** Create a unique ID using timestamp + a random string. */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}


/* =====================================================================
   2. SAMPLE DATA
   Three realistic leads pre-loaded on the very first visit.
   seedSampleData() only writes them if storage is empty.
   ===================================================================== */

function buildSampleLeads() {
  const now = Date.now();
  const day = 86400000; // one day in milliseconds

  return [
    {
      id:             generateId(),
      fullName:       'Sarah Johnson',
      company:        'BrightPath Studio',
      email:          'sarah@brightpath.io',
      phone:          '+1 415 555 0182',
      source:         'LinkedIn',
      status:         'Proposal Sent',
      priority:       'High',
      estimatedValue: 4500,
      notes:          'Full SaaS dashboard redesign. Budget confirmed, very responsive. Wants to kick off next week.',
      dateAdded:      new Date(now - 2 * day).toISOString()
    },
    {
      id:             generateId(),
      fullName:       'Marcus Reeve',
      company:        'Reeve & Co',
      email:          'marcus@reeveandco.com',
      phone:          '+44 7700 900241',
      source:         'Upwork',
      status:         'Qualified',
      priority:       'Medium',
      estimatedValue: 1800,
      notes:          'Landing page + email templates. Tight deadline — end of month. Shortlisted 3 freelancers.',
      dateAdded:      new Date(now - 5 * day).toISOString()
    },
    {
      id:             generateId(),
      fullName:       'Priya Nair',
      company:        '',
      email:          'priya.nair@gmail.com',
      phone:          '+91 98200 00123',
      source:         'Referral',
      status:         'New',
      priority:       'Low',
      estimatedValue: 600,
      notes:          'Referred by Marcus. Needs a personal portfolio site. Small budget, flexible timeline.',
      dateAdded:      new Date(now - 1 * day).toISOString()
    }
  ];
}

function seedSampleData() {
  if (getLeads().length === 0) {
    saveLeads(buildSampleLeads());
  }
}


/* =====================================================================
   3. APP STATE
   A single object that tracks the current UI state.
   Mutate it when something changes, then call renderLeads().
   ===================================================================== */

const state = {
  search:         '',      // text typed in the search box
  filterStatus:   '',      // value selected in status dropdown
  filterSource:   '',      // value selected in source dropdown
  filterPriority: '',      // value selected in priority dropdown
  sortBy:         'newest', // 'newest' | 'oldest' | 'value-high' | 'value-low'
  editingId:      null     // null = adding new; string = editing existing lead
};


/* =====================================================================
   4. DASHBOARD — SUMMARY CARDS
   Always computed from ALL leads, regardless of active filters.
   ===================================================================== */

function updateDashboard(leads) {
  const total    = leads.length;
  const newCount = leads.filter(l => l.status === 'New').length;
  const proposal = leads.filter(l => l.status === 'Proposal Sent').length;
  const won      = leads.filter(l => l.status === 'Won').length;
  const lost     = leads.filter(l => l.status === 'Lost').length;
  const value    = leads.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);

  document.getElementById('statTotal').textContent    = total;
  document.getElementById('statNew').textContent      = newCount;
  document.getElementById('statProposal').textContent = proposal;
  document.getElementById('statWon').textContent      = won;
  document.getElementById('statLost').textContent     = lost;
  document.getElementById('statValue').textContent    = formatCurrency(value);
}


/* =====================================================================
   5. FILTER & SORT
   Returns a filtered and sorted copy of the leads array.
   ===================================================================== */

function getFilteredLeads() {
  let leads = getLeads();

  // Text search — case-insensitive, matches name, company, or email
  if (state.search) {
    const q = state.search.toLowerCase();
    leads = leads.filter(l =>
      l.fullName.toLowerCase().includes(q) ||
      l.company.toLowerCase().includes(q)  ||
      l.email.toLowerCase().includes(q)
    );
  }

  // Dropdown filters — exact match
  if (state.filterStatus)   leads = leads.filter(l => l.status   === state.filterStatus);
  if (state.filterSource)   leads = leads.filter(l => l.source   === state.filterSource);
  if (state.filterPriority) leads = leads.filter(l => l.priority === state.filterPriority);

  // Sort
  leads.sort((a, b) => {
    switch (state.sortBy) {
      case 'newest':     return new Date(b.dateAdded) - new Date(a.dateAdded);
      case 'oldest':     return new Date(a.dateAdded) - new Date(b.dateAdded);
      case 'value-high': return (Number(b.estimatedValue) || 0) - (Number(a.estimatedValue) || 0);
      case 'value-low':  return (Number(a.estimatedValue) || 0) - (Number(b.estimatedValue) || 0);
      default:           return 0;
    }
  });

  return leads;
}

/** Returns true if any filter or search is currently active. */
function hasActiveFilters() {
  return !!(state.search || state.filterStatus || state.filterSource || state.filterPriority);
}

/** Clear all filters and reset the filter UI controls. */
function clearFilters() {
  state.search         = '';
  state.filterStatus   = '';
  state.filterSource   = '';
  state.filterPriority = '';

  document.getElementById('searchInput').value    = '';
  document.getElementById('filterStatus').value   = '';
  document.getElementById('filterSource').value   = '';
  document.getElementById('filterPriority').value = '';

  renderLeads();
}


/* =====================================================================
   6. HELPERS — formatting, escaping, avatars
   ===================================================================== */

/** Format a number as compact USD, e.g. 4500 → "$4,500". */
function formatCurrency(amount) {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount);
}

/** Format an ISO date into a short readable string like "Apr 14, 2025". */
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

/**
 * Escape HTML special characters before inserting user data into innerHTML.
 * Prevents XSS — e.g. if someone types <script> into the name field.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Escape a string for safe use inside an HTML attribute (e.g. title="…").
 * Handles quotes and angle brackets.
 */
function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Get up to two initials from a full name.
 * "Sarah Johnson" → "SJ", "Marcus" → "M"
 */
function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

// Palette defined once at module level — same name always maps to same color.
const AVATAR_PALETTE = [
  { bg: '#e0e7ff', fg: '#4338ca' }, // indigo
  { bg: '#d1fae5', fg: '#059669' }, // emerald
  { bg: '#dbeafe', fg: '#2563eb' }, // blue
  { bg: '#ede9fe', fg: '#7c3aed' }, // violet
  { bg: '#fce7f3', fg: '#be185d' }, // pink
  { bg: '#fef3c7', fg: '#b45309' }, // amber
  { bg: '#ccfbf1', fg: '#0f766e' }, // teal
  { bg: '#fde8d8', fg: '#c2410c' }, // orange
];

function getAvatarColor(name) {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/** CSS badge class for a status string. Must match style.css .badge-* rules. */
function getStatusClass(status) {
  const map = {
    'New':           'badge-new',
    'Contacted':     'badge-contacted',
    'Qualified':     'badge-qualified',
    'Proposal Sent': 'badge-proposal',
    'Won':           'badge-won',
    'Lost':          'badge-lost'
  };
  return map[status] || '';
}

/** CSS badge class for a priority string. */
function getPriorityClass(priority) {
  return { 'High': 'badge-high', 'Medium': 'badge-medium', 'Low': 'badge-low' }[priority] || '';
}


/* =====================================================================
   7. RENDERING — BUILD THE LEAD TABLE
   ===================================================================== */

/** Build one <tr> of HTML for a single lead object. */
function buildLeadRow(lead) {
  const initials = getInitials(lead.fullName);
  const color    = getAvatarColor(lead.fullName);
  const value    = lead.estimatedValue ? formatCurrency(lead.estimatedValue) : '—';
  const phone    = lead.phone || '—';

  // Small "Note" chip that appears when the lead has notes.
  // The native title attribute shows the note text on hover.
  const noteChip = lead.notes
    ? `<abbr class="has-notes" title="${escapeAttr(lead.notes)}">Note</abbr>`
    : '';

  return `
    <tr data-priority="${escapeAttr(lead.priority)}">

      <td data-label="Name">
        <div class="lead-cell">
          <div class="lead-avatar" style="background:${color.bg}; color:${color.fg};">${initials}</div>
          <div>
            <div class="lead-name">${escapeHtml(lead.fullName)}</div>
            <div class="lead-sub">
              ${escapeHtml(lead.company || '—')}
              ${noteChip}
            </div>
          </div>
        </div>
      </td>

      <td data-label="Contact" class="col-contact">
        <div class="cell-email">${escapeHtml(lead.email)}</div>
        <div class="cell-phone">${escapeHtml(phone)}</div>
      </td>

      <td data-label="Source">
        <span class="badge badge-source">${escapeHtml(lead.source)}</span>
      </td>

      <td data-label="Status">
        <span class="badge ${getStatusClass(lead.status)}">${escapeHtml(lead.status)}</span>
      </td>

      <td data-label="Priority">
        <span class="badge ${getPriorityClass(lead.priority)}">${escapeHtml(lead.priority)}</span>
      </td>

      <td data-label="Value">
        <span class="value-text">${value}</span>
      </td>

      <td data-label="Added">
        <span class="date-text">${formatDate(lead.dateAdded)}</span>
      </td>

      <td data-label="Actions">
        <div class="row-actions">
          <button class="action-btn action-btn-edit"   onclick="openEditModal('${lead.id}')">Edit</button>
          <button class="action-btn action-btn-delete" onclick="deleteLead('${lead.id}')">Delete</button>
        </div>
      </td>

    </tr>
  `;
}

/**
 * Main render function.
 * Called any time the data or filter state changes.
 * Updates the dashboard, the table, and the results-meta line.
 */
function renderLeads() {
  const allLeads   = getLeads();
  const filtered   = getFilteredLeads();
  const container  = document.getElementById('leadsContainer');
  const countBadge = document.getElementById('leadCount');
  const tableMeta  = document.getElementById('tableMeta');

  // Dashboard always shows totals from the full dataset
  updateDashboard(allLeads);

  // Badge beside the "Leads" heading shows the filtered count
  countBadge.textContent = filtered.length;

  // Results context line — appears when any filter is active
  if (hasActiveFilters() && allLeads.length > 0) {
    tableMeta.innerHTML = `
      <span>Showing ${filtered.length} of ${allLeads.length}</span>
      <span class="table-meta-sep">&mdash;</span>
      <button class="btn-link" onclick="clearFilters()">Clear filters</button>
    `;
  } else {
    tableMeta.innerHTML = '';
  }

  // ── Empty state ──────────────────────────────────────────────────
  if (filtered.length === 0) {
    const isFiltered = hasActiveFilters();
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon-wrap">
          ${isFiltered
            ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`
            : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
          }
        </div>
        <div class="empty-title">
          ${isFiltered ? 'No leads match your filters' : 'No leads yet'}
        </div>
        <div class="empty-subtitle">
          ${isFiltered
            ? 'Try a different search term, or clear your filters to see all leads.'
            : 'Click "Add Lead" to start tracking your first potential client.'}
        </div>
        ${!isFiltered
          ? `<div class="empty-cta">
               <button class="btn btn-primary" onclick="openAddModal()">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                 Add Lead
               </button>
             </div>`
          : `<div class="empty-cta">
               <button class="btn btn-ghost" onclick="clearFilters()">Clear filters</button>
             </div>`
        }
      </div>
    `;
    return;
  }

  // ── Build table ──────────────────────────────────────────────────
  const rows = filtered.map(buildLeadRow).join('');

  container.innerHTML = `
    <div style="overflow-x: auto;">
      <table class="leads-table">
        <thead>
          <tr>
            <th>Lead</th>
            <th>Contact</th>
            <th>Source</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Est. Value</th>
            <th>Date Added</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}


/* =====================================================================
   8. MODAL — OPEN / CLOSE / POPULATE
   The same modal is reused for Add and Edit modes.
   ===================================================================== */

const modalOverlay = document.getElementById('modalOverlay');

/** Open the modal in "Add" mode with a blank form. */
function openAddModal() {
  state.editingId = null;
  document.getElementById('modalTitle').textContent = 'Add New Lead';
  document.getElementById('submitBtn').textContent  = 'Add Lead';
  document.getElementById('leadForm').reset();
  clearErrors();
  modalOverlay.classList.add('open');
  setTimeout(() => document.getElementById('fullName').focus(), 60);
}

/** Open the modal in "Edit" mode, pre-filled with the lead's existing data. */
function openEditModal(id) {
  const lead = getLeads().find(l => l.id === id);
  if (!lead) return;

  state.editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit Lead';
  document.getElementById('submitBtn').textContent  = 'Save Changes';

  // Populate every field
  document.getElementById('fullName').value       = lead.fullName;
  document.getElementById('company').value        = lead.company;
  document.getElementById('email').value          = lead.email;
  document.getElementById('phone').value          = lead.phone;
  document.getElementById('source').value         = lead.source;
  document.getElementById('status').value         = lead.status;
  document.getElementById('priority').value       = lead.priority;
  document.getElementById('estimatedValue').value = lead.estimatedValue || '';
  document.getElementById('notes').value          = lead.notes;

  clearErrors();
  modalOverlay.classList.add('open');
}

/** Close the modal and clear editing state. */
function closeModal() {
  modalOverlay.classList.remove('open');
  state.editingId = null;
}


/* =====================================================================
   9. FORM VALIDATION
   ===================================================================== */

/** Remove all error highlights before a fresh validation pass. */
function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => (el.textContent = ''));
  document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
}

/** Highlight a field red and show a message below it. */
function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(fieldId + 'Error');
  if (field) field.classList.add('error');
  if (error) error.textContent = message;
}

/** Check all required fields. Returns true only when everything is valid. */
function validateForm() {
  clearErrors();
  let valid = true;

  const fullName = document.getElementById('fullName').value.trim();
  const email    = document.getElementById('email').value.trim();
  const source   = document.getElementById('source').value;
  const status   = document.getElementById('status').value;
  const priority = document.getElementById('priority').value;

  if (!fullName) { showError('fullName', 'Full name is required.'); valid = false; }

  if (!email) {
    showError('email', 'Email address is required.');
    valid = false;
  } else if (!isValidEmail(email)) {
    showError('email', 'Please enter a valid email address.');
    valid = false;
  }

  if (!source)   { showError('source',   'Please select a source.');   valid = false; }
  if (!status)   { showError('status',   'Please select a status.');   valid = false; }
  if (!priority) { showError('priority', 'Please select a priority.'); valid = false; }

  return valid;
}

/** Simple email format check. */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


/* =====================================================================
   10. CRUD OPERATIONS
   ===================================================================== */

/** Collect all form field values into a plain data object. */
function getFormData() {
  return {
    fullName:       document.getElementById('fullName').value.trim(),
    company:        document.getElementById('company').value.trim(),
    email:          document.getElementById('email').value.trim(),
    phone:          document.getElementById('phone').value.trim(),
    source:         document.getElementById('source').value,
    status:         document.getElementById('status').value,
    priority:       document.getElementById('priority').value,
    estimatedValue: Number(document.getElementById('estimatedValue').value) || 0,
    notes:          document.getElementById('notes').value.trim()
  };
}

/** Append a new lead to storage with a generated ID and current timestamp. */
function addLead(data) {
  const leads = getLeads();
  leads.push({ id: generateId(), dateAdded: new Date().toISOString(), ...data });
  saveLeads(leads);
}

/**
 * Update an existing lead in storage.
 * The original dateAdded is intentionally preserved.
 */
function updateLead(id, data) {
  const leads = getLeads();
  const index = leads.findIndex(l => l.id === id);
  if (index === -1) return;
  leads[index] = { ...leads[index], ...data };
  saveLeads(leads);
}

/**
 * Delete a lead after confirming with the user.
 * Called from inline onclick in each table row.
 */
function deleteLead(id) {
  const leads = getLeads();
  const lead  = leads.find(l => l.id === id);
  if (!lead) return;

  const ok = window.confirm(`Delete lead for "${lead.fullName}"?\n\nThis cannot be undone.`);
  if (!ok) return;

  saveLeads(leads.filter(l => l.id !== id));
  renderLeads();
  showToast(`"${lead.fullName}" was removed.`, 'info');
}


/* =====================================================================
   11. FORM SUBMIT
   ===================================================================== */

document.getElementById('leadForm').addEventListener('submit', function (e) {
  e.preventDefault();
  if (!validateForm()) return;

  const data = getFormData();

  if (state.editingId) {
    updateLead(state.editingId, data);
    showToast('Lead updated successfully.', 'success');
  } else {
    addLead(data);
    showToast('New lead added!', 'success');
  }

  closeModal();
  renderLeads();
});


/* =====================================================================
   12. FILTER & SEARCH EVENT LISTENERS
   Each control updates the shared state object, then re-renders.
   ===================================================================== */

document.getElementById('searchInput').addEventListener('input', function () {
  state.search = this.value;
  renderLeads();
});

document.getElementById('filterStatus').addEventListener('change', function () {
  state.filterStatus = this.value;
  renderLeads();
});

document.getElementById('filterSource').addEventListener('change', function () {
  state.filterSource = this.value;
  renderLeads();
});

document.getElementById('filterPriority').addEventListener('change', function () {
  state.filterPriority = this.value;
  renderLeads();
});

document.getElementById('sortBy').addEventListener('change', function () {
  state.sortBy = this.value;
  renderLeads();
});


/* =====================================================================
   13. MODAL EVENT LISTENERS
   ===================================================================== */

document.getElementById('addLeadBtn').addEventListener('click', openAddModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('modalClose').addEventListener('click', closeModal);

// Close when clicking the dark backdrop (not the modal box itself)
modalOverlay.addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

// Close on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
});


/* =====================================================================
   14. EXPORT — CSV and JSON
   ===================================================================== */

/** Trigger a browser file download with arbitrary content. */
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Export all leads as a pretty-printed JSON file. */
function exportJSON() {
  const leads = getLeads();
  if (!leads.length) return showToast('No leads to export.', 'info');
  downloadFile('leads.json', JSON.stringify(leads, null, 2), 'application/json');
  showToast('Leads exported as JSON.', 'success');
}

/** Export all leads as a properly-quoted CSV file. */
function exportCSV() {
  const leads = getLeads();
  if (!leads.length) return showToast('No leads to export.', 'info');

  const headers = [
    'Full Name', 'Company', 'Email', 'Phone',
    'Source', 'Status', 'Priority',
    'Estimated Value', 'Notes', 'Date Added'
  ];

  // Wrap every cell in quotes, and escape any internal quotes with ""
  const cell = val => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = leads.map(l => [
    l.fullName,
    l.company,
    l.email,
    l.phone,
    l.source,
    l.status,
    l.priority,
    l.estimatedValue || 0,
    l.notes.replace(/\r?\n/g, ' '), // flatten newlines in notes
    formatDate(l.dateAdded)
  ].map(cell).join(','));

  downloadFile('leads.csv', [headers.join(','), ...rows].join('\r\n'), 'text/csv');
  showToast('Leads exported as CSV.', 'success');
}

document.getElementById('exportJsonBtn').addEventListener('click', exportJSON);
document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);


/* =====================================================================
   15. RESET ALL LEADS
   window.confirm acts as a deliberate two-step safeguard.
   ===================================================================== */

document.getElementById('resetAllBtn').addEventListener('click', function () {
  const leads = getLeads();
  if (!leads.length) return showToast('There are no leads to reset.', 'info');

  const ok = window.confirm(
    `⚠️ Delete ALL ${leads.length} lead(s)?\n\n` +
    `Every lead will be permanently removed. This cannot be undone.\n\n` +
    `Click OK to confirm.`
  );
  if (!ok) return;

  localStorage.removeItem(STORAGE_KEY);
  renderLeads();
  showToast('All leads have been removed.', 'info');
});


/* =====================================================================
   16. TOAST NOTIFICATION SYSTEM
   Lightweight, non-blocking messages that slide in and auto-dismiss.
   Types: 'success' | 'error' | 'info'
   ===================================================================== */

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Colored dot decorates the left side of the message
  toast.innerHTML = `<span class="toast-dot"></span>${escapeHtml(message)}`;
  container.appendChild(toast);

  // Trigger the CSS slide-in transition on the next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  // Slide out and remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}


/* =====================================================================
   17. APP INITIALIZATION
   ===================================================================== */

function init() {
  seedSampleData(); // write sample leads only on first-ever visit
  renderLeads();    // paint the dashboard, table, and filter bar
}

init();
