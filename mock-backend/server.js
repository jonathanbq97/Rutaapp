const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// "Base de datos" en memoria: se borra cada vez que reinicias el servidor
const users = [
  {
    id: 2,
    name: 'Juan Pérez',
    email: 'cliente@uber.com',
    phone: '3001234567',
    password: 'cliente123',
    role: 'client',
    status: 'active',
  },
];

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(422).json({
      success: false,
      message: 'El login y la contraseña son obligatorios',
    });
  }

  const user = users.find(
    (u) => (u.email === login || u.phone === login) && u.password === password
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Credenciales inválidas',
    });
  }

  const { password: _, ...userWithoutPassword } = user;

  res.status(200).json({
    success: true,
    message: 'Inicio de sesión exitoso',
    access_token: 'token-falso-' + user.id,
    token_type: 'bearer',
    expires_in: 3600,
    user: userWithoutPassword,
  });
});

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, password, role } = req.body;

  // Validaciones: si algo falla, respondemos 422 con los errores por campo
  const errors = {};
  if (!name) errors.name = ['El nombre es obligatorio'];
  if (!email) errors.email = ['El correo es obligatorio'];
  if (!phone) errors.phone = ['El teléfono es obligatorio'];
  if (!password || password.length < 8) {
    errors.password = ['La contraseña debe tener al menos 8 caracteres'];
  }
  if (email && users.some((u) => u.email === email)) {
    errors.email = ['Este correo ya está registrado'];
  }
  if (phone && users.some((u) => u.phone === phone)) {
    errors.phone = ['Este teléfono ya está registrado'];
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      message: 'Error de validación',
      errors,
    });
  }

  const newUser = {
    id: users.length + 10,
    name,
    email,
    phone,
    password,
    role: role || 'client',
    status: 'active',
  };
  users.push(newUser);

  const { password: _, ...userWithoutPassword } = newUser;

  res.status(201).json({
    success: true,
    message: 'Usuario registrado exitosamente',
    access_token: 'token-falso-' + newUser.id,
    token_type: 'bearer',
    expires_in: 3600,
    user: userWithoutPassword,
  });
});

// GET /api/auth/me
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token no proporcionado',
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const userId = parseInt(token.replace('token-falso-', ''), 10);
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
    });
  }

  const { password: _, ...userWithoutPassword } = user;

  res.status(200).json({
    success: true,
    user: userWithoutPassword,
  });
});

// ---------- TARIFAS ----------
const activeFare = {
  id: 1,
  name: 'Tarifa Estándar Urbana',
  base_fare: 3800,
  price_per_km: 1250,
  price_per_minute: 250,
  minimum_fare: 6500,
  surge_multiplier: 1.0,
  active: true,
};

// Distancia en km entre dos coordenadas (fórmula de Haversine)
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // radio de la Tierra en km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/fares/active (público)
app.get('/api/fares/active', (req, res) => {
  res.status(200).json({ success: true, fare: activeFare });
});

// POST /api/client/estimate-fare
app.post('/api/client/estimate-fare', (req, res) => {
  // 1. Verificar token
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token no proporcionado' });
  }
  const userId = parseInt(authHeader.replace('Bearer token-falso-', ''), 10);
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }

  // 2. Validar coordenadas
  const { origin_latitude, origin_longitude, destination_latitude, destination_longitude } = req.body;
  const errors = {};
  const check = (value, min, max, field, label) => {
    if (typeof value !== 'number' || value < min || value > max) {
      errors[field] = [`${label} no es válida`];
    }
  };
  check(origin_latitude, -90, 90, 'origin_latitude', 'La latitud de origen');
  check(origin_longitude, -180, 180, 'origin_longitude', 'La longitud de origen');
  check(destination_latitude, -90, 90, 'destination_latitude', 'La latitud de destino');
  check(destination_longitude, -180, 180, 'destination_longitude', 'La longitud de destino');

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ success: false, message: 'Error de validación', errors });
  }

  // 3. Calcular
  const distance = haversineKm(origin_latitude, origin_longitude, destination_latitude, destination_longitude);
  const distanceKm = Math.round(distance * 100) / 100;
  const durationMin = Math.max(1, Math.ceil((distance / 20) * 60)); // velocidad promedio 20 km/h

  let fare =
    activeFare.base_fare +
    distanceKm * activeFare.price_per_km +
    durationMin * activeFare.price_per_minute;
  fare = fare * activeFare.surge_multiplier;
  const estimatedFare = Math.max(Math.round(fare), activeFare.minimum_fare);

  res.status(200).json({
    success: true,
    estimate: {
      distance_km: distanceKm,
      duration_min: durationMin,
      estimated_fare: estimatedFare,
      currency: 'COP',
      fare_breakdown: {
        base_fare: activeFare.base_fare,
        price_per_km: activeFare.price_per_km,
        price_per_minute: activeFare.price_per_minute,
        minimum_fare: activeFare.minimum_fare,
        surge_multiplier: activeFare.surge_multiplier,
      },
    },
  });
});

app.listen(8000, () => {
  console.log('Backend falso corriendo en http://localhost:8000');
});
