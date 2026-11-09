// =====================================================================
// RutaApp - Backend FALSO (mock) que imita la API del profesor
// Módulos: auth, tarifas, client, driver y admin. Datos en memoria:
// al reiniciar el servidor todo vuelve al estado inicial.
//
// Los endpoints marcados "EXTRA" NO están en la documentación del
// profesor: se inventaron para poder armar las pantallas. Hay que
// confirmar en clase si el backend real los tiene.
// =====================================================================
const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

// Registro en consola de cada petición
app.use((req, res, next) => {
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode}`));
  next();
});

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
const nowIso = () => new Date().toISOString();
const round2 = (n) => Math.round(n * 100) / 100;
const isNum = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const ACTIVE = ['requested', 'assigned', 'driver_arrived', 'in_progress'];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function paginate(list, req, perPage = 10) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const per = Math.min(50, parseInt(req.query.per_page, 10) || perPage);
  const total = list.length;
  return {
    data: list.slice((page - 1) * per, page * per),
    current_page: page,
    last_page: Math.max(1, Math.ceil(total / per)),
    per_page: per,
    total,
  };
}

function checkPoint(body, errors, prefix, label) {
  if (!isNum(body[prefix + '_latitude'], -90, 90)) {
    errors[prefix + '_latitude'] = [`La latitud de ${label} no es válida`];
  }
  if (!isNum(body[prefix + '_longitude'], -180, 180)) {
    errors[prefix + '_longitude'] = [`La longitud de ${label} no es válida`];
  }
}

// ---------------------------------------------------------------------
// Datos iniciales
// ---------------------------------------------------------------------
const users = [
  { id: 1, name: 'Administrador RutaApp', email: 'admin@uber.com', phone: '3000000001', password: 'admin123', role: 'admin', status: 'active' },
  { id: 2, name: 'Juan Pérez', email: 'cliente@uber.com', phone: '3001234567', password: 'cliente123', role: 'client', status: 'active' },
  { id: 3, name: 'Carlos Rodríguez', email: 'conductor@uber.com', phone: '3119876543', password: 'conductor123', role: 'driver', status: 'active' },
  { id: 4, name: 'Laura Martínez', email: 'laura@uber.com', phone: '3127654321', password: 'conductor123', role: 'driver', status: 'active' },
  { id: 5, name: 'Andrés Torres (Pendiente)', email: 'andres@uber.com', phone: '3138765432', password: 'conductor123', role: 'driver', status: 'active' },
  { id: 6, name: 'María Gómez', email: 'maria@uber.com', phone: '3142223344', password: 'cliente123', role: 'client', status: 'active' },
];
let nextUserId = 10;

const drivers = [
  { id: 1, user_id: 3, license_number: 'LC-77123-CO', approval_status: 'approved', availability_status: 'unavailable', rating_average: 4.95, admin_notes: '' },
  { id: 2, user_id: 4, license_number: 'LC-55231-CO', approval_status: 'approved', availability_status: 'unavailable', rating_average: 4.8, admin_notes: '' },
  { id: 3, user_id: 5, license_number: 'LC-11928-C', approval_status: 'pending', availability_status: 'unavailable', rating_average: 5.0, admin_notes: '' },
];
let nextDriverId = 10;

const vehicles = [
  { id: 1, driver_id: 1, plate: 'UBR-123', brand: 'Chevrolet', model: 'Onix Turbo', year: 2023, color: 'Gris Plata', capacity: 4 },
  { id: 2, driver_id: 2, plate: 'HJK-987', brand: 'Mazda', model: 'Mazda 3', year: 2024, color: 'Rojo Metálico', capacity: 4 },
  { id: 3, driver_id: 3, plate: 'NEW-456', brand: 'Kia', model: 'Rio', year: 2024, color: 'Blanco', capacity: 4 },
];
let nextVehicleId = 10;

const fares = [
  { id: 1, name: 'Tarifa Estándar Urbana', base_fare: 3800, price_per_km: 1250, price_per_minute: 250, minimum_fare: 6500, surge_multiplier: 1.0, active: true },
];
let nextFareId = 2;
const activeFare = () => fares.find((f) => f.active) || fares[0];

// Solicitudes y viajes comparten el mismo contador de ids (como en la
// documentación: solicitud 2 -> viaje 3), así /client/cancel/{id} no se confunde.
let nextId = 10;
const newId = () => nextId++;

const rideRequests = [
  { id: 5, client_id: 2, origin_name: 'Parque Santander', origin_latitude: 2.9273, origin_longitude: -75.2893, destination_name: 'Terminal de Transportes', destination_latitude: 2.9407, destination_longitude: -75.2897, estimated_distance_km: 1.5, estimated_duration_min: 5, estimated_fare: 6500, status: 'completed', created_at: '2026-10-20T18:40:00.000Z' },
  { id: 6, client_id: 2, origin_name: 'Universidad Surcolombiana', origin_latitude: 2.9422, origin_longitude: -75.2878, destination_name: 'Malecón del Río Magdalena', destination_latitude: 2.9355, destination_longitude: -75.2748, estimated_distance_km: 1.6, estimated_duration_min: 5, estimated_fare: 6500, status: 'completed', created_at: '2026-10-21T15:10:00.000Z' },
];

const trips = [
  { id: 1, request_id: 5, client_id: 2, driver_id: 1, status: 'completed', estimated_fare: 6500, final_fare: 9300, origin_name: 'Parque Santander', origin_latitude: 2.9273, origin_longitude: -75.2893, destination_name: 'Terminal de Transportes', destination_latitude: 2.9407, destination_longitude: -75.2897, distance_travelled_km: 5.4, duration_travelled_min: 18, created_at: '2026-10-20T18:45:00.000Z', driver_arrived_at: '2026-10-20T18:50:00.000Z', started_at: '2026-10-20T18:52:00.000Z', completed_at: '2026-10-20T19:00:00.000Z', cancelled_at: null, cancel_reason: null },
  { id: 2, request_id: 6, client_id: 2, driver_id: 2, status: 'completed', estimated_fare: 6500, final_fare: 6500, origin_name: 'Universidad Surcolombiana', origin_latitude: 2.9422, origin_longitude: -75.2878, destination_name: 'Malecón del Río Magdalena', destination_latitude: 2.9355, destination_longitude: -75.2748, distance_travelled_km: 1.9, duration_travelled_min: 7, created_at: '2026-10-21T15:12:00.000Z', driver_arrived_at: '2026-10-21T15:17:00.000Z', started_at: '2026-10-21T15:18:00.000Z', completed_at: '2026-10-21T15:26:00.000Z', cancelled_at: null, cancel_reason: null },
];

const ratings = [
  { id: 1, trip_id: 1, client_id: 2, driver_id: 1, score: 5, comment: 'Conducción impecable y vehículo muy limpio.', has_incident: false, created_at: '2026-10-20T19:05:00.000Z' },
];
let nextRatingId = 2;

const incidents = [
  { id: 1, trip_id: 2, client_id: 2, driver_id: 2, description: 'El conductor tomó una ruta más larga de lo necesario.', created_at: '2026-10-21T15:30:00.000Z' },
];
let nextIncidentId = 2;

const driverLocations = {}; // driver_id -> última ubicación
const auditLogs = [];
let nextAuditId = 1;
const revoked = new Set(); // tokens invalidados con logout

function audit(user, action, entity, entityId, detail) {
  auditLogs.unshift({
    id: nextAuditId++,
    user_id: user ? user.id : null,
    user_name: user ? user.name : 'Sistema',
    action,
    entity,
    entity_id: entityId ?? null,
    detail: detail || '',
    created_at: nowIso(),
  });
  if (auditLogs.length > 500) auditLogs.pop();
}

// ---------------------------------------------------------------------
// Ayudas de modelo
// ---------------------------------------------------------------------
const userById = (id) => users.find((u) => u.id === id);
const driverOf = (user) => drivers.find((d) => d.user_id === user.id);
const vehicleOf = (driver) => vehicles.find((v) => v.driver_id === driver.id);
const publicUser = (u) => {
  const { password, ...rest } = u;
  return rest;
};

function issueToken(user) {
  return `token-falso-${user.id}-${Math.random().toString(36).slice(2, 8)}`;
}

function computeFare(distanceKm, durationMin) {
  const f = activeFare();
  const raw = (f.base_fare + distanceKm * f.price_per_km + durationMin * f.price_per_minute) * f.surge_multiplier;
  return Math.max(Math.round(raw), f.minimum_fare);
}

function estimateTrip(oLat, oLng, dLat, dLng) {
  const dist = haversineKm(oLat, oLng, dLat, dLng);
  const distanceKm = round2(dist);
  const durationMin = Math.max(1, Math.ceil((dist / 20) * 60)); // 20 km/h promedio
  return { distanceKm, durationMin, fare: computeFare(distanceKm, durationMin) };
}

// Viaje con todos los datos relacionados (cliente, conductor, vehículo, calificación)
function tripView(t) {
  const d = drivers.find((x) => x.id === t.driver_id);
  const du = d ? userById(d.user_id) : null;
  const v = d ? vehicleOf(d) : null;
  const r = ratings.find((x) => x.trip_id === t.id);
  const c = userById(t.client_id);
  return {
    id: t.id,
    request_id: t.request_id,
    client_id: t.client_id,
    driver_id: t.driver_id,
    status: t.status,
    estimated_fare: t.estimated_fare,
    final_fare: t.final_fare,
    origin_name: t.origin_name,
    origin_latitude: t.origin_latitude,
    origin_longitude: t.origin_longitude,
    destination_name: t.destination_name,
    destination_latitude: t.destination_latitude,
    destination_longitude: t.destination_longitude,
    distance_travelled_km: t.distance_travelled_km,
    duration_travelled_min: t.duration_travelled_min,
    created_at: t.created_at,
    driver_arrived_at: t.driver_arrived_at,
    started_at: t.started_at,
    completed_at: t.completed_at,
    cancelled_at: t.cancelled_at,
    cancel_reason: t.cancel_reason,
    client: c ? { id: c.id, name: c.name, phone: c.phone } : null,
    driver: d ? { id: d.id, rating_average: d.rating_average, user: { name: du.name, phone: du.phone } } : null,
    vehicle: v ? { plate: v.plate, brand: v.brand, model: v.model, color: v.color } : null,
    rating: r ? { score: r.score, comment: r.comment } : null,
  };
}

// Solicitud cancelada antes de tener conductor, con forma de "viaje" para el historial
function requestAsHistory(r) {
  const c = userById(r.client_id);
  return {
    id: r.id,
    request_id: r.id,
    client_id: r.client_id,
    driver_id: null,
    status: 'cancelled',
    estimated_fare: r.estimated_fare,
    final_fare: null,
    origin_name: r.origin_name,
    origin_latitude: r.origin_latitude,
    origin_longitude: r.origin_longitude,
    destination_name: r.destination_name,
    destination_latitude: r.destination_latitude,
    destination_longitude: r.destination_longitude,
    distance_travelled_km: null,
    duration_travelled_min: null,
    created_at: r.created_at,
    cancelled_at: r.cancelled_at || null,
    cancel_reason: r.cancel_reason || null,
    client: c ? { id: c.id, name: c.name, phone: c.phone } : null,
    driver: null,
    vehicle: null,
    rating: null,
  };
}

function syncRequest(t) {
  const r = rideRequests.find((x) => x.id === t.request_id);
  if (r) r.status = t.status;
}

// ---------------------------------------------------------------------
// Autenticación y roles
// ---------------------------------------------------------------------
function readToken(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return { error: 'Token no proporcionado' };
  const token = h.slice(7).trim();
  const m = /^token-falso-(\d+)(-[a-z0-9]+)?$/.exec(token);
  if (!m || revoked.has(token)) return { error: 'Token inválido o expirado' };
  const user = userById(parseInt(m[1], 10));
  if (!user) return { error: 'Token inválido o expirado' };
  return { user, token };
}

const auth = (req, res, next) => {
  const r = readToken(req);
  if (r.error) return res.status(401).json({ success: false, message: r.error });
  if (r.user.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Su cuenta está inactiva o suspendida.' });
  }
  req.user = r.user;
  req.token = r.token;
  next();
};

const role = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ success: false, message: 'No tiene permisos para acceder a este recurso.' });

// Equivale al middleware driver.approved de la documentación
function driverApproved(req, res, next) {
  const d = driverOf(req.user);
  if (!d) return res.status(403).json({ success: false, message: 'No existe un perfil de conductor.' });
  if (d.approval_status !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Su cuenta de conductor aún no está aprobada.',
      approval_status: d.approval_status,
    });
  }
  req.driver = d;
  next();
}

// ---------------------------------------------------------------------
// /api/auth
// ---------------------------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const b = req.body || {};
  const { name, email, phone, password } = b;
  const userRole = b.role || 'client';
  const errors = {};

  if (!name) errors.name = ['El nombre es obligatorio'];
  if (!email) errors.email = ['El correo es obligatorio'];
  if (!phone) errors.phone = ['El teléfono es obligatorio'];
  if (!password || String(password).length < 8) {
    errors.password = ['La contraseña debe tener al menos 8 caracteres'];
  }
  if (!['client', 'driver'].includes(userRole)) errors.role = ['El rol debe ser client o driver'];
  if (email && users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
    errors.email = ['Este correo ya está registrado'];
  }
  if (phone && users.some((u) => u.phone === String(phone))) {
    errors.phone = ['Este teléfono ya está registrado'];
  }

  if (userRole === 'driver') {
    if (!b.license_number) errors.license_number = ['El número de licencia es obligatorio'];
    else if (drivers.some((d) => d.license_number === b.license_number)) {
      errors.license_number = ['Esta licencia ya está registrada'];
    }
    if (!b.plate) errors.plate = ['La placa es obligatoria'];
    else if (vehicles.some((v) => v.plate.toUpperCase() === String(b.plate).toUpperCase())) {
      errors.plate = ['Esta placa ya está registrada'];
    }
    if (!b.brand) errors.brand = ['La marca es obligatoria'];
    if (!b.model) errors.model = ['El modelo es obligatorio'];
    const year = Number(b.year);
    if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear() + 1) {
      errors.year = ['El año del vehículo no es válido'];
    }
    const capacity = Number(b.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10) {
      errors.capacity = ['La capacidad debe estar entre 1 y 10'];
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ success: false, message: 'Error de validación', errors });
  }

  const user = {
    id: nextUserId++,
    name,
    email: String(email).toLowerCase(),
    phone: String(phone),
    password,
    role: userRole,
    status: 'active',
  };
  users.push(user);

  if (userRole === 'driver') {
    const driver = {
      id: nextDriverId++,
      user_id: user.id,
      license_number: b.license_number,
      approval_status: 'pending',
      availability_status: 'unavailable',
      rating_average: 5.0,
      admin_notes: '',
    };
    drivers.push(driver);
    vehicles.push({
      id: nextVehicleId++,
      driver_id: driver.id,
      plate: String(b.plate).toUpperCase(),
      brand: b.brand,
      model: b.model,
      year: Number(b.year),
      color: b.color || '',
      capacity: Number(b.capacity),
    });
  }

  audit(user, 'register', 'user', user.id, `Registro como ${userRole}`);
  res.status(201).json({
    success: true,
    message: 'Usuario registrado exitosamente',
    access_token: issueToken(user),
    token_type: 'bearer',
    expires_in: 3600,
    user: publicUser(user),
  });
});

app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) {
    return res.status(422).json({
      success: false,
      message: 'Error de validación',
      errors: { login: ['El login es obligatorio'], password: ['La contraseña es obligatoria'] },
    });
  }
  const user = users.find(
    (u) => (u.email.toLowerCase() === String(login).toLowerCase() || u.phone === String(login)) && u.password === password
  );
  if (!user) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  if (user.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Su cuenta está inactiva o suspendida.' });
  }
  audit(user, 'login', 'user', user.id, 'Inicio de sesión');
  res.status(200).json({
    success: true,
    message: 'Inicio de sesión exitoso',
    access_token: issueToken(user),
    token_type: 'bearer',
    expires_in: 3600,
    user: publicUser(user),
  });
});

app.get('/api/auth/me', auth, (req, res) => {
  const out = publicUser(req.user);
  // EXTRA: para conductores se agregan sus datos de conductor y vehículo
  if (req.user.role === 'driver') {
    const d = driverOf(req.user);
    if (d) {
      out.driver = {
        id: d.id,
        license_number: d.license_number,
        approval_status: d.approval_status,
        availability_status: d.availability_status,
        rating_average: d.rating_average,
        admin_notes: d.admin_notes,
      };
      out.vehicle = vehicleOf(d) || null;
    }
  }
  res.status(200).json({ success: true, user: out });
});

app.post('/api/auth/logout', auth, (req, res) => {
  revoked.add(req.token);
  audit(req.user, 'logout', 'user', req.user.id, 'Cierre de sesión');
  res.status(200).json({ success: true, message: 'Sesión cerrada exitosamente' });
});

// La documentación no dice qué responde si el correo no existe (aquí 404)
app.post('/api/auth/forgot-password', (req, res) => {
  const { email, new_password } = req.body || {};
  const errors = {};
  if (!email) errors.email = ['El correo es obligatorio'];
  if (!new_password || String(new_password).length < 8) {
    errors.new_password = ['La contraseña debe tener al menos 8 caracteres'];
  }
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ success: false, message: 'Error de validación', errors });
  }
  const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) return res.status(404).json({ success: false, message: 'No existe una cuenta con ese correo' });
  user.password = new_password;
  audit(user, 'password_reset', 'user', user.id, 'Contraseña restablecida');
  res.status(200).json({
    success: true,
    message: 'Contraseña restablecida exitosamente. Ya puede iniciar sesión con su nueva clave.',
  });
});

// ---------------------------------------------------------------------
// Tarifas públicas
// ---------------------------------------------------------------------
app.get('/api/fares/active', (req, res) => {
  res.status(200).json({ success: true, fare: activeFare() });
});

// ---------------------------------------------------------------------
// /api/client
// ---------------------------------------------------------------------
const client = express.Router();
client.use(auth, role('client'));

client.post('/estimate-fare', (req, res) => {
  const b = req.body || {};
  const errors = {};
  checkPoint(b, errors, 'origin', 'origen');
  checkPoint(b, errors, 'destination', 'destino');
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ success: false, message: 'Error de validación', errors });
  }
  const e = estimateTrip(b.origin_latitude, b.origin_longitude, b.destination_latitude, b.destination_longitude);
  const f = activeFare();
  res.status(200).json({
    success: true,
    estimate: {
      distance_km: e.distanceKm,
      duration_min: e.durationMin,
      estimated_fare: e.fare,
      currency: 'COP',
      fare_breakdown: {
        base_fare: f.base_fare,
        price_per_km: f.price_per_km,
        price_per_minute: f.price_per_minute,
        minimum_fare: f.minimum_fare,
        surge_multiplier: f.surge_multiplier,
      },
    },
  });
});

client.post('/ride-requests', (req, res) => {
  const b = req.body || {};
  const errors = {};
  if (!b.origin_name) errors.origin_name = ['El nombre del origen es obligatorio'];
  if (!b.destination_name) errors.destination_name = ['El nombre del destino es obligatorio'];
  checkPoint(b, errors, 'origin', 'origen');
  checkPoint(b, errors, 'destination', 'destino');
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ success: false, message: 'Error de validación', errors });
  }

  // Regla de negocio: una sola solicitud o viaje activo por cliente
  const active = rideRequests.find((r) => r.client_id === req.user.id && ACTIVE.includes(r.status));
  if (active) {
    return res.status(400).json({
      success: false,
      message: 'Ya cuenta con una solicitud o viaje activo en curso.',
      active_request_id: active.id,
    });
  }

  const e = estimateTrip(b.origin_latitude, b.origin_longitude, b.destination_latitude, b.destination_longitude);
  const rideRequest = {
    id: newId(),
    client_id: req.user.id,
    origin_name: b.origin_name,
    origin_latitude: b.origin_latitude,
    origin_longitude: b.origin_longitude,
    destination_name: b.destination_name,
    destination_latitude: b.destination_latitude,
    destination_longitude: b.destination_longitude,
    estimated_distance_km: e.distanceKm,
    estimated_duration_min: e.durationMin,
    estimated_fare: e.fare,
    status: 'requested',
    created_at: nowIso(),
  };
  rideRequests.push(rideRequest);
  audit(req.user, 'ride_request', 'ride_request', rideRequest.id, `${b.origin_name} -> ${b.destination_name}`);

  res.status(201).json({
    success: true,
    message: 'Solicitud de viaje creada exitosamente. Buscando conductores disponibles...',
    ride_request: rideRequest,
  });
});

client.get('/active', (req, res) => {
  const r = rideRequests.find((x) => x.client_id === req.user.id && ACTIVE.includes(x.status));
  if (!r) return res.status(200).json({ success: true, has_active: false });

  if (r.status === 'requested') {
    return res.status(200).json({ success: true, has_active: true, type: 'request', data: r });
  }

  const t = trips.find((x) => x.request_id === r.id && ACTIVE.includes(x.status));
  if (!t) return res.status(200).json({ success: true, has_active: false });

  const view = tripView(t);
  const loc = driverLocations[t.driver_id];
  if (view.driver) {
    view.driver.latest_location = loc ? { latitude: loc.latitude, longitude: loc.longitude } : null;
  }
  res.status(200).json({ success: true, has_active: true, type: 'trip', data: view });
});

// El id puede ser el de la solicitud (type "request") o el del viaje (type "trip")
client.post('/cancel/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const reason = (req.body && req.body.reason) || 'Cancelado por el cliente';
  const t = trips.find((x) => x.id === id && x.client_id === req.user.id);
  const r = rideRequests.find((x) => x.id === id && x.client_id === req.user.id);

  if (!t && !r) return res.status(404).json({ success: false, message: 'Solicitud o viaje no encontrado.' });

  if (t) {
    if (t.status === 'in_progress') {
      return res.status(400).json({ success: false, message: 'No es posible cancelar un viaje que ya inició su recorrido.' });
    }
    if (!['assigned', 'driver_arrived'].includes(t.status)) {
      return res.status(400).json({ success: false, message: 'Este viaje ya no se puede cancelar.' });
    }
    t.status = 'cancelled';
    t.cancelled_at = nowIso();
    t.cancel_reason = reason;
    syncRequest(t);
    const d = drivers.find((x) => x.id === t.driver_id);
    if (d) d.availability_status = 'available';
  } else {
    if (r.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Esta solicitud ya no se puede cancelar.' });
    }
    r.status = 'cancelled';
    r.cancelled_at = nowIso();
    r.cancel_reason = reason;
  }

  audit(req.user, 'cancel', t ? 'trip' : 'ride_request', id, reason);
  res.status(200).json({ success: true, message: 'Solicitud cancelada exitosamente' });
});

// Historial paginado. Filtro opcional: ?status=completed|cancelled|assigned...
client.get('/trips', (req, res) => {
  const trs = trips.filter((t) => t.client_id === req.user.id).map(tripView);
  const orphans = rideRequests
    .filter((r) => r.client_id === req.user.id && r.status === 'cancelled' && !trips.some((t) => t.request_id === r.id))
    .map(requestAsHistory);
  let list = [...trs, ...orphans].sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (req.query.status) list = list.filter((t) => t.status === req.query.status);
  res.status(200).json({ success: true, trips: paginate(list, req) });
});

client.post('/trips/:id/rating', (req, res) => {
  const t = trips.find((x) => x.id === parseInt(req.params.id, 10) && x.client_id === req.user.id);
  if (!t) return res.status(404).json({ success: false, message: 'Viaje no encontrado.' });
  if (t.status !== 'completed') {
    return res.status(400).json({ success: false, message: 'Solo puede calificar viajes finalizados.' });
  }

  const { score, comment, has_incident } = req.body || {};
  const s = Number(score);
  if (!Number.isInteger(s) || s < 1 || s > 5) {
    return res.status(422).json({
      success: false,
      message: 'Error de validación',
      errors: { score: ['La calificación debe ser un número entero entre 1 y 5'] },
    });
  }
  if (ratings.some((r) => r.trip_id === t.id)) {
    return res.status(400).json({ success: false, message: 'Este viaje ya fue calificado.' });
  }

  const rating = {
    id: nextRatingId++,
    trip_id: t.id,
    client_id: req.user.id,
    driver_id: t.driver_id,
    score: s,
    comment: comment || '',
    has_incident: !!has_incident,
    created_at: nowIso(),
  };
  ratings.push(rating);

  // Recalcula el promedio del conductor
  const mine = ratings.filter((r) => r.driver_id === t.driver_id);
  const d = drivers.find((x) => x.id === t.driver_id);
  if (d) d.rating_average = round2(mine.reduce((a, r) => a + r.score, 0) / mine.length);

  if (rating.has_incident) {
    incidents.push({
      id: nextIncidentId++,
      trip_id: t.id,
      client_id: req.user.id,
      driver_id: t.driver_id,
      description: comment || 'Incidencia reportada por el cliente',
      created_at: nowIso(),
    });
  }

  res.status(201).json({
    success: true,
    message: 'Calificación enviada exitosamente. ¡Gracias por sus comentarios!',
    rating: { id: rating.id, trip_id: rating.trip_id, score: rating.score, comment: rating.comment },
  });
});

app.use('/api/client', client);

// ---------------------------------------------------------------------
// /api/driver
// ---------------------------------------------------------------------
const driver = express.Router();
driver.use(auth, role('driver'));

driver.put('/availability', (req, res) => {
  const d = driverOf(req.user);
  if (!d) return res.status(403).json({ success: false, message: 'No existe un perfil de conductor.' });
  const status = (req.body || {}).status;
  if (!['available', 'unavailable'].includes(status)) {
    return res.status(422).json({
      success: false,
      message: 'Error de validación',
      errors: { status: ['El estado debe ser available o unavailable'] },
    });
  }
  if (d.approval_status !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Solo conductores aprobados pueden activar su disponibilidad.',
      approval_status: d.approval_status,
    });
  }
  if (d.availability_status === 'busy') {
    return res.status(400).json({ success: false, message: 'Tienes un servicio en curso.' });
  }
  d.availability_status = status;
  res.status(200).json({
    success: true,
    message: `Disponibilidad cambiada a: ${status}`,
    availability_status: status,
  });
});

driver.get('/ride-requests', driverApproved, (req, res) => {
  const list = rideRequests
    .filter((r) => r.status === 'requested')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r) => {
      const c = userById(r.client_id);
      return { ...r, client: c ? { name: c.name, phone: c.phone } : null };
    });
  res.status(200).json({ success: true, requests: list });
});

driver.post('/ride-requests/:id/accept', driverApproved, (req, res) => {
  const r = rideRequests.find((x) => x.id === parseInt(req.params.id, 10));
  if (!r) return res.status(404).json({ success: false, message: 'La solicitud no existe.' });

  if (r.status !== 'requested') {
    return res.status(409).json({
      success: false,
      message: 'Lo sentimos, este servicio ya fue tomado por otro conductor o fue cancelado.',
    });
  }
  if (req.driver.availability_status === 'busy') {
    return res.status(400).json({ success: false, message: 'Ya tienes un servicio en curso.' });
  }
  if (req.driver.availability_status !== 'available') {
    return res.status(400).json({ success: false, message: 'Debes estar disponible para aceptar servicios.' });
  }

  const t = {
    id: newId(),
    request_id: r.id,
    client_id: r.client_id,
    driver_id: req.driver.id,
    status: 'assigned',
    estimated_fare: r.estimated_fare,
    final_fare: null,
    origin_name: r.origin_name,
    origin_latitude: r.origin_latitude,
    origin_longitude: r.origin_longitude,
    destination_name: r.destination_name,
    destination_latitude: r.destination_latitude,
    destination_longitude: r.destination_longitude,
    distance_travelled_km: null,
    duration_travelled_min: null,
    created_at: nowIso(),
    driver_arrived_at: null,
    started_at: null,
    completed_at: null,
    cancelled_at: null,
    cancel_reason: null,
  };
  trips.push(t);
  r.status = 'assigned';
  req.driver.availability_status = 'busy';
  audit(req.user, 'accept', 'trip', t.id, `Solicitud ${r.id}`);

  res.status(200).json({ success: true, message: 'Servicio aceptado exitosamente', trip: tripView(t) });
});

// Busca un viaje del conductor autenticado; responde 404 si no existe
function ownTrip(req, res) {
  const t = trips.find((x) => x.id === parseInt(req.params.id, 10) && x.driver_id === req.driver.id);
  if (!t) res.status(404).json({ success: false, message: 'Viaje no encontrado.' });
  return t;
}

driver.post('/trips/:id/arrive', driverApproved, (req, res) => {
  const t = ownTrip(req, res);
  if (!t) return;
  if (t.status !== 'assigned') {
    return res.status(400).json({ success: false, message: 'El viaje no está en un estado válido para registrar la llegada.' });
  }
  t.status = 'driver_arrived';
  t.driver_arrived_at = nowIso();
  syncRequest(t);
  res.status(200).json({
    success: true,
    message: 'Llegada registrada. El cliente ha sido notificado.',
    trip: { id: t.id, status: t.status, driver_arrived_at: t.driver_arrived_at },
  });
});

driver.post('/trips/:id/start', driverApproved, (req, res) => {
  const t = ownTrip(req, res);
  if (!t) return;
  if (t.status !== 'driver_arrived') {
    return res.status(400).json({ success: false, message: 'Primero debes registrar tu llegada al punto de recogida.' });
  }
  t.status = 'in_progress';
  t.started_at = nowIso();
  syncRequest(t);
  res.status(200).json({
    success: true,
    message: 'Viaje iniciado exitosamente',
    trip: { id: t.id, status: t.status, started_at: t.started_at },
  });
});

driver.post('/trips/:id/complete', driverApproved, (req, res) => {
  const t = ownTrip(req, res);
  if (!t) return;
  if (t.status !== 'in_progress') {
    return res.status(400).json({ success: false, message: 'El viaje no está en curso.' });
  }

  const b = req.body || {};
  const km = Number(b.actual_distance_km);
  const min = Number(b.actual_duration_min);
  const errors = {};
  if (!Number.isFinite(km) || km <= 0) errors.actual_distance_km = ['La distancia recorrida debe ser mayor a 0'];
  if (!Number.isFinite(min) || min <= 0) errors.actual_duration_min = ['La duración debe ser mayor a 0'];
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ success: false, message: 'Error de validación', errors });
  }

  t.status = 'completed';
  t.completed_at = nowIso();
  t.distance_travelled_km = round2(km);
  t.duration_travelled_min = Math.ceil(min);
  t.final_fare = computeFare(t.distance_travelled_km, t.duration_travelled_min);
  syncRequest(t);
  req.driver.availability_status = 'available';
  audit(req.user, 'complete', 'trip', t.id, `Tarifa final ${t.final_fare}`);

  res.status(200).json({
    success: true,
    message: 'Viaje finalizado con éxito. Tarifa definitiva calculada.',
    trip: {
      id: t.id,
      status: t.status,
      final_fare: t.final_fare,
      distance_travelled_km: t.distance_travelled_km,
      duration_travelled_min: t.duration_travelled_min,
      completed_at: t.completed_at,
    },
  });
});

driver.post('/location', driverApproved, (req, res) => {
  const b = req.body || {};
  const errors = {};
  if (!isNum(b.latitude, -90, 90)) errors.latitude = ['La latitud no es válida'];
  if (!isNum(b.longitude, -180, 180)) errors.longitude = ['La longitud no es válida'];
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ success: false, message: 'Error de validación', errors });
  }
  const loc = {
    driver_id: req.driver.id,
    latitude: b.latitude,
    longitude: b.longitude,
    heading: b.heading ?? null,
    speed: b.speed ?? null,
    trip_id: b.trip_id ?? null,
    recorded_at: nowIso(),
  };
  driverLocations[req.driver.id] = loc;
  res.status(200).json({
    success: true,
    location: { driver_id: loc.driver_id, latitude: loc.latitude, longitude: loc.longitude, recorded_at: loc.recorded_at },
  });
});

// --- EXTRA: la documentación no trae estos endpoints del conductor ---

// Viaje en curso del conductor (para retomarlo al recargar la pantalla)
driver.get('/active', driverApproved, (req, res) => {
  const t = trips.find((x) => x.driver_id === req.driver.id && ['assigned', 'driver_arrived', 'in_progress'].includes(x.status));
  if (!t) return res.status(200).json({ success: true, has_active: false });
  res.status(200).json({ success: true, has_active: true, trip: tripView(t) });
});

// Historial de servicios del conductor (filtro opcional ?status=)
driver.get('/trips', driverApproved, (req, res) => {
  let list = trips
    .filter((t) => t.driver_id === req.driver.id)
    .map(tripView)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (req.query.status) list = list.filter((t) => t.status === req.query.status);
  res.status(200).json({ success: true, trips: paginate(list, req) });
});

// Resumen de ingresos y servicios
driver.get('/summary', driverApproved, (req, res) => {
  const mine = trips.filter((t) => t.driver_id === req.driver.id);
  const done = mine.filter((t) => t.status === 'completed');
  res.status(200).json({
    success: true,
    summary: {
      services_completed: done.length,
      services_cancelled: mine.filter((t) => t.status === 'cancelled').length,
      total_income: done.reduce((a, t) => a + (t.final_fare || 0), 0),
      rating_average: req.driver.rating_average,
    },
  });
});

// Calificaciones recibidas
driver.get('/ratings', driverApproved, (req, res) => {
  const list = ratings
    .filter((r) => r.driver_id === req.driver.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => {
      const c = userById(r.client_id);
      return { id: r.id, trip_id: r.trip_id, score: r.score, comment: r.comment, created_at: r.created_at, client: c ? { name: c.name } : null };
    });
  res.status(200).json({ success: true, rating_average: req.driver.rating_average, ratings: list });
});

app.use('/api/driver', driver);

// ---------------------------------------------------------------------
// /api/admin
// ---------------------------------------------------------------------
const admin = express.Router();
admin.use(auth, role('admin'));

admin.get('/dashboard', (req, res) => {
  const completed = trips.filter((t) => t.status === 'completed');
  const byDate = (a, b) => b.created_at.localeCompare(a.created_at);
  res.status(200).json({
    success: true,
    stats: {
      total_clients: users.filter((u) => u.role === 'client').length,
      total_drivers: drivers.length,
      pending_drivers: drivers.filter((d) => d.approval_status === 'pending').length,
      approved_drivers: drivers.filter((d) => d.approval_status === 'approved').length,
      active_trips: trips.filter((t) => ['assigned', 'driver_arrived', 'in_progress'].includes(t.status)).length,
      completed_trips: completed.length,
      cancelled_trips: rideRequests.filter((r) => r.status === 'cancelled').length,
      pending_requests: rideRequests.filter((r) => r.status === 'requested').length,
      total_revenue: completed.reduce((a, t) => a + (t.final_fare || 0), 0),
    },
    recent_trips: [...trips].sort(byDate).slice(0, 5).map(tripView),
    recent_incidents: [...incidents].sort(byDate).slice(0, 5).map((i) => ({
      ...i,
      client: userById(i.client_id) ? { name: userById(i.client_id).name } : null,
    })),
  });
});

admin.get('/drivers', (req, res) => {
  let list = drivers;
  if (req.query.approval_status) list = list.filter((d) => d.approval_status === req.query.approval_status);
  res.status(200).json({
    success: true,
    drivers: list.map((d) => {
      const u = userById(d.user_id);
      return {
        id: d.id,
        license_number: d.license_number,
        approval_status: d.approval_status,
        availability_status: d.availability_status,
        rating_average: d.rating_average,
        admin_notes: d.admin_notes,
        user: { name: u.name, email: u.email, phone: u.phone },
        vehicles: vehicles
          .filter((v) => v.driver_id === d.id)
          .map((v) => ({ plate: v.plate, brand: v.brand, model: v.model, year: v.year, color: v.color, capacity: v.capacity })),
      };
    }),
  });
});

admin.patch('/drivers/:id/approval', (req, res) => {
  const d = drivers.find((x) => x.id === parseInt(req.params.id, 10));
  if (!d) return res.status(404).json({ success: false, message: 'Conductor no encontrado.' });

  const { approval_status, admin_notes } = req.body || {};
  if (!['approved', 'rejected', 'suspended'].includes(approval_status)) {
    return res.status(422).json({
      success: false,
      message: 'Error de validación',
      errors: { approval_status: ['El estado debe ser approved, rejected o suspended'] },
    });
  }
  d.approval_status = approval_status;
  if (admin_notes !== undefined) d.admin_notes = admin_notes;
  if (approval_status !== 'approved' && d.availability_status === 'available') {
    d.availability_status = 'unavailable';
  }
  audit(req.user, 'driver_approval', 'driver', d.id, `${approval_status}${admin_notes ? ': ' + admin_notes : ''}`);

  res.status(200).json({
    success: true,
    message: `Estado del conductor actualizado a: ${approval_status}`,
    driver: { id: d.id, approval_status: d.approval_status },
  });
});

admin.get('/fares', (req, res) => {
  res.status(200).json({ success: true, fares });
});

admin.post('/fares', (req, res) => {
  const b = req.body || {};
  const errors = {};
  if (!b.name) errors.name = ['El nombre es obligatorio'];
  ['base_fare', 'price_per_km', 'price_per_minute', 'minimum_fare'].forEach((k) => {
    if (typeof b[k] !== 'number' || b[k] < 0) errors[k] = ['Debe ser un número mayor o igual a 0'];
  });
  if (typeof b.surge_multiplier !== 'number' || b.surge_multiplier < 1) {
    errors.surge_multiplier = ['El multiplicador debe ser un número mayor o igual a 1'];
  }
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ success: false, message: 'Error de validación', errors });
  }

  const fare = {
    id: nextFareId++,
    name: b.name,
    base_fare: b.base_fare,
    price_per_km: b.price_per_km,
    price_per_minute: b.price_per_minute,
    minimum_fare: b.minimum_fare,
    surge_multiplier: b.surge_multiplier,
    active: !!b.active,
  };
  if (fare.active) fares.forEach((f) => (f.active = false)); // solo una tarifa activa
  fares.push(fare);
  audit(req.user, 'fare_create', 'fare', fare.id, fare.name);

  res.status(201).json({ success: true, message: 'Tarifa configurada exitosamente', fare });
});

// Filtros: ?status= ?driver_id= ?client_id= ?date=AAAA-MM-DD
admin.get('/trips', (req, res) => {
  let list = trips.map(tripView);
  const q = req.query;
  if (q.status) list = list.filter((t) => t.status === q.status);
  if (q.driver_id) list = list.filter((t) => t.driver_id === parseInt(q.driver_id, 10));
  if (q.client_id) list = list.filter((t) => t.client_id === parseInt(q.client_id, 10));
  if (q.date) list = list.filter((t) => t.created_at.slice(0, 10) === q.date);
  list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  res.status(200).json({ success: true, trips: paginate(list, req) });
});

admin.get('/reports', (req, res) => {
  const completed = trips.filter((t) => t.status === 'completed');
  const cancelled = rideRequests.filter((r) => r.status === 'cancelled').length;
  const totalRequests = rideRequests.length;

  const byDay = {};
  completed.forEach((t) => {
    const day = t.completed_at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + (t.final_fare || 0);
  });

  res.status(200).json({
    success: true,
    report: {
      total_revenue: completed.reduce((a, t) => a + (t.final_fare || 0), 0),
      completed_trips: completed.length,
      cancelled_trips: cancelled,
      cancellation_rate: totalRequests ? round2((cancelled / totalRequests) * 100) : 0,
      revenue_by_day: Object.keys(byDay).sort().map((day) => ({ date: day, revenue: byDay[day] })),
      drivers_performance: drivers.map((d) => {
        const mine = trips.filter((t) => t.driver_id === d.id);
        const done = mine.filter((t) => t.status === 'completed');
        return {
          driver_id: d.id,
          name: userById(d.user_id).name,
          services_completed: done.length,
          services_cancelled: mine.filter((t) => t.status === 'cancelled').length,
          revenue: done.reduce((a, t) => a + (t.final_fare || 0), 0),
          rating_average: d.rating_average,
        };
      }),
    },
  });
});

admin.get('/audit-logs', (req, res) => {
  res.status(200).json({ success: true, logs: paginate(auditLogs, req, 20) });
});

// --- EXTRA: la documentación no trae estos endpoints del administrador ---

admin.get('/clients', (req, res) => {
  const list = users
    .filter((u) => u.role === 'client')
    .map((u) => {
      const mine = trips.filter((t) => t.client_id === u.id);
      const done = mine.filter((t) => t.status === 'completed');
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        trips_count: mine.length,
        total_spent: done.reduce((a, t) => a + (t.final_fare || 0), 0),
      };
    });
  res.status(200).json({ success: true, clients: list });
});

admin.get('/vehicles', (req, res) => {
  const list = vehicles.map((v) => {
    const d = drivers.find((x) => x.id === v.driver_id);
    const u = d ? userById(d.user_id) : null;
    return { ...v, driver: d ? { id: d.id, name: u.name, approval_status: d.approval_status } : null };
  });
  res.status(200).json({ success: true, vehicles: list });
});

admin.get('/requests', (req, res) => {
  let list = [...rideRequests].sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (req.query.status) list = list.filter((r) => r.status === req.query.status);
  list = list.map((r) => {
    const c = userById(r.client_id);
    return { ...r, client: c ? { name: c.name, phone: c.phone } : null };
  });
  res.status(200).json({ success: true, requests: paginate(list, req) });
});

app.use('/api/admin', admin);

// ---------------------------------------------------------------------
// Errores y arranque
// ---------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, message: 'Error en la petición: ' + err.message });
});

const PORT = 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend falso corriendo en http://localhost:${PORT}`);
  Object.values(os.networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .forEach((n) => console.log(`  Desde otro dispositivo: http://${n.address}:${PORT}/api`));
  console.log('Usuarios de prueba:');
  console.log('  admin@uber.com / admin123');
  console.log('  cliente@uber.com / cliente123');
  console.log('  conductor@uber.com / conductor123  (aprobado)');
  console.log('  laura@uber.com / conductor123      (aprobada)');
  console.log('  andres@uber.com / conductor123     (pendiente de aprobación)');
});
