import React from 'react';
import { AlignLeft, Clock, Repeat } from 'lucide-react';
import { Task } from '../lib/types';
import { useBrain } from '../lib/brain';
import { formatDayLabel, formatMoney, todayStr } from '../lib/dates';
import { CheckButton, Tags } from './ui';

export default function TaskRow({ task, showDate = true }: { task: Task; showDate?: boolean }) {
  const { toggleTask, setEditing } = useBrain();
  const today = todayStr();
  const overdue = !task.done && task.dueDate && task.dueDate < today;
  return (
    <div
      onClick={() => setEditing({ kind: 'task', item: task })}
      className="flex items-start gap-3 px-3 py-3 bg-white cursor-pointer active:bg-stone-50"
    >
      <div className="pt-0.5">
        <CheckButton checked={task.done} onChange={() => toggleTask(task)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[15px] leading-snug ${task.done ? 'line-through text-stone-400' : 'text-stone-900'}`}>
          {task.title}
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-0.5 text-xs text-stone-500">
          {showDate && task.dueDate && (
            <span className={overdue ? 'text-rose-600 font-medium' : ''}>{formatDayLabel(task.dueDate, today)}</span>
          )}
          {task.time && (
            <span className="inline-flex items-center gap-0.5">
              <Clock size={11} />
              {task.time}
            </span>
          )}
          {task.recurrence && <Repeat size={11} aria-label="Repete" />}
          {task.notes && <AlignLeft size={11} aria-label="Tem observações" />}
          <Tags tags={task.tags.filter(t => t !== 'conta' || task.amount == null)} />
        </div>
      </div>
      {task.amount != null && (
        <div className={`text-sm font-semibold tabular-nums pt-0.5 ${task.done ? 'text-stone-400' : overdue ? 'text-rose-600' : 'text-stone-800'}`}>
          {formatMoney(task.amount)}
        </div>
      )}
    </div>
  );
}
