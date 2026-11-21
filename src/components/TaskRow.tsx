import React from 'react';
import { AlignLeft, Clock, Repeat } from 'lucide-react';
import { Task } from '../lib/types';
import { useBrain } from '../lib/brain';
import { formatDayLabel, todayStr } from '../lib/dates';
import { Tags } from './ui';
import { StatusButton, taskOptions } from './status';

export default function TaskRow({ task, showDate = true }: { task: Task; showDate?: boolean }) {
  const { toggleTask, postponeTask, cancelTask, setEditing } = useBrain();
  const today = todayStr();
  const overdue = !task.done && task.dueDate && task.dueDate < today;
  const status = task.done ? (task.cancelled ? 'cancel' : 'done') : null;
  return (
    <div
      onClick={() => setEditing({ kind: 'task', item: task })}
      className="flex items-start gap-3 px-4 py-3 cursor-pointer active:bg-stone-50"
    >
      <div className="pt-0.5">
        <StatusButton
          status={status}
          onTap={() => toggleTask(task)}
          menuTitle={task.title}
          menu={taskOptions(task, {
            toggle: () => toggleTask(task),
            postpone: () => postponeTask(task),
            cancel: () => cancelTask(task),
          })}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-[15px] leading-snug ${task.done ? 'line-through text-stone-400' : 'text-tinta'}`}>{task.title}</div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-0.5 text-xs text-stone-500">
          {task.cancelled && <span className="font-medium text-stone-400">cancelada</span>}
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
          <Tags tags={task.tags} />
        </div>
      </div>
    </div>
  );
}
