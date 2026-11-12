const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const CLOUD_OBJECT_ID = 'ff808181a09d98f701a1d05a1f2e17fa';
const CLOUD_FALLBACK_URL = `https://api.restful-api.dev/objects/${CLOUD_OBJECT_ID}`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET — fetch latest bonus points
  if (req.method === 'GET') {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase.from('bonus_points').select('*').limit(100);
        if (!error && data && data.length > 0) {
          return res.status(200).json({ source: 'supabase', data });
        }
      } catch (e) {}
    }

    // Durable Cloud Store
    try {
      const resp = await fetch(CLOUD_FALLBACK_URL, { signal: AbortSignal.timeout(4000) });
      if (resp.ok) {
        const json = await resp.json();
        const students = json.data?.students || [];
        if (Array.isArray(students) && students.length > 0) {
          return res.status(200).json({ source: 'cloud_kv', data: students, updatedAt: json.data?.updatedAt });
        }
      }
    } catch (e) {}

    // Local file store
    try {
      const localFile = path.join(process.cwd(), 'data', 'bonus-points.json');
      if (fs.existsSync(localFile)) {
        const fileData = JSON.parse(fs.readFileSync(localFile, 'utf8'));
        return res.status(200).json({ source: 'local_file', data: fileData });
      }
    } catch (e) {}

    return res.status(200).json({ source: 'empty', data: [] });
  }

  // 2. POST / PUT — save bonus points
  if (req.method === 'POST' || req.method === 'PUT') {
    const studentsData = req.body?.students || req.body || [];
    if (!Array.isArray(studentsData)) {
      return res.status(400).json({ error: 'Payload must contain students array' });
    }

    let savedSource = 'local';

    // Supabase if available
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const rows = studentsData.map(s => ({
          stt: s.stt,
          student_id: s.id,
          full_name: s.fullName,
          points: s.points || 0,
          updated_at: new Date().toISOString()
        }));
        const { error } = await supabase.from('bonus_points').upsert(rows, { onConflict: 'stt' });
        if (!error) savedSource = 'supabase';
      } catch (e) {}
    }

    // Always update durable cloud store
    try {
      const cloudResp = await fetch(CLOUD_FALLBACK_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'ntmk_bonus_points',
          data: {
            updatedAt: new Date().toISOString(),
            students: studentsData
          }
        }),
        signal: AbortSignal.timeout(4000)
      });
      if (cloudResp.ok) savedSource = 'cloud_kv';
    } catch (e) {}

    // Local file write
    try {
      const localFile = path.join(process.cwd(), 'data', 'bonus-points.json');
      fs.writeFileSync(localFile, JSON.stringify(studentsData, null, 2), 'utf8');
    } catch (e) {}

    return res.status(200).json({
      success: true,
      savedSource,
      count: studentsData.length,
      updatedAt: new Date().toISOString()
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
