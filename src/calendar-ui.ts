export function renderCalendarStyles(): string {
  return `<style>
  @layer components {
    .calendar-panel { width:min(1400px,96vw);max-width:1400px; }
    #modal-calendar-event,#modal-calendar-print { z-index:70; }
    .calendar-filters { display:flex;gap:12px;flex-wrap:wrap;margin:12px 0; }
    .calendar-filters label { display:flex;flex-direction:column;gap:4px;flex:1 1 180px;min-width:0;font-size:.8rem; }
    .calendar-filters .input-control { min-height:44px;min-width:0;width:100%; }
    #calendar-filter-summary { color:var(--text-muted);font-size:.8rem;margin-bottom:8px; }
    #calendar-print-content { overflow-wrap:anywhere; }
    .calendar-print-day { margin:18px 0; }
    .calendar-print-entry { border-bottom:1px solid var(--border);padding:8px 0;break-inside:avoid; }
    .calendar-print-entry p { white-space:pre-wrap; }
    #calendar-print-filters { white-space:pre-wrap; }
    .calendar-header,.calendar-toolbar,.calendar-view-buttons { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
    .calendar-header { justify-content:space-between; }
    .calendar-toolbar { margin:14px 0; }
    .calendar-toolbar h3 { margin:0;flex:1 1 200px;font-size:1.25rem; }
    .calendar-toolbar button,.calendar-view-buttons button,.calendar-day-number { min-height:44px;min-width:44px; }
    .calendar-view-buttons [aria-pressed="true"] { background:var(--accent);color:var(--on-accent); }
    .calendar-layout { display:grid;grid-template-columns:210px minmax(0,1fr);gap:18px; }
    .calendar-sidebar { min-width:0;border-right:1px solid var(--border);padding-right:16px; }
    .calendar-sidebar h4 { margin:16px 0 8px; }
    .calendar-sidebar label { display:block;margin:10px 0;font-size:.85rem; }
    .calendar-mini { display:grid;grid-template-columns:repeat(7,minmax(0,1fr));margin-top:8px;gap:2px; }
    .calendar-mini button { border:0;border-radius:50%;background:transparent;color:var(--text);min-height:28px;font-size:.75rem;cursor:pointer; }
    .calendar-mini button[aria-pressed="true"] { background:var(--accent);color:var(--on-accent); }
    .calendar-mini small { text-align:center;color:var(--text-muted);font-size:.7rem; }
    .calendar-surface { min-width:0; }
    .calendar-month { display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid var(--border);border-left:1px solid var(--border); }
    .calendar-weekday { padding:8px 3px;text-align:center;font-size:.75rem;font-weight:700;color:var(--text-muted);border-right:1px solid var(--border);border-bottom:1px solid var(--border); }
    .calendar-cell { min-height:106px;min-width:0;border-right:1px solid var(--border);border-bottom:1px solid var(--border);padding:4px; }
    .calendar-cell.outside { background:var(--input-bg); }
    .calendar-day-number { display:block;border:0;border-radius:50%;color:var(--text);background:transparent;cursor:pointer;font-weight:700; }
    .calendar-cell.today .calendar-day-number { background:var(--accent);color:var(--on-accent); }
    .calendar-cell.selected { box-shadow:inset 0 0 0 2px var(--accent); }
    .calendar-event { display:block;width:100%;text-align:left;border:1px solid var(--border);border-left:4px solid var(--accent);border-radius:5px;padding:5px 6px;background:var(--input-bg);color:var(--text);font-size:.76rem;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:3px 0;min-height:30px; }
    .calendar-event.inspection { border-left-color:#f59e0b; }
    .calendar-event.document { border-left-color:#a78bfa; }
    .calendar-event.shop { border-left-color:#38bdf8; }
    .calendar-event.shop.category-inspection { border-left-color:#f59e0b; }
    .calendar-event.shop.category-repair { border-left-color:#f43f5e; }
    .calendar-event.shop.category-maintenance { border-left-color:#10b981; }
    .calendar-day-agenda { margin-top:14px;border:1px solid var(--border);border-radius:10px;padding:12px; }
    .calendar-agenda-row { display:flex;gap:12px;align-items:center; }
    .calendar-agenda-row time { min-width:90px;font-size:.8rem;color:var(--text-muted); }
    .calendar-agenda-row .calendar-event { white-space:normal;min-height:44px; }
    .calendar-week-scroll { max-height:60vh;overflow:auto;border:1px solid var(--border);border-radius:8px; }
    .calendar-week { min-width:700px; }
    .calendar-week-head { display:grid;grid-template-columns:48px repeat(7,minmax(0,1fr));position:sticky;top:0;background:var(--bg-card-solid);z-index:2;border-bottom:1px solid var(--border); }
    .calendar-week-head>div { padding:6px;border-right:1px solid var(--border);min-width:0; }
    .calendar-week-body { display:grid;grid-template-columns:48px repeat(7,minmax(0,1fr)); }
    .calendar-hours { position:relative;height:1152px;color:var(--text-muted);font-size:.68rem; }
    .calendar-hour { position:absolute;left:3px; }
    .calendar-week-day { position:relative;height:1152px;border-right:1px solid var(--border);background:repeating-linear-gradient(to bottom,transparent 0,transparent 47px,var(--border) 47px,var(--border) 48px); }
    .calendar-week-day .calendar-event { position:absolute;white-space:normal;margin:0;font-size:.68rem;line-height:1.2;min-height:24px; }
    .calendar-more { border:0;background:transparent;color:var(--text-muted);cursor:pointer;font-size:.75rem;min-height:32px; }
    .calendar-legend { display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px; }
    #calendar-status { min-height:24px;margin:8px 0;color:var(--text-muted); }
    #calendar-event-error { color:var(--red-text);margin:8px 0; }
    .calendar-overlap-box { background:var(--yellow-bg);color:var(--yellow-text);border:1px solid var(--yellow-border);border-radius:10px;padding:12px;margin-top:12px;overflow-wrap:anywhere; }
    .calendar-overlap-box ul { margin:8px 0 0;padding-left:20px; }
    .calendar-overlap-box li { margin:6px 0; }
    .calendar-event-meta { display:block;font-size:.72rem;color:var(--text-secondary); }
    .calendar-event-title { font-weight:650; }
    .calendar-agenda-row { align-items:stretch; }
    .calendar-agenda-row time { padding-top:10px; }
    .calendar-event-form-note { margin:10px 0;color:var(--text-muted);font-size:.82rem; }
    #modal-calendar :focus-visible,#modal-calendar-event :focus-visible,#modal-calendar-print :focus-visible { outline:3px solid var(--accent);outline-offset:2px; }
    .calendar-cell.outside .calendar-day-number { color:var(--text-muted); }
    .calendar-week-head .calendar-day-number[aria-pressed="true"] { box-shadow:inset 0 0 0 2px var(--accent); }
    .calendar-week-head .calendar-day-number[aria-current="date"] { background:var(--accent);color:var(--on-accent); }
    .calendar-agenda-empty { padding:16px 4px;color:var(--text-muted); }
    .calendar-week-hint { color:var(--text-muted);font-size:.8rem;margin:6px 0; }
    @media(max-width:760px) {
      .calendar-panel { width:100%;padding:12px; }
      .calendar-layout { grid-template-columns:minmax(0,1fr);gap:8px; }
      .calendar-sidebar { border:0;padding:0;display:flex;gap:8px;flex-wrap:wrap;align-items:center; }
      .calendar-sidebar .calendar-mini,.calendar-sidebar h4,.calendar-sidebar .calendar-date-label { display:none; }
      .calendar-sidebar label { margin:4px 0;font-size:.75rem; }
      .calendar-sidebar .input-control { max-width:160px; }
      .calendar-cell { min-height:92px;padding:2px; }
      .calendar-day-number { min-height:32px;min-width:32px;font-size:.8rem; }
      .calendar-event { font-size:.72rem;padding:4px;min-height:32px;border-left-width:3px; }
      .calendar-month .calendar-event-meta { display:none; }
      .calendar-agenda-row .calendar-event { font-size:.85rem;padding:8px; }
      .calendar-overlap-box .btn { width:100%; }
      #modal-calendar-event .modal-panel { padding:16px; }
      #modal-calendar-event .modal-footer { gap:8px; }
      .calendar-filters { gap:8px; }
      .calendar-filters label { flex-basis:130px; }
      .calendar-filters label:first-child { flex-basis:100%; }
      .calendar-toolbar h3 { flex-basis:100%; }
      .calendar-agenda-row { gap:5px; }
      .calendar-agenda-row time { min-width:66px;font-size:.7rem; }
      .calendar-week-scroll { max-width:100%; }
    }
  }
  @media print {
    body.calendar-printing { background:#fff!important;color:#000!important;overflow:visible!important; }
    body.calendar-printing > :not(#modal-calendar-print) { display:none!important; }
    body.calendar-printing #modal-calendar-print { display:block!important;position:static;background:#fff;padding:0;overflow:visible;backdrop-filter:none; }
    body.calendar-printing #modal-calendar-print .modal-panel { max-width:none;width:100%;max-height:none;overflow:visible;border:0;border-radius:0;padding:0;background:#fff;box-shadow:none;color:#000; }
    body.calendar-printing .calendar-print-toolbar { display:none!important; }
    body.calendar-printing .calendar-print-entry { border-color:#aaa; }
    body.calendar-printing .calendar-print-day h3 { break-after:avoid; }
  }
  </style>`;
}

export function renderCalendarControls(): string {
  return `<div id="modal-calendar" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="calendar-title">
    <div class="modal-panel calendar-panel">
      <header class="calendar-header"><div><h2 id="calendar-title" class="modal-title">Shop Calendar</h2><p class="muted-note">Fleet dates & shop appointments · America/Winnipeg</p></div><div class="calendar-header"><button id="calendar-print-preview" type="button" class="btn btn-secondary" disabled>Printable agenda</button><button id="calendar-new" type="button" class="btn btn-primary">+ Appointment</button><button type="button" class="close-btn" data-close="modal-calendar" aria-label="Close calendar">&times;</button></div></header>
      <div class="calendar-toolbar"><button id="calendar-today" type="button" class="btn btn-secondary">Today</button><button id="calendar-prev" type="button" class="btn btn-secondary" aria-label="Previous calendar period">‹</button><button id="calendar-next" type="button" class="btn btn-secondary" aria-label="Next calendar period">›</button><h3 id="calendar-period" aria-live="polite"></h3><div class="calendar-view-buttons" role="group" aria-label="Calendar view"><button type="button" class="btn btn-secondary" data-calendar-view="month" aria-pressed="true">Month</button><button type="button" class="btn btn-secondary" data-calendar-view="week" aria-pressed="false">Week</button><button type="button" class="btn btn-secondary" data-calendar-view="agenda" aria-pressed="false">Agenda</button></div></div>
      <div class="calendar-filters"><label for="calendar-search">Search this period<input id="calendar-search" type="search" class="input-control" maxlength="160" placeholder="Title, notes, or unit"/></label><label for="calendar-unit-filter">Unit<select id="calendar-unit-filter" class="input-control"><option value="">All units</option><option value="unlinked">No linked unit</option></select></label><label for="calendar-category-filter">Shop category<select id="calendar-category-filter" class="input-control"><option value="">All shop categories</option><option value="general">General</option><option value="inspection">Inspection</option><option value="repair">Repair</option><option value="maintenance">Maintenance</option></select></label><button id="calendar-clear-filters" type="button" class="btn btn-secondary">Reset filters</button></div><p id="calendar-filter-summary" role="status"></p>
      <div class="calendar-layout"><aside class="calendar-sidebar" aria-label="Calendar navigation and sources"><label class="calendar-date-label" for="calendar-date">Jump to date</label><input type="date" id="calendar-date" class="input-control" aria-label="Jump to calendar date" min="1900-01-01" max="2100-12-31"/><div id="calendar-mini" class="calendar-mini"></div><h4>Calendars</h4><label><input type="checkbox" data-calendar-source="inspection" checked/><span class="calendar-legend" style="background:#f59e0b"></span>Safety due dates</label><label><input type="checkbox" data-calendar-source="document" checked/><span class="calendar-legend" style="background:#a78bfa"></span>Document expiries</label><label><input type="checkbox" data-calendar-source="shop" checked/><span class="calendar-legend" style="background:#38bdf8"></span>Shop appointments</label><p class="muted-note">Fleet dates are read-only here. Change them in the unit record. Appointments do not change inspection dates or send reminders. Shop categories filter appointments only; fleet dates use the source checkboxes.</p></aside><section class="calendar-surface" aria-label="Calendar entries"><p class="muted-note" id="calendar-keyboard-help">Date buttons: arrow keys move by day/week, Home/End select Monday/Sunday, Page Up/Down change month. Week view uses 24-hour Winnipeg time.</p><p id="calendar-status" role="status" aria-live="polite"></p><button id="calendar-retry" type="button" class="btn btn-secondary hidden">Retry calendar</button><div id="calendar-content"></div><section id="calendar-day-agenda" class="calendar-day-agenda" aria-label="Selected day agenda"></section></section></div>
    </div>
  </div>
  <div id="modal-calendar-event" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="calendar-event-title"><div class="modal-panel"><div class="modal-header"><h2 id="calendar-event-title" class="modal-title">Shop appointment</h2><button type="button" class="close-btn" data-close="modal-calendar-event" aria-label="Close appointment">&times;</button></div>
    <form id="calendar-event-form" aria-describedby="calendar-event-edit-note"><p id="calendar-event-edit-note" class="calendar-event-form-note">Changes are saved only when you choose Save. Overlap warnings are advisory, not reservations.</p><input id="calendar-event-id" type="hidden"/><input id="calendar-event-revision" type="hidden"/><div class="form-grid">
    <div class="input-group col-span-2"><label for="calendar-event-name">Title *</label><input id="calendar-event-name" class="input-control" maxlength="160" required/></div>
    <div class="input-group"><label for="calendar-event-category">Category</label><select id="calendar-event-category" class="input-control"><option value="general">General</option><option value="inspection">Inspection</option><option value="repair">Repair</option><option value="maintenance">Maintenance</option></select></div>
    <div class="input-group"><label for="calendar-event-repeat">Repeat</label><select id="calendar-event-repeat" class="input-control"><option value="none">Does not repeat</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
    <div class="input-group col-span-2 calendar-repeat-field hidden"><label for="calendar-event-repeat-until">Last repeat start date (inclusive) *</label><input id="calendar-event-repeat-until" type="date" class="input-control"/></div><p id="calendar-event-series-note" class="muted-note col-span-2">Weekly or monthly repeats require an end date within two years. Monthly repeats use the original day, or the month's last day if needed. Editing or deleting affects the entire series, including past dates. Times stay on the Winnipeg clock; clock-change gaps are rejected.</p>
    <label class="col-span-2"><input id="calendar-event-all-day" type="checkbox" checked/> All-day appointment</label>
    <div class="input-group"><label for="calendar-event-start">Start date *</label><input id="calendar-event-start" type="date" class="input-control" required/></div><div class="input-group"><label for="calendar-event-end">End date (inclusive) *</label><input id="calendar-event-end" type="date" class="input-control" required/></div>
    <div class="input-group calendar-time-field hidden"><label for="calendar-event-start-time">Start time · Winnipeg</label><input id="calendar-event-start-time" type="time" class="input-control"/></div><div class="input-group calendar-time-field hidden"><label for="calendar-event-end-time">End time · Winnipeg</label><input id="calendar-event-end-time" type="time" class="input-control"/></div>
    <div class="input-group col-span-2"><label for="calendar-event-unit">Linked unit (optional)</label><select id="calendar-event-unit" class="input-control"><option value="">No linked unit</option></select></div><div class="input-group col-span-2"><label for="calendar-event-notes">Notes</label><textarea id="calendar-event-notes" class="input-control" rows="3" maxlength="4000"></textarea></div></div><section class="calendar-overlap-box" aria-label="Unit appointment overlap check"><button id="calendar-check-overlaps" type="button" class="btn btn-secondary">Check unit overlaps</button><p id="calendar-overlap-status" role="status" aria-live="polite">Choose a linked unit to check for overlapping shop appointments.</p><ul id="calendar-overlap-list"></ul></section><p id="calendar-event-attribution" class="muted-note"></p><p id="calendar-event-error" role="alert"></p><div class="modal-footer"><button id="calendar-event-delete" type="button" class="btn btn-danger hidden">Delete</button><button id="calendar-event-open-unit" type="button" class="btn btn-secondary hidden">Open unit</button><button type="button" class="btn btn-secondary" data-close="modal-calendar-event">Cancel</button><button id="calendar-event-save" type="submit" class="btn btn-primary">Save appointment</button></div></form></div></div>
  <div id="modal-calendar-print" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="calendar-print-title"><div class="modal-panel modal-lg"><div class="modal-header calendar-print-toolbar"><h2 class="modal-title">Printable agenda preview</h2><div><button id="calendar-print-confirm" type="button" class="btn btn-primary">Print</button><button type="button" class="close-btn" data-close="modal-calendar-print" aria-label="Close printable agenda">&times;</button></div></div><section id="calendar-print-content"></section></div></div>`;
}

export function renderCalendarScript(): string {
  return String.raw`
    let calendarDate = calendarToday();
    let calendarView = 'month';
    let calendarEvents = [];
    let calendarCanEdit = false;
    let calendarLoaded = false;
    let calendarGeneration = 0;
    let calendarReturnFocus = null;
    let calendarEventReturnFocus = null;
    let calendarEventSnapshot = '';
    let calendarEventEditable = false;
    let calendarEventBusy = false;
    let calendarOverlapGeneration = 0;
    let calendarOverlapController = null;
    let calendarEditorGeneration = 0;
    function calendarToday() {
      const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Winnipeg',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      const part = type => parts.find(p=>p.type===type).value;
      return part('year')+'-'+part('month')+'-'+part('day');
    }
    function calendarAdd(date, days) { const value=new Date(date+'T12:00:00Z');value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10); }
    function calendarMonth(date, delta) { const value=new Date(date+'T12:00:00Z');const day=value.getUTCDate();value.setUTCDate(1);value.setUTCMonth(value.getUTCMonth()+delta);const end=new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth()+1,0)).getUTCDate();value.setUTCDate(Math.min(day,end));return value.toISOString().slice(0,10); }
    function calendarWeekStart(date) { const day=new Date(date+'T12:00:00Z').getUTCDay();return calendarAdd(date,-((day+6)%7)); }
    function calendarLabel(date, options={month:'long',day:'numeric',year:'numeric'}) { return new Intl.DateTimeFormat(undefined,{...options,timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')); }
    function calendarRangeForView() {
      if(calendarView==='week'){const from=calendarWeekStart(calendarDate);return {from,to:calendarAdd(from,6)};}
      const from=calendarWeekStart(calendarDate.slice(0,7)+'-01');return {from,to:calendarAdd(from,41)};
    }
    const calendarCategoryNames = {general:'General',inspection:'Inspection',repair:'Repair',maintenance:'Maintenance'};
    function calendarFiltered() {
      const selected=new Set(Array.from(document.querySelectorAll('[data-calendar-source]:checked'),el=>el.dataset.calendarSource));
      const query=document.getElementById('calendar-search').value.trim().toLocaleLowerCase(),unit=document.getElementById('calendar-unit-filter').value,category=document.getElementById('calendar-category-filter').value;
      return calendarEvents.filter(e=>selected.has(e.kind)&&(!unit||(unit==='unlinked'?!e.truck_id:e.truck_id===unit))&&(e.kind!=='shop'||!category||e.category===category)&&(!query||[e.title,e.notes,e.unit_number,e.unit_number?'#'+e.unit_number:''].filter(Boolean).join(' ').toLocaleLowerCase().includes(query)));
    }
    function calendarDayEvents(day) { return calendarFiltered().filter(e=>e.start_date<=day&&e.end_date>=day&&(e.all_day||e.end_date!==day||e.end_time!=='00:00')).sort((a,b)=>Number(b.all_day)-Number(a.all_day)||a.start_time.localeCompare(b.start_time)||a.title.localeCompare(b.title)); }
    function calendarEventButton(event, extra='') {
      const time=event.all_day?'All day':event.start_time+'–'+event.end_time;
      const category=event.kind==='shop'?(calendarCategoryNames[event.category]||'General'):event.kind==='inspection'?'Safety due':'Document expiry';
      const repeat=event.recurrence&&event.recurrence!=='none'?' · '+event.recurrence+' series':'';
      const meta=time+' · '+category+(event.unit_number?' · #'+event.unit_number:'')+repeat;
      return '<button type="button" class="calendar-event '+escapeHtml(event.kind)+(event.kind==='shop'?' category-'+escapeHtml(event.category||'general'):'')+'" data-calendar-event="'+escapeHtml(event.id)+'" title="'+escapeHtml(event.title+' · '+meta)+'" aria-label="'+escapeHtml(event.title+' · '+meta+' · '+calendarLabel(event.start_date))+'" '+extra+'><span class="calendar-event-title">'+escapeHtml(event.title)+'</span><span class="calendar-event-meta">'+escapeHtml(meta)+'</span></button>';
    }
    function calendarAgenda(day) {
      return calendarDayEvents(day).map(event=>'<div class="calendar-agenda-row"><time>'+escapeHtml(event.all_day?'All day':(event.start_date<day?'Continues':event.start_time))+'</time>'+calendarEventButton(event)+'</div>').join('')||'<p class="calendar-agenda-empty">'+(calendarLoaded?'No entries match the current filters for this day.':'No calendar entries loaded yet.')+'</p>';
    }
    function renderCalendar() {
      const focusedDay=document.activeElement?.closest('[data-calendar-day]');
      const focusScope=focusedDay?(focusedDay.closest('#calendar-mini')?'#calendar-mini':'#calendar-content'):null;
      const previousWeek=document.querySelector('.calendar-week-scroll');
      const previousWeekScroll=previousWeek?.scrollTop,previousWeekLeft=previousWeek?.scrollLeft;
      const range=calendarRangeForView(),days=Array.from({length:calendarView==='week'?7:42},(_,i)=>calendarAdd(range.from,i));
      document.getElementById('calendar-date').value=calendarDate;
      document.getElementById('calendar-period').textContent=calendarView==='week'?calendarLabel(range.from,{month:'short',day:'numeric'})+' – '+calendarLabel(range.to):calendarLabel(calendarDate,{month:'long',year:'numeric'});
      document.querySelectorAll('[data-calendar-view]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.calendarView===calendarView)));
      const weekday=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      const miniStart=calendarWeekStart(calendarDate.slice(0,7)+'-01');
      document.getElementById('calendar-mini').innerHTML=weekday.map(day=>'<small>'+day[0]+'</small>').join('')+Array.from({length:42},(_,i)=>{const day=calendarAdd(miniStart,i);return '<button type="button" data-calendar-day="'+day+'" aria-label="'+escapeHtml(calendarLabel(day))+'" aria-pressed="'+(day===calendarDate)+'"'+(day<'1900-01-01'||day>'2100-12-31'?' disabled':'')+' tabindex="'+(day===calendarDate?0:-1)+'"'+(day===calendarToday()?' aria-current="date"':'')+'>'+Number(day.slice(8))+'</button>';}).join('');
      const content=document.getElementById('calendar-content');
      if(calendarView==='month') {
        content.innerHTML='<div class="calendar-month" aria-label="Month calendar">'+weekday.map(day=>'<div class="calendar-weekday">'+day+'</div>').join('')+days.map(day=>{
          const entries=calendarDayEvents(day);
          return '<div class="calendar-cell'+(day.slice(0,7)!==calendarDate.slice(0,7)?' outside':'')+(day===calendarToday()?' today':'')+(day===calendarDate?' selected':'')+'"><button type="button" class="calendar-day-number" data-calendar-day="'+day+'" aria-label="'+escapeHtml(calendarLabel(day))+'" aria-pressed="'+(day===calendarDate)+'"'+(day<'1900-01-01'||day>'2100-12-31'?' disabled':'')+' tabindex="'+(day===calendarDate?0:-1)+'"'+(day===calendarToday()?' aria-current="date"':'')+'>'+Number(day.slice(8))+'</button>'+entries.slice(0,3).map(e=>calendarEventButton(e)).join('')+(entries.length>3?'<button type="button" class="calendar-more" data-calendar-day="'+day+'">+'+(entries.length-3)+' more</button>':'')+'</div>';
        }).join('')+'</div>';
      } else if(calendarView==='agenda') {
        const monthDays=days.filter(day=>day.slice(0,7)===calendarDate.slice(0,7)&&calendarDayEvents(day).length);
        content.innerHTML=monthDays.map(day=>'<section><h4>'+escapeHtml(calendarLabel(day,{weekday:'long',month:'short',day:'numeric'}))+'</h4>'+calendarAgenda(day)+'</section>').join('')||'<p class="calendar-agenda-empty">'+(calendarLoaded?'No entries match the current filters this month. Reset filters or choose another month.':'No calendar entries loaded yet.')+'</p>';
      } else {
        const minutes=time=>Number(time.slice(0,2))*60+Number(time.slice(3));
        content.innerHTML='<p class="calendar-week-hint">Scroll vertically for other hours and horizontally for the full week on narrow screens. Select a date for its full agenda below.</p><div class="calendar-week-scroll" tabindex="0" role="region" aria-label="Scrollable week timetable, 24-hour Winnipeg time"><div class="calendar-week"><div class="calendar-week-head"><div></div>'+days.map(day=>'<div><button type="button" class="calendar-day-number" data-calendar-day="'+day+'" aria-label="'+escapeHtml(calendarLabel(day))+'" aria-pressed="'+(day===calendarDate)+'"'+(day<'1900-01-01'||day>'2100-12-31'?' disabled':'')+' tabindex="'+(day===calendarDate?0:-1)+'"'+(day===calendarToday()?' aria-current="date"':'')+'>'+calendarLabel(day,{weekday:'short',day:'numeric'})+'</button>'+calendarDayEvents(day).filter(e=>e.all_day).map(e=>calendarEventButton(e)).join('')+'</div>').join('')+'</div><div class="calendar-week-body"><div class="calendar-hours">'+Array.from({length:24},(_,hour)=>'<span class="calendar-hour" style="top:'+(hour*48)+'px">'+String(hour).padStart(2,'0')+':00</span>').join('')+'</div>'+days.map(day=>{
          const timed=calendarDayEvents(day).filter(e=>!e.all_day).map(event=>({event,start:event.start_date<day?0:minutes(event.start_time),end:event.end_date>day?1440:minutes(event.end_time)})).filter(e=>e.end>e.start).sort((a,b)=>a.start-b.start||a.end-b.end);
          const lanes=[];for(const entry of timed){let lane=lanes.findIndex(end=>end<=entry.start);if(lane<0)lane=lanes.length;lanes[lane]=entry.end;entry.lane=lane;}
          const count=Math.max(1,lanes.length);
          return '<div class="calendar-week-day" aria-label="'+escapeHtml(calendarLabel(day))+'">'+timed.map(({event,start,end,lane})=>calendarEventButton(event,'style="top:'+(start*.8)+'px;height:'+Math.max(24,(end-start)*.8)+'px;left:'+(lane*100/count)+'%;width:'+(100/count)+'%"')).join('')+'</div>';
        }).join('')+'</div></div></div>';
      }
      const weekScroll=document.querySelector('.calendar-week-scroll');if(weekScroll){weekScroll.scrollTop=previousWeekScroll??360;weekScroll.scrollLeft=previousWeekLeft??0;}
      const agenda=document.getElementById('calendar-day-agenda');agenda.innerHTML='<h4>'+escapeHtml(calendarLabel(calendarDate,{weekday:'long',month:'long',day:'numeric'}))+'</h4>'+calendarAgenda(calendarDate);
      document.getElementById('calendar-new').classList.toggle('hidden',!calendarCanEdit||!calendarLoaded);
      document.getElementById('calendar-print-preview').disabled=!calendarLoaded;
      document.getElementById('calendar-filter-summary').textContent=calendarLoaded?calendarFiltered().length+' of '+calendarEvents.length+' entries match filters in the loaded period.':'';
      if(focusScope)document.querySelector(focusScope+' [data-calendar-day="'+calendarDate+'"]')?.focus();
    }
    async function loadCalendar() {
      const generation=++calendarGeneration,range=calendarRangeForView();
      const status=document.getElementById('calendar-status');status.textContent='Loading calendar…';document.getElementById('calendar-retry').classList.add('hidden');
      calendarEvents=[];calendarLoaded=false;renderCalendar();
      try {
        const response=await apiFetch('/calendar?from='+range.from+'&to='+range.to),data=await response.json();
        if(generation!==calendarGeneration||document.getElementById('modal-calendar').classList.contains('hidden'))return;
        calendarEvents=data.events;calendarCanEdit=data.can_edit;calendarLoaded=true;renderCalendar();status.textContent=calendarEvents.length+' entries in this period · Winnipeg time';
      } catch(error) {
        if(generation!==calendarGeneration)return;
        calendarEvents=[];calendarLoaded=false;renderCalendar();status.textContent='Calendar unavailable: '+error.message;document.getElementById('calendar-retry').classList.remove('hidden');
      }
    }
    function resetCalendar() {
      calendarGeneration++;calendarEditorGeneration++;calendarLoaded=false;clearCalendarPrint();invalidateCalendarOverlap();calendarEventSnapshot='';calendarEventEditable=false;calendarEventBusy=false;
      document.getElementById('calendar-search').value='';document.getElementById('calendar-category-filter').value='';document.getElementById('calendar-filter-summary').textContent='';
      document.getElementById('calendar-unit-filter').innerHTML='<option value="">All units</option><option value="unlinked">No linked unit</option>';
      document.getElementById('calendar-event-unit').innerHTML='<option value="">No linked unit</option>';
      invalidateCalendarOverlap();
      document.getElementById('calendar-event-error').textContent='';
      document.getElementById('calendar-status').textContent='';calendarEvents=[];calendarCanEdit=false;
      document.getElementById('calendar-content').innerHTML='';document.getElementById('calendar-day-agenda').innerHTML='';document.getElementById('calendar-event-form').reset();document.getElementById('calendar-event-id').value='';document.getElementById('calendar-event-revision').value='';document.getElementById('calendar-event-attribution').textContent='';
    }
    async function openCalendar() {
      if(DEMO_MODE){showToast('The shop calendar is not available in the demo.');return;}
      calendarReturnFocus=document.activeElement;
      const unitFilter=document.getElementById('calendar-unit-filter'),unitValue=unitFilter.value;
      unitFilter.innerHTML='<option value="">All units</option><option value="unlinked">No linked unit</option>'+fleetData.map(unit=>'<option value="'+escapeHtml(unit.id)+'">#'+escapeHtml(unit.unit_number)+'</option>').join('');unitFilter.value=unitValue;if(unitFilter.selectedIndex<0)unitFilter.value='';
      document.getElementById('modal-calendar').classList.remove('hidden');syncCalendarDialogs();document.getElementById('calendar-today').focus();await loadCalendar();
    }
    document.getElementById('btn-calendar').addEventListener('click',openCalendar);
    document.getElementById('calendar-retry').addEventListener('click',loadCalendar);
    document.getElementById('calendar-today').addEventListener('click',()=>{calendarDate=calendarToday();loadCalendar();});
    document.getElementById('calendar-date').addEventListener('change',event=>{if(event.target.value&&event.target.validity.valid){calendarDate=event.target.value;loadCalendar();}});
    document.querySelectorAll('[data-calendar-view]').forEach(btn=>btn.addEventListener('click',()=>{calendarView=btn.dataset.calendarView;loadCalendar();}));
    document.querySelectorAll('[data-calendar-source]').forEach(input=>input.addEventListener('change',renderCalendar));
    document.getElementById('calendar-search').addEventListener('input',renderCalendar);
    for(const id of ['calendar-unit-filter','calendar-category-filter'])document.getElementById(id).addEventListener('change',renderCalendar);
    document.getElementById('calendar-clear-filters').addEventListener('click',()=>{for(const id of ['calendar-search','calendar-unit-filter','calendar-category-filter'])document.getElementById(id).value='';document.querySelectorAll('[data-calendar-source]').forEach(input=>input.checked=true);renderCalendar();});
    function clearCalendarPrint() { document.body.classList.remove('calendar-printing');document.getElementById('modal-calendar-print').classList.add('hidden');document.getElementById('calendar-print-content').innerHTML='';syncCalendarDialogs(); }
    document.getElementById('calendar-print-preview').addEventListener('click',()=>{
      if(!calendarLoaded)return;
      const range=calendarRangeForView(),days=Array.from({length:calendarView==='week'?7:42},(_,i)=>calendarAdd(range.from,i)).filter(day=>calendarView==='week'||day.slice(0,7)===calendarDate.slice(0,7));
      const unit=document.getElementById('calendar-unit-filter'),category=document.getElementById('calendar-category-filter');
      const sources=Array.from(document.querySelectorAll('[data-calendar-source]:checked'),input=>({inspection:'Safety due dates',document:'Document expiries',shop:'Shop appointments'})[input.dataset.calendarSource]).join(', ')||'No sources selected';
      const filters='Search: '+(document.getElementById('calendar-search').value.trim()||'none')+' · Unit: '+unit.selectedOptions[0].textContent+' · Shop category: '+category.selectedOptions[0].textContent+' · Sources: '+sources;
      const entries=days.filter(day=>calendarDayEvents(day).length).map(day=>'<section class="calendar-print-day"><h3>'+escapeHtml(calendarLabel(day,{weekday:'long',year:'numeric',month:'long',day:'numeric'}))+'</h3>'+calendarDayEvents(day).map(event=>{
        const time=event.all_day?'All day':(event.start_date<day?'Continues':event.start_time)+' – '+(event.end_date>day?'continues':event.end_time);
        const type=event.kind==='shop'?(calendarCategoryNames[event.category]||'General')+(event.recurrence!=='none'?' · '+event.recurrence+' series':''):event.kind==='inspection'?'Safety due':'Document expiry';
        return '<article class="calendar-print-entry"><strong>'+escapeHtml(time+' · '+event.title)+'</strong><p>'+escapeHtml(type+(event.unit_number?' · Unit #'+event.unit_number:''))+'</p>'+(event.notes?'<p>'+escapeHtml(event.notes)+'</p>':'')+'</article>';
      }).join('')+'</section>').join('');
      document.getElementById('calendar-print-content').innerHTML='<h2 id="calendar-print-title">Shop Calendar · '+escapeHtml(document.getElementById('calendar-period').textContent)+'</h2><p>America/Winnipeg · '+escapeHtml(days[0]+' to '+days[days.length-1])+'</p><p id="calendar-print-filters">'+escapeHtml(filters)+'</p>'+(entries||'<p>No entries match these filters for this period.</p>');
      document.body.classList.add('calendar-printing');document.getElementById('modal-calendar-print').classList.remove('hidden');syncCalendarDialogs();document.getElementById('calendar-print-confirm').focus();
    });
    document.getElementById('calendar-print-confirm').addEventListener('click',()=>{if(!document.getElementById('modal-calendar-print').classList.contains('hidden'))window.print();});
    for(const [id,delta] of [['calendar-prev',-1],['calendar-next',1]])document.getElementById(id).addEventListener('click',()=>{const next=calendarView==='week'?calendarAdd(calendarDate,delta*7):calendarMonth(calendarDate.slice(0,7)+'-01',delta);if(next<'1900-01-01'||next>'2100-12-31')return;calendarDate=next;loadCalendar();});
    function calendarTimeFields() {
      const allDay=document.getElementById('calendar-event-all-day').checked;
      document.querySelectorAll('.calendar-time-field').forEach(el=>el.classList.toggle('hidden',allDay));
      for(const id of ['calendar-event-start-time','calendar-event-end-time']){const el=document.getElementById(id);el.required=!allDay;el.disabled=allDay;}
    }
    document.getElementById('calendar-event-all-day').addEventListener('change',calendarTimeFields);
    function calendarRepeatFields() {
      const repeats=document.getElementById('calendar-event-repeat').value!=='none',until=document.getElementById('calendar-event-repeat-until'),start=document.getElementById('calendar-event-start').value;
      document.querySelector('.calendar-repeat-field').classList.toggle('hidden',!repeats);until.required=repeats;until.disabled=!repeats||document.getElementById('calendar-event-repeat').disabled;
      until.min=start;until.max=start?calendarMonth(start,24):'';
    }
    document.getElementById('calendar-event-repeat').addEventListener('change',calendarRepeatFields);
    document.getElementById('calendar-event-start').addEventListener('change',calendarRepeatFields);
    function calendarEventPayload() {
      const value=id=>document.getElementById('calendar-event-'+id).value;
      const id=value('id'),allDay=document.getElementById('calendar-event-all-day').checked,repeat=value('repeat');
      return {title:value('name'),notes:value('notes'),start_date:value('start'),end_date:value('end'),start_time:allDay?'':value('start-time'),end_time:allDay?'':value('end-time'),all_day:allDay,truck_id:value('unit')||null,category:value('category'),recurrence:repeat,repeat_until:repeat==='none'?'':value('repeat-until'),...(id?{revision:value('revision')}:{})};
    }
    function calendarEventDirty() { return calendarEventEditable&&calendarEventSnapshot!==JSON.stringify(calendarEventPayload()); }
    function freezeCalendarWrite() {
      const controls=Array.from(document.getElementById('calendar-event-form').querySelectorAll('input,select,textarea,#calendar-check-overlaps,#calendar-event-save,#calendar-event-delete')).map(el=>[el,el.disabled]);
      controls.forEach(([el])=>el.disabled=true);
      return ()=>controls.forEach(([el,disabled])=>el.disabled=disabled);
    }
    function closeCalendarEvent() {
      if(calendarEventBusy){document.getElementById('calendar-event-error').textContent='Please wait for the save or delete to finish.';return false;}
      if(calendarEventDirty()&&!confirm('Discard unsaved appointment changes?'))return false;
      calendarEditorGeneration++;invalidateCalendarOverlap();document.getElementById('modal-calendar-event').classList.add('hidden');calendarEventSnapshot='';
      syncCalendarDialogs();if(calendarEventReturnFocus?.isConnected)calendarEventReturnFocus.focus();else document.getElementById('calendar-new').focus();
      return true;
    }
    function validateCalendarForm() {
      const start=document.getElementById('calendar-event-start'),end=document.getElementById('calendar-event-end'),time=document.getElementById('calendar-event-end-time'),until=document.getElementById('calendar-event-repeat-until');
      end.setCustomValidity(start.value&&end.value&&end.value<start.value?'End date must be on or after the start date.':'');
      time.setCustomValidity(!document.getElementById('calendar-event-all-day').checked&&start.value===end.value&&time.value<=document.getElementById('calendar-event-start-time').value?'End time must be after the start time.':'');
      until.setCustomValidity(!until.disabled&&until.value&&start.value&&until.value<start.value?'The last repeat date must be on or after the first start.':'');
      return [start,end,time,until].every(el=>el.disabled||el.validity.valid);
    }
    function invalidateCalendarOverlap() {
      calendarOverlapGeneration++;calendarOverlapController?.abort();calendarOverlapController=null;
      document.getElementById('calendar-overlap-list').replaceChildren();
      document.getElementById('calendar-overlap-status').textContent=document.getElementById('calendar-event-unit').value?'Not checked for these values. Choose Check unit overlaps; saving checks again.':'Choose a linked unit to check for overlapping shop appointments.';
      document.getElementById('calendar-check-overlaps').disabled=false;
    }
    async function checkCalendarOverlaps() {
      invalidateCalendarOverlap();
      const payload=calendarEventPayload(),status=document.getElementById('calendar-overlap-status');
      if(!payload.truck_id)return {conflicts:[],truncated:false};
      const scheduleIds=['start','end',...(!payload.all_day?['start-time','end-time']:[]),...(payload.recurrence!=='none'?['repeat-until']:[])];
      if(!validateCalendarForm()||scheduleIds.some(id=>!document.getElementById('calendar-event-'+id).validity.valid)){status.textContent='Enter valid dates and times before checking for overlaps.';return null;}
      const generation=calendarOverlapGeneration,controller=new AbortController();calendarOverlapController=controller;
      const timeout=setTimeout(()=>controller.abort(),15000);
      document.getElementById('calendar-check-overlaps').disabled=true;status.textContent='Checking saved appointments for this unit…';
      try {
        const id=document.getElementById('calendar-event-id').value;
        const response=await apiFetch('/calendar/conflicts'+(id?'?exclude='+encodeURIComponent(id):''),{method:'POST',body:JSON.stringify({...payload,title:payload.title.trim()||'Appointment'}),signal:controller.signal});
        const data=await response.json();
        if(generation!==calendarOverlapGeneration||document.getElementById('modal-calendar-event').classList.contains('hidden'))return null;
        status.textContent=data.conflicts.length?(data.truncated?'At least ':'')+data.conflicts.length+' overlapping saved appointment dates for this unit. Saving is still allowed.':'No overlapping saved appointments found for this unit and these dates. This is not a reservation; schedules may change.';
        const list=document.getElementById('calendar-overlap-list');
        for(const conflict of data.conflicts){const item=document.createElement('li');item.textContent=conflict.title+' · '+conflict.start_date+(conflict.end_date!==conflict.start_date?' to '+conflict.end_date:'')+' · '+(conflict.all_day?'All day':conflict.start_time+'–'+conflict.end_time)+' Winnipeg · overlaps proposed date '+conflict.proposed_start_date;list.appendChild(item);}
        return data;
      }catch(error){if(generation===calendarOverlapGeneration)status.textContent='Overlap check unavailable: '+(error.name==='AbortError'?'request timed out':error.message)+'. No conflict-free result is available.';return null;}
      finally{clearTimeout(timeout);if(generation===calendarOverlapGeneration){document.getElementById('calendar-check-overlaps').disabled=false;calendarOverlapController=null;}}
    }
    document.getElementById('calendar-check-overlaps').addEventListener('click',checkCalendarOverlaps);
    const calendarEventForm=document.getElementById('calendar-event-form');
    for(const type of ['input','change'])calendarEventForm.addEventListener(type,()=>{invalidateCalendarOverlap();validateCalendarForm();document.getElementById('calendar-event-error').textContent='';});
    calendarEventForm.addEventListener('invalid',event=>{document.getElementById('calendar-event-error').textContent='Please check '+(event.target.labels?.[0]?.textContent||'the highlighted field')+': '+event.target.validationMessage;},true);
    window.addEventListener('beforeunload',event=>{if(!document.getElementById('modal-calendar-event').classList.contains('hidden')&&calendarEventDirty()){event.preventDefault();event.returnValue='';}});
    function openCalendarEvent(event=null) {
      calendarEditorGeneration++;
      calendarEventReturnFocus=document.activeElement;
      const form=document.getElementById('calendar-event-form');form.reset();
      const editable=calendarCanEdit&&(!event||event.kind==='shop');
      document.getElementById('calendar-event-title').textContent=event?(event.kind==='shop'?'Shop appointment':'Fleet date · edit in unit record'):'New shop appointment';
      document.getElementById('calendar-event-id').value=event?.kind==='shop'?(event.series_id||event.id):'';
      document.getElementById('calendar-event-category').value=event?.category||'general';
      document.getElementById('calendar-event-repeat').value=event?.recurrence||'none';
      document.getElementById('calendar-event-repeat-until').value=event?.repeat_until||'';
      document.getElementById('calendar-event-revision').value=event?.revision||'';
      document.getElementById('calendar-event-name').value=event?.title||'';
      document.getElementById('calendar-event-notes').value=event?.notes||'';
      document.getElementById('calendar-event-start').value=event?.series_start_date||event?.start_date||calendarDate;
      document.getElementById('calendar-event-end').value=event?.series_end_date||event?.end_date||calendarDate;
      document.getElementById('calendar-event-start-time').value=event?.start_time||'09:00';
      document.getElementById('calendar-event-end-time').value=event?.end_time||'10:00';
      document.getElementById('calendar-event-all-day').checked=event?event.all_day:true;
      const units=document.getElementById('calendar-event-unit');units.innerHTML='<option value="">No linked unit</option>'+fleetData.map(unit=>'<option value="'+escapeHtml(unit.id)+'">#'+escapeHtml(unit.unit_number)+'</option>').join('');units.value=event?.truck_id||'';
      form.querySelectorAll('input:not([type="hidden"]),textarea,select').forEach(el=>el.disabled=!editable);
      calendarRepeatFields();calendarTimeFields();if(!editable)for(const id of ['calendar-event-start-time','calendar-event-end-time'])document.getElementById(id).disabled=true;
      const isSeries=event?.kind==='shop'&&event.recurrence!=='none';
      document.getElementById('calendar-event-delete').dataset.series=String(Boolean(isSeries));
      document.getElementById('calendar-event-save').textContent=isSeries?'Save entire series':'Save appointment';document.getElementById('calendar-event-delete').textContent=isSeries?'Delete entire series':'Delete';
      if(isSeries)document.getElementById('calendar-event-title').textContent='Edit entire '+event.recurrence+' series · occurrence '+event.start_date;
      document.getElementById('calendar-event-save').classList.toggle('hidden',!editable);
      document.getElementById('calendar-event-save').disabled=false;
      document.getElementById('calendar-event-delete').classList.toggle('hidden',!editable||!event);
      document.getElementById('calendar-event-delete').disabled=false;
      calendarEventEditable=editable;calendarEventBusy=false;validateCalendarForm();calendarEventSnapshot=JSON.stringify(calendarEventPayload());invalidateCalendarOverlap();
      document.getElementById('calendar-check-overlaps').classList.toggle('hidden',!editable);
      const openUnit=document.getElementById('calendar-event-open-unit');openUnit.classList.toggle('hidden',!event?.truck_id);openUnit.dataset.unit=event?.truck_id||'';
      document.getElementById('calendar-event-attribution').textContent=event?.created_by_name?'Created by '+event.created_by_name+' · Last updated by '+event.updated_by_name+' · '+event.updated_at:'';
      document.getElementById('calendar-event-error').textContent='';document.getElementById('modal-calendar-event').classList.remove('hidden');syncCalendarDialogs();document.getElementById('modal-calendar-event').querySelector('.close-btn').focus();
    }
    document.getElementById('calendar-new').addEventListener('click',()=>{if(calendarCanEdit)openCalendarEvent();});
    async function selectCalendarDay(next,scope='#calendar-content') {
      if(next<'1900-01-01'||next>'2100-12-31')return;
      const previous=calendarDate,range=calendarRangeForView();calendarDate=next;
      if(next<range.from||next>range.to||calendarView!=='week'&&next.slice(0,7)!==previous.slice(0,7))await loadCalendar();else renderCalendar();
      if(calendarDate===next&&!document.getElementById('modal-calendar').classList.contains('hidden'))(document.querySelector(scope+' [data-calendar-day="'+next+'"]')||document.querySelector('#calendar-mini [data-calendar-day="'+next+'"]')||document.getElementById('calendar-date')).focus();
    }
    document.getElementById('modal-calendar').addEventListener('keydown',event=>{
      const day=event.target.closest('[data-calendar-day]');if(!day||event.altKey||event.ctrlKey||event.metaKey)return;
      const value=day.dataset.calendarDay,offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
      let next;if(event.key in offsets)next=calendarAdd(value,offsets[event.key]);else if(event.key==='Home')next=calendarWeekStart(value);else if(event.key==='End')next=calendarAdd(calendarWeekStart(value),6);else if(event.key==='PageUp'||event.key==='PageDown')next=calendarMonth(value,event.key==='PageUp'?-1:1);else return;
      event.preventDefault();selectCalendarDay(next,day.closest('#calendar-mini')?'#calendar-mini':'#calendar-content');
    });
    document.getElementById('modal-calendar').addEventListener('click',event=>{
      const day=event.target.closest('[data-calendar-day]');if(day){selectCalendarDay(day.dataset.calendarDay,day.closest('#calendar-mini')?'#calendar-mini':'#calendar-content');return;}
      const button=event.target.closest('[data-calendar-event]');if(button){const entry=calendarEvents.find(e=>e.id===button.dataset.calendarEvent);if(entry)openCalendarEvent(entry);}
    });
    document.getElementById('calendar-event-open-unit').addEventListener('click',async event=>{const id=event.currentTarget.dataset.unit;if(!id||!closeCalendarEvent())return;document.getElementById('modal-calendar').classList.add('hidden');calendarGeneration++;syncCalendarDialogs();await openUnitOverview(id);});
    document.getElementById('calendar-event-form').addEventListener('submit',async event=>{
      event.preventDefault();if(!calendarCanEdit||!calendarEventEditable||calendarEventBusy)return;
      validateCalendarForm();if(!document.getElementById('calendar-event-form').reportValidity())return;
      const id=document.getElementById('calendar-event-id').value,button=document.getElementById('calendar-event-save');button.disabled=true;calendarEventBusy=true;
      const generation=calendarEditorGeneration;let restoreControls=null;
      try {
        const payload=calendarEventPayload(),snapshot=JSON.stringify(payload);
        if(payload.truck_id){const result=await checkCalendarOverlaps();if(generation!==calendarEditorGeneration||document.getElementById('modal-calendar-event').classList.contains('hidden'))return;if(snapshot!==JSON.stringify(calendarEventPayload())){document.getElementById('calendar-event-error').textContent='The form changed during the overlap check. Review it and save again.';return;}if(!result&&!confirm('Overlap check unavailable. Save without checking for conflicts?'))return;if(result?.conflicts.length&&!confirm('This unit has overlapping appointments. Save anyway?'))return;}
        restoreControls=freezeCalendarWrite();
        await apiFetch('/calendar/events'+(id?'/'+encodeURIComponent(id):''),{method:id?'PUT':'POST',body:JSON.stringify(payload)});
        if(generation!==calendarEditorGeneration)return;
        invalidateCalendarOverlap();document.getElementById('modal-calendar-event').classList.add('hidden');syncCalendarDialogs();calendarDate=payload.start_date;showToast('Appointment saved');await loadCalendar();if(generation===calendarEditorGeneration)document.getElementById('calendar-new').focus();
      }catch(error){if(generation===calendarEditorGeneration)document.getElementById('calendar-event-error').textContent=error.message;}finally{if(generation===calendarEditorGeneration){restoreControls?.();button.disabled=false;calendarEventBusy=false;}}
    });
    document.getElementById('calendar-event-delete').addEventListener('click',async event=>{
      const id=document.getElementById('calendar-event-id').value;if(!id||!calendarCanEdit||calendarEventBusy||!confirm(document.getElementById('calendar-event-delete').dataset.series==='true'?'Delete this entire appointment series, including past dates? Fleet records will not be changed.':'Delete this shop appointment? Fleet records will not be changed.'))return;event.currentTarget.disabled=true;calendarEventBusy=true;
      const generation=calendarEditorGeneration,restoreControls=freezeCalendarWrite();
      try{await apiFetch('/calendar/events/'+encodeURIComponent(id),{method:'DELETE',headers:{'If-Match':document.getElementById('calendar-event-revision').value}});if(generation!==calendarEditorGeneration)return;calendarEventSnapshot='';invalidateCalendarOverlap();document.getElementById('modal-calendar-event').classList.add('hidden');syncCalendarDialogs();showToast('Appointment deleted');await loadCalendar();if(generation===calendarEditorGeneration)document.getElementById('calendar-new').focus();}catch(error){if(generation===calendarEditorGeneration)document.getElementById('calendar-event-error').textContent=error.message;}finally{if(generation===calendarEditorGeneration){restoreControls();document.getElementById('calendar-event-delete').disabled=false;calendarEventBusy=false;}}
    });
    function activeCalendarDialog() { return ['modal-calendar-print','modal-calendar-event','modal-calendar'].map(id=>document.getElementById(id)).find(el=>!el.classList.contains('hidden')); }
    const calendarInertState=new Map();
    function syncCalendarDialogs() {
      const top=activeCalendarDialog();
      for(const id of ['app-view','modal-calendar','modal-calendar-event']){
        const el=document.getElementById(id),blocked=Boolean(top)&&el!==top&&(id==='app-view'||!el.classList.contains('hidden'));
        if(blocked){if(!calendarInertState.has(el))calendarInertState.set(el,el.inert);el.inert=true;}
        else if(calendarInertState.has(el)){el.inert=calendarInertState.get(el);calendarInertState.delete(el);}
      }
    }
    const calendarDialogObserver=new MutationObserver(syncCalendarDialogs);
    for(const id of ['modal-calendar','modal-calendar-event','modal-calendar-print'])calendarDialogObserver.observe(document.getElementById(id),{attributes:true,attributeFilter:['class']});
    document.addEventListener('focusin',event=>{const dialog=activeCalendarDialog();if(dialog&&!dialog.contains(event.target)){const focus=dialog.querySelector('button:not(:disabled),input:not(:disabled)');focus?.focus();}});
    document.addEventListener('keydown',event=>{
      const top=activeCalendarDialog();
      if(event.key==='Tab'&&top){const controls=Array.from(top.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el=>el.tabIndex>=0&&el.getClientRects().length);const first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}return;}
      if(event.key!=='Escape')return;
      if(!document.getElementById('modal-calendar-print').classList.contains('hidden')){clearCalendarPrint();document.getElementById('calendar-print-preview').focus();event.stopImmediatePropagation();return;}
      const editor=document.getElementById('modal-calendar-event'),calendar=document.getElementById('modal-calendar');
      if(!editor.classList.contains('hidden')){closeCalendarEvent();event.preventDefault();event.stopImmediatePropagation();}
      else if(!calendar.classList.contains('hidden')){calendar.classList.add('hidden');calendarGeneration++;syncCalendarDialogs();if(calendarReturnFocus?.isConnected)calendarReturnFocus.focus();event.stopImmediatePropagation();}
    },true);
  `;
}
