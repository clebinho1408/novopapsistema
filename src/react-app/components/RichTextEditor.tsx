import { useEffect, useRef } from 'react';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export default function RichTextEditor({ value, onChange, placeholder = '', height = 200 }: RichTextEditorProps) {
  const quillRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let quill: any = null;

    const initializeQuill = async () => {
      if (typeof window !== 'undefined') {
        // const { default: ReactQuill } = await import('react-quill');
        const { default: Quill } = await import('quill');

        // Custom toolbar configuration
        const toolbarOptions = [
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'font': [] }],
          [{ 'size': ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          [{ 'align': [] }],
          ['link', 'blockquote'],
          ['clean']
        ];

        const modules = {
          toolbar: toolbarOptions,
        };

        const formats = [
          'header', 'font', 'size',
          'bold', 'italic', 'underline', 'strike',
          'color', 'background',
          'list', 'bullet', 'indent',
          'link', 'blockquote', 'align'
        ];

        if (containerRef.current && !quillRef.current) {
          // const QuillComponent = ReactQuill as any;
          
          // Create a temporary container to render ReactQuill
          const tempContainer = document.createElement('div');
          containerRef.current.appendChild(tempContainer);

          // Initialize Quill directly
          quill = new Quill(tempContainer, {
            theme: 'snow',
            modules,
            formats,
            placeholder
          });

          quill.root.style.height = `${height - 42}px`; // Subtract toolbar height
          quill.root.style.fontSize = '14px';
          quill.root.style.fontFamily = 'Inter, system-ui, sans-serif';

          // Set initial value
          if (value) {
            quill.clipboard.dangerouslyPasteHTML(value);
          }

          // Handle changes
          quill.on('text-change', () => {
            const html = quill.root.innerHTML;
            onChange(html === '<p><br></p>' ? '' : html);
          });

          quillRef.current = quill;
        }
      }
    };

    initializeQuill();

    return () => {
      if (quillRef.current) {
        quillRef.current = null;
      }
    };
  }, []);

  // Update content when value prop changes
  useEffect(() => {
    if (quillRef.current && value !== quillRef.current.root.innerHTML) {
      const selection = quillRef.current.getSelection();
      quillRef.current.clipboard.dangerouslyPasteHTML(value || '');
      if (selection) {
        quillRef.current.setSelection(selection);
      }
    }
  }, [value]);

  return (
    <div className="rich-text-editor">
      <div 
        ref={containerRef}
        style={{ height: `${height}px` }}
        className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
      />
      <style>{`
        .rich-text-editor :global(.ql-toolbar) {
          border: none;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px 12px;
          background-color: #f9fafb;
        }
        .rich-text-editor :global(.ql-container) {
          border: none;
          font-family: Inter, system-ui, sans-serif;
        }
        .rich-text-editor :global(.ql-editor) {
          padding: 12px;
          font-size: 14px;
          line-height: 1.5;
        }
        .rich-text-editor :global(.ql-editor.ql-blank::before) {
          color: #9ca3af;
          font-style: normal;
        }
        .rich-text-editor :global(.ql-snow .ql-tooltip) {
          z-index: 50;
        }
        .rich-text-editor :global(.ql-snow .ql-picker-options) {
          z-index: 50;
        }
      `}</style>
    </div>
  );
}
