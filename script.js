/* =====================================================================
   LEAD TRACKER — script.js
   Vanilla JavaScript | No frameworks | localStorage data layer

   HOW THIS FILE IS ORGANIZED:
     1.  Data layer       — read / write localStorage
     2.  Sample data      — seed 3 leads on first visit
     3.  App state        — current filter / sort / edit mode
     4.  Dashboard        — compute and render summary cards
     5.  Filter & sort    — apply search + dropdowns to the leads array
     6.  Rendering        — build and inject the leads table HTML
     7.  Modal            — open / close / populate the form
     8.  Validation       — check required fields and email format
     9.  CRUD operations  — create, read, update, delete
    10.  Form submit       — wire the form to CRUD
    11.  Filter listeners  — search / dropdowns update state & re-render
    12.  Modal listeners   — open / close events
    13.  Export            — CSV and JSON file download
    14.  Reset all         — wipe storage with strong confirmation
    15.  Toast             — lightweight notification system
    16.  Init              — boot the app
   ===================================================================== */


/* =====================================================================
   1. DATA LAYER
   All persistence goes through these two functions.
   localStorage stores the leads array as a JSON string.
   ===================================================================== */

const STORAGE_KEY = 'leadtracker_v1';

/** Read all leads from localStorage. Always returns an array. */
function getLeads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return []; // handle corrupt data gracefully
  }
}

/** Write the full leads array back to localStorage. */
function saveLeads(leads) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

/** Create a unique ID using timestamp + random string. */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}


/* =====================================================================
   2. SAMPLE DATA
   Three realistic-looking leads are added on first load so the UI
   does not feel empty. They are only written once.
   ===================================================================== */

function buildSampleLeads() {
  const now = Date.now();
  const day = 86400000; // milliseconds in one day

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
      notes:          'Referred by Marcus. Needs a personal portfolio site. Small budget but flexible on timeline.',
      dateAdded:      new Date(now - 1 * day).toISOString()
    }
  ];
}

/** Seed sample leads only if storage is empty (first-ever visit). */
function seedSampleData() {
  if (getLeads().length === 0) {
    saveLeads(buildSampleLeads());
  }
}


/* =====================================================================
   3. APP STATE
   A single object that holds everything the UI cares about right now.
   We mutate this object when filters change, then re-render.
   ===================================================================== */

const state = {
  search:         '',   // text typed in search box
  filterStatus:   '',   // selected status dropdown value
  filterSource:   '',   // selected source dropdown value
  filterPriority: '',   // selected priority dropdown value
  sortBy:         'newest', // one of: newest | oldest | value-high | value-low
  editingId:      null  // null = adding new lead; string = editing existing lead
};


/* =====================================================================
   4. DASHBOARD — SUMMARY CARDS
   Counts leads by status and sums estimated value across ALL leads,
   regardless of any active filters.
   ===================================================================== */

function updateDashboard(leads) {
  const total    = leads.length;
  const newLeads = leads.filter(l => l.status === 'New').length;
  const proposal = leads.filter(l => l.status === 'Proposal Sent').length;
  const won      = leads.filter(l => l.status === 'Won').length;
  const lost     = leads.filter(l => l.status === 'Lost').length;
  const value    = leads.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);

  document.getElementById('statTotal').textContent    = total;
  document.getElementById('statNew').textContent      = newLeads;
  document.getElementById('statProposal').textContent = proposal;
  document.getElementById('statWon').textContent      = won;
  document.getElementById('statLost').textContent     = lost;
  document.getElementById('statValue').textContent    = formatCurrency(value);
}

/** Format a number as a compact USD string, e.g. 4500 → "$4,500". */
function formatCurrency(amount) {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}


/* =====================================================================
   5. FILTER & SORT
   Takes the full leads array, applies search + dropdown filters,
   then sorts, and returns the filtered+sorted result.
   ===================================================================== */

function getFilteredLeads() {
  let leads = getLeads();

  // Text search — case-insensitive match on name, company, or email
  if (state.search) {
    const q = state.search.toLowerCase();
    leads = leads.filter(l =>
      l.fullName.toLowerCase().includes(q) ||
      l.company.toLowerCase().includes(q)  ||
      l.email.toLowerCase().includes(q)
    );
  }

  // Exact-match dropdown filters
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


/* =====================================================================
   6. RENDERING — BUILD THE LEAD TABLE
   ===================================================================== */

/**
 * Maps a status string to its CSS badge class.
 * The class names match the .badge-* rules in style.css.
 */
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

/** Maps a priority string to its CSS badge class. */
function getPriorityClass(priority) {
  const map = { 'High': 'badge-high', 'Medium': 'badge-medium', 'Low': 'badge-low' };
  return map[priority] || '';
}

/** Format an ISO date string into a short display like "Apr 14, 2025". */
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric'
  });
}

/**
 * Escape HTML special characters before inserting user data into innerHTML.
 * This prevents XSS attacks if someone enters <script> in a field.
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/** Build one table row of HTML for a single lead object. */
function buildLeadRow(lead) {
  const name    = escapeHtml(lead.fullName);
  const company = escapeHtml(lead.company || '—');
  const email   = escapeHtml(lead.email);
  const phone   = escapeHtml(lead.phone || '—');
  const source  = escapeHtml(lead.source);
  const value   = lead.estimatedValue ? formatCurrency(lead.estimatedValue) : '—';
  const date    = formatDate(lead.dateAdded);

  return `
    <tr>
      <td data-label="Name">
        <div class="lead-name">${name}</div>
        <div class="lead-sub">${company}</div>
      </td>
      <td data-label="Email" class="col-phone">
        <div>${email}</div>
        <div class="lead-sub">${phone}</div>
      </td>
      <td data-label="Source">
        <span class="badge badge-source">${source}</span>
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
        <span class="date-text">${date}</span>
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

/** Main render function — called any time data or filters change. */
function renderLeads() {
  const allLeads    = getLeads();
  const filtered    = getFilteredLeads();
  const container   = document.getElementById('leadsContainer');
  const countBadge  = document.getElementById('leadCount');

  // Dashboard always reflects ALL leads, not just filtered ones
  updateDashboard(allLeads);

  // The count badge shows how many are visible after filtering
  countBadge.textContent = filtered.length;

  // ── Empty state ──────────────────────────────────────────────────
  if (filtered.length === 0) {
    const hasFilters = state.search || state.filterStatus || state.filterSource || state.filterPriority;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${hasFilters ? '🔍' : '📋'}</div>
        <div class="empty-title">${hasFilters ? 'No leads match your filters' : 'No leads yet'}</div>
        <div class="empty-subtitle">
          ${hasFilters
            ? 'Try a different search term or clear the filters above.'
            : 'Click "Add Lead" to start tracking your first potential client.'}
        </div>
        ${!hasFilters ? `<div class="empty-cta"><button class="btn btn-primary" onclick="openAddModal()">+ Add Lead</button></div>` : ''}
      </div>
    `;
    return;
  }

  // ── Build the table ───────────────────────────────────────────────
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
   7. MODAL — OPEN / CLOSE / POPULATE
   The same modal is reused for both adding and editing.
   We change the title and submit button text, and pre-fill fields for edit.
   ===================================================================== */

const modalOverlay = document.getElementById('modalOverlay');

/** Open the modal in "Add" mode — blank form. */
function openAddModal() {
  state.editingId           = null;
  document.getElementById('modalTitle').textContent  = 'Add New Lead';
  document.getElementById('submitBtn').textContent   = 'Add Lead';
  document.getElementById('leadForm').reset();
  clearErrors();
  modalOverlay.classList.add('open');
  // Focus first field for keyboard accessibility
  setTimeout(() => document.getElementById('fullName').focus(), 50);
}

/** Open the modal in "Edit" mode — form pre-filled with lead data. */
function openEditModal(id) {
  const lead = getLeads().find(l => l.id === id);
  if (!lead) return;

  state.editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit Lead';
  document.getElementById('submitBtn').textContent  = 'Save Changes';

  // Populate every field with the existing lead's values
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

/** Hide the modal and reset editing state. */
function closeModal() {
  modalOverlay.classList.remove('open');
  state.editingId = null;
}


/* =====================================================================
   8. FORM VALIDATION
   ===================================================================== */

/** Remove all field error states. Called before each validation pass. */
function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => (el.textContent = ''));
  document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
}

/** Highlight a field as invalid and show a message below it. */
function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(fieldId + 'Error');
  if (field) field.classList.add('error');
  if (error) error.textContent = message;
}

/** Validate all required fields. Returns true if everything is OK. */
function validateForm() {
  clearErrors();
  let valid = true;

  const fullName = document.getElementById('fullName').value.trim();
  const email    = document.getElementById('email').value.trim();
  const source   = document.getElementById('source').value;
  const status   = document.getElementById('status').value;
  const priority = document.getElementById('priority').value;

  if (!fullName) {
    showError('fullName', 'Full name is required.');
    valid = false;
  }

  if (!email) {
    showError('email', 'Email address is required.');
    valid = false;
  } else if (!isValidEmail(email)) {
    showError('email', 'Please enter a valid email address.');
    valid = false;
  }

  if (!source) {
    showError('source', 'Please select a source.');
    valid = false;
  }

  if (!status) {
    showError('status', 'Please select a status.');
    valid = false;
  }

  if (!priority) {
    showError('priority', 'Please select a priority.');
    valid = false;
  }

  return valid;
}

/** Basic email format check using a regex. */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


/* =====================================================================
   9. CRUD OPERATIONS
   ===================================================================== */

/** Read all current form field values into a plain object. */
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

/** Append a new lead to storage. */
function addLead(data) {
  const leads = getLeads();
  leads.push({
    id:        generateId(),
    dateAdded: new Date().toISOString(),
    ...data
  });
  saveLeads(leads);
}

/**
 * Update an existing lead in storage.
 * We keep the original dateAdded timestamp intact.
 */
function updateLead(id, data) {
  const leads = getLeads();
  const index = leads.findIndex(l => l.id === id);
  if (index === -1) return;
  leads[index] = { ...leads[index], ...data };
  saveLeads(leads);
}

/**
 * Delete a lead by ID after asking the user to confirm.
 * Called directly from the "Delete" button in each table row via onclick.
 */
function deleteLead(id) {
  const lead = getLeads().find(l => l.id === id);
  if (!lead) return;

  const confirmed = window.confirm(
    `Delete lead for "${lead.fullName}"?\n\nThis cannot be undone.`
  );
  if (!confirmed) return;

  saveLeads(getLeads().filter(l => l.id !== id));
  renderLeads();
  showToast(`"${lead.fullName}" was deleted.`, 'info');
}


/* =====================================================================
   10. FORM SUBMIT
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
   11. FILTER & SEARCH EVENT LISTENERS
   Each control updates state and triggers a re-render.
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
   12. MODAL EVENT LISTENERS
   ===================================================================== */

document.getElementById('addLeadBtn').addEventListener('click', openAddModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('modalClose').addEventListener('click', closeModal);

// Close when clicking the dark backdrop (but not the modal box itself)
modalOverlay.addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

// Close with Escape key (only if we're not focused inside a text field)
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && modalOverlay.classList.contains('open')) {
    closeModal();
  }
});


/* =====================================================================
   13. EXPORT FUNCTIONS
   ===================================================================== */

/** Trigger a file download with arbitrary content. */
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Export all leads as a prettified JSON file. */
function exportJSON() {
  const leads = getLeads();
  if (!leads.length) return showToast('No leads to export.', 'info');
  downloadFile('leads.json', JSON.stringify(leads, null, 2), 'application/json');
  showToast('Leads exported as JSON.', 'success');
}

/** Export all leads as a CSV file, safely quoting every field. */
function exportCSV() {
  const leads = getLeads();
  if (!leads.length) return showToast('No leads to export.', 'info');

  const headers = [
    'Full Name', 'Company', 'Email', 'Phone',
    'Source', 'Status', 'Priority',
    'Estimated Value', 'Notes', 'Date Added'
  ];

  // Wrap each cell in double-quotes, escaping any internal double-quotes
  const csvCell = val => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = leads.map(l => [
    l.fullName,
    l.company,
    l.email,
    l.phone,
    l.source,
    l.status,
    l.priority,
    l.estimatedValue || 0,
    l.notes.replace(/\r?\n/g, ' '), // flatten newlines inside notes
    formatDate(l.dateAdded)
  ].map(csvCell).join(','));

  downloadFile('leads.csv', [headers.join(','), ...rows].join('\r\n'), 'text/csv');
  showToast('Leads exported as CSV.', 'success');
}

document.getElementById('exportJsonBtn').addEventListener('click', exportJSON);
document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);


/* =====================================================================
   14. RESET ALL LEADS
   Two-step confirmation — window.confirm gives a second chance.
   ===================================================================== */

document.getElementById('resetAllBtn').addEventListener('click', function () {
  const leads = getLeads();
  if (!leads.length) return showToast('There are no leads to reset.', 'info');

  const confirmed = window.confirm(
    `⚠️ Delete ALL ${leads.length} lead(s)?\n\n` +
    `This will permanently erase every lead in the tracker.\n` +
    `This action cannot be undone.\n\nClick OK to confirm.`
  );
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  renderLeads();
  showToast('All leads have been removed.', 'info');
});


/* =====================================================================
   15. TOAST NOTIFICATION SYSTEM
   A lightweight, non-blocking notification that auto-dismisses.
   Types: 'success' | 'error' | 'info'
   ===================================================================== */

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Trigger CSS transition on the next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}


/* =====================================================================
   16. APP INITIALIZATION
   Boot sequence: seed data if needed, then render everything.
   ===================================================================== */

function init() {
  seedSampleData(); // only runs once on first-ever visit
  renderLeads();    // build dashboard, filter bar, and lead table
}

init();
