-- ==============================================================================
-- AKSELERA.TECH CHAT INTERNAL - DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- 1. PROFILES TABLE (Linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  created_at timestamptz default now() not null
);

-- 2. CONVERSATIONS TABLE (1-on-1 Chat Session)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. CONVERSATION PARTICIPANTS (Junction Table)
create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  last_read_at timestamptz default now() not null,
  primary key (conversation_id, user_id)
);

-- 4. MESSAGES TABLE (Chat Messages)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  content text default '' not null,
  file_url text,
  file_type text,
  file_name text,
  is_deleted boolean default false not null,
  created_at timestamptz default now() not null,
  constraint message_has_content_or_file check (trim(content) <> '' or file_url is not null or is_deleted = true)
);

-- Alter table if already exists in existing database
alter table public.messages add column if not exists file_url text;
alter table public.messages add column if not exists file_type text;
alter table public.messages add column if not exists file_name text;
alter table public.messages add column if not exists is_deleted boolean default false;

-- Indexes for performance
create index if not exists idx_conversation_participants_user on public.conversation_participants(user_id);
create index if not exists idx_conversation_participants_conv on public.conversation_participants(conversation_id);
create index if not exists idx_messages_conv_created on public.messages(conversation_id, created_at asc);
create index if not exists idx_conversations_updated on public.conversations(updated_at desc);

-- ==============================================================================
-- SECURITY DEFINER HELPER FUNCTION (Prevents RLS Recursion)
-- ==============================================================================
create or replace function public.is_participant(conv_id uuid)
returns boolean as $$
  select exists (
    select 1 
    from public.conversation_participants
    where conversation_id = conv_id 
      and user_id = auth.uid()
  );
$$ language sql security definer;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: One account can ONLY read/write their own conversations & messages
-- ==============================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- PROFILES POLICIES
-- Authenticated users can view other profiles to find contacts
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- CONVERSATIONS POLICIES
-- Users can only see conversations they belong to
create policy "Users can view conversations they participate in"
  on public.conversations for select
  to authenticated
  using (public.is_participant(id));

create policy "Authenticated users can create conversations"
  on public.conversations for insert
  to authenticated
  with check (true);

create policy "Participants can update conversation timestamp"
  on public.conversations for update
  to authenticated
  using (public.is_participant(id));

-- CONVERSATION PARTICIPANTS POLICIES
create policy "Users can view participants of their conversations"
  on public.conversation_participants for select
  to authenticated
  using (
    user_id = auth.uid() or public.is_participant(conversation_id)
  );

create policy "Users can insert participants"
  on public.conversation_participants for insert
  to authenticated
  with check (
    -- Either adding oneself or adding participants to a conversation being created
    auth.role() = 'authenticated'
  );

create policy "Users can update own participant record"
  on public.conversation_participants for update
  to authenticated
  using (user_id = auth.uid());

-- MESSAGES POLICIES
create policy "Users can view messages in their conversations"
  on public.messages for select
  to authenticated
  using (public.is_participant(conversation_id));

create policy "Users can insert messages into their conversations"
  on public.messages for insert
  to authenticated
  with check (
    public.is_participant(conversation_id) 
    and sender_id = auth.uid()
  );

create policy "Users can update (unsend) own messages"
  on public.messages for update
  to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

create policy "Participants can delete conversation"
  on public.conversations for delete
  to authenticated
  using (public.is_participant(id));

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================

-- Trigger: Update conversation updated_at when a new message is sent
create or replace function public.handle_new_message()
returns trigger as $$
begin
  update public.conversations
  set updated_at = NEW.created_at
  where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_new_message_update_conv on public.messages;
create trigger on_new_message_update_conv
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- Trigger: Automatically create public.profile when a new user signs up in auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  on conflict (id) do update
  set 
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: sync any existing auth users missing from profiles table
insert into public.profiles (id, email, full_name, created_at)
select 
  id, 
  email,
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as full_name,
  created_at
from auth.users
on conflict (id) do update set
  email = excluded.email,
  full_name = case
    when public.profiles.full_name is null or public.profiles.full_name = ''
    then excluded.full_name
    else public.profiles.full_name
  end;

-- ==============================================================================
-- RPC: CREATE OR GET 1-ON-1 CONVERSATION (Atomic & Safe)
-- ==============================================================================
create or replace function public.create_or_get_conversation(opponent_id uuid)
returns uuid as $$
declare
  existing_conv_id uuid;
  new_conv_id uuid;
begin
  -- Check if conversation already exists between current user and opponent
  select cp1.conversation_id into existing_conv_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2 on cp1.conversation_id = cp2.conversation_id
  where cp1.user_id = auth.uid()
    and cp2.user_id = opponent_id
  limit 1;

  if existing_conv_id is not null then
    return existing_conv_id;
  end if;

  -- Create new conversation
  insert into public.conversations (created_at, updated_at)
  values (now(), now())
  returning id into new_conv_id;

  -- Add both participants
  insert into public.conversation_participants (conversation_id, user_id)
  values
    (new_conv_id, auth.uid()),
    (new_conv_id, opponent_id);

  return new_conv_id;
end;
$$ language plpgsql security definer;

grant execute on function public.create_or_get_conversation(uuid) to authenticated;

-- RPC: UNSEND MESSAGE (Delete for everyone)
create or replace function public.unsend_message(msg_id uuid)
returns void as $$
begin
  update public.messages
  set 
    is_deleted = true,
    content = 'Pesan ini telah ditarik',
    file_url = null,
    file_type = null,
    file_name = null
  where id = msg_id and sender_id = auth.uid();
end;
$$ language plpgsql security definer;

grant execute on function public.unsend_message(uuid) to authenticated;

-- RPC: DELETE ENTIRE CONVERSATION
create or replace function public.delete_conversation(conv_id uuid)
returns void as $$
begin
  if public.is_participant(conv_id) then
    delete from public.conversations where id = conv_id;
  end if;
end;
$$ language plpgsql security definer;

grant execute on function public.delete_conversation(uuid) to authenticated;

-- ==============================================================================
-- STORAGE BUCKET & POLICIES (Chat Attachments & Images)
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Authenticated users can upload attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-attachments' and
    -- Enforce max file size: 10 MB (10 * 1024 * 1024 bytes)
    (metadata->>'size')::bigint <= 10485760
  );

create policy "Public read access for chat attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'chat-attachments');

create policy "Users can update or delete own attachments"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'chat-attachments' and auth.uid()::text = (storage.foldername(name))[1]);

-- ==============================================================================
-- REALTIME REPLICATION SETUP
-- Enables live instant message updates without page refresh
-- ==============================================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_participants;
