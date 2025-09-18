import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface SimpleMonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onWikiLinkClick?: (linkText: string) => void;
}

export const SimpleMonacoEditor: React.FC<SimpleMonacoEditorProps> = ({
  value,
  onChange,
  onWikiLinkClick
}) => {
  const handleChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  };

  return (
    <div className="h-full">
      <Editor
        height="100%"
        defaultLanguage="markdown"
        theme="vs-dark"
        value={value}
        onChange={handleChange}
        options={{
          minimap: { enabled: false },
          wordWrap: 'on',
          lineNumbers: 'on',
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, "Courier New", monospace',
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          renderWhitespace: 'none',
          guides: {
            indentation: false
          }
        }}
      />
    </div>
  );
};