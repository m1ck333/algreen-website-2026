// POST /api/admin/logout → clears the session cookie.
import { json } from '../../_lib/http.js';
import { clearCookie } from '../../_lib/auth.js';

export const onRequestPost = () => json(200, { ok: true }, { 'set-cookie': clearCookie() });
