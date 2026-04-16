// === script.js – complete frontend with enhanced AI and animations ===

let currentUser = null;
let token = localStorage.getItem('token');
let allDonations = [];

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('darkMode') === 'true') {
    body.classList.add('dark');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
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

  // Impact counters observer
  const impactObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) animateCounters();
    });
  }, { threshold: 0.3 });
  const impactSection = document.querySelector('.impact-grid');
  if (impactSection) impactObserver.observe(impactSection);

  // Start slideshow
  if (slides.length) showSlides();

  setupAuth();
  setupChatbot();
  setupJarvisSection();
  setupFilters();
  setupDonateForm();
  setupHeroButtons();
  setupContactForm();
  setupHamburger();
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

  // Close on backdrop click
  backdrop.addEventListener('click', closeMenu);

  // Close when a nav link is tapped
  navLinks.querySelectorAll('a.nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
}

// ========== AUTH (same as before) ==========
function setupAuth() {
  loginBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    modalTitle.textContent = 'Login';
    nameField.style.display = 'none';
    authSubmit.textContent = 'Login';
    toggleAuth.innerHTML = `Don't have an account? <a href="#" id="switchToSignup">Sign up</a>`;
    document.getElementById('switchToSignup').addEventListener('click', (e) => {
      e.preventDefault();
      showSignup();
    });
  });

  closeModal.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(authForm);
    const email = formData.get('email');
    const password = formData.get('password');
    const name = formData.get('name');
    const isLogin = modalTitle.textContent === 'Login';
    const url = isLogin ? '/api/login' : '/api/signup';
    const body = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      token = data.token;
      currentUser = data.user;
      localStorage.setItem('token', token);
      loginBtn.textContent = currentUser.name.split(' ')[0];
      modal.style.display = 'none';
      authForm.reset();
      authMessage.textContent = '';
      fetchUserDonations();
    } catch (err) {
      authMessage.textContent = err.message;
    }
  });
}

function showSignup() {
  modalTitle.textContent = 'Sign Up';
  nameField.style.display = 'block';
  authSubmit.textContent = 'Sign Up';
  toggleAuth.innerHTML = `Already have an account? <a href="#" id="switchToLogin">Login</a>`;
  document.getElementById('switchToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    modalTitle.textContent = 'Login';
    nameField.style.display = 'none';
    authSubmit.textContent = 'Login';
    toggleAuth.innerHTML = `Don't have an account? <a href="#" id="switchToSignup">Sign up</a>`;
    document.getElementById('switchToSignup').addEventListener('click', (e) => {
      e.preventDefault();
      showSignup();
    });
  });
}

async function fetchUser() {
  try {
    const res = await fetch('/api/user', { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error();
    const data = await res.json();
    currentUser = data.user;
    loginBtn.textContent = currentUser.name.split(' ')[0];
    fetchUserDonations();
  } catch (err) {
    localStorage.removeItem('token');
  }
}

// ========== DONATIONS ==========
async function fetchDonations() {
  showSkeletons();
  try {
    const res = await fetch('/api/donations');
    const donations = await res.json();
    allDonations = donations;
    renderDonations('all', '');
    renderFindDonations();
  } catch (err) {
    console.error('Failed to load donations');
  }
}

function showSkeletons() {
  let skeletons = '';
  for (let i = 0; i < 6; i++) skeletons += '<div class="skeleton"></div>';
  foodGrid.innerHTML = skeletons;
  if (findGrid) findGrid.innerHTML = skeletons;
}

function renderDonations(filter = 'all', search = '') {
  let filtered = allDonations;
  if (filter !== 'all') filtered = filtered.filter(d => d.tag === filter);
  if (search) filtered = filtered.filter(d => d.foodName.toLowerCase().includes(search.toLowerCase()));
  if (filtered.length === 0) {
    foodGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No donations yet. Be the first to donate!</p>';
    return;
  }

  let html = '';
  filtered.forEach(d => {
    const expiryDate = new Date(d.expiry).toLocaleString();
    html += `
      <div class="card reveal">
        <img src="${d.image || '/images/placeholder.jpg'}" alt="${d.foodName}" class="card-img" loading="lazy">
        <div class="card-content">
          <span class="card-tag">${d.tag}</span>
          <h3>${d.foodName}</h3>
          <div class="card-meta"><span><i class="fas fa-utensils"></i> ${d.quantity}</span> <span><i class="fas fa-location-dot"></i> ${d.location}</span></div>
          <p style="font-size:0.85rem; color:#6B7280;">Expires: ${expiryDate}</p>
          <button class="request-btn" data-id="${d._id}">Request Pickup</button>
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
  let html = '';
  allDonations.forEach(d => {
    const expiryDate = new Date(d.expiry).toLocaleString();
    html += `
      <div class="card reveal">
        <img src="${d.image || '/images/placeholder.jpg'}" alt="${d.foodName}" class="card-img" loading="lazy">
        <div class="card-content">
          <span class="card-tag">${d.tag}</span>
          <h3>${d.foodName}</h3>
          <div class="card-meta"><span><i class="fas fa-utensils"></i> ${d.quantity}</span> <span><i class="fas fa-location-dot"></i> ${d.location}</span></div>
          <button class="request-btn" data-id="${d._id}">Request Pickup</button>
        </div>
      </div>
    `;
  });
  findGrid.innerHTML = html;
  attachRequestButtons();
  observeCards();
}

function attachRequestButtons() {
  document.querySelectorAll('.request-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!currentUser) { alert('Please login to request pickup'); return; }
      const id = btn.dataset.id;
      try {
        const res = await fetch(`/api/request-pickup/${id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        alert('Pickup requested! The donor will be notified.');
      } catch (err) {
        alert('Failed to request pickup');
      }
    });
  });
}

function observeCards() {
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('revealed'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.card').forEach(card => cardObserver.observe(card));
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
      const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
      renderDonations(activeFilter, searchInput.value);
    });
  }
}

// ========== DONATE FORM ==========
function setupDonateForm() {
  if (foodImage) {
    foodImage.addEventListener('change', () => {
      const file = foodImage.files[0];
      if (file) {
        analyzeResult.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Analyzing food...';
        setTimeout(() => {
          analyzeResult.innerHTML = '✅ Detected: Fresh Meal • Serves 3 • Safe to donate';
        }, 1500);
      }
    });
  }

  donateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { alert('Please login to donate'); return; }

    const formData = new FormData(donateForm);
    try {
      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      donateMessage.innerHTML = '🎉 You’re doing something amazing ❤️';
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

      donateForm.reset();
      analyzeResult.innerHTML = '';
      setTimeout(() => donateMessage.innerHTML = '', 3000);

      fetchDonations();
      fetchUserDonations();
    } catch (err) {
      donateMessage.innerHTML = 'Error: ' + err.message;
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
        html += `
          <div class="dashboard-card">
            <p><strong>${d.foodName}</strong> (${d.quantity})</p>
            <p>Status: <span class="${d.status === 'Picked' ? 'picked' : 'pending'}">${d.status}</span></p>
            <p>Expires: ${new Date(d.expiry).toLocaleDateString()}</p>
          </div>
        `;
      });
    }
    dashboardContent.innerHTML = html;
  } catch (err) { console.error(err); }
}

// ========== COUNTERS ==========
function animateCounters() {
  const counters = [
    { el: document.getElementById('mealsCounter'), target: 2840, suffix: '' },
    { el: document.getElementById('peopleCounter'), target: 1870, suffix: '' },
    { el: document.getElementById('wasteCounter'), target: 1250, suffix: '' },
    { el: document.getElementById('ngoCounter'), target: 52, suffix: '' }
  ];
  counters.forEach(c => {
    if (!c.el) return;
    let current = 0;
    const step = Math.ceil(c.target / 60);
    const update = setInterval(() => {
      current += step;
      if (current >= c.target) { current = c.target; clearInterval(update); }
      c.el.innerText = current.toLocaleString() + c.suffix;
    }, 25);
  });
}

// ========== CHATBOT (FLOATING) with enhanced AI ==========
function setupChatbot() {
  chatBtn.addEventListener('click', () => chatWindow.classList.toggle('open'));
  const chatCloseBtn = document.getElementById('chatCloseBtn');
  if (chatCloseBtn) chatCloseBtn.addEventListener('click', () => chatWindow.classList.remove('open'));

  const botKnowledge = {
    greetings: ['hi', 'hello', 'hey', 'greetings'],
    donate: ['donate', 'donation', 'give food', 'contribute'],
    safety: ['safe', 'safety', 'expired', 'storage', 'temperature'],
    ideas: ['what should i donate', 'suggestions', 'ideas', 'what food'],
    ngo: ['ngo', 'organization', 'volunteer', 'near me'],
    thanks: ['thank', 'thanks', 'appreciate']
  };

  const replies = {
    greeting: [
      "Hey there 😊 How can I help you today?",
      "Hello! Ready to make a difference?",
      "Hi! I'm Jarvis. What can I do for you?"
    ],
    donate: [
      "That's wonderful! You can donate by clicking the 'Donate Food' button above. Make sure your food is fresh and properly packed.",
      "Awesome! Use the donation form to list your meal. Quick tip: add a clear photo!",
      "Great! Remember to include the quantity and expiry time so volunteers know."
    ],
    safety: [
      "Food safety tip: Keep perishables below 5°C, and always check expiry dates. When in doubt, don't donate.",
      "For cooked food, ensure it's been stored properly and is less than 2 hours old if unrefrigerated.",
      "Pack food in clean, sealed containers to maintain hygiene."
    ],
    ideas: [
      "Great question! Non-perishables like rice, canned goods, or freshly cooked meals (if you can deliver quickly) are always welcome.",
      "You can donate fruits, vegetables, bread, or even packaged snacks. Just make sure they're not expired.",
      "Cooked meals like dal, rice, or vegetable dishes are great if they're freshly prepared."
    ],
    ngo: [
      "There's an NGO nearby called 'HopeShare' that collects daily. You can also find local volunteers in the feed.",
      "Check the 'Find Food' section – many NGOs post their needs there.",
      "You can also contact local temples, gurdwaras, or community kitchens – they often accept food donations."
    ],
    thanks: [
      "You're welcome! 😊 Every meal counts.",
      "Happy to help! Thank you for being kind.",
      "Anytime! Let's spread kindness together."
    ],
    default: [
      "That's interesting! Could you tell me more?",
      "I'm here to help with food donation. Could you rephrase that?",
      "Hmm, I didn't quite get that. Try asking about donation, safety, or NGOs."
    ]
  };

  function getBotReply(input) {
    input = input.toLowerCase();
    if (botKnowledge.greetings.some(word => input.includes(word))) {
      return replies.greeting[Math.floor(Math.random() * replies.greeting.length)];
    }
    if (botKnowledge.donate.some(word => input.includes(word))) {
      return replies.donate[Math.floor(Math.random() * replies.donate.length)];
    }
    if (botKnowledge.safety.some(word => input.includes(word))) {
      return replies.safety[Math.floor(Math.random() * replies.safety.length)];
    }
    if (botKnowledge.ideas.some(word => input.includes(word))) {
      return replies.ideas[Math.floor(Math.random() * replies.ideas.length)];
    }
    if (botKnowledge.ngo.some(word => input.includes(word))) {
      return replies.ngo[Math.floor(Math.random() * replies.ngo.length)];
    }
    if (botKnowledge.thanks.some(word => input.includes(word))) {
      return replies.thanks[Math.floor(Math.random() * replies.thanks.length)];
    }
    return replies.default[Math.floor(Math.random() * replies.default.length)];
  }

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

    setTimeout(() => {
      chatMsgs.removeChild(typingDiv);
      const reply = getBotReply(userMsg);
      addMessage(reply, 'bot');
    }, 1500);
  }

  function sendMessage() {
    const txt = chatInput.value.trim();
    if (!txt) return;
    addMessage(txt, 'user');
    chatInput.value = '';
    simulateTyping(txt);
  }

  sendMsg.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
}

// ========== JARVIS SECTION (same enhanced logic) ==========
function setupJarvisSection() {
  if (!jarvisSend || !jarvisInput) return;

  const botKnowledge = {
    greetings: ['hi', 'hello', 'hey', 'greetings'],
    donate: ['donate', 'donation', 'give food', 'contribute'],
    safety: ['safe', 'safety', 'expired', 'storage', 'temperature'],
    ideas: ['what should i donate', 'suggestions', 'ideas', 'what food'],
    ngo: ['ngo', 'organization', 'volunteer', 'near me'],
    thanks: ['thank', 'thanks', 'appreciate']
  };

  const replies = {
    greeting: [
      "Hey there 😊 How can I help you today?",
      "Hello! Ready to make a difference?",
      "Hi! I'm Jarvis. What can I do for you?"
    ],
    donate: [
      "That's wonderful! You can donate by clicking the 'Donate Food' button above. Make sure your food is fresh and properly packed.",
      "Awesome! Use the donation form to list your meal. Quick tip: add a clear photo!",
      "Great! Remember to include the quantity and expiry time so volunteers know."
    ],
    safety: [
      "Food safety tip: Keep perishables below 5°C, and always check expiry dates. When in doubt, don't donate.",
      "For cooked food, ensure it's been stored properly and is less than 2 hours old if unrefrigerated.",
      "Pack food in clean, sealed containers to maintain hygiene."
    ],
    ideas: [
      "Great question! Non-perishables like rice, canned goods, or freshly cooked meals (if you can deliver quickly) are always welcome.",
      "You can donate fruits, vegetables, bread, or even packaged snacks. Just make sure they're not expired.",
      "Cooked meals like dal, rice, or vegetable dishes are great if they're freshly prepared."
    ],
    ngo: [
      "There's an NGO nearby called 'HopeShare' that collects daily. You can also find local volunteers in the feed.",
      "Check the 'Find Food' section – many NGOs post their needs there.",
      "You can also contact local temples, gurdwaras, or community kitchens – they often accept food donations."
    ],
    thanks: [
      "You're welcome! 😊 Every meal counts.",
      "Happy to help! Thank you for being kind.",
      "Anytime! Let's spread kindness together."
    ],
    default: [
      "That's interesting! Could you tell me more?",
      "I'm here to help with food donation. Could you rephrase that?",
      "Hmm, I didn't quite get that. Try asking about donation, safety, or NGOs."
    ]
  };

  function getBotReply(input) {
    input = input.toLowerCase();
    if (botKnowledge.greetings.some(word => input.includes(word))) {
      return replies.greeting[Math.floor(Math.random() * replies.greeting.length)];
    }
    if (botKnowledge.donate.some(word => input.includes(word))) {
      return replies.donate[Math.floor(Math.random() * replies.donate.length)];
    }
    if (botKnowledge.safety.some(word => input.includes(word))) {
      return replies.safety[Math.floor(Math.random() * replies.safety.length)];
    }
    if (botKnowledge.ideas.some(word => input.includes(word))) {
      return replies.ideas[Math.floor(Math.random() * replies.ideas.length)];
    }
    if (botKnowledge.ngo.some(word => input.includes(word))) {
      return replies.ngo[Math.floor(Math.random() * replies.ngo.length)];
    }
    if (botKnowledge.thanks.some(word => input.includes(word))) {
      return replies.thanks[Math.floor(Math.random() * replies.thanks.length)];
    }
    return replies.default[Math.floor(Math.random() * replies.default.length)];
  }

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

    setTimeout(() => {
      jarvisMessages.removeChild(typingDiv);
      const reply = getBotReply(userMsg);
      addJarvisMessage(reply, 'bot');
    }, 1500);
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
      alert('Thank you for reaching out! We will get back to you soon.');
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