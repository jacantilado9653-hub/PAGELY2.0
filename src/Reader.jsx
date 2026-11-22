import { useEffect, useRef, useState, useMemo } from "react";
import ePub from "epubjs";
import * as pdfjsLib from "pdfjs-dist";
import "./Reader.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const MARK_COLORS = {
  Yellow: "#F2D878",
  Green: "#B9D9B0",
  Pink: "#EABBCB",
  Blue: "#B7D6ED",
  Orange: "#F2C39B",
};

function Reader({ book, onClose, onUpdate }) {
  const [page, setPage] = useState(
    typeof book.progress === "number" ? book.progress || 1 : 1
  );
  const [totalPages, setTotalPages] = useState(0);
  const [fontSize, setFontSize] = useState(book.fontSize || 19);
const [theme, setTheme] = useState(book.theme || "paper");
const [lineSpacing, setLineSpacing] = useState(book.lineSpacing || 1.85);
const [fontFamily, setFontFamily] = useState(book.fontFamily || "Serif");
  const [note, setNote] = useState("");
  const [annotations, setAnnotations] = useState(book.annotations || []);
  const [bookmarks, setBookmarks] = useState(book.bookmarks || []);
  const [message, setMessage] = useState("");
  const [textContent, setTextContent] = useState("");
  const [pdfDocument, setPdfDocument] = useState(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedText, setSelectedText] = useState("");
  const [selectedOffset, setSelectedOffset] = useState(null);
  const [selectedEndOffset, setSelectedEndOffset] = useState(null);
  const [showSaved, setShowSaved] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [markColor, setMarkColor] = useState("Yellow");

  const pdfCanvas = useRef(null);
  const epubContainer = useRef(null);
  const epubBook = useRef(null);
  const epubRendition = useRef(null);
  const textContainer = useRef(null);
  const timer = useRef(null);
  const readingSeconds = useRef(0);

  const type = book.type.toLowerCase();

  function persist(updated) {
    onUpdate({ ...book, ...updated });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadBook() {
      setLoading(true);

      try {
        if (type === "pdf") {
          const data = await book.file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data }).promise;

          if (!cancelled) {
            setPdfDocument(pdf);
            setTotalPages(pdf.numPages);
            setPage(Math.min(Math.max(book.progress || 1, 1), pdf.numPages));
          }
        } else if (type === "epub") {
          const epub = ePub(book.file);
          epubBook.current = epub;

          await epub.ready;

          if (cancelled) return;

          const rendition = epub.renderTo(epubContainer.current, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            spread: "none",
            allowScriptedContent: false,
          });

          epubRendition.current = rendition;

          applyEPUBTheme(rendition, fontSize, theme, lineSpacing, fontFamily);

          rendition.on("relocated", (location) => {
            if (!location?.start?.cfi) return;

            const cfi = location.start.cfi;

            persist({
              progress: cfi,
              progressPercent: location.percentage
                ? Math.round(location.percentage * 100)
                : book.progressPercent || 0,
              progressLabel: location.start.displayed
                ? `Page ${location.start.displayed.page} of ${location.start.displayed.total}`
                : "EPUB reading position",
              lastReadAt: Date.now(),
            });
          });

          await rendition.display(
            typeof book.progress === "string" && book.progress
              ? book.progress
              : undefined
          );
        } else if (type === "txt") {
          const content = await book.file.text();

          if (!cancelled) {
            setTextContent(content);
          }
        } else if (type === "html" || type === "htm") {
          const content = await book.file.text();

          if (!cancelled) {
            setHtmlContent(sanitizeHTML(content));
          }
        }
      } catch (error) {
        console.error(error);
        setMessage("Unable to open this file.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBook();

    return () => {
      cancelled = true;

      if (epubRendition.current) {
        epubRendition.current.destroy();
        epubRendition.current = null;
      }

      if (epubBook.current) {
        epubBook.current.destroy();
        epubBook.current = null;
      }
    };
  }, [book.id]);

  function applyEPUBTheme(rendition, size, readingTheme, spacing, font) {
  const themes = {
    paper: {
      background: "#FBF6EA",
      color: "#402A18",
    },
    white: {
      background: "#FFFFFF",
      color: "#222222",
    },
    sepia: {
      background: "#F0E1C0",
      color: "#3F2E1A",
    },
    dark: {
      background: "#1B1A18",
      color: "#E8DFD0",
    },
  };

  const selectedTheme = themes[readingTheme] || themes.paper;

  const fontStacks = {
    Serif: 'Georgia, "Times New Roman", serif',
    "Sans-serif": 'Roboto, "Helvetica Neue", Arial, sans-serif',
    "Times New Roman": '"Times New Roman", Times, serif',
    Arial: "Arial, Helvetica, sans-serif",
  };

  rendition.themes.default({
    body: {
      color: selectedTheme.color,
      background: selectedTheme.background,
      "font-size": `${size}px`,
      "line-height": String(spacing),
      "font-family": fontStacks[font] || fontStacks.Serif,
      padding: "10px",
    },
  });
}

  useEffect(() => {
  if (type === "epub" && epubRendition.current) {
    applyEPUBTheme(
      epubRendition.current,
      fontSize,
      theme,
      lineSpacing,
      fontFamily
    );
  }
}, [fontSize, theme, lineSpacing, fontFamily, type]);

  useEffect(() => {
    if (!pdfDocument || !pdfCanvas.current) return;

    let cancelled = false;

    async function renderPage() {
      try {
        const pdfPage = await pdfDocument.getPage(page);
        if (cancelled) return;

        const canvas = pdfCanvas.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        const scale = Math.min(
          1.5,
          window.innerWidth / pdfPage.getViewport({ scale: 1 }).width
        );
        const viewport = pdfPage.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await pdfPage.render({
          canvasContext: context,
          viewport,
        }).promise;
      } catch (error) {
        if (!cancelled) console.error(error);
      }
    }

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDocument, page]);

  useEffect(() => {
    const start = Date.now();

    timer.current = setInterval(() => {
      readingSeconds.current += 1;

      if (readingSeconds.current >= 60) {
        const minutes = Math.floor(readingSeconds.current / 60);
        readingSeconds.current %= 60;

        persist({
          readingTime: (book.readingTime || 0) + minutes,
        });
      }
    }, 1000);

    return () => {
      clearInterval(timer.current);

      const elapsedMinutes = Math.floor((Date.now() - start) / 60000);

      if (elapsedMinutes > 0) {
        persist({
          readingTime: (book.readingTime || 0) + elapsedMinutes,
        });
      }
    };
  }, [book.id]);

  useEffect(() => {
    if (type !== "txt" && type !== "html" && type !== "htm") return;
    if (!textContainer.current || loading) return;

    if (book.progressPercent > 0 && !book.progressRestored) {
      const container = textContainer.current;

      container.scrollTop =
        (container.scrollHeight - container.clientHeight) *
        (book.progressPercent / 100);
    }
  }, [loading, textContent, htmlContent]);

  function saveProgress(value, percent = null, label = "") {
    const updated = {
      ...book,
      progress: value,
      progressPercent: percent ?? book.progressPercent ?? 0,
      progressLabel: label || book.progressLabel || "",
      lastReadAt: Date.now(),
      history: [
        ...(book.history || []),
        {
          position: value,
          time: Date.now(),
        },
      ].slice(-100),
    };

    onUpdate(updated);
  }

  function getTextProgress() {
    if (!textContainer.current) return 0;

    const container = textContainer.current;
    const maximum = container.scrollHeight - container.clientHeight;

    if (maximum <= 0) return 100;

    return Math.round((container.scrollTop / maximum) * 100);
  }

  function handleTextScroll() {
    const percent = getTextProgress();

    saveProgress(percent, percent, `${percent}%`);

    if (percent >= 98 && !book.completed) {
      persist({ completed: true });
    }
  }

  async function nextPage() {
    if (type === "pdf" && page < totalPages) {
      const next = page + 1;
      setPage(next);
      saveProgress(next, Math.round((next / totalPages) * 100), `Page ${next}`);
    } else if (type === "epub") {
      await epubRendition.current?.next();
    }
  }

  async function previousPage() {
    if (type === "pdf" && page > 1) {
      const previous = page - 1;
      setPage(previous);
      saveProgress(
        previous,
        Math.round((previous / totalPages) * 100),
        `Page ${previous}`
      );
    } else if (type === "epub") {
      await epubRendition.current?.prev();
    }
  }

  function getPosition() {
    if (type === "pdf") return page;

    if (type === "epub") {
      return epubRendition.current?.currentLocation()?.start?.cfi || "";
    }

    return getTextProgress();
  }

  function addBookmark() {
    const position = getPosition();

    if (
      bookmarks.some((item) => String(item.position) === String(position))
    ) {
      setMessage("A bookmark already exists at this position.");
      return;
    }

    const bookmark = {
      id: crypto.randomUUID(),
      position,
      percent: book.progressPercent || 0,
      label:
        type === "pdf"
          ? `Page ${page}`
          : type === "epub"
            ? `Bookmark ${bookmarks.length + 1}`
            : `Bookmark at ${getTextProgress()}%`,
      createdAt: Date.now(),
    };

    const updated = [...bookmarks, bookmark];

    setBookmarks(updated);
    persist({ bookmarks: updated });
    setMessage("Bookmark saved.");
  }

  function goToBookmark(bookmark) {
    if (type === "pdf") {
      setPage(bookmark.position);

      saveProgress(
        bookmark.position,
        Math.round((bookmark.position / totalPages) * 100),
        `Page ${bookmark.position}`
      );
    } else if (type === "epub") {
      epubRendition.current?.display(bookmark.position);
    } else if (textContainer.current) {
      textContainer.current.scrollTop =
        (textContainer.current.scrollHeight -
          textContainer.current.clientHeight) *
        (bookmark.percent / 100);
    }

    setShowSaved(false);
  }

  function deleteBookmark(id) {
    const updated = bookmarks.filter((item) => item.id !== id);

    setBookmarks(updated);
    persist({ bookmarks: updated });
  }

  function getFlatText(container) {
    if (!container) return "";

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT
    );

    let text = "";
    let node;

    while ((node = walker.nextNode())) {
      text += node.textContent;
    }

    return text;
  }

  function getSelectionOffsets(container, range) {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT
    );

    let start = 0;
    let end = 0;
    let foundStart = false;
    let node;

    while ((node = walker.nextNode())) {
      const length = node.textContent.length;

      if (node === range.startContainer) {
        start = start + range.startOffset;
        foundStart = true;
      } else if (!foundStart) {
        start += length;
      }

      if (node === range.endContainer) {
        end += range.endOffset;
        break;
      }

      end += length;
    }

    return { start, end };
  }

  function captureSelection() {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed) return;
    if (!textContainer.current) return;

    const selected = selection.toString();

    if (!selected.trim()) return;

    const range = selection.getRangeAt(0);

    if (!textContainer.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const offsets = getSelectionOffsets(textContainer.current, range);

    setSelectedText(selected);
    setSelectedOffset(offsets.start);
    setSelectedEndOffset(offsets.end);
  }

  function addAnnotation(kind = "Note") {
    if (kind === "Note" && !note.trim()) {
      setMessage("Write a note first.");
      return;
    }

    const annotation = {
      id: crypto.randomUUID(),
      kind,
      text: note.trim(),
      quotedText: selectedText,
      position: getPosition(),
      textOffset: selectedOffset,
      endOffset: selectedEndOffset,
      color: kind === "Highlight" ? markColor : null,
      createdAt: Date.now(),
      label: selectedText
        ? selectedText.slice(0, 60)
        : "Note",
    };

    const updated = [...annotations, annotation];

    setAnnotations(updated);
    persist({ annotations: updated });

    setNote("");
    setSelectedText("");
    setSelectedOffset(null);
    setSelectedEndOffset(null);
    window.getSelection()?.removeAllRanges();

    setMessage(`${kind} saved.`);
  }
function jumpToAnnotation(annotation) {
  if (type === "pdf") {
    setMessage("Passage jumping for PDF is not yet implemented.");
    return;
  }

  if (type === "epub") {
    setMessage("Passage jumping for EPUB is not yet implemented.");
    return;
  }

  if (!textContainer.current) return;

  const container = textContainer.current;

  const markedElement = container.querySelector(
    `[data-annotation-id="${annotation.id}"]`
  );

  if (markedElement) {
    markedElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  } else if (annotation.textOffset != null) {
    const text = getFlatText(container);
    const offset = Math.min(annotation.textOffset, text.length);

    const ratio = text.length > 0 ? offset / text.length : 0;

    container.scrollTo({
      top: ratio * (container.scrollHeight - container.clientHeight),
      behavior: "smooth",
    });
  }

  setShowSaved(false);
}
  function deleteAnnotation(id) {
    const updated = annotations.filter((item) => item.id !== id);

    setAnnotations(updated);
    persist({ annotations: updated });
  }

  function sanitizeHTML(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");

    doc.querySelectorAll(
      "script, iframe, object, embed, form, link, meta"
    ).forEach((element) => element.remove());

    doc.querySelectorAll("*").forEach((element) => {
      [...element.attributes].forEach((attribute) => {
        if (
          attribute.name.toLowerCase().startsWith("on") ||
          attribute.name.toLowerCase() === "srcdoc"
        ) {
          element.removeAttribute(attribute.name);
        }
      });
    });

    return doc.body.innerHTML;
  }

  function buildMarkedHTML(content, marks) {
    if (!content) return "";

    const doc = new DOMParser().parseFromString(content, "text/html");
    const body = doc.body;

    const validMarks = marks
      .filter(
        (item) =>
          item.quotedText &&
          item.textOffset !== null &&
          item.endOffset !== null &&
          (item.kind === "Highlight" || item.kind === "Underline")
      )
      .sort((a, b) => b.textOffset - a.textOffset);

    for (const mark of validMarks) {
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      let node;
      let total = 0;

      while ((node = walker.nextNode())) {
        nodes.push({
          node,
          start: total,
          end: total + node.textContent.length,
        });
        total += node.textContent.length;
      }

      const start = mark.textOffset;
      const end = mark.endOffset;

      if (start < 0 || end <= start || end > total) continue;

      let startNode = null;
      let endNode = null;
      let startLocal = 0;
      let endLocal = 0;

      for (const item of nodes) {
        if (!startNode && start >= item.start && start <= item.end) {
          startNode = item.node;
          startLocal = start - item.start;
        }

        if (end >= item.start && end <= item.end) {
          endNode = item.node;
          endLocal = end - item.start;
          break;
        }
      }

      if (!startNode || !endNode) continue;

      try {
        const range = document.createRange();

        range.setStart(startNode, startLocal);
        range.setEnd(endNode, endLocal);

        const wrapper = document.createElement("span");

        wrapper.className =
          mark.kind === "Underline"
            ? "pagely-underline-mark"
            : "pagely-highlight-mark";

        if (mark.kind === "Highlight") {
          wrapper.style.backgroundColor =
            MARK_COLORS[mark.color] || MARK_COLORS.Yellow;
        }

        wrapper.dataset.annotationId = mark.id;

        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);
      } catch (error) {
        console.warn("Unable to render annotation.", error);
      }
    }

    return body.innerHTML;
  }

  const markedHTML = useMemo(
    () => buildMarkedHTML(htmlContent, annotations),
    [htmlContent, annotations]
  );

  function renderMarkedText(content) {
    if (!content) return null;

    const marks = annotations
      .filter(
        (item) =>
          item.quotedText &&
          item.textOffset !== null &&
          item.endOffset !== null &&
          (item.kind === "Highlight" || item.kind === "Underline")
      )
      .sort((a, b) => a.textOffset - b.textOffset);

    const segments = [];
    let cursor = 0;

    for (const mark of marks) {
      const start = mark.textOffset;
      const end = mark.endOffset;

      if (
        start < cursor ||
        start < 0 ||
        end <= start ||
        end > content.length
      ) {
        continue;
      }

      segments.push({
        text: content.slice(cursor, start),
        mark: null,
      });

      segments.push({
        text: content.slice(start, end),
        mark,
      });

      cursor = end;
    }

    segments.push({
      text: content.slice(cursor),
      mark: null,
    });

    return segments.map((segment, index) => {
      if (!segment.mark) {
        return <span key={index}>{segment.text}</span>;
      }

      const mark = segment.mark;

      return (
        <span
          key={index}
          className={
            mark.kind === "Underline"
              ? "pagely-underline-mark"
              : "pagely-highlight-mark"
          }
          style={
            mark.kind === "Highlight"
              ? {
                  backgroundColor:
                    MARK_COLORS[mark.color] || MARK_COLORS.Yellow,
                }
              : undefined
          }
          data-annotation-id={mark.id}
        >
          {segment.text}
        </span>
      );
    });
  }

  function savePreferences() {
    persist({ fontSize, theme });

    setMessage("Reading preferences saved.");
    setShowSettings(false);
  }

  return (
    <div className={`reader-screen ${theme}`}>
      <header className="reader-header">
        <button className="reader-close" onClick={onClose}>
          ←
        </button>

        <div className="reader-title">
          <h2 title={book.name}>{book.name}</h2>
          <small>{book.progressLabel || "Reading"}</small>
        </div>

        <button className="reader-bookmark" onClick={addBookmark}>
          ♡
        </button>
      </header>

      <div className="reader-toolbar">
        <button onClick={() => setFontSize((size) => Math.max(12, size - 2))}>
          A−
        </button>

        <button onClick={() => setFontSize((size) => Math.min(40, size + 2))}>
          A+
        </button>

        <button onClick={() => setShowSettings(!showSettings)}>
          ⚙
        </button>

        <button onClick={() => setShowSaved(!showSaved)}>
          Saved
        </button>
      </div>

     {showSettings && (
  <div className="reader-settings">
    <label>
      Reading theme
      <select
        value={theme}
        onChange={(event) => setTheme(event.target.value)}
      >
        <option value="paper">Paper</option>
        <option value="white">White</option>
        <option value="sepia">Sepia</option>
        <option value="dark">Dark</option>
      </select>
    </label>

    <label>
      Text size: {fontSize}px
      <input
        type="range"
        min="14"
        max="28"
        value={fontSize}
        onChange={(event) => setFontSize(Number(event.target.value))}
      />
    </label>

    <label>
      Line spacing: {lineSpacing.toFixed(2)}
      <input
        type="range"
        min="1.4"
        max="2.2"
        step="0.05"
        value={lineSpacing}
        onChange={(event) => setLineSpacing(Number(event.target.value))}
      />
    </label>

    <label>
      Font
      <select
        value={fontFamily}
        onChange={(event) => setFontFamily(event.target.value)}
      >
        <option value="Serif">Serif</option>
        <option value="Sans-serif">Sans-serif</option>
        <option value="Times New Roman">Times New Roman</option>
        <option value="Arial">Arial</option>
      </select>
    </label>

    <div className="reader-settings-actions">
      <button
        className="reader-action-button"
        onClick={savePreferences}
      >
        Save Preferences
      </button>

      <button
        className="reader-action-button"
        onClick={() => {
          setFontSize(19);
          setLineSpacing(1.85);
          setTheme("paper");
          setFontFamily("Serif");
        }}
      >
        Reset
      </button>
    </div>
  </div>
)}

      <main className="reader-body">
  {loading && (
    <div className="reader-loading">Loading your book...</div>
  )}

  {type === "epub" && (
    <div
      className="epub-reader-content"
      ref={epubContainer}
      style={{
        display: loading ? "none" : "block",
      }}
    />
  )}

  {!loading && (
    <>
      {type === "pdf" && (
        <div className="pdf-reader-content">
          <canvas ref={pdfCanvas} />
        </div>
      )}

      {type === "txt" && (
        <article
          ref={textContainer}
          className="text-reader-content"
          style={{ fontSize: `$DIL1px` }}
          onScroll={handleTextScroll}
          onMouseUp={captureSelection}
          onTouchEnd={captureSelection}
        >
          {renderMarkedText(textContent)}
        </article>
      )}
            {type === "pdf" && (
              <div className="pdf-reader-content">
                <canvas ref={pdfCanvas} />
              </div>
            )}

            {type === "epub" && (
              <div className="epub-reader-content" ref={epubContainer} />
            )}

            {type === "txt" && (
              <article
                ref={textContainer}
                className="text-reader-content"
               style={{
  fontSize: `${fontSize}px`,
  lineHeight: lineSpacing,
  fontFamily:
    fontFamily === "Serif"
      ? 'Georgia, "Times New Roman", serif'
      : fontFamily === "Sans-serif"
        ? 'Roboto, "Helvetica Neue", Arial, sans-serif'
        : fontFamily === "Times New Roman"
          ? '"Times New Roman", Times, serif'
          : "Arial, Helvetica, sans-serif",
}}
                onScroll={handleTextScroll}
                onMouseUp={captureSelection}
                onTouchEnd={captureSelection}
              >
                {renderMarkedText(textContent)}
              </article>
            )}

            {(type === "html" || type === "htm") && (
              <article
                ref={textContainer}
                className="text-reader-content html-reader-content"
                style={{
  fontSize: `${fontSize}px`,
  lineHeight: lineSpacing,
  fontFamily:
    fontFamily === "Serif"
      ? 'Georgia, "Times New Roman", serif'
      : fontFamily === "Sans-serif"
        ? 'Roboto, "Helvetica Neue", Arial, sans-serif'
        : fontFamily === "Times New Roman"
          ? '"Times New Roman", Times, serif'
          : "Arial, Helvetica, sans-serif",
}}
                onScroll={handleTextScroll}
                onMouseUp={captureSelection}
                onTouchEnd={captureSelection}
                dangerouslySetInnerHTML={{
                  __html: markedHTML,
                }}
              />
            )}
          </>
        )}
      </main>

      {(type === "pdf" || type === "epub") && (
        <div className="reader-page-controls">
          <button onClick={previousPage}>← Previous</button>

          {type === "pdf" && <span>Page {page} / {totalPages}</span>}

          {type === "epub" && <span>EPUB</span>}

          <button onClick={nextPage}>Next →</button>
        </div>
      )}

      <section className="reader-notes">
        <h3>Notes & Annotations</h3>

        {selectedText && (
          <div className="selected-passage">
            <p>Selected passage:</p>
            <blockquote>{selectedText}</blockquote>

            <label>
              Highlight color
              <select
                value={markColor}
                onChange={(event) => setMarkColor(event.target.value)}
              >
                {Object.keys(MARK_COLORS).map((color) => (
                  <option value={color} key={color}>
                    {color}
                  </option>
                ))}
              </select>
            </label>

            <div className="annotation-actions">
              <button onClick={() => addAnnotation("Highlight")}>
                Highlight
              </button>

              <button onClick={() => addAnnotation("Underline")}>
                Underline
              </button>
            </div>
          </div>
        )}

        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={
            selectedText
              ? "Write a note about the selected passage..."
              : "Write a general reading note..."
          }
        />

        <button className="reader-action-button" onClick={() => addAnnotation("Note")}>
          Save Note
        </button>

        {annotations.map((item) => (
          <div className="reader-note-item" key={item.id}>
            <div>
              <button onClick={() => jumpToAnnotation(item)}>
  {item.kind || "Note"} — Jump to passage
</button>
              {item.quotedText && <blockquote>{item.quotedText}</blockquote>}

              <p>{item.text}</p>
            </div>

            <button onClick={() => deleteAnnotation(item.id)}>Delete</button>
          </div>
        ))}
      </section>

      <section className="reader-bookmarks">
        <h3>Bookmarks</h3>

        {bookmarks.length === 0 && <p>No bookmarks yet.</p>}

        {bookmarks.map((bookmark) => (
          <div className="reader-note-item" key={bookmark.id}>
            <button onClick={() => goToBookmark(bookmark)}>
              {bookmark.label}
            </button>

            <button onClick={() => deleteBookmark(bookmark.id)}>Delete</button>
          </div>
        ))}
      </section>

      {showSaved && (
        <section className="reader-saved-panel">
          <div className="saved-panel-header">
            <h3>Saved Items</h3>
            <button onClick={() => setShowSaved(false)}>×</button>
          </div>

          <h4>Bookmarks</h4>

          {bookmarks.map((bookmark) => (
            <button
              className="saved-item-button"
              key={bookmark.id}
              onClick={() => goToBookmark(bookmark)}
            >
              {bookmark.label}
            </button>
          ))}

          <h4>Annotations</h4>

          {annotations.map((item) => (
            <div className="reader-note-item" key={item.id}>
              <div>
                <strong>{item.kind}</strong>
                <p>{item.text || item.quotedText || item.label}</p>
              </div>

              <button onClick={() => deleteAnnotation(item.id)}>Delete</button>
            </div>
          ))}
        </section>
      )}

      {message && (
        <div className="reader-message">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}
    </div>
  );
}

export default Reader;