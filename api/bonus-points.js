const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const CLOUD_OBJECT_ID = 'ff808181a09d98f701a1d05a1f2e17fa';
const CLOUD_FALLBACK_URL = `https://api.restful-api.dev/objects/${CLOUD_OBJECT_ID}`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

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
          const pointsMap = {};
          data.forEach(r => { pointsMap[r.stt] = r.points || 0; });
          return res.status(200).json({ source: 'supabase', points: pointsMap, data });
        }
      } catch (e) {}
    }

    // Durable Cloud Store
    try {
      const resp = await fetch(CLOUD_FALLBACK_URL, {
        headers: { 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(4000)
      });
      if (resp.ok) {
        const json = await resp.json();
        const pointsMap = json.data?.points || {};
        const studentsArr = Array.isArray(json.data?.students) ? json.data.students : [];
        if (Object.keys(pointsMap).length > 0 || studentsArr.length > 0) {
          const mergedPoints = { ...pointsMap };
          studentsArr.forEach(s => {
            if (s.stt != null) mergedPoints[s.stt] = s.points || 0;
          });
          const dataList = Object.entries(mergedPoints).map(([stt, points]) => ({
            stt: Number(stt),
            points: Number(points)
          }));
          return res.status(200).json({
            source: 'cloud_kv',
            points: mergedPoints,
            data: dataList,
            updatedAt: json.data?.updatedAt
          });
        }
      }
    } catch (e) {}

    // Local file store
    try {
      const localFile = path.join(process.cwd(), 'data', 'bonus-points.json');
      if (fs.existsSync(localFile)) {
        const fileData = JSON.parse(fs.readFileSync(localFile, 'utf8'));
        const pointsMap = {};
        if (Array.isArray(fileData)) {
          fileData.forEach(r => { pointsMap[r.stt] = r.points || 0; });
        }
        return res.status(200).json({ source: 'local_file', points: pointsMap, data: fileData });
      }
    } catch (e) {}

    return res.status(200).json({ source: 'empty', points: {}, data: [] });
  }

  // 2. POST / PUT — save bonus points
  if (req.method === 'POST' || req.method === 'PUT') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const pointsInput = body?.points || {};
    const studentsInput = Array.isArray(body?.students) ? body.students : (Array.isArray(body) ? body : []);

    const pointsMap = { ...pointsInput };
    studentsInput.forEach(s => {
      if (s.stt != null) pointsMap[s.stt] = s.points || 0;
    });

    if (Object.keys(pointsMap).length === 0 && studentsInput.length === 0) {
      return res.status(400).json({ error: 'Payload must contain points or students' });
    }

    let savedSource = 'local';

    // Supabase if available
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const rows = Object.entries(pointsMap).map(([stt, points]) => ({
          stt: Number(stt),
          points: Number(points),
          updated_at: new Date().toISOString()
        }));
        const { error } = await supabase.from('bonus_points').upsert(rows, { onConflict: 'stt' });
        if (!error) savedSource = 'supabase';
      } catch (e) {}
    }

    // Durable cloud store (flat dictionary guaranteed 200, no Jackson 500 error)
    try {
      const cloudResp = await fetch(CLOUD_FALLBACK_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'ntmk_bonus_points',
          data: {
            updatedAt: new Date().toISOString(),
            points: pointsMap
          }
        }),
        signal: AbortSignal.timeout(4000)
      });
      if (cloudResp.ok) savedSource = 'cloud_kv';
    } catch (e) {}

    // Local file write
    try {
      const localFile = path.join(process.cwd(), 'data', 'bonus-points.json');
      fs.writeFileSync(localFile, JSON.stringify(pointsMap, null, 2), 'utf8');
    } catch (e) {}

    return res.status(200).json({
      success: true,
      savedSource,
      points: pointsMap,
      count: Object.keys(pointsMap).length,
      updatedAt: new Date().toISOString()
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
