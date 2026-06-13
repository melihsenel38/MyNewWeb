const notes = document.querySelectorAll(".note");
const memoryGrid = document.querySelector("#memory-grid");
const noteBoard = document.querySelector("#note-board");
const dialog = document.querySelector("#card-dialog");
const form = document.querySelector("#card-form");
const noteDialog = document.querySelector("#note-dialog");
const noteForm = document.querySelector("#note-form");
const openButtons = document.querySelectorAll("[data-open-card-form]");
const closeButtons = document.querySelectorAll("[data-close-card-form]");
const openNoteButtons = document.querySelectorAll("[data-open-note-form]");
const closeNoteButtons = document.querySelectorAll("[data-close-note-form]");

let db;
let addDoc;
let collection;
let onSnapshot;
let orderBy;
let query;
let serverTimestamp;
let firebaseReadyPromise;

notes.forEach((note) => {
  bindNoteToggle(note);
});

openButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      return;
    }

    dialog.setAttribute("open", "");
  });
});

closeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    form.reset();
    dialog.close();
  });
});

openNoteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (typeof noteDialog.showModal === "function") {
      noteDialog.showModal();
      return;
    }

    noteDialog.setAttribute("open", "");
  });
});

closeNoteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    noteForm.reset();
    noteDialog.close();
  });
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    form.reset();
    dialog.close();
  }
});

noteDialog.addEventListener("click", (event) => {
  if (event.target === noteDialog) {
    noteForm.reset();
    noteDialog.close();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isFirebaseConfigured()) {
    alert("Firebase ayarlari henuz girilmedi. Once firebase-config.js dosyasini doldurmalisin.");
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const imageUrl = String(formData.get("imageUrl") || "").trim();

  submitButton.disabled = true;
  submitButton.textContent = "Kaydediliyor...";
  setFormStatus("Firebase baglantisi kontrol ediliyor...");

  try {
    await withTimeout(firebaseReadyPromise, 15000, "Firebase baglantisi zaman asimina ugradi.");

    if (!db || !addDoc || !collection) {
      throw new Error("Firebase henuz hazir degil.");
    }

    setFormStatus("Kart kaydediliyor...");
    await withTimeout(
      addDoc(collection(db, "memoryCards"), {
        title: String(formData.get("title")).trim(),
        tag: String(formData.get("tag")).trim(),
        text: String(formData.get("text")).trim(),
        imageUrl,
        createdAt: serverTimestamp(),
      }),
      20000,
      "Kart kaydetme zaman asimina ugradi.",
    );

    form.reset();
    dialog.close();
    setFormStatus("");
  } catch (error) {
    console.error(error);
    setFormStatus(firebaseErrorMessage(error));
    alert(firebaseErrorMessage(error));
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Kaydet";
  }
});

noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!isFirebaseConfigured()) {
    alert("Firebase ayarlari henuz girilmedi. Once firebase-config.js dosyasini doldurmalisin.");
    return;
  }

  const submitButton = noteForm.querySelector('button[type="submit"]');
  const formData = new FormData(noteForm);

  submitButton.disabled = true;
  submitButton.textContent = "Kaydediliyor...";
  setNoteFormStatus("Firebase baglantisi kontrol ediliyor...");

  try {
    await withTimeout(firebaseReadyPromise, 15000, "Firebase baglantisi zaman asimina ugradi.");

    if (!db || !addDoc || !collection) {
      throw new Error("Firebase henuz hazir degil.");
    }

    setNoteFormStatus("Not kaydediliyor...");
    await withTimeout(
      addDoc(collection(db, "loveNotes"), {
        title: String(formData.get("title")).trim(),
        text: String(formData.get("text")).trim(),
        createdAt: serverTimestamp(),
      }),
      20000,
      "Not kaydetme zaman asimina ugradi.",
    );

    noteForm.reset();
    noteDialog.close();
    setNoteFormStatus("");
  } catch (error) {
    console.error(error);
    setNoteFormStatus(firebaseErrorMessage(error));
    alert(firebaseErrorMessage(error));
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Kaydet";
  }
});

firebaseReadyPromise = setupFirebaseCards();

async function setupFirebaseCards() {
  if (!isFirebaseConfigured()) {
    return;
  }

  try {
    const [{ initializeApp }, firestore] = await withTimeout(
      Promise.all([
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"),
      ]),
      15000,
      "Firebase SDK yuklenemedi.",
    );

    const app = initializeApp(window.firebaseMemoryConfig);
    db = firestore.getFirestore(app);
    addDoc = firestore.addDoc;
    collection = firestore.collection;
    onSnapshot = firestore.onSnapshot;
    orderBy = firestore.orderBy;
    query = firestore.query;
    serverTimestamp = firestore.serverTimestamp;

    const cardsQuery = query(collection(db, "memoryCards"), orderBy("createdAt", "desc"));
    const notesQuery = query(collection(db, "loveNotes"), orderBy("createdAt", "desc"));

    onSnapshot(
      cardsQuery,
      (snapshot) => {
        document.querySelectorAll("[data-firebase-card]").forEach((card) => card.remove());

        snapshot.forEach((doc) => {
          renderMemoryCard(doc.data());
        });
      },
      (error) => {
        console.error(error);
      },
    );

    onSnapshot(
      notesQuery,
      (snapshot) => {
        document.querySelectorAll("[data-firebase-note]").forEach((note) => note.remove());

        let index = 1;
        snapshot.forEach((doc) => {
          renderLoveNote(doc.data(), index);
          index += 1;
        });
      },
      (error) => {
        console.error(error);
      },
    );
  } catch (error) {
    console.error(error);
  }
}

function renderLoveNote(note, index) {
  const button = document.createElement("button");
  button.className = "note";
  button.type = "button";
  button.dataset.firebaseNote = "true";
  button.innerHTML = `
    <span>${String(index).padStart(2, "0")}</span>
    <strong>${escapeHtml(note.title || "Yeni not")}</strong>
    <em>${escapeHtml(note.text || "")}</em>
  `;

  bindNoteToggle(button);
  noteBoard.append(button);
}

function bindNoteToggle(note) {
  note.addEventListener("click", () => {
    document.querySelectorAll(".note").forEach((item) => item.classList.remove("is-open"));
    note.classList.add("is-open");
  });
}

function renderMemoryCard(card) {
  const article = document.createElement("article");
  article.className = "memory-card memory-card--custom";
  article.dataset.firebaseCard = "true";

  const imageMarkup = card.imageUrl
    ? `<figure class="photo-slot"><img src="${escapeAttribute(card.imageUrl)}" alt="${escapeAttribute(card.title)}" /></figure>`
    : `<figure class="photo-slot photo-slot--empty"><span>Yeni ani</span></figure>`;

  article.innerHTML = `
    ${imageMarkup}
    <span>${escapeHtml(card.tag || "Yeni ani")}</span>
    <h3>${escapeHtml(card.title || "Basliksiz ani")}</h3>
    <p>${escapeHtml(card.text || "")}</p>
  `;

  memoryGrid.append(article);
}

function isFirebaseConfigured() {
  const config = window.firebaseMemoryConfig;

  if (!config) {
    return false;
  }

  return Object.values(config).every((value) => {
    const text = String(value || "");
    return text && !text.startsWith("BURAYA_");
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function setFormStatus(message) {
  const status = document.querySelector("#form-status");

  if (status) {
    status.textContent = message;
  }
}

function setNoteFormStatus(message) {
  const status = document.querySelector("#note-form-status");

  if (status) {
    status.textContent = message;
  }
}

function withTimeout(promise, milliseconds, message) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), milliseconds);
  });

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

function firebaseErrorMessage(error) {
  const code = error?.code || "";
  const message = error?.message || "";

  if (code.includes("permission-denied")) {
    return "Firebase izinleri reddetti. Firestore rules kismindaki kurallari kontrol et.";
  }

  if (message.includes("zaman asimina")) {
    return "Baglanti cok uzun surdu. Interneti ve Firestore ayarlarini kontrol et.";
  }

  if (message.includes("SDK")) {
    return "Firebase kutuphaneleri yuklenemedi. Sayfayi internet baglantisi olan bir ortamda acmalisin.";
  }

  return "Kart kaydedilemedi. Firebase config ve Firestore Database ayarlarini kontrol et.";
}
