import React, { useEffect, useRef, useCallback } from 'react';
import { EditorView, ViewUpdate, keymap, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { EditorState, Extension, StateField, RangeSetBuilder } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting, HighlightStyle, syntaxTree } from '@codemirror/language';
import { tags } from '@lezer/highlight';

interface TrueObsidianStyleEditorProps {
  value: string;
  onChange: (value: string) => void;
  onWikiLinkClick?: (linkText: string) => void;
}

// Widget for bold text - replaces **text** with styled bold
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

// Widget for italic text - replaces *text* with styled italic
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

// Widget for headers - replaces # Header with styled header
class HeaderWidget extends WidgetType {
  constructor(private text: string, private level: number) {
    super();
  }

  toDOM() {
    const header = document.createElement(`h${this.level}`);
    const classes = {
      1: 'text-2xl font-bold text-white border-b border-gray-600 pb-2 mb-2',
      2: 'text-xl font-bold text-white border-b border-gray-700 pb-1 mb-2',
      3: 'text-lg font-bold text-white mb-2',
      4: 'text-base font-bold text-white mb-2',
      5: 'text-sm font-bold text-white mb-1',
      6: 'text-xs font-bold text-white mb-1'
    };
    header.className = classes[this.level as keyof typeof classes] || classes[3];
    header.textContent = this.text;
    return header;
  }
}

// Widget for inline code - replaces `code` with styled code
class InlineCodeWidget extends WidgetType {
  constructor(private text: string) {
    super();
  }

  toDOM() {
    const code = document.createElement('code');
    code.className = 'bg-gray-800 text-orange-300 px-1 py-0.5 rounded text-sm font-mono';
    code.textContent = this.text;
    return code;
  }
}

// Widget for wiki links - replaces [[link]] with clickable link
class WikiLinkWidget extends WidgetType {
  constructor(private text: string, private onWikiLinkClick?: (linkText: string) => void) {
    super();
  }

  toDOM() {
    const link = document.createElement('span');
    link.className = 'text-orange-400 hover:text-orange-300 cursor-pointer underline decoration-orange-500/50 hover:decoration-orange-400 transition-colors';
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

// The key: Live preview decorations that only apply to non-active lines
const livePreviewDecorations = (onWikiLinkClick?: (text: string) => void) => StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    if (!tr.docChanged && !tr.selection) {
      return decorations;
    }

    const doc = tr.state.doc;
    const selection = tr.state.selection.main;
    const activeLine = doc.lineAt(selection.head).number;
    
    const builder = new RangeSetBuilder<Decoration>();
    
    try {
      // Parse syntax tree for markdown elements
      syntaxTree(tr.state).iterate({
        enter: (node) => {
          const from = node.from;
          const to = node.to;
          const text = doc.sliceString(from, to);
          const line = doc.lineAt(from).number;
          
          // CRITICAL: Only apply decorations to lines that are NOT being edited
          if (line === activeLine) {
            return;
          }
          
          // Apply decorations based on markdown element type
          switch (node.type.name) {
            case 'StrongEmphasis':
              const boldMatch = text.match(/^\*\*(.*?)\*\*$/);
              if (boldMatch && boldMatch[1]) {
                builder.add(from, to, Decoration.replace({
                  widget: new BoldWidget(boldMatch[1])
                }));
              }
              break;
              
            case 'Emphasis':
              const italicMatch = text.match(/^\*(.*?)\*$/);
              if (italicMatch && italicMatch[1]) {
                builder.add(from, to, Decoration.replace({
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
              const level = parseInt(node.type.name.slice(-1));
              const headingMatch = text.match(/^#{1,6}\s+(.+)$/);
              if (headingMatch && headingMatch[1]) {
                builder.add(from, to, Decoration.replace({
                  widget: new HeaderWidget(headingMatch[1], level)
                }));
              }
              break;
              
            case 'InlineCode':
              const codeMatch = text.match(/^`(.*?)`$/);
              if (codeMatch && codeMatch[1]) {
                builder.add(from, to, Decoration.replace({
                  widget: new InlineCodeWidget(codeMatch[1])
                }));
              }
              break;
          }
          
          // Handle wiki links (they may not be in syntax tree)
          if (text.includes('[[') && text.includes(']]')) {
            const wikiMatches = Array.from(text.matchAll(/\[\[(.*?)\]\]/g));
            for (const match of wikiMatches) {
              if (match[1] && match.index !== undefined) {
                const start = from + match.index;
                const end = start + match[0].length;
                builder.add(start, end, Decoration.replace({
                  widget: new WikiLinkWidget(match[1], onWikiLinkClick)
                }));
              }
            }
          }
        }
      });
    } catch (error) {
      console.debug('Decoration error:', error);
    }
    
    return builder.finish();
  },
  provide: f => EditorView.decorations.from(f)
});

// Clean theme focused on readability
const obsidianTheme = EditorView.theme({
  '.cm-line': {
    padding: '2px 0',
    lineHeight: '1.6'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
  },
  '.cm-focused .cm-activeLine': {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
  },
  '.cm-content': {
    padding: '16px',
    minHeight: '100%',
    fontSize: '15px',
    lineHeight: '1.6',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif'
  },
  '.cm-editor': {
    height: '100%'
  },
  '.cm-focused': {
    outline: 'none'
  },
  '.cm-scroller': {
    fontFamily: 'inherit'
  }
});

// Custom highlight style for raw markdown syntax
const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: '#fb923c', fontSize: '1.5em', fontWeight: 'bold' },
  { tag: tags.heading2, color: '#fb923c', fontSize: '1.3em', fontWeight: 'bold' },
  { tag: tags.heading3, color: '#fb923c', fontSize: '1.1em', fontWeight: 'bold' },
  { tag: tags.strong, color: '#ffffff', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#ffffff', fontStyle: 'italic' },
  { tag: tags.link, color: '#fb923c', textDecoration: 'underline' },
  { tag: tags.monospace, color: '#fb923c', backgroundColor: '#374151', padding: '2px 4px', borderRadius: '3px' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
]);

export const TrueObsidianStyleEditor: React.FC<TrueObsidianStyleEditorProps> = ({
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
    
    const extensions: Extension[] = [
      markdown({
        base: markdownLanguage,
        codeLanguages: []
      }),
      history(),
      autocompletion(),
      closeBrackets(),
      highlightSelectionMatches(),
      syntaxHighlighting(markdownHighlightStyle),
      livePreviewDecorations(onWikiLinkClick),
      obsidianTheme,
      oneDark,
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...completionKeymap
      ]),
      EditorView.updateListener.of(updateListener),
    ];
    
    const startState = EditorState.create({
      doc: value,
      extensions
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
  
  // Update content when prop changes
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