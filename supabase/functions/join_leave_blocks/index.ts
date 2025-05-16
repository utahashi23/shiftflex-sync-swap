
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey
    );
    
    // Get request body
    const { block_a_id, block_b_id, user_id } = await req.json();
    
    if (!block_a_id || !block_b_id || !user_id) {
      throw new Error('Missing required parameters');
    }

    console.log(`Starting join operation for block_a_id: ${block_a_id}, block_b_id: ${block_b_id}, user_id: ${user_id}`);

    // Get the details of both blocks
    const { data: blockA, error: blockAError } = await supabaseAdmin
      .from('user_leave_blocks')
      .select('*, leave_block:leave_blocks(*)')
      .eq('id', block_a_id)
      .eq('user_id', user_id)
      .single();
    
    if (blockAError || !blockA) {
      console.error('Error fetching block A:', blockAError?.message);
      throw new Error('Block A not found or access denied');
    }
    
    const { data: blockB, error: blockBError } = await supabaseAdmin
      .from('user_leave_blocks')
      .select('*, leave_block:leave_blocks(*)')
      .eq('id', block_b_id)
      .eq('user_id', user_id)
      .single();
    
    if (blockBError || !blockB) {
      console.error('Error fetching block B:', blockBError?.message);
      throw new Error('Block B not found or access denied');
    }
    
    // Verify these blocks come from the same original block
    if (!blockA.leave_block.original_block_id || 
        !blockB.leave_block.original_block_id || 
        blockA.leave_block.original_block_id !== blockB.leave_block.original_block_id) {
      throw new Error('Blocks must be splits from the same original block');
    }
    
    console.log(`Verified blocks A and B have the same original block ID: ${blockA.leave_block.original_block_id}`);
    
    // Get the original block details
    const { data: originalBlock, error: originalBlockError } = await supabaseAdmin
      .from('leave_blocks')
      .select('*')
      .eq('id', blockA.leave_block.original_block_id)
      .single();
    
    if (originalBlockError || !originalBlock) {
      console.error('Error fetching original block:', originalBlockError?.message);
      throw new Error('Original block not found');
    }
    
    console.log(`Found original block: ${originalBlock.id}, block_number: ${originalBlock.block_number}`);
    
    // Create a user association with the original block
    const { data: userOriginalBlock, error: userOriginalBlockError } = await supabaseAdmin
      .from('user_leave_blocks')
      .insert({
        user_id: user_id,
        leave_block_id: originalBlock.id,
      })
      .select()
      .single();
    
    if (userOriginalBlockError) {
      console.error('Error creating original block association:', userOriginalBlockError.message);
      throw new Error(`Error creating association with original block: ${userOriginalBlockError.message}`);
    }
    
    console.log(`Created user association with original block: ${userOriginalBlock.id}`);
    
    // Remove the user's associations with the split blocks
    const { error: removeAError } = await supabaseAdmin
      .from('user_leave_blocks')
      .delete()
      .eq('id', block_a_id);
    
    if (removeAError) {
      console.error('Error removing block A association:', removeAError.message);
      throw new Error(`Error removing block A association: ${removeAError.message}`);
    }
    
    const { error: removeBError } = await supabaseAdmin
      .from('user_leave_blocks')
      .delete()
      .eq('id', block_b_id);
    
    if (removeBError) {
      console.error('Error removing block B association:', removeBError.message);
      throw new Error(`Error removing block B association: ${removeBError.message}`);
    }
    
    console.log('Successfully removed user associations with split blocks');
    
    // Delete the split blocks themselves
    // Note: We only delete them if they're not being used by other users
    if (blockA.leave_block) {
      const { error: deleteBlockAError } = await supabaseAdmin
        .from('leave_blocks')
        .delete()
        .eq('id', blockA.leave_block.id)
        .not('id', 'in', '(select leave_block_id from user_leave_blocks)');
      
      if (deleteBlockAError) {
        console.log(`Warning: Could not delete block A: ${deleteBlockAError.message}`);
      } else {
        console.log(`Successfully deleted block A: ${blockA.leave_block.id}`);
      }
    }
    
    if (blockB.leave_block) {
      const { error: deleteBlockBError } = await supabaseAdmin
        .from('leave_blocks')
        .delete()
        .eq('id', blockB.leave_block.id)
        .not('id', 'in', '(select leave_block_id from user_leave_blocks)');
      
      if (deleteBlockBError) {
        console.log(`Warning: Could not delete block B: ${deleteBlockBError.message}`);
      } else {
        console.log(`Successfully deleted block B: ${blockB.leave_block.id}`);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        originalBlock: originalBlock,
        userBlock: userOriginalBlock
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error joining leave blocks:', error.message);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
