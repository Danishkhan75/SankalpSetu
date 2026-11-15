import { authorizeRequest } from '../../../../backend/auth.ts';
import { errorMessage, jsonResponse } from '../../../../backend/http.ts';
import { listRegisteredUsers } from '../../../../db/users.ts';

export async function GET(request: Request) {
  const { decision } = await authorizeRequest(request, ['admin'], 'admin:users_manage');
  if (!decision.allowed) {
    return jsonResponse(
      {
        error: decision.reason || 'Forbidden: Insufficient RBAC role or permission.',
        code: 'RBAC_ACCESS_DENIED',
        currentRole: decision.effectiveRole,
        allowedRoles: ['admin'],
        requiredPermission: 'admin:users_manage',
      },
      403
    );
  }

  try {
    return jsonResponse({ users: await listRegisteredUsers() });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Failed to fetch registered users') }, 500);
  }
}
