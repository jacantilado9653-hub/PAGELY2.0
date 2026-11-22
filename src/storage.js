const DB_NAME = "PagelyDB";
const DB_VERSION = 1;
const STORE = "books";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveRecord(record) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(record);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function getBooks() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function addBook(file) {
  const book = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.name.split(".").pop().toLowerCase(),
    size: file.size,
    file,
    addedAt: Date.now(),
    progress: 0,
    progressPercent: 0,
    progressLabel: "",
    bookmarks: [],
    annotations: [],
    history: [],
    completed: false,
    readingTime: 0,
  };

  await saveRecord(book);
  return book;
}

export async function updateBook(book) {
  await saveRecord(book);
}

export async function deleteBook(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}