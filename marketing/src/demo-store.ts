export const DEMO_STORE_JS = `
(() => {
  const KEY = 'truck_safety_demo_store';
  const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const save = (s) => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const state = Object.assign({ trucks: [], inspections: [] }, load());
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const marker = url.pathname.lastIndexOf('/api');
    const path = marker < 0 ? '' : url.pathname.slice(marker + 4);
    const method = (init.method || 'GET').toUpperCase();
    if (marker < 0 || !url.pathname.includes('/demo/api/')) return realFetch(input, init);
    const apiPath = path.startsWith('/') ? path : '/' + path;
    const settings = { warning_days: 30, webhook_url: '', webhook_type: 'auto', notify_days: '30,14,7,1,0' };
    const enrich = (truck) => {
      const days = truck.next_due_date ? Math.round((Date.parse(truck.next_due_date + 'T00:00:00Z') - Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')) / 86400000) : null;
      return { ...truck, days_remaining: days, safety_status: days === null ? 'no_date' : days < 0 ? 'overdue' : days <= settings.warning_days ? 'due_soon' : 'good', attachment_count: 0, latest_attachment: null };
    };
    if (apiPath === '/auth/verify') return json({ ok: true });
    if (apiPath === '/auth/logout') return json({ ok: true });
    if (apiPath === '/settings' && method === 'GET') return json({ settings });
    if (apiPath === '/trucks' && method === 'GET') return json({ trucks: state.trucks.map(enrich), settings });
    if (apiPath === '/trucks' && method === 'POST') {
      const body = JSON.parse(init.body || '{}');
      const unit = String(body.unit_number || '').trim();
      if (!unit) return json({ error: 'unit_number is required' }, 400);
      const truck = { id: crypto.randomUUID(), unit_number: unit, vehicle_type: body.vehicle_type || 'Tractor', status: body.status || 'Active', notes: body.notes || '', next_due_date: body.next_due_date || '', last_inspection_date: body.last_inspection_date || '', interval_months: Number(body.interval_months || 12), ...body };
      state.trucks.push(truck);
      if (truck.last_inspection_date && truck.next_due_date) state.inspections.push({ id: crypto.randomUUID(), truck_id: truck.id, inspection_date: truck.last_inspection_date, expiration_date: truck.next_due_date, shop_name: truck.shop_name || '', sticker_number: truck.sticker_number || '', notes: '', created_at: new Date().toISOString() });
      save(state);
      return json({ truck: enrich(truck) }, 201);
    }
    const matchTruck = path.match(new RegExp('^/?trucks/([^/]+)$'));
    if (matchTruck && method === 'GET') {
      const truck = state.trucks.find(item => item.id === decodeURIComponent(matchTruck[1]));
      return truck ? json({ truck: enrich(truck) }) : json({ error: 'Truck not found' }, 404);
    }
    if (matchTruck && method === 'PUT') {
      const truck = state.trucks.find(item => item.id === decodeURIComponent(matchTruck[1]));
      if (!truck) return json({ error: 'Truck not found' }, 404);
      Object.assign(truck, JSON.parse(init.body || '{}'));
      save(state);
      return json({ truck: enrich(truck) });
    }
    if (matchTruck && method === 'DELETE') {
      const id = decodeURIComponent(matchTruck[1]);
      state.trucks = state.trucks.filter(item => item.id !== id);
      state.inspections = state.inspections.filter(item => item.truck_id !== id);
      save(state);
      return json({ ok: true });
    }
    const matchInspections = path.match(new RegExp('^/?trucks/([^/]+)/inspections$'));
    if (matchInspections) {
      const id = decodeURIComponent(matchInspections[1]);
      if (!state.trucks.some(item => item.id === id)) return json({ error: 'Truck not found' }, 404);
      if (method === 'GET') return json({ inspections: state.inspections.filter(item => item.truck_id === id).map(item => ({ ...item, attachments: [] })), unlinked_attachments: [] });
      if (method === 'POST') {
        let body = {};
        if (init.body instanceof FormData) body = Object.fromEntries(init.body.entries());
        else body = JSON.parse(init.body || '{}');
        if (body.file?.size) return json({ error: 'Certificates are not available in the demo.' }, 400);
        const inspection_date = String(body.inspection_date || new Date().toISOString().slice(0, 10));
        const expiration_date = String(body.expiration_date || '');
        if (!/^\u005cd{4}-\u005cd{2}-\u005cd{2}$/.test(inspection_date) || !/^\u005cd{4}-\u005cd{2}-\u005cd{2}$/.test(expiration_date) || expiration_date < inspection_date) return json({ error: 'Enter valid inspection and expiry dates.' }, 400);
        const inspection = { id: crypto.randomUUID(), truck_id: id, inspection_date, expiration_date, shop_name: String(body.shop_name || ''), sticker_number: String(body.sticker_number || ''), notes: String(body.notes || ''), created_at: new Date().toISOString() };
        state.inspections.push(inspection);
        const truck = state.trucks.find(item => item.id === id);
        truck.last_inspection_date = inspection_date;
        truck.next_due_date = expiration_date;
        if (body.shop_name) truck.shop_name = String(body.shop_name);
        if (body.sticker_number) truck.sticker_number = String(body.sticker_number);
        save(state);
        return json({ ok: true, inspection_id: inspection.id, attachment: null }, 201);
      }
    }
    if (apiPath === '/settings' && method === 'PUT') return json({ error: 'Settings are not available in the demo.' }, 403);
    if (apiPath.startsWith('/attachments/')) return json({ error: 'Certificates are not available in the demo.' }, 403);
    if (apiPath === '/notifications/test') return json({ error: 'Notifications are not available in the demo.' }, 403);
    if (apiPath === '/vin/decode' || apiPath.startsWith('/push/') || apiPath === '/backup/restore' || apiPath === '/backup' || apiPath === '/calendar.ics') return json({ error: 'This feature is not available in the demo.' }, 403);
    return json({ error: 'Not found' }, 404);
  };
})();
`;
