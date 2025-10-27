declare module 'formidable' {
  import { IncomingMessage } from 'http';
  
  export interface File {
    filepath: string;
    originalFilename: string | null;
    mimetype: string | null;
    size: number;
  }
  
  export interface Fields {
    [key: string]: string | string[];
  }
  
  export interface Files {
    [key: string]: File | File[];
  }
  
  export interface Options {
    maxFileSize?: number;
    keepExtensions?: boolean;
  }
  
  export default function formidable(options?: Options): {
    parse: (req: IncomingMessage) => Promise<[Fields, Files]>;
  };
}

