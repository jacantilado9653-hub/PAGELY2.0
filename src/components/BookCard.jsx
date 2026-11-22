
function BookCard({ book, isSaved, onToggleSave, onOpen }) {
  return (
    <div className="book-card">
      <div
        className="book-cover"
        style={{
          backgroundColor: book.coverColor || "#d8c3a5",
          backgroundImage: book.coverImage
            ? `url(${book.coverImage})`
            : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        onClick={() => onOpen(book)}
      >
        {!book.coverImage && (
          <>
            <span className="book-cover-title">{book.title}</span>
            <span className="book-cover-author">{book.author}</span>
          </>
        )}
      </div>

      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>
        <p className="book-genre">{book.genre}</p>

        <div className="book-details">
          <span>⭐ {book.rating}</span>

          <button
            className="save-button"
            onClick={() => onToggleSave(book)}
          >
            {isSaved ? "♥ Saved" : "♡ Save"}
          </button>
        </div>

        <button
          className="view-button"
          onClick={() => onOpen(book)}
        >
          View Details
        </button>
      </div>
    </div>
  );
}

export default BookCard;
