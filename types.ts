export enum Sender {
  User = 'user',
  Bot = 'model'
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
}

export interface Expense {
  category: string;
  amount: number;
}

export interface SavingsGoal {
  name: string;
  targetAmount: number;
  targetDate: string; // YYYY-MM-DD
  monthlyContribution: number;
}

export interface ExtraPurchase {
  name: string;
  cost: number;
  affordable: boolean;
  remainingBudget?: number;
  shortfall?: number;
}

export interface FinancialState {
  income: number;
  customCategories: string[];
  expenses: Expense[];
  savingsGoal: SavingsGoal | null;
  extraPurchase: ExtraPurchase | null;
  currentStep: ChatStep;
}

export enum ChatStep {
  Introduction = 'INTRO',
  AskIncome = 'ASK_INCOME',
  AskCategories = 'ASK_CATEGORIES',
  AskExpenses = 'ASK_EXPENSES',
  AskSavingsGoalBool = 'ASK_SAVINGS_BOOL',
  AskSavingsGoalDetails = 'ASK_SAVINGS_DETAILS',
  AskExtraPurchaseBool = 'ASK_EXTRA_BOOL',
  AskExtraPurchaseDetails = 'ASK_EXTRA_DETAILS',
  Summary = 'SUMMARY',
  Completed = 'COMPLETED'
}