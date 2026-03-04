import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Pill,
  Settings,
  Send,
  HeartPulse,
  User,
} from "lucide-react";

const PatientChatbot = () => {
  const { t } = useTranslation();
  
  const navItems = [
    { name: t('common.dashboard'), href: "/patient/dashboard", icon: LayoutDashboard },
    { name: t('common.appointments'), href: "/patient/appointments", icon: Calendar },
    { name: t('common.myRecords'), href: "/patient/records", icon: FileText },
    { name: t('common.prescriptions'), href: "/patient/prescriptions", icon: Pill },
    { name: t('common.aiHealthAssistant'), href: "/patient/chatbot", icon: HeartPulse },
    { name: t('common.settings'), href: "/patient/settings", icon: Settings },
  ];

  const [messages, setMessages] = useState([
    {
      id: "1",
      content: t('chatbot.welcome'),
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = (text = null) => {
    const messageContent = text || inputValue;
    if (!messageContent.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      content: messageContent,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Simulate bot response
    setTimeout(() => {
      const botResponses = {
        default: t('chatbot.responses.default'),
        headache: t('chatbot.responses.headache'),
        prescription: t('chatbot.responses.prescription'),
        appointment: t('chatbot.responses.appointment'),
      };

      let response = botResponses.default;
      const lowerInput = messageContent.toLowerCase();
      
      if (lowerInput.includes("headache") || lowerInput.includes("pain")) {
        response = botResponses.headache;
      } else if (lowerInput.includes("prescription") || lowerInput.includes("medicine") || lowerInput.includes("medication")) {
        response = botResponses.prescription;
      } else if (lowerInput.includes("appointment") || lowerInput.includes("book")) {
        response = botResponses.appointment;
      }

      const botMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    t('chatbot.actions.cold'),
    t('chatbot.actions.stress'),
    t('chatbot.actions.explain'),
    t('chatbot.actions.book'),
  ];

  return (
    <DashboardLayout
      navItems={navItems}
      userType="patient"
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            {t('chatbot.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('chatbot.subtitle')}
          </p>
        </div>

        {/* Chat Container */}
        <div className="dashboard-card flex flex-col h-[600px]">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.sender === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.sender === "bot"
                      ? "bg-primary/10"
                      : "bg-accent/10"
                  }`}
                >
                  {message.sender === "bot" ? (
                    <HeartPulse className="w-5 h-5 text-primary" />
                  ) : (
                    <User className="w-5 h-5 text-accent" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    message.sender === "bot"
                      ? "bg-secondary text-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      message.sender === "bot"
                      ? "text-muted-foreground"
                      : "text-primary-foreground/70"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          {messages.length === 1 && (
            <div className="px-6 pb-4">
              <p className="text-sm text-muted-foreground mb-3">{t('chatbot.quickQuestions')}</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage(action)}
                    className="text-xs"
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('chatbot.placeholder')}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {t('chatbot.disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PatientChatbot;
