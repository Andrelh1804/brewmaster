import { useState } from "react";
import { useAiChat, useAiDiagnose, useGetActiveProduction } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Activity, Cpu } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: 'BrewMaster IA online. Posso ajudar com ajustes de receita, interpretação de telemetria dos sensores ou executar verificações de diagnóstico na produção ativa. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState("");
  const chatMutation = useAiChat();
  const diagnoseMutation = useAiDiagnose();
  const { data: activeProduction } = useGetActiveProduction();

  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);

    try {
      const res = await chatMutation.mutateAsync({
        data: { message: userMsg, context: `ID de Produção Ativa: ${activeProduction?.id || 'Nenhuma'}` }
      });
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: res.content }]);
    } catch(e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Erro ao comunicar com o núcleo de IA.' }]);
    }
  };

  const handleDiagnose = async () => {
    if (!activeProduction) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Nenhuma produção ativa para diagnosticar.' }]);
      return;
    }
    
    try {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: 'Executar diagnóstico completo do sistema na produção ativa.' }]);
      const res = await diagnoseMutation.mutateAsync({ data: { productionId: activeProduction.id } });
      
      const reply = `**Diagnóstico Concluído**
Confiança: ${(res.confidence * 100).toFixed(0)}%
Status: ${res.diagnosis}

**Sugestões:**
${res.suggestions.map(s => `- ${s}`).join('\n')}

**Avisos:**
${res.warnings?.map(w => `- ${w}`).join('\n') || 'Nenhum'}`;

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply }]);
    } catch(e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Diagnóstico falhou.' }]);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col space-y-4" style={{ height: 'calc(100dvh - 3.5rem)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-md border border-primary/50">
            <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Co-Piloto IA</h1>
            <p className="text-muted-foreground text-xs uppercase tracking-widest font-mono">Interface neural ativa</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="border-primary/50 text-primary hover:bg-primary/10 gap-2 font-bold tracking-widest uppercase text-xs"
          onClick={handleDiagnose}
          disabled={!activeProduction || diagnoseMutation.isPending}
        >
          <Activity className="w-4 h-4" /> Executar Diagnóstico
        </Button>
      </div>

      <Card className="flex-1 bg-sidebar border-sidebar-border shadow-2xl flex flex-col overflow-hidden min-h-0">
        <ScrollArea className="flex-1 p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 sm:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-background border border-primary/50 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 text-sm font-mono whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-8 sm:ml-12' 
                    : 'bg-background border border-border/50 text-foreground mr-8 sm:mr-12'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-muted flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-3 sm:gap-4 justify-start">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-background border border-primary/50 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse" />
                </div>
                <div className="bg-background border border-border/50 text-muted-foreground rounded-lg p-3 sm:p-4 text-sm font-mono animate-pulse">
                  Processando...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-3 sm:p-4 bg-background border-t border-sidebar-border shrink-0">
          <form 
            onSubmit={e => { e.preventDefault(); handleSend(); }}
            className="flex gap-2 sm:gap-3"
          >
            <Input 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite um comando ou pergunta..."
              className="font-mono bg-sidebar border-sidebar-border focus-visible:ring-primary text-sm"
              disabled={chatMutation.isPending}
            />
            <Button type="submit" disabled={!input.trim() || chatMutation.isPending} className="px-4 sm:px-8 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
