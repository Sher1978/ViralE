-- Referral System Migration
-- Adds referral code, inviter tracking, partner USD balance, earnings audit log, and payout requests.

-- 1. Extend profiles table with referral fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_balance_usd NUMERIC(10, 2) DEFAULT 0.00 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_id ON public.profiles(referred_by_id);

-- 2. Create referral_earnings table
CREATE TABLE IF NOT EXISTS public.referral_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    referred_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    payment_amount_usd NUMERIC(10, 2) NOT NULL,
    earned_amount_usd NUMERIC(10, 2) NOT NULL,
    payment_provider TEXT NOT NULL, -- 'lemonsqueezy' | 'tribute' | 'stripe'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_inviter ON public.referral_earnings(inviter_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referred ON public.referral_earnings(referred_user_id);

-- 3. Create payout_requests table
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount_usd NUMERIC(10, 2) NOT NULL,
    payout_method TEXT DEFAULT 'telegram_admin' NOT NULL,
    payout_details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    telegram_message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_user ON public.payout_requests(user_id);

-- 4. Enable RLS for new tables
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Inviter can read their own earned commissions
CREATE POLICY "Users can view their own referral earnings" 
    ON public.referral_earnings FOR SELECT 
    USING (auth.uid() = inviter_id);

-- Users can view their own payout requests
CREATE POLICY "Users can view their own payout requests" 
    ON public.payout_requests FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can insert payout requests for themselves
CREATE POLICY "Users can create payout requests" 
    ON public.payout_requests FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
