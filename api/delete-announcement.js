const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
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

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
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

  res.status(405).json({ error: 'Method not allowed' });
};
