import {
  GetPackageData,
  HttpClientResponse,
  RequestInfo,
  ShaSearchError,
} from '../../lib/parse/types';

const FIXTURES: Map<
  String,
  {
    res: HttpClientResponse;
    body: GetPackageData | { errors: ShaSearchError[] };
  }
> = new Map(
  Object.entries({
    da7a3f411b9e7bba70f7a7f9ffa00756c9be2ec1: {
      res: { statusCode: 200 },
      body: {
        data: [
          {
            id: 'pkg:maven/com.packetzoom/pz-okhttp-interceptor-fat@3.2.43',
            type: 'package',
          },
        ],
      },
    },
    c334e3e4b6da8a5e2123c28cd9e397fae15eb025: {
      res: { statusCode: 200 },
      body: {
        data: [
          {
            id: 'pkg:maven/tomcat/tomcat-http11@4.1.34',
            type: 'package',
          },
        ],
      },
    },
    '396d478d08515ddc36a5c9c8b8d95f1a5a7c3e17': {
      res: { statusCode: 200 },
      body: {
        data: [
          {
            id: 'pkg:maven/org.keycloak/keycloak-core@5.0.0',
            type: 'package',
          },
        ],
      },
    },
    '815893df5f31da2ece4040fe0a12fd44b577afaf': {
      res: { statusCode: 200 },
      body: {
        data: [
          {
            id: 'pkg:maven/org.netbeans.external/org-apache-commons-io@RELEASE113',
            type: 'package',
          },
          {
            id: 'pkg:maven/commons-io/commons-io@2.6',
            type: 'package',
          },
        ],
      },
    },
    '37fd45c92cfd05b9ad173ee1184ec4221e0f931f': {
      res: { statusCode: 200 },
      body: {
        data: [
          {
            id: 'pkg:maven/org.springframework/spring-core@5.1.8.RELEASE',
            type: 'package',
          },
        ],
      },
    },
    '59eb84ee0d616332ff44aba065f3888cf002cd2d': {
      res: { statusCode: 200 },
      body: {
        data: [
          {
            id: 'pkg:maven/one.gfw/jakarta.annotation-api@1.3.5',
            type: 'package',
          },
          {
            id: 'pkg:maven/jakarta.annotation/jakarta.annotation-api@1.3.5',
            type: 'package',
          },
          {
            id: 'pkg:maven/unrelated.name/jakarta.annotation-api@1.3.5',
            type: 'package',
          },
        ],
      },
    },
  }),
);

export async function mockSnykSearchClient(requestInfo: RequestInfo): Promise<{
  res: HttpClientResponse;
  body: any;
}> {
  const sha1 = requestInfo.qs?.package_sha1 || '';

  if (requestInfo.method == 'get' || requestInfo.path == '/packages') {
    const packageInfo = FIXTURES.get(sha1);

    if (packageInfo) {
      return packageInfo;
    }

    return {
      // result with 404 from maven
      res: { statusCode: 200 },
      body: {
        errors: [
          {
            status: '404',
            title: 'SHA1 not found',
            detail: `SHA1 ${sha1} was not found`,
            meta: {
              links: [
                'https://docs.snyk.io/snyk-cli/test-for-vulnerabilities/scan-all-unmanaged-jar-files',
              ],
            },
          },
        ],
      },
    };
  }

  return { res: { statusCode: 404 }, body: undefined };
}
