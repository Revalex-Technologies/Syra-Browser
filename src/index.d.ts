declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.woff2';

declare global {
  interface Window {
    versions?: {
      electron?: string;
      chrome?: string;
      node?: string;
      v8?: string;
    };
  }
}
export {};
