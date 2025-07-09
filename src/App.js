import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
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
  const [viewMode, setViewMode] = useState("chords");
  const [newSong, setNewSong] = useState({
    title: "",
    creator: "",
    language: "English",
    type: "Fast Song",
    chords: [{ section: "Intro", content: "" }],
    lyrics: [{ section: "Verse", content: "" }]
  });

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editingSong, setEditingSong] = useState(null);

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
    setViewMode("chords");
    setShowSongDetails(true);
    setIsEditing(false); // Ensure edit mode is reset
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
    if (!newSong.title || !newSong.creator) {
      alert("Please fill in the song title and creator");
      return;
    }

    const payload = {
      title: newSong.title,
      creator: newSong.creator,
      language: newSong.language,
      type: newSong.type,
      chords: newSong.chords.reduce((acc, { section, content }) => {
        if (section) acc[section] = content;
        return acc;
      }, {}),
      lyrics: newSong.lyrics.reduce((acc, { section, content }) => {
        if (section) acc[section] = content;
        return acc;
      }, {}),
      sectionOrder: newSong.chords.map(({ section }) => section).filter(Boolean),
    };

    try {
      const docRef = await addDoc(collection(db, "songs"), payload);
      setSongs(prev => [...prev, { id: docRef.id, ...payload }]);
      setShowAddModal(false);
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

  // Edit functionality
  const handleEditSong = (song) => {
    const order = song.sectionOrder || [];

    const chords = order.map(section => ({
      section,
      content: song.chords?.[section] || ""
    }));

    // Only include lyrics if they exist
    const lyrics = song.lyrics
      ? Object.entries(song.lyrics).map(([section, content]) => ({ section, content }))
      : [];

    setIsEditing(true);
    setEditingSong({
      id: song.id,
      title: song.title,
      creator: song.creator,
      language: song.language,
      type: song.type,
      chords,
      lyrics,
      sectionOrder: [...order],
    });

    setShowSongDetails(false);
  };




  const handleUpdateSong = async () => {
    if (!editingSong.title || !editingSong.creator) {
      alert("Please fill in the song title and creator");
      return;
    }

    const payload = {
      title: editingSong.title,
      creator: editingSong.creator,
      language: editingSong.language,
      type: editingSong.type,
      chords: editingSong.chords.reduce((acc, { section, content }) => {
        if (section) acc[section] = content;
        return acc;
      }, {}),
      lyrics: editingSong.lyrics.reduce((acc, { section, content }) => {
        if (section) acc[section] = content;
        return acc;
      }, {}),
      // ** Preserve your original order array **
      sectionOrder: editingSong.sectionOrder.filter(s =>
        editingSong.chords.some(c => c.section === s)
      ),
    };

    try {
      await updateDoc(doc(db, "songs", editingSong.id), payload);
      // … rest of your state updates …
    } catch (error) {
      console.error(error);
      alert("Error updating song. Please try again.");
    }
  };

  const renderEditForm = () => {
    if (!editingSong) return null;

    const handleEditSectionChange = (type, index, field, value) => {
      setEditingSong(prev => ({
        ...prev,
        [type]: prev[type].map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      }));
    };

    const handleAddEditSection = (type) => {
      setEditingSong(prev => ({
        ...prev,
        [type]: [...prev[type], { section: "", content: "" }]
      }));
    };

    const handleRemoveEditSection = (type, index) => {
      setEditingSong(prev => ({
        ...prev,
        [type]: prev[type].filter((_, i) => i !== index)
      }));
    };

    return (
      <div className="edit-song-modal">
        <div className="edit-modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="edit-modal-content" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h2>Edit Song: {editingSong.title}</h2>
              <button className="close-edit-button" onClick={() => setIsEditing(false)}>
                ×
              </button>
            </div>

            <div className="edit-form-body">
              <div className="form-group">
                <label>Song Title</label>
                <input
                  type="text"
                  value={editingSong.title}
                  onChange={e => setEditingSong(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Creator</label>
                <input
                  type="text"
                  value={editingSong.creator}
                  onChange={e => setEditingSong(prev => ({ ...prev, creator: e.target.value }))}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Language</label>
                  <select
                    value={editingSong.language}
                    onChange={e => setEditingSong(prev => ({ ...prev, language: e.target.value }))}
                  >
                    <option value="English">English</option>
                    <option value="Tagalog">Tagalog</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={editingSong.type}
                    onChange={e => setEditingSong(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="Fast Song">Fast Song</option>
                    <option value="Slow Song">Slow Song</option>
                  </select>
                </div>
              </div>

              <div className="section-group">
                <div className="section-header">
                  <h3>Chords Sections</h3>
                  <button onClick={() => handleAddEditSection('chords')}>
                    + Add Section
                  </button>
                </div>
                {editingSong.chords.map((chord, index) => (
                  <div key={index} className="section-item">
                    <div className="section-item-header">
                      <input
                        type="text"
                        value={chord.section}
                        onChange={e => handleEditSectionChange('chords', index, 'section', e.target.value)}
                        placeholder="Section name"
                      />
                      {editingSong.chords.length > 1 && (
                        <button
                          className="remove-section-button"
                          onClick={() => handleRemoveEditSection('chords', index)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <textarea
                      value={chord.content}
                      onChange={e => handleEditSectionChange('chords', index, 'content', e.target.value)}
                      placeholder="Chords content..."
                      rows="3"
                    />
                  </div>
                ))}
              </div>

              <div className="section-group">
                <div className="section-header">
                  <h3>Lyrics Sections</h3>
                  <button onClick={() => handleAddEditSection('lyrics')}>
                    + Add Section
                  </button>
                </div>
                {editingSong.lyrics.map((lyric, index) => (
                  <div key={index} className="section-item">
                    <div className="section-item-header">
                      <input
                        type="text"
                        value={lyric.section}
                        onChange={e => handleEditSectionChange('lyrics', index, 'section', e.target.value)}
                        placeholder="Section name"
                      />
                      {editingSong.lyrics.length > 1 && (
                        <button
                          className="remove-section-button"
                          onClick={() => handleRemoveEditSection('lyrics', index)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <textarea
                      value={lyric.content}
                      onChange={e => handleEditSectionChange('lyrics', index, 'content', e.target.value)}
                      placeholder="Lyrics content..."
                      rows="3"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="cancel-button" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button className="save-button" onClick={handleUpdateSong}>
                Update Song
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSongDetails = () => {
    if (!selectedSong) return null;

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

    const renderSectionOrder = () => {
      if (!Array.isArray(selectedSong.sectionOrder) || selectedSong.sectionOrder.length === 0) {
        return <p className="no-section-order">No section order defined</p>;
      }

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
            <div className="song-details-header">
              <div className="song-info">
                <h2 className="song-details-title">{selectedSong.title}</h2>
                <div className="song-meta">
                  <span className="song-creator">By {selectedSong.creator}</span>
                  <span className="song-language">{selectedSong.language}</span>
                  <span className="song-type">{selectedSong.type}</span>
                </div>
              </div>
              <div className="header-buttons">
                {/* Edit Button */}
                <button className="edit-icon-button" onClick={() => handleEditSong(selectedSong)} aria-label="Edit">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>

                {/* Close Button */}
                <button className="close-details-button" onClick={() => setShowSongDetails(false)} aria-label="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>


            </div>

            <div className="song-details-body">
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

              <div className="sections-container">
                <h3 className="sections-title">
                  {viewMode === 'chords' ? 'Chords Structure' : 'Lyrics Structure'}
                </h3>
                <div className="sections-list">
                  {renderSectionOrder()}
                </div>
              </div>

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
      <div className="content-container">
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

        {currentPage === 'home' ? renderHomePage() : renderAlbumPage()}

        {showSongDetails && renderSongDetails()}
        {isEditing && renderEditForm()}

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