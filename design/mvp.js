'use strict';

const pages = {
  train: 'Train',
  signin: 'Sign in',
  signup: 'Create account',
  verify: 'Verify email',
  recovery: 'Password recovery',
  password: 'New password',
  setup: 'First setup',
  routine: 'Routine detail',
  routineEdit: 'Routine editor',
  picker: 'Exercise picker',
  custom: 'Custom exercise',
  workout: 'Active workout',
  finish: 'Finish review',
  summary: 'Saved summary',
  history: 'History',
  workoutDetail: 'Workout detail',
  correction: 'Correct workout',
  library: 'Exercise library',
  exercise: 'Exercise detail',
  settings: 'Settings',
  deletion: 'Delete Grind data'
};
const notes = {
  train: 'Start here. Open a routine or start an empty workout, then add an exercise and complete a set.',
  workout: 'Try a set, then explore Not saved or Conflict. Finish review never claims success while changes are pending.',
  exercise: 'Overview, History and Records share one exercise identity. Play demonstrates the unavailable state without making a provider request.',
  deletion: 'Deletion removes Grind data only. Shared sign-in and BabyBoo data remain intact.',
  picker: 'Selections stay selected while search and filters change. Add selected returns to the editor that opened the picker.'
};
const sampleSessions = [{
  name: 'Leg day',
  date: '23 Oct · 6:15 PM',
  duration: '52 min',
  items: [{
    name: 'Barbell squat',
    load: 'Total barbell weight',
    sets: [{
      load: '80',
      reps: '6',
      done: true
    }, {
      load: '80',
      reps: '6',
      done: true
    }, {
      load: '80',
      reps: '5',
      done: true
    }]
  }]
}, {
  name: 'Pull day A',
  date: '21 Oct · 6:30 PM',
  duration: '46 min',
  items: [{
    name: 'Barbell row',
    load: 'Total barbell weight',
    sets: [{
      load: '60',
      reps: '8',
      done: true
    }]
  }]
}, {
  name: 'Push day A',
  date: '19 Oct · 6:20 PM',
  duration: '48 min',
  items: [{
    name: 'Barbell bench press',
    load: 'Total barbell weight',
    sets: [{
      load: '60',
      reps: '8',
      done: true
    }]
  }]
}];
let sessions = sampleSessions;
const clone = x => JSON.parse(JSON.stringify(x));
const validSet = s => /^\d+(\.\d+)?$/.test(s.load) && /^\d+$/.test(s.reps) && Number(s.reps) > 0;
let routineTargets = {};
const seed = [{
  id: 1,
  name: 'Barbell bench press',
  muscle: 'Chest',
  equipment: 'Barbell',
  load: 'Total barbell weight'
}, {
  id: 2,
  name: 'Barbell row',
  muscle: 'Back',
  equipment: 'Barbell',
  load: 'Total barbell weight'
}, {
  id: 3,
  name: 'Barbell squat',
  muscle: 'Legs',
  equipment: 'Barbell',
  load: 'Total barbell weight'
}, {
  id: 4,
  name: 'Cable lateral raise',
  muscle: 'Shoulders',
  equipment: 'Cable',
  load: 'Stack display weight'
}, {
  id: 5,
  name: 'Hammer curl',
  muscle: 'Arms',
  equipment: 'Dumbbell',
  load: 'Weight per dumbbell'
}, {
  id: 6,
  name: 'Incline dumbbell press',
  muscle: 'Chest',
  equipment: 'Dumbbell',
  load: 'Weight per dumbbell'
}, {
  id: 7,
  name: 'Pull-up',
  muscle: 'Back',
  equipment: 'Bodyweight',
  load: 'Bodyweight / reps only'
}, {
  id: 8,
  name: 'Seated cable curl',
  muscle: 'Arms',
  equipment: 'Cable',
  load: 'Stack display weight',
  custom: true
}];
let page = 'train',
  state = 'normal',
  unit = 'kg',
  rest = 120,
  alerts = false,
  active = false,
  workoutName = 'Evening workout',
  workout = [],
  selected = new Set(),
  catalog = seed.map(x => ({
    ...x
  })),
  exerciseId = 1,
  detailTab = 'overview',
  scope = 'all',
  query = '',
  muscle = '',
  equipment = '',
  pickerTarget = 'workout',
  routineIds = [1, 6, 4],
  routineName = 'Push day A',
  routineArchived = false,
  historyAdded = false,
  mediaError = false,
  timerEnd = 0,
  notice = '',
  authEmail = 'alex@example.com',
  recoverySent = false,
  verifySent = false,
  correctionSaved = false,
  customFromPicker = false,
  editingCustomId = null,
  routineDraftBackup = null,
  workoutStartedAt = Date.now(),
  viewedSession = null,
  correctionDraft = null;
const $ = s => document.querySelector(s),
  escape = s => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
const button = (text, action, cls = 'primary full', extra = '') => `<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
const go = (target, text, cls = 'text') => `<button class="${cls}" data-go="${target}">${text}</button>`;
const header = (title, sub = '', back = 'train', right = '') => `<div class="topbar">${go(back, '← Back', 'back')}${right}</div><h2>${title}</h2>${sub ? `<p class="subtitle">${sub}</p>` : ''}`;
const field = (label, name, value = '', type = 'text', extra = '') => `<label class="form-field">${label}<input name="${name}" type="${type}" value="${escape(value)}" ${extra}></label>`;
const selectField = (label, name, values, current) => `<label class="form-field">${label}<select name="${name}">${values.map(v => `<option ${v === current ? 'selected' : ''}>${escape(v)}</option>`).join('')}</select></label>`;
const msg = (title, text, kind = '') => `<div class="notice ${kind}" role="${kind === 'error' ? 'alert' : 'status'}"><strong>${title}</strong>${text}</div>`;
function announce(text) {
  $('#announcement').textContent = text;
}
function modal(title, body, actions = '') {
  $('#sheetContent').innerHTML = `<h3>${title}</h3><p>${body}</p>${actions}`;
  $('#sheet').showModal();
}
function navigate(target) {
  if (target === 'routineEdit' && page !== 'routineEdit' && page !== 'picker' && page !== 'custom') routineDraftBackup = {
    name: routineName,
    ids: [...routineIds],
    targets: clone(routineTargets)
  };
  if (target === 'correction' && page !== 'correction') correctionDraft = clone(viewedSession || sessions[0]);
  page = target;
  notice = '';
  mediaError = false;
  query = '';
  muscle = '';
  equipment = '';
  render();
}
function stateNotice() {
  if (state === 'expired') return msg(['verify', 'recovery', 'password'].includes(page) ? 'This link has expired' : 'Your session has expired', ['verify', 'recovery', 'password'].includes(page) ? 'Request a fresh link to continue.<button data-go="recovery">Request a new link</button>' : 'Your unsent input is kept for this account. Sign in to continue saving.<button data-go="signin">Sign in again</button>', 'error');
  if (state === 'offline') return msg('Not saved — retry', 'Your changes stay on this device. Connect before finishing.<button data-action="retry">Retry saving</button>', 'error');
  if (state === 'conflict') return msg('A newer version was saved', 'Your input is kept. Review the saved version before reapplying.<button data-action="conflict">Review changes</button>', 'error');
  if (state === 'error') return msg('Couldn’t load this page', 'Check your connection and try again.<button data-action="retry">Try again</button>', 'error');
  if (state === 'loading') return '<div class="notice" role="status">Loading your saved data…</div>';
  return '';
}
function icon(name) {
  const paths = {
    train: '<path d="M3 10 12 3l9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
    history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    library: '<path d="M5 4h14v16H5zM9 8h6M9 12h6M9 16h3"/>',
    settings: '<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}
function nav() {
  const root = ['train', 'history', 'library', 'settings'].includes(page);
  return `${root && active ? `<button class="resume" data-go="workout"><span>● Workout in progress<br><small>${escape(workoutName)}</small></span><strong>Resume →</strong></button>` : ''}${root ? `<nav class="nav" aria-label="Main navigation">${[['train', 'Train'], ['history', 'History'], ['library', 'Exercises'], ['settings', 'Settings']].map(([p, l]) => `<button data-go="${p}" class="${page === p ? 'active' : ''}" ${page === p ? 'aria-current="page"' : ''}>${icon(p)}${l}</button>`).join('')}</nav>` : ''}`;
}
function train() {
  return `<div class="topbar"><span class="eyebrow">GRIND</span><span class="muted" style="font-size:12px">SUNDAY, 25 OCT</span></div><h2>Ready to work?</h2><p class="subtitle">One set closer. Let’s make it count.</p><section class="hero"><span class="eyebrow">${active ? 'PICK UP WHERE YOU LEFT OFF' : 'YOUR NEXT SESSION'}</span><h3>${active ? 'Keep it moving.' : 'Make it count.'}</h3><p>${active ? 'Your workout is right where you left it.' : 'Start fresh or follow a routine below.'}</p>${button(active ? 'Resume workout →' : '＋ Start empty workout', active ? 'resume' : 'start')}</section><div class="section-title"><h3>Your routines</h3>${button('＋ New', 'new-routine', 'text')}</div>${state === 'empty' || routineArchived ? `<div class="panel"><h3>Your routine starts here</h3><p class="subtitle">Save the movements you come back to.</p>${button('Create a routine', 'new-routine', 'secondary full')}</div>` : `<button class="panel row-button" data-go="routine"><span><strong>${escape(routineName)}</strong><small>Chest, shoulders, triceps</small><span class="badges"><span class="badge">${routineIds.length} exercises</span><span class="badge">9 sets</span></span></span><span class="chevron">↗</span></button><button class="panel row-button" data-action="pull-routine"><span><strong>Pull day A</strong><small>Back, biceps</small><span class="badges"><span class="badge">4 exercises</span><span class="badge">12 sets</span></span></span><span class="chevron">↗</span></button>`}<div class="section-title"><h3>Last session</h3>${go('history', 'History →')}</div>${state === 'empty' ? '<p class="subtitle">Your first session will appear here.</p>' : `<button class="row-button" data-go="workoutDetail"><span><strong>Leg day</strong><small>23 Oct · 52 min · 18 sets</small></span><span class="chevron">→</span></button>`}`;
}
function auth() {
  const signup = page === 'signup';
  if (page === 'signin' || signup) return `${header(signup ? 'Your next chapter.' : 'Welcome back.', signup ? 'A simple log. A stronger habit.' : 'Pick up where you left off.', 'train', '<span class="eyebrow">GRIND</span>')}<div class="brand-symbol" aria-hidden="true">G<span style="color:var(--text)">/</span></div><form id="authForm">${field('Email', 'email', authEmail, 'email', 'required autocomplete="email"')}<label class="form-field">Password<div class="password-wrap"><input name="password" type="password" required minlength="8" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="At least 8 characters"><button type="button" data-action="show-password">Show</button></div></label>${!signup ? go('recovery', 'Forgot password?') : ''}<button class="primary full" type="submit">${signup ? 'Create account' : 'Sign in'}</button></form><p class="auth-copy">${signup ? 'Already have an account?' : 'New to Grind?'}</p>${go(signup ? 'signin' : 'signup', signup ? 'Sign in' : 'Create account', 'secondary full')}<p class="fine auth-space">Use the same email and password if you already have a BabyBoo account. Your Grind setup is separate.</p>`;
  if (page === 'verify') return `${header('Check your inbox.', `We sent a verification link to<br><strong>${escape(authEmail)}</strong>.`, 'signin')}<div class="brand-symbol" aria-hidden="true">↗</div><p class="subtitle">Open the link on this device, then come back to start your first session.</p>${verifySent ? msg('New link sent', 'Check your inbox. You can request another link in 60 seconds.') : ''}${button('Resend verification email', 'resend', 'secondary full', verifySent ? 'disabled' : '')}${button('Preview verified →', 'verified')}<p class="fine">“Preview verified” simulates opening the email link. No email is sent.</p>${go('signin', 'Back to sign in', 'text full')}`;
  if (page === 'recovery') return `${header('Let’s get you back in.', 'We’ll email you a link to reset your password.', 'signin')}<form id="recoveryForm">${field('Email', 'email', authEmail, 'email', 'required')}<button class="primary full">Send reset link</button></form>${recoverySent ? `${msg('Check your email', 'If an account exists, a reset link is on its way.')}${go('password', 'Preview reset link →', 'secondary full')}` : ''}<p class="fine auth-space">Your sign-in is shared with BabyBoo. A password change applies to both apps.</p>`;
  if (page === 'password') return `${header('Choose a new password.', 'Use at least 8 characters. Your shared sign-in will be updated.', 'recovery')}<form id="passwordForm">${field('New password', 'password', '', 'password', 'required minlength="8" autocomplete="new-password"')}${field('Confirm password', 'confirm', '', 'password', 'required minlength="8"')}<button class="primary full">Save new password</button></form>`;
  return `${header('Make it yours.', 'Two quick choices. You can change these anytime.', 'signin')}<form id="setupForm">${selectField('Preferred weight unit', 'unit', ['kg', 'lb'], unit)}${selectField('Default rest time', 'rest', ['60 seconds', '90 seconds', '120 seconds', '180 seconds'], `${rest} seconds`)}<div class="notice">Rest alerts are optional. We’ll ask when you first turn them on.</div><button class="primary full">Let’s train →</button></form>`;
}
function routine() {
  const editor = page === 'routineEdit';
  return `${header(editor ? 'Build your routine.' : escape(routineName), editor ? 'A plan for the days you show up.' : 'Chest, shoulders, triceps · 9 working sets', 'train', editor ? '' : go('routineEdit', 'Edit'))}${editor ? field('Routine name', 'routineName', routineName, 'text', 'maxlength="70"') : ''}<div class="count-label">${routineIds.length} exercises · In order</div>${routineIds.map((id, i) => {
    const e = catalog.find(e => e.id === id);
    return `<div class="panel"><div class="exercise-head"><div><span class="eyebrow">0${i + 1}</span><h3>${escape(e.name)}</h3></div>${editor ? button('↑', `move:${i}`, 'text', 'aria-label="Move exercise up"') : ''}</div><p class="exercise-meta">${escape(e.load)}</p><p class="subtitle" style="margin-bottom:0">${routineTargets[id]?.count || 3} sets · ${routineTargets[id]?.reps || 8} reps · ${routineTargets[id]?.load || 60} ${unit} · Rest ${routineTargets[id]?.rest || 120}s</p>${editor ? `<div class="filters">${field(`Target ${unit}`, `targetLoad-${id}`, routineTargets[id]?.load || '60', 'number', 'min="0" step="0.5"')}${field('Target reps', `targetReps-${id}`, routineTargets[id]?.reps || '8', 'number', 'min="1"')}${field('Sets', `targetCount-${id}`, routineTargets[id]?.count || '3', 'number', 'min="1" max="20"')}${field('Rest seconds', `targetRest-${id}`, routineTargets[id]?.rest || '120', 'number', 'min="0"')}</div>` : ''}</div>`;
  }).join('')}${editor ? `${button('＋ Add exercise', 'routine-picker', 'secondary full')}<label class="form-field">Routine notes<textarea name="routineNotes" placeholder="What do you want to focus on?">${escape(routineTargets.notes || '')}</textarea></label>${button('Save routine', 'save-routine')}${button('Cancel', 'cancel-editor', 'text full')}` : `${button(active ? 'Resume active workout' : 'Start workout →', 'start-routine')}${button('Archive routine', 'archive-routine', 'text full')}`}`;
}
function exerciseFilters() {
  return `<input class="search" id="search" type="search" placeholder="Search exercises" aria-label="Search exercises" value="${escape(query)}"><div class="filters"><select id="muscleFilter" aria-label="Filter by muscle"><option value="">All muscles</option>${['Chest', 'Back', 'Legs', 'Shoulders', 'Arms'].map(m => `<option ${muscle === m ? 'selected' : ''}>${m}</option>`).join('')}</select><select id="equipmentFilter" aria-label="Filter by equipment"><option value="">All equipment</option>${['Barbell', 'Dumbbell', 'Cable', 'Bodyweight'].map(e => `<option ${equipment === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>`;
}
function exerciseRows(picker) {
  const rows = state === 'empty' ? [] : catalog.filter(e => !e.archived && (scope === 'all' || e.custom) && e.name.toLowerCase().includes(query.toLowerCase()) && (!muscle || e.muscle === muscle) && (!equipment || e.equipment === equipment)).sort((a, b) => a.name.localeCompare(b.name));
  return `<div class="count-label">${rows.length} movements <span style="float:right">A–Z</span></div>${rows.length ? rows.map(e => `<button class="row-button" data-action="${picker ? 'select' : 'exercise'}:${e.id}" ${picker ? `aria-pressed="${selected.has(e.id)}"` : ''}><span class="library-row"><span class="exercise-mark" aria-hidden="true">↔</span><span><strong>${escape(e.name)} ${e.custom ? '<span class="lime" style="font-size:9px">CUSTOM</span>' : ''}</strong><small>${escape(e.muscle)} · ${escape(e.equipment)}</small></span></span><span class="${picker ? `selection ${selected.has(e.id) ? 'chosen' : ''}` : 'chevron'}" aria-hidden="true">${picker ? selected.has(e.id) ? '●' : '○' : '›'}</span></button>`).join('') : `<div class="empty"><div class="empty-mark">⌕</div><h3>No movements found.</h3><p>Try another name or clear a filter.</p>${button('Clear filters', 'clear-search', 'secondary full')}</div>`}`;
}
function library() {
  const picker = page === 'picker';
  return `${picker ? header('Add exercises.', 'Choose your movements. Your selection stays with you.', pickerTarget === 'routine' ? 'routineEdit' : 'workout', go('custom', '＋ Custom')) : `<div class="topbar"><span class="eyebrow">THE MOVEMENT LIBRARY</span>${go('custom', '＋ Custom')}</div><h2>Exercises</h2><p class="subtitle">Every movement. All your progress.</p>`}${exerciseFilters()}<div class="segmented"><button data-action="scope:all" class="${scope === 'all' ? 'active' : ''}" aria-pressed="${scope === 'all'}">All exercises</button><button data-action="scope:custom" class="${scope === 'custom' ? 'active' : ''}" aria-pressed="${scope === 'custom'}">Custom</button></div><div id="exerciseResults">${exerciseRows(picker)}</div>${picker ? button(`Add selected${selected.size ? ` (${selected.size})` : ''}`, 'add-selected', 'primary full', selected.size ? '' : 'disabled') : ''}`;
}
function custom() {
  const existing = catalog.find(e => e.id === editingCustomId);
  return `${header(existing ? 'Edit your movement.' : 'Your own movement.', 'Keep the load convention consistent across sessions.', customFromPicker ? 'picker' : 'library')}<form id="customForm">${field('Exercise name', 'name', existing ? existing.name : '', 'text', 'required maxlength="70" placeholder="e.g. Seated cable curl"')}${selectField('Primary muscle', 'muscle', ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms'], existing ? existing.muscle : 'Arms')}${selectField('Equipment', 'equipment', ['Barbell', 'Dumbbell', 'Cable', 'Bodyweight'], existing ? existing.equipment : 'Cable')}${selectField('Category', 'category', ['Strength', 'Bodyweight', 'Assisted'], existing?.category || 'Strength')}${selectField('How is load recorded?', 'load', ['Total external weight', 'Weight per dumbbell', 'Stack display weight', 'Bodyweight / reps only', 'Assistance weight'], existing ? existing.load : 'Stack display weight')}<p class="fine">Custom exercises belong to you. Past sessions keep their original names and load convention.</p><button class="primary full">Save exercise</button></form>`;
}
function workoutScreen() {
  return `${header(escape(workoutName), '', 'train', go('finish', 'Finish', 'primary'))}<div class="save-line"><span>${Math.floor((Date.now() - workoutStartedAt) / 60000)}:${String(Math.floor((Date.now() - workoutStartedAt) / 1000) % 60).padStart(2, '0')} elapsed</span><span class="${state === 'normal' ? 'lime' : ''}">${state === 'normal' ? '✓ Saved' : state === 'loading' ? 'Saving…' : 'Not saved'}</span></div>${workout.length ? workout.map((w, wi) => {
    const e = catalog.find(e => e.id === w.id);
    return `<section class="panel workout-panel"><div class="exercise-head"><h3>${escape(e.name)}</h3>${button('•••', `exercise-menu:${wi}`, 'text', `aria-label="Options for ${escape(e.name)}"`)}</div><p class="exercise-meta">${escape(e.load)} · Rest 2:00</p><div class="sets"><div class="set-head"><span>SET</span><span>PREVIOUS</span><span>${unit.toUpperCase()}</span><span>REPS</span><span>DONE</span></div>${w.sets.map((s, si) => `<div class="set-row ${s.done ? 'done' : ''}"><span>${s.warm ? 'W' : si + 1}</span><span class="previous">${s.warm ? '20 × 12' : '60 × 8'}</span><input data-set="${wi}:${si}:load" aria-label="${escape(e.name)} set ${si + 1} weight in ${unit}" inputmode="decimal" value="${escape(s.load)}" placeholder="—"><input data-set="${wi}:${si}:reps" aria-label="${escape(e.name)} set ${si + 1} reps" inputmode="numeric" value="${escape(s.reps)}" placeholder="—"><button class="complete" data-action="complete:${wi}:${si}" aria-label="${s.done ? 'Uncomplete' : 'Complete'} ${escape(e.name)} set ${si + 1}" aria-pressed="${s.done}">${s.done ? '✓' : '○'}</button></div>`).join('')}</div>${button('＋ Add set', `add-set:${wi}`, 'add-set')}</section>`;
  }).join('') : `<div class="empty"><div class="empty-mark">＋</div><h3>A fresh start.</h3><p>Add an exercise to log your first set.</p></div>`}${button('＋ Add exercise', 'workout-picker', 'secondary full')}${button('Discard workout', 'discard', 'text full')}`;
}
function durationLabel() {
  const minutes = Math.floor((Date.now() - workoutStartedAt) / 60000);
  return minutes ? minutes + ' min' : 'Less than 1 min';
}
function completed() {
  return workout.flatMap(w => w.sets).filter(s => s.done).length;
}
function finish() {
  const incomplete = workout.flatMap(w => w.sets).filter(s => !s.done).length;
  const blocked = state !== 'normal' || !completed() || incomplete;
  return `${header('Ready to finish?', 'Take a moment. Make sure every set is right.', 'workout')}<div class="receipt"><p><span>Workout</span><strong>${escape(workoutName)}</strong></p><p><span>Completed sets</span><strong>${completed()}</strong></p><p><span>Time</span><strong>${durationLabel()}</strong></p></div>${!completed() ? msg('No completed sets yet', 'Return to your workout to log a set, or discard it.') : ''}${incomplete ? msg(`${incomplete} incomplete ${incomplete === 1 ? 'set' : 'sets'}`, 'Remove these rows or return to finish logging.<button data-action="remove-incomplete">Remove incomplete sets</button>') : ''}${state !== 'normal' ? msg('Finish is waiting for saved changes', 'Your input is kept. Retry saving before you finish.', 'error') : ''}${button('Finish and save', 'finish', 'primary full', blocked ? 'disabled' : '')}${go('workout', 'Back to workout', 'secondary full')}`;
}
function summary() {
  return `<div class="success-mark" aria-hidden="true">✓</div><span class="eyebrow">WORKOUT SAVED</span><h2>Work, recorded.</h2><p class="subtitle">${escape(workoutName)} · Today, 6:24 PM</p><div class="metrics"><div><strong>${durationLabel()}</strong><small>Time well spent</small></div><div><strong>${workout.flatMap(w => w.sets).filter(set => set.done && !set.warm).length}</strong><small>Completed working sets</small></div></div><div class="panel"><span class="eyebrow">YOUR STARTING POINT</span><h3 style="margin-top:10px">A baseline to build on.</h3><p class="subtitle" style="margin:10px 0 0">Your first eligible performance sets the mark. Ties won’t count as new records.</p></div>${go('history', 'Done →', 'primary full')}${button('Save as routine', 'summary-routine', 'secondary full')}`;
}
function history() {
  return `<div class="topbar"><span class="eyebrow">YOUR TRAINING</span></div><h2>Put in the work.</h2><p class="subtitle">Every session builds on the last.</p>${state === 'empty' ? `<div class="empty"><div class="empty-mark">◷</div><h3>Your story starts here.</h3><p>Complete a workout and find it here.</p>${go('train', 'Start a workout', 'primary full')}</div>` : `<div class="count-label">October 2026</div>${sessions.map((session, i) => `<button class="panel row-button" data-action="session:${i}"><span><strong>${escape(session.name)}</strong><small>${escape(session.date)}</small><span class="badges"><span class="badge">${escape(session.duration)}</span><span class="badge">${session.items.length} exercises</span><span class="badge">${session.items.reduce((n, e) => n + e.sets.length, 0)} sets</span></span></span><span class="chevron">↗</span></button>`).join('')}${button('Load earlier sessions', 'more-history', 'text full')}`}`;
}
function workoutDetail() {
  const editing = page === 'correction',
    session = editing ? correctionDraft || (correctionDraft = clone(viewedSession || sessions[0])) : viewedSession || sessions[0];
  return `${header(editing ? 'Correct workout.' : escape(session.name), editing ? 'These changes update your history and records.' : escape(session.date), 'history', editing ? '' : go('correction', 'Correct'))}${correctionSaved ? msg('Corrections saved', 'Updated values are shown below. Records will be recalculated by the backend in production.') : ''}<div class="metrics"><div><strong>${escape(session.duration)}</strong><small>Duration</small></div><div><strong>${session.items.reduce((n, e) => n + e.sets.length, 0)}</strong><small>Completed sets</small></div></div>${session.items.map((item, i) => `<div class="panel"><h3>${escape(item.name)}</h3><p class="exercise-meta">${escape(item.load)} · Original entries in ${escape(item.unit || 'kg')}</p>${item.sets.map((set, j) => editing ? `<div class="filters"><label class="form-field">Set ${j + 1} ${escape(item.unit || 'kg')}<input type="number" min="0" step="0.5" data-correction="${i}:${j}:load" value="${escape(set.load)}"></label><label class="form-field">Reps<input type="number" min="1" data-correction="${i}:${j}:reps" value="${escape(set.reps)}"></label></div>` : `<p class="subtitle" style="margin:8px 0">${j + 1} &nbsp; ${escape(set.load)} ${escape(set.unit || item.unit || 'kg')} × ${escape(set.reps)}</p>`).join('')}</div>`).join('')}${editing ? `${button('Save corrections', 'save-correction')}${button('Cancel', 'cancel-correction', 'secondary full')}` : '<p class="fine">Exercise names and load conventions are preserved from the original workout. Routine edits won’t change this session.</p>'}`;
}
function exercise() {
  const e = catalog.find(e => e.id === exerciseId) || catalog[0];
  const matches = sessions.map((session, index) => ({
    session,
    index,
    items: session.items.filter(item => item.id === e.id || item.name === e.name)
  })).filter(match => match.items.length);
  const eligible = matches.flatMap(match => match.items.flatMap(item => item.sets.filter(set => set.done && !set.warm && validSet(set)).map(set => ({
    ...set,
    load: String(Number(set.load) * ((set.unit || item.unit) === 'lb' ? 0.45359237 : 1))
  }))));
  const bestLoad = eligible.length ? Math.max(...eligible.map(set => Number(set.load))) : 0;
  const bestReps = eligible.length ? Math.max(...eligible.filter(set => Number(set.load) === bestLoad).map(set => Number(set.reps))) : 0;
  const bestVolume = eligible.length ? Math.max(...eligible.map(set => Number(set.load) * Number(set.reps))) : 0;
  return `${header(escape(e.name), `${escape(e.muscle)} · ${escape(e.equipment)}`, 'library', e.custom ? button('Edit', 'edit-custom', 'text') : '')}<div class="notice"><strong>Load convention</strong>${escape(e.load)}</div><div class="segmented">${['overview', 'history', 'records'].map(t => button(t[0].toUpperCase() + t.slice(1), `detail:${t}`, t === detailTab ? 'active' : '', `aria-pressed="${t === detailTab}"`)).join('')}</div>${detailTab === 'overview' ? `<div class="demo">${e.custom ? '<h3>Your movement.</h3><p>No demonstration is mapped to this custom exercise.</p>' : `<span class="eyebrow">MOVEMENT DEMONSTRATION</span><h3 style="margin:10px 0">See the movement.</h3><p>Play when you’re ready. Nothing starts automatically.</p>${button('▷ Play demonstration', 'play', 'secondary full')}`}</div>${mediaError ? msg('Demonstration unavailable', 'You can keep logging. Try playback again later.', 'error') : ''}<div class="section-title"><h3>Keep it controlled.</h3></div><ol class="instruction"><li>Set a stable position and a comfortable range of motion.</li><li>Move with control. Avoid swinging or rushing the return.</li><li>Stop the set if you lose your form.</li></ol><p class="fine">Illustrative, independently written instruction placeholders. Exercise data and videos provided by MuscleWiki.com when integration is enabled.</p>` : state === 'empty' || !matches.length ? `<div class="empty"><h3>No ${detailTab} yet.</h3><p>Your first completed workout sets the baseline.</p></div>` : detailTab === 'history' ? ` ${matches.map(match => `<button class="row-button" data-action="session:${match.index}"><span><strong>${escape(match.session.name)}</strong><small>${escape(match.session.date)} · ${match.items.flatMap(item => item.sets.map(set => `${escape(set.load)} ${escape(set.unit || item.unit || 'kg')} × ${escape(set.reps)}`)).join(', ')}</small></span><span class="chevron">→</span></button>`).join('')}` : `<div class="receipt"><p><span>Highest load</span><strong>${Number(bestLoad.toFixed(2))} kg</strong></p><p><span>Most reps at ${Number(bestLoad.toFixed(2))} kg</span><strong>${bestReps} reps</strong></p><p><span>Best single-set volume</span><strong>${Number(bestVolume.toFixed(2))} kg·reps</strong></p></div><p class="fine">Completed working sets from completed workouts only. Bodyweight and assisted modes use separate rep records.</p>`}${e.custom ? button('Archive exercise', 'archive-custom', 'text full') : ''}`;
}
function settings() {
  return `<div class="topbar"><span class="eyebrow">YOUR PREFERENCES</span></div><h2>Settings</h2><p class="subtitle">Set things up your way.</p><div class="section-title"><h3>Training</h3></div><label class="settings-row"><span>Weight unit<small>Display changes. Original entries stay intact.</small></span><select id="unitSetting" aria-label="Weight unit"><option ${unit === 'kg' ? 'selected' : ''}>kg</option><option ${unit === 'lb' ? 'selected' : ''}>lb</option></select></label><label class="settings-row"><span>Default rest</span><select id="restSetting" aria-label="Default rest">${[60, 90, 120, 180].map(n => `<option value="${n}" ${rest === n ? 'selected' : ''}>${n / 60 % 1 ? n + ' sec' : n / 60 + ' min'}</option>`).join('')}</select></label><div class="settings-row"><span>Rest alerts<small>Sound when it’s time for the next set.</small></span><button class="toggle" role="switch" aria-checked="${alerts}" aria-label="Rest alerts" data-action="alerts"></button></div><p class="fine">Your in-app countdown works even when alerts are off.</p>${!alerts ? button('Open notification settings', 'system-settings', 'text full') : ''}<div class="section-title"><h3>Account</h3></div><div class="settings-row"><span>Email<small>${escape(authEmail)}</small></span>${go('recovery', 'Reset password')}</div><p class="fine">Your sign-in is shared with BabyBoo. Resetting your password affects both apps.</p>${button('Sign out of Grind', 'signout', 'secondary full')}${go('deletion', 'Delete Grind data', 'text full')}<div class="auth-space fine">GRIND · DESIGN PREVIEW<br>Build a habit. Keep your progress.</div>`;
}
function deletion() {
  return `${header('Delete Grind data?', 'This is permanent. Take a moment before continuing.', 'settings')}<div class="notice error"><strong>Your Grind history will be removed.</strong>This includes workouts, routines, custom exercises, records and settings.</div><div class="panel"><h3>Your shared sign-in stays.</h3><p class="subtitle" style="margin:10px 0 0">Your BabyBoo data and account are preserved. This only removes your Grind data and signs you out of Grind.</p></div><label class="checkline"><input id="deleteConfirm" type="checkbox"><span>I understand that my Grind data cannot be recovered.</span></label>${button('Delete Grind data', 'delete', 'danger full', 'disabled')}${go('settings', 'Keep my data', 'secondary full')}<p class="fine">Prototype only. No real account or data is changed.</p>`;
}
function render() {
  const focused = document.activeElement;
  const focusAction = focused?.dataset?.action;
  const focusGo = focused?.dataset?.go;
  let body;
  if (['signin', 'signup', 'verify', 'recovery', 'password', 'setup'].includes(page)) body = auth();else if (page === 'train') body = train();else if (['routine', 'routineEdit'].includes(page)) body = routine();else if (['library', 'picker'].includes(page)) body = library();else if (page === 'custom') body = custom();else if (page === 'workout') body = workoutScreen();else if (page === 'finish') body = finish();else if (page === 'summary') body = summary();else if (page === 'history') body = history();else if (['workoutDetail', 'correction'].includes(page)) body = workoutDetail();else if (page === 'exercise') body = exercise();else if (page === 'settings') body = settings();else body = deletion();
  $('#screen').innerHTML = `<div class="page">${stateNotice()}${notice ? msg('A quick note', escape(notice)) : ''}${body}</div>${page === 'workout' && timerEnd ? `<div class="timer"><button class="timer-clock" data-action="timer"><small>REST REMAINING</small><strong id="timerClock"></strong></button><button data-action="extend">＋30s</button><button data-action="skip">Skip</button></div>` : ''}${nav()}`;
  $('#screenSelect').value = page;
  $('#pageNote').textContent = notes[page] || 'Explore this page using its actions. The state controls above belong to the prototype, not the app.';
  document.querySelectorAll('[data-state]').forEach(b => b.setAttribute('aria-pressed', b.dataset.state === state));
  tick();
  if (focusAction) {
    [...document.querySelectorAll('button[data-action]')].find(b => b.dataset.action === focusAction)?.focus({
      preventScroll: true
    });
  } else if (focusGo) {
    [...document.querySelectorAll('button[data-go]')].find(b => b.dataset.go === focusGo)?.focus({
      preventScroll: true
    });
  }
}
function openPicker(target) {
  pickerTarget = target;
  selected = new Set();
  scope = 'all';
  navigate('picker');
}
function start(fromRoutine = false) {
  if (active) {
    navigate('workout');
    return;
  }
  if (state === 'offline') {
    modal('Connect to start', 'A new workout needs a connection. Your existing workout can keep its unsent input on this device.');
    return;
  }
  active = true;
  workoutStartedAt = Date.now();
  workoutName = fromRoutine ? routineName : 'Evening workout';
  workout = fromRoutine ? routineIds.map(id => ({
    id,
    sets: Array.from({
      length: Math.max(1, Math.min(20, Number(routineTargets[id]?.count) || 3))
    }, () => ({
      load: routineTargets[id]?.load || '',
      reps: routineTargets[id]?.reps || '',
      done: false
    }))
  })) : [];
  navigate('workout');
}
function tick() {
  const el = $('#timerClock');
  if (el) {
    const n = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
    el.textContent = n ? `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}` : 'Rest finished';
  }
}
setInterval(tick, 1000);
$('#screenSelect').innerHTML = Object.entries(pages).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
$('#screenSelect').onchange = e => {
  if (e.target.value === 'workout' && !workout.length) {
    active = true;
    workout = [{
      id: 1,
      sets: [{
        load: '62.5',
        reps: '8',
        done: true
      }, {
        load: '62.5',
        reps: '',
        done: false
      }]
    }];
  }
  navigate(e.target.value);
};
$('#reset').onclick = () => location.reload();
$('#closeSheet').onclick = () => $('#sheet').close();
document.addEventListener('input', e => {
  if (e.target.dataset.set) {
    const [w, s, k] = e.target.dataset.set.split(':');
    workout[w].sets[s][k] = e.target.value;
    workout[w].sets[s].unit = unit;
    workout[w].sets[s].done = false;
    e.target.closest('.set-row').classList.remove('done');
    const doneButton = e.target.closest('.set-row').querySelector('.complete');
    doneButton.textContent = '○';
    doneButton.setAttribute('aria-pressed', 'false');
    timerEnd = 0;
  }
  if (e.target.name === 'routineName') routineName = e.target.value;
  if (e.target.name === 'routineNotes') routineTargets.notes = e.target.value;
  if (/^target(Load|Reps|Count|Rest)-/.test(e.target.name)) {
    const [key, id] = e.target.name.split('-');
    routineTargets[id] ??= {};
    routineTargets[id][{
      targetLoad: 'load',
      targetReps: 'reps',
      targetCount: 'count',
      targetRest: 'rest'
    }[key]] = e.target.value;
  }
  if (e.target.dataset.correction) {
    const [i, j, k] = e.target.dataset.correction.split(':');
    correctionDraft.items[i].sets[j][k] = e.target.value;
  }
  if (e.target.id === 'search') {
    query = e.target.value;
    $('#exerciseResults').innerHTML = exerciseRows(page === 'picker');
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'muscleFilter') {
    muscle = e.target.value;
    $('#exerciseResults').innerHTML = exerciseRows(page === 'picker');
  }
  if (e.target.id === 'equipmentFilter') {
    equipment = e.target.value;
    $('#exerciseResults').innerHTML = exerciseRows(page === 'picker');
  }
  if (e.target.id === 'unitSetting') {
    unit = e.target.value;
    announce('Weight display unit updated');
  }
  if (e.target.id === 'restSetting') {
    rest = Number(e.target.value);
    announce('Default rest updated');
  }
  if (e.target.id === 'deleteConfirm') $('[data-action="delete"]').disabled = !e.target.checked;
});
document.addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  if (e.target.id === 'authForm') {
    authEmail = f.get('email');
    navigate(page === 'signup' ? 'verify' : 'setup');
  }
  if (e.target.id === 'recoveryForm') {
    authEmail = f.get('email');
    recoverySent = true;
    render();
  }
  if (e.target.id === 'passwordForm') {
    if (f.get('password') !== f.get('confirm')) {
      notice = 'The passwords do not match. Try again.';
      render();
    } else {
      navigate('signin');
      notice = 'Password updated. Sign in with your new password.';
      render();
    }
  }
  if (e.target.id === 'setupForm') {
    unit = f.get('unit');
    rest = parseInt(f.get('rest'), 10);
    state = 'normal';
    navigate('train');
  }
  if (e.target.id === 'customForm') {
    const name = String(f.get('name')).trim();
    if (!name) {
      notice = 'Enter a name for this exercise.';
      render();
      return;
    }
    const duplicate = catalog.some(c => c.id !== editingCustomId && c.name.toLowerCase() === name.toLowerCase());
    if (editingCustomId) {
      const item = catalog.find(e => e.id === editingCustomId);
      Object.assign(item, {
        name,
        muscle: f.get('muscle'),
        category: f.get('category'),
        equipment: f.get('equipment'),
        load: f.get('load')
      });
      editingCustomId = null;
    } else catalog.push({
      id: Date.now(),
      name,
      muscle: f.get('muscle'),
      category: f.get('category'),
      equipment: f.get('equipment'),
      load: f.get('load'),
      custom: true
    });
    navigate(customFromPicker ? 'picker' : 'library');
    notice = duplicate ? 'Saved as your custom exercise. A similar name already exists.' : 'Your custom exercise is ready.';
    render();
  }
});
document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.go) {
    if (b.dataset.go === 'custom') {
      editingCustomId = null;
      customFromPicker = page === 'picker';
    }
    if (['routineEdit', 'correction'].includes(page) && b.dataset.go !== page) {
      modal('Leave without saving?', 'Your edits to this page will be lost.', button('Leave without saving', `leave:${b.dataset.go}`, 'danger full'));
      return;
    }
    navigate(b.dataset.go);
    return;
  }
  if (b.dataset.state) {
    state = b.dataset.state;
    render();
    return;
  }
  const a = b.dataset.action;
  if (!a) return;
  const [action, arg, arg2] = a.split(':');
  if (action === 'start') start();else if (action === 'start-routine') start(true);else if (action === 'resume') navigate('workout');else if (action === 'workout-picker') openPicker('workout');else if (action === 'routine-picker') openPicker('routine');else if (action === 'select') {
    const id = Number(arg);
    selected.has(id) ? selected.delete(id) : selected.add(id);
    const current = query;
    render();
    query = current;
  } else if (action === 'add-selected') {
    if (pickerTarget === 'routine') {
      routineIds = [...routineIds, ...selected];
      navigate('routineEdit');
    } else {
      active = true;
      selected.forEach(id => workout.push({
        id,
        sets: [{
          load: '',
          reps: '',
          done: false
        }]
      }));
      navigate('workout');
    }
  } else if (action === 'scope') {
    scope = arg;
    render();
  } else if (action === 'clear-search') {
    query = '';
    muscle = '';
    equipment = '';
    state = 'normal';
    render();
  } else if (action === 'exercise') {
    exerciseId = Number(arg);
    detailTab = 'overview';
    navigate('exercise');
  } else if (action === 'detail') {
    detailTab = arg;
    render();
  } else if (action === 'play') {
    mediaError = true;
    render();
  } else if (action === 'add-set') {
    modal('Add a set', 'Warm-up sets are excluded from records.', button('Working set', `add-working:${arg}`) + button('Warm-up set', `add-warmup:${arg}`, 'secondary full'));
  } else if (action === 'add-working' || action === 'add-warmup') {
    workout[arg].sets.push({
      load: '',
      reps: '',
      done: false,
      warm: action === 'add-warmup'
    });
    $('#sheet').close();
    render();
  } else if (action === 'complete') {
    const s = workout[arg].sets[arg2];
    if (!s.done && !validSet(s)) {
      notice = 'Enter a valid weight and a whole number of reps before completing the set.';
      render();
      return;
    }
    s.done = !s.done;
    timerEnd = s.done ? Date.now() + (Number(routineTargets[workout[arg].id]?.rest) || rest) * 1000 : 0;
    notice = '';
    render();
  } else if (action === 'remove-incomplete') {
    workout.forEach(w => w.sets = w.sets.filter(s => s.done));
    workout = workout.filter(w => w.sets.length);
    render();
  } else if (action === 'finish') {
    if (state !== 'normal' || !completed() || workout.some(w => w.sets.some(s => !s.done || !validSet(s)))) return;
    sessions.unshift({
      name: workoutName,
      date: 'Today · 6:24 PM',
      duration: durationLabel(),
      items: workout.map(w => {
        const e = catalog.find(e => e.id === w.id);
        return {
          id: e.id,
          name: e.name,
          unit,
          load: e.load,
          sets: clone(w.sets)
        };
      })
    });
    active = false;
    historyAdded = true;
    timerEnd = 0;
    navigate('summary');
  } else if (action === 'retry') {
    state = 'normal';
    notice = 'Changes saved for this preview.';
    render();
  } else if (action === 'conflict') {
    modal('Review saved changes', 'Another device saved 65 kg × 8. Your input is preserved. Choose which version to continue with.', button('Use saved version', 'resolve-saved') + button('Review and reapply my input', 'resolve-mine', 'secondary full'));
  } else if (action === 'resolve-saved' || action === 'resolve-mine') {
    state = 'normal';
    $('#sheet').close();
    notice = action === 'resolve-saved' ? 'Latest saved version loaded.' : 'Your input was reapplied after review.';
    if (action === 'resolve-saved' && workout[0]) {
      workout[0].sets[0].load = '65';
      workout[0].sets[0].reps = '8';
    }
    render();
  } else if (action === 'extend') {
    timerEnd += 30000;
    tick();
  } else if (action === 'skip') {
    timerEnd = 0;
    render();
  } else if (action === 'timer') {
    modal('Rest timer', 'Set the pace for your next set.', selectField('Duration', 'timerDuration', ['60 seconds', '90 seconds', '120 seconds', '180 seconds'], `${rest} seconds`) + button('Restart timer', 'restart-timer'));
  } else if (action === 'restart-timer') {
    rest = parseInt($('#sheet [name="timerDuration"]').value, 10);
    timerEnd = Date.now() + rest * 1000;
    $('#sheet').close();
    render();
  } else if (action === 'discard') {
    modal('Discard this workout?', 'This session will be cancelled and won’t count toward your history or records.', button('Discard workout', 'confirm-discard', 'danger full'));
  } else if (action === 'confirm-discard') {
    active = false;
    workout = [];
    timerEnd = 0;
    $('#sheet').close();
    navigate('train');
  } else if (action === 'exercise-menu') {
    modal('Exercise options', 'Remove this exercise and its sets from the active workout?', button('Remove exercise', `remove-exercise:${arg}`, 'danger full'));
  } else if (action === 'remove-exercise') {
    workout.splice(Number(arg), 1);
    $('#sheet').close();
    render();
  } else if (action === 'save-routine') {
    routineName = $('[name="routineName"]').value.trim() || 'My routine';
    if (state !== 'normal') {
      notice = 'Your routine is not saved. Resolve the connection or conflict first.';
      render();
      return;
    }
    navigate('routine');
  } else if (action === 'new-routine') {
    routineDraftBackup = {
      name: routineName,
      ids: [...routineIds],
      targets: clone(routineTargets)
    };
    page = 'routineEdit';
    routineName = '';
    routineIds = [];
    routineTargets = {};
    render();
  } else if (action === 'move') {
    const i = Number(arg);
    if (i > 0) [routineIds[i - 1], routineIds[i]] = [routineIds[i], routineIds[i - 1]];
    render();
  } else if (action === 'cancel-editor') {
    modal('Leave without saving?', 'Your routine edits will be lost.', button('Leave without saving', 'leave:train', 'danger full'));
  } else if (action === 'leave') {
    if (page === 'routineEdit' && routineDraftBackup) {
      routineName = routineDraftBackup.name;
      routineIds = [...routineDraftBackup.ids];
      routineTargets = clone(routineDraftBackup.targets);
    }
    if (page === 'correction') correctionDraft = null;
    $('#sheet').close();
    navigate(arg);
  } else if (action === 'archive-routine') {
    modal('Archive this routine?', 'It will be hidden from Train. Your past workouts stay intact.', button('Archive routine', 'confirm-archive', 'danger full'));
  } else if (action === 'confirm-archive') {
    routineArchived = true;
    $('#sheet').close();
    navigate('train');
  } else if (action === 'pull-routine') {
    routineName = 'Pull day A';
    routineIds = [2, 5, 7];
    navigate('routine');
  } else if (action === 'summary-routine') {
    routineIds = workout.map(w => w.id);
    routineName = workoutName;
    navigate('routineEdit');
  } else if (action === 'session') {
    viewedSession = sessions[Number(arg)];
    navigate('workoutDetail');
  } else if (action === 'save-correction') {
    if (correctionDraft.items.some(i => i.sets.some(s => !validSet(s)))) {
      notice = 'Enter valid weights and whole-number reps before saving.';
      render();
      return;
    }
    if (state !== 'normal') {
      notice = 'Corrections are not saved. Retry when connected.';
      render();
      return;
    }
    Object.assign(viewedSession || sessions[0], clone(correctionDraft));
    correctionSaved = true;
    navigate('workoutDetail');
  } else if (action === 'cancel-correction') {
    modal('Discard corrections?', 'The original workout will be kept.', button('Discard corrections', 'leave:workoutDetail', 'danger full'));
  } else if (action === 'more-history') {
    notice = 'You’re all caught up. No earlier sessions in this preview.';
    render();
  } else if (action === 'show-password') {
    const input = b.previousElementSibling;
    input.type = input.type === 'password' ? 'text' : 'password';
    b.textContent = input.type === 'password' ? 'Show' : 'Hide';
  } else if (action === 'resend') {
    verifySent = true;
    render();
    setTimeout(() => {
      verifySent = false;
      if (page === 'verify') render();
    }, 60000);
  } else if (action === 'verified') {
    navigate('setup');
  } else if (action === 'alerts') {
    if (alerts) {
      alerts = false;
      render();
    } else modal('Enable rest alerts?', 'Get a sound when your rest finishes. If you decline, the in-app timer still works.', button('Allow alerts', 'allow-alerts') + button('Not now', 'deny-alerts', 'secondary full'));
  } else if (action === 'allow-alerts') {
    alerts = true;
    $('#sheet').close();
    render();
  } else if (action === 'deny-alerts') {
    $('#sheet').close();
    notice = 'Rest alerts are off. You can enable them in system settings.';
    render();
  } else if (action === 'system-settings') {
    modal('Notification settings', 'In the native app, this opens your device’s notification settings. You can keep using the in-app timer.');
  } else if (action === 'signout') {
    if (state === 'offline' || active) modal('Leave your workout?', 'Stay to finish saving, or discard local changes and sign out of Grind.', button('Stay and retry', 'stay-signin') + button('Discard local changes and sign out', 'confirm-signout', 'danger full'));else navigate('signin');
  } else if (action === 'stay-signin') {
    $('#sheet').close();
    state = 'normal';
    navigate('workout');
  } else if (action === 'confirm-signout') {
    active = false;
    workout = [];
    timerEnd = 0;
    $('#sheet').close();
    state = 'normal';
    navigate('signin');
  } else if (action === 'delete') {
    if (!$('#deleteConfirm').checked) return;
    modal('Delete Grind data permanently?', 'This preview will reset Grind’s sample data. Your shared sign-in and BabyBoo data are unaffected.', button('Delete Grind data', 'confirm-delete', 'danger full'));
  } else if (action === 'confirm-delete') {
    $('#sheet').close();
    active = false;
    workout = [];
    timerEnd = 0;
    state = 'normal';
    navigate('signin');
    notice = 'Grind data deleted in this preview. Your shared account is preserved.';
    render();
  } else if (action === 'edit-custom') {
    editingCustomId = exerciseId;
    customFromPicker = false;
    navigate('custom');
  } else if (action === 'archive-custom') {
    modal('Archive this exercise?', 'It will be hidden from new selection. Your past workouts retain their original labels.', button('Archive exercise', 'confirm-custom-archive', 'danger full'));
  } else if (action === 'confirm-custom-archive') {
    catalog.find(e => e.id === exerciseId).archived = true;
    $('#sheet').close();
    navigate('library');
  }
});
render();
