// Images
declare module '*.jpg';
declare module '*.png';
declare module '*.env';

// 3D types
declare module '*.glb';
declare module '*.stl';

declare module "maze-generator" {
  function generator(arr: any[]): any;
  export = generator;
}



