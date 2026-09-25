import { type FormEvent, useState } from 'react';
import { Bot, BusFront, CheckCircle2, ChevronRight, CircleHelp, Compass, Send, ShieldAlert, Sparkles, User, UsersRound } from 'lucide-react';
import { getGetAiContextQueryKey, useGetAiContext, useSendAiChat } from '@workspace/api-client-react';
import { demoStudentId, EmptyState, ErrorState, LoadingRows, PageHeading } from '@/components/acims-ui';

const promptSuggestions = [
  'How do I get to the library?',
  'Which bus should I take?',
  'Is my bus delayed?',
  'What is the fastest available option?',
  'I missed my bus. What can I take now?',
  'Is there another route?',
  'How long will my journey take?',
  'Which route is safer?',
];

export default function AiAgentPage() {
  const contextQuery = useGetAiContext({ query: { queryKey: getGetAiContextQueryKey() } });
  const chatMutation = useSendAiChat();
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; sources?: string[]; time: string }>>([
    {
      role: 'assistant',
      text: 'Hello! I am your ACIMS Mobility Assistant. I can check live bus locations, delays, passenger capacity, walking times, and safety alerts to help guide your commute.',
      sources: ['ACIMS Live Network State'],
      time: 'Just now',
    },
  ]);

  const context = contextQuery.data;

  const send = (overrideMessage?: string) => {
    const textToSend = (overrideMessage || message).trim();
    if (!textToSend || chatMutation.isPending) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((current) => [...current, { role: 'user', text: textToSend, time: timeStr }]);
    if (!overrideMessage) setMessage('');

    chatMutation.mutate(
      { data: { studentId: demoStudentId, message: textToSend, destinationId: selectedDestinationId || undefined } },
      {
        onSuccess: (response) => {
          setMessages((current) => [
            ...current,
            {
              role: 'assistant',
              text: response.answer,
              sources: response.sources,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        },
      }
    );
  };

  if (contextQuery.isLoading) return <LoadingRows count={5} />;
  if (contextQuery.isError) return <ErrorState onRetry={() => void contextQuery.refetch()} label="The mobility assistant could not load its current context." />;
  if (!context) return <EmptyState icon={Bot} title="Assistant context unavailable" message="ACIMS cannot answer without a current mobility context." />;

  const primaryBus = context.buses[0];

  return (
    <div className="page-in">
      <PageHeading
        eyebrow="Adaptive AI assistant"
        title="Ask the commute."
        description="A data-grounded campus mobility companion combining live vehicle telemetry, delays, queues, walking networks, and safety awareness."
        action={
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[11px] font-bold">
            <span className="pulse-dot h-2 w-2 rounded-full bg-accent-foreground" /> Grounded in {context.buses.length} active fleet buses
          </div>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
        <div className="space-y-5">
          {/* Destination Context Card */}
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Focus Query Context</div>
            <div className="mt-2 text-sm font-extrabold">Where are you traveling today?</div>
            <select
              value={selectedDestinationId}
              onChange={(e) => setSelectedDestinationId(e.target.value)}
              className="mt-3 h-11 w-full rounded-xl border border-input bg-background px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">General campus mobility (No destination selected)</option>
              {context.destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.type})
                </option>
              ))}
            </select>
            {selectedDestinationId && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Questions will be answered specifically in relation to {context.destinations.find((d) => d.id === selectedDestinationId)?.name}.
              </p>
            )}
          </div>

          {/* Quick Questions Chips */}
          <div className="rounded-[28px] bg-primary p-6 text-primary-foreground sm:p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Sparkles size={18} />
              </span>
              <div>
                <div className="mono text-[10px] uppercase tracking-[.16em] text-primary-foreground/55">Instant Queries</div>
                <div className="mt-0.5 text-base font-extrabold">Common student questions</div>
              </div>
            </div>

            <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {promptSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  data-testid={`button-suggestion-${suggestion.slice(0, 12).replaceAll(' ', '-').toLowerCase()}`}
                  onClick={() => send(suggestion)}
                  disabled={chatMutation.isPending}
                  className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 text-left text-xs font-bold transition hover:bg-primary-foreground/20 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Current Live Context Metrics */}
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
            <div className="mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Live Fleet & Safety Context</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ContextStat icon={BusFront} label="Fleet Vehicles" value={`${context.buses.length} active`} />
              <ContextStat
                icon={UsersRound}
                label="Queue Outlook"
                value={context.queue.joined ? `Position #${context.queue.entry?.queuePosition}` : `${context.queue.seatsAvailable} seats open`}
              />
              <ContextStat icon={ShieldAlert} label="Safety Notices" value={`${context.safetyAlerts.length} active`} />
              <ContextStat icon={Compass} label="Landmarks" value={`${context.destinations.length} mapped`} />
            </div>

            {primaryBus && (
              <div className="mt-4 rounded-xl bg-muted p-3 text-xs">
                <div className="font-extrabold">Next Arrival: Bus #{primaryBus.busNumber}</div>
                <div className="text-muted-foreground mt-0.5">
                  {primaryBus.etaMinutes} min to {primaryBus.nextStop} · {primaryBus.status}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Interaction Interface */}
        <div className="flex min-h-[660px] flex-col rounded-[28px] border border-border bg-card p-5 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Bot size={20} />
              </span>
              <div>
                <div className="text-sm font-extrabold">ACIMS Mobility Intelligence Desk</div>
                <div className="text-[10px] text-muted-foreground">Real-time answers powered by live telemetry</div>
              </div>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 space-y-4 overflow-y-auto py-5 pr-1">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                data-testid={`message-ai-${index}`}
                className={`flex gap-3 ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {item.role === 'assistant' && (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground text-xs font-bold mt-1">
                    <Bot size={15} />
                  </span>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-5 ${
                    item.role === 'user'
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-bl-sm bg-muted text-foreground'
                  }`}
                >
                  <div className="whitespace-pre-line font-medium">{item.text}</div>
                  {item.sources && item.sources.length > 0 && (
                    <div className="mt-2 border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                      <span className="font-bold">Grounded in: </span>
                      {item.sources.join(' · ')}
                    </div>
                  )}
                  <div className="mt-1 text-[9px] opacity-60 text-right">{item.time}</div>
                </div>
                {item.role === 'user' && (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground text-xs font-bold mt-1">
                    <User size={15} />
                  </span>
                )}
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex gap-3 justify-start items-center">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground text-xs font-bold">
                  <Bot size={15} />
                </span>
                <div className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground animate-pulse">
                  Querying ACIMS live fleet data, ETA matrices, and safety signals…
                </div>
              </div>
            )}
          </div>

          {/* Question Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-border pt-4"
          >
            <input
              data-testid="input-ai-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask a question (e.g. How do I get to Tambaram? Which bus is delayed?)"
              className="h-12 flex-1 rounded-xl border border-input bg-background px-4 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              data-testid="button-send-ai"
              disabled={!message.trim() || chatMutation.isPending}
              aria-label="Send query"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground transition hover:opacity-90 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>

          {chatMutation.isError && (
            <p className="mt-2 text-xs font-bold text-destructive">
              The mobility desk could not answer that query. Please try again.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function ContextStat({ icon: Icon, label, value }: { icon: typeof BusFront; label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <Icon size={14} className="text-muted-foreground" />
      <div className="mono mt-1 text-[9px] uppercase tracking-[.12em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-xs font-extrabold">{value}</div>
    </div>
  );
}