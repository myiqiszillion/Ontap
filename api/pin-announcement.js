const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Supabase configuration missing.',
      details: 'Check Vercel environment variables.'
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method === 'PATCH') {
    try {
      const { id } = req.query;
      const { pinned } = req.body;

      if (!id) return res.status(400).json({ error: 'ID is required' });
      if (typeof pinned !== 'boolean') return res.status(400).json({ error: 'pinned must be a boolean' });

      const { data, error } = await supabase
        .from('announcements')
        .update({ pinned })
        .eq('id', id)
        .select();

      if (error) throw error;
      return res.status(200).json(data[0]);
    } catch (error) {
      console.error('PIN ANNOUNCEMENT ERROR:', error);
      return res.status(500).json({ 
        error: error.message,
        details: 'Failed to update pin status.'
      });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
