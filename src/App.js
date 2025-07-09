import { useEffect, useState } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import "./App.css";

function App() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [currentPage, setCurrentPage] = useState("home");
  const [itemsToShow, setItemsToShow] = useState(8);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showSongDetails, setShowSongDetails] = useState(false);
  const [viewMode, setViewMode] = useState("chords"); // "chords" or "lyrics"
  const [newSong, setNewSong] = useState({
    title: "",
    creator: "",
    language: "English",
    type: "Fast Song",
    chords: [{ section: "Intro", content: "" }],
    lyrics: [{ section: "Verse", content: "" }]
  });

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const colRef = collection(db, "songs");
        const snapshot = await getDocs(colRef);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSongs(list);
      } catch (err) {
        console.error("Error fetching songs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, []);

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.creator?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = selectedLanguage === "all" || song.language === selectedLanguage;
    const matchesType = selectedType === "all" || song.type === selectedType;
    return matchesSearch && matchesLanguage && matchesType;
  });

  const uniqueLanguages = [...new Set(songs.map(song => song.language))].filter(Boolean);
  const uniqueTypes = [...new Set(songs.map(song => song.type))].filter(Boolean);

  const displayedSongs = filteredSongs.slice(0, itemsToShow);

  const handleViewSongDetails = (song) => {
    setSelectedSong(song);
    setViewMode("chords"); // Reset to chords view when opening
    setShowSongDetails(true);
  };

  const handleAddSection = (type) => {
    setNewSong(prev => ({
      ...prev,
      [type]: [...prev[type], { section: "", content: "" }]
    }));
  };

  const handleRemoveSection = (type, index) => {
    setNewSong(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSectionChange = (type, index, field, value) => {
    setNewSong(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };



  const handleSaveSong = async () => {
    // 1. Basic validation
    if (!newSong.title || !newSong.creator) {
      alert("Please fill in the song title and creator");
      return;
    }

    // 2. Debug output: inspect what you're about to save
    console.log("→ newSong.chords:", newSong.chords);
    console.log("→ newSong.lyrics:", newSong.lyrics);

    // 3. Build the Firestore payload
    const payload = {
      title: newSong.title,
      creator: newSong.creator,
      language: newSong.language,
      type: newSong.type,
      // Convert your chords array into a map: { Intro: "...", Verse: "...", ... }
      chords: newSong.chords.reduce((acc, { section, content }) => {
        if (section) acc[section] = content;
        return acc;
      }, {}),
      // Convert your lyrics array into a map: { Intro: "...", Verse: "...", ... }
      lyrics: newSong.lyrics.reduce((acc, { section, content }) => {
        if (section) acc[section] = content;
        return acc;
      }, {}),
      // Preserve the exact order in which you added chord sections
      sectionOrder: newSong.chords.map(({ section }) => section).filter(Boolean),
    };

    console.log("→ payload:", payload);

    // 4. Write to Firestore
    try {
      const docRef = await addDoc(collection(db, "songs"), payload);

      // 5. Update local state & close modal
      setSongs(prev => [...prev, { id: docRef.id, ...payload }]);
      setShowAddModal(false);

      // 6. Reset form fields
      setNewSong({
        title: "",
        creator: "",
        language: "English",
        type: "Fast Song",
        chords: [{ section: "Intro", content: "" }],
        lyrics: [{ section: "Verse", content: "" }],
      });

      alert("Song added successfully!");
    } catch (error) {
      console.error("Error adding song:", error);
      alert("Error adding song. Please try again.");
    }
  };



  const renderSongDetails = () => {
    if (!selectedSong) return null;

    // Helper stays defined here
    const getSectionContent = (sections, sectionName) => {
      if (typeof sections === 'object' && sections !== null) {
        if (Array.isArray(sections)) {
          const sectionItem = sections.find(item => item.section === sectionName);
          return sectionItem ? sectionItem.content : '';
        } else {
          return sections[sectionName] || '';
        }
      }
      return '';
    };

    // Renders in-order sections
    const renderSectionOrder = () => {
      if (!Array.isArray(selectedSong.sectionOrder) || selectedSong.sectionOrder.length === 0) {
        return <p className="no-section-order">No section order defined</p>;
      }

      // Only include sections that actually have content for the current view
      const sectionsForMode = selectedSong.sectionOrder.filter(sectionName => {
        const content = viewMode === "chords"
          ? getSectionContent(selectedSong.chords, sectionName)
          : getSectionContent(selectedSong.lyrics, sectionName);
        return content.trim() !== "";
      });

      if (sectionsForMode.length === 0) {
        return <p className="no-section-order">No {viewMode} sections defined</p>;
      }

      return sectionsForMode.map((sectionName, index) => {
        const currentContent = viewMode === "chords"
          ? getSectionContent(selectedSong.chords, sectionName)
          : getSectionContent(selectedSong.lyrics, sectionName);

        return (
          <div key={index} className="song-section">
            <div className="section-header">
              <h4 className="section-name">{sectionName}</h4>
              <span className="section-number">#{index + 1}</span>
            </div>
            <div className="section-content">
              {currentContent ? (
                <pre className="content-text">{currentContent}</pre>
              ) : (
                <p className="no-content">No {viewMode} available for this section</p>
              )}
            </div>
          </div>
        );
      });
    };


    return (
      <div className="song-details-modal">
        <div className="song-details-overlay" onClick={() => setShowSongDetails(false)}>
          <div className="song-details-content" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="song-details-header">
              <div className="song-info">
                <h2 className="song-details-title">{selectedSong.title}</h2>
                <div className="song-meta">
                  <span className="song-creator">By {selectedSong.creator}</span>
                  <span className="song-language">{selectedSong.language}</span>
                  <span className="song-type">{selectedSong.type}</span>
                </div>
              </div>
              <button
                className="close-details-button"
                onClick={() => setShowSongDetails(false)}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="song-details-body">
              {/* Transpose Control */}
              <div className="transpose-control">
                <span>Transpose:</span>
                <select className="transpose-select">
                  <option>Original</option>
                  <option>+1</option>
                  <option>+2</option>
                  <option>-1</option>
                  <option>-2</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="view-toggle">
                <button
                  className={`toggle-button ${viewMode === 'chords' ? 'active' : ''}`}
                  onClick={() => setViewMode('chords')}
                >
                  🎵 Chords
                </button>
                <button
                  className={`toggle-button ${viewMode === 'lyrics' ? 'active' : ''}`}
                  onClick={() => setViewMode('lyrics')}
                >
                  📝 Lyrics
                </button>
              </div>

              {/* Section List */}
              <div className="sections-container">
                <h3 className="sections-title">
                  {viewMode === 'chords' ? 'Chords Structure' : 'Lyrics Structure'}
                </h3>
                <div className="sections-list">
                  {renderSectionOrder()}
                </div>
              </div>

              {/* Fallback: show all if no section order */}
              {(!selectedSong.sectionOrder || selectedSong.sectionOrder.length === 0) && (
                <div className="all-sections-container">
                  {viewMode === 'chords' ? (
                    <div className="all-chords">
                      <h3 className="all-chords-title">All Chords</h3>
                      {Object.keys(selectedSong.chords || {}).map(section => (
                        <div key={section} className="chord-item">
                          <strong>{section}:</strong>
                          <pre className="content-text">
                            {getSectionContent(selectedSong.chords, section)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="all-lyrics">
                      <h3 className="all-lyrics-title">All Lyrics</h3>
                      {Object.keys(selectedSong.lyrics || {}).map(section => (
                        <div key={section} className="lyric-item">
                          <strong>{section}:</strong>
                          <pre className="content-text">
                            {getSectionContent(selectedSong.lyrics, section)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHomePage = () => (
    <>
      {/* Search and Filter Section */}
      <div className="search-section">
        <div className="search-container">
          <div className="search-header">
            <h2 className="search-title">LOTN</h2>
            <p className="search-subtitle">Song Chords Collection</p>
          </div>

          <div className="search-controls">
            <div className="search-input-container">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search your favorite songs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-row">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Languages</option>
                {uniqueLanguages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Songs</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="results-count">
            Showing {filteredSongs.length} songs
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading hymn collection...</p>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">♪</span>
            <p className="empty-text">
              {searchTerm || selectedLanguage !== "all" || selectedType !== "all"
                ? "No hymns match your search"
                : "No hymns found"}
            </p>
          </div>
        ) : (
          <>
            <div className="songs-grid">
              {displayedSongs.map((song, index) => (
                <div
                  key={song.id}
                  className="song-card"
                  style={{
                    animationDelay: `${index * 0.1}s`
                  }}
                  onClick={() => handleViewSongDetails(song)}
                >
                  <h3 className="song-title">
                    {song.title}
                  </h3>

                  <div className="song-meta">
                    <span className="song-creator">{song.creator}</span>
                    <span className="song-language">{song.language}</span>
                    <span className="song-type">{song.type}</span>
                  </div>
                </div>
              ))}
            </div>

            {itemsToShow < filteredSongs.length && (
              <div className="see-more-container">
                <button
                  className="see-more-button"
                  onClick={() =>
                    setItemsToShow(prev =>
                      Math.min(prev + 8, filteredSongs.length)
                    )
                  }
                >
                  See More...
                </button>
              </div>
            )}

          </>
        )}
      </main>
    </>
  );

  const renderAlbumPage = () => (
    <div className="album-page">
      <div className="album-header">
        <h2 className="album-title">Albums</h2>
        <p className="album-subtitle">Browse hymns by collections</p>
      </div>
      <div className="album-content">
        <p className="coming-soon">Album view coming soon...</p>
      </div>
    </div>
  );

  return (
    <div className="app">
      {/* Wrap content in a container */}
      <div className="content-container">
        {/* Header */}
        <header className="header">
          <div className="header-container">
            <div className="header-content">
              <div className="logo-section">
                <div className="logo-icon">
                  <img src="/assets/logo.png" alt="LOTN Logo" className="logo-image" />
                </div>
                <div className="logo-text-container">
                  <h1 className="logo-text">LOTN</h1>
                  <span className="logo-subtitle">Song Chords Collection</span>
                </div>
              </div>

              <nav className="nav">
                <button
                  className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('home')}
                >
                  Home
                </button>
                <button
                  className={`nav-link ${currentPage === 'album' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('album')}
                >
                  Album
                </button>
                <button
                  className="add-song-button"
                  onClick={() => setShowAddModal(true)}
                >
                  + Add Song
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* Page Content */}
        {currentPage === 'home' ? renderHomePage() : renderAlbumPage()}

        {/* Song Details Modal */}
        {showSongDetails && renderSongDetails()}

        {/* Add Song Modal */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Create Song</h2>
                <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Song Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSong.title}
                    onChange={(e) => setNewSong(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter song title"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Creator</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSong.creator}
                    onChange={(e) => setNewSong(prev => ({ ...prev, creator: e.target.value }))}
                    placeholder="Enter creator name"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Language</label>
                    <select
                      className="form-select"
                      value={newSong.language}
                      onChange={(e) => setNewSong(prev => ({ ...prev, language: e.target.value }))}
                    >
                      <option value="English">English</option>
                      <option value="Tagalog">Tagalog</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select
                      className="form-select"
                      value={newSong.type}
                      onChange={(e) => setNewSong(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="Fast Song">Fast Song</option>
                      <option value="Slow Song">Slow Song</option>
                    </select>
                  </div>
                </div>

                {/* Chords Section Group */}
                <div className="section-group">
                  <div className="section-header">
                    <h3 className="section-title">Chords Section</h3>
                    <button
                      className="add-section-button"
                      onClick={() => handleAddSection('chords')}
                    >
                      + Add Section
                    </button>
                  </div>
                  {newSong.chords.map((chord, index) => (
                    <div key={index} className="section-item">
                      <div className="section-item-header">
                        {chord.section === "__custom__" ? (
                          <input
                            type="text"
                            className="section-input"
                            placeholder="Enter custom section name"
                            value={chord.customSection || ""}
                            onChange={e =>
                              handleSectionChange("chords", index, "customSection", e.target.value)
                            }
                            onBlur={() => {
                              setNewSong(prev => {
                                const updated = { ...prev };
                                const item = updated.chords[index];
                                item.section = item.customSection.trim();
                                delete item.customSection;
                                return updated;
                              });
                            }}
                          />
                        ) : (
                          <select
                            className="section-select"
                            value={chord.section}
                            onChange={e =>
                              handleSectionChange("chords", index, "section", e.target.value)
                            }
                          >
                            <option value="" disabled>Select section</option>
                            <option value="Intro">Intro</option>
                            <option value="Verse">Verse</option>
                            <option value="Pre Chorus">Pre Chorus</option>
                            <option value="Chorus">Chorus</option>
                            <option value="Bridge">Bridge</option>
                            <option value="Outro">Outro</option>
                            <option value="__custom__">Custom…</option>
                          </select>
                        )}
                        {newSong.chords.length > 1 && (
                          <button
                            className="remove-section-button"
                            onClick={() => handleRemoveSection("chords", index)}
                          >×</button>
                        )}
                      </div>
                      <textarea
                        className="section-textarea"
                        value={chord.content}
                        onChange={e =>
                          handleSectionChange("chords", index, "content", e.target.value)
                        }
                        placeholder="Enter chords..."
                        rows="3"
                      />
                    </div>
                  ))}
                </div>

                {/* Lyrics Section Group */}
                <div className="section-group">
                  <div className="section-header">
                    <h3 className="section-title">Lyrics Section</h3>
                    <button
                      className="add-section-button"
                      onClick={() => handleAddSection('lyrics')}
                    >
                      + Add Section
                    </button>
                  </div>
                  {newSong.lyrics.map((lyric, index) => (
                    <div key={index} className="section-item">
                      <div className="section-item-header">
                        {lyric.section === "__custom__" ? (
                          <input
                            type="text"
                            className="section-input"
                            placeholder="Enter custom section name"
                            value={lyric.customSection || ""}
                            onChange={e =>
                              handleSectionChange("lyrics", index, "customSection", e.target.value)
                            }
                            onBlur={() => {
                              setNewSong(prev => {
                                const updated = { ...prev };
                                const item = updated.lyrics[index];
                                item.section = item.customSection.trim();
                                delete item.customSection;
                                return updated;
                              });
                            }}
                          />
                        ) : (
                          <select
                            className="section-select"
                            value={lyric.section}
                            onChange={e =>
                              handleSectionChange("lyrics", index, "section", e.target.value)
                            }
                          >
                            <option value="" disabled>Select section</option>
                            <option value="Verse">Verse</option>
                            <option value="Verse 2">Verse 2</option>
                            <option value="Verse 3">Verse 3</option>
                            <option value="Pre Chorus">Pre Chorus</option>
                            <option value="Chorus">Chorus</option>
                            <option value="Bridge">Bridge</option>
                            <option value="Bridge 2">Bridge 2</option>
                            <option value="__custom__">Custom…</option>
                          </select>
                        )}
                        {newSong.lyrics.length > 1 && (
                          <button
                            className="remove-section-button"
                            onClick={() => handleRemoveSection("lyrics", index)}
                          >×</button>
                        )}
                      </div>
                      <textarea
                        className="section-textarea"
                        value={lyric.content}
                        onChange={e =>
                          handleSectionChange("lyrics", index, "content", e.target.value)
                        }
                        placeholder="Enter lyrics..."
                        rows="3"
                      />
                    </div>
                  ))}
                </div>

              </div>

              <div className="modal-footer">
                <button className="cancel-button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button className="save-button" onClick={handleSaveSong}>
                  Save Song
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <p className="footer-text">
              © {new Date().getFullYear()} Lord of the Nations - Commonwealth Chords Sheets. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;