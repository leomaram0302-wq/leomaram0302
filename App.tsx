import React, { useState, useEffect, useRef } from 'react';
import { ChatStep, FinancialState, Message, Sender, Expense } from './types';
import ChatBubble from './components/ChatBubble';
import Dashboard from './components/Dashboard';
import * as GeminiService from './services/geminiService';

const SYSTEM_INSTRUCTION_BASE = `
Eres un asesor financiero de élite para un cliente en Perú. Tu tono es formal, directo, profesional y serio. Usas "Usted".
La moneda es Soles (S/).
Tu objetivo es obtener información financiera precisa para crear un plan.
No des consejos largos todavía, solo haz las preguntas necesarias según la fase de la conversación.
`;

const App: React.FC = () => {
  // --- State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Financial Data State
  const [financialData, setFinancialData] = useState<FinancialState>({
    income: 0,
    customCategories: [],
    expenses: [],
    savingsGoal: null,
    extraPurchase: null,
    currentStep: ChatStep.Introduction
  });

  // Refs for smooth UI
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Initialization ---
  useEffect(() => {
    // Initial greeting
    const initChat = async () => {
      setIsLoading(true);
      const initialPrompt = "Preséntate como un asesor financiero de élite y pregunta formalmente cuál es el ingreso mensual neto del usuario en Soles.";
      const response = await GeminiService.generateChatResponse([], initialPrompt, SYSTEM_INSTRUCTION_BASE);
      
      setMessages([
        {
          id: '1',
          text: response,
          sender: Sender.Bot,
          timestamp: new Date()
        }
      ]);
      setFinancialData(prev => ({ ...prev, currentStep: ChatStep.AskIncome }));
      setIsLoading(false);
    };

    initChat();
  }, []);

  // --- Logic Handler ---
  const processStep = async (userInput: string) => {
    const step = financialData.currentStep;
    let nextStep = step;
    let botPrompt = "";
    let systemInstruction = SYSTEM_INSTRUCTION_BASE;

    // 1. Handle Income
    if (step === ChatStep.AskIncome) {
      const income = await GeminiService.extractIncome(userInput);
      if (income && income > 0) {
        setFinancialData(prev => ({ ...prev, income }));
        nextStep = ChatStep.AskCategories;
        botPrompt = `El usuario ha indicado ingresos de S/ ${income}. Ahora, pídele que enumere sus categorías de gastos personalizadas (ej: Alquiler, Comida, Transporte), separadas por comas.`;
      } else {
        botPrompt = "El usuario no dio un número válido. Pídele cortésmente que repita su ingreso mensual en números.";
      }
    } 
    
    // 2. Handle Categories
    else if (step === ChatStep.AskCategories) {
      const categories = await GeminiService.extractCategories(userInput);
      if (categories.length > 0) {
        setFinancialData(prev => ({ ...prev, customCategories: categories }));
        nextStep = ChatStep.AskExpenses;
        // Start asking for the first category
        botPrompt = `El usuario definió estas categorías: ${categories.join(', ')}. Pregunta cuánto gasta mensualmente en la PRIMERA categoría: "${categories[0]}". Sé directo.`;
      } else {
        botPrompt = "No se entendieron las categorías. Pídele que las liste separadas por comas.";
      }
    }

    // 3. Handle Expenses Loop
    else if (step === ChatStep.AskExpenses) {
      // Determine which category we were asking about
      const expensesFilled = financialData.expenses.length;
      const currentCategoryName = financialData.customCategories[expensesFilled];
      
      const amount = await GeminiService.extractExpenseAmount(userInput, currentCategoryName);
      
      // Add this expense
      const newExpense: Expense = { category: currentCategoryName, amount };
      const updatedExpenses = [...financialData.expenses, newExpense];
      
      setFinancialData(prev => ({ ...prev, expenses: updatedExpenses }));

      // Are there more categories?
      if (updatedExpenses.length < financialData.customCategories.length) {
        const nextCat = financialData.customCategories[updatedExpenses.length];
        botPrompt = `El usuario indicó S/ ${amount} para ${currentCategoryName}. Ahora pregunta cuánto gasta en "${nextCat}".`;
        nextStep = ChatStep.AskExpenses; // Stay in loop
      } else {
        // Finished expenses
        nextStep = ChatStep.AskSavingsGoalBool;
        botPrompt = `Se han registrado todos los gastos. Ahora pregunta formalmente si desea establecer una meta de ahorro específica.`;
      }
    }

    // 4. Savings Goal Bool
    else if (step === ChatStep.AskSavingsGoalBool) {
      const wantsSaving = await GeminiService.classifyYesNo(userInput);
      if (wantsSaving) {
        nextStep = ChatStep.AskSavingsGoalDetails;
        botPrompt = "El usuario quiere ahorrar. Pídele el nombre de la meta, el monto total objetivo y la fecha límite deseada (o en cuántos meses).";
      } else {
        nextStep = ChatStep.AskExtraPurchaseBool;
        botPrompt = "El usuario no quiere meta de ahorro por ahora. Pregunta si tiene planeado realizar alguna compra extra o capricho pronto para analizar su viabilidad.";
      }
    }

    // 5. Savings Goal Details
    else if (step === ChatStep.AskSavingsGoalDetails) {
      const goalData = await GeminiService.extractSavingsGoal(userInput);
      if (goalData && goalData.targetAmount && goalData.targetDate && goalData.name) {
        // Calculate monthly contribution needed
        const targetDateObj = new Date(goalData.targetDate);
        const now = new Date();
        const monthsDiff = (targetDateObj.getFullYear() - now.getFullYear()) * 12 + (targetDateObj.getMonth() - now.getMonth());
        const safeMonths = Math.max(1, monthsDiff);
        const monthlyContribution = goalData.targetAmount / safeMonths;

        setFinancialData(prev => ({
          ...prev,
          savingsGoal: { ...goalData as any, monthlyContribution }
        }));

        nextStep = ChatStep.AskExtraPurchaseBool;
        botPrompt = `Meta de ahorro calculada (${goalData.name}: S/${monthlyContribution.toFixed(2)}/mes). Ahora pregunta si desea analizar alguna compra extra puntual.`;
      } else {
        botPrompt = "No se pudieron extraer todos los detalles (nombre, monto, fecha). Pídele amablemente que repita los detalles de la meta de ahorro.";
      }
    }

    // 6. Extra Purchase Bool
    else if (step === ChatStep.AskExtraPurchaseBool) {
      const wantsExtra = await GeminiService.classifyYesNo(userInput);
      if (wantsExtra) {
        nextStep = ChatStep.AskExtraPurchaseDetails;
        botPrompt = "Pídele el nombre del producto/servicio y su costo aproximado.";
      } else {
        nextStep = ChatStep.Completed;
        botPrompt = "El usuario ha terminado. Preséntale un resumen final formal, confirmando que su plan de gastos está listo y visible en el panel. Despídete con elegancia.";
      }
    }

    // 7. Extra Purchase Details
    else if (step === ChatStep.AskExtraPurchaseDetails) {
      const purchase = await GeminiService.extractExtraPurchase(userInput);
      if (purchase) {
        // Calculate affordability
        const totalExpenses = financialData.expenses.reduce((sum, e) => sum + e.amount, 0);
        const savings = financialData.savingsGoal ? financialData.savingsGoal.monthlyContribution : 0;
        const disposableIncome = financialData.income - totalExpenses - savings;
        
        const affordable = disposableIncome >= purchase.cost;
        const shortfall = affordable ? 0 : purchase.cost - disposableIncome;
        const remainingBudget = affordable ? disposableIncome - purchase.cost : 0;

        setFinancialData(prev => ({
          ...prev,
          extraPurchase: {
            ...purchase,
            affordable,
            shortfall,
            remainingBudget
          }
        }));

        nextStep = ChatStep.Completed;
        botPrompt = `Analiza la compra extra (${purchase.name}: S/${purchase.cost}). 
        Ingresos disponibles tras gastos y ahorro: S/${disposableIncome.toFixed(2)}.
        ${affordable ? 'Es viable.' : 'No es viable.'}
        Comunica el resultado formalmente y da una recomendación final. Avisa que el resumen completo está a la derecha (o abajo).`;
      } else {
        botPrompt = "No entendí el costo o nombre. Pídele que repita el nombre y precio de la compra extra.";
      }
    }

    // Update Step
    setFinancialData(prev => ({ ...prev, currentStep: nextStep }));

    // Generate AI Response
    const chatHistory = messages.map(m => ({
      role: m.sender,
      parts: [{ text: m.text }]
    }));
    
    const aiResponseText = await GeminiService.generateChatResponse(chatHistory, botPrompt, systemInstruction);
    
    return aiResponseText;
  };

  // --- UI Handlers ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsgText = inputText;
    setInputText('');
    
    // Add User Message
    const newUserMsg: Message = {
      id: Date.now().toString(),
      text: userMsgText,
      sender: Sender.User,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // Process Logic & Get Bot Response
      const botResponseText = await processStep(userMsgText);
      
      const newBotMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponseText,
        sender: Sender.Bot,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newBotMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-slate-950 overflow-hidden font-sans text-slate-200">
      {/* Left Panel: Chat */}
      <div className="flex flex-col w-full lg:w-1/2 h-full border-r border-slate-800 relative">
        
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-900 z-10">
          <h1 className="font-serif text-xl text-gold-400 tracking-wider font-bold">ASESOR ELITE</h1>
          <span className="ml-auto text-xs text-slate-500 uppercase tracking-widest">Finanzas Personales</span>
        </div>

        {/* Chat Messages Area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-2 bg-gradient-to-b from-slate-900 to-slate-950"
        >
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-center space-x-2 p-4">
              <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escriba su respuesta..."
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-all placeholder-slate-500"
              disabled={isLoading || financialData.currentStep === ChatStep.Completed}
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim() || financialData.currentStep === ChatStep.Completed}
              className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-gold-900/20"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel: Dashboard */}
      <div className="w-full lg:w-1/2 h-full bg-slate-900 hidden lg:block relative">
        <Dashboard data={financialData} />
      </div>

      {/* Mobile Dashboard Toggle (Optional implementation for mobile view could go here, for now standard responsive stack) */}
      <div className="lg:hidden w-full h-[400px] border-t border-slate-800">
         <Dashboard data={financialData} />
      </div>
    </div>
  );
};

export default App;