export interface AuthenticatedPrincipal {
  subject: string;
  permissions: readonly string[];
  executionNodeId: string | null;
}

export abstract class AuthTokenVerifier {
  abstract verify(token: string): Promise<AuthenticatedPrincipal>;
}
