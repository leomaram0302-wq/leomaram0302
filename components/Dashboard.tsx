import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { FinancialState } from '../types';

interface DashboardProps {
  data: FinancialState;
}

const COLORS = ['#d97706', '#fbbf24', '#94a3b8', '#475569', '#fcd34d', '#1e293b'];

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const totalExpenses = data.expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const savingsMonthly = data.savingsGoal ? data.savingsGoal.monthlyContribution : 0;
  const remaining = data.income - totalExpenses - savingsMonthly;

  const pieData = [
    ...data.expenses.map(e => ({ name: e.category, value: e.amount })),
    { name: 'Ahorro Meta', value: savingsMonthly },
    { name: 'Disponible', value: remaining > 0 ? remaining : 0 }
  ].filter(x => x.value > 0);

  const barData = [
    { name: 'Ingresos', amount: data.income },
    { name: 'Gastos', amount: totalExpenses },
    { name: 'Ahorros', amount: savingsMonthly },
  ];

  return (
    <div className="w-full h-full p-6 bg-slate-900/50 backdrop-blur-sm border-l border-slate-700 overflow-y-auto">
      <h2 className="text-2xl font-serif text-gold-400 mb-6 border-b border-slate-700 pb-2">
        Resumen Financiero
      </h2>

      <div className="grid grid-cols-1 gap-6 mb-8">
        <div className="bg-slate-850 p-4 rounded-lg border border-slate-700 shadow-lg">
          <h3 className="text-sm text-slate-400 uppercase tracking-wider">Ingreso Neto</h3>
          <p className="text-3xl font-bold text-white">S/ {data.income.toFixed(2)}</p>
        </div>
        <div className="bg-slate-850 p-4 rounded-lg border border-slate-700 shadow-lg">
          <h3 className="text-sm text-slate-400 uppercase tracking-wider">Gastos Totales</h3>
          <p className="text-3xl font-bold text-red-400">S/ {totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-slate-850 p-4 rounded-lg border border-slate-700 shadow-lg">
          <h3 className="text-sm text-slate-400 uppercase tracking-wider">Saldo Disponible</h3>
          <p className={`text-3xl font-bold ${remaining >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
            S/ {remaining.toFixed(2)}
          </p>
        </div>
      </div>

      {data.expenses.length > 0 && (
        <div className="mb-8 h-64 w-full bg-slate-850 rounded-lg p-4 border border-slate-700">
          <h3 className="text-lg text-slate-200 mb-4 font-serif">Distribución de Gastos</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                formatter={(value: number) => `S/ ${value.toFixed(2)}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.savingsGoal && (
        <div className="bg-slate-850 p-6 rounded-lg border border-gold-600/30 shadow-lg mb-8">
          <h3 className="text-gold-400 font-bold text-lg mb-2">Meta de Ahorro: {data.savingsGoal.name}</h3>
          <div className="flex justify-between text-slate-300 text-sm mb-2">
            <span>Objetivo: S/ {data.savingsGoal.targetAmount.toFixed(2)}</span>
            <span>Fecha: {data.savingsGoal.targetDate}</span>
          </div>
          <div className="mt-2 p-3 bg-slate-900 rounded border border-slate-700">
            <p className="text-center text-white">
              Necesitas ahorrar <span className="text-gold-500 font-bold">S/ {data.savingsGoal.monthlyContribution.toFixed(2)}</span> mensuales.
            </p>
          </div>
        </div>
      )}

      {data.extraPurchase && (
        <div className={`p-6 rounded-lg border shadow-lg ${data.extraPurchase.affordable ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
          <h3 className="font-bold text-lg mb-2 text-white">
            Análisis de Compra: {data.extraPurchase.name}
          </h3>
          <p className="text-slate-300 mb-2">Costo: S/ {data.extraPurchase.cost.toFixed(2)}</p>
          
          {data.extraPurchase.affordable ? (
            <div className="text-emerald-400">
              <p className="font-bold">¡Es viable!</p>
              <p className="text-sm mt-1">Saldo restante tras compra: S/ {data.extraPurchase.remainingBudget?.toFixed(2)}</p>
            </div>
          ) : (
            <div className="text-red-400">
              <p className="font-bold">No es recomendable.</p>
              <p className="text-sm mt-1">Faltante: S/ {data.extraPurchase.shortfall?.toFixed(2)}</p>
              <p className="text-xs text-slate-400 mt-2 italic">Considere reducir gastos en categorías no esenciales.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;