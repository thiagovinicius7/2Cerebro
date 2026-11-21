// Envia a notificação "O que falta hoje" (rodado pelo GitHub Actions às 12h e 18h).
// Banco: por usuário com notificação ligada, lê meta/push, as tarefas não concluídas
// e a rotina (umas centenas de leituras por envio). Só grava se precisar tirar um
// token que deixou de valer.
//
// Variáveis: FIREBASE_SERVICE_ACCOUNT (JSON da conta de serviço) ou
// FIRESTORE_EMULATOR_HOST (teste); DRY_RUN=1 só mostra a mensagem, sem enviar.

process.env.TZ = 'America/Sao_Paulo';

import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import type { Routine, Task } from '../src/lib/types';
import { isRoutineOn, routineStatus, sortTasks, taskOnDay } from '../src/lib/schedule';
import { todayStr } from '../src/lib/dates';

const PROJECT = 'segundo-cerebro-22400';
const DRY = process.env.DRY_RUN === '1';
const APP_URL = 'https://thiagovinicius7.github.io/2Cerebro/#hoje';

const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!sa && !process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Falta o segredo FIREBASE_SERVICE_ACCOUNT');
initializeApp(sa ? { credential: cert(JSON.parse(sa)), projectId: PROJECT } : { projectId: PROJECT });
const db = getFirestore();

const list = (names: string[], max = 3) =>
  names.slice(0, max).join(', ') + (names.length > max ? ` +${names.length - max}` : '');

export function montar(tasks: Task[], routines: Routine[], today = todayStr()) {
  const doDia = tasks.filter(t => taskOnDay(t, today, today)).sort(sortTasks);
  const contas = doDia.filter(t => t.tags?.includes('conta'));
  const outras = doDia.filter(t => !t.tags?.includes('conta'));
  const atrasadas = outras.filter(t => t.dueDate! < today);
  const hoje = outras.filter(t => t.dueDate === today);
  const rotina = routines
    .filter(r => isRoutineOn(r, today) && !routineStatus(r, today))
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

  const linhas: string[] = [];
  if (atrasadas.length) linhas.push(`Atrasadas (${atrasadas.length}): ${list(atrasadas.map(t => t.title))}`);
  if (hoje.length) linhas.push(`Tarefas (${hoje.length}): ${list(hoje.map(t => t.title))}`);
  if (contas.length) linhas.push(`Contas (${contas.length}): ${list(contas.map(t => t.title))}`);
  if (rotina.length) linhas.push(`Rotina (${rotina.length}): ${list(rotina.map(r => r.title))}`);

  return {
    title: 'O que falta hoje',
    body: linhas.length ? linhas.join('\n') : 'Nada pendente hoje.',
  };
}

async function main() {
  const users = await db.collection('users').listDocuments();
  let enviados = 0;
  for (const u of users) {
    const pushDoc = await u.collection('meta').doc('push').get();
    const tokens: string[] = pushDoc.get('tokens') || [];
    if (!tokens.length) continue;

    const [ts, rs] = await Promise.all([
      u.collection('tasks').where('done', '==', false).get(),
      u.collection('routines').get(),
    ]);
    const msg = montar(
      ts.docs.map(d => ({ ...(d.data() as Task), id: d.id })),
      rs.docs.map(d => ({ ...(d.data() as Routine), id: d.id })),
    );
    console.log(`${u.id}: ${tokens.length} aparelho(s)\n${msg.title}\n${msg.body}\n`);
    if (DRY) continue;

    const res = await getMessaging().sendEachForMulticast({
      tokens,
      data: { title: msg.title, body: msg.body, url: APP_URL, tag: 'falta-hoje' },
      webpush: { headers: { Urgency: 'high', TTL: '3600' } },
    });
    const invalidos = res.responses
      .map((r, i) => (!r.success && /not-registered|invalid-registration-token|invalid-argument/.test(r.error?.code || '') ? tokens[i] : null))
      .filter((t): t is string => !!t);
    res.responses.forEach((r, i) => !r.success && console.log(`  falhou ${i}: ${r.error?.code}`));
    if (invalidos.length) await pushDoc.ref.update({ tokens: FieldValue.arrayRemove(...invalidos) });
    enviados += res.successCount;
  }
  console.log(`Enviadas: ${enviados}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
