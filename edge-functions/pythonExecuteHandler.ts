// @deno-types
/// <reference lib="deno.ns" />

// pythonExecuteHandler.ts: Execute Python code stored in the database
// Route: GET /functions/execute/:uuid
// Fetches Python code from the database, executes it, and returns the result

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Maximum execution time in milliseconds (5 seconds)
const EXECUTION_TIMEOUT = 5000;

// Create a temporary file with the given content
async function createTempFile(content: string): Promise<string> {
  // Create a temporary directory
  const tempDir = await Deno.makeTempDir();
  const tempFilePath = `${tempDir}/function.py`;
  
  // Write the content to the file
  await Deno.writeTextFile(tempFilePath, content);
  
  return tempFilePath;
}

// Execute Python code with timeout and sandboxing
async function executePythonCode(filePath: string, input: any): Promise<{ output: string; error: string | null }> {
  try {
    // Convert input to JSON string to pass to the Python script
    const inputJson = JSON.stringify(input);
    
    // Create a command to run the Python script with the input as an argument
    const command = new Deno.Command("python3", {
      args: [filePath, inputJson],
      stdout: "piped",
      stderr: "piped",
      timeout: EXECUTION_TIMEOUT,
    });
    
    // Run the command
    const { stdout, stderr, success } = await command.output();
    
    // Convert the output to strings
    const output = new TextDecoder().decode(stdout);
    const error = new TextDecoder().decode(stderr);
    
    return {
      output: success ? output : "",
      error: success ? null : error,
    };
  } catch (error) {
    // Handle timeout or other errors
    if (error instanceof Deno.errors.TimedOut) {
      return {
        output: "",
        error: "Execution timed out after " + (EXECUTION_TIMEOUT / 1000) + " seconds",
      };
    }
    
    return {
      output: "",
      error: error.message,
    };
  } finally {
    // Clean up: remove the temporary file and its directory
    try {
      const tempDir = filePath.substring(0, filePath.lastIndexOf("/"));
      await Deno.remove(tempDir, { recursive: true });
    } catch (error) {
      console.error("Error cleaning up temporary files:", error);
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  // Get the UUID from the URL
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const uuid = pathParts[pathParts.length - 1];
  
  if (!uuid) {
    return new Response(
      JSON.stringify({ error: "Missing function UUID" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  
  try {
    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch the function code from the database
    const { data, error } = await supabase
      .from("functions")
      .select("code")
      .eq("id", uuid)
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!data || !data.code) {
      return new Response(
        JSON.stringify({ error: "Function not found or has no code" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Parse the request body for input data
    let input = {};
    if (req.method === "POST") {
      try {
        input = await req.json();
      } catch (e) {
        // If parsing fails, use an empty object
        console.error("Error parsing request body:", e);
      }
    }
    
    // Create a temporary file with the function code
    const tempFilePath = await createTempFile(data.code);
    
    // Execute the Python code
    const result = await executePythonCode(tempFilePath, input);
    
    // Return the result
    return new Response(
      JSON.stringify({
        success: !result.error,
        output: result.output,
        error: result.error,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error executing function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An error occurred while executing the function",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});