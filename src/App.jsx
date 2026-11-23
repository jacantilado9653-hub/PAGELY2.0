import { useEffect, useState } from "react";
import "./App.css";
import Reader from "./Reader";
import { getBooks, addBook, updateBook, deleteBook } from "./storage";


/* Small line icons (replace the old text glyphs, incl. the chess pawn) */
const svgProps = {
  width: "1em",
  height: "1em",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

const HomeIcon = () => (
  <svg {...svgProps}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10v9.5h13V10" />
    <path d="M10 19.5v-5h4v5" />
  </svg>
);

const ShelfIcon = () => (
  <svg {...svgProps}>
    <path d="M5 4.5v14" />
    <path d="M9.5 4.5v14" />
    <path d="m14 6.5 3.2-1 3.3 12.3-3.2.9z" />
    <path d="M3.5 20h17" />
  </svg>
);

const HeartIcon = () => (
  <svg {...svgProps}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg {...svgProps}>
    <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" />
    <path d="M12 6.5v13" />
  </svg>
);

const BookIcon = () => (
  <svg {...svgProps}>
    <path d="M6.5 3.5H17A1.5 1.5 0 0 1 18.5 5v14a1.5 1.5 0 0 1-1.5 1.5H7A2.5 2.5 0 0 1 4.5 18V5.5a2 2 0 0 1 2-2z" />
    <path d="M8.5 3.5v17" />
    <path d="M11.5 8h4" />
  </svg>
);

function App() {
  const [activeTab, setActiveTab] = useState("Home");
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [openedBook, setOpenedBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("recent");

  const navItems = [
    { name: "Home", icon: <HomeIcon /> },
    { name: "Library", icon: <ShelfIcon /> },
    { name: "Community", icon: <HeartIcon /> },
    { name: "Profile", icon: <BookOpenIcon /> },
  ];

  useEffect(() => {
    async function loadLibrary() {
      try {
        const savedBooks = await getBooks();
        setBooks(savedBooks);
      } catch (error) {
        console.error(error);
        setError("Unable to load your library.");
      } finally {
        setLoading(false);
      }
    }

    loadLibrary();
  }, []);

  async function importBooks(event) {
    const files = Array.from(event.target.files || []);
    const allowed = ["epub", "pdf", "txt", "html", "htm"];

    for (const file of files) {
      const extension = file.name.split(".").pop().toLowerCase();

      if (!allowed.includes(extension)) {
        setError(`Unsupported file: ${file.name}`);
        continue;
      }

      try {
        const book = await addBook(file);
        setBooks((prev) => [...prev, book]);
      } catch (error) {
        console.error(error);
        setError(`Unable to import ${file.name}.`);
      }
    }

    event.target.value = "";
    setActiveTab("Library");
  }

  async function saveBook(book) {
    try {
      await updateBook(book);

      setBooks((prev) =>
        prev.map((item) => (item.id === book.id ? book : item))
      );

      if (openedBook?.id === book.id) {
        setOpenedBook(book);
      }
    } catch (error) {
      console.error(error);
      setError("Unable to save reading progress.");
    }
  }

  async function removeBook(id) {
    if (!window.confirm("Remove this book from your library?")) return;

    try {
      await deleteBook(id);
      setBooks((prev) => prev.filter((book) => book.id !== id));

      if (openedBook?.id === id) {
        setOpenedBook(null);
      }
    } catch (error) {
      console.error(error);
      setError("Unable to remove this book.");
    }
  }

  function formatSize(bytes) {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function openBook(book) {
    setOpenedBook(book);
  }

  const filteredBooks = books
    .filter((book) => book.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "size") return b.size - a.size;
      return (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt);
    });

  const completedBooks = books.filter((book) => book.completed).length;

  const totalReadingMinutes = books.reduce(
    (total, book) => total + (book.readingTime || 0),
    0
  );

  const readingHours = Math.floor(totalReadingMinutes / 60);
  const remainingMinutes = totalReadingMinutes % 60;

  const inProgressBooks = books.filter(
    (book) => book.progress && !book.completed
  );

  if (openedBook) {
    return (
      <Reader
        book={openedBook}
        onClose={() => setOpenedBook(null)}
        onUpdate={saveBook}
      />
    );
  }

  return (
    <div className="pagely-app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <img className="brand-logo" src="/logo.png" alt="Pagely" />
          </div>
          <div>
            <h1>PAGELY</h1>
            <p>Your personal reading space</p>
          </div>
        </div>

        <button
          className="header-profile"
          onClick={() => setActiveTab("Profile")}
        ><BookOpenIcon /></button>
      </header>

      <main className="app-content">
        {activeTab === "Home" && (
          <section>
            <div className="welcome-section">
              <p className="eyebrow">YOUR READING SPACE</p>
              <h2>Welcome to Pagely.</h2>
              <p>
                A little space for the stories you love and the ones you'll
                discover.
              </p>
            </div>

            <div className="home-import-card">
              <div className="import-icon">＋</div>

              <div className="import-card-info">
                <h3>Bring your books</h3>
                <p>Import EPUB, PDF, TXT or HTML files from your device.</p>
              </div>

              <label className="primary-button import-label">
                Import Books
                <input
                  type="file"
                  accept=".epub,.pdf,.txt,.html,.htm"
                  multiple
                  hidden
                  onChange={importBooks}
                />
              </label>
            </div>

            <section className="home-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">YOUR COLLECTION</p>
                  <h3>Continue Reading</h3>
                </div>

                <button
                  className="text-button"
                  onClick={() => setActiveTab("Library")}
                >
                  My Library →
                </button>
              </div>

              {loading ? (
                <p className="app-message">Loading library...</p>
              ) : inProgressBooks.length === 0 ? (
                <div className="empty-state compact">
                  <div className="empty-icon">◷</div>
                  <h3>Nothing to continue yet</h3>
                  <p>Open a book to start your reading progress.</p>
                </div>
              ) : (
                <div className="book-list">
                  {inProgressBooks.slice(0, 5).map((book) => (
                    <button
                      className="simple-book clickable-book"
                      key={book.id}
                      onClick={() => openBook(book)}
                    >
                      <div className="simple-book-icon"><BookIcon /></div>

                      <div className="simple-book-info">
                        <h4>{book.name}</h4>
                        <p>
                          {book.type.toUpperCase()} · {formatSize(book.size)}
                        </p>

                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(
                                book.progressPercent || 0,
                                100
                              )}%`,
                            }}
                          />
                        </div>

                        <small>
                          {book.progressPercent || 0}% complete
                        </small>
                      </div>

                      <span>→</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="home-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">READ TOGETHER</p>
                  <h3>Community</h3>
                </div>

                <button
                  className="text-button"
                  onClick={() => setActiveTab("Community")}
                >
                  Explore →
                </button>
              </div>

              <div className="community-preview">
                <div className="community-preview-icon">♡</div>

                <div>
                  <h3>Discover stories together</h3>
                  <p>
                    Find books, share recommendations and connect with other
                    readers.
                  </p>
                </div>
              </div>
            </section>
          </section>
        )}

        {activeTab === "Library" && (
          <section>
            <div className="page-heading">
              <p className="eyebrow">YOUR COLLECTION</p>
              <h2>My Library</h2>
              <p>All the books you bring into Pagely.</p>
            </div>

            <label className="primary-button import-label library-import">
              ＋ Import Books
              <input
                type="file"
                accept=".epub,.pdf,.txt,.html,.htm"
                multiple
                hidden
                onChange={importBooks}
              />
            </label>

            <div className="search-box">
              <span>⌕</span>
              <input
                type="text"
                placeholder="Search your books..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="library-filter">
              <label htmlFor="library-sort">Sort by</label>
              <select
                id="library-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="recent">Recently added/read</option>
                <option value="name">Title</option>
                <option value="size">File size</option>
              </select>
            </div>

            {loading ? (
              <p className="app-message">Loading library...</p>
            ) : filteredBooks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><BookIcon /></div>
                <h3>
                  {books.length === 0 ? "Your library is empty" : "No books found"}
                </h3>
                <p>
                  {books.length === 0
                    ? "Import EPUB, PDF, TXT or HTML files from your device."
                    : "Try another search."}
                </p>
              </div>
            ) : (
              <div className="library-book-list">
                {filteredBooks.map((book) => (
                  <div className="library-book" key={book.id}>
                    <button
                      className="library-cover"
                      onClick={() => openBook(book)}
                    >
                      <span><BookIcon /></span>
                      <small>{book.type.toUpperCase()}</small>
                    </button>

                    <button
                      className="library-book-info clickable-book-info"
                      onClick={() => openBook(book)}
                    >
                      <h3>{book.name}</h3>
                      <p>{book.type.toUpperCase()} file</p>
                      <p>{formatSize(book.size)}</p>

                      {book.completed && <p>✓ Completed</p>}

                      {book.progressPercent > 0 && (
                        <>
                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${Math.min(
                                  book.progressPercent,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                          <small>{book.progressPercent}% read</small>
                        </>
                      )}
                    </button>

                    <button
                      className="delete-button"
                      onClick={() => removeBook(book.id)}
                      title="Remove book"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "Community" && (
          <section>
            <div className="page-heading">
              <p className="eyebrow">READ TOGETHER</p>
              <h2>Community</h2>
              <p>Discover books and connect with fellow readers.</p>
            </div>

            <div className="community-banner">
              <div className="community-banner-icon">♡</div>
              <h3>A community of stories</h3>
              <p>
                Shared books, recommendations, ratings and conversations.
              </p>
            </div>

            <div className="empty-state">
              <div className="empty-icon">♧</div>
              <h3>Community is not connected yet</h3>
              <p>
                A backend is needed for shared books, ratings, comments,
                accounts and downloads between users. Your local library
                currently works independently of an online account.
              </p>
            </div>
          </section>
        )}

        {activeTab === "Profile" && (
          <section>
            <div className="page-heading">
              <p className="eyebrow">YOUR READING LIFE</p>
              <h2>Profile</h2>
            </div>

            <div className="profile-card">
              <div className="profile-avatar"><BookOpenIcon /></div>
              <h3>Reader</h3>
              <p>Local reading profile</p>
              <button
                className="secondary-button"
                onClick={() =>
                  setError("Online accounts require a connected backend.")
                }
              >
                Sign In / Sign Up
              </button>
            </div>

            <div className="profile-stats">
              <div className="stat-card">
                <span className="stat-icon"><BookIcon /></span>
                <p>My Books</p>
                <h3>{books.length}</h3>
              </div>

              <div className="stat-card">
                <span className="stat-icon">◷</span>
                <p>Reading Time</p>
                <h3>
                  {readingHours > 0
                    ? `${readingHours}h ${remainingMinutes}m`
                    : `${remainingMinutes}m`}
                </h3>
              </div>

              <div className="stat-card">
                <span className="stat-icon">✓</span>
                <p>Completed</p>
                <h3>{completedBooks}</h3>
              </div>
            </div>

            <section className="profile-section">
              <h3>Reading Activity</h3>

              <div className="profile-menu-item">
                <span><BookIcon /></span>
                <div>
                  <h4>My Library</h4>
                  <p>{books.length} imported books</p>
                </div>
                <button onClick={() => setActiveTab("Library")}>→</button>
              </div>

              <div className="profile-menu-item">
                <span>✓</span>
                <div>
                  <h4>Completed Books</h4>
                  <p>{completedBooks} finished books</p>
                </div>
              </div>

              <div className="profile-menu-item">
                <span>◷</span>
                <div>
                  <h4>Reading Time</h4>
                  <p>
                    {totalReadingMinutes} minutes recorded
                  </p>
                </div>
              </div>

              <div className="profile-menu-item">
                <span>⚙</span>
                <div>
                  <h4>Reading Preferences</h4>
                  <p>Font size and theme are available inside the reader.</p>
                </div>
              </div>
            </section>
          </section>
        )}

        {error && (
          <div className="app-message app-error">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
      </main>

      <nav className="bottom-navigation">
        {navItems.map((item) => (
          <button
            key={item.name}
            className={`nav-item ${
              activeTab === item.name ? "active" : ""
            }`}
            onClick={() => setActiveTab(item.name)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
