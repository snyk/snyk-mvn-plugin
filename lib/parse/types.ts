import type { OutgoingHttpHeaders } from 'http';

export type HttpClientVerbs =
  | 'get'
  | 'head'
  | 'delete'
  | 'patch'
  | 'post'
  | 'put';

export interface RequestInfo {
  method: HttpClientVerbs;
  path: string;
  body?: unknown;
  headers?: OutgoingHttpHeaders;
  qs?: Record<string, string>;
  json?: boolean;
  timeout?: number;
  family?: number;
}

export interface HttpClientResponse {
  statusCode?: number;
}

export type SnykHttpClient = (requestInfo: RequestInfo) => Promise<{
  res: HttpClientResponse;
  body: unknown;
}>;

export interface MavenPackage {
  groupId: string;
  artifactId: string;
  version: string;
}

export interface MavenDependency extends MavenPackage {
  type: string;
  classifier?: string;
  scope?: string;
}

export interface MavenGraph {
  rootId: string;
  nodes: Record<string, MavenGraphNode>;
}

export interface PackageResource {
  id: string;
  type: 'package';
}

export interface GetPackageData {
  data: Array<PackageResource>;
}

export interface MavenGraphNode {
  dependsOn: string[];
  parents: string[];
  reachesProdDep: boolean;
}

export interface ShaSearchError {
  status: string;
  title: string;
  detail: string;
  meta: {
    links: string[];
  };
}

export type HashAlgorithm = 'sha1' | 'sha256' | 'sha512';

export interface FingerprintOptions {
  enabled: boolean;
  algorithm: HashAlgorithm;
  mavenRepository?: string;
}

export interface FingerprintData {
  hash: string;
  algorithm: string;
  filePath: string;
  fileSize: number;
  processingTime: number;
  error?: string;
}

export interface ParseContext {
  includeTestScope: boolean;
  verboseEnabled: boolean;
  fingerprintMap: Map<string, FingerprintData>;
  includePurl: boolean;
  showMavenBuildScope?: boolean;
}
