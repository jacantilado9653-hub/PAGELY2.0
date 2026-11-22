
function Sidebar({ activePage, onNavigate }) {
  const menuItems = [
    { name: "Discover", icon: "⌕" },
    { name: "My Library", icon: "▤" },
    { name: "Reading History", icon: "◷" },
    { name: "Profile", icon: "♙" },
    { name: "Settings", icon: "⚙" },
  ];

  return (
    <aside className="sidebar">
      <h1 className="sidebar-logo">PAGELY</h1>
      <p className="sidebar-subtitle">Your reading space</p>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.name}
            className={`sidebar-link ${
              activePage === item.name ? "active" : ""
            }`}
            onClick={() => onNavigate(item.name)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.name}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <p>Read at your own pace.</p>
      </div>
    </aside>
  );
}

export default Sidebar;
