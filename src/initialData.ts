import { RoutineItem, Note, Bill, Habit, Checklist } from './types';

export const SAMPLE_ROUTINE: RoutineItem[] = [
  {
    id: 'rout-1',
    dayOfWeek: 1, // Segunda-feira
    time: '07:00',
    title: 'Meditação e Respiração',
    description: '10 min de silêncio para começar bem o dia',
    done: false,
  },
  {
    id: 'rout-2',
    dayOfWeek: 1, // Segunda-feira
    time: '08:30',
    title: 'Revisão Semanal de Metas',
    description: 'Checar prioridades e compromissos da semana',
    done: false,
  },
  {
    id: 'rout-3',
    dayOfWeek: 2, // Terça-feira
    time: '18:00',
    title: 'Treino Funcional',
    description: 'Foco em energia e bem-estar',
    done: false,
  },
  {
    id: 'rout-4',
    dayOfWeek: 5, // Sexta-feira
    time: '19:00',
    title: 'Organização Financeira',
    description: 'Checar contas a pagar e fluxo de caixa',
    done: false,
  },
];

export const SAMPLE_HABITS: Habit[] = [
  {
    id: 'hab-1',
    title: 'Beber 3L de Água',
    frequency: 'daily',
    createdAt: new Date().toISOString(),
    history: {},
    category: 'Saúde',
  },
  {
    id: 'hab-2',
    title: 'Novena de São José',
    frequency: 'novena',
    createdAt: new Date().toISOString(),
    novenaStart: new Date().toISOString().split('T')[0],
    history: {},
    category: 'Espiritualidade',
  },
  {
    id: 'hab-3',
    title: 'Fazer backup do computador',
    frequency: 'monthly',
    createdAt: new Date().toISOString(),
    history: {},
    category: 'Trabalho',
  },
  {
    id: 'hab-4',
    title: 'Natação',
    frequency: 'weekly',
    weekDays: [2, 4], // Terça (2) e Quinta (4)
    time: '16:00',
    createdAt: new Date().toISOString(),
    history: {},
    category: 'Saúde',
  },
];

export const SAMPLE_BILLS: Bill[] = [
  {
    id: 'bill-1',
    title: 'Assinatura Spotify',
    amount: 34.90,
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0],
    paid: false,
    notes: 'Débito automático no cartão',
    recurring: true,
  },
  {
    id: 'bill-2',
    title: 'Aluguel & Condomínio',
    amount: 1500.00,
    dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString().split('T')[0],
    paid: false,
    notes: 'Pagar via PIX com desconto até o vencimento',
    recurring: true,
  },
];

export const SAMPLE_NOTES: Note[] = [
  {
    id: 'note-1',
    title: '💡 Ideias para Projetos Pessoais',
    content: 'Lista de tópicos interessantes para estudar este ano:\n- Programação funcional em TypeScript\n- Design System com Tailwind CSS\n- Inteligência artificial generativa aplicada a produtividade.',
    media: [
      { id: 'm-1', type: 'link', name: 'Artigo sobre Segundo Cérebro', url: 'https://forteabs.com/secondbrain' }
    ],
    createdAt: new Date().toISOString(),
    category: 'Estudos',
  },
  {
    id: 'note-2',
    title: '🍕 Receita de Pizza Napolitana',
    content: 'Massa de longa fermentação (24h):\n- 500g Farinha de trigo 00\n- 325ml Água gelada\n- 15g Sal\n- 1.5g Fermento biológico seco',
    media: [
      { id: 'm-2', type: 'image', name: 'Pizza napolitana perfeita', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600&auto=format&fit=crop' }
    ],
    createdAt: new Date().toISOString(),
    category: 'Culinária',
  },
];

export const SAMPLE_CHECKLISTS: Checklist[] = [
  {
    id: 'chk-1',
    title: '🎒 Viagem de Fim de Semana',
    items: [
      { id: 'item-1', text: 'Carregador de celular', done: false },
      { id: 'item-2', text: 'Roupas de frio adicionais', done: false },
      { id: 'item-3', text: 'Documento de identidade', done: true },
      { id: 'item-4', text: 'Protetor solar', done: false },
    ],
    createdAt: new Date().toISOString(),
    category: 'Lazer',
  },
  {
    id: 'chk-2',
    title: '🛒 Compras de Mercearia',
    items: [
      { id: 'item-5', text: 'Azeite de oliva extra virgem', done: false },
      { id: 'item-6', text: 'Café em grãos', done: false },
      { id: 'item-7', text: 'Queijo parmesão curado', done: false },
    ],
    createdAt: new Date().toISOString(),
    category: 'Casa',
  },
];

export const getLocalStorageData = <T>(key: string, initial: T): T => {
  try {
    const data = localStorage.getItem(key);
    if (!data || data === 'null' || data === 'undefined') {
      return initial;
    }
    const parsed = JSON.parse(data);
    return parsed !== null && parsed !== undefined ? parsed : initial;
  } catch (e) {
    console.error(`Erro ao ler ${key} do localStorage`, e);
    return initial;
  }
};

export const setLocalStorageData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Erro ao salvar ${key} no localStorage`, e);
  }
};
