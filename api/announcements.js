const { requireAdmin } = require('../engine/admin-auth.js');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Admin authorization gate for write/modify/delete
  if (['POST', 'PATCH', 'DELETE'].includes(req.method) && !requireAdmin(req, res)) {
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (req.method === 'GET') {
      return res.status(200).json([]);
    }
    return res.status(500).json({ 
      error: 'Supabase configuration missing in environment.',
      url_missing: !supabaseUrl,
      key_missing: !supabaseKey
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. GET — List announcements
  if (req.method === 'GET') {
    try {
      let result = await supabase
        .from('announcements')
        .select('*')
        .order('pinned', { ascending: false, nullsFirst: false })
        .order('timestamp', { ascending: false });

      if (result.error) {
        result = await supabase
          .from('announcements')
          .select('*')
          .order('timestamp', { ascending: false });
      }

      if (result.error) throw result.error;
      return res.status(200).json(result.data || []);
    } catch (error) {
      console.error('SERVERLESS GET ERROR:', error);
      return res.status(500).json({ 
        error: 'Failed to load announcements',
        details: error.message
      });
    }
  }

  // 2. POST — Create announcement
  if (req.method === 'POST') {
    try {
      const { title, content, link, image_url } = req.body || {};
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }
      const { data, error } = await supabase
        .from('announcements')
        .insert([{ 
          title, 
          content, 
          link, 
          image_url,
          timestamp: new Date().toISOString() 
        }])
        .select();
      if (error) throw error;
      return res.status(201).json(data[0]);
    } catch (error) {
      console.error('SERVERLESS POST ERROR:', error);
      return res.status(500).json({ 
        error: error.message,
        details: 'Failed to create announcement.'
      });
    }
  }

  // 3. DELETE — Delete announcement
  if (req.method === 'DELETE') {
    try {
      const id = req.query.id || req.body?.id;
      if (!id) return res.status(400).json({ error: 'ID is required' });

      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
      console.error('SERVERLESS DELETE ERROR:', error);
      return res.status(500).json({ 
        error: error.message,
        details: 'Failed to delete announcement.'
      });
    }
  }

  // 4. PATCH — Pin/Unpin announcement
  if (req.method === 'PATCH') {
    try {
      const id = req.query.id || req.body?.id;
      const { pinned } = req.body || {};

      if (!id) return res.status(400).json({ error: 'ID is required' });
      if (typeof pinned !== 'boolean') return res.status(400).json({ error: 'pinned must be a boolean' });

      const { data, error } = await supabase
        .from('announcements')
        .update({ pinned })
        .eq('id', id)
        .select();

      if (error) throw error;
      return res.status(200).json(data[0] || { success: true, pinned });
    } catch (error) {
      console.error('PIN ANNOUNCEMENT ERROR:', error);
      return res.status(500).json({ 
        error: error.message,
        details: 'Failed to update pin status.'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
