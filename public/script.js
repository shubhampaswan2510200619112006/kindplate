// === script.js – complete frontend with all bug fixes ===

let currentUser = null;
let token = localStorage.getItem('token');
let allDonations = [];

// ========== UTILITIES ==========
function sanitizeHTML(str) {
  if (!str) return '';
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

function showToast(message, type = 'success') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle'}"></i> <span>${sanitizeHTML(message)}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========== JARVIS REAL AI CORE ==========
async function getSharedBotReply(input) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });
    if (!res.ok) return "Sorry, my neural network is currently offline. Please try again later.";
    const data = await res.json();
    return data.reply;
  } catch(e) {
    console.error("Jarvis API error:", e);
    return "Error communicating with my core logic servers.";
  }
}

// DOM elements
const body = document.body;
const navbar = document.getElementById('navbar');
const themeToggle = document.getElementById('themeToggle');
const loginBtn = document.getElementById('loginBtn');
const modal = document.getElementById('authModal');
const modalTitle = document.getElementById('modalTitle');
const authForm = document.getElementById('authForm');
const nameField = document.getElementById('nameField');
const authSubmit = document.getElementById('authSubmit');
const toggleAuth = document.getElementById('toggleAuth');
const closeModal = document.querySelector('.close');
const authMessage = document.getElementById('authMessage');
const donateForm = document.getElementById('donateForm');
const donateMessage = document.getElementById('donateMessage');
const foodGrid = document.getElementById('foodGrid');
const findGrid = document.getElementById('findGrid');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('searchInput');
const chatBtn = document.getElementById('chatBtn');
const chatWindow = document.getElementById('chatWindow');
const chatMsgs = document.getElementById('chatMsgs');
const chatInput = document.getElementById('chatInput');
const sendMsg = document.getElementById('sendMsg');
const jarvisInput = document.getElementById('jarvisInput');
const jarvisSend = document.getElementById('jarvisSend');
const jarvisMessages = document.getElementById('jarvisMessages');
const heroDonate = document.getElementById('heroDonate');
const heroFind = document.getElementById('heroFind');
const foodImage = document.getElementById('foodImage');
const analyzeResult = document.getElementById('analyzeResult');
const dashboardContent = document.getElementById('dashboardContent');

// User dropdown elements
const userMenuWrap = document.getElementById('userMenuWrap');
const userBtn = document.getElementById('userBtn');
const userBtnName = document.getElementById('userBtnName');
const userDropdown = document.getElementById('userDropdown');
const logoutBtn = document.getElementById('logoutBtn');

// Slideshow
let slideIndex = 0;
const slides = document.querySelectorAll('.slide');

function showSlides() {
  slides.forEach((s, i) => {
    s.classList.remove('active');
    if (i === slideIndex) s.classList.add('active');
  });
  slideIndex = (slideIndex + 1) % slides.length;
  setTimeout(showSlides, 4000);
}

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('darkMode') === 'true') {
    body.classList.add('dark');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }

  // Set minimum datetime on expiry input to now (prevent past dates)
  const expiryInput = document.getElementById('expiryInput');
  if (expiryInput) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    expiryInput.min = now.toISOString().slice(0, 16);
  }

  if (token) fetchUser();
  fetchDonations();

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  });

  // Intersection Observer for reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('revealed');
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  if (slides.length) showSlides();

  setupAuth();
  setupUserDropdown();
  setupChatbot();
  setupJarvisSection();
  setupFilters();
  setupDonateForm();
  setupHeroButtons();
  setupContactForm();
  setupHamburger();
  setupFooterPlaceholders();
  setupSupportModals();
  setupMaps();
});

// ========== HAMBURGER MENU ==========
function setupHamburger() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  const backdrop = document.getElementById('navBackdrop');
  if (!hamburger || !navLinks || !backdrop) return;

  function openMenu() {
    hamburger.classList.add('open');
    navLinks.classList.add('open');
    backdrop.classList.add('open');
    body.classList.add('nav-open');
    hamburger.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
    backdrop.classList.remove('open');
    body.classList.remove('nav-open');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  hamburger.addEventListener('click', () => {
    hamburger.classList.contains('open') ? closeMenu() : openMenu();
  });
  backdrop.addEventListener('click', closeMenu);
  navLinks.querySelectorAll('a.nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
}

// ========== FOOTER PLACEHOLDERS (prevent scroll-to-top) ==========
function setupFooterPlaceholders() {
  document.querySelectorAll('.footer-placeholder').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('🚧 Coming soon! This feature is under development.', 'info');
    });
  });
}

// ========== USER DROPDOWN ==========
function setupUserDropdown() {
  if (!userBtn || !userDropdown) return;

  userBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('open');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!userMenuWrap?.contains(e.target)) {
      userDropdown?.classList.remove('open');
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      token = null;
      currentUser = null;
      localStorage.removeItem('token');
      // Show login btn, hide user menu
      if (loginBtn) loginBtn.style.display = '';
      if (userMenuWrap) userMenuWrap.style.display = 'none';
      if (dashboardContent) dashboardContent.innerHTML = '';
      if (userDropdown) userDropdown.classList.remove('open');
      showToast('Logged out successfully', 'success');
      fetchDonations();
    });
  }
}

// ========== SHOW LOGGED IN STATE ==========
function showLoggedInState(name) {
  if (loginBtn) loginBtn.style.display = 'none';
  if (userMenuWrap) userMenuWrap.style.display = 'flex';
  if (userBtnName) userBtnName.textContent = name.split(' ')[0];
}

// ========== AUTH ==========
function setupAuth() {
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
      modalTitle.textContent = 'Login';
      nameField.style.display = 'none';
      const roleField = document.getElementById('roleField');
      if (roleField) roleField.style.display = 'none';
      authSubmit.textContent = 'Login';
      toggleAuth.innerHTML = `Don't have an account? <a href="#" id="switchToSignup">Sign up</a>`;
      document.getElementById('switchToSignup').addEventListener('click', (e) => {
        e.preventDefault();
        showSignup();
      });
    });
  }

  const roleField = document.getElementById('roleField');

  function showSignup() {
    modalTitle.textContent = 'Create Account';
    nameField.style.display = 'block';
    if (roleField) roleField.style.display = 'block';
    authSubmit.textContent = 'Sign Up';
    toggleAuth.innerHTML = `Already have an account? <a href="#" id="switchToLogin">Login</a>`;
    document.getElementById('switchToLogin').addEventListener('click', (e) => {
      e.preventDefault();
      loginBtn.click();
    });
  }

  closeModal.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(authForm);
    const isLogin = modalTitle.textContent === 'Login';
    const email = formData.get('email');
    const password = formData.get('password');
    const name = formData.get('name');
    const role = formData.get('role');

    const endpoint = isLogin ? '/api/login' : '/api/signup';
    const bodyData = isLogin ? { email, password } : { name, email, password, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      token = data.token;
      currentUser = data.user;
      localStorage.setItem('token', token);
      showLoggedInState(currentUser.name);
      modal.style.display = 'none';
      authForm.reset();
      authMessage.textContent = '';
      showToast(`Welcome back, ${currentUser.name.split(' ')[0]}! 🎉`, 'success');
      fetchUserDonations();
    } catch (err) {
      authMessage.textContent = err.message;
    }
  });
}

async function fetchUser() {
  try {
    const res = await fetch('/api/user', { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error();
    const data = await res.json();
    currentUser = data.user;
    showLoggedInState(currentUser.name);
    fetchUserDonations();
  } catch (err) {
    localStorage.removeItem('token');
    token = null;
  }
}

// ========== PLACEHOLDER IMAGE ==========
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';

// ========== PLACEHOLDER IMAGE ==========
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';

function imgTag(src, alt) {
  const safeSrc = sanitizeHTML(src) || PLACEHOLDER_IMG;
  return `<img
    src="${safeSrc}"
    alt="${sanitizeHTML(alt)}"
    class="card-img"
    loading="lazy"
    onerror="this.onerror=null; this.src='${PLACEHOLDER_IMG}';"
  >`;
}

// ========== DONATIONS ==========
async function fetchDonations() {
  showSkeletons();
  try {
    const res = await fetch('/api/donations');
    const donations = await res.json();
    allDonations = donations;
    const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    renderDonations(activeFilter, searchInput?.value || '');
    renderFindDonations();
  } catch (err) {
    console.error('Failed to load donations');
  }
}

function showSkeletons() {
  let skeletons = '';
  for (let i = 0; i < 6; i++) skeletons += '<div class="skeleton"></div>';
  if (foodGrid) foodGrid.innerHTML = skeletons;
  if (findGrid) findGrid.innerHTML = skeletons;
}

function renderDonations(filter = 'all', search = '') {
  if (!foodGrid) return;
  let filtered = allDonations;

  if (filter === 'Fresh') {
    filtered = filtered.filter(d => d.tag === 'Fresh');
  } else if (filter === 'Urgent') {
    filtered = filtered.filter(d => d.tag === 'Urgent');
  } else if (filter === 'Expired') {
    filtered = filtered.filter(d => d.tag === 'Expired');
  }

  if (search) {
    filtered = filtered.filter(d => d.foodName.toLowerCase().includes(search.toLowerCase()));
  }

  if (filtered.length === 0) {
    const emptyMsg = {
      Fresh: 'No fresh meals available right now.',
      Urgent: 'No urgent items at the moment.',
      Expired: 'No expired food — everything is fresh! ✅',
      all: 'No donations yet. Be the first to donate!'
    };
    foodGrid.innerHTML = `<p class="empty-state" style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:2rem;">${emptyMsg[filter] || emptyMsg.all}</p>`;
    return;
  }

  let html = '';
  filtered.forEach(d => {
    const expiryDate = new Date(d.expiry).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const isExpired = d.tag === 'Expired';
    html += `
      <div class="card reveal ${isExpired ? 'expired-card' : ''}">
        ${imgTag(d.image, d.foodName)}
        <div class="card-content">
          <span class="card-tag tag-${d.tag.toLowerCase()}">${sanitizeHTML(d.tag)}</span>
          <h3>${sanitizeHTML(d.foodName)}</h3>
          <div class="card-meta">
            <span><i class="fas fa-utensils"></i> ${sanitizeHTML(d.quantity)}</span>
            <span><i class="fas fa-location-dot"></i> ${sanitizeHTML(d.location)}</span>
          </div>
          <p style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">
            <i class="fas fa-clock"></i> ${isExpired ? '<span style="color:#ef4444">Expired:</span>' : 'Expires:'} ${expiryDate}
          </p>
          ${isExpired
            ? `<button class="request-btn" disabled style="opacity:0.45; cursor:not-allowed;"><i class="fas fa-ban"></i> Expired</button>`
            : `<button class="request-btn" data-id="${d._id}"><i class="fas fa-hand-holding-heart"></i> Request Pickup</button>`
          }
        </div>
      </div>
    `;
  });
  foodGrid.innerHTML = html;
  attachRequestButtons();
  observeCards();
}

function renderFindDonations() {
  if (!findGrid) return;
  const active = allDonations.filter(d => d.tag !== 'Expired');
  if (active.length === 0) {
    findGrid.innerHTML = '<p class="empty-state" style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:2rem;">No active food donations at the moment.</p>';
    return;
  }
  let html = '';
  active.forEach(d => {
    const statusClass = d.status === 'Picked' ? 'tag-expired' : (d.tag === 'Urgent' ? 'tag-urgent' : 'tag-fresh');
    let pickedByHtml = '';
    if (d.status === 'Picked' && d.pickedBy) {
      pickedByHtml = `
        <div class="picked-by-info">
          <strong><i class="fas fa-hand-holding-heart"></i> Accepted by ${d.pickedBy.name} (${d.pickedBy.role})</strong>
          <p><i class="fas fa-envelope"></i> ${d.pickedBy.email}</p>
          ${d.pickupLocation ? `
            <a class="view-map-link" onclick="viewLocationOnMap(${d.pickupLocation.lat}, ${d.pickupLocation.lng}, '${d.pickupLocation.address}')">
              <i class="fas fa-location-dot"></i> View Pickup Point
            </a>
          ` : ''}
        </div>
      `;
    }
    html += `
      <div class="card reveal">
        <div class="card-img-wrap">${imgTag(d.image, d.foodName)}</div>
        <div class="card-content">
          <span class="card-tag ${statusClass}">${d.status === 'Picked' ? 'Claimed' : d.tag}</span>
          <h3>${sanitizeHTML(d.foodName)}</h3>
          <div class="card-meta">
            <span><i class="fas fa-utensils"></i> ${sanitizeHTML(d.quantity)}</span>
            <span><i class="fas fa-location-dot"></i> ${sanitizeHTML(d.location)}</span>
          </div>
          ${pickedByHtml}
          ${d.status === 'Pending' ? `<button class="request-btn" data-id="${d._id}"><i class="fas fa-hand-holding-heart"></i> Request Pickup</button>` : ''}
        </div>
      </div>
    `;
  });
  findGrid.innerHTML = html;
  attachRequestButtons();
  observeCards();
}

function attachRequestButtons() {
  document.querySelectorAll('.request-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      openMapForPickup(id);
    });
  });
}

function observeCards() {
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('revealed'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.card').forEach(card => cardObserver.observe(card));
}

// ========== MAP LOGIC (Leaflet) ==========
let map;
let marker;
let currentDonationIdForMap;

function setupMaps() {
  const closeMap = document.getElementById('closeMap');
  const mapModal = document.getElementById('mapModal');
  const confirmBtn = document.getElementById('confirmLocationBtn');
  
  if (closeMap) closeMap.onclick = () => mapModal.style.display = 'none';
  
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const address = document.getElementById('mapAddress').value;
      if (!marker) {
        showToast('Please click on the map to select a location', 'error');
        return;
      }
      const pos = marker.getLatLng();
      submitPickupRequest(currentDonationIdForMap, pos.lat, pos.lng, address);
    };
  }
}

function openMapForPickup(donationId) {
  if (!token) {
    showToast('Please login to request a pickup', 'error');
    loginBtn.click();
    return;
  }
  
  currentDonationIdForMap = donationId;
  const mapModal = document.getElementById('mapModal');
  const addressGroup = document.getElementById('addressGroup');
  const confirmBtn = document.getElementById('confirmLocationBtn');
  
  mapModal.style.display = 'flex';
  addressGroup.style.display = 'block';
  confirmBtn.style.display = 'block';
  
  setTimeout(() => {
    if (!map) {
      map = L.map('leafletMap').setView([19.0760, 72.8777], 11); // Mumbai default
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      
      map.on('click', (e) => {
        if (marker) map.removeLayer(marker);
        marker = L.marker(e.latlng).addTo(map);
      });
    } else {
      map.invalidateSize();
      if (marker) map.removeLayer(marker);
    }
  }, 300);
}

function viewLocationOnMap(lat, lng, address) {
  const mapModal = document.getElementById('mapModal');
  const addressGroup = document.getElementById('addressGroup');
  const confirmBtn = document.getElementById('confirmLocationBtn');
  
  mapModal.style.display = 'flex';
  addressGroup.style.display = 'none';
  confirmBtn.style.display = 'none';
  
  setTimeout(() => {
    if (!map) {
      map = L.map('leafletMap').setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    } else {
      map.setView([lat, lng], 14);
      map.invalidateSize();
    }
    
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(map)
      .bindPopup(`<div class="map-marker-popup"><b>Pickup Point</b><br>${address || 'No address provided'}</div>`)
      .openPopup();
  }, 300);
}

async function submitPickupRequest(id, lat, lng, address) {
  try {
    const res = await fetch(`/api/request-pickup/${id}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ lat, lng, address })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to request pickup');
    
    showToast('Success! Direct connection established with donor.', 'success');
    document.getElementById('mapModal').style.display = 'none';
    fetchDonations();
    fetchUserDonations();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ========== FILTERS ==========
function setupFilters() {
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDonations(btn.dataset.filter, searchInput?.value || '');
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
      renderDonations(activeFilter, searchInput.value);
    });
  }
}

// ========== DONATE FORM ==========
function setupDonateForm() {
  const imgPreview = document.getElementById('imgPreview');
  const imgPreviewWrap = document.getElementById('imgPreviewWrap');

  if (foodImage) {
    foodImage.addEventListener('change', () => {
      const file = foodImage.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (imgPreview && imgPreviewWrap) {
            imgPreview.src = e.target.result;
            imgPreviewWrap.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
        analyzeResult.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Processing...';
        setTimeout(() => analyzeResult.innerHTML = '✅ Ready to donate', 1000);
      }
    });
  }

  donateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showToast('Please login to donate', 'error'); return; }

    const formData = new FormData(donateForm);
    try {
      const submitBtn = donateForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';

      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('🎉 Donation posted successfully!', 'success');
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      donateForm.reset();
      if (imgPreviewWrap) imgPreviewWrap.style.display = 'none';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Donation';
      fetchDonations();
      fetchUserDonations();
    } catch (err) {
      showToast(err.message, 'error');
      const submitBtn = donateForm.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Donation';
    }
  });
}

// ========== USER DASHBOARD ==========
async function fetchUserDonations() {
  if (!currentUser || !dashboardContent) return;
  try {
    const res = await fetch('/api/my-donations', { headers: { 'Authorization': `Bearer ${token}` } });
    const donations = await res.json();
    let html = '<h3>Your donations</h3>';
    if (donations.length === 0) html += '<p>No donations yet. Start donating!</p>';
    else {
      donations.forEach(d => {
        const expDate = new Date(d.expiry);
        const isExpired = expDate < new Date();
        
        let pickedByHtml = '';
        if (d.status === 'Picked' && d.pickedBy) {
          pickedByHtml = `
            <div class="picked-by-info" style="background: var(--surface2); padding: 0.8rem; margin-top: 0.5rem; border-radius: 4px;">
              <strong><i class="fas fa-hand-holding-heart"></i> Taken by ${d.pickedBy.name} (${d.pickedBy.role})</strong>
              <p style="font-size: 0.8rem; opacity: 0.8;"><i class="fas fa-envelope"></i> ${d.pickedBy.email}</p>
              ${d.pickupLocation ? `
                <a class="view-map-link" style="font-size: 0.8rem;" onclick="viewLocationOnMap(${d.pickupLocation.lat}, ${d.pickupLocation.lng}, '${d.pickupLocation.address}')">
                  <i class="fas fa-location-dot"></i> See their location on map
                </a>
              ` : ''}
            </div>
          `;
        }

        html += `
          <div class="dashboard-card" style="margin-bottom: 1rem; padding: 1rem; border: 1px solid var(--border); border-radius: 0;">
            <p><strong>${sanitizeHTML(d.foodName)}</strong> (${sanitizeHTML(d.quantity)})</p>
            <p>Status: <span class="${d.status === 'Picked' ? 'picked' : 'pending'}" style="color: ${d.status === 'Picked' ? 'var(--green)' : 'var(--accent)'}">${d.status}</span>
              ${isExpired && d.status !== 'Picked' ? ' <span style="color:#ef4444; font-size:0.8rem;">(Expired)</span>' : ''}
            </p>
            <p style="font-size: 0.85rem; opacity: 0.7;">Posted: ${new Date(d.createdAt).toLocaleDateString()}</p>
            ${pickedByHtml}
          </div>
        `;
      });
    }
    dashboardContent.innerHTML = html;
  } catch (err) { console.error(err); }
}

// ========== SUPPORT MODALS CONTENT ==========
function setupSupportModals() {
  const supportModal = document.getElementById('supportModal');
  const closeSupport = document.getElementById('closeSupport');
  const supportTitle = document.getElementById('supportTitle');
  const supportContent = document.getElementById('supportContent');
  
  if (closeSupport) closeSupport.onclick = () => supportModal.style.display = 'none';
  
  const contentMap = {
    'FAQ': {
      title: 'Frequently Asked Questions',
      body: `
        <h3>How do I donate food?</h3>
        <p>Simply create an account, click the "Donate" button, fill in the food details, and upload a photo. Your donation will appear on the live feed for NGOs to see.</p>
        <h3>Who can pick up the food?</h3>
        <p>Verified NGO partners and registered volunteers can request a pickup. They will share their location and contact you directly.</p>
        <h3>Is the food checked for quality?</h3>
        <p>Donors are responsible for ensuring the food is fresh. We track expiry dates and highlight "Urgent" items that need immediate pickup.</p>
      `
    },
    'Volunteer': {
      title: 'Join as a Volunteer',
      body: `
        <h3>How can I help?</h3>
        <p>Volunteers help by picking up food from donors and delivering it to nearby shelters or NGOs. You can sign up as a "Volunteer" to get started.</p>
        <h3>What are the requirements?</h3>
        <ul>
          <li>A valid ID for verification</li>
          <li>Access to a vehicle (bike, car, or even public transport)</li>
          <li>A few hours of commitment per week</li>
        </ul>
      `
    },
    'NGO Partners': {
      title: 'Our NGO Network',
      body: `
        <h3>Partnering with KindPlate</h3>
        <p>We work with over 50+ local NGOs to ensure that no meal goes to waste. Our partners include homeless shelters, community kitchens, and orphanages.</p>
        <h3>Register your NGO</h3>
        <p>If you represent an NGO, sign up with the "NGO" role to gain access to bulk donation requests and priority alerts.</p>
      `
    },
    'Privacy Policy': {
      title: 'Privacy Policy',
      body: `
        <p>We take your privacy seriously. KindPlate only shares your contact information with the specific NGO or Volunteer who has been assigned to your pickup.</p>
        <p>Your location is only used to coordinate the food handover and is not sold to any third parties.</p>
      `
    },
    'Terms of Use': {
      title: 'Terms of Use',
      body: `
        <p>By using KindPlate, you agree to provide accurate information about food quality and quantity. Donors are responsible for the safety of the food provided.</p>
        <p>KindPlate is a platform for connection and is not liable for any issues arising during the physical handover of food.</p>
      `
    }
  };
  
  document.querySelectorAll('.footer-links a, .footer-placeholder').forEach(link => {
    const text = link.textContent.trim();
    if (contentMap[text]) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        supportTitle.textContent = contentMap[text].title;
        supportContent.innerHTML = contentMap[text].body;
        supportModal.style.display = 'flex';
      });
    }
  });
}

// ========== CHATBOT (FLOATING) ==========
function setupChatbot() {
  if (!chatBtn) return;
  chatBtn.addEventListener('click', () => {
    chatWindow.classList.toggle('open');
    if (chatWindow.classList.contains('open')) {
      setTimeout(() => {
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
        chatInput.focus();
      }, 100);
    }
  });

  const chatCloseBtn = document.getElementById('chatCloseBtn');
  if (chatCloseBtn) chatCloseBtn.addEventListener('click', () => chatWindow.classList.remove('open'));

  function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('msg', sender === 'user' ? 'user-msg' : 'bot-msg');
    msgDiv.innerText = text;
    chatMsgs.appendChild(msgDiv);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  function simulateTyping(userMsg) {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('msg', 'bot-msg', 'typing');
    typingDiv.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    chatMsgs.appendChild(typingDiv);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;

    getSharedBotReply(userMsg).then(reply => {
      chatMsgs.removeChild(typingDiv);
      addMessage(reply, 'bot');
    });
  }

  function sendMessage() {
    const txt = chatInput.value.trim();
    if (!txt) return;
    addMessage(txt, 'user');
    chatInput.value = '';
    chatInput.focus();
    simulateTyping(txt);
  }

  sendMsg.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  chatInput.addEventListener('focus', () => {
    setTimeout(() => { chatMsgs.scrollTop = chatMsgs.scrollHeight; }, 150);
  });
}

// ========== JARVIS SECTION ==========
function setupJarvisSection() {
  if (!jarvisSend || !jarvisInput) return;

  function addJarvisMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('msg', sender === 'user' ? 'user-msg' : 'bot-msg');
    msgDiv.innerText = text;
    jarvisMessages.appendChild(msgDiv);
    jarvisMessages.scrollTop = jarvisMessages.scrollHeight;
  }

  function simulateJarvisTyping(userMsg) {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('msg', 'bot-msg', 'typing');
    typingDiv.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    jarvisMessages.appendChild(typingDiv);
    jarvisMessages.scrollTop = jarvisMessages.scrollHeight;

    getSharedBotReply(userMsg).then(reply => {
      jarvisMessages.removeChild(typingDiv);
      addJarvisMessage(reply, 'bot');
    });
  }

  jarvisSend.addEventListener('click', () => {
    const txt = jarvisInput.value.trim();
    if (!txt) return;
    addJarvisMessage(txt, 'user');
    jarvisInput.value = '';
    simulateJarvisTyping(txt);
  });

  jarvisInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); jarvisSend.click(); }
  });

  jarvisInput.addEventListener('focus', () => {
    setTimeout(() => { jarvisMessages.scrollTop = jarvisMessages.scrollHeight; }, 150);
  });
}

// ========== HERO BUTTONS ==========
function setupHeroButtons() {
  if (heroDonate) heroDonate.addEventListener('click', () => document.getElementById('donate').scrollIntoView({ behavior: 'smooth' }));
  if (heroFind) heroFind.addEventListener('click', () => document.getElementById('feed').scrollIntoView({ behavior: 'smooth' }));
  const heroDonate2 = document.getElementById('heroDonate2');
  if (heroDonate2) heroDonate2.addEventListener('click', () => document.getElementById('donate').scrollIntoView({ behavior: 'smooth' }));
}

// ========== CONTACT FORM ==========
function setupContactForm() {
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Thank you for reaching out! We will get back to you soon.', 'success');
      contactForm.reset();
    });
  }
}

// ========== DARK MODE ==========
themeToggle.addEventListener('click', () => {
  body.classList.toggle('dark');
  const isDark = body.classList.contains('dark');
  localStorage.setItem('darkMode', isDark);
  themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});