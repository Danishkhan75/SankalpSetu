import {
  errorMessage,
  jsonResponse,
  readJsonBody,
  RequestBodyTooLargeError,
} from '../../../../backend/http.ts';
import { processPaymentWebhook } from '../../../../backend/services/donations.ts';

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const result = await processPaymentWebhook(body);
    return jsonResponse(result.response, result.status);
  } catch (error) {
    const status =
      error instanceof RequestBodyTooLargeError
        ? 413
        : error instanceof SyntaxError
          ? 400
          : 400;
    return jsonResponse({ error: errorMessage(error, 'Webhook verification failed') }, status);
  }
}
