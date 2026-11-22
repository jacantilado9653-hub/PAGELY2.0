function GenreFilter({ genres, selectedGenre, onSelectGenre }) {
  return (
    <div className="genre-container">
      {genres.map((genre) => (
        <button
          key={genre}
          onClick={() => onSelectGenre(genre)}
          className={`genre-button ${
            selectedGenre === genre ? "selected" : ""
          }`}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}

export default GenreFilter;