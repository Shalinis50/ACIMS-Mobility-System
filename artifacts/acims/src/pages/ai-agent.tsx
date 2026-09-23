import { type FormEvent, useState } from 'react';
import { Bot, BusFront, CircleHelp, Send, ShieldAlert, Sparkles, UsersRound } from 'lucide-react';
import { getGetAiContextQueryKey, useGetAiContext, useSendAiChat } from '@workspace/api-client-react';
import { demoStudentId, EmptyState, ErrorState, LoadingRows, PageHeading } from '@/components/acims-ui';

const suggestions = ['When is the next bus to the main gate?', 'Is there space on the campus loop?', 'Are there any active safety alerts?'];

export default function AiAgentPage() {
  const contextQuery = useGetAiContext({ query: { queryKey: getGetAiContextQueryKey() } });
  const chatMutation = useSendAiChat();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; sources?: string[] }>>([]);
  const context = contextQuery.data;
  const send = (event?: FormEvent) => {
    event?.preventDefault();
    const text = message.trim();
    if (!text || chatMutation.isPending) return;
    setMessages((current) => [...current, { role: 'user', text }]);
    setMessage('');
    chatMutation.mutate({ data: { studentId: demoStudentId, message: text } }, { onSuccess: (response) => setMessages((current) => [...current, { role: 'assistant', text: response.answer, sources: response.sources }]) });
  };
  if (contextQuery.isLoading) return <LoadingRows count={5} />;
  if (contextQuery.isError) return <ErrorState onRetry={() => void contextQuery.refetch()} label="The mobility assistant could not load its current context." />;
  if (!context) return <EmptyState icon={Bot} title="Assistant context unavailable" message="ACIMS cannot answer without a current mobility context." />;
  return <div className="page-in">
    <PageHeading eyebrow="ACIMS assistant" title="Ask the commute." description="A data-grounded mobility companion for the small decisions between leaving your room and arriving on time." action={<div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[11px] font-bold"><span className="pulse-dot h-2 w-2 rounded-full bg-accent-foreground" /> Context current</div>} />
    <section className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
      <div className="space-y-5">
        <div className="rounded-[28px] bg-primary p-6 text-primary-foreground sm:p-8"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-foreground"><Sparkles size={20} /></span><div><div className="mono text-[10px] uppercase tracking-[.16em] text-primary-foreground/55">Suggested questions</div><div className="mt-1 text-lg font-extrabold">Start with something useful.</div></div></div><div className="mt-6 space-y-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" data-testid={`button-suggestion-${suggestion.slice(0, 10).replaceAll(' ', '-').toLowerCase()}`} onClick={() => setMessage(suggestion)} className="w-full rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-3 text-left text-xs font-bold transition hover:bg-primary-foreground/15">{suggestion}</button>)}</div></div>
        <div className="rounded-[28px] border border-border bg-card p-6"><div className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Current context</div><div className="mt-4 grid grid-cols-2 gap-2"><ContextStat icon={BusFront} label="Buses" value={context.buses.length} /><ContextStat icon={UsersRound} label="Queue" value={context.queue.joined ? `#${context.queue.entry?.queuePosition ?? '—'}` : 'Not joined'} /><ContextStat icon={ShieldAlert} label="Alerts" value={context.safetyAlerts.length} /><ContextStat icon={CircleHelp} label="Places" value={context.destinations.length} /></div><p className="mt-4 border-t border-border pt-4 text-[11px] leading-5 text-muted-foreground">No external live data is connected to this assistant. Answers use the current ACIMS context and will say when a fact is unavailable.</p></div>
      </div>
      <div className="flex min-h-[620px] flex-col rounded-[28px] border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center gap-3 border-b border-border pb-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary"><Bot size={17} /></span><div><div className="text-sm font-extrabold">ACIMS mobility desk</div><div className="text-[10px] text-muted-foreground">Grounded in live campus operations</div></div></div>
        <div className="flex-1 space-y-4 overflow-y-auto py-5">{messages.length ? messages.map((item, index) => <div key={`${item.role}-${index}`} data-testid={`message-ai-${index}`} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted text-foreground'}`}><div>{item.text}</div>{item.sources?.length ? <div className="mt-2 border-t border-current/10 pt-2 text-[10px] text-muted-foreground">Sources: {item.sources.join(' · ')}</div> : null}</div></div>) : <div className="grid h-full min-h-[380px] place-items-center text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted"><Bot size={25} /></span><h2 className="mt-4 text-xl font-extrabold">What do you need to know?</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Ask about buses, queues, campus places, or current safety alerts.</p></div></div>}{chatMutation.isPending && <div className="flex justify-start"><div className="skeleton h-12 w-48 rounded-2xl" /></div>}</div>
        <form onSubmit={send} className="flex items-end gap-2 border-t border-border pt-4"><textarea data-testid="input-ai-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={2} placeholder="Ask a practical question…" className="min-h-[52px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" /><button type="submit" data-testid="button-send-ai" disabled={!message.trim() || chatMutation.isPending} aria-label="Send question" className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground disabled:opacity-50"><Send size={17} /></button></form>{chatMutation.isError && <p className="mt-2 text-xs font-bold text-destructive">The assistant could not answer this question. ACIMS data may be temporarily unavailable.</p>}
      </div>
    </section>
  </div>;
}

function ContextStat({ icon: Icon, label, value }: { icon: typeof BusFront; label: string; value: string | number }) { return <div className="rounded-xl bg-muted p-3"><Icon size={14} className="text-muted-foreground" /><div className="mono mt-2 text-[9px] uppercase tracking-[.12em] text-muted-foreground">{label}</div><div className="mt-1 text-sm font-extrabold">{value}</div></div>; }