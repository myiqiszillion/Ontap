const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Initialize Supabase inside handler for environment variable consistency
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Supabase configuration missing in environment.',
      url_missing: !supabaseUrl,
      key_missing: !supabaseKey,
      details: 'Check Vercel Dashboard -> Settings -> Environment Variables for SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('pinned', { ascending: false, nullsFirst: false })
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (error) {
      console.error('SERVERLESS GET ERROR:', error);
      return res.status(500).json({ 
        error: 'Failed to load announcements',
        details: error.message,
        hint: 'Verify that the "announcements" table exists and is accessible.'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, content, link, image_url } = req.body;
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

  res.status(405).json({ error: 'Method not allowed' });
};
