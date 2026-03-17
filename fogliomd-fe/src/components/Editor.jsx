import { useEditor, EditorContent } from "@tiptap/react";
import html2pdf from "html2pdf.js";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Link } from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { useRef, useState, useEffect } from "react";
import {
  Save, Trash2, FileDown, FolderOpen, ImagePlus,
  CheckSquare, Plus, Minus, LogOut, Table2,
  AlignLeft, AlignCenter, AlignRight, Highlighter,
  Link2, X, FileText
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import HamburgerMenu from "./HamburgerMenu";
import { apiFetch } from "../utils/api";
import "../App.css";

const Editor = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showTableInputs, setShowTableInputs] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [noteTitle, setNoteTitle] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [labels, setLabels] = useState([]);
  const [savingNote, setSavingNote] = useState(false);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [currentView, setCurrentView] = useState("editor"); // "editor" o "notes-list"
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [selectedLabelForNotes, setSelectedLabelForNotes] = useState(null);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const openMarkdownFileInputRef = useRef(null);
  const uploadImageFileInputRef = useRef(null);
  const colorPickerInputRef = useRef(null);

  // Load labels from backend
  const fetchLabels = async () => {
    try {
      const response = await apiFetch(`/labels`, {
        headers: { user: user?.email },
      });
      const data = await response.json();
      setLabels(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading labels:", err);
      toast.error("Error loading labels");
    }
  };

  useEffect(() => {
    fetchLabels();
    // Force scroll to top on mount (fixes iPhone viewport issue after login)
    window.scrollTo(0, 0);
  }, [user]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: true,
        link: false,
      }),
      Image.configure({
        allowBase64: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Markdown.configure({
        html: true,
        transformCopiedText: true,
        tightLists: true,
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
        lastColumnResizable: true,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: "",
    onUpdate: ({ editor }) => {

    },
  });

  // Funzione per inserire la tabella con Header attivo
  const addTable = () => {
    if (tableRows && tableCols) {
      editor
        .chain()
        .focus()
        .insertTable({
          rows: parseInt(tableRows),
          cols: parseInt(tableCols),
          withHeaderRow: true,
        })
        .insertContent("<p></p>")
        .run();
      setShowTableInputs(false);
      setShowTableMenu(false);
    }
  };

  const openMarkdown = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith(".md")) {
        toast.error("Please select a .md file");
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        editor.chain().focus().setContent(content, true).run();
      };
      reader.readAsText(file);
      localStorage.setItem("filename", file.name.replace(".md", ""));
    }
    event.target.value = "";
  };

  const exportAsMarkdown = () => {
    if (!editor) return;
    if (!noteTitle) return;

    try {
      const markdownContent = editor.storage.markdown.getMarkdown();
      const blob = new Blob(
        [markdownContent],
        { type: "text/markdown" },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${noteTitle}.md`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error("Error exporting note");
    }
  };

  const exportAsPDF = async () => {
    if (!editor) return;
    if (!noteTitle) {
      toast.error("Please insert a title for the note");
      return;
    }

    const htmlContent = editor.getHTML();

    // Create a temporary container for the PDF content
    const element = document.createElement("div");

    // Add styles and content
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
        <h1 style="color: #000; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">${noteTitle}</h1>
        <div class="pdf-content">
          ${htmlContent}
        </div>
      </div>
      <style>
        .pdf-content table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        .pdf-content th, .pdf-content td { border: 1px solid #ccc; padding: 10px; text-align: left; }
        .pdf-content th { background-color: #007bff; color: white; font-weight: bold; }
        .pdf-content ul[data-type="taskList"] { list-style: none; padding: 0; }
        .pdf-content ul[data-type="taskList"] li { display: flex; align-items: center; margin-bottom: 8px; }
        .pdf-content ul[data-type="taskList"] input[type="checkbox"] { margin-right: 10px; width: 16px; height: 16px; }
        .pdf-content img { max-width: 100%; height: auto; border-radius: 4px; margin: 10px 0; }
        .pdf-content blockquote { border-left: 4px solid #007bff; padding: 10px 20px; margin: 20px 0; background: #f9f9f9; font-style: italic; }
        .pdf-content pre { background: #f4f4f4; padding: 15px; border-radius: 6px; overflow-x: auto; font-family: monospace; white-space: pre-wrap; word-wrap: break-word; }
        .pdf-content code { background: #f4f4f4; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
      </style>
    `;

    const opt = {
      margin: 10,
      filename: `${noteTitle}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 4, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      toast.loading("Generating PDF...", { id: "pdf-gen" });
      await html2pdf().from(element).set(opt).save();
      toast.success("PDF exported successfully", { id: "pdf-gen" });
    } catch (error) {
      console.error(error);
      toast.error("Error exporting PDF", { id: "pdf-gen" });
    }
  };

  const resizeAndInsertImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      const img = new window.Image();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      img.onload = () => {
        const MAX_HEIGHT = 500;
        let { width, height } = img;

        if (height > MAX_HEIGHT) {
          const ratio = MAX_HEIGHT / height;
          height = MAX_HEIGHT;
          width = width * ratio;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        editor.view.focus();
        editor.chain().focus().setImage({ src: dataUrl }).run();
        resolve();
      };

      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    for (const file of files) {
      await resizeAndInsertImage(file);
    }

    event.target.value = "";
  };

  if (!editor) return null;

  const handleOpenMarkdownFileInputRef = () => {
    openMarkdownFileInputRef.current.click();
  };

  const handleUploadImageFileInputRef = () => {
    uploadImageFileInputRef.current.click();
  };

  const handleColorPickerInputRef = () => {
    colorPickerInputRef.current.click();
  }

  const addLink = () => {
    const url = window.prompt("Enter URL:");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed");
    }
  };

  const handleLabelSelectForNotes = async (label) => {
    // select both for list and dropdown
    setSelectedLabelForNotes(label);
    setSelectedLabel(label._id);
    setLoadingNotes(true);
    try {
      const response = await apiFetch(`/notes/by-label/${label._id}`, {
        headers: { user: user?.email },
      });
      if (!response.ok) {
        throw new Error("Error loading notes");
      }
      const data = await response.json();
      setFilteredNotes(Array.isArray(data) ? data : []);
      setCurrentView("notes-list");
    } catch (err) {
      console.error("Error loading notes:", err);
      toast.error("Error loading notes");
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleNoteSelect = (note) => {
    // Load note into editor
    setCurrentNoteId(note._id);
    setNoteTitle(note.title);
    // note.label potrebbe essere id o oggetto
    const labelId = note.label && note.label._id ? note.label._id : note.label;
    setSelectedLabel(labelId);
    editor.chain().focus().setContent(note.content, true).run();
    setCurrentView("editor");
  };

  const handleBackToEditor = () => {
    setCurrentView("editor");
    setFilteredNotes([]);
    setSelectedLabelForNotes(null);
    setSearchQuery("");
  };

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim().length > 2) {
      setLoadingNotes(true);
      try {
        const response = await apiFetch(`/notes?search=${encodeURIComponent(value)}`, {
          headers: { user: user?.email },
        });
        if (!response.ok) throw new Error("Error searching notes");
        const data = await response.json();
        setFilteredNotes(Array.isArray(data) ? data : []);
        setCurrentView("notes-list");
        setSelectedLabelForNotes({ name: `Search results for: "${value}"` });
      } catch (err) {
        console.error("Search error:", err);
        toast.error("Error searching notes");
      } finally {
        setLoadingNotes(false);
      }
    } else if (value.trim() === "") {
      handleBackToEditor();
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      const response = await apiFetch(`/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Error deleting note");

      toast.success("Note deleted");

      // refresh list
      if (selectedLabelForNotes) {
        handleLabelSelectForNotes(selectedLabelForNotes);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting note");
    }
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) {
      toast.error("Please insert a title for the note");
      return;
    }

    if (!selectedLabel) {
      toast.error("Please select a label");
      return;
    }

    const markdownContent = editor.storage.markdown.getMarkdown();
    if (markdownContent.trim() === "") {
      toast.error("Please insert some content");
      return;
    }

    if (!editor) return;

    setSavingNote(true);
    try {
      const url = currentNoteId
        ? `${import.meta.env.VITE_API_BASE_URL}/notes/${currentNoteId}`
        : `${import.meta.env.VITE_API_BASE_URL}/notes`;
      const method = currentNoteId ? "PUT" : "POST";
      const response = await apiFetch(url.replace(import.meta.env.VITE_API_BASE_URL, ""), {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: noteTitle,
          content: markdownContent,
          label: selectedLabel,
          user: user?.email,
        }),
      });

      if (!response.ok) {
        throw new Error("Error saving note");
      }

      toast.success(currentNoteId ? "Note updated" : "Note created");

      setNoteTitle("");
      setSelectedLabel("");
      setCurrentNoteId(null);
      editor.chain().focus().clearContent().run();
      localStorage.clear();
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Error saving note");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="App-wrapper">
      <header className="main-header">
        <div className="header-content">
          <div className="header-left">
            <HamburgerMenu
              onLabelSelect={handleLabelSelectForNotes}
              selectedLabelId={selectedLabel}
              labels={labels}
              onLabelsChange={fetchLabels}
            />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={handleSearch}
              className="search-input-header"
            />
            {currentView === "notes-list" && selectedLabelForNotes && (
              <button
                onClick={handleBackToEditor}
                className="back-btn"
                title="Back to editor"
              >
                ←
              </button>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="logout-btn"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="editor-container">
        {currentView === "editor" ? (
          <>
            <div className="note-metadata">
              <div className="metadata-group">
                <input
                  type="text"
                  placeholder="Note title..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="note-title-input"
                />
                <select
                  value={selectedLabel}
                  onChange={(e) => setSelectedLabel(e.target.value)}
                  className="note-label-select"
                >
                  <option value="">Select a label...</option>
                  {labels.filter((label) => label.name.toLowerCase() !== "trash").length === 0 && (
                    <option value="" disabled>Click ☰ to create</option>
                  )}
                  {labels
                    .filter((label) => label.name.toLowerCase() !== "trash")
                    .map((label) => (
                      <option key={label._id} value={label._id}>
                        {label.name}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote || !noteTitle.trim() || !selectedLabel}
                  className="save-note-btn"
                  title="Save note to database"
                >
                  {savingNote ? "Saving..." : <><Save size={14} /> Save</>}
                </button>
              </div>
            </div>
            <div className="toolbar-wrapper">
              <div className="toolbar">
                <div className="toolbar-group">
                  <button
                    title="Bold"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`custom-button ${editor.isActive("bold") ? "is-active" : ""}`}
                  >
                    B
                  </button>
                  <button
                    title="Italic"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`custom-button ${editor.isActive("italic") ? "is-active" : ""}`}
                  >
                    I
                  </button>
                  <button
                    title="Heading 1"
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                    className="custom-button"
                  >
                    H1
                  </button>
                  <button
                    type="button"
                    className="custom-button"
                    title="Text color"
                    onClick={handleColorPickerInputRef}
                  >
                    <input
                      type="color"
                      onInput={(event) =>
                        editor.chain().focus().setColor(event.target.value).run()
                      }
                      value={editor.getAttributes("textStyle").color || "#000000"}
                      title="Text Color"
                    />
                  </button>
                  <button
                    title="Task List"
                    onClick={() => editor.chain().focus().toggleTaskList().run()}
                    className={`custom-button ${editor.isActive("taskList") ? "is-active" : ""}`}
                  >
                    <CheckSquare size={16} />
                  </button>
                  <button
                    title="Code Block"
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={`custom-button ${editor.isActive("codeBlock") ? "is-active" : ""}`}
                  >
                    {"</>"}
                  </button>
                  <button
                    title="Bullet List"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className="custom-button"
                  >
                    (•)
                  </button>
                  <button
                    type="button"
                    className="custom-button"
                    title="Upload Image"
                    onClick={handleUploadImageFileInputRef}
                  >
                    <ImagePlus size={16} />
                    <input
                      type="file"
                      ref={uploadImageFileInputRef}
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: "none" }}
                    />
                  </button>
                  <button
                    className="custom-button"
                    onClick={() =>
                      editor.chain().focus().setTextAlign("left").run()
                    }
                    title="Align to Left"
                  >
                    <AlignLeft size={16} />
                  </button>
                  <button
                    className="custom-button"
                    onClick={() =>
                      editor.chain().focus().setTextAlign("center").run()
                    }
                    title="Align to Center"
                  >
                    <AlignCenter size={16} />
                  </button>
                  <button
                    className="custom-button"
                    onClick={() =>
                      editor.chain().focus().setTextAlign("right").run()
                    }
                    title="Align to Right"
                  >
                    <AlignRight size={16} />
                  </button>
                  <button
                    title="Mark"
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    className={`custom-button ${editor.isActive("highlight") ? "is-active" : ""}`}
                  >
                    <Highlighter size={16} />
                  </button>
                  <button
                    onClick={addLink}
                    className={`custom-button ${editor.isActive("link") ? "is-active" : ""}`}
                    title="Add Link"
                  >
                    <Link2 size={16} />
                  </button>
                  <button
                    className={`custom-button ${showTableMenu ? "is-active" : ""}`}
                    onClick={() => { setShowTableMenu(true); }}
                    title="Table Management"
                  >
                    <Table2 size={16} /> Table
                  </button>
                  <button
                    type="button"
                    className="custom-button"
                    title="Open Markdown"
                    onClick={handleOpenMarkdownFileInputRef}
                  >
                    <FolderOpen size={16} /> Open.md
                    <input
                      type="file"
                      ref={openMarkdownFileInputRef}
                      accept=".md"
                      onChange={openMarkdown}
                      style={{ display: "none" }}
                    />
                  </button>
                  <button onClick={exportAsMarkdown} className="custom-button" title="Export as Markdown">
                    <FileDown size={16} /> Export.md
                  </button>
                  <button onClick={exportAsPDF} className="custom-button" title="Export as PDF">
                    <FileText size={16} /> PDF
                  </button>
                  <button
                    title="Clear"
                    onClick={() => {
                      editor.commands.clearContent();
                      localStorage.clear();
                    }}
                    className="delete-btn custom-button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div
              className="editor-content"
              onClick={() => editor?.commands.focus()}
            >
              <EditorContent editor={editor} />
            </div>

            {showTableMenu && (
              <div className="table-modal-overlay" onClick={() => { setShowTableMenu(false); setShowTableInputs(false); }}>
                <div className="table-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="table-modal-header">
                    <h3>Table Menu</h3>
                    <button className="table-modal-close" onClick={() => { setShowTableMenu(false); setShowTableInputs(false); }}>
                      <X size={16} color="#ffffff" />
                    </button>
                  </div>
                  <div className="table-modal-body">
                    <button
                      className="custom-button"
                      onClick={() => setShowTableInputs(!showTableInputs)}
                    >
                      <Plus size={14} /> New Table
                    </button>

                    {showTableInputs && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '8px', backgroundColor: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '13px', color: '#555' }}>Rows:</label>
                          <input
                            type="number"
                            min="1"
                            value={tableRows}
                            onChange={(e) => setTableRows(e.target.value)}
                            style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '13px', color: '#555' }}>Columns:</label>
                          <input
                            type="number"
                            min="1"
                            value={tableCols}
                            onChange={(e) => setTableCols(e.target.value)}
                            style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                          />
                        </div>
                        <button
                          onClick={addTable}
                          style={{ marginTop: '4px', padding: '6px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
                        >
                          Confirm
                        </button>
                      </div>
                    )}

                    {editor.isActive("table") && (
                      <>
                        <button
                          className="delete-text custom-button"
                          onClick={() => {
                            editor.chain().focus().deleteTable().run();
                            setShowTableMenu(false);
                          }}
                        >
                          <Table2 size={14} /> Delete Table
                        </button>
                        <div className="dropdown-divider"></div>
                        <div className="table-modal-row">
                          <button
                            className="custom-button"
                            onClick={() =>
                              editor.chain().focus().addColumnAfter().run()
                            }
                          >
                            <Plus size={14} /> Column
                          </button>
                          <button
                            className="delete-text custom-button"
                            onClick={() =>
                              editor.chain().focus().deleteColumn().run()
                            }
                          >
                            <X size={14} /> Column
                          </button>
                        </div>
                        <div className="table-modal-row">
                          <button
                            className="custom-button"
                            onClick={() =>
                              editor.chain().focus().addRowAfter().run()
                            }
                          >
                            <Plus size={14} /> Row
                          </button>
                          <button
                            className="delete-text custom-button"
                            onClick={() =>
                              editor.chain().focus().deleteRow().run()
                            }
                          >
                            <X size={14} /> Row
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="notes-list-view">
            <h2>{selectedLabelForNotes?.name}</h2>
            {loadingNotes && <p className="loading">Loading notes...</p>}
            {!loadingNotes && filteredNotes.length === 0 && (
              <p className="empty">No notes found for this label</p>
            )}
            {!loadingNotes && filteredNotes.length > 0 && (
              <div className="notes-grid">
                {filteredNotes.map((note) => (
                  <div
                    key={note._id}
                    className="note-card"
                  >
                    <div className="note-header" onClick={() => handleNoteSelect(note)}>
                      <h3 className="note-title">{note.title}</h3>
                      <p className="note-date">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      className="delete-note-btn"
                      onClick={() => handleDeleteNote(note._id)}
                      title="Delete note"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Editor;
