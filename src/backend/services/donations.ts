import { authorizeRequest, getRequestUser } from '../auth.ts';
import { getRequiredServerEnv } from '../../config/serverEnv.ts';
import {
  computeWebhookSignature,
  buildAdminSubmissionSummaryEmail,
} from '../../utils/donationLogic.ts';
import {
  confirmDonationWebhook,
  createAuditLogEntry,
  createPendingDonationOrder,
  listDonationsForUser,
  refundDonationById,
} from '../../db/repository.ts';
import { deletedDonationIds } from '../state.ts';
import { normalizeDonation } from './normalization.ts';

export async function createDonationOrder(
  body: Record<string, unknown>,
  request: Request
) {
  const user = await getRequestUser(request, 'optional');
  const amount = Math.max(1, Math.round(Number(body.amount) || 500));
  const result = await createPendingDonationOrder({
    campaignId: Number(body.campaignId) || 1,
    donorId: user?.id ?? null,
    donorName: String(body.donorName || 'Danish Khan').trim(),
    donorEmail: String(body.donorEmail || 'khandanish0503@gmail.com').trim(),
    donorPhone: String(body.donorPhone || '+91 9811223344').trim(),
    panNumber: body.panNumber ? String(body.panNumber).trim().toUpperCase() : undefined,
    amount,
    returnOption: String(body.returnOption || 'monthly'),
    paymentMethod: String(body.paymentMethod || 'upi'),
    gatewayMode: String(body.gatewayMode || 'razorpay_test'),
    idempotencyKey:
      String(body.idempotencyKey || '') ||
      `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  });

  const adminSummaryEmail = buildAdminSubmissionSummaryEmail({
    submissionType: 'Donation & Escrow Checkout',
    referenceId: result.donation.gatewayOrderId || `ORD-${Date.now()}`,
    submittedBy: String(body.donorName || 'Danish Khan').trim(),
    submittedEmail: String(body.donorEmail || 'khandanish0503@gmail.com').trim(),
    role: user?.role || 'donor',
    category: String(body.category || 'All Categories'),
    title: `Donation Order ${result.donation.gatewayOrderId}`,
    amount,
    details: {
      'Payment Method': String(body.paymentMethod || 'upi').toUpperCase(),
      'Return Plan': String(body.returnOption || 'monthly'),
      'PAN Number': String(body.panNumber || 'Verified 80G'),
    },
  });
  const donation = normalizeDonation(result.donation);

  return {
    ...result,
    donation,
    gatewayOrder: {
      gatewayOrderId: result.donation.gatewayOrderId,
      amount: result.donation.amount,
    },
    adminSummaryEmail,
    message:
      'Form Submitted Successfully! Detailed donation summary sent to Admin khandanish0503@gmail.com.',
  };
}

export async function processPaymentWebhook(body: Record<string, unknown>) {
  const orderId = String(body.orderId || body.gatewayOrderId || '');
  const paymentId = String(
    body.paymentId || body.gatewayPaymentId || `pay_${Date.now()}`
  );
  if (!orderId) return { status: 400, response: { error: 'Missing orderId' } } as const;
  if (body.status === 'failed') {
    return { status: 200, response: { status: 'failed' } } as const;
  }

  const signature = computeWebhookSignature(
    orderId,
    paymentId,
    getRequiredServerEnv('PAYMENT_WEBHOOK_SECRET')
  );
  const confirmed = await confirmDonationWebhook({ orderId, paymentId, signature });
  const donation = normalizeDonation(confirmed.donation);
  return {
    status: 200,
    response: {
      ...confirmed,
      donation,
      receiptNumber: donation.receiptNumber,
    },
  } as const;
}

export async function listDonationHistory(email?: string | null) {
  const history = await listDonationsForUser(email?.trim() || 'all');
  return history
    .filter((donation: { id?: string | number }) => !deletedDonationIds.has(String(donation.id)))
    .map(normalizeDonation);
}

export async function deleteDonationRecord(id: string, request: Request) {
  const { user, decision } = await authorizeRequest(
    request,
    ['admin'],
    'admin:donations_refund_delete'
  );
  if (!decision.allowed) {
    return {
      status: 403,
      response: {
        error: decision.reason || 'Forbidden: Insufficient RBAC role or permission.',
        code: 'RBAC_ACCESS_DENIED',
        currentRole: decision.effectiveRole,
        allowedRoles: ['admin'],
        requiredPermission: 'admin:donations_refund_delete',
      },
    } as const;
  }
  deletedDonationIds.add(id);
  await createAuditLogEntry({
    actorName: user?.name || 'Danish Khan',
    actorRole: 'admin',
    action: 'DONATION_RECORD_DELETED',
    targetType: 'donation',
    targetId: Number(id) || 1,
    details: `Deleted donation record #${id} from platform ledger`,
  });
  return { status: 200, response: { deleted: true } } as const;
}

export async function refundDonation(id: number, request: Request) {
  const { user, decision } = await authorizeRequest(
    request,
    ['admin'],
    'admin:donations_refund_delete'
  );
  if (!decision.allowed) {
    return {
      status: 403,
      response: {
        error: decision.reason || 'Forbidden: Insufficient RBAC role or permission.',
        code: 'RBAC_ACCESS_DENIED',
        currentRole: decision.effectiveRole,
        allowedRoles: ['admin'],
        requiredPermission: 'admin:donations_refund_delete',
      },
    } as const;
  }
  const donation = await refundDonationById(id, user?.name || 'Danish Khan');
  return { status: 200, response: { donation: normalizeDonation(donation) } } as const;
}
