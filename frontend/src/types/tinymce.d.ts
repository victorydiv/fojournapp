// Type definitions for TinyMCE React component
declare module '@tinymce/tinymce-react' {
  import { Component } from 'react';

  export interface IEditorProps {
    apiKey?: string;
    value?: string;
    onEditorChange?: (content: string) => void;
    init?: any;
    [key: string]: any;
  }

  export class Editor extends Component<IEditorProps> {}
}
