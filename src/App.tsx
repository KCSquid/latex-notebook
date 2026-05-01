import React, { useState, useEffect, useRef } from "react";
import "mathlive";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        onInput?: (e: any) => void;
        onFocus?: (e: any) => void;
        onBlur?: (e: any) => void;
      };
    }
  }
}

type RowMode = "math" | "text";

interface NotebookRow {
  id: string;
  type: "math" | "separator";
  mode: RowMode;
  content: string;
  label?: string;
}

const App: React.FC = () => {
  const [title, setTitle] = useState("Untitled Notebook");
  const [rows, setRows] = useState<NotebookRow[]>([
    {
      id: crypto.randomUUID(),
      type: "math",
      mode: "math",
      content: "",
      label: "",
    },
  ]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  const detectMode = (value: string): RowMode => {
    return value.includes("\\txt") ? "text" : "math";
  };

  const stripTxt = (value: string) => {
    return value.replace("\\txt", "").trimStart();
  };

  const isEffectivelyEmpty = (row: NotebookRow) => {
    if (row.mode === "text") {
      return stripTxt(row.content).trim() === "";
    }
    return row.content.trim() === "";
  };

  useEffect(() => {
    if (!focusedId) return;
    const el = fieldRefs.current[focusedId] as any;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus?.();
    });
  }, [rows]);

  const addMathRow = (index: number, isSeparator: boolean = false) => {
    const newId = crypto.randomUUID();
    const newRows = [...rows];

    const newEntry: NotebookRow = {
      id: newId,
      type: "math",
      content: "",
      label: "",
      mode: "math",
    };

    if (isSeparator) {
      const sepId = crypto.randomUUID();
      newRows.splice(
        index + 1,
        0,
        { id: sepId, type: "separator", content: "", mode: "math" },
        newEntry,
      );
    } else {
      newRows.splice(index + 1, 0, newEntry);
    }

    setRows(newRows);
    setFocusedId(newId);
  };

  const deleteRow = (index: number) => {
    if (rows.length <= 1) return;

    let newRows = [...rows];
    newRows.splice(index, 1);

    newRows = newRows.filter((row, i) => {
      if (row.type === "separator") {
        const nextRow = newRows[i + 1];
        return nextRow && nextRow.type === "math";
      }
      return true;
    });

    const nextFocusIndex = Math.max(0, index - 1);
    const nextId = newRows[nextFocusIndex]?.id;

    setRows(newRows);
    setFocusedId(nextId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addMathRow(index, false);
    } else if (e.ctrlKey && e.key === "b") {
      e.preventDefault();
      addMathRow(index, true);
    } else if (
      e.key === "Backspace" &&
      isEffectivelyEmpty(rows[index]) &&
      rows.length > 1
    ) {
      e.preventDefault();
      deleteRow(index);
    }
  };

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <div style={styles.titleContainer}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.titleInput}
          />
          <div style={styles.underline} />
        </div>
        <div style={styles.nav}>
          <label style={styles.navLink}>
            IMPORT
            <input
              type="file"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const data = JSON.parse(ev.target?.result as string);
                  setTitle(data.title);
                  setRows(data.rows);
                };
                reader.readAsText(file);
              }}
            />
          </label>
          <button
            style={styles.navLink}
            onClick={() => {
              const data = JSON.stringify({ title, rows });
              const blob = new Blob([data], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "notebook.json";
              a.click();
            }}
          >
            EXPORT
          </button>
        </div>
      </header>

      <main ref={containerRef} style={styles.container}>
        {rows.map((row, index) => (
          <div key={row.id} style={{ width: "100%" }}>
            {row.type === "separator" ? (
              <hr style={styles.separator} />
            ) : (
              <div
                style={{
                  ...styles.mathCard,
                  borderColor: focusedId === row.id ? "#4285f4" : "#eee",
                  boxShadow:
                    focusedId === row.id
                      ? "0 4px 12px rgba(66, 133, 244, 0.15)"
                      : "0 2px 8px rgba(0,0,0,0.04)",
                  transform: focusedId === row.id ? "scale(1.01)" : "scale(1)",
                }}
              >
                <input
                  placeholder="#"
                  style={styles.rowNumberInput}
                  value={row.label || ""}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.id === row.id ? { ...r, label: e.target.value } : r,
                      ),
                    )
                  }
                />
                {row.mode === "text" ? (
                  <textarea
                    ref={(el) => {
                      fieldRefs.current[row.id] = el;
                      if (el) {
                        el.style.height = "0";
                        el.style.height = el.scrollHeight + "px";
                      }
                    }}
                    style={styles.textArea}
                    value={stripTxt(row.content)}
                    onChange={(e) => {
                      const raw = "\\txt " + e.target.value;
                      setRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id
                            ? { ...r, content: raw, mode: "text" }
                            : r,
                        ),
                      );
                      const el = fieldRefs.current[row.id];
                      if (el) {
                        el.style.height = "0";
                        el.style.height = el.scrollHeight + "px";
                      }
                    }}
                    onKeyDown={(e) => handleKeyDown(e, row.id, index)}
                    onFocus={() => setFocusedId(row.id)}
                    onBlur={() => setFocusedId(null)}
                  />
                ) : (
                  <math-field
                    ref={(el) => (fieldRefs.current[row.id] = el)}
                    style={styles.mathField}
                    value={row.content}
                    onInput={(e: any) => {
                      const value = e.target.value;
                      const newMode = detectMode(value);
                      setRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id
                            ? { ...r, content: value, mode: newMode }
                            : r,
                        ),
                      );
                    }}
                    onKeyDown={(e: any) => handleKeyDown(e, row.id, index)}
                    onFocus={() => setFocusedId(row.id)}
                    onBlur={() => setFocusedId(null)}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </main>

      <footer style={styles.footer}>
        ENTER FOR NEW ROW BELOW • CTRL + B FOR NEW PAGE • BACKSPACE EMPTY ROW TO
        DELETE
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    backgroundColor: "#f8f9fa",
    minHeight: "100vh",
    padding: "40px 20px",
  },
  header: {
    maxWidth: "800px",
    margin: "0 auto 30px auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: { display: "flex", flexDirection: "column" },
  titleInput: {
    fontSize: "28px",
    fontWeight: 400,
    border: "none",
    background: "transparent",
    outline: "none",
    color: "#444",
    width: "450px",
    fontFamily: '"Times New Roman", serif',
  },
  underline: {
    height: "3px",
    width: "45px",
    backgroundColor: "#4285f4",
    marginTop: "4px",
  },
  nav: { display: "flex", gap: "24px" },
  navLink: {
    fontSize: "12px",
    color: "#aaa",
    cursor: "pointer",
    border: "none",
    background: "none",
    letterSpacing: "1px",
    fontWeight: 500,
  },
  container: {
    maxWidth: "750px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  mathCard: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "10px 20px",
    display: "flex",
    alignItems: "center",
    border: "2px solid transparent",
    position: "relative",
    transition: "all 0.2s ease-in-out",
  },
  rowNumberInput: {
    fontSize: "11px",
    color: "#999",
    border: "none",
    background: "transparent",
    width: "100%",
    position: "absolute",
    top: "10px",
    left: "15px",
    paddingRight: "30px",
    outline: "none",
  },
  mathField: {
    width: "100%",
    border: "none",
    fontSize: "20px",
    padding: "20px 0px 10px 0px",
    background: "transparent",
    outline: "none",
  },
  separator: {
    border: "none",
    borderTop: "1px solid #e0e4e8",
    margin: "15px 0",
  },
  footer: {
    textAlign: "center",
    fontSize: "10px",
    color: "#ccd",
    marginTop: "25px",
    letterSpacing: "2px",
  },
  textArea: {
    width: "100%",
    border: "none",
    fontSize: "20px",
    padding: "20px 0px 10px 0px",
    background: "transparent",
    outline: "none",
    resize: "vertical",
    fontFamily: '"Times New Roman", serif',
  },
};

export default App;
