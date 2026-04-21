-- 7. Studio Manifests: For persistent editing and versioning
CREATE TABLE IF NOT EXISTS public.studio_manifests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    version_id UUID REFERENCES public.project_versions(id) ON DELETE SET NULL,
    name TEXT DEFAULT 'Untitled Draft',
    manifest_json JSONB NOT NULL, -- The SceneSegment[] array
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.studio_manifests ENABLE ROW LEVEL SECURITY;

-- 7. Studio Manifests Policies
CREATE POLICY "Users can view their own studio manifests" ON public.studio_manifests 
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid()));

CREATE POLICY "Users can create their own studio manifests" ON public.studio_manifests 
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid()));

CREATE POLICY "Users can update their own studio manifests" ON public.studio_manifests 
    FOR UPDATE USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid()));

-- Automatically set is_active to false for older manifests of the same project when a new one is set to active
CREATE OR REPLACE FUNCTION public.handle_manifest_active_switch()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE public.studio_manifests 
        SET is_active = false 
        WHERE project_id = NEW.project_id AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_manifest_active_switch
    BEFORE INSERT OR UPDATE ON public.studio_manifests
    FOR EACH ROW EXECUTE FUNCTION public.handle_manifest_active_switch();
