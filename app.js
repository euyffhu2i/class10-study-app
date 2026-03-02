import { 
  auth, db, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, onSnapshot, serverTimestamp,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut
} from './firebase.js';

// --- Constants & State ---
const COMPULSORY_SUBJECTS = [
  'Bangla 1st Paper', 'Bangla 2nd Paper', 'English 1st Paper', 'English 2nd Paper',
  'Mathematics', 'Bangladesh & Global Studies', 'ICT', 'Religion'
];

const GROUP_SUBJECTS = {
  'Science': ['Physics', 'Chemistry', 'Biology', 'Higher Mathematics'],
  'Humanities': ['Geography & Environment', 'Civics', 'Economics', 'History of Bangladesh'],
  'Business Studies': ['Accounting', 'Finance & Banking', 'Business Entrepreneurship']
};

let currentUser = null;
let userProfile = null;
let currentNotes = [];
let currentMarks = [];
let currentTimetable = [];

// --- Auth Logic ---
const getEmailFromId = (id) => `${id.toLowerCase()}@study.com`;

const handleLogin = async (e) => {
  e.preventDefault();
  const id = document.getElementById('login-id').value;
  const password = document.getElementById('login-password').value;
  const email = getEmailFromId(id);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (userDoc.exists()) {
      const profile = userDoc.data();
      if (profile.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        showStudentDashboard();
      }
    }
  } catch (error) {
    alert("Login failed: " + error.message);
  }
};

const handleSignup = async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const id = document.getElementById('signup-id').value;
  const group = document.getElementById('signup-group').value;
  const religion = document.getElementById('signup-religion').value;
  const password = document.getElementById('signup-password').value;
  const email = getEmailFromId(id);

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const profile = {
      userId: user.uid,
      studentId: id,
      name,
      group,
      religion,
      role: 'student',
      lastActive: serverTimestamp()
    };

    await setDoc(doc(db, "users", user.uid), profile);
    showStudentDashboard();
  } catch (error) {
    alert("Signup failed: " + error.message);
  }
};

// --- Navigation ---
const showStudentDashboard = () => {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('signup-screen').style.display = 'none';
  document.getElementById('student-dashboard').style.display = 'block';
  loadStudentData();
};

const showAuthScreen = () => {
  document.getElementById('student-dashboard').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
};

// --- Student Data Logic ---
const loadStudentData = () => {
  if (!currentUser) return;

  // Update UI with profile
  document.getElementById('user-name-display').textContent = userProfile.name;
  document.getElementById('settings-user-name').textContent = userProfile.name;
  document.getElementById('settings-user-id').textContent = `ID: ${userProfile.studentId}`;
  const groupBadge = document.getElementById('settings-user-group');
  groupBadge.textContent = userProfile.group;
  groupBadge.className = `badge badge-${userProfile.group.toLowerCase().replace(' ', '-')}`;

  // Populate Subject Selects
  const subjects = [...COMPULSORY_SUBJECTS, ...(GROUP_SUBJECTS[userProfile.group] || [])];
  const selects = ['note-subject', 'mark-subject', 'tt-subject'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
    }
  });

  // Populate Filters
  const filterList = document.getElementById('subject-filter-list');
  if (filterList) {
    filterList.innerHTML = `
      <button class="badge badge-science active" onclick="filterNotes('All')">All</button>
      ${subjects.map(s => `<button class="badge" style="background: var(--card2); color: var(--text2); white-space: nowrap;" onclick="filterNotes('${s}')">${s}</button>`).join('')}
    `;
  }

  // Real-time Listeners
  onSnapshot(query(collection(db, "notes"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc")), (snapshot) => {
    currentNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderNotes();
  });

  onSnapshot(query(collection(db, "marks"), where("userId", "==", currentUser.uid)), (snapshot) => {
    currentMarks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderMarks();
  });

  onSnapshot(query(collection(db, "timetable"), where("userId", "==", currentUser.uid)), (snapshot) => {
    currentTimetable = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTimetable();
  });
};

const renderNotes = (filter = 'All') => {
  const list = document.getElementById('notes-list');
  const recentList = document.getElementById('recent-notes-list');
  if (!list) return;

  const filtered = filter === 'All' ? currentNotes : currentNotes.filter(n => n.subject === filter);
  
  const html = filtered.map(n => `
    <div class="card" onclick="editNote('${n.id}')">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
        <span class="badge" style="background: var(--card2); color: var(--a1);">${n.subject}</span>
        ${n.important ? '<span>⭐</span>' : ''}
      </div>
      <p style="font-size: 0.875rem; font-weight: 500;">${n.text}</p>
      <p style="font-size: 0.65rem; color: var(--text2); margin-top: 0.5rem;">${new Date(n.createdAt?.toDate()).toLocaleString()}</p>
    </div>
  `).join('');

  list.innerHTML = html || '<p style="text-align: center; padding: 2rem; opacity: 0.5;">No notes found.</p>';
  if (recentList) recentList.innerHTML = html.split('</div>').slice(0, 3).join('</div>');
};

const renderMarks = () => {
  const list = document.getElementById('marks-list');
  if (!list) return;

  const html = currentMarks.map(m => {
    const pct = Math.round((m.obtained / m.total) * 100);
    return `
      <div class="card">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
          <h3 style="font-size: 0.875rem;">${m.subject}</h3>
          <span style="font-weight: 800; color: var(--a1);">${m.obtained}/${m.total}</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${pct}%"></div>
        </div>
        <p style="font-size: 0.65rem; text-align: right; color: var(--text2);">${pct}%</p>
      </div>
    `;
  }).join('');

  list.innerHTML = html || '<p style="text-align: center; padding: 2rem; opacity: 0.5;">No marks added yet.</p>';

  // Update overall avg
  if (currentMarks.length > 0) {
    const totalObt = currentMarks.reduce((s, m) => s + m.obtained, 0);
    const totalPoss = currentMarks.reduce((s, m) => s + m.total, 0);
    const avg = Math.round((totalObt / totalPoss) * 100);
    document.getElementById('overall-avg').textContent = `${avg}%`;
    document.getElementById('overall-progress-bar').style.width = `${avg}%`;
  }
};

const renderTimetable = () => {
  const list = document.getElementById('timetable-list');
  if (!list) return;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const html = days.map(day => {
    const slots = currentTimetable.filter(s => s.day === day).sort((a,b) => a.time.localeCompare(b.time));
    if (slots.length === 0) return '';
    return `
      <div style="margin-bottom: 1.5rem;">
        <h3 style="font-size: 0.75rem; color: var(--text2); text-transform: uppercase; margin-bottom: 0.75rem;">${day}</h3>
        ${slots.map(s => `
          <div class="card" style="padding: 1rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 1rem;">
            <div style="font-weight: 800; color: var(--a1); font-size: 0.875rem;">${s.time}</div>
            <div style="font-weight: 600;">${s.subject}</div>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');

  list.innerHTML = html || '<p style="text-align: center; padding: 2rem; opacity: 0.5;">No schedule set.</p>';
};

// --- CRUD Actions ---
const saveNote = async (e) => {
  e.preventDefault();
  const id = document.getElementById('note-id').value;
  const subject = document.getElementById('note-subject').value;
  const text = document.getElementById('note-text').value;
  const important = document.getElementById('note-important').checked;

  const noteData = {
    userId: currentUser.uid,
    studentName: userProfile.name,
    group: userProfile.group,
    subject,
    text,
    important,
    createdAt: serverTimestamp()
  };

  try {
    if (id) {
      await updateDoc(doc(db, "notes", id), noteData);
    } else {
      await addDoc(collection(db, "notes"), noteData);
    }
    closeModal('note-modal');
    document.getElementById('note-form').reset();
  } catch (error) {
    alert("Error saving note: " + error.message);
  }
};

const saveMark = async (e) => {
  e.preventDefault();
  const subject = document.getElementById('mark-subject').value;
  const obtained = parseInt(document.getElementById('mark-obtained').value);
  const total = parseInt(document.getElementById('mark-total').value);

  try {
    await addDoc(collection(db, "marks"), {
      userId: currentUser.uid,
      subject,
      obtained,
      total,
      createdAt: serverTimestamp()
    });
    closeModal('mark-modal');
    document.getElementById('mark-form').reset();
  } catch (error) {
    alert("Error saving marks: " + error.message);
  }
};

const saveTimetable = async (e) => {
  e.preventDefault();
  const subject = document.getElementById('tt-subject').value;
  const day = document.getElementById('tt-day').value;
  const time = document.getElementById('tt-time').value;

  try {
    await addDoc(collection(db, "timetable"), {
      userId: currentUser.uid,
      subject,
      day,
      time,
      createdAt: serverTimestamp()
    });
    closeModal('timetable-modal');
    document.getElementById('timetable-form').reset();
  } catch (error) {
    alert("Error saving schedule: " + error.message);
  }
};

// --- Admin Logic ---
const loadAdminDashboard = async () => {
  if (window.location.pathname.includes('admin.html')) {
    // Stats
    const usersSnap = await getDocs(collection(db, "users"));
    const notesSnap = await getDocs(collection(db, "notes"));
    
    document.getElementById('stat-total-students').textContent = usersSnap.size - 1; // Exclude admin
    document.getElementById('stat-total-notes').textContent = notesSnap.size;
    
    let importantCount = 0;
    const groupStats = {};
    notesSnap.forEach(doc => {
      const n = doc.data();
      if (n.important) importantCount++;
      groupStats[n.group] = (groupStats[n.group] || 0) + 1;
    });
    
    document.getElementById('stat-important-notes').textContent = importantCount;
    
    const groupHtml = Object.entries(groupStats).map(([group, count]) => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <span class="badge badge-${group.toLowerCase().replace(' ', '-')}" style="font-size: 0.6rem;">${group}</span>
        <span style="font-weight: 800;">${count}</span>
      </div>
    `).join('');
    document.getElementById('admin-notes-by-group').innerHTML = groupHtml;

    // Students Table
    const table = document.getElementById('admin-students-table');
    if (table) {
      const students = [];
      usersSnap.forEach(doc => {
        const u = doc.data();
        if (u.role === 'student') students.push(u);
      });

      table.innerHTML = students.map(s => `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 1rem; font-weight: 600;">${s.name}</td>
          <td style="padding: 1rem;">${s.studentId}</td>
          <td style="padding: 1rem;"><span class="badge badge-${s.group.toLowerCase().replace(' ', '-')}">${s.group}</span></td>
          <td style="padding: 1rem;">${currentNotes.filter(n => n.userId === s.userId).length}</td>
          <td style="padding: 1rem; font-size: 0.75rem; color: var(--text2);">${s.lastActive ? new Date(s.lastActive.toDate()).toLocaleDateString() : 'Never'}</td>
          <td style="padding: 1rem;">
            <button class="btn" style="padding: 0.25rem; background: none;" onclick="resetStudentData('${s.userId}')"><i class="lucide-refresh-cw"></i></button>
          </td>
        </tr>
      `).join('');
    }
  }
};

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  // Auth Listeners
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const signupForm = document.getElementById('signup-form');
  if (signupForm) signupForm.addEventListener('submit', handleSignup);

  const showSignup = document.getElementById('show-signup');
  if (showSignup) showSignup.addEventListener('click', () => {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('signup-screen').style.display = 'flex';
  });

  const showLogin = document.getElementById('show-login');
  if (showLogin) showLogin.addEventListener('click', () => {
    document.getElementById('signup-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
  });

  // Dashboard Navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById(`screen-${screen}`).classList.add('active');
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Modal Triggers
  const addNoteBtn = document.getElementById('add-note-btn');
  if (addNoteBtn) addNoteBtn.addEventListener('click', () => {
    document.getElementById('note-id').value = '';
    document.getElementById('note-modal-title').textContent = 'New Note';
    document.getElementById('note-modal').classList.add('active');
  });

  const addMarkBtn = document.getElementById('add-mark-btn');
  if (addMarkBtn) addMarkBtn.addEventListener('click', () => document.getElementById('mark-modal').classList.add('active'));

  const addTTBtn = document.getElementById('add-timetable-btn');
  if (addTTBtn) addTTBtn.addEventListener('click', () => document.getElementById('timetable-modal').classList.add('active'));

  // Form Submissions
  const noteForm = document.getElementById('note-form');
  if (noteForm) noteForm.addEventListener('submit', saveNote);

  const markForm = document.getElementById('mark-form');
  if (markForm) markForm.addEventListener('submit', saveMark);

  const ttForm = document.getElementById('timetable-form');
  if (ttForm) ttForm.addEventListener('submit', saveTimetable);

  // Settings
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

  const adminLogout = document.getElementById('admin-logout');
  if (adminLogout) adminLogout.addEventListener('click', () => signOut(auth).then(() => window.location.href = 'index.html'));

  // Theme Management
  const applyTheme = (isDark) => {
    document.body.classList.toggle('dark', isDark);
    localStorage.setItem('snm-dark', isDark);
    
    // Update icons for both possible buttons
    const studentBtn = document.getElementById('toggle-theme');
    const adminBtn = document.getElementById('admin-toggle-theme');
    
    if (studentBtn) {
      studentBtn.innerHTML = isDark ? '<i class="lucide-sun"></i>' : '<i class="lucide-moon"></i>';
    }
    if (adminBtn) {
      adminBtn.innerHTML = isDark ? `<i class="lucide-${isDark ? 'sun' : 'moon'}"></i> Appearance` : `<i class="lucide-moon"></i> Appearance`;
    }
  };

  const initialIsDark = localStorage.getItem('snm-dark') === 'true';
  applyTheme(initialIsDark);

  const studentThemeBtn = document.getElementById('toggle-theme');
  if (studentThemeBtn) {
    studentThemeBtn.addEventListener('click', () => {
      const isDark = !document.body.classList.contains('dark');
      applyTheme(isDark);
    });
  }

  const adminThemeBtn = document.getElementById('admin-toggle-theme');
  if (adminThemeBtn) {
    adminThemeBtn.addEventListener('click', () => {
      const isDark = !document.body.classList.contains('dark');
      applyTheme(isDark);
    });
  }
});

// Auth State Listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      userProfile = userDoc.data();
      if (userProfile.role === 'admin') {
        if (!window.location.pathname.includes('admin.html')) {
          window.location.href = 'admin.html';
        } else {
          loadAdminDashboard();
        }
      } else {
        showStudentDashboard();
      }
    }
  } else {
    currentUser = null;
    userProfile = null;
    if (window.location.pathname.includes('admin.html')) {
      window.location.href = 'index.html';
    } else {
      showAuthScreen();
    }
  }
});

// Global functions for inline onclicks
window.closeModal = (id) => document.getElementById(id).classList.remove('active');
window.filterNotes = (subj) => renderNotes(subj);
window.editNote = (id) => {
  const note = currentNotes.find(n => n.id === id);
  if (note) {
    document.getElementById('note-id').value = note.id;
    document.getElementById('note-subject').value = note.subject;
    document.getElementById('note-text').value = note.text;
    document.getElementById('note-important').checked = note.important;
    document.getElementById('note-modal-title').textContent = 'Edit Note';
    document.getElementById('note-modal').classList.add('active');
  }
};
