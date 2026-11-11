const SUPABASE_URL = 'https://zgsxbuckjrplkpvtlbmn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_kWbTxBFjBm4TrXxH_ReTFw_lZ2NUZQl';
const GITHUB_FILE_URL = 'https://raw.githubusercontent.com/nk02388-cyber/pk-wms-bom-data/main/data/pk-bom-baseline.json';
let cachedBaseline = null;
let cachedAt = 0;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'เข้าสู่ระบบก่อนโหลด BOM' });
  try {
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/app_users?select=active,role,menu_access&limit=2`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!profileResponse.ok) return res.status(401).json({ error: 'ตรวจสอบสิทธิ์ BOM ไม่สำเร็จ' });
    const profiles = await profileResponse.json();
    const profile = Array.isArray(profiles) && profiles.length === 1 ? profiles[0] : null;
    if (!profile?.active || !['admin', 'user'].includes(profile.role)
        || (profile.role !== 'admin' && !['bompk', 'bom-plan'].some(menu => profile.menu_access?.includes(menu)))) {
      return res.status(403).json({ error: 'บัญชีนี้ไม่มีสิทธิ์ดู BOM' });
    }
    if (!cachedBaseline || Date.now() - cachedAt > 15 * 60_000) {
      const fileResponse = await fetch(GITHUB_FILE_URL);
      if (!fileResponse.ok) return res.status(502).json({ error: 'อ่าน BOM จาก GitHub ไม่ได้' });
      const baseline = await fileResponse.json();
      if (!baseline?.bom_detail || typeof baseline.bom_detail !== 'object' || !baseline?.fg_catalog
          || !/^[a-f0-9]{64}$/.test(baseline.source_sha256 || '')) {
        return res.status(502).json({ error: 'ข้อมูล BOM จาก GitHub ไม่ครบ' });
      }
      cachedBaseline = baseline;
      cachedAt = Date.now();
    }
    return res.status(200).json(cachedBaseline);
  } catch (_) {
    return res.status(502).json({ error: 'โหลด BOM ไม่สำเร็จ กรุณาลองใหม่' });
  }
};
