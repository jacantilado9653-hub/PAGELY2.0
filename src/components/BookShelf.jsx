import BookCard from "./BookCard";

function BookShelf({ title, books, savedBooks, onToggleSave, onOpen }) {
  return (
    <section className="shelf">
      <h2 className="shelf-heading">{title}</h2>

      <div className="shelf-books">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            isSaved={savedBooks.includes(book.id)}
            onToggleSave={onToggleSave}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

export default BookShelf;
