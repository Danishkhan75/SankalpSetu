import { jsonResponse } from '../../../../backend/http.ts';

export async function POST() {
  return jsonResponse(
    { loggedOut: true },
    200,
    {
      'Set-Cookie':
        'sankalpsetu_jwt=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0',
    }
  );
}
