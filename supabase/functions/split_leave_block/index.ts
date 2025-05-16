
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  // This is critical: handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create clients with service role key (bypasses RLS)
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey
    );
    
    // Get request body
    const { user_leave_block_id, user_id } = await req.json();
    
    if (!user_leave_block_id || !user_id) {
      throw new Error('Missing required parameters: user_leave_block_id and user_id are required');
    }

    console.log(`Starting split operation for user_leave_block_id: ${user_leave_block_id}, user_id: ${user_id}`);

    // Get the user leave block details
    const { data: userLeaveBlock, error: userLeaveBlockError } = await supabaseAdmin
      .from('user_leave_blocks')
      .select('*, leave_block:leave_blocks(*)')
      .eq('id', user_leave_block_id)
      .eq('user_id', user_id)
      .single();
    
    if (userLeaveBlockError || !userLeaveBlock) {
      console.error('Error fetching leave block:', userLeaveBlockError?.message);
      throw new Error('Leave block not found or access denied');
    }
    
    const leaveBlock = userLeaveBlock.leave_block;
    if (!leaveBlock) {
      throw new Error('Associated leave block not found');
    }
    
    console.log(`Found leave block: ${leaveBlock.id}, block_number: ${leaveBlock.block_number}`);
    
    const startDate = new Date(leaveBlock.start_date);
    const endDate = new Date(leaveBlock.end_date);
    const daysDifference = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate the middle point (half the days)
    const halfDays = Math.floor(daysDifference / 2);
    const midPoint = new Date(startDate);
    midPoint.setDate(startDate.getDate() + halfDays);
    
    console.log(`Splitting block with dates ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`Middle point: ${midPoint.toISOString()}`);
    
    // Find the largest block_number to ensure we create unique block numbers
    const { data: maxBlockData, error: maxBlockError } = await supabaseAdmin
      .from('leave_blocks')
      .select('block_number')
      .order('block_number', { ascending: false })
      .limit(1)
      .single();
    
    if (maxBlockError) {
      console.error('Error getting max block number:', maxBlockError.message);
      throw new Error(`Error getting max block number: ${maxBlockError.message}`);
    }
    
    const maxBlockNumber = maxBlockData ? maxBlockData.block_number : 0;
    const newBlockNumberA = maxBlockNumber + 1;
    const newBlockNumberB = maxBlockNumber + 2;
    
    console.log(`Using new block numbers: A=${newBlockNumberA}, B=${newBlockNumberB}`);
    
    // Create the first half block (A)
    const { data: blockA, error: blockAError } = await supabaseAdmin
      .from('leave_blocks')
      .insert({
        block_number: newBlockNumberA,
        start_date: startDate.toISOString().split('T')[0],
        end_date: midPoint.toISOString().split('T')[0],
        status: 'active',
        split_designation: 'A',
        original_block_id: leaveBlock.id
      })
      .select()
      .single();
    
    if (blockAError) {
      console.error('Error creating block A:', blockAError.message);
      throw new Error(`Error creating split block A: ${blockAError.message}`);
    }
    
    console.log(`Created block A: ${blockA.id}, with block_number: ${blockA.block_number}`);
    
    // Create the second half block (B)
    const nextDay = new Date(midPoint);
    nextDay.setDate(midPoint.getDate() + 1);
    
    const { data: blockB, error: blockBError } = await supabaseAdmin
      .from('leave_blocks')
      .insert({
        block_number: newBlockNumberB,
        start_date: nextDay.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
        split_designation: 'B',
        original_block_id: leaveBlock.id
      })
      .select()
      .single();
    
    if (blockBError) {
      console.error('Error creating block B:', blockBError.message);
      throw new Error(`Error creating split block B: ${blockBError.message}`);
    }
    
    console.log(`Created block B: ${blockB.id}, with block_number: ${blockB.block_number}`);
    
    // Create user associations for the new blocks
    const { error: userBlockAError } = await supabaseAdmin
      .from('user_leave_blocks')
      .insert({
        user_id: user_id,
        leave_block_id: blockA.id,
      });
    
    if (userBlockAError) {
      console.error('Error associating user with block A:', userBlockAError.message);
      throw new Error(`Error associating user with block A: ${userBlockAError.message}`);
    }
    
    const { error: userBlockBError } = await supabaseAdmin
      .from('user_leave_blocks')
      .insert({
        user_id: user_id,
        leave_block_id: blockB.id,
      });
    
    if (userBlockBError) {
      console.error('Error associating user with block B:', userBlockBError.message);
      throw new Error(`Error associating user with block B: ${userBlockBError.message}`);
    }
    
    console.log('Successfully created user associations for both blocks');
    
    // Remove the original user leave block
    const { error: removeError } = await supabaseAdmin
      .from('user_leave_blocks')
      .delete()
      .eq('id', user_leave_block_id);
    
    if (removeError) {
      console.error('Error removing original user leave block:', removeError.message);
      throw new Error(`Error removing original user leave block: ${removeError.message}`);
    }
    
    console.log('Successfully removed original user leave block');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        blockA: blockA,
        blockB: blockB
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error splitting leave block:', error.message);
    
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
