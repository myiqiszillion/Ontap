const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load announcements' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, content, link } = req.body;
      const { data, error } = await supabase
        .from('announcements')
        .insert([{ title, content, link, timestamp: new Date().toISOString() }])
        .select();
      if (error) throw error;
      return res.status(201).json(data[0]);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
