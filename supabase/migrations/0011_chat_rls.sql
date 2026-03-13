ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER avoids recursive RLS when checking membership
CREATE OR REPLACE FUNCTION is_conversation_member(conv_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

-- conversations
CREATE POLICY "Members view conversations" ON public.conversations FOR SELECT USING (is_conversation_member(id));
CREATE POLICY "Auth users create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group admins update conversations" ON public.conversations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = id AND user_id = auth.uid() AND role = 'admin'));

-- conversation_members
CREATE POLICY "Members view members" ON public.conversation_members FOR SELECT USING (is_conversation_member(conversation_id));
CREATE POLICY "Auth users join" ON public.conversation_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Own last_read update" ON public.conversation_members FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Leave or admin remove" ON public.conversation_members FOR DELETE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));

-- messages
CREATE POLICY "Members view messages" ON public.messages FOR SELECT USING (is_conversation_member(conversation_id));
CREATE POLICY "Members send messages" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND is_conversation_member(conversation_id));
CREATE POLICY "Sender edits own message" ON public.messages FOR UPDATE USING (sender_id = auth.uid());

-- bug_reports
CREATE POLICY "Submit bug report" ON public.bug_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "View own reports" ON public.bug_reports FOR SELECT USING (user_id = auth.uid());

-- storage
CREATE POLICY "Auth upload chat attachment" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Public read chat attachments" ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments');
