const PK_URL = 'https://zgsxbuckjrplkpvtlbmn.supabase.co';
const PK_KEY = 'sb_publishable_kWbTxBFjBm4TrXxH_ReTFw_lZ2NUZQl';
const DB_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const readActions = new Set([
  'get_dashboard_state', 'get_management_state', 'get_ticket_history',
  'get_saved_production_formulas', 'get_competency_state',
]);
const adminActions = new Set([
  ...readActions, 'get_deleted_tickets_as_supervisor', 'perform_work_action',
  'manage_work', 'save_production_formula_as_supervisor',
]);

function allowedOrigin(origin: string) {
  return origin === 'https://bcl-wms.vercel.app' || /^https:\/\/pk-[a-z0-9-]+-pk-store\.vercel\.app$/i.test(origin);
}

Deno.serve(async request => {
  const origin = request.headers.get('origin') || '';
  if (!allowedOrigin(origin)) return new Response('Forbidden', { status: 403 });
  const cors = {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
    'access-control-allow-methods': 'POST, OPTIONS',
    'vary': 'Origin',
  };
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors });
  if (!SERVICE_KEY) return Response.json({ error: 'ระบบใบเบิกยังตั้งค่าไม่ครบ' }, { status: 503, headers: cors });

  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    if (!token) return Response.json({ error: 'กรุณาเข้าสู่ระบบ PK WMS' }, { status: 401, headers: cors });
    const verified = await fetch(`${PK_URL}/auth/v1/user`, { headers: { apikey: PK_KEY, authorization: `Bearer ${token}` } });
    if (!verified.ok) return Response.json({ error: 'เซสชัน PK WMS หมดอายุ กรุณาเข้าสู่ระบบใหม่' }, { status: 401, headers: cors });
    const user = await verified.json();
    const profileResponse = await fetch(`${PK_URL}/rest/v1/app_users?select=username,role,active,menu_access&id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers: { apikey: PK_KEY, authorization: `Bearer ${token}` } });
    if (!profileResponse.ok) return Response.json({ error: 'ตรวจสอบสิทธิ์ PK WMS ไม่สำเร็จ' }, { status: 503, headers: cors });
    const profile = (await profileResponse.json())[0];
    if (!profile?.active || !['admin', 'user'].includes(profile.role)) return Response.json({ error: 'บัญชี PK WMS นี้ถูกปิดใช้งาน' }, { status: 403, headers: cors });
    if (profile.role !== 'admin' && !profile.menu_access?.includes('warehouse-operations')) return Response.json({ error: 'บัญชีนี้ไม่ได้รับสิทธิ์เมนูใบเบิก' }, { status: 403, headers: cors });

    const body = await request.json();
    const action = body?.action;
    const args = body?.args ?? {};
    if (typeof action !== 'string' || !/^[a-z_]{1,64}$/.test(action) || !args || typeof args !== 'object' || Array.isArray(args))
      return Response.json({ error: 'คำสั่งไม่ถูกต้อง' }, { status: 400, headers: cors });
    const admin = profile.role === 'admin';
    if (admin ? !adminActions.has(action) : !(readActions.has(action) || action === 'manage_work' && ['case', 'history'].includes(args.p_action)))
      return Response.json({ error: 'ไม่มีสิทธิ์ทำรายการนี้' }, { status: 403, headers: cors });

    const rpc = await fetch(`${DB_URL}/rest/v1/rpc/warehouse_ops_rpc`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        p_action: action,
        p_args: { ...args, p_username: profile.username, p_role: admin ? 'supervisor' : 'clerk', p_code: 'pk-auth' },
      }),
    });
    const result = await rpc.json().catch(() => null);
    if (!rpc.ok) return Response.json({ error: typeof result?.message === 'string' ? result.message : 'บันทึกหรือโหลดข้อมูลใบเบิกไม่สำเร็จ' }, { status: rpc.status, headers: cors });
    return Response.json({ data: result }, { headers: cors });
  } catch (_) {
    return Response.json({ error: 'เชื่อมต่อระบบใบเบิกไม่ได้ กรุณาลองใหม่' }, { status: 500, headers: cors });
  }
});
