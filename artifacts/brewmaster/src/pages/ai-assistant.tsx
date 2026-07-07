import { useState } from "react";
import { useAiChat, useAiDiagnose, useGetActiveProduction } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Activity, ShieldAlert, Cpu } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: 'BrewMaster AI online. I can assist with recipe adjustments, interpreting sensor telemetry, or running diagnostic checks on the active production. How can I help?' }
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
        data: { message: userMsg, context: `Active Production ID: ${activeProduction?.id || 'None'}` }
      });
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: res.content }]);
    } catch(e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Error communicating with AI core.' }]);
    }
  };

  const handleDiagnose = async () => {
    if (!activeProduction) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'No active production run to diagnose.' }]);
      return;
    }
    
    try {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: 'Run full system diagnosis on active production.' }]);
      const res = await diagnoseMutation.mutateAsync({ data: { productionId: activeProduction.id } });
      
      const reply = `**Diagnosis Complete**
Confidence: ${res.confidence * 100}%
Status: ${res.diagnosis}

**Suggestions:**
${res.suggestions.map(s => `- ${s}`).join('\n')}

**Warnings:**
${res.warnings?.map(w => `- ${w}`).join('\n') || 'None'}`;

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply }]);
    } catch(e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Diagnosis failed.' }]);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto h-[calc(100vh-2rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-md border border-primary/50">
            <Cpu className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Co-Pilot</h1>
            <p className="text-muted-foreground text-xs uppercase tracking-widest font-mono">Neural interface active</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="border-primary/50 text-primary hover:bg-primary/10 gap-2 font-bold tracking-widest uppercase text-xs"
          onClick={handleDiagnose}
          disabled={!activeProduction || diagnoseMutation.isPending}
        >
          <Activity className="w-4 h-4" /> Run Diagnosis
        </Button>
      </div>

      <Card className="flex-1 bg-sidebar border-sidebar-border shadow-2xl flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded bg-background border border-primary/50 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg p-4 text-sm font-mono whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-12' 
                    : 'bg-background border border-border/50 text-foreground mr-12'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded bg-background border border-primary/50 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <div className="bg-background border border-border/50 text-muted-foreground rounded-lg p-4 text-sm font-mono animate-pulse">
                  Processing...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 bg-background border-t border-sidebar-border">
          <form 
            onSubmit={e => { e.preventDefault(); handleSend(); }}
            className="flex gap-3"
          >
            <Input 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Enter command or query..."
              className="font-mono bg-sidebar border-sidebar-border focus-visible:ring-primary"
              disabled={chatMutation.isPending}
            />
            <Button type="submit" disabled={!input.trim() || chatMutation.isPending} className="px-8">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
