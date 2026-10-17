-- Execute ONCE in your own Supabase project's SQL Editor.
create table if not exists public.tafakkur_quiz_attempts (
 tg_id bigint primary key,
 fullname text not null,
 age integer not null check(age between 7 and 100),
 entered_username text,
 verified_username text,
 answers integer[] not null default '{}'::integer[],
 question_index integer not null default 0 check(question_index between 0 and 25),
 question_started_at timestamptz not null default now(),
 started_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '12 minutes'),
 status text not null default 'active' check(status in('active','finished')),
 finish_reason text,
 completed_at timestamptz,
 notification_sent_at timestamptz,
 constraint answer_count check(cardinality(answers)=question_index)
);
alter table public.tafakkur_quiz_attempts enable row level security;
revoke all on table public.tafakkur_quiz_attempts from anon,authenticated;
grant all on table public.tafakkur_quiz_attempts to service_role;

create or replace function public.quiz_expire_locked(p_tg_id bigint)
returns void language plpgsql security definer set search_path=public as $$
begin
 update public.tafakkur_quiz_attempts
 set answers=answers || array_fill(-1,ARRAY[25-question_index]),
     question_index=25,status='finished',finish_reason='expired',completed_at=now()
 where tg_id=p_tg_id and status='active' and expires_at<=now();
end; $$;

create or replace function public.quiz_begin(
 p_tg_id bigint,p_name text,p_age integer,p_entered_username text,p_verified_username text)
returns public.tafakkur_quiz_attempts language plpgsql security definer set search_path=public as $$
declare r public.tafakkur_quiz_attempts;
begin
 insert into public.tafakkur_quiz_attempts(tg_id,fullname,age,entered_username,verified_username)
 values(p_tg_id,p_name,p_age,p_entered_username,p_verified_username) on conflict(tg_id) do nothing;
 select * into r from public.tafakkur_quiz_attempts where tg_id=p_tg_id for update;
 perform public.quiz_expire_locked(p_tg_id);
 select * into r from public.tafakkur_quiz_attempts where tg_id=p_tg_id;
 return r;
end; $$;

create or replace function public.quiz_read(p_tg_id bigint)
returns public.tafakkur_quiz_attempts language plpgsql security definer set search_path=public as $$
declare r public.tafakkur_quiz_attempts;
begin
 select * into r from public.tafakkur_quiz_attempts where tg_id=p_tg_id for update;
 if not found then return null;end if;
 perform public.quiz_expire_locked(p_tg_id);
 select * into r from public.tafakkur_quiz_attempts where tg_id=p_tg_id;
 return r;
end; $$;

create or replace function public.quiz_submit(p_tg_id bigint,p_index integer,p_choice integer)
returns public.tafakkur_quiz_attempts language plpgsql security definer set search_path=public as $$
declare r public.tafakkur_quiz_attempts;
declare actual_choice integer;
begin
 if p_choice < -1 or p_choice > 3 then raise exception 'INVALID_CHOICE';end if;
 select * into r from public.tafakkur_quiz_attempts where tg_id=p_tg_id for update;
 if not found then raise exception 'NOT_STARTED';end if;
 perform public.quiz_expire_locked(p_tg_id);
 select * into r from public.tafakkur_quiz_attempts where tg_id=p_tg_id;
 if r.status='finished' then return r;end if;
 if r.question_index<>p_index then raise exception 'STALE_INDEX';end if;
 if now()>=r.question_started_at+interval '20 seconds' then actual_choice:=-1;
 else actual_choice:=p_choice;end if;
 update public.tafakkur_quiz_attempts
 set answers=array_append(answers,actual_choice),
     question_index=question_index+1,
     question_started_at=now(),
     status=case when question_index+1=25 then 'finished' else 'active' end,
     finish_reason=case when question_index+1=25 then 'completed' else null end,
     completed_at=case when question_index+1=25 then now() else null end
 where tg_id=p_tg_id returning * into r;
 return r;
end; $$;

create or replace function public.quiz_mark_notified(p_tg_id bigint)
returns void language plpgsql security definer set search_path=public as $$
begin
 update public.tafakkur_quiz_attempts
 set notification_sent_at=coalesce(notification_sent_at,now())
 where tg_id=p_tg_id and status='finished';
end; $$;

revoke all on function public.quiz_expire_locked(bigint) from public,anon,authenticated;
revoke all on function public.quiz_begin(bigint,text,integer,text,text) from public,anon,authenticated;
revoke all on function public.quiz_read(bigint) from public,anon,authenticated;
revoke all on function public.quiz_submit(bigint,integer,integer) from public,anon,authenticated;
revoke all on function public.quiz_mark_notified(bigint) from public,anon,authenticated;
grant execute on function public.quiz_expire_locked(bigint) to service_role;
grant execute on function public.quiz_begin(bigint,text,integer,text,text) to service_role;
grant execute on function public.quiz_read(bigint) to service_role;
grant execute on function public.quiz_submit(bigint,integer,integer) to service_role;
grant execute on function public.quiz_mark_notified(bigint) to service_role;