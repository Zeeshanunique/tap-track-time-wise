// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://bccbxjqbzxgnzmejdnpk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjY2J4anFienhnbnptZWpkbnBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NDg3MTksImV4cCI6MjA1ODEyNDcxOX0.M5yZQ9EJyv955zd1-NhQSwR4DppDPx4xHNbU-FIbZDE";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);