import {
  GetPackageData,
  HttpClientResponse,
  RequestInfo,
} from '../../lib/parse/types';

const FIXTURES: Map<
  String,
  {
    res: HttpClientResponse;
    body: GetPackageData;
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
  }),
);

export async function mockSnykSearchClient(requestInfo: RequestInfo): Promise<{
  res: HttpClientResponse;
  body: any;
}> {
  if (requestInfo.method == 'get' || requestInfo.path == '/packages') {
    const sha1 = requestInfo.qs?.package_sha1 || '';
    const packageInfo = FIXTURES.get(sha1);

    if (packageInfo) {
      return packageInfo;
    }
  }

  return { res: { statusCode: 404 }, body: undefined };
}
