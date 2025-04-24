// test-edge-function.js
// A simple script to test invoking the edge function using the Supabase client

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('Make sure to run this script with: node --experimental-modules test-edge-function.js');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Tool ID to test with
const toolId = 'a8001616-f4c8-49c2-96ab-7a3a18f4ca76';

// Test input
const input = { input_text: 'Health Check' };

async function testEdgeFunction() {
  try {
    console.log(`Testing edge function with tool ID: ${toolId}`);
    console.log(`Input: ${JSON.stringify(input)}`);
    
    // Method 1: Using functions.invoke
    console.log('\nMethod 1: Using functions.invoke');
    const { data: data1, error: error1 } = await supabase.functions.invoke('pythonExecuteTool', {
      body: { id: toolId, input }
    });
    
    if (error1) {
      console.error('Error invoking edge function:', error1);
    } else {
      console.log('Result:', data1);
    }
    
    // Method 2: Using fetch directly
    console.log('\nMethod 2: Using fetch directly');
    const response = await fetch(`${supabaseUrl}/functions/v1/pythonExecuteTool`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ id: toolId, input })
    });
    
    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    } else {
      const data2 = await response.json();
      console.log('Result:', data2);
    }
    
    // Method 3: Using fetch with ID in URL path
    console.log('\nMethod 3: Using fetch with ID in URL path');
    const response2 = await fetch(`${supabaseUrl}/functions/v1/pythonExecuteTool/${toolId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(input)
    });
    
    if (!response2.ok) {
      console.error(`Error: ${response2.status} ${response2.statusText}`);
      const errorText = await response2.text();
      console.error('Error details:', errorText);
    } else {
      const data3 = await response2.json();
      console.log('Result:', data3);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testEdgeFunction();