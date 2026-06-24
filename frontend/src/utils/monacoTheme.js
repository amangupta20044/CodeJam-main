export function setupCodeJamMonacoTheme(monaco) {
  monaco.editor.defineTheme("codejam-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "71717a", fontStyle: "italic" },
      { token: "keyword", foreground: "818cf8" },
      { token: "string", foreground: "fbbf24" },
      { token: "number", foreground: "34d399" },
      { token: "type", foreground: "a5b4fc" },
      { token: "function", foreground: "f4f4f5" },
      { token: "variable", foreground: "e4e4e7" },
      { token: "constant", foreground: "34d399" },
      { token: "operator", foreground: "a1a1aa" },
    ],
    colors: {
      "editor.background": "#09090b",
      "editor.foreground": "#f4f4f5",
      "editor.lineHighlightBackground": "#18181b",
      "editorLineNumber.foreground": "#52525b",
      "editorLineNumber.activeForeground": "#a1a1aa",
      "editor.selectionBackground": "#6366f144",
      "editor.inactiveSelectionBackground": "#6366f122",
      "editorCursor.foreground": "#818cf8",
      "editorIndentGuide.background": "#27272a",
      "editorIndentGuide.activeBackground": "#3f3f46",
      "editorWidget.background": "#18181b",
      "editorWidget.border": "#27272a",
      "scrollbarSlider.background": "#3f3f4666",
      "scrollbarSlider.hoverBackground": "#52525b88",
    },
  });

  monaco.editor.setTheme("codejam-dark");
}
