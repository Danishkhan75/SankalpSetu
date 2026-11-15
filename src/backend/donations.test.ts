import assert from 'node:assert/strict';
import test from 'node:test';
import { processPaymentWebhook } from './services/donations.ts';
import { normalizeDonation } from './services/normalization.ts';

test('payment webhook preserves missing-order and failed-payment responses', async () => {
  const missingOrder = await processPaymentWebhook({});
  const failedPayment = await processPaymentWebhook({
    orderId: 'order-test',
    status: 'failed',
  });

  assert.deepEqual(missingOrder, {
    status: 400,
    response: { error: 'Missing orderId' },
  });
  assert.deepEqual(failedPayment, {
    status: 200,
    response: { status: 'failed' },
  });
});

test('donation normalization retains receipt and donor type fields', () => {
  const donation = normalizeDonation({
    id: 3,
    returnOption: 'no_return',
  });

  assert.equal(donation.receiptNumber, '80G-2026-1053');
  assert.equal(donation.receiptNo, '80G-2026-1053');
  assert.equal(donation.returnOption, 'no_return');
  assert.equal(donation.donorType, 'donator');
});
