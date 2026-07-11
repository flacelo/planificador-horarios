const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  // API routes

  // Mock session store
  var sesionesPorUsuario = {};

  function getSesionesMock(email) {
    if (!email) return [];
    if (!sesionesPorUsuario[email]) {
      sesionesPorUsuario[email] = [
        { id: 's1', dispositivo: 'Laptop Windows', ubicacion: 'Chiclayo, PE', ultimaAct: new Date().toISOString(), actual: true },
        { id: 's2', dispositivo: 'Smartphone Android', ubicacion: 'Lima, PE', ultimaAct: new Date(Date.now() - 60000).toISOString(), actual: false },
      ];
    }
    return sesionesPorUsuario[email];
  }

  if (req.method === 'GET' && req.url.startsWith('/api/auth/sessions')) {
    var params = new URL(req.url, 'http://localhost').searchParams;
    var email = params.get('email') || '';
    var list = getSesionesMock(email);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, sesiones: list }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/auth/sessions/close-others') {
    let body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      try {
        var data = JSON.parse(body);
        var email = data.email || '';
        var sesiones = getSesionesMock(email);
        sesiones.forEach(function(s) { if (!s.actual) s.cerrada = true; });
        console.log('[SESSIONS] Sesiones cerradas para', email);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Sesiones cerradas en otros dispositivos' }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Solicitud inválida' }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/auth/recover') {
    let body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      try {
        var data = JSON.parse(body);
        var email = data.email || '';
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Correo inválido' }));
          return;
        }
        var token = crypto.randomBytes(24).toString('hex');
        var expira = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        console.log('[RECOVER] Email:', email, 'Token:', token, 'Expira:', expira);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Enlace enviado' }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Solicitud inválida' }));
      }
    });
    return;
  }

  // Admin API (protegida simulada)

  var usuariosAdmin = [
    { id: 1, nombre: 'Carlos López', correo: 'carlos@email.com', licencia: 'Vitalicia', estado: 'Activo', ultimoAcceso: '2026-07-10' },
    { id: 2, nombre: 'María García', correo: 'maria@email.com', licencia: 'Mensual', estado: 'Activo', ultimoAcceso: '2026-07-09' },
    { id: 3, nombre: 'José Ramos', correo: 'jose@email.com', licencia: 'Demo', estado: 'Pendiente', ultimoAcceso: '2026-07-08' },
    { id: 4, nombre: 'Ana Torres', correo: 'ana@email.com', licencia: 'Mensual', estado: 'Vencido', ultimoAcceso: '2026-06-15' },
    { id: 5, nombre: 'Luis Fernández', correo: 'luis@email.com', licencia: 'Demo', estado: 'Activo', ultimoAcceso: '2026-07-10' },
    { id: 6, nombre: 'Sofía Castillo', correo: 'sofia@email.com', licencia: 'Vitalicia', estado: 'Activo', ultimoAcceso: '2026-07-10' },
  ];

  if (req.method === 'GET' && req.url.startsWith('/api/admin/users')) {
    var params = new URL(req.url, 'http://localhost').searchParams;
    var token = params.get('token') || '';
    if (token !== 'admin123') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'No autorizado' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, usuarios: usuariosAdmin }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/admin/users/activate') {
    let body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      try {
        var data = JSON.parse(body);
        if (data.token !== 'admin123') {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'No autorizado' }));
          return;
        }
        var user = null;
        for (var i = 0; i < usuariosAdmin.length; i++) {
          if (usuariosAdmin[i].id === data.userId) { user = usuariosAdmin[i]; break; }
        }
        if (!user) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Usuario no encontrado' }));
          return;
        }
        user.estado = 'Activo';
        user.ultimoAcceso = new Date().toISOString().slice(0, 10);
        console.log('[ADMIN] Licencia activada para', user.nombre, '(' + user.correo + ')');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Licencia activada para ' + user.nombre }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Solicitud inválida' }));
      }
    });
    return;
  }

  // Checkout / Payment mock
  var sesionesPago = {};

  if (req.method === 'POST' && req.url === '/api/checkout/create-session') {
    let body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      try {
        var data = JSON.parse(body);
        var plan = data.plan || 'Licencia Personal S/15';
        var email = data.email || 'cliente@email.com';
        var sessionId = 'cs_test_' + crypto.randomBytes(16).toString('hex');
        sesionesPago[sessionId] = { plan: plan, email: email, estado: 'pendiente', creado: new Date().toISOString() };
        console.log('[CHECKOUT] Sesión creada:', sessionId, 'Plan:', plan);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          sessionId: sessionId,
          redirectUrl: '/api/checkout/success?session_id=' + sessionId
        }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Solicitud inválida' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/checkout/success')) {
    var urlParams = new URL(req.url, 'http://localhost').searchParams;
    var sessionId = urlParams.get('session_id') || '';
    var session = sesionesPago[sessionId];
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Sesión no encontrada' }));
      return;
    }
    session.estado = 'completado';
    console.log('[CHECKOUT] Pago completado para sesión:', sessionId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Pago exitoso', sessionId: sessionId }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/checkout/webhook') {
    let body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      try {
        var data = JSON.parse(body);
        var sessionId = data.sessionId || data.session_id || '';
        var session = sesionesPago[sessionId];
        if (session) {
          session.estado = 'completado';
          console.log('[WEBHOOK] Pago confirmado para sesión:', sessionId);
          // Simular activación de licencia para el usuario
          for (var ui = 0; ui < usuariosAdmin.length; ui++) {
            if (usuariosAdmin[ui].correo === session.email) {
              usuariosAdmin[ui].estado = 'Activo';
              usuariosAdmin[ui].ultimoAcceso = new Date().toISOString().slice(0, 10);
              break;
            }
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: 'Webhook recibido' }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Solicitud inválida' }));
      }
    });
    return;
  }

  // Static files
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '-1');
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Servidor local activo en http://localhost:${PORT}`);
});
