import { supabase } from './supabaseClient.js';

// --- DOM Elements ---
const viewLanding = document.getElementById('view-landing');
const viewMain = document.getElementById('view-main');
const navLogo = document.getElementById('nav-logo');
const btnGetStarted = document.getElementById('btn-get-started');
const grid = document.getElementById('questions-grid');
const loadingSpinner = document.getElementById('loading-spinner');
const noResults = document.getElementById('no-results');
const btnLoadMore = document.getElementById('btn-load-more');

const btnLoginModal = document.getElementById('btn-login-modal');
const btnUploadModal = document.getElementById('btn-upload-modal');
const btnLogout = document.getElementById('btn-logout');

const loginModal = document.getElementById('login-modal');
const uploadModal = document.getElementById('upload-modal');
const editModal = document.getElementById('edit-modal');
const detailModal = document.getElementById('detail-modal');
const closeBtns = document.querySelectorAll('.close-modal');

const loginForm = document.getElementById('login-form');
const uploadForm = document.getElementById('upload-form');
const editForm = document.getElementById('edit-form');

const searchInput = document.getElementById('search-input');
const yearFilter = document.getElementById('year-filter');
const monthFilter = document.getElementById('month-filter');
const syllabusFilter = document.getElementById('syllabus-filter');
const difficultyFilter = document.getElementById('difficulty-filter');
const bookmarkFilter = document.getElementById('bookmark-filter');

const detailTitle = document.getElementById('detail-title');
const detailTags = document.getElementById('detail-tags');
const detailQuestionImg = document.getElementById('detail-question-img');
const solutionContainer = document.getElementById('solution-container');
const detailSolutionImg = document.getElementById('detail-solution-img');
const btnRevealSolution = document.getElementById('btn-reveal-solution');
const btnCopyLink = document.getElementById('btn-copy-link');

const uploadError = document.getElementById('upload-error');
const uploadSuccess = document.getElementById('upload-success');
const btnSubmitUpload = document.getElementById('btn-submit-upload');

const editError = document.getElementById('edit-error');
const editSuccess = document.getElementById('edit-success');
const btnSubmitEdit = document.getElementById('btn-submit-edit');

// --- State ---
let isTeacherMode = false;
let currentOffset = 0;
const LIMIT = 12;
let bookmarks = JSON.parse(localStorage.getItem('mzizimamath_bookmarks') || '[]');

// Deep Linking Check
const urlParams = new URLSearchParams(window.location.search);
const questionIdFromUrl = urlParams.get('id');

// --- Initialization ---
async function init() {
  setupEventListeners();

  if (questionIdFromUrl) {
    goToMainApp();
    await fetchSingleQuestion(questionIdFromUrl);
  }

  await fetchQuestions(true); // reset and fetch
}

// --- Navigation ---
function goToMainApp() {
  viewLanding.classList.add('d-none');
  viewMain.classList.remove('d-none');
  // Scroll to hero
  document.getElementById('hero-section').scrollIntoView({ behavior: 'smooth' });
}

function goToLanding() {
  viewMain.classList.add('d-none');
  viewLanding.classList.remove('d-none');
}

// --- Data Fetching (Server-Side Filter & Pagination) ---
async function fetchQuestions(reset = false) {
  if (reset) {
    currentOffset = 0;
    grid.innerHTML = '';
    noResults.classList.add('d-none');
    btnLoadMore.classList.add('d-none');
  }

  loadingSpinner.classList.remove('d-none');

  let query = supabase.from('questions').select('*', { count: 'exact' });

  // Apply User Filters Server-Side
  const search = searchInput.value.trim();
  if (search) query = query.ilike('topic', `%${search}%`);
  if (yearFilter.value) query = query.eq('year', parseInt(yearFilter.value));
  if (monthFilter.value) query = query.eq('month', monthFilter.value);
  if (syllabusFilter.value) query = query.eq('syllabus', syllabusFilter.value);
  if (difficultyFilter.value) query = query.eq('difficulty', difficultyFilter.value);

  // Apply Bookmark Filter 
  if (bookmarkFilter.checked) {
    if (bookmarks.length === 0) {
      // Shortcut: if no bookmarks, nothing to load.
      loadingSpinner.classList.add('d-none');
      if (reset) noResults.classList.remove('d-none');
      return;
    }
    query = query.in('id', bookmarks);
  }

  // Pagination bounds
  query = query.order('created_at', { ascending: false }).range(currentOffset, currentOffset + LIMIT - 1);

  const { data, count, error } = await query;
  loadingSpinner.classList.add('d-none');

  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  renderQuestions(data, reset);

  // Pagination Logic
  currentOffset += LIMIT;
  if (currentOffset < count) {
    btnLoadMore.classList.remove('d-none');
  } else {
    btnLoadMore.classList.add('d-none');
  }
}

async function fetchSingleQuestion(id) {
  const { data, error } = await supabase.from('questions').select('*').eq('id', id).single();
  if (!error && data) {
    const qUrl = supabase.storage.from('math_assets').getPublicUrl(data.question_url).data.publicUrl;
    const sUrl = supabase.storage.from('math_assets').getPublicUrl(data.solution_url).data.publicUrl;
    openDetailModal(data, qUrl, sUrl);
  }
}

// --- Render Cards ---
function renderQuestions(data, isReset) {
  if (isReset && data.length === 0) {
    noResults.classList.remove('d-none');
    return;
  }

  data.forEach(q => {
    const card = document.createElement('div');
    card.className = 'card';
    
    const { data: qImgData } = supabase.storage.from('math_assets').getPublicUrl(q.question_url);
    const { data: sImgData } = supabase.storage.from('math_assets').getPublicUrl(q.solution_url);

    let tagsHtml = `<span class="tag tag-syllabus">${q.syllabus}</span><span class="tag tag-year">${q.year}</span>`;
    if (q.month) tagsHtml += `<span class="tag tag-month">${q.month}</span>`;
    if (q.difficulty) tagsHtml += `<span class="tag tag-difficulty-${q.difficulty}">${q.difficulty}</span>`;

    let editHtml = '';
    if (isTeacherMode) {
       editHtml = `
       <div class="teacher-edit-overlay">
         <button class="btn btn-outline btn-small" data-action="edit">Edit</button>
         <button class="btn btn-danger btn-small" data-action="delete">Del</button>
       </div>`;
    }

    const isMarked = bookmarks.includes(q.id);
    const starSym = isMarked ? '★' : '☆';
    const starClass = isMarked ? 'card-bookmark bookmarked' : 'card-bookmark';

    card.innerHTML = `
      <div class="${starClass}" data-action="bookmark">${starSym}</div>
      ${editHtml}
      <div class="card-img-container" data-action="view">
        <img src="${qImgData.publicUrl}" alt="Question" loading="lazy" />
      </div>
      <div class="card-content" data-action="view">
        <div class="card-tags">${tagsHtml}</div>
        <h3 class="card-title">${q.topic}</h3>
      </div>
    `;

    card.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('[data-action="edit"]');
      const delBtn = e.target.closest('[data-action="delete"]');
      const starBtn = e.target.closest('[data-action="bookmark"]');
      
      if (editBtn) {
        e.stopPropagation(); openEditModal(q); return;
      }
      if (delBtn) {
        e.stopPropagation();
        if (confirm('Delete this question permanently?')) {
          const { error } = await supabase.from('questions').delete().eq('id', q.id);
          if (!error) fetchQuestions(true);
        }
        return;
      }
      if (starBtn) {
        e.stopPropagation();
        toggleBookmark(q.id, starBtn);
        return;
      }
      
      openDetailModal(q, qImgData.publicUrl, sImgData.publicUrl);
    });

    grid.appendChild(card);
  });
}

function toggleBookmark(id, element) {
  if (bookmarks.includes(id)) {
    bookmarks = bookmarks.filter(b => b !== id);
    element.textContent = '☆';
    element.classList.remove('bookmarked');
  } else {
    bookmarks.push(id);
    element.textContent = '★';
    element.classList.add('bookmarked');
  }
  localStorage.setItem('mzizimamath_bookmarks', JSON.stringify(bookmarks));
  
  // If we are currently sorting by bookmarks, remove the card if unstarred
  if (bookmarkFilter.checked) {
    fetchQuestions(true);
  }
}

// --- Detail View Logic ---
function openDetailModal(q, qUrl, sUrl) {
    let tagsHtml = `<span class="tag tag-syllabus">${q.syllabus}</span><span class="tag tag-year">${q.year}</span>`;
    if (q.month) tagsHtml += `<span class="tag tag-month">${q.month}</span>`;
    if (q.difficulty) tagsHtml += `<span class="tag tag-difficulty-${q.difficulty}">${q.difficulty}</span>`;
    
    detailTitle.textContent = q.topic;
    detailTags.innerHTML = tagsHtml;
    detailQuestionImg.src = qUrl;
    detailSolutionImg.src = sUrl;
    detailQuestionImg.classList.remove('zoomed');
    detailSolutionImg.classList.remove('zoomed');
    
    // Copy link metadata
    btnCopyLink.dataset.link = window.location.origin + window.location.pathname + '?id=' + q.id;
    btnCopyLink.innerHTML = "🔗 Copy Link";
    
    solutionContainer.classList.add('d-none');
    btnRevealSolution.classList.remove('d-none');

    openModal(detailModal);
}

// --- Edit Logic ---
function openEditModal(q) {
    document.getElementById('edit-id').value = q.id;
    document.getElementById('edit-syllabus').value = q.syllabus;
    document.getElementById('edit-topic').value = q.topic;
    document.getElementById('edit-year').value = q.year;
    document.getElementById('edit-month').value = q.month || '';
    document.getElementById('edit-difficulty').value = q.difficulty || '';
    
    editError.classList.add('d-none'); editSuccess.classList.add('d-none');
    openModal(editModal);
}

// --- Modals ---
function openModal(modal) { modal.classList.remove('d-none'); }
function closeModal(modal) { modal.classList.add('d-none'); }

// --- Event Listeners ---
function setupEventListeners() {
  navLogo.addEventListener('click', goToLanding);
  btnGetStarted.addEventListener('click', goToMainApp);

  btnLoginModal.addEventListener('click', () => openModal(loginModal));
  btnUploadModal.addEventListener('click', () => openModal(uploadModal));
  
  btnLoadMore.addEventListener('click', () => fetchQuestions(false));

  btnRevealSolution.addEventListener('click', () => {
    solutionContainer.classList.remove('d-none');
    btnRevealSolution.classList.add('d-none');
  });

  btnCopyLink.addEventListener('click', () => {
    navigator.clipboard.writeText(btnCopyLink.dataset.link);
    btnCopyLink.innerHTML = "✅ Copied!";
    setTimeout(() => { btnCopyLink.innerHTML = "🔗 Copy Link"; }, 2000);
  });

  // Image Zooms
  document.querySelectorAll('.zoomable-image').forEach(img => {
    img.addEventListener('click', () => {
      img.classList.toggle('zoomed');
    });
  });

  btnLogout.addEventListener('click', () => {
    isTeacherMode = false;
    btnLoginModal.classList.remove('d-none');
    btnUploadModal.classList.add('d-none');
    btnLogout.classList.add('d-none');
    fetchQuestions(true); // reset
  });

  closeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      closeModal(document.getElementById(e.target.getAttribute('data-target')));
    });
  });

  // Form Filter Toggles re-fetch from start
  const refetch = () => fetchQuestions(true);
  ['input', 'change'].forEach(evt => searchInput.addEventListener(evt, () => {
     // debounce search slightly
     if(window.searchTimeout) clearTimeout(window.searchTimeout);
     window.searchTimeout = setTimeout(refetch, 400);
  }));
  yearFilter.addEventListener('change', refetch);
  monthFilter.addEventListener('change', refetch);
  syllabusFilter.addEventListener('change', refetch);
  difficultyFilter.addEventListener('change', refetch);
  bookmarkFilter.addEventListener('change', refetch);

  // Forms
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (document.getElementById('teacher-password').value.trim() === 'euler2718') {
      isTeacherMode = true; document.getElementById('login-error').classList.add('d-none');
      closeModal(loginModal); loginForm.reset();
      btnLoginModal.classList.add('d-none'); btnUploadModal.classList.remove('d-none'); btnLogout.classList.remove('d-none');
      fetchQuestions(true);
    } else {
      document.getElementById('login-error').classList.remove('d-none');
    }
  });

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    uploadError.classList.add('d-none'); uploadSuccess.classList.add('d-none');
    btnSubmitUpload.disabled = true; btnSubmitUpload.textContent = 'Uploading...';

    const syllabus = document.getElementById('upload-syllabus').value;
    const topic = document.getElementById('upload-topic').value;
    const year = parseInt(document.getElementById('upload-year').value);
    const month = document.getElementById('upload-month').value || null;
    const difficulty = document.getElementById('upload-difficulty').value || null;
    const qFile = document.getElementById('upload-question-file').files[0];
    const sFile = document.getElementById('upload-solution-file').files[0];

    try {
      const { data: qData, error: qErr } = await supabase.storage.from('math_assets').upload(`questions/${Date.now()}_${qFile.name}`, qFile);
      if (qErr) throw qErr;
      const { data: sData, error: sErr } = await supabase.storage.from('math_assets').upload(`solutions/${Date.now()}_${sFile.name}`, sFile);
      if (sErr) throw sErr;

      const { error: dbError } = await supabase.from('questions').insert([{
          syllabus, topic, year, month, difficulty,
          question_url: qData.path, solution_url: sData.path
      }]);
      if (dbError) throw dbError;

      uploadSuccess.classList.remove('d-none'); uploadForm.reset();
      await fetchQuestions(true);
      setTimeout(() => { closeModal(uploadModal); uploadSuccess.classList.add('d-none'); }, 1500);
    } catch (err) {
      uploadError.textContent = err.message || 'Error occurred'; uploadError.classList.remove('d-none');
    } finally {
      btnSubmitUpload.disabled = false; btnSubmitUpload.textContent = 'Upload & Save';
    }
  });

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    editError.classList.add('d-none'); editSuccess.classList.add('d-none');
    btnSubmitEdit.disabled = true; btnSubmitEdit.textContent = 'Saving...';

    const id = document.getElementById('edit-id').value;
    const payload = {
      syllabus: document.getElementById('edit-syllabus').value,
      topic: document.getElementById('edit-topic').value,
      year: parseInt(document.getElementById('edit-year').value),
      month: document.getElementById('edit-month').value || null,
      difficulty: document.getElementById('edit-difficulty').value || null
    };

    try {
      const { error: dbError } = await supabase.from('questions').update(payload).eq('id', id);
      if (dbError) throw dbError;

      editSuccess.classList.remove('d-none');
      await fetchQuestions(true);
      setTimeout(() => { closeModal(editModal); editSuccess.classList.add('d-none'); }, 1500);
    } catch (err) {
      editError.textContent = err.message || 'Error occurred'; editError.classList.remove('d-none');
    } finally {
      btnSubmitEdit.disabled = false; btnSubmitEdit.textContent = 'Save Changes';
    }
  });
}

init();
