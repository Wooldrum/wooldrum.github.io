// assets/app.js (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, collection, addDoc,
  serverTimestamp, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/*** 1) CONFIG — fill these in ***/
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  // Firestore only needs these three for our use-case
};
const ALLOWED_EMAIL = "you@example.com";   // <- only this email can post

/*** 2) INIT ***/
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

/*** 3) UI refs ***/
const postsEl     = document.getElementById('posts');
const loginBtn    = document.getElementById('loginBtn');
const logoutBtn   = document.getElementById('logoutBtn');
const writeBtn    = document.getElementById('writeBtn');
const modal       = document.getElementById('postModal');
const postTitleEl = document.getElementById('postTitle');
const postBodyEl  = document.getElementById('postBody');
const cancelBtn   = document.getElementById('cancelPost');
const publishBtn  = document.getElementById('publishPost');

/*** 4) Helpers ***/
const fmtDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' });
};
const md2html = (md) => DOMPurify.sanitize(marked.parse(md || ''));

/*** 5) Auth state -> toggle controls ***/
onAuthStateChanged(auth, (user) => {
  const isOwner = !!user && user.email?.toLowerCase() === ALLOWED_EMAIL.toLowerCase();
  // buttons
  loginBtn.classList.toggle('hidden', !!user);
  logoutBtn.classList.toggle('hidden', !user);
  writeBtn.classList.toggle('hidden', !isOwner);
});

/*** 6) Login/Logout ***/
loginBtn?.addEventListener('click', async () => {
  try { await signInWithPopup(auth, provider); }
  catch (e) { alert('Login failed'); console.error(e); }
});
logoutBtn?.addEventListener('click', async () => {
  try { await signOut(auth); }
  catch (e) { console.error(e); }
});

/*** 7) Open/close modal ***/
writeBtn?.addEventListener('click', () => {
  postTitleEl.value = "";
  postBodyEl.value  = "";
  modal.classList.remove('hidden');
  modal.classList.add('flex');
});
cancelBtn?.addEventListener('click', () => {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
});

/*** 8) Publish post (server-dated, newest-first) ***/
publishBtn?.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user || user.email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
    alert("You're not allowed to post.");
    return;
  }
  const title = postTitleEl.value.trim();
  const body  = postBodyEl.value.trim();
  if (!title || !body) {
    alert('Title and body are required.');
    return;
  }
  try {
    await addDoc(collection(db, 'posts'), {
      title,
      body,
      authorEmail: user.email,
      createdAt: serverTimestamp()
    });
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  } catch (e) {
    alert('Publish failed.');
    console.error(e);
  }
});

/*** 9) Live posts feed (newest first) ***/
const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
onSnapshot(q, (snap) => {
  if (!postsEl) return;
  if (snap.empty) {
    postsEl.innerHTML = `<p class="text-dark-muted">No posts yet.</p>`;
    return;
  }
  postsEl.innerHTML = Array.from(snap.docs).map(doc => {
    const p = doc.data();
    return `
      <article class="border-t border-dark-line pt-6">
        <h3 class="text-2xl font-semibold text-dark-accent">${p.title ?? 'Untitled'}</h3>
        <p class="text-sm text-dark-muted mt-1">${fmtDate(p.createdAt)}</p>
        <div class="mt-3 text-dark-muted leading-relaxed max-w-prose">
          ${md2html(p.body ?? '')}
        </div>
      </article>
    `;
  }).join('');
});
