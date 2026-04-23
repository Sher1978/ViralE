-- Add synthetic_training_data and knowledge_base_json to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS synthetic_training_data TEXT,
ADD COLUMN IF NOT EXISTS knowledge_base_json JSONB DEFAULT '{}'::jsonb;
