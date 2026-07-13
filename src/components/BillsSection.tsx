import React, { useState } from 'react';
import { Bill } from '../types';
import { Plus, Trash2, CheckCircle, AlertTriangle, Check, DollarSign, Calendar, Info, Calculator, CreditCard, RotateCw, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BillsSectionProps {
  bills: Bill[];
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
  addToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function BillsSection({ bills, setBills, addToast }: BillsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<'strictly-month' | 'with-overdue' | 'all'>('strictly-month');

  const handleOpenAdd = () => {
    setEditingBillId(null);
    setTitle('');
    setAmount('');
    setDueDate('');
    setNotes('');
    setRecurring(false);
    setIsAdding(true);
  };

  const handleOpenEdit = (bill: Bill) => {
    setEditingBillId(bill.id);
    setTitle(bill.title);
    setAmount(bill.amount.toString());
    setDueDate(bill.dueDate);
    setNotes(bill.notes || '');
    setRecurring(bill.recurring || false);
    setIsAdding(true);
  };

  const handlePrevMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || !dueDate) return;

    if (editingBillId) {
      setBills(prev =>
        prev
          .map(b => {
            if (b.id === editingBillId) {
              return {
                ...b,
                title: title.trim(),
                amount: parseFloat(amount),
                dueDate,
                notes: notes.trim() || undefined,
                recurring,
              };
            }
            return b;
          })
          .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      );
      addToast?.(`Conta "${title.trim()}" atualizada com sucesso!`, 'success');
    } else {
      const newBill: Bill = {
        id: `bill-${Date.now()}`,
        title: title.trim(),
        amount: parseFloat(amount),
        dueDate,
        paid: false,
        notes: notes.trim() || undefined,
        recurring,
      };

      setBills(prev => [...prev, newBill].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
      addToast?.(`Conta "${newBill.title}" adicionada com sucesso!`, 'success');
    }

    setTitle('');
    setAmount('');
    setDueDate('');
    setNotes('');
    setRecurring(false);
    setIsAdding(false);
    setEditingBillId(null);
  };

  const handleTogglePaid = (id: string) => {
    setBills(prev => {
      let newBillsToAppend: Bill[] = [];
      const updated = prev.map(b => {
        if (b.id === id) {
          const nextPaid = !b.paid;
          addToast?.(
            nextPaid ? `Conta "${b.title}" marcada como paga! ✓` : `Conta "${b.title}" pendente`,
            nextPaid ? 'success' : 'info'
          );

          if (nextPaid && b.recurring) {
            // Calculate next month's due date
            const [year, month, day] = b.dueDate.split('-').map(Number);
            const currentDate = new Date(year, month - 1, day);
            const nextDate = new Date(currentDate);
            nextDate.setMonth(nextDate.getMonth() + 1);
            
            const nextYear = nextDate.getFullYear();
            const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
            const nextDay = String(nextDate.getDate()).padStart(2, '0');
            const nextDueDateStr = `${nextYear}-${nextMonth}-${nextDay}`;

            // Check if there is already a bill with the same title and same next dueDate
            const alreadyExists = prev.some(
              x => x.title.toLowerCase() === b.title.toLowerCase() && x.dueDate === nextDueDateStr
            );

            if (!alreadyExists) {
              newBillsToAppend.push({
                id: `bill-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                title: b.title,
                amount: b.amount,
                dueDate: nextDueDateStr,
                paid: false,
                notes: b.notes,
                recurring: true,
              });
            }
          }

          return { ...b, paid: nextPaid };
        }
        return b;
      });

      if (newBillsToAppend.length > 0) {
        addToast?.(`Nova cobrança criada para o próximo mês (${newBillsToAppend[0].dueDate})! 🔁`, 'info');
        return [...updated, ...newBillsToAppend].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      }
      return updated;
    });
  };

  const handleDeleteBill = (id: string) => {
    const targetBill = bills.find(b => b.id === id);
    if (window.confirm('Tem certeza que deseja remover esta conta?')) {
      setBills(prev => prev.filter(b => b.id !== id));
      if (targetBill) {
        addToast?.(`Conta "${targetBill.title}" excluída.`, 'info');
      }
    }
  };

  // Helper: get payment status properties
  const getBillStatus = (bill: Bill) => {
    if (bill.paid) return { label: 'Pago', color: 'bg-emerald-50 text-emerald-800 border-emerald-100', dot: 'bg-emerald-500' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(bill.dueDate + 'T00:00:00');
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Atrasado por ${Math.abs(diffDays)}d`, color: 'bg-red-50 text-red-800 border-red-100 animate-pulse', dot: 'bg-red-500', isOverdue: true };
    } else if (diffDays <= 3) {
      return { label: `Vence em ${diffDays}d`, color: 'bg-amber-50 text-amber-800 border-amber-100', dot: 'bg-amber-500', isClose: true };
    } else {
      return { label: `Vence em ${diffDays}d`, color: 'bg-blue-50 text-blue-800 border-blue-100', dot: 'bg-blue-500' };
    }
  };

  const filteredBills = bills.filter(bill => {
    const [year, month] = bill.dueDate.split('-').map(Number);
    const billDate = new Date(year, month - 1, 1);
    const targetDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);

    if (viewMode === 'strictly-month') {
      return year === selectedMonth.getFullYear() && month === (selectedMonth.getMonth() + 1);
    }

    if (viewMode === 'with-overdue') {
      // If it's in the selected month
      if (year === selectedMonth.getFullYear() && month === (selectedMonth.getMonth() + 1)) {
        return true;
      }
      // If it is from a previous month AND is unpaid, show it so it doesn't get forgotten
      if (billDate < targetDate && !bill.paid) {
        return true;
      }
      return false;
    }

    // 'all'
    return true;
  });

  const totalPending = filteredBills
    .filter(b => !b.paid)
    .reduce((sum, b) => sum + b.amount, 0);

  const overdueAndCloseBills = bills.filter(b => {
    if (b.paid) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(b.dueDate + 'T00:00:00');
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  });

  return (
    <div id="bills-section" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-semibold tracking-tight text-slate-900">
            Contas a Pagar
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Mantenha seu fluxo financeiro mensal sob controle e seja lembrado antes de vencer
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Month Switcher */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition cursor-pointer"
              title="Mês Anterior"
              type="button"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-slate-800 min-w-[120px] text-center capitalize">
              {selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition cursor-pointer"
              title="Próximo Mês"
              type="button"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-xs cursor-pointer h-10"
          >
            <Plus size={16} />
            Adicionar Conta
          </button>
        </div>
      </div>

      {/* Reminder Banner */}
      {overdueAndCloseBills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-gradient-to-r from-rose-50 to-amber-50/50 border border-rose-200/80 rounded-3xl p-5 shadow-xs flex items-start gap-4"
        >
          <span className="p-3 bg-rose-600 text-white rounded-2xl shadow-sm shrink-0">
            <AlertTriangle size={20} className="animate-pulse" />
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-rose-950 tracking-tight">
              Atenção: Compromissos Financeiros Pendentes
            </h4>
            <p className="text-xs text-rose-800/90 mt-1 leading-relaxed">
              Você tem <strong className="text-rose-950 font-extrabold">{overdueAndCloseBills.length} conta(s)</strong> vencendo muito em breve ou em atraso. Mantenha seu fluxo em dia e evite juros indesejados.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {overdueAndCloseBills.map(b => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-xs border border-rose-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-900 shadow-2xs"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  {b.title}
                  <span className="font-mono text-rose-600 bg-rose-50/50 px-1.5 py-0.5 rounded-sm">
                    {b.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Calculator size={20} />
          </span>
          <div>
            <p className="text-[10px] font-mono text-slate-400 font-bold uppercase">Total Pendente</p>
            <h3 className="text-lg font-bold font-display text-slate-900">
              {totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CreditCard size={20} />
          </span>
          <div>
            <p className="text-[10px] font-mono text-slate-400 font-bold uppercase">Contas Pagas</p>
            <h3 className="text-lg font-bold font-display text-slate-900">
              {filteredBills.filter(b => b.paid).length} / {filteredBills.length}
            </h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
          <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </span>
          <div>
            <p className="text-[10px] font-mono text-slate-400 font-bold uppercase">Contas em Atraso</p>
            <h3 className="text-lg font-bold font-display text-red-600">
              {filteredBills.filter(b => {
                if (b.paid) return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const due = new Date(b.dueDate + 'T00:00:00');
                return due.getTime() < today.getTime();
              }).length}
            </h3>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3 border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex bg-slate-100 p-0.5 rounded-xl flex-wrap">
          <button
            onClick={() => setViewMode('strictly-month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'strictly-month'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Contas Deste Mês
          </button>
          <button
            onClick={() => setViewMode('with-overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'with-overdue'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Deste Mês + Pendentes Anteriores
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              viewMode === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Todas as Contas
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Exibindo {filteredBills.length} de {bills.length} contas
        </div>
      </div>

      {/* Bills table or list */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        {bills.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
              <DollarSign size={18} />
            </div>
            <p className="text-sm font-semibold text-slate-800">Sem contas cadastradas</p>
            <p className="text-xs text-slate-500 mt-1">Organize seus custos recorrentes mensais.</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-2">
              <CheckCircle size={18} className="text-emerald-500 font-bold" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Tudo em dia para este mês!</p>
            <p className="text-xs text-slate-500 mt-1">Você não tem contas pendentes ou agendadas para o período selecionado.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards Feed */}
            <div className="md:hidden divide-y divide-slate-100 bg-white">
              <AnimatePresence mode="popLayout">
                {filteredBills.map(bill => {
                  const status = getBillStatus(bill);
                  return (
                    <motion.div
                      key={bill.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`p-4 flex flex-col gap-2.5 ${bill.paid ? 'opacity-65' : ''}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`text-sm font-semibold truncate ${bill.paid ? 'line-through text-slate-400' : 'text-slate-900'}`}>{bill.title}</h4>
                            {bill.recurring && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-bold uppercase tracking-wider shrink-0">
                                <RotateCw size={8} />
                                Mensal
                              </span>
                            )}
                          </div>
                          {bill.notes && (
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-light truncate">
                              <Info size={10} />
                              {bill.notes}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${status.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs mt-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                        <div className="text-slate-500 flex items-center gap-1.5 font-mono">
                          <Calendar size={12} className="text-slate-400" />
                          {new Date(bill.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        <div className="font-semibold text-slate-800 font-mono">
                          {bill.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleTogglePaid(bill.id)}
                          className={`p-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                            bill.paid
                              ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-600 hover:text-emerald-700'
                          }`}
                        >
                          {bill.paid ? (
                            <>
                              <Check size={12} className="stroke-[3]" />
                              Pago
                            </>
                          ) : (
                            <>
                              <Check size={12} />
                              Marcar Pago
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(bill)}
                          className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition cursor-pointer"
                          title="Editar Conta"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteBill(bill.id)}
                          className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono text-slate-400 uppercase font-bold">
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Nome da Conta</th>
                    <th className="py-3 px-6">Vencimento</th>
                    <th className="py-3 px-6">Valor</th>
                    <th className="py-3 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence mode="popLayout">
                    {filteredBills.map(bill => {
                      const status = getBillStatus(bill);
                      return (
                        <motion.tr
                          key={bill.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`group hover:bg-slate-50/40 transition-colors ${
                            bill.paid ? 'opacity-65' : ''
                          }`}
                        >
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${status.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="min-w-[150px]">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm font-semibold ${bill.paid ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                  {bill.title}
                                </p>
                                {bill.recurring && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-bold uppercase tracking-wider">
                                    <RotateCw size={8} />
                                    Mensal
                                  </span>
                                )}
                              </div>
                              {bill.notes && (
                                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 font-light">
                                  <Info size={10} />
                                  {bill.notes}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 font-mono text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={12} className="text-slate-400" />
                              {new Date(bill.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </div>
                          </td>
                          <td className="py-4 px-6 font-semibold text-sm text-slate-800">
                            {bill.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleTogglePaid(bill.id)}
                                className={`p-1.5 rounded-xl border transition cursor-pointer ${
                                  bill.paid
                                    ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-600 hover:text-emerald-700'
                                }`}
                                title={bill.paid ? 'Marcar como não pago' : 'Marcar como pago'}
                              >
                                {bill.paid ? <Check size={14} className="stroke-[3]" /> : <Check size={14} />}
                              </button>
                              <button
                                onClick={() => handleOpenEdit(bill)}
                                className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
                                title="Editar Conta"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteBill(bill.id)}
                                className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-slate-50 transition md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Bill Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg text-slate-900">
                {editingBillId ? 'Editar Conta Mensal' : 'Adicionar Conta Mensal'}
              </h3>
              <button
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBill} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nome do Boleto / Serviço</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Luz, Internet, Assinatura Netflix"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Observações (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Débito automático, Chave PIX: contato@empresa.com"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50/40 border border-indigo-100/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <RotateCw size={14} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Conta Mensal (Recorrente)</p>
                    <p className="text-[10px] text-slate-500">Gera nova conta automaticamente ao pagar</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="recurring"
                  checked={recurring}
                  onChange={e => setRecurring(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  {editingBillId ? 'Salvar Alterações' : 'Confirmar Conta'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
