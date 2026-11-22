
import { useState, useEffect, useRef } from "react";
import "./ReaderPage.css";

export default function ReaderPage({ book, onBack }) {
  const readerRef = useRef(null);

  const chapters = book?.chapters?.length
    ? book.chapters
    : [{ title: "Book content", content: book?.content || book?.text || "No content available." }];

  const [chapterIndex, setChapterIndex] = useState(0);
  const [barsVisible, setBarsVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [progress, setProgress] = useState(0);
  const [savedItems, setSavedItems] = useState([]);
  const [selectedText, setSelectedText] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [noteModal, setNoteModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  const currentChapter = chapters[chapterIndex];

  useEffect(() => {
    if (!book?.id) return;

    const saved = localStorage.getItem(`pagely-reader-${book.id}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setSavedItems(data.items || []);
        setChapterIndex(data.chapterIndex || 0);
        setProgress(data.progress || 0);
      } catch {
        setSavedItems([]);
      }
    }
  }, [book?.id]);

  useEffect(() => {
    if (!book?.id) return;

    localStorage.setItem(
      `pagely-reader-${book.id}`,
      JSON.stringify({
        items: savedItems,
        chapterIndex,
        progress,
      })
    );
  }, [book?.id, savedItems, chapterIndex, progress]);

  useEffect(() => {
    if (!book?.file || book.file.type !== "application/pdf") return;

    const url = URL.createObjectURL(book.file);
    setPdfUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [book?.file]);

  useEffect(() => {
    const reader = readerRef.current;
    if (!reader) return;

    const updateProgress = () => {
      const maxScroll = reader.scrollHeight - reader.clientHeight;
      const percentage = maxScroll <= 0 ? 100 : (reader.scrollTop / maxScroll) * 100;

      setProgress(Math.min(100, Math.max(0, percentage)));
    };

    reader.addEventListener("scroll", updateProgress);
    updateProgress();

    return () => reader.removeEventListener("scroll", updateProgress);
  }, [chapterIndex]);

  function getSelection() {
    const selection = window.getSelection()?.toString().trim();
    if (!selection) return;

    setSelectedText(selection);
  }

  function saveMark(kind) {
    if (!selectedText) return;

    if (kind === "Note") {
      setNoteModal(true);
      return;
    }

    const item = {
      id: Date.now(),
      kind,
      text: selectedText,
      chapterIndex,
      createdAt: new Date().toLocaleString(),
      color: kind === "Underline" ? "none" : "#E9D7A4",
      noteText: "",
    };

    setSavedItems((prev) => [...prev, item]);
    setSelectedText("");
    window.getSelection()?.removeAllRanges();
  }

  function saveNote() {
    if (!noteInput.trim()) return;

    const item = {
      id: Date.now(),
      kind: "Note",
      text: selectedText,
      chapterIndex,
      createdAt: new Date().toLocaleString(),
      color: "#A98654",
      noteText: noteInput.trim(),
    };

    setSavedItems((prev) => [...prev, item]);
    setNoteInput("");
    setSelectedText("");
    setNoteModal(false);
    window.getSelection()?.removeAllRanges();
  }

  function addBookmark() {
    const item = {
      id: Date.now(),
      kind: "Bookmark",
      text: "",
      chapterIndex,
      progress,
      createdAt: new Date().toLocaleString(),
      noteText: "",
    };

    setSavedItems((prev) => [...prev, item]);
  }

  function removeItem(id) {
    setSavedItems((prev) => prev.filter((item) => item.id !== id));
  }

  function jumpToItem(item) {
    setChapterIndex(item.chapterIndex);
    setMenuOpen(false);
    setBarsVisible(true);

    if (item.kind === "Bookmark") {
      setProgress(item.progress || 0);
    }
  }

  function previousChapter() {
    if (chapterIndex > 0) {
      setChapterIndex((prev) => prev - 1);
      setProgress(0);
      if (readerRef.current) readerRef.current.scrollTop = 0;
    }
  }

  function nextChapter() {
    if (chapterIndex < chapters.length - 1) {
      setChapterIndex((prev) => prev + 1);
      setProgress(0);
      if (readerRef.current) readerRef.current.scrollTop = 0;
    }
  }

  if (!book) {
    return (
      <div className="pagely-reader-empty">
        <p>No book selected.</p>
        <button onClick={onBack}>Go back</button>
      </div>
    );
  }

  return (
    <div className="pagely-reader">
      <div
        ref={readerRef}
        className="pagely-reading-surface"
        onClick={() => {
          if (!barsVisible && !menuOpen) setBarsVisible(true);
        }}
      >
        {pdfUrl ? (
          <iframe
            title="PDF reader"
            src={pdfUrl}
            className="pagely-pdf-frame"
          />
        ) : (
          <article
            className="pagely-reading-text"
            style={{ fontSize: `${fontSize}px` }}
            onMouseUp={getSelection}
            onTouchEnd={getSelection}
          >
            <h2>{currentChapter?.title || book.title}</h2>
            <div className="pagely-chapter-content">
              {typeof currentChapter?.content === "string"
                ? currentChapter.content.split("\n").map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))
                : currentChapter?.content || "No readable content available."}
            </div>
          </article>
        )}
      </div>

      {selectedText && barsVisible && !pdfUrl && (
        <div className="pagely-selection-toolbar">
          <button onClick={() => saveMark("Highlight")}>Highlight</button>
          <button onClick={() => saveMark("Underline")}>Underline</button>
          <button onClick={() => saveMark("Note")}>Add note</button>
          <button onClick={() => setSelectedText("")}>Cancel</button>
        </div>
      )}

      {barsVisible && (
        <header className="pagely-reader-topbar">
          <button className="pagely-reader-icon" onClick={onBack}>
            ←
          </button>

          <div className="pagely-reader-heading">
            <strong>{book.title}</strong>
            <span>
              {chapterIndex + 1} / {chapters.length} chapters
            </span>
          </div>

          <button
            className="pagely-reader-icon"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>

          <div className="pagely-reader-progress">
            <div style={{ width: `${progress}%` }} />
          </div>
        </header>
      )}

      {!barsVisible && (
        <button
          className="pagely-reader-floating-menu"
          onClick={() => setBarsVisible(true)}
        >
          ☰
        </button>
      )}

      {barsVisible && !pdfUrl && (
        <footer className="pagely-reader-bottom">
          <button
            disabled={chapterIndex === 0}
            onClick={previousChapter}
          >
            ← Previous
          </button>

          <div className="pagely-font-controls">
            <button onClick={() => setFontSize((s) => Math.max(12, s - 1))}>
              A−
            </button>
            <button onClick={() => setFontSize((s) => Math.min(32, s + 1))}>
              A+
            </button>
          </div>

          <button
            disabled={chapterIndex === chapters.length - 1}
            onClick={nextChapter}
          >
            Next →
          </button>
        </footer>
      )}

      {menuOpen && (
        <div className="pagely-reader-overlay" onClick={() => setMenuOpen(false)}>
          <aside
            className="pagely-reader-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pagely-menu-heading">
              <h3>Bookmarks and notes</h3>
              <button onClick={() => setMenuOpen(false)}>Close</button>
            </div>

            <div className="pagely-menu-actions">
              <button onClick={addBookmark}>+ Bookmark</button>
              <button
                onClick={() => {
                  setSelectedText("");
                  setNoteModal(true);
                }}
              >
                + Note
              </button>
            </div>

            <div className="pagely-menu-list">
              <h4>Bookmarks</h4>

              {savedItems.filter((item) => item.kind === "Bookmark").length === 0 && (
                <p className="pagely-empty-message">No bookmarks yet.</p>
              )}

              {savedItems
                .filter((item) => item.kind === "Bookmark")
                .map((item) => (
                  <div className="pagely-saved-card" key={item.id}>
                    <button
                      className="pagely-saved-content"
                      onClick={() => jumpToItem(item)}
                    >
                      <strong>Chapter {item.chapterIndex + 1}</strong>
                      <small>{item.createdAt}</small>
                    </button>
                    <button onClick={() => removeItem(item.id)}>Delete</button>
                  </div>
                ))}

              <h4>Notes and highlights</h4>

              {savedItems.filter((item) => item.kind !== "Bookmark").length === 0 && (
                <p className="pagely-empty-message">
                  Nothing yet. Select text to highlight, underline or add a note.
                </p>
              )}

              {savedItems
                .filter((item) => item.kind !== "Bookmark")
                .map((item) => (
                  <div className="pagely-saved-card" key={item.id}>
                    <button
                      className="pagely-saved-content"
                      onClick={() => jumpToItem(item)}
                    >
                      <strong>{item.kind}</strong>
                      {item.text && <em>“{item.text}”</em>}
                      {item.noteText && <span>{item.noteText}</span>}
                      <small>{item.createdAt}</small>
                    </button>
                    <button onClick={() => removeItem(item.id)}>Delete</button>
                  </div>
                ))}
            </div>
          </aside>
        </div>
      )}

      {noteModal && (
        <div className="pagely-note-overlay">
          <div className="pagely-note-dialog">
            <h3>Add note</h3>

            {selectedText && (
              <blockquote>“{selectedText}”</blockquote>
            )}

            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              maxLength={500}
              placeholder="Write your note..."
            />

            <div className="pagely-note-actions">
              <button
                onClick={() => {
                  setNoteModal(false);
                  setNoteInput("");
                }}
              >
                Cancel
              </button>
              <button onClick={saveNote} disabled={!noteInput.trim()}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
