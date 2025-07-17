// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kihlqhomsychihwzwzuo.supabase.co' // Supabase 프로젝트 URL
const supabaseKey = 'sb_publishable_8H_WkhgiIM40Y9H32qaahw_2HKn3fdF' // Supabase Publishable 키

export const supabase = createClient(supabaseUrl, supabaseKey)