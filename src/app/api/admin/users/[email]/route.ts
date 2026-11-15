import { authorizeRequest } from '../../../../../backend/auth.ts';
import { errorMessage, jsonResponse } from '../../../../../backend/http.ts';
import {
  createAuditLogEntry,
  listAuditLogs,
} from '../../../../../db/repository.ts';
import {
  deleteRegisteredUserByEmail,
  listRegisteredUsers,
} from '../../../../../db/users.ts';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ email: string }> }
) {
  const { decision, user } = await authorizeRequest(request, ['admin'], 'admin:users_manage');
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
    const { email: rawEmail } = await context.params;
    const email = decodeURIComponent(String(rawEmail || ''));
    const deleted = await deleteRegisteredUserByEmail(email);
    if (!deleted) {
      return jsonResponse({ error: 'Cannot delete primary Admin account' }, 400);
    }

    await createAuditLogEntry({
      actorName: user?.name || 'Danish Khan',
      actorRole: 'admin',
      action: 'USER_ACCOUNT_DELETED',
      targetType: 'user',
      targetId: 1,
      details: `Deleted user account (${email}) from platform directory`,
    });

    return jsonResponse({
      deleted: true,
      users: await listRegisteredUsers(),
      auditLogs: await listAuditLogs(100),
    });
  } catch (error) {
    return jsonResponse({ error: errorMessage(error, 'Failed to delete user') }, 500);
  }
}
