import React, { useEffect, useRef, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { markdown } from '@codemirror/lang-markdown';
import { 
  Decoration, 
  DecorationSet, 
  ViewPlugin, 
  WidgetType,
  ViewUpdate
} from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';

interface CodeMirrorObsidianEditorProps {
  value: string;
  onChange: (value: string) => void;
  onWikiLinkClick?: (linkText: string) => void;
}

// Widget for rendering bold text
class BoldWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement('strong');
    span.className = 'text-white font-bold';
    span.textContent = this.text;
    return span;
  }
}

// Widget for rendering italic text
class ItalicWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement('em');
    span.className = 'text-white italic';
    span.textContent = this.text;
    return span;
  }
}

// Widget for rendering headers
class HeaderWidget extends WidgetType {
  constructor(private text: string, private level: number) {
    super();
  }

  toDOM() {
    const header = document.createElement(`h${this.level}`);
    const classes = {
      1: 'text-2xl font-bold text-white border-b border-gray-600 pb-2 mt-2 mb-4',
      2: 'text-xl font-bold text-white border-b border-gray-700 pb-1 mt-2 mb-3',
      3: 'text-lg font-bold text-white mt-2 mb-2',
      4: 'text-base font-bold text-white mt-2 mb-2',
      5: 'text-sm font-bold text-white mt-1 mb-1',
      6: 'text-xs font-bold text-white mt-1 mb-1'
    };
    header.className = classes[this.level as keyof typeof classes] || classes[3];
    header.textContent = this.text;
    return header;
  }
}

// Widget for rendering wiki links
class WikiLinkWidget extends WidgetType {
  constructor(private text: string, private onWikiLinkClick?: (linkText: string) => void) {
    super();
  }

  toDOM() {
    const link = document.createElement('span');
    link.className = 'text-orange-400 hover:text-orange-300 cursor-pointer underline decoration-orange-500/50 hover:decoration-orange-400 transition-all duration-200';
    link.textContent = this.text;
    link.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.onWikiLinkClick) {
        this.onWikiLinkClick(this.text);
      }
    };
    return link;
  }
}

// Widget for rendering code blocks
class CodeBlockWidget extends WidgetType {
  constructor(private code: string) {
    super();
  }

  toDOM() {
    const pre = document.createElement('pre');
    pre.className = 'bg-gray-800 p-4 rounded-lg overflow-x-auto my-2';
    const code = document.createElement('code');
    code.className = 'text-sm font-mono text-gray-100';
    code.textContent = this.code;
    pre.appendChild(code);
    return pre;
  }
}

// Live preview plugin that decorates markdown elements
const livePreviewPlugin = (onWikiLinkClick?: (linkText: string) => void) => ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      const doc = view.state.doc;
      const cursorPos = view.state.selection.main.head;
      const cursorLine = doc.lineAt(cursorPos).number;

      syntaxTree(view.state).iterate({
        enter: (node) => {
          const nodeStart = node.from;
          const nodeEnd = node.to;
          const nodeText = doc.sliceString(nodeStart, nodeEnd);
          const nodeLine = doc.lineAt(nodeStart).number;

          // Don't render decorations on the line being edited
          if (nodeLine === cursorLine) {
            return;
          }

          try {
            switch (node.type.name) {
              case 'StrongEmphasis':
                // Handle **bold** text
                const boldMatch = nodeText.match(/^\*\*(.*)\*\*$/);
                if (boldMatch) {
                  builder.add(nodeStart, nodeEnd, Decoration.replace({
                    widget: new BoldWidget(boldMatch[1])
                  }));
                }
                break;

              case 'Emphasis':
                // Handle *italic* text
                const italicMatch = nodeText.match(/^\*(.*)\*$/);
                if (italicMatch) {
                  builder.add(nodeStart, nodeEnd, Decoration.replace({
                    widget: new ItalicWidget(italicMatch[1])
                  }));
                }
                break;

              case 'ATXHeading1':
              case 'ATXHeading2':
              case 'ATXHeading3':
              case 'ATXHeading4':
              case 'ATXHeading5':
              case 'ATXHeading6':
                // Handle # headers
                const level = parseInt(node.type.name.slice(-1));
                const headerMatch = nodeText.match(/^#{1,6}\s+(.+)$/);
                if (headerMatch) {
                  builder.add(nodeStart, nodeEnd, Decoration.replace({
                    widget: new HeaderWidget(headerMatch[1], level)
                  }));
                }
                break;

              case 'InlineCode':
                // Handle `inline code`
                const codeMatch = nodeText.match(/^`(.*)`$/);
                if (codeMatch) {
                  builder.add(nodeStart, nodeEnd, Decoration.mark({
                    class: 'bg-gray-800 text-orange-300 px-1 py-0.5 rounded text-sm font-mono'
                  }));
                }
                break;

              case 'FencedCode':
                // Handle ```code blocks```
                const codeBlockMatch = nodeText.match(/^```[\w]*\n?([\s\S]*?)\n?```$/);
                if (codeBlockMatch) {
                  builder.add(nodeStart, nodeEnd, Decoration.replace({
                    widget: new CodeBlockWidget(codeBlockMatch[1])
                  }));
                }
                break;

              // Handle wiki links [[link]]
              case 'Link':
                const wikiMatch = nodeText.match(/^\[\[(.*?)\]\]$/);
                if (wikiMatch) {
                  builder.add(nodeStart, nodeEnd, Decoration.replace({
                    widget: new WikiLinkWidget(wikiMatch[1], onWikiLinkClick)
                  }));
                }
                break;
            }
          } catch (error) {
            // Silently continue if decoration fails
            console.debug('Decoration error:', error);
          }
        }
      });

      return builder.finish();
    }
  },
  {
    decorations: v => v.decorations
  }
);

export const CodeMirrorObsidianEditor: React.FC<CodeMirrorObsidianEditorProps> = ({
  value,
  onChange,
  onWikiLinkClick
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const updateListener = useCallback((update: ViewUpdate) => {
    if (update.docChanged) {
      const doc = update.state.doc;
      const value = doc.toString();
      onChange(value);
    }
  }, [onChange]);

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
livePreviewPlugin(onWikiLinkClick),
        EditorView.updateListener.of(updateListener),
        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '14px'
          },
          '.cm-focused': {
            outline: 'none'
          },
          '.cm-editor': {
            height: '100%'
          },
          '.cm-scroller': {
            fontFamily: 'inherit',
            lineHeight: '1.6'
          },
          '.cm-content': {
            padding: '1rem',
            minHeight: '100%'
          },
          '.cm-line': {
            padding: '2px 0'
          },
          // Style the cursor line to show markdown syntax
          '.cm-activeLine': {
            backgroundColor: 'rgba(251, 146, 60, 0.1)'
          }
        })
      ]
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update editor content when prop changes
  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value
        }
      });
    }
  }, [value]);

  return (
    <div className="h-full">
      <div ref={editorRef} className="h-full" />
    </div>
  );
};