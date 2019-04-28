
export interface PluginMetadata {
  name: string;
  runtime: string;
  targetFile?: string;
}

export interface DepDict {
  [name: string]: DepTree;
}

export interface DepRoot {
  depTree: DepTree;
  targetFile?: string;

  meta?: any;
}
export interface DepTree {
  name: string;
  version: string;
  dependencies?: DepDict;
  packageFormatVersion?: string;
  scope?: string; // TODO: is it needed on the Tree?
  dep?: string; // TODO: is it needed on the Tree?
}
