import { getRequestUser } from '../../../../backend/auth.ts';
import { jsonResponse } from '../../../../backend/http.ts';
import { forwardToLegacy } from '../../../../backend/legacyProxy.ts';
import {
  ADMIN_OFFICIAL_EMAIL,
  evaluateRbacAccess,
  RBAC_ROLE_DEFINITIONS,
} from '../../../../utils/donationLogic.ts';

export async function GET(request: Request) {
  const user = await getRequestUser(request, 'optional');
  const role = request.headers.get('x-demo-role') || user?.role || 'donor';
  const decision = evaluateRbacAccess({
    role,
    email:
      role === 'admin' && !request.headers.get('authorization')
        ? ADMIN_OFFICIAL_EMAIL
        : user?.email,
  });
  return jsonResponse({
    rbacEnabled: true,
    currentRole: decision.effectiveRole,
    grantedPermissions: decision.grantedPermissions,
    adminRestrictedEmail: ADMIN_OFFICIAL_EMAIL,
    roles: RBAC_ROLE_DEFINITIONS,
  });
}
