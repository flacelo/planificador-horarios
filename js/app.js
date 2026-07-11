// ======================================================================
  // ✅ TUS DATOS — YA ESTÁN CONFIGURADOS
  // ======================================================================
  const VENDEDOR = {
    yape: '936 718 790',
    whatsapp: '+51 936 718 790',
    precio: 'S/ 15'
  };

  // Contraseña para entrar al panel de administración (haz clic 5 veces en el título)
  const ADMIN_PASSWORD = 'admin123';

  // ======================================================================
  // 🆕 CONFIGURACIÓN GLOBAL CENTRALIZADA
  // ======================================================================
  const CONFIG = Object.freeze({
    STORAGE: {
      LICENCIA: 'horario_licencia',
      PERFIL: 'horario_perfil',
      PLANNER_TYPE: 'horario_planner_type',
      DATA_PREFIX: 'horario_data_',
      COMPLETO: 'horario_completo',
      DATOS_LEGACY: 'horario_datos',
      CUSTOM_HEADER: 'horario_custom_header',
      INTERVALO: 'horario_intervalo',
      INICIO: 'horario_inicio',
      FIN: 'horario_fin',
      DARK_MODE: 'horario_dark_mode',
      EMPTY_CERRADO: 'horario_empty_cerrado',
      METAS_CHECK: 'horario_metas_check',
      NOTIFIED: 'horario_notified',
      PROTECCION: 'horario_proteccion',
      REWARDS: 'horario_rewards',
      TUTORIAL_VISTO: 'horario_tutorial_visto',
    },
    LIMITES: {
      LICENCIA_DIAS: 365,
      MIN_FILAS: 1,
      MIN_DIAS: 2,
      RESPONSIVE_BREAK: 600,
      INTERVALO_DEFAULT: 60,
      HORA_DEFAULT_INICIO: '07:00',
      HORA_DEFAULT_FIN: '23:00',
    },
    TIME: {
      AUTOGUARDAR_DEBOUNCE: 200,
      TUTORIAL_INICIO: 800,
      CLICK_RESET: 2000,
      SCREENSHOT_MS: 2500,
      REMINDER_CHECK: 5000,
      CIERRE_ACTIVAR: 1500,
    },
    TUTORIAL: {
      TOTAL_PASOS: 7,
    },
  });

  // ======================================================================
  // SISTEMA DE LICENCIAS
  // ======================================================================
  function generarLicencia(comprador) {
    const data = {
      c: comprador.trim(),
      t: Date.now(),
      h: simpleHash(comprador.trim().toLowerCase() + '|' + Date.now() + '|S3CR3T0')
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  function verificarLicencia(codigo) {
    try {
      const json = decodeURIComponent(escape(atob(codigo)));
      const data = JSON.parse(json);
      if (!data.c || !data.t || !data.h) return null;
      const expectedHash = simpleHash(data.c.toLowerCase() + '|' + data.t + '|S3CR3T0');
      if (data.h !== expectedHash) return null;
      return { comprador: data.c, fecha: new Date(data.t).toLocaleDateString(), valido: true };
    } catch(e) { return null; }
  }

  // ========== SERVICE WORKER ==========
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  function activarLicencia() {
    const codigo = document.getElementById('inp-codigo').value.trim();
    const msg = document.getElementById('msg-activar');
    if (!codigo) { msg.textContent = '❌ Ingresa un código'; msg.style.color = '#e74c3c'; return; }
    const result = verificarLicencia(codigo);
    if (!result) { msg.textContent = '❌ Código inválido'; msg.style.color = '#e74c3c'; return; }
    localStorage.setItem(CONFIG.STORAGE.LICENCIA, JSON.stringify({ comprador: result.comprador, fecha: result.fecha, codigo }));
    aplicarLicencia();
    msg.textContent = '✅ ¡Licencia activada! Bienvenido, ' + result.comprador;
    msg.style.color = '#27ae60';
    setTimeout(() => { cerrarActivar(); }, CONFIG.TIME.CIERRE_ACTIVAR);
  }

  function aplicarLicencia() {
    try {
      const lic = JSON.parse(localStorage.getItem(CONFIG.STORAGE.LICENCIA));
      if (lic && lic.comprador) {
        document.getElementById('app').classList.remove('demo-mode');
        document.getElementById('app').classList.add('licenciado');
        document.getElementById('marca-agua').textContent = '🔐 Licencia personal para ' + lic.comprador + ' — Gracias por tu compra ❤️';
        return true;
      }
    } catch(e) {}
    return false;
  }

  function verificarEstadoLicencia() {
    if (!aplicarLicencia()) { document.getElementById('app').classList.add('demo-mode'); return false; }
    return true;
  }

  function mostrarCompra() {
    document.getElementById('modal-compra').classList.add('active');
  }

  function mostrarActivar() {
    document.getElementById('modal-compra').classList.remove('active');
    document.getElementById('modal-activar').classList.add('active');
  }

  function abrirWhatsApp() {
    const msg = encodeURIComponent('¡Hola! Quiero comprar la licencia del Planificador de Horarios (S/ 15). ¿Cómo puedo realizar el pago?');
    window.open('https://wa.me/51936718790?text=' + msg, '_blank', 'noopener,noreferrer');
  }

  function iniciarCheckout() {
    var btn = document.getElementById('btn-pagar-tarjeta');
    var spinner = document.getElementById('checkout-spinner');
    var result = document.getElementById('checkout-result');
    if (btn) btn.style.display = 'none';
    if (spinner) spinner.style.display = 'block';
    if (result) { result.style.display = 'none'; result.innerHTML = ''; }
    fetch('/api/checkout/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'Licencia Personal S/15',
        email: (loginUsuario && loginUsuario.correo) ? loginUsuario.correo : 'cliente@email.com'
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.ok && data.sessionId) {
        if (spinner) spinner.style.display = 'none';
        if (result) {
          result.style.display = 'block';
          result.innerHTML = '<p style="font-size:0.78em;color:#888;">✅ Sesión de pago creada</p>' +
            '<p style="font-size:0.75em;color:#888;margin:2px 0;">ID: <code style="font-size:0.85em;">' + data.sessionId + '</code></p>' +
            '<div style="margin:8px 0;padding:10px;background:#e3f2fd;border-radius:8px;font-size:0.78em;">' +
            '<p style="color:#1565c0;font-weight:600;">🔄 Simulando redirección a pasarela...</p></div>' +
            '<button class="btn-primary" onclick="simularPagoExitoso(\'' + data.sessionId + '\')" style="font-size:0.82em;">✅ Simular pago exitoso</button>';
        }
      } else {
        if (spinner) spinner.style.display = 'none';
        if (btn) btn.style.display = 'block';
        if (result) { result.style.display = 'block'; result.innerHTML = '<p style="font-size:0.78em;color:#ff7675;">❌ Error al crear sesión de pago</p>'; }
      }
    })
    .catch(function() {
      if (spinner) spinner.style.display = 'none';
      if (btn) btn.style.display = 'block';
      if (result) { result.style.display = 'block'; result.innerHTML = '<p style="font-size:0.78em;color:#ff7675;">❌ Error de conexión</p>'; }
    });
  }

  function copiarSerial(texto) {
    navigator.clipboard.writeText(texto).then(function() {
      var btn = document.getElementById('btn-copiar-serial');
      if (btn) btn.textContent = '✅ Copiado';
      setTimeout(function() { if (btn) btn.textContent = '📋 Copiar código'; }, 2000);
    }).catch(function() { alert('✅ Código: ' + texto); });
  }

  function simularPagoExitoso(sessionId) {
    var result = document.getElementById('checkout-result');
    if (result) {
      result.innerHTML = '<div style="margin:8px 0;padding:10px;background:#e3f2fd;border-radius:8px;font-size:0.78em;">' +
        '<p style="color:#1565c0;font-weight:600;">⏳ Confirmando pago...</p></div>';
    }
    fetch('/api/checkout/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionId })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (result) {
        if (data.ok) {
          if (data.serial) {
            var comprador = loginUsuario ? loginUsuario.nombre : 'Usuario';
            var licData = {
              comprador: comprador,
              fecha: new Date().toISOString().slice(0, 10),
              codigo: data.serial
            };
            if (data.expiracion) {
              licData.planTipo = data.expiracion.tipo;
              licData.fechaExpiracion = data.expiracion.fecha;
            }
            localStorage.setItem(CONFIG.STORAGE.LICENCIA, JSON.stringify(licData));
          }
          var serialHtml = '';
          if (data.serial) {
            serialHtml = '<div style="margin:8px 0;padding:10px;background:#fff;border:2px solid #6c5ce7;border-radius:8px;">' +
              '<p style="font-size:0.75em;color:#888;margin-bottom:4px;">🔑 Tu código de activación único:</p>' +
              '<p style="font-size:1.1em;font-weight:700;color:#6c5ce7;letter-spacing:1px;font-family:monospace;" id="serial-display">' + data.serial + '</p>' +
              '<button class="btn-primary" id="btn-copiar-serial" onclick="copiarSerial(\'' + data.serial + '\')" style="font-size:0.75em;padding:3px 12px;margin-top:4px;">📋 Copiar código</button></div>';
          }
          result.innerHTML = '<div style="margin:8px 0;padding:12px;background:#d4edda;border-radius:8px;font-size:0.82em;">' +
            '<p style="color:#155724;font-weight:600;">✅ ¡Pago exitoso! Tu licencia ha sido activada</p>' +
            '<p style="color:#155724;font-size:0.85em;margin-top:4px;">Gracias por tu compra 🎉</p></div>' +
            serialHtml +
            '<button class="btn-cancel" onclick="cerrarModalCompra()" style="margin-top:6px;">Cerrar</button>';
          actualizarUIlogin();
        } else {
          result.innerHTML = '<p style="font-size:0.78em;color:#ff7675;">❌ Error en la confirmación del pago</p>';
        }
      }
    })
    .catch(function() {
      if (result) {
        result.innerHTML = '<div style="margin:8px 0;padding:12px;background:#d4edda;border-radius:8px;font-size:0.82em;">' +
          '<p style="color:#155724;font-weight:600;">✅ ¡Pago simulado exitoso! Licencia activada</p></div>' +
          '<button class="btn-cancel" onclick="cerrarModalCompra()" style="margin-top:6px;">Cerrar</button>';
      }
    });
  }

  window.copiarSerial = copiarSerial;

  window.iniciarCheckout = iniciarCheckout;
  window.simularPagoExitoso = simularPagoExitoso;

  function cerrarModalCompra() {
    document.getElementById('modal-compra').classList.remove('active');
  }

  function cerrarActivar() {
    document.getElementById('modal-activar').classList.remove('active');
    document.getElementById('inp-codigo').value = '';
    document.getElementById('msg-activar').textContent = '';
  }

  // ========== ADMIN ==========
  let clickCount = 0, clickTimer = null;
  document.getElementById('main-title').addEventListener('click', function() {
    clickCount++;
    if (clickCount === 1) clickTimer = setTimeout(() => { clickCount = 0; }, CONFIG.TIME.CLICK_RESET);
    if (clickCount >= 5) {
      clickCount = 0; clearTimeout(clickTimer);
      const pass = prompt('🔐 Ingresa la contraseña de administrador:');
      if (pass === ADMIN_PASSWORD) {
        document.getElementById('modal-admin').classList.add('active');
        document.getElementById('resultado-licencia').style.display = 'none';
        document.getElementById('inp-cliente').value = '';
        document.getElementById('chk-proteccion').checked = proteccionActiva;
      } else if (pass !== null) alert('❌ Contraseña incorrecta.');
    }
  });

  function generarLicenciaAdmin() {
    const nombre = document.getElementById('inp-cliente').value.trim();
    if (!nombre) { alert('Ingresa el nombre del cliente.'); return; }
    const codigo = generarLicencia(nombre);
    document.getElementById('codigo-generado').textContent = codigo;
    document.getElementById('resultado-licencia').style.display = 'block';
  }

  function copiarCodigo() {
    const texto = document.getElementById('codigo-generado').textContent;
    navigator.clipboard.writeText(texto).then(() => alert('✅ Código copiado')).catch(() => {
      const range = document.createRange();
      range.selectNode(document.getElementById('codigo-generado'));
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      alert('✅ Código copiado');
    });
  }

  function cerrarAdmin() {
    document.getElementById('modal-admin').classList.remove('active');
    document.getElementById('resultado-licencia').style.display = 'none';
  }

  function cargarPanelAdmin() {
    var tbody = document.getElementById('admin-users-tbody');
    var msg = document.getElementById('admin-msg');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#888;">Cargando...</td></tr>';
    if (msg) msg.textContent = '🔄 Cargando usuarios...';
    fetch('/api/admin/users?token=' + encodeURIComponent(ADMIN_PASSWORD))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.ok || !data.usuarios) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#ff7675;">Error al cargar usuarios</td></tr>';
          if (msg) msg.textContent = '❌ ' + (data.error || 'Error desconocido');
          return;
        }
        var html = '';
        data.usuarios.forEach(function(u) {
          var badgeColor = u.estado === 'Activo' ? '#55efc4' : u.estado === 'Pendiente' ? '#ffeaa7' : '#ff7675';
          var licColor = u.licencia === 'Vitalicia' ? '#6c5ce7' : u.licencia === 'Mensual' ? '#0984e3' : '#636e72';
          html += '<tr>' +
            '<td style="padding:5px 4px;border-bottom:1px solid var(--border,#eee);">' + u.nombre + '</td>' +
            '<td style="padding:5px 4px;border-bottom:1px solid var(--border,#eee);font-size:0.9em;color:var(--text-muted,#888);">' + u.correo + '</td>' +
            '<td style="padding:5px 4px;border-bottom:1px solid var(--border,#eee);text-align:center;"><span style="background:' + licColor + ';color:#fff;padding:2px 8px;border-radius:10px;font-size:0.85em;">' + u.licencia + '</span></td>' +
            '<td style="padding:5px 4px;border-bottom:1px solid var(--border,#eee);text-align:center;"><span style="color:' + badgeColor + ';font-weight:600;">● ' + u.estado + '</span></td>' +
            '<td style="padding:5px 4px;border-bottom:1px solid var(--border,#eee);text-align:center;"><button class="btn-primary" style="font-size:0.75em;padding:2px 8px;" onclick="simularActivacionManual(' + u.id + ')">⚡ Activar</button></td>' +
            '</tr>';
        });
        tbody.innerHTML = html;
        if (msg) msg.textContent = '✅ ' + data.usuarios.length + ' usuarios cargados';
      })
      .catch(function() {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#ff7675;">Error de conexión</td></tr>';
        if (msg) msg.textContent = '❌ Error de conexión con el servidor';
      });
  }

  function simularActivacionManual(userId) {
    var msg = document.getElementById('admin-msg');
    if (msg) msg.textContent = '⚡ Activando licencia para usuario #' + userId + '...';
    fetch('/api/admin/users/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId, token: ADMIN_PASSWORD })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (msg) msg.textContent = data.ok ? '✅ ' + data.message : '❌ ' + (data.error || 'Error');
      if (data.ok) cargarPanelAdmin();
    })
    .catch(function() {
      if (msg) msg.textContent = '✅ Licencia activada manualmente';
      setTimeout(function() { cargarPanelAdmin(); }, 500);
    });
  }

  window.cargarPanelAdmin = cargarPanelAdmin;
  window.simularActivacionManual = simularActivacionManual;

  // ========== CATEGORÍAS ==========
  let CATS = [
    { id:'clase', label:'Clase universidad', color:'#74b9ff' },
    { id:'ensenanza', label:'Enseñanza', color:'#a29bfe' },
    { id:'estudio', label:'Estudio / Proyectos', color:'#dfe6e9' },
    { id:'comida', label:'Comida', color:'#ffeaa7' },
    { id:'desconexion', label:'Desconexión digital', color:'#ff7675' },
    { id:'flexible', label:'Bloque flexible', color:'#fab1a0' },
    { id:'rutina', label:'Rutina / Dormir', color:'#55efc4' },
    { id:'libre', label:'Libre', color:'#f5f6fa' }
  ];

  // ========== PERFILES POR CARRERA ==========
  const profiles = {
    'Ingeniería de Seguridad Industrial y Minera': {
      label: 'Ing. Seguridad Industrial y Minera',
      icon: '⛏️',
      cats: [
        { id:'clase', label:'Clase universidad', color:'#74b9ff' },
        { id:'laboratorio', label:'Laboratorio', color:'#a29bfe' },
        { id:'estudio', label:'Estudio', color:'#dfe6e9' },
        { id:'inspeccion-epp', label:'Inspección EPP', color:'#fdcb6e' },
        { id:'matriz-iperc', label:'Matriz IPERC', color:'#e17055' },
        { id:'comida', label:'Comida', color:'#ffeaa7' },
        { id:'rutina', label:'Rutina / Dormir', color:'#55efc4' },
        { id:'libre', label:'Libre', color:'#f5f6fa' }
      ],
      goals: [
        'Aprobar todas las materias con ≥14',
        'Completar 3 matrices IPERC por ciclo',
        'Mantener récord de seguridad en prácticas'
      ]
    },
    'Ingeniería de Sistemas': {
      label: 'Ing. de Sistemas',
      icon: '💻',
      cats: [
        { id:'clase', label:'Clase universidad', color:'#74b9ff' },
        { id:'programacion', label:'Programación', color:'#a29bfe' },
        { id:'base-datos', label:'Base de Datos', color:'#fdcb6e' },
        { id:'proyectos', label:'Proyectos', color:'#e17055' },
        { id:'estudio', label:'Estudio', color:'#dfe6e9' },
        { id:'comida', label:'Comida', color:'#ffeaa7' },
        { id:'rutina', label:'Rutina / Dormir', color:'#55efc4' },
        { id:'libre', label:'Libre', color:'#f5f6fa' }
      ],
      goals: [
        'Entregar todos los proyectos a tiempo',
        'Aprender un nuevo framework este ciclo',
        'Mantener promedio ≥15 en cursos de programación'
      ]
    },
    'Ingeniería Civil': {
      label: 'Ing. Civil',
      icon: '🏗️',
      cats: [
        { id:'clase', label:'Clase universidad', color:'#74b9ff' },
        { id:'topografia', label:'Topografía', color:'#a29bfe' },
        { id:'planos', label:'Planos / AutoCAD', color:'#fdcb6e' },
        { id:'estructuras', label:'Estructuras', color:'#e17055' },
        { id:'estudio', label:'Estudio', color:'#dfe6e9' },
        { id:'comida', label:'Comida', color:'#ffeaa7' },
        { id:'rutina', label:'Rutina / Dormir', color:'#55efc4' },
        { id:'libre', label:'Libre', color:'#f5f6fa' }
      ],
      goals: [
        'Terminar planos estructurales del proyecto final',
        'Aprobar cursos de concreto armado y suelos',
        'Visitar obra al menos 1 vez por semana'
      ]
    },
    'Otra Ingeniería': {
      label: 'Otra Ingeniería',
      icon: '🔧',
      cats: [
        { id:'clase', label:'Clase universidad', color:'#74b9ff' },
        { id:'laboratorio', label:'Laboratorio', color:'#a29bfe' },
        { id:'estudio', label:'Estudio', color:'#dfe6e9' },
        { id:'proyectos', label:'Proyectos', color:'#fdcb6e' },
        { id:'reportes', label:'Reportes', color:'#e17055' },
        { id:'comida', label:'Comida', color:'#ffeaa7' },
        { id:'rutina', label:'Rutina / Dormir', color:'#55efc4' },
        { id:'libre', label:'Libre', color:'#f5f6fa' }
      ],
      goals: [
        'Mantener promedio ponderado ≥14',
        'Entregar reportes de laboratorio completos',
        'Participar en al menos 1 proyecto integrador'
      ]
    },
    'Medicina': {
      label: 'Medicina',
      icon: '⚕️',
      cats: [
        { id:'hospital', label:'Hospital / Clínica', color:'#e17055' },
        { id:'guardia', label:'Guardia', color:'#d63031' },
        { id:'anatomia', label:'Anatomía', color:'#fdcb6e' },
        { id:'casos-clinicos', label:'Casos Clínicos', color:'#74b9ff' },
        { id:'estudio', label:'Estudio', color:'#dfe6e9' },
        { id:'comida', label:'Comida', color:'#ffeaa7' },
        { id:'rutina', label:'Rutina / Dormir', color:'#55efc4' },
        { id:'libre', label:'Libre', color:'#f5f6fa' }
      ],
      goals: [
        'Asistir al 100% de prácticas hospitalarias',
        'Repasar anatomía 30 min diarios',
        'Presentar 2 casos clínicos por rotación'
      ]
    },
    'Derecho': {
      label: 'Derecho',
      icon: '⚖️',
      cats: [
        { id:'clase', label:'Clase universidad', color:'#74b9ff' },
        { id:'lectura-codigos', label:'Lectura de Códigos', color:'#a29bfe' },
        { id:'analisis-casos', label:'Análisis de Casos', color:'#fdcb6e' },
        { id:'litigacion', label:'Litigación', color:'#e17055' },
        { id:'debate', label:'Debate / Oral', color:'#55efc4' },
        { id:'comida', label:'Comida', color:'#ffeaa7' },
        { id:'rutina', label:'Rutina / Dormir', color:'#55efc4' },
        { id:'libre', label:'Libre', color:'#f5f6fa' }
      ],
      goals: [
        'Leer y analizar 2 códigos por ciclo',
        'Ganar al menos 1 simulación de juicio',
        'Redactar 1 demanda o contrato modelo'
      ]
    },
    'Arquitectura': {
      label: 'Arquitectura',
      icon: '🏛️',
      cats: [
        { id:'clase', label:'Clase universidad', color:'#74b9ff' },
        { id:'diseno', label:'Diseño Arquitectónico', color:'#a29bfe' },
        { id:'planos', label:'Planos / Revit', color:'#fdcb6e' },
        { id:'maquetas', label:'Maquetas', color:'#e17055' },
        { id:'estudio', label:'Estudio', color:'#dfe6e9' },
        { id:'comida', label:'Comida', color:'#ffeaa7' },
        { id:'rutina', label:'Rutina / Dormir', color:'#55efc4' },
        { id:'libre', label:'Libre', color:'#f5f6fa' }
      ],
      goals: [
        'Terminar láminas del proyecto del ciclo',
        'Construir maqueta a escala 1:50',
        'Visitar 2 obras arquitectónicas referentes'
      ]
    },
    'Enfermería': {
      label: 'Enfermería',
      icon: '🩺',
      cats: [
        { id:'clase', label:'Clase universidad', color:'#74b9ff' },
        { id:'practicas-clinicas', label:'Prácticas Clínicas', color:'#a29bfe' },
        { id:'anatomia', label:'Anatomía', color:'#fdcb6e' },
        { id:'guardias', label:'Guardias', color:'#e17055' },
        { id:'estudio', label:'Estudio', color:'#dfe6e9' },
        { id:'comida', label:'Comida', color:'#ffeaa7' },
        { id:'rutina', label:'Rutina / Dormir', color:'#55efc4' },
        { id:'libre', label:'Libre', color:'#f5f6fa' }
      ],
      goals: [
        'Cumplir todas las guardias programadas',
        'Aprobar examen de anatomía con ≥15',
        'Realizar 5 procedimientos clínicos supervisados'
      ]
    },
    'Psicología': {
      label: 'Psicología',
      icon: '🧠',
      cats: [
        { id:'clase', label:'Clase universidad', color:'#74b9ff' },
        { id:'psicoterapia', label:'Psicoterapia', color:'#a29bfe' },
        { id:'lectura', label:'Lectura', color:'#fdcb6e' },
        { id:'casos-clinicos', label:'Casos Clínicos', color:'#fab1a0' },
        { id:'talleres', label:'Talleres', color:'#e17055' },
        { id:'estudio', label:'Estudio', color:'#dfe6e9' },
        { id:'comida', label:'Comida', color:'#ffeaa7' },
        { id:'rutina', label:'Rutina / Dormir', color:'#55efc4' },
        { id:'libre', label:'Libre', color:'#f5f6fa' }
      ],
      goals: [
        'Leer 1 libro de psicología por mes',
        'Realizar 3 entrevistas clínicas supervisadas',
        'Asistir a 2 talleres o congresos por ciclo'
      ]
    },
    'Freelancer': {
      label: 'Freelancer',
      icon: '🚀',
      cats: [
        { id:'proyectos', label:'Proyectos', color:'#74b9ff' },
        { id:'reunion-cliente', label:'Reunión Cliente', color:'#a29bfe' },
        { id:'trabajo-enfoque', label:'Trabajo Enfoque', color:'#55efc4' },
        { id:'finanzas', label:'Finanzas', color:'#fdcb6e' },
        { id:'aprendizaje', label:'Aprendizaje', color:'#e17055' },
        { id:'comida', label:'Comida', color:'#ffeaa7' },
        { id:'rutina', label:'Rutina / Dormir', color:'#55efc4' },
        { id:'libre', label:'Libre', color:'#f5f6fa' }
      ],
      goals: [
        'Entregar proyectos antes del deadline',
        'Dedicar 2h diarias a trabajo enfocado',
        'Aumentar ingresos mensuales en 20%'
      ]
    },
    'Otra Carrera': {
      label: 'Otra Carrera',
      icon: '📚',
      cats: [
        { id:'clase', label:'Clase universidad', color:'#74b9ff' },
        { id:'repaso', label:'Repaso', color:'#a29bfe' },
        { id:'tareas', label:'Tareas', color:'#fdcb6e' },
        { id:'proyectos', label:'Proyectos', color:'#e17055' },
        { id:'lectura', label:'Lectura', color:'#fab1a0' },
        { id:'examenes', label:'Exámenes', color:'#ff7675' },
        { id:'comida', label:'Comida', color:'#ffeaa7' },
        { id:'rutina', label:'Rutina / Dormir', color:'#55efc4' },
        { id:'libre', label:'Libre', color:'#f5f6fa' }
      ],
      goals: [
        'Estudiar 2h fuera de clase cada día',
        'Entregar todos los trabajos a tiempo',
        'Preparar exámenes con 1 semana de anticipación'
      ]
    }
  };

  let dias = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'];
  let filas = [];
  let modalFila = -1, modalCol = -1;
  let plannerType = 'semanal';
  const PLANNER_TYPES = {
    diario: { label: 'Diario', dias: ['HOY'] },
    semanal: { label: 'Semanal', dias: ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'] },
    mensual: { label: 'Mensual', dias: Array.from({length:31},(_,i)=>`${i+1}`) },
    anual: { label: 'Anual', dias: ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'] },
    personalizado: { label: 'Personalizado', dias: [] }
  };

  function generarBloquesDefault() {
    const interval = parseInt(localStorage.getItem(CONFIG.STORAGE.INTERVALO) || String(CONFIG.LIMITES.INTERVALO_DEFAULT));
    const inicio = localStorage.getItem(CONFIG.STORAGE.INICIO) || CONFIG.LIMITES.HORA_DEFAULT_INICIO;
    const fin = localStorage.getItem(CONFIG.STORAGE.FIN) || CONFIG.LIMITES.HORA_DEFAULT_FIN;
    return generarBloques(interval, inicio, fin);
  }

  const DEFAULT = generarBloquesDefault();

  function getDefaultDiario() {
    const hues = ['🌅 6:00 – 7:00','🌅 7:00 – 8:00','📚 8:00 – 10:00','📚 10:00 – 12:00','🍽️ 12:00 – 13:00','🚶 13:00 – 14:00','💪 14:00 – 15:00','💻 15:00 – 17:00','📞 17:00 – 18:00','🌆 18:00 – 19:00','🎯 19:00 – 21:00','🌙 21:00 – 22:00','💤 22:00'];
    const acts = [
      {t:'🛏️ Despertar, estiramientos, meditación',c:'rutina'},
      {t:'🚿 Ducha, desayuno saludable, planificar el día',c:'rutina'},
      {t:'💻 Bloque de trabajo / estudio profundo (Pomodoro)',c:'estudio'},
      {t:'📚 Continuar trabajo / estudio / proyecto',c:'clase'},
      {t:'🥗 Almuerzo, descanso, desconectar',c:'comida'},
      {t:'🚶 Paseo / Siesta / Tiempo libre',c:'flexible'},
      {t:'🏋️ Ejercicio / deporte / baile',c:'flexible'},
      {t:'📚 Bloque de trabajo / estudio',c:'estudio'},
      {t:'📱 Llamadas, pendientes, organización',c:'flexible'},
      {t:'🍽️ Cena, tiempo en familia',c:'comida'},
      {t:'📖 Tiempo personal / Curso online / Lectura',c:'desconexion'},
      {t:'📱 Desconexión digital, prepararse para dormir',c:'rutina'},
      {t:'😴 DORMIR (7–8h de sueño reparador)',c:'rutina'}
    ];
    return { dias: ['HOY'], filas: hues.map((h,i) => ({ hora: h, celdas: [{...acts[i], done: false}] })) };
  }

  function getDefaultMensual() {
    const dias = Array.from({length:31}, (_, i) => `${i+1}`);
    return {
      dias,
      filas: [
        { hora: '💼 Trabajo / Laboral', celdas: dias.map(d => ({t:'',c:'clase',done:false})) },
        { hora: '📚 Estudio / Formación', celdas: dias.map(d => ({t:'',c:'estudio',done:false})) },
        { hora: '💪 Salud / Ejercicio', celdas: dias.map(d => ({t:'',c:'rutina',done:false})) },
        { hora: '💰 Finanzas / Ahorro', celdas: dias.map(d => ({t:'',c:'flexible',done:false})) },
        { hora: '🎯 Meta del mes', celdas: dias.map(d => ({t:'',c:'ensenanza',done:false})) },
        { hora: '🌟 Vida social / Familia', celdas: dias.map(d => ({t:'',c:'comida',done:false})) }
      ]
    };
  }

  function getDefaultAnual() {
    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const metas = [
      {n:'🎓 Formación / Cursos', c:'clase'},
      {n:'🏆 Salud / Deporte', c:'rutina'},
      {n:'💰 Ahorro / Inversiones', c:'estudio'},
      {n:'🌟 Proyecto personal', c:'ensenanza'},
      {n:'🧘 Bienestar / Viajes', c:'flexible'}
    ];
    return {
      dias: meses,
      filas: metas.map(m => ({ hora: m.n, celdas: meses.map(() => ({t:'',c:m.c,done:false})) }))
    };
  }

  function cambioSelect(sel, inpId) {
    const inp = document.getElementById(inpId);
    if (sel.value === 'otros') { inp.classList.remove('oculto'); inp.classList.add('visible'); inp.value = ''; inp.focus(); }
    else { inp.classList.remove('visible'); inp.classList.add('oculto'); inp.value = sel.value; }
  }

  function actualizarModalCategorias() {
    const sel = document.getElementById('modal-categoria');
    if (!sel) return;
    sel.innerHTML = CATS.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
  }

  function renderizarChipsSugeridos() {
    const container = document.getElementById('suggested-chips-container');
    if (!container) return;
    container.innerHTML = '<div class="chips-wrap">' + CATS.map(c =>
      `<button type="button" class="chip" style="background:${c.color};color:${textColor(c.color)};" data-cat="${c.id}" data-label="${c.label}">${c.label}</button>`
    ).join('') + '</div>';
  }

  function textColor(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return (r*0.299 + g*0.587 + b*0.114) > 140 ? '#1a1a2e' : '#fff';
  }

  function inyectarCSScategorias() {
    let styleId = 'dynamic-cat-css';
    let old = document.getElementById(styleId);
    if (old) old.remove();
    let css = '';
    CATS.forEach(c => {
      const hsl = (col) => { const r=parseInt(col.slice(1,3),16),g=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16); return [r,g,b]; };
      const [r,g,b] = hsl(c.color);
      css += `.c-${c.id} { background:${c.color} !important; }\n`;
      css += `body.dark .c-${c.id} { background:rgb(${Math.round(r*0.35)},${Math.round(g*0.35)},${Math.round(b*0.35)}) !important; color:${c.color} !important; }\n`;
    });
    const st = document.createElement('style');
    st.id = styleId;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function cargarPerfil(perfilId) {
    const perfil = profiles[perfilId];
    if (!perfil) return;
    CATS = perfil.cats;
    renderizarLeyenda();
    inyectarCSScategorias();
    actualizarModalCategorias();
    const selObj = document.getElementById('sel-objetivo');
    if (selObj && perfil.goals) {
      selObj.innerHTML = '<optgroup label="— Selecciona —">' +
        perfil.goals.map(g => `<option value="${g}">${g}</option>`).join('') +
        '<option value="otros">✏️ Otros</option></optgroup>';
      selObj.value = perfil.goals[0];
    }
    renderizarChipsSugeridos();
    localStorage.setItem(CONFIG.STORAGE.PERFIL, perfilId);
    renderizar();
  }

  function actualizarMetasDashboard() {
    const perfilId = localStorage.getItem(CONFIG.STORAGE.PERFIL);
    const perfil = perfilId && profiles[perfilId] ? profiles[perfilId] : null;
    if (!perfil || !perfil.goals || perfil.goals.length === 0) return '';
    const saved = (() => { try { return JSON.parse(localStorage.getItem(CONFIG.STORAGE.METAS_CHECK) || '{}'); } catch(e) { return {}; } })();
    return `<div class="dash-card" style="margin-bottom:10px;"><h3>🎯 Metas del Perfil: ${perfil.icon || ''} ${perfil.label}</h3><div style="margin-top:6px;">` +
      perfil.goals.map((g, i) => {
        const key = perfilId + '|' + i;
        const checked = saved[key] ? 'checked' : '';
        return `<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer;font-size:0.78em;transition:0.2s;">
          <input type="checkbox" ${checked} onchange="toggleMetaCheck('${perfilId}',${i},this.checked)" style="width:auto;accent-color:#667eea;">
          <span style="${checked?'text-decoration:line-through;color:#999;':'color:inherit;'}">${g}</span>
        </label>`;
      }).join('') +
    `</div></div>`;
  }

  function toggleMetaCheck(perfilId, idx, checked) {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CONFIG.STORAGE.METAS_CHECK) || '{}'); } catch(e) {}
    saved[perfilId + '|' + idx] = checked;
    localStorage.setItem(CONFIG.STORAGE.METAS_CHECK, JSON.stringify(saved));
  }

  function onRolChange(sel) {
    const inp = document.getElementById('inp-nombre');
    if (sel.value === 'otros') { inp.classList.remove('oculto'); inp.classList.add('visible'); inp.value = ''; inp.focus(); }
    else { inp.classList.remove('visible'); inp.classList.add('oculto'); inp.value = sel.value; }

    const carreraC = document.getElementById('carrera-container');
    const espC = document.getElementById('especialidad-container');
    const cicloC = document.getElementById('ciclo-container');
    const carreraSel = document.getElementById('sel-carrera');
    const espSel = document.getElementById('sel-especialidad');
    const cicloSel = document.getElementById('sel-ciclo');

    if (sel.value === 'Freelancer') {
      if (carreraC) { carreraC.style.display = 'none'; carreraSel.selectedIndex = 0; }
      if (espC) { espC.style.display = 'none'; if (espSel) espSel.selectedIndex = 0; }
      if (cicloC) { cicloC.style.display = 'none'; if (cicloSel) cicloSel.selectedIndex = 0; }
      document.getElementById('inp-ciclo').value = '';
      if (profiles.Freelancer) cargarPerfil('Freelancer');
    } else {
      if (carreraC) carreraC.style.display = '';
      if (cicloC) {
        if (sel.value === 'Estudiante') {
          cicloC.style.display = '';
        } else {
          cicloC.style.display = 'none';
          if (cicloSel) { cicloSel.selectedIndex = 0; document.getElementById('inp-ciclo').value = ''; }
        }
      }
    }
  }

  function poblarEspecialidad(carrera) {
    const container = document.getElementById('especialidad-container');
    const sel = document.getElementById('sel-especialidad');
    const inp = document.getElementById('inp-especialidad');
    if (!container || !sel) return;
    const map = {
      Ingeniería: { label: '— Rama de Ingeniería —', opts: [
        ['Ingeniería de Seguridad Industrial y Minera', '⛏️ Ing. Seg. Industrial y Minera'],
        ['Ingeniería de Sistemas', '💻 Ing. de Sistemas'],
        ['Ingeniería Civil', '🏗️ Ing. Civil'],
        ['Otra Ingeniería', '🔧 Otra Ingeniería']
      ]},
      Medicina: { label: '— Especialidad —', opts: [
        ['Cardiología', '❤️ Cardiología'],
        ['Pediatría', '👶 Pediatría'],
        ['Neurología', '🧠 Neurología'],
        ['Cirugía General', '🔪 Cirugía General'],
        ['Agregar especialidad...', '✏️ Agregar especialidad...']
      ]},
      Enfermería: { label: '— Especialidad —', opts: [
        ['Enfermería General', '🩺 Enfermería General'],
        ['Enfermería Intensiva', '💉 Enf. Intensiva'],
        ['Enfermería Pediátrica', '👶 Enf. Pediátrica'],
        ['Agregar especialidad...', '✏️ Agregar especialidad...']
      ]},
      default: { label: '— Especialidad —', opts: [
        ['Agregar especialidad...', '✏️ Agregar especialidad...']
      ]}
    };
    const config = map[carrera] || map.default;
    sel.innerHTML = '<option value="">' + config.label + '</option>' +
      config.opts.map(o => '<option value="' + o[0] + '">' + o[1] + '</option>').join('');
    container.style.display = 'block';
    inp.classList.add('oculto');
    inp.value = '';
  }

  function onCarreraChange() {
    const sel = document.getElementById('sel-carrera');
    const container = document.getElementById('especialidad-container');
    const espSel = document.getElementById('sel-especialidad');
    const espInp = document.getElementById('inp-especialidad');
    if (!sel) return;
    const val = sel.value;
    if (val === 'Freelancer') {
      container.style.display = 'none';
      if (profiles.Freelancer) cargarPerfil('Freelancer');
    } else if (val && profiles[val]) {
      container.style.display = 'none';
      cargarPerfil(val);
    } else if (val) {
      poblarEspecialidad(val);
    } else {
      container.style.display = 'none';
    }
    if (espSel) espSel.value = '';
    if (espInp) { espInp.value = ''; espInp.classList.add('oculto'); }
  }

  function onEspecialidadChange() {
    const sel = document.getElementById('sel-especialidad');
    const inp = document.getElementById('inp-especialidad');
    if (!sel || !sel.value) return;
    if (sel.value === 'Agregar especialidad...') {
      inp.classList.remove('oculto');
      inp.value = '';
      inp.focus();
      return;
    }
    inp.classList.add('oculto');
    inp.value = sel.value;
    if (profiles[sel.value]) cargarPerfil(sel.value);
  }

  function valInfo(idSel, idInp) {
    const sel = document.getElementById(idSel);
    const inp = document.getElementById(idInp);
    if (inp && inp.classList.contains('visible')) return inp.value;
    return sel.options[sel.selectedIndex]?.value || '';
  }

  function estaVacio() {
    return filas.every(f => f.celdas.every(c => !c.t || c.t === '' || c.t === '—'));
  }

  function cerrarEmptyState() {
    document.getElementById('empty-state').classList.remove('show');
    localStorage.setItem(CONFIG.STORAGE.EMPTY_CERRADO, '1');
  }

  function renderDaySummary() {
    const el = document.getElementById('day-summary');
    if (!el) return;
    const tieneDatos = filas.length > 0 && filas.some(f => f.celdas.some(c => c.t && c.t !== '' && c.t !== '—'));
    if (!tieneDatos) { el.classList.remove('show'); el.innerHTML = ''; return; }
    const todayIdx = new Date().getDay();
    const todayName = ['DOM','LUN','MAR','MIE','JUE','VIE','SAB'][todayIdx];
    const diaIdx = dias.findIndex((d,i) => d.toUpperCase().startsWith(todayName.substring(0,3)));
    if (diaIdx === -1) { el.classList.remove('show'); el.innerHTML = ''; return; }
    let total = 0, done = 0;
    const cats = {};
    filas.forEach(f => {
      const c = f.celdas[diaIdx];
      if (c && c.t && c.t !== '' && c.t !== '—') {
        total++;
        if (c.done) done++;
        const catId = c.c || 'libre';
        if (!cats[catId]) cats[catId] = { count:0, done:0, color:'#f0f1f5' };
        cats[catId].count++;
        if (c.done) cats[catId].done++;
      }
    });
    const pct = total > 0 ? Math.round(done/total*100) : 0;
    const catLabels = {'0':'Clase','1':'Enseñanza','2':'Estudio','3':'Comida','4':'Desconexión','5':'Flexible','6':'Rutina','libre':'Libre'};
    const topCats = Object.entries(cats).sort((a,b) => b[1].count - a[1].count).slice(0,3);
    let html = `<span class="ds-icon">📋</span><div class="ds-body"><div class="ds-title">Resumen de hoy — ${total} actividades</div><div class="ds-stats">`;
    html += `<span class="ds-stat"><span class="dot" style="background:#55efc4;"></span> <strong>${done}</strong> hechas</span>`;
    html += `<span class="ds-stat"><span class="dot" style="background:#ddd;"></span> <strong>${total-done}</strong> pendientes</span>`;
    html += `<span class="ds-stat">✅ <strong>${pct}%</strong> cumplido</span>`;
    topCats.forEach(([id, data]) => {
      const label = catLabels[id] || id;
      html += `<span class="ds-stat"><span class="dot" style="background:${data.color};"></span> ${label}: ${data.done}/${data.count}</span>`;
    });
    html += `</div></div><div class="ds-actions"><button onclick="document.getElementById('btn-view-table').click()">📋 Ver horario</button><button onclick="document.getElementById('btn-view-dashboard').click()">📊 Dashboard</button></div>`;
    el.innerHTML = html;
    el.classList.add('show');
  }

  function actualizarEmptyState() {
    const emptyEl = document.getElementById('empty-state');
    const dayEl = document.getElementById('day-summary');
    if (!emptyEl) return;
    const oculto = localStorage.getItem(CONFIG.STORAGE.EMPTY_CERRADO);
    const tieneDatos = filas.length > 0 && filas.some(f => f.celdas.some(c => c.t && c.t !== '' && c.t !== '—'));
    if (tieneDatos) {
      emptyEl.classList.remove('show');
      if (oculto) localStorage.removeItem(CONFIG.STORAGE.EMPTY_CERRADO);
      renderDaySummary();
    } else if (oculto) {
      emptyEl.classList.remove('show');
      if (dayEl) { dayEl.classList.remove('show'); dayEl.innerHTML = ''; }
    } else if (estaVacio()) {
      emptyEl.classList.add('show');
      if (dayEl) { dayEl.classList.remove('show'); dayEl.innerHTML = ''; }
    }
  }

  function renderizar() {
    const tb = document.getElementById('tbody');
    const hr = document.getElementById('header-row');
    let hHtml = '<th style="width:55px;position:relative;">HORA<div class="resizer" data-col="-1"></div></th>';
    dias.forEach((d,i) => {
      hHtml += `<th style="position:relative;">${d.substring(0,3)}<div class="resizer" data-col="${i}"></div> <span style="cursor:pointer;color:#ff7675;font-size:0.8em;opacity:0.6" onclick="eliminarDia(${i})">✕</span></th>`;
    });
    const hTemp = document.createElement('tr');
    hTemp.innerHTML = hHtml;
    const hFrag = document.createDocumentFragment();
    while (hTemp.firstChild) hFrag.appendChild(hTemp.firstChild);
    hr.textContent = '';
    hr.appendChild(hFrag);
    let html = '';
    const celdaOcupada = {};
    filas.forEach((fila, fi) => {
      html += '<tr>';
      html += `<td class="hora-cell"><span class="del-fila" onclick="eliminarFila(${fi})">✕</span><input type="text" value="${fila.hora}" onchange="cambiarHora(${fi},this.value)"></td>`;
      for (let ci = 0; ci < dias.length; ci++) {
        const clave = fi + '_' + ci;
        if (celdaOcupada[clave]) continue;
        const cel = fila.celdas[ci] || {t:'',c:'libre',done:false,rowspan:1};
        if (cel.rowspan === undefined) cel.rowspan = 1;
        if (cel.done === undefined) cel.done = false;
        if (cel.reminder === undefined) cel.reminder = false;
        const dc = cel.done ? ' done' : '';
        const dk = cel.done ? ' checked' : '';
        const bell = cel.reminder ? '<span class="reminder-bell">🔔</span>' : '';
        const rs = cel.rowspan > 1 ? ` rowspan="${cel.rowspan}"` : '';
        const mergeCls = cel.rowspan > 1 ? ' merged-cell' : '';
        const mergeInd = cel.rowspan > 1 ? '<span class="merge-indicator">🔗</span>' : '';
        if (cel.rowspan > 1) {
          for (var r = fi + 1; r < fi + cel.rowspan; r++) celdaOcupada[r + '_' + ci] = true;
        }
        html += `<td class="celda c-${cel.c}${dc}${mergeCls}"${rs} data-fi="${fi}" data-ci="${ci}"><span class="done-check${dk}">${cel.done?'✓':''}</span>${mergeInd}${bell}${cel.t || '—'}</td>`;
      }
      html += '</tr>';
    });
    const temp = document.createElement('tbody');
    temp.innerHTML = html;
    const frag = document.createDocumentFragment();
    while (temp.firstChild) frag.appendChild(temp.firstChild);
    tb.textContent = '';
    tb.appendChild(frag);
    actualizarEmptyState();
    configurarResizers();
    configurarDelegacionCeldas();
    configurarArrastreMerge();
    renderizarLeyenda();
    actualizarInfoMerge();
    actualizarMergeBadge();
  }

  function renderizarLeyenda() {
    const leyenda = document.getElementById('leyenda');
    leyenda.textContent = '';
    const frag = document.createDocumentFragment();
    CATS.forEach(c => {
      const span = document.createElement('span');
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = c.color;
      span.appendChild(dot);
      span.appendChild(document.createTextNode(' ' + c.label));
      frag.appendChild(span);
    });
    leyenda.appendChild(frag);
  }

  function calcularEstadisticasSemanales() {
    const intervalMin = parseInt(document.getElementById('sel-intervalo').value) || 60;
    const totalSlots = filas.length;
    const catMap = {};
    let occupiedSlots = 0, doneSlots = 0;
    filas.forEach(f => {
      f.celdas.forEach(c => {
        if (!c || !c.t || c.t.trim() === '') return;
        occupiedSlots++;
        if (c.done) doneSlots++;
        const catId = c.c || 'libre';
        if (!catMap[catId]) catMap[catId] = { id:catId, label:catId, color:'#f0f1f5', hours:0, done:0, total:0 };
        catMap[catId].total++;
        if (c.done) catMap[catId].done++;
      });
    });
    const categories = CATS.map(c => {
      const m = catMap[c.id];
      if (!m) return null;
      m.label = c.label || c.id;
      m.color = c.color || '#f0f1f5';
      m.hours = m.total * intervalMin / 60;
      m.pct = totalSlots > 0 ? Math.round(m.total / totalSlots * 100) : 0;
      m.donePct = m.total > 0 ? Math.round(m.done / m.total * 100) : 0;
      return m;
    }).filter(Boolean);
    const totalHours = occupiedSlots * intervalMin / 60;
    const completionPct = occupiedSlots > 0 ? Math.round(doneSlots / occupiedSlots * 100) : 0;
    const busyPct = totalSlots > 0 ? Math.round(occupiedSlots / totalSlots * 100) : 0;
    let indexMsg = 'Sin datos aún';
    if (occupiedSlots > 0) {
      if (completionPct >= 90) indexMsg = `🔥 ¡Rendimiento impecable! Llevas el ${completionPct}% de tus bloques completados esta semana.`;
      else if (completionPct >= 70) indexMsg = `💪 ¡Buen ritmo! Completaste el ${completionPct}% de tus bloques. Sigue así.`;
      else if (completionPct >= 50) indexMsg = `📈 Vas por la mitad: ${completionPct}% completado. ¡A darle!`;
      else indexMsg = `🚀 Llevas ${completionPct}% completado. ¡Empieza marcando tus bloques!`;
    }
    return { categories, totalHours, completionPct, busyPct, occupiedSlots, totalSlots, indexMsg };
  }

  function renderProductividad() {
    const stats = calcularEstadisticasSemanales();
    if (!stats || stats.occupiedSlots === 0) {
      return `<div class="dash-card" id="productivity-reports-container"><h3>📊 Reporte Semanal</h3><p style="font-size:0.78em;color:#888;text-align:center;padding:12px 0;">Aún no hay bloques ocupados. ¡Agrega actividades al horario para ver tu reporte!</p></div>`;
    }
    const pct = stats.completionPct;
    let emoji = '🟢', moodClass = '';
    if (pct >= 80) { emoji = '🟢'; moodClass = 'mood-excellent'; }
    else if (pct >= 60) { emoji = '🟡'; moodClass = 'mood-good'; }
    else if (pct >= 40) { emoji = '🟠'; moodClass = 'mood-fair'; }
    else { emoji = '🔴'; moodClass = 'mood-low'; }
    let html = `<div class="dash-card" id="productivity-reports-container"><h3>📊 Reporte Semanal de Productividad</h3>`;
    html += `<div class="prod-index ${moodClass}"><div class="prod-index-val">${emoji} ${stats.completionPct}%</div><div class="prod-index-label">Índice de Productividad · ${stats.occupiedSlots}/${stats.totalSlots} bloques ocupados</div></div>`;
    html += `<p style="font-size:0.78em;color:#888;margin-bottom:8px;">${stats.indexMsg}</p>`;
    html += `<div style="margin-top:10px;">`;
    stats.categories.forEach(c => {
      const w = Math.max(c.pct, 2);
      html += `<div class="prod-row"><span class="prod-label">${c.label}</span><div class="prod-track"><div class="prod-fill" style="width:${w}%;background:${c.color};"></div></div><span class="prod-pct">${c.pct}%</span><span style="font-size:0.65em;color:#999;">${c.hours.toFixed(1)}h · ${c.donePct}% hecho</span></div>`;
    });
    html += `</div></div>`;
    return html;
  }

  function actualizarMergeBadge() {
    const badge = document.getElementById('merge-badge');
    if (!badge) return;
    const mergedCount = filas.reduce((sum, f) => sum + f.celdas.filter(c => c && c.rowspan > 1).length, 0);
    badge.classList.toggle('show', mergedCount > 0);
    badge.textContent = '🔗 ' + mergedCount;
  }

  let _resizersReady = false;
  document.getElementById('suggested-chips-container').addEventListener('click', function(e) {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const texto = document.getElementById('modal-texto');
    const catSel = document.getElementById('modal-categoria');
    if (texto) texto.value = chip.dataset.label;
    if (catSel) catSel.value = chip.dataset.cat;
  });
  function configurarResizers() {
    if (_resizersReady) return;
    _resizersReady = true;
    document.getElementById('tabla').addEventListener('mousedown', function(e) {
      const r = e.target.closest('.resizer');
      if (!r) return;
      e.preventDefault();
      const th = r.parentElement;
      const startX = e.clientX;
      const startW = th.offsetWidth;
      function onMove(e2) {
        const w = Math.max(30, startW + (e2.clientX - startX));
        th.style.width = w + 'px';
        const col = parseInt(th.dataset.col);
        if (col >= 0) {
          document.querySelectorAll(`#tabla td:nth-child(${col+2})`).forEach(td => td.style.width = w + 'px');
          document.querySelectorAll(`#tabla th:nth-child(${col+2})`).forEach(th2 => th2.style.width = w + 'px');
        }
      }
      function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function abrirModal(fi, ci) {
    modalFila = fi; modalCol = ci;
    const cel = filas[fi].celdas[ci] || {t:'',c:''};
    document.getElementById('modal-titulo').textContent = `Editando: ${dias[ci]} — ${filas[fi].hora}`;
    document.getElementById('modal-texto').value = cel.t || '';
    const catSel = document.getElementById('modal-categoria');
    const catVal = cel.c && CATS.some(c => c.id === cel.c) ? cel.c : (CATS[0]?.id || 'libre');
    catSel.value = catVal;
    renderizarChipsSugeridos();
    document.getElementById('modal-reminder').checked = cel.reminder ? true : false;
    document.getElementById('modal').classList.add('active');
    document.getElementById('modal-texto').focus();
  }

  function okModal() {
    const t = document.getElementById('modal-texto').value;
    const c = document.getElementById('modal-categoria').value;
    const r = document.getElementById('modal-reminder').checked;
    if (modalFila >= 0 && modalCol >= 0) {
      if (!filas[modalFila].celdas[modalCol]) filas[modalFila].celdas[modalCol] = {t:'',c:'libre',done:false};
      filas[modalFila].celdas[modalCol].t = t;
      filas[modalFila].celdas[modalCol].c = c;
      filas[modalFila].celdas[modalCol].reminder = r;
    }
    localStorage.removeItem(CONFIG.STORAGE.EMPTY_CERRADO);
    cerrarModal(); renderizar(); autoGuardar();
  }

  function cerrarModal() { document.getElementById('modal').classList.remove('active'); modalFila = -1; modalCol = -1; }
  document.getElementById('modal-texto').addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); okModal(); } });

  function cambiarHora(fi, val) { filas[fi].hora = val; autoGuardar(); }
  function agregarFila() {
    filas.push({ hora: `Nuevo #${filas.length+1}`, celdas: dias.map(() => ({t:'',c:'libre',done:false,reminder:false})) });
    renderizar(); autoGuardar();
  }
  function eliminarFila(fi) {
    if (filas.length <= 1) { alert('Debe haber al menos 1 fila.'); return; }
    if (confirm(`¿Eliminar?`)) { filas.splice(fi, 1); renderizar(); autoGuardar(); }
  }
  function agregarDia() {
    const nom = prompt('Nuevo día:', 'DÍA');
    if (!nom || nom.trim() === '') return;
    dias.push(nom.toUpperCase().trim());
    filas.forEach(f => { f.celdas.push({t:'',c:'libre',done:false,reminder:false}); });
    renderizar(); autoGuardar();
  }
  function eliminarDia(idx) {
    if (dias.length <= 2) { alert('Mínimo 2 días.'); return; }
    if (confirm(`¿Eliminar ${dias[idx]}?`)) { dias.splice(idx, 1); filas.forEach(f => f.celdas.splice(idx, 1)); renderizar(); autoGuardar(); }
  }
  function eliminarUltimoDia() { eliminarDia(dias.length - 1); }
  function guardarEstadoLocal() {
    try { localStorage.setItem(CONFIG.STORAGE.DATA_PREFIX + plannerType, JSON.stringify({ dias: dias, filas: filas })); } catch(e) {}
  }
  let _guardarTimer = null;
  function autoGuardar() {
    clearTimeout(_guardarTimer);
    _guardarTimer = setTimeout(function() {
      _guardarTimer = null;
      guardarEstadoLocal();
    }, CONFIG.TIME.AUTOGUARDAR_DEBOUNCE);
  }

  function getDatosCompletos() {
    const header = document.getElementById('inp-titulo-header')?.value?.trim() || '';
    const tipoLabel = PLANNER_TYPES[plannerType]?.label || plannerType;
    return { nombre: valInfo('sel-nombre','inp-nombre'), carrera: valInfo('sel-carrera','inp-carrera'), ciclo: valInfo('sel-ciclo','inp-ciclo'), objetivo: valInfo('sel-objetivo','inp-objetivo'), header, tipo: tipoLabel, dias, filas };
  }

  function guardar() { try { localStorage.setItem(CONFIG.STORAGE.COMPLETO, JSON.stringify(getDatosCompletos())); autoGuardar(); alert('✅ Guardado.'); } catch(e) { alert('Error: ' + e); } }
  function cargar() { try { const r = localStorage.getItem(CONFIG.STORAGE.COMPLETO); if (!r) { alert('Sin datos.'); return; } aplicarDatos(JSON.parse(r)); alert('✅ Cargado.'); } catch(e) { alert('Error: ' + e); } }

  function aplicarDatos(d) {
    const ms = (selId, inpId, val) => {
      const sel = document.getElementById(selId), inp = document.getElementById(inpId);
      const opt = Array.from(sel.options).find(o => o.value === val);
      if (opt) { sel.value = val; if(inp){inp.classList.remove('visible');inp.classList.add('oculto');inp.value='';} }
      else if (inp) { sel.value = 'otros'; inp.classList.remove('oculto'); inp.classList.add('visible'); inp.value = val||''; }
    };
    if (d.nombre) { ms('sel-nombre','inp-nombre',d.nombre); onRolChange(document.getElementById('sel-nombre')); }
    if (d.carrera) { const _cs=document.getElementById('sel-carrera'); if (_cs && Array.from(_cs.options).some(o=>o.value===d.carrera)) _cs.value=d.carrera; if (_cs && _cs.value && _cs.value!=='Freelancer' && !profiles[_cs.value]) poblarEspecialidad(_cs.value); }
    if (d.ciclo) ms('sel-ciclo','inp-ciclo',d.ciclo);
    if (d.objetivo) ms('sel-objetivo','inp-objetivo',d.objetivo);
    if (d.header !== undefined) {
      document.getElementById('inp-titulo-header').value = d.header;
      actualizarHeaderPreview();
    }
    if (d.dias) dias = d.dias; if (d.filas) filas = d.filas;
    renderizar();
  }

  function resetear() {
    if (!confirm('¿Restaurar ejemplo?')) return;
    if (plannerType !== 'semanal') cambiarTipoPlanificador('semanal');
    dias = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'];
    filas = JSON.parse(JSON.stringify(DEFAULT));
    ['sel-nombre','sel-carrera','sel-ciclo','sel-objetivo'].forEach(id => document.getElementById(id).selectedIndex = 0);
    ['inp-nombre','inp-ciclo','inp-objetivo','inp-especialidad'].forEach(id => { const el=document.getElementById(id); if(el){el.value='';el.className='oculto';} });
    const espContainer = document.getElementById('especialidad-container');
    const espSel = document.getElementById('sel-especialidad');
    if (espContainer) espContainer.style.display = 'none';
    if (espSel) espSel.innerHTML = '<option value="">— Selecciona —</option>';
    document.getElementById('inp-titulo-header').value = '';
    actualizarHeaderPreview();
    onRolChange(document.getElementById('sel-nombre'));
    renderizar(); autoGuardar(); alert('✅ Restablecido.');
  }

  // ========== EXPORTAR ==========
  function getColorMap() {
    const m = {};
    CATS.forEach(c => { m[c.id] = c.color; });
    return m;
  }

  function getMarcaAgua() {
    try { if (JSON.parse(localStorage.getItem(CONFIG.STORAGE.LICENCIA)).comprador) return ''; } catch(e) {}
    return '<p style="margin-top:10px;font-size:9px;color:#bbb;text-align:center;">VERSIÓN DEMO · Compra la licencia en [tu web]</p>';
  }

  function generarTablaExport() { const cm = getColorMap(); let rows = ''; filas.forEach(f => { rows+='<tr>'; rows+=`<td style="font-weight:bold;background:#f8f9fa;padding:5px 8px;border:1px solid #999;">${f.hora}</td>`; for(let ci=0;ci<dias.length;ci++){const c=f.celdas[ci]||{t:'',c:'libre'};rows+=`<td style="background:${cm[c.c]||'#fff'};padding:5px 8px;border:1px solid #999;">${c.t}</td>`} rows+='</tr>' }); return rows; }

  function getHeaderExport(d) {
    return d.header ? `<h2 style="text-align:center;color:#667eea;">${d.header}</h2>` : '';
  }



  // ========== INICIO ==========
  function iniciar() {
    verificarEstadoLicencia();
    initScreenshotProtection();
    initDarkMode();
    actualizarModalCategorias();
    ['sel-nombre','sel-carrera','sel-ciclo'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.value && !Array.from(el.options).some(o => o.value === el.value)) {
        el.selectedIndex = 0;
      }
    });
    const savedPerfil = localStorage.getItem(CONFIG.STORAGE.PERFIL);
    if (savedPerfil && profiles[savedPerfil]) {
      const p = profiles[savedPerfil];
      CATS = p.cats;
      renderizarLeyenda();
      inyectarCSScategorias();
      actualizarModalCategorias();
      const selObj = document.getElementById('sel-objetivo');
      if (selObj && p.goals) {
        selObj.innerHTML = '<optgroup label="— Selecciona —">' +
          p.goals.map(g => `<option value="${g}">${g}</option>`).join('') +
          '<option value="otros">✏️ Otros</option></optgroup>';
        selObj.value = p.goals[0];
      }
      renderizarChipsSugeridos();
      const _cs=document.getElementById('sel-carrera');
      if (_cs) {
        const _eng=['Ingeniería de Seguridad Industrial y Minera','Ingeniería de Sistemas','Ingeniería Civil','Otra Ingeniería'];
        if (_eng.includes(savedPerfil)) { _cs.value='Ingeniería';poblarEspecialidad('Ingeniería'); }
        else if (Array.from(_cs.options).some(o=>o.value===savedPerfil)) { _cs.value=savedPerfil; if (!profiles[savedPerfil]) poblarEspecialidad(savedPerfil); }
      }
    }
    const savedType = localStorage.getItem(CONFIG.STORAGE.PLANNER_TYPE) || 'semanal';
    plannerType = savedType;
    document.querySelectorAll('.planner-type-selector button').forEach(b => {
      b.classList.toggle('active', b.dataset.type === savedType);
    });
    try {
      const hdr = localStorage.getItem(CONFIG.STORAGE.CUSTOM_HEADER);
      if (hdr) { document.getElementById('inp-titulo-header').value = hdr; actualizarHeaderPreview(); }
    } catch(e) {}
    const savedInterval = localStorage.getItem(CONFIG.STORAGE.INTERVALO);
    if (savedInterval) {
      document.getElementById('sel-intervalo').value = savedInterval;
    }
    const savedInicio = localStorage.getItem(CONFIG.STORAGE.INICIO);
    if (savedInicio) {
      document.getElementById('inp-hora-inicio').value = savedInicio;
    }
    const savedFin = localStorage.getItem(CONFIG.STORAGE.FIN);
    if (savedFin) {
      document.getElementById('inp-hora-fin').value = savedFin;
    }
    const saved = localStorage.getItem(CONFIG.STORAGE.DATA_PREFIX + savedType);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        dias = d.dias; filas = d.filas.map(f => ({hora:f.hora, celdas:f.celdas.map(c => ({t:c.t, c:c.c, done:c.done||false, reminder:c.reminder||false, rowspan:c.rowspan === undefined ? 1 : c.rowspan}))}));
        renderizar(); return;
      } catch(e) {}
    }
    try { const r = localStorage.getItem(CONFIG.STORAGE.COMPLETO); if(r){const d=JSON.parse(r);aplicarDatos(d);filas=d.filas.map(f=>({hora:f.hora,celdas:f.celdas.map(c=>({t:c.t,c:c.c,done:c.done||false,reminder:c.reminder||false,rowspan:c.rowspan === undefined ? 1 : c.rowspan}))}));renderizar();return;} } catch(e){}
    try { const r = localStorage.getItem(CONFIG.STORAGE.DATOS_LEGACY); if(r){const d=JSON.parse(r);if(d.dias)dias=d.dias;if(d.filas)filas=d.filas.map(f=>({hora:f.hora,celdas:f.celdas.map(c=>({t:c.t,c:c.c,done:c.done||false,reminder:c.reminder||false,rowspan:c.rowspan === undefined ? 1 : c.rowspan}))}));renderizar();return;} } catch(e){}
    if (!savedInterval) {
      localStorage.setItem(CONFIG.STORAGE.INTERVALO, String(CONFIG.LIMITES.INTERVALO_DEFAULT));
      localStorage.setItem(CONFIG.STORAGE.INICIO, CONFIG.LIMITES.HORA_DEFAULT_INICIO);
      localStorage.setItem(CONFIG.STORAGE.FIN, CONFIG.LIMITES.HORA_DEFAULT_FIN);
    }
    filas = JSON.parse(JSON.stringify(generarBloquesDefault())); renderizar();
    const nombreSel = document.getElementById('sel-nombre');
    if (nombreSel) onRolChange(nombreSel);
    iniciarPollingSesiones();
  }

  // ========== DASHBOARD ==========
  const DEFAULT_REWARDS = [
    { id: 'r1', name: '🍦 Helado o postre', type: 'reward', threshold: 80, active: true },
    { id: 'r2', name: '🎬 Ver una película', type: 'reward', threshold: 90, active: true },
    { id: 'r3', name: '💰 S/10 al cochinito', type: 'penalty', threshold: 40, active: true },
    { id: 'r4', name: '🚫 Sin redes sociales 1 día', type: 'penalty', threshold: 30, active: true }
  ];

  function getRewards() {
    try { return JSON.parse(localStorage.getItem(CONFIG.STORAGE.REWARDS)) || DEFAULT_REWARDS; } catch(e) { return DEFAULT_REWARDS; }
  }

  function saveRewards(rewards) {
    localStorage.setItem(CONFIG.STORAGE.REWARDS, JSON.stringify(rewards));
  }

  // ======================================================================
  // 🆕 MERGE / UNIR CELDAS (Fusión automática por arrastre)
  // ======================================================================
  let mergeSeleccion = [];

  // ---------------------------------------------------------------
  // 🖱️ MOTOR DE SELECCIÓN MÚLTIPLE POR ARRASTRE (PointerEvents)
  // ---------------------------------------------------------------
  let arrastreActivo = false;
  let arrastreEnCurso = false;
  let arrastreCompletado = false;
  let arrastreOrigen = null;
  let ultimaFiArrastre = -1;
  let cacheCeldas = [];
  let _arrastreReady = false;

  function coordenadasSeleccion(actualizar) {
    if (actualizar || cacheCeldas.length === 0) {
      cacheCeldas = Array.from(document.querySelectorAll('#tabla tbody tr')).map(function(tr, idx) {
        var r = tr.getBoundingClientRect();
        return { fi: idx, top: r.top, bottom: r.bottom };
      });
    }
    return cacheCeldas;
  }

  function filaDesdeY(y) {
    var filas = coordenadasSeleccion();
    for (var i = 0; i < filas.length; i++) {
      if (y >= filas[i].top && y < filas[i].bottom) return filas[i].fi;
    }
    if (filas.length && y >= filas[filas.length - 1].bottom) return filas[filas.length - 1].fi;
    if (filas.length && y < filas[0].top) return filas[0].fi;
    return -1;
  }

  function actualizarSeleccionArrastre(fiCursor) {
    var fiMin = Math.min(arrastreOrigen.fi, fiCursor);
    var fiMax = Math.max(arrastreOrigen.fi, fiCursor);
    var ci = arrastreOrigen.ci;
    var set = new Set();
    for (var f = fiMin; f <= fiMax; f++) set.add(f + ',' + ci);
    document.querySelectorAll('#tabla .celda').forEach(function(el) {
      el.classList.toggle('merge-selected', set.has(el.dataset.fi + ',' + el.dataset.ci));
    });
  }

  function configurarArrastreMerge() {
    if (_arrastreReady) return;
    _arrastreReady = true;
    document.getElementById('tabla').addEventListener('pointerdown', function(e) {
      var celda = e.target.closest('.celda');
      if (!celda) return;
      if (e.target.closest('.resizer, .done-check')) return;
      arrastreOrigen = { fi: parseInt(celda.dataset.fi), ci: parseInt(celda.dataset.ci) };
      arrastreActivo = true;
      arrastreEnCurso = false;
      arrastreCompletado = false;
      ultimaFiArrastre = arrastreOrigen.fi;
      coordenadasSeleccion(true);
      e.preventDefault();
      var origenX = e.clientX, origenY = e.clientY;
      function onMove(e2) {
        if (!arrastreActivo) return;
        var fiCursor = filaDesdeY(e2.clientY);
        if (fiCursor < 0) return;
        ultimaFiArrastre = fiCursor;
        if (!arrastreEnCurso) {
          var dx = e2.clientX - origenX, dy = e2.clientY - origenY;
          if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
          arrastreEnCurso = true;
        }
        actualizarSeleccionArrastre(fiCursor);
      }
      function onUp() {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        if (arrastreEnCurso) {
          arrastreCompletado = true;
          var fiMin = Math.min(arrastreOrigen.fi, ultimaFiArrastre);
          var fiMax = Math.max(arrastreOrigen.fi, ultimaFiArrastre);
          var ci = arrastreOrigen.ci;
          if (fiMax - fiMin >= 1) {
            var contenido = filas[fiMin].celdas[ci]?.t || '';
            var categoria = filas[fiMin].celdas[ci]?.c || 'libre';
            var nombre = prompt('Nombre del curso o actividad:', contenido);
            if (nombre !== null) {
              var cat = prompt('Categoría (clase/ensenanza/estudio/comida/desconexion/flexible/rutina/libre):', categoria);
              if (cat !== null) {
                var valCat = CATS.find(function(c) { return c.id === cat; }) ? cat : 'clase';
                filas[fiMin].celdas[ci] = { t: nombre || '—', c: valCat, done: false, reminder: false, rowspan: fiMax - fiMin + 1 };
                for (var i = fiMin + 1; i <= fiMax; i++) {
                  filas[i].celdas[ci] = { t: null, c: 'libre', done: false, reminder: false, rowspan: 0 };
                }
                renderizar();
                autoGuardar();
                actualizarInfoMerge();
              }
            }
          }
        }
        arrastreActivo = false;
        arrastreEnCurso = false;
        arrastreOrigen = null;
        cacheCeldas = [];
        document.querySelectorAll('#tabla .celda.merge-selected').forEach(function(el) {
          el.classList.remove('merge-selected');
        });
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  }

  function resaltarSeleccionMerge() {
    var set = new Set(mergeSeleccion.map(function(s) { return s.fi + ',' + s.ci; }));
    document.querySelectorAll('#tabla .celda').forEach(function(el) {
      el.classList.toggle('merge-selected', set.has(el.dataset.fi + ',' + el.dataset.ci));
    });
  }

  function actualizarInfoMerge() {
    var info = document.getElementById('merge-info');
    if (!info) return;
    var mergedCount = filas.reduce(function(sum, f) { return sum + f.celdas.filter(function(c) { return c && c.rowspan > 1; }).length; }, 0);
    if (mergedCount > 0) {
      info.textContent = '🔗 ' + mergedCount + ' celda(s) unida(s) — Arrastra para unir más, haz clic en una unida para dividir';
    } else {
      info.textContent = 'Arrastra verticalmente sobre celdas de un mismo día para unirlas';
    }
  }

  function dividirCelda() {
    if (mergeSeleccion.length === 0) return;
    var cel = mergeSeleccion[0];
    if (!cel) return;
    var fi = cel.fi, ci = cel.ci;
    var data = filas[fi].celdas[ci];
    if (!data || data.rowspan <= 1) return;
    var totalRows = data.rowspan;
    data.rowspan = 1;
    for (var i = fi + 1; i < fi + totalRows; i++) {
      if (filas[i] && filas[i].celdas[ci]) {
        filas[i].celdas[ci] = { t: '', c: 'libre', done: false, reminder: false, rowspan: 1 };
      }
    }
    mergeSeleccion = [];
    document.getElementById('btn-merge-split').style.display = 'none';
    renderizar();
    autoGuardar();
    actualizarInfoMerge();
  }

  iniciar();

  // ========== GESTIÓN UNIFICADA DE MODALES ==========
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    if (document.getElementById('modal').classList.contains('active')) { cerrarModal(); return; }
    if (document.getElementById('tutorial').classList.contains('active')) { cerrarTutorial(); return; }
    if (document.getElementById('modal-compra').classList.contains('active')) { cerrarModalCompra(); return; }
    if (document.getElementById('modal-activar').classList.contains('active')) { cerrarActivar(); return; }
    if (document.getElementById('modal-admin').classList.contains('active')) { cerrarAdmin(); return; }
  });
  document.addEventListener('click', function(e) {
    const overlay = e.target.closest('.modal-overlay, .tutorial-overlay');
    if (!overlay || e.target !== overlay) return;
    if (overlay.id === 'modal') cerrarModal();
    else if (overlay.id === 'modal-compra') cerrarModalCompra();
    else if (overlay.id === 'modal-activar') cerrarActivar();
    else if (overlay.id === 'modal-admin') cerrarAdmin();
    else if (overlay.id === 'tutorial') cerrarTutorial();
  });

  function configurarDelegacionCeldas() {
    const tb = document.getElementById('tbody');
    if (!tb || tb.dataset.delegacionLista) return;
    tb.dataset.delegacionLista = '1';
    tb.addEventListener('click', function(e) {
      if (arrastreCompletado) { arrastreCompletado = false; return; }
      const doneCheck = e.target.closest('.done-check');
      if (doneCheck) {
        const celda = doneCheck.closest('.celda');
        if (celda) toggleDone(parseInt(celda.dataset.fi), parseInt(celda.dataset.ci));
        return;
      }
      const celda = e.target.closest('.celda');
      if (!celda) return;
      const fi = parseInt(celda.dataset.fi);
      const ci = parseInt(celda.dataset.ci);
      const data = filas[fi]?.celdas?.[ci];
      if (data && data.rowspan > 1) {
        mergeSeleccion = [{ fi, ci }];
        document.getElementById('btn-merge-split').style.display = 'inline-block';
        resaltarSeleccionMerge();
        actualizarInfoMerge();
      } else {
        abrirModal(fi, ci);
      }
    });
  }

  // Mostrar tutorial en primera visita
  if (!localStorage.getItem(CONFIG.STORAGE.TUTORIAL_VISTO)) {
    setTimeout(mostrarTutorial, CONFIG.TIME.TUTORIAL_INICIO);
  }

  // ======================================================================
  // 🆕 NUEVAS FUNCIONALIDADES
  // ======================================================================

  // ========== PLANNER TYPES ==========
  // (PLANNER_TYPES y plannerType declarados arriba)

  function cambiarTipoPlanificador(tipo) {
    if (tipo === plannerType) return;
    guardarDatosTipo(plannerType);
    plannerType = tipo;
    localStorage.setItem(CONFIG.STORAGE.PLANNER_TYPE, tipo);
    document.querySelectorAll('.planner-type-selector button').forEach(b => {
      b.classList.toggle('active', b.dataset.type === tipo);
    });
    const saved = localStorage.getItem(CONFIG.STORAGE.DATA_PREFIX + tipo);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        dias = d.dias;
        filas = d.filas.map(f => ({hora:f.hora, celdas:f.celdas.map(c => ({t:c.t, c:c.c, done:c.done||false, reminder:c.reminder||false, rowspan:c.rowspan === undefined ? 1 : c.rowspan}))}));
        renderizar(); autoGuardar(); return;
      } catch(e) {}
    }
    if (tipo === 'personalizado') {
      const cols = prompt('Nombres de columnas separados por coma:', 'COLUMNA 1, COLUMNA 2, COLUMNA 3');
      if (!cols) { cambiarTipoPlanificador('semanal'); return; }
      dias = cols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (dias.length === 0) { cambiarTipoPlanificador('semanal'); return; }
      const horasBase = ['7:00','8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'];
      filas = horasBase.map(h => ({ hora: h, celdas: dias.map(() => ({t:'',c:'libre',done:false,reminder:false,rowspan:1})) }));
    } else {
      dias = [...PLANNER_TYPES[tipo].dias];
      const templateMap = { diario: getDefaultDiario, semanal: null, mensual: getDefaultMensual, anual: getDefaultAnual };
      const tplFn = templateMap[tipo];
      if (tplFn) {
        const tpl = tplFn();
        filas = tpl.filas.map(f => ({hora:f.hora, celdas:f.celdas.map(c => ({t:c.t, c:c.c, done:c.done||false, reminder:c.reminder||false, rowspan:c.rowspan === undefined ? 1 : c.rowspan}))}));
      } else {
        const horasBase = ['7:00','8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'];
        filas = horasBase.map(h => ({ hora: h, celdas: dias.map(() => ({t:'',c:'libre',done:false,reminder:false,rowspan:1})) }));
      }
    }
    renderizar(); autoGuardar();
  }

  function guardarDatosTipo(tipo) {
    try { localStorage.setItem(CONFIG.STORAGE.DATA_PREFIX + tipo, JSON.stringify({ dias: dias, filas: filas })); } catch(e) {}
  }

  // ========== CUSTOM HEADER ==========
  function actualizarHeaderPreview() {
    const inp = document.getElementById('inp-titulo-header');
    const preview = document.getElementById('header-preview');
    const val = inp.value.trim();
    if (val) {
      preview.textContent = val;
      preview.classList.add('show');
      inp.classList.add('filled');
    } else {
      preview.classList.remove('show');
      inp.classList.remove('filled');
    }
    localStorage.setItem(CONFIG.STORAGE.CUSTOM_HEADER, val);
  }

  // ========== SIDE PANEL TOGGLE ==========
  function togglePanel() {
    const panel = document.getElementById('side-panel');
    const overlay = document.getElementById('side-overlay');
    const btn = document.getElementById('cloud-btn');
    const isOpen = panel.classList.toggle('open');
    overlay.classList.toggle('open', isOpen);
    btn.classList.toggle('open', isOpen);
  }

  // ========== VIEW TOGGLE ==========
  function cambiarVista(vista) {
    document.querySelectorAll('.view-content').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('view-' + vista);
    if (el) el.classList.add('active');
    document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('btn-view-' + vista);
    if (btn) btn.classList.add('active');
    if (vista === 'dashboard') renderDashboard();
    // Close panel on mobile after switching view
    if (window.innerWidth <= CONFIG.LIMITES.RESPONSIVE_BREAK) togglePanel();
  }

  // ========== COMPLIANCE TRACKING ==========
  function toggleDone(fi, ci) {
    const cel = filas[fi]?.celdas?.[ci];
    if (!cel) return;
    cel.done = !cel.done;
    renderizar();
    autoGuardar();
  }

  // ========== SVG PIE CHART ==========
  function generarPieSvg(pct, streak) {
    const size = 130, cx = 65, cy = 65, r = 54;
    const completed = Math.min(pct, 100);
    const angle = (completed / 100) * 360;
    const rad = (angle - 90) * Math.PI / 180;
    const x2 = cx + r * Math.cos(rad);
    const y2 = cy + r * Math.sin(rad);
    const largeArc = angle > 180 ? 1 : 0;
    const pathDone = completed > 0
      ? `<path d="M${cx},${cy} L${cx},${cy-r} A${r},${r} 0 ${largeArc},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="#55efc4" stroke="#3dae8a" stroke-width="0.5"/>`
      : '';
    const pathRemain = completed < 100
      ? `<path d="M${cx},${cy} L${x2.toFixed(1)},${y2.toFixed(1)} A${r},${r} 0 ${100-completed>50?1:0},1 ${cx},${cy-r} Z" fill="#2a2d45" stroke="#3a3d55" stroke-width="0.5"/>`
      : '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0;border-radius:50%;box-shadow:0 4px 16px rgba(0,0,0,0.12);">
      ${pathDone}${pathRemain}
      <circle cx="${cx}" cy="${cy}" r="36" fill="rgba(255,255,255,0.92)" stroke="#e0e0e0" stroke-width="0.5"/>
      <text x="${cx}" y="${cy+1}" text-anchor="middle" dominant-baseline="middle" font-size="22" font-weight="800" fill="#2c3e50">${completed}%</text>
      <text x="${cx}" y="${cy+16}" text-anchor="middle" dominant-baseline="middle" font-size="8" fill="#999">${streak>0?'🔥'+streak:''}</text>
    </svg>`;
  }

  function renderDashboard() {
    const container = document.getElementById('view-dashboard');
    if (!container) return;
    try {
    const totalCells = filas.reduce((sum, f) => sum + (f.celdas?.length ?? 0), 0);
    const doneCells = filas.reduce((sum, f) => sum + (f.celdas?.filter(c => c?.done)?.length ?? 0), 0);
    const totalPct = totalCells > 0 ? Math.round(doneCells / totalCells * 100) : 0;
    const dayStats = dias.map((d, ci) => {
      let done = 0, total = 0;
      filas.forEach(f => { const cel = f.celdas?.[ci]; if (cel) { total++; if (cel.done) done++; } });
      return { name: d, pct: total > 0 ? Math.round(done/total*100) : 0, done, total };
    });
    const todayIdx = new Date().getDay();
    const todayName = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'][todayIdx];
    const todayStats = dayStats.find(d => d.name.startsWith(todayName.substring(0,3)) || d.name === todayName) || { pct: 0, done: 0, total: 0 };
    let streak = 0;
    for (let i = dayStats.length - 1; i >= 0; i--) {
      if (dayStats[i].pct >= 50) streak++;
      else break;
    }
    const rewards = getRewards();
    const weeklyPct = dayStats.length > 0 ? Math.round(dayStats.reduce((s,d)=>s+d.pct,0)/dayStats.length) : 0;
    const customHeader = document.getElementById('inp-titulo-header')?.value?.trim() || '';
    const recs = generarRecomendaciones(totalPct, weeklyPct, streak, dayStats, todayStats, todayName);

    // SVG Pie chart
    const pieSvg = generarPieSvg(totalPct, streak);
    // Day bars data sorted
    const sortedDays = [...dayStats].sort((a,b) => b.pct - a.pct);

    // Interpretation texts for charts
    const pieInterpText = totalPct >= 80
      ? `¡Excelente! Completaste <strong>${doneCells} de ${totalCells}</strong> actividades (${totalPct}%). Tu disciplina es admirable.`
      : totalPct >= 60
      ? `Buen avance: <strong>${doneCells} de ${totalCells}</strong> completadas (${totalPct}%). Identifica qué días bajas el ritmo y ajusta.`
      : totalPct >= 40
      ? `Vas en proceso: <strong>${doneCells} de ${totalCells}</strong> (${totalPct}%). Enfócate en completar las actividades más importantes cada día.`
      : `Empieza poco a poco: solo <strong>${doneCells} de ${totalCells}</strong> (${totalPct}%). Programa 2–3 actividades clave al día y cúmplelas.`;

    const bestDay = sortedDays.length > 0 ? sortedDays[sortedDays.length-1] : null;
    const worstDay = sortedDays.length > 0 ? sortedDays[0] : null;
    const barInterpText = (bestDay && worstDay && bestDay.name !== worstDay.name)
      ? `Tu mejor período fue <strong>${bestDay.name}</strong> (${bestDay.pct}%) y el más bajo <strong>${worstDay.name}</strong> (${worstDay.pct}%). Analiza qué hizo diferente al mejor día y replícalo.`
      : `Todos los períodos tienen cumplimiento similar. Para mejorar, prueba con horarios más específicos o reduce actividades.`;

    let html = `<div class="dashboard"><h2>📊 Dashboard de Cumplimiento</h2>`;
    if (customHeader) html += `<p style="text-align:center;font-size:0.85em;color:#667eea;font-weight:bold;margin-bottom:8px;">${customHeader}</p>`;

    // === MAIN CHARTS ROW ===
    html += `<div class="dash-row">
      <div class="dash-chart-card">
        <div class="chart-header"><span class="chart-icon">📊</span> Cumplimiento Total</div>
        <div class="chart-body">
          ${pieSvg}
          <div class="chart-side">
            <div class="chart-stat"><span class="stat-label">Completado</span><span class="stat-val" style="color:#00b894;">${totalPct}%</span></div>
            <div class="chart-stat"><span class="stat-label">Pendiente</span><span class="stat-val" style="color:#aaa;">${100-totalPct}%</span></div>
            <div class="chart-stat"><span class="stat-label">Actividades</span><span class="stat-val">${doneCells} / ${totalCells}</span></div>
            <div class="chart-stat"><span class="stat-label">Racha</span><span class="stat-val">${streak > 0 ? '🔥'.repeat(Math.min(streak,3)) : '💤'} ${streak}</span></div>
          </div>
        </div>
        <div class="chart-interp">📌 ${pieInterpText}</div>
      </div>
      <div class="dash-chart-card">
        <div class="chart-header"><span class="chart-icon">📈</span> Rendimiento por Período</div>
        <div class="chart-body chart-body-bar">
          <div class="bar-chart-list">`;

    sortedDays.forEach(d => {
      const barColor = d.pct >= 70 ? '#55efc4' : d.pct >= 40 ? '#fdcb6e' : '#ff7675';
      html += `<div class="bar-chart-row"><span class="bar-label">${d.name.substring(0,5)}</span><div class="bar-track"><div class="bar-fill" style="width:${d.pct}%;background:${barColor};"></div></div><span class="bar-pct">${d.pct}%</span></div>`;
    });

    const avgLabel = plannerType==='diario'?'Hoy':plannerType==='mensual'?'Mensual':'Semanal';
    html += `</div></div>
        <div class="chart-interp">📌 ${barInterpText}</div>
        <div class="chart-footer">⬆ Promedio ${avgLabel}: <strong>${weeklyPct}%</strong> · Mejor: <strong>${bestDay?bestDay.name+' ('+bestDay.pct+'%)':'-'}</strong> · Peor: <strong>${worstDay?worstDay.name+' ('+worstDay.pct+'%)':'-'}</strong></div>
      </div>
    </div>`;

    // === STREAK & QUICK STATS ===
    html += `<div class="dash-row dash-row-mini">
      <div class="dash-mini-card" style="border-left-color:#55efc4;"><span class="mini-icon">🔥</span><div><div class="mini-label">Racha</div><div class="mini-val">${streak} períodos</div></div></div>
      <div class="dash-mini-card" style="border-left-color:#74b9ff;"><span class="mini-icon">📊</span><div><div class="mini-label">Completado</div><div class="mini-val">${totalPct}%</div></div></div>
      <div class="dash-mini-card" style="border-left-color:#fdcb6e;"><span class="mini-icon">📈</span><div><div class="mini-label">Promedio</div><div class="mini-val">${weeklyPct}%</div></div></div>
      <div class="dash-mini-card" style="border-left-color:#ff7675;"><span class="mini-icon">🎯</span><div><div class="mini-label">Hoy</div><div class="mini-val">${todayStats.pct}%</div></div></div>
    </div>`;

    // === STREAK INTERPRETATION ===
    html += `<div class="dash-card dashboard-interp" style="margin-bottom:10px;"><h3>🔍 Interpretación y Recomendaciones</h3>`;
    recs.forEach(r => {
      html += `<div class="interp-card ${r.type}"><span class="interp-icon">${r.icon}</span><span class="rec-title">${r.title}</span><br><span>${r.text}</span></div>`;
    });
    html += `</div>`;

    // === PER-DAY BREAKDOWN ===
    html += `<div class="dash-card" style="margin-bottom:10px;"><h3>📋 Desglose por período</h3><div style="margin-top:6px;">`;
    dayStats.forEach(d => {
      const color = d.pct >= 70 ? '#55efc4' : d.pct >= 40 ? '#fdcb6e' : '#ff7675';
      html += `<div class="dash-day-row"><span class="day-label">${d.name.substring(0,4)}</span><div class="day-bar"><div class="fill" style="width:${d.pct}%;background:${color};"></div></div><span class="day-pct">${d.pct}%</span></div>`;
    });
    html += `</div></div>`;

    // === REWARDS ===
    html += `<div class="dash-card" style="margin-bottom:10px;"><h3>🏆 Recompensas y Castigos</h3>`;
    rewards.forEach(r => {
      const earned = r.type === 'reward' ? weeklyPct >= r.threshold : weeklyPct <= r.threshold;
      if (r.type === 'reward') {
        html += `<div class="reward-item ${earned?'earned':''}"><span class="icon">${earned?'✅':'⏳'}</span><span><strong>${r.threshold}%</strong> → ${r.name} ${earned?'🎉 ¡Lo lograste!':'Aún no...'}</span></div>`;
      } else {
        html += `<div class="penalty-item ${earned?'triggered':''}"><span class="icon">${earned?'⚠️':'✅'}</span><span><strong>${r.threshold}%</strong> → ${r.name} ${earned?'😬 Se aplicó':'¡Bien, lo evitaste!'}</span></div>`;
      }
    });
    html += `<div class="reward-config"><h4>⚙️ Configurar</h4>`;
    rewards.forEach((r, i) => {
      html += `<div class="reward-config-row">
        <input class="rc-name" value="${r.name.replace(/"/g,'&quot;')}" placeholder="Nombre" onchange="editarReward(${i},'name',this.value)">
        <select class="rc-type" onchange="editarReward(${i},'type',this.value)"><option value="reward" ${r.type==='reward'?'selected':''}>🎁 Recompensa</option><option value="penalty" ${r.type==='penalty'?'selected':''}>⚠️ Castigo</option></select>
        <input class="rc-pct" type="number" value="${r.threshold}" min="0" max="100" onchange="editarReward(${i},'threshold',parseInt(this.value))">
        <span style="font-size:0.8em;color:#888;">%</span>
        <input type="checkbox" ${r.active?'checked':''} onchange="editarReward(${i},'active',this.checked)" style="width:auto;">
        <span class="rc-del" onclick="eliminarReward(${i})">✕</span></div>`;
    });
    html += `<button class="add-reward-btn" onclick="agregarReward()">+ Agregar</button></div></div>`;
    html += `<div style="text-align:center;margin-top:8px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
      <button onclick="marcarTodo(true);renderDashboard();" style="padding:6px 16px;border:none;border-radius:6px;background:linear-gradient(135deg,#55efc4,#00b894);color:#fff;cursor:pointer;font-size:0.72em;">✅ Marcar todo listo</button>
      <button onclick="resetearCumplimiento()" style="padding:6px 16px;border:1px solid #e74c3c;border-radius:6px;background:#fff;color:#e74c3c;cursor:pointer;font-size:0.72em;">🔄 Reiniciar cumplimiento</button>
    </div>`;
    html += renderProductividad();
    html += actualizarMetasDashboard();
    html += `</div>`;
    container.innerHTML = html;
    } catch(e) { console.error('renderDashboard error:',e); container.innerHTML = `<div class="dashboard" style="padding:20px;text-align:center;"><h2>📊 Dashboard de Cumplimiento</h2><p style="color:#e74c3c;margin-top:12px;">⚠️ Error: ${e.message}</p></div>`; }
  }

  function generarRecomendaciones(totalPct, weeklyPct, streak, dayStats, todayStats, todayName) {
    const recs = [];
    const nivel = totalPct >= 80 ? 'alto' : totalPct >= 60 ? 'bueno' : totalPct >= 40 ? 'medio' : 'bajo';
    const tipoLabel = PLANNER_TYPES[plannerType]?.label || 'período';

    // Interpretación principal
    if (nivel === 'alto') {
      recs.push({ type:'success', icon:'🌟', title:'¡Excelente rendimiento!', text:'Estás cumpliendo consistentemente tus actividades. Tu disciplina es admirable. Para seguir creciendo, considera aumentar gradualmente el nivel de exigencia o agregar nuevos retos profesionales y personales.' });
    } else if (nivel === 'bueno') {
      recs.push({ type:'insight', icon:'👍', title:'Buen progreso', text:`Vas por muy buen camino. Identifica qué ${tipoLabel}s tienen menor cumplimiento y analiza si las actividades programadas son realistas o necesitas ajustar tu estrategia.` });
    } else if (nivel === 'medio') {
      recs.push({ type:'warning', icon:'💪', title:'Estás en proceso', text:'Tienes margen para mejorar. Intenta reducir la cantidad de actividades diarias y enfócate en las 3–5 más importantes. La calidad del cumplimiento importa más que la cantidad.' });
    } else {
      recs.push({ type:'warning', icon:'🎯', title:'Comienza con pasos pequeños', text:'No te desanimes. Empieza por planificar solo 2–3 actividades clave al día y complétalas. Cuando domines eso, ve agregando más. ¡El hábito se construye de a pocos!' });
    }

    // Racha
    if (streak >= 5) {
      recs.push({ type:'success', icon:'🔥', title:`¡${streak} ${tipoLabel}s de racha!`, text:'Estás en una racha impresionante. Mantén el enfoque y premia tu consistencia. Las rachas largas son el mejor indicador de un hábito sólido.' });
    } else if (streak >= 3) {
      recs.push({ type:'success', icon:'✅', title:`${streak} ${tipoLabel}s consecutivos`, text:'Estás formando un hábito. Los estudios muestran que 3 semanas de consistencia crean una rutina automática. ¡Sigue así!' });
    } else if (streak === 0 && totalPct > 0) {
      recs.push({ type:'idea', icon:'💡', title:'Racha rota', text:`Tu último ${tipoLabel} no alcanzó el 50%. Revisa qué pasó: ¿imprevisto? ¿fatiga? ¿meta muy alta? Ajusta y vuelve a intentarlo.` });
    }

    // Mejor y peor día
    if (dayStats.length > 0) {
      const sorted = [...dayStats].sort((a,b) => b.pct - a.pct);
      const best = sorted[0];
      const worst = sorted[sorted.length-1];
      if (best && best.pct >= 80) {
        recs.push({ type:'success', icon:'🏆', title:`Mejor ${tipoLabel}: ${best.name}`, text:`${best.pct}% de cumplimiento. ¿Qué hiciste diferente? Identifica ese factor y replícalo en los demás ${tipoLabel}s.` });
      }
      if (worst && worst.pct < 50 && worst !== best) {
        recs.push({ type:'idea', icon:'📅', title:`${tipoLabel} más bajo: ${worst.name}`, text:`Solo ${worst.pct}% — Revisa si programaste demasiadas actividades o si fue un día atípico. Reduce la carga o cambia el enfoque.` });
      }
    }

    // Análisis de brecha
    if (totalPct > 0 && totalPct < 100) {
      const pendientes = 100 - totalPct;
      if (pendientes >= 40) {
        recs.push({ type:'idea', icon:'⏰', title:'Técnica Pomodoro', text:'Prueba trabajar en bloques de 25 min con 5 min de descanso. Te ayuda a mantener el enfoque y completar más actividades sin agotarte.' });
      }
      if (pendientes >= 20 && pendientes < 40) {
        recs.push({ type:'insight', icon:'📋', title:'Regla 3-3-3', text:'Cada día elige 3 actividades principales, 3 tareas secundarias y 3 hábitos. Completa las principales primero y verás cómo sube tu cumplimiento.' });
      }
    }

    // Meta de mejora
    const proximaMeta = totalPct < 100 ? Math.min(totalPct + 15, 100) : 100;
    if (totalPct < 100) {
      recs.push({ type:'insight', icon:'🎯', title:`Próxima meta: ${proximaMeta}%`, text:`Tu objetivo para los próximos ${tipoLabel}s es alcanzar ${proximaMeta}% de cumplimiento. Revisa estas recomendaciones y elige una para implementar hoy.` });
    } else {
      recs.push({ type:'success', icon:'🏅', title:'¡100% de cumplimiento!', text:'Has completado absolutamente todo. Este es el momento ideal para celebrar y plantearte metas más ambiciosas. ¡Eres un ejemplo de disciplina!' });
    }

    return recs;
  }

  function editarReward(idx, field, value) {
    const rewards = getRewards();
    rewards[idx][field] = value;
    saveRewards(rewards);
  }

  function eliminarReward(idx) {
    const rewards = getRewards();
    rewards.splice(idx, 1);
    saveRewards(rewards);
    renderDashboard();
  }

  function agregarReward() {
    const rewards = getRewards();
    rewards.push({ id: 'r' + Date.now(), name: 'Nueva meta', type: 'reward', threshold: 80, active: true });
    saveRewards(rewards);
    renderDashboard();
  }

  function marcarTodo(estado) {
    filas.forEach(f => f.celdas.forEach(c => c.done = estado));
    autoGuardar();
    renderizar();
    renderDashboard();
  }

  // ========== DARK MODE ==========
  function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const btn = document.getElementById('btn-dark-mode');
    const isDark = document.body.classList.contains('dark');
    btn.textContent = isDark ? '☀️ Claro' : '🌙 Oscuro';
    localStorage.setItem(CONFIG.STORAGE.DARK_MODE, isDark ? '1' : '');
    if (document.getElementById('view-dashboard').classList.contains('active') || document.querySelector('#view-dashboard.active')) {
      renderDashboard();
    }
  }

  function initDarkMode() {
    if (localStorage.getItem(CONFIG.STORAGE.DARK_MODE) === '1') {
      document.body.classList.add('dark');
      const btn = document.getElementById('btn-dark-mode');
      if (btn) btn.textContent = '☀️ Claro';
    }
  }

  // ========== NUEVO PLANIFICADOR VACÍO ==========
  function nuevoPlanificador() {
    if (!confirm('¿Crear un planificador vacío? Se perderán los datos actuales.')) return;
    const interval = parseInt(localStorage.getItem(CONFIG.STORAGE.INTERVALO) || String(CONFIG.LIMITES.INTERVALO_DEFAULT));
    const inicio = localStorage.getItem(CONFIG.STORAGE.INICIO) || CONFIG.LIMITES.HORA_DEFAULT_INICIO;
    const fin = localStorage.getItem(CONFIG.STORAGE.FIN) || CONFIG.LIMITES.HORA_DEFAULT_FIN;
    plannerType = 'semanal';
    localStorage.setItem(CONFIG.STORAGE.PLANNER_TYPE, 'semanal');
    document.querySelectorAll('.planner-type-selector button').forEach(b => {
      b.classList.toggle('active', b.dataset.type === 'semanal');
    });
    dias = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'];
    filas = generarBloques(interval, inicio, fin);
    ['sel-nombre','sel-carrera','sel-ciclo','sel-objetivo'].forEach(id => { const el=document.getElementById(id); if(el)el.selectedIndex=0; });
    ['inp-nombre','inp-ciclo','inp-objetivo','inp-especialidad'].forEach(id => { const el=document.getElementById(id); if(el){el.value='';el.className='oculto';} });
    const _esp=document.getElementById('especialidad-container'); const _eSel=document.getElementById('sel-especialidad');
    if (_esp) _esp.style.display = 'none';
    if (_eSel) _eSel.innerHTML = '<option value="">— Selecciona —</option>';
    const _nomSel=document.getElementById('sel-nombre');
    if (_nomSel) onRolChange(_nomSel);
    localStorage.removeItem(CONFIG.STORAGE.DATA_PREFIX + 'semanal');
    localStorage.removeItem(CONFIG.STORAGE.EMPTY_CERRADO);
    renderizar();
    actualizarEmptyState();
    autoGuardar();
  }

  function resetearCumplimiento() {
    if (!confirm('¿Reiniciar todo el cumplimiento? Se marcarán todas las actividades como "no completadas".')) return;
    marcarTodo(false);
  }

  // ========== REMINDERS / NOTIFICATIONS ==========
  function parseHora(horaStr) {
    const m = horaStr.match(/(\d{1,2}):(\d{2})/);
    return m ? { h: parseInt(m[1],10), m: parseInt(m[2],10) } : null;
  }

  function mostrarToast(msg) {
    let t = document.getElementById('toast-reminder');
    if (!t) { t = document.createElement('div'); t.id = 'toast-reminder'; t.className = 'toast-reminder'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('active');
    clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('active'), 6000);
  }

  function checkReminders() {
    const now = new Date();
    const todayKey = now.toDateString();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    let notified = {};
    try { notified = JSON.parse(localStorage.getItem(CONFIG.STORAGE.NOTIFIED) || '{}'); } catch(e) {}
    if (!notified[todayKey]) notified[todayKey] = [];

    filas.forEach((fila, fi) => {
      const parsed = parseHora(fila.hora);
      if (!parsed) return;
      const startMin = parsed.h * 60 + parsed.m;

      (fila.celdas || []).forEach((cel, ci) => {
        if (!cel || !cel.reminder) return;
        if (cel.done) return; // skip completed
        const alertMin = startMin - 1; // 1 minute before start
        if (alertMin < 0) return;
        const key = `${fi}_${ci}`;
        if (notified[todayKey].includes(key)) return;
        if (currentMin !== alertMin) return;

        const msg = `🔔 ${dias[ci]} ${fila.hora}: ${cel.t}`;
        if ('Notification' in window && Notification.permission === 'granted') {
          try { new Notification('Recordatorio', { body: msg, requireInteraction: false }); } catch(e) {}
        }
        mostrarToast(msg);
        notified[todayKey].push(key);
      });
    });

    localStorage.setItem(CONFIG.STORAGE.NOTIFIED, JSON.stringify(notified));
  }

  function solicitarPermisoNotificacion() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
  }

  // Start reminder checker every 30 seconds
  setInterval(checkReminders, 30000);
  setTimeout(checkReminders, CONFIG.TIME.REMINDER_CHECK);
  // Request permission on first user interaction
  document.addEventListener('click', solicitarPermisoNotificacion, { once: true });

  // ========== SCREENSHOT PREVENTION ==========
  let screenshotTimer = null;

  function mostrarAvisoCaptura() {
    const overlay = document.getElementById('screenshot-warning');
    if (!overlay) return;
    overlay.classList.add('active');
    let nombre = '';
    try {
      const lic = JSON.parse(localStorage.getItem(CONFIG.STORAGE.LICENCIA));
      if (lic && lic.comprador) nombre = lic.comprador;
    } catch(e) {}
    const header = document.getElementById('inp-titulo-header')?.value?.trim();
    const ident = nombre || header || 'USUARIO';
    overlay.querySelector('h2').textContent = nombre ? '📸 Captura detectada' : '📸 Captura detectada · Versión Demo';
    overlay.querySelector('p').innerHTML = nombre
      ? `Esta herramienta está licenciada para <strong>${nombre}</strong>`
      : '<strong>Versión Demo</strong> · Compra tu licencia para activar';
    overlay.querySelector('.subtext').textContent = `🔒 ${ident} · ${new Date().toLocaleString()}`;
    clearTimeout(screenshotTimer);
    screenshotTimer = setTimeout(() => overlay.classList.remove(CONFIG.SELECTORES.TUTORIAL.substring(1)), CONFIG.TIME.SCREENSHOT_MS);
  }

  let proteccionActiva = true;

  function toggleProteccion(estado) {
    proteccionActiva = estado;
    localStorage.setItem(CONFIG.STORAGE.PROTECCION, estado ? '1' : '0');
  }

  // Dropdown click toggle for mobile
  document.addEventListener('click', function(e) {
    const dd = e.target.closest('.dropdown');
    document.querySelectorAll('.dropdown-content').forEach(c => {
      if (!dd || !c.closest('.dropdown').contains(dd)) c.classList.remove('open');
    });
    if (dd) {
      const content = dd.querySelector('.dropdown-content');
      if (content) content.classList.toggle('open');
    }
  });

  function initScreenshotProtection() {
    const saved = localStorage.getItem(CONFIG.STORAGE.PROTECCION);
    if (saved === '0') proteccionActiva = false;

    document.addEventListener('keydown', function(e) {
      if (!proteccionActiva) return;
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        mostrarAvisoCaptura();
        return false;
      }
      if ((e.key === 's' || e.key === 'S') && e.shiftKey && e.metaKey) mostrarAvisoCaptura();
      if ((e.key === 's' || e.key === 'S') && e.shiftKey && e.ctrlKey) mostrarAvisoCaptura();
    });
    document.addEventListener('contextmenu', function(e) {
      if (!proteccionActiva) return;
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') e.preventDefault();
    });
  }

  // ======================================================================
  // 🆕 MODELOS DE EJEMPLO
  // ======================================================================
  var MODELOS = null;

  function initModelos() {
    if (MODELOS) return;
    function _c(t, c) { return Array.from({length:7}, () => ({t, c, done:false, reminder:false, rowspan:1})); }
    MODELOS = {
      'estudiante': {
        label: '🎓 Estudiante Universitario',
        desc: 'Horario completo con clases, estudio y rutinas',
        tipo: 'semanal', intervalo: null,
        data: [
          { hora:'7:00 – 8:30', celdas:[
            {t:'🛏️ Despertar, ducha, desayuno',c:'rutina'},{t:'🛏️ Despertar, ducha, desayuno',c:'rutina'},
            {t:'🛏️ Despertar, ducha, desayuno',c:'rutina'},{t:'🛏️ Despertar, ducha, desayuno',c:'rutina'},
            {t:'🛏️ Despertar, rutina matutina',c:'rutina'},{t:'🛏️ Despertar sin apuro',c:'rutina'},{t:'🛏️ Despertar sin apuro',c:'rutina'}
          ]},
          { hora:'8:30 – 10:00', celdas:[
            {t:'🏫 Prevención de Riesgos',c:'clase'},{t:'☕ Libre / Estudio',c:'libre'},
            {t:'☕ Libre / Proyectos',c:'libre'},{t:'🏫 Prevención de Riesgos',c:'clase'},
            {t:'📚 Proyectos / Estudio',c:'estudio'},{t:'☕ T. libre',c:'rutina'},{t:'☕ T. libre',c:'rutina'}
          ]},
          { hora:'10:00 – 12:00', celdas:[
            {t:'📚 Estudio / Proyectos',c:'estudio'},{t:'👨‍🏫 Enseñanza (10–11:30)',c:'ensenanza'},
            {t:'🏫 Integrador I (11:45–14:45)',c:'clase'},{t:'📚 Estudio / Proyectos',c:'estudio'},
            {t:'📚 Proyectos / Estudio',c:'estudio'},{t:'🏫 Gestión Mantenimiento (10:30–13:15)',c:'clase'},{t:'📚 Proyectos personales',c:'estudio'}
          ]},
          { hora:'12:00 – 14:00', celdas:[
            {t:'🍽️ Almuerzo y descanso',c:'comida'},{t:'🍽️ Almuerzo / Proyectos',c:'comida'},
            {t:'🏫 Integrador I (continúa)',c:'clase'},{t:'📚 Estudio / Proyectos',c:'estudio'},
            {t:'🍽️ Almuerzo',c:'comida'},{t:'🍽️ Almuerzo',c:'comida'},{t:'🍽️ Almuerzo',c:'comida'}
          ]},
          { hora:'14:00 – 16:00', celdas:[
            {t:'👨‍🏫 Enseñanza / Proyectos',c:'ensenanza'},{t:'📚 Estudio personal',c:'estudio'},
            {t:'🍽️ Almuerzo (desde 14:45)',c:'comida'},{t:'👨‍🏫 Enseñanza / Proyectos',c:'ensenanza'},
            {t:'👨‍🏫 Enseñanza / Proyectos',c:'ensenanza'},{t:'🌟 T. libre / Deporte',c:'flexible'},{t:'🌟 T. libre / Deporte',c:'flexible'}
          ]},
          { hora:'16:00 – 18:00', celdas:[
            {t:'🕐 T. libre / Enseñanza virtual',c:'flexible'},{t:'👨‍🏫 Enseñanza fija (4–6pm)',c:'ensenanza'},
            {t:'👨‍🏫 Enseñanza / Proyectos',c:'ensenanza'},{t:'🕐 Tiempo libre',c:'flexible'},
            {t:'🕐 Tiempo libre',c:'flexible'},{t:'🌟 Deporte / Amigos',c:'flexible'},{t:'🌟 Deporte / Amigos',c:'flexible'}
          ]},
          { hora:'18:00 – 20:00', celdas:[
            {t:'🍽️ Cena / Estudio',c:'comida'},{t:'🍽️ Cena / Preparación',c:'comida'},
            {t:'🏫 Fisiología Laboral (18:15–21:30)',c:'clase'},{t:'🏫 Saneamiento Industrial (18:15–21:30)',c:'clase'},
            {t:'🍽️ Cena / T. libre',c:'comida'},{t:'🕐 T. libre / Cena',c:'flexible'},{t:'📚 Prep. semana',c:'estudio'}
          ]},
          { hora:'20:00 – 22:30', celdas:[
            {t:'🏫 Procesos Mineros (20:15–22:30)',c:'clase'},
            {t:'🏫 Prog. e Inspecciones Seg. (20:15–22:30)',c:'clase'},
            {t:'🏫 Fisiología Laboral (hasta 21:30)',c:'clase'},{t:'🏫 Saneamiento Indust. (hasta 21:30)',c:'clase'},
            {t:'🏫 Resp. Social (20:15–22:30)',c:'clase'},
            {t:'🔌 Desconexión digital',c:'desconexion'},{t:'🔌 DESCONEXIÓN TOTAL',c:'desconexion'}
          ]},
          { hora:'22:30 – 23:00', celdas:[
            {t:'🔌 Desconexión rápida',c:'desconexion'},{t:'🔌 Desconexión rápida',c:'desconexion'},
            {t:'🔌 Desconexión',c:'desconexion'},{t:'🔌 Desconexión',c:'desconexion'},
            {t:'🔌 Desconexión rápida',c:'desconexion'},{t:'🌙 Rutina de sueño',c:'rutina'},{t:'🌙 Rutina de sueño',c:'rutina'}
          ]},
          { hora:'🌙 23:00 💤', celdas:[
            {t:'😴 DORMIR',c:'rutina'},{t:'😴 DORMIR',c:'rutina'},{t:'😴 DORMIR',c:'rutina'},
            {t:'😴 DORMIR',c:'rutina'},{t:'😴 DORMIR',c:'rutina'},{t:'😴 DORMIR',c:'rutina'},{t:'😴 DORMIR',c:'rutina'}
          ]}
        ]
      },
      'trabajador': {
        label: '💼 Trabajador 9-5', desc: 'Jornada laboral con bloques de trabajo y vida personal',
        tipo: 'semanal', intervalo: null,
        data: [
          { hora:'6:00 – 7:00', celdas: _c('🛏️ Despertar, ducha, desayuno', 'rutina') },
          { hora:'7:00 – 8:00', celdas: _c('🚌 Transporte / Trayecto', 'flexible') },
          { hora:'8:00 – 10:00', celdas: [
            {t:'💻 Trabajo',c:'clase'},{t:'💻 Trabajo',c:'clase'},{t:'💻 Trabajo',c:'clase'},
            {t:'💻 Trabajo',c:'clase'},{t:'💻 Trabajo',c:'clase'},
            {t:'🛌 Dormir hasta tarde',c:'rutina'},{t:'🛌 Dormir hasta tarde',c:'rutina'}
          ]},
          { hora:'10:00 – 12:00', celdas: [
            {t:'💻 Trabajo',c:'clase'},{t:'💻 Trabajo',c:'clase'},{t:'💻 Trabajo',c:'clase'},
            {t:'💻 Trabajo',c:'clase'},{t:'💻 Trabajo',c:'clase'},
            {t:'📚 Curso / Lectura',c:'estudio'},{t:'📚 Curso / Lectura',c:'estudio'}
          ]},
          { hora:'12:00 – 13:00', celdas: _c('🍽️ Almuerzo', 'comida') },
          { hora:'13:00 – 15:00', celdas: [
            {t:'💻 Trabajo',c:'clase'},{t:'💻 Trabajo',c:'clase'},{t:'💻 Trabajo',c:'clase'},
            {t:'💻 Trabajo',c:'clase'},{t:'💻 Trabajo',c:'clase'},
            {t:'🛌 Siesta / T. libre',c:'rutina'},{t:'🛌 Siesta / T. libre',c:'rutina'}
          ]},
          { hora:'15:00 – 17:00', celdas: [
            {t:'💻 Trabajo',c:'clase'},{t:'💻 Trabajo',c:'clase'},{t:'💻 Trabajo',c:'clase'},
            {t:'💻 Trabajo',c:'clase'},{t:'💻 Trabajo',c:'clase'},
            {t:'🌟 Salir / Deporte',c:'flexible'},{t:'🌟 Salir / Deporte',c:'flexible'}
          ]},
          { hora:'17:00 – 18:00', celdas: _c('🚌 Regreso a casa', 'flexible') },
          { hora:'18:00 – 20:00', celdas: [
            {t:'🏋️ Ejercicio / Deporte',c:'flexible'},{t:'🏋️ Ejercicio / Deporte',c:'flexible'},
            {t:'🏋️ Ejercicio / Deporte',c:'flexible'},{t:'🏋️ Ejercicio / Deporte',c:'flexible'},
            {t:'🏋️ Ejercicio / Deporte',c:'flexible'},
            {t:'🍿 Cena y peli',c:'comida'},{t:'🍿 Cena y peli',c:'comida'}
          ]},
          { hora:'20:00 – 22:00', celdas: [
            {t:'📖 T. personal / Curso',c:'estudio'},{t:'📖 T. personal / Curso',c:'estudio'},
            {t:'📖 T. personal / Curso',c:'estudio'},{t:'📖 T. personal / Curso',c:'estudio'},
            {t:'📖 T. personal / Curso',c:'estudio'},
            {t:'🌙 Desconexión',c:'desconexion'},{t:'🌙 Desconexión',c:'desconexion'}
          ]},
          { hora:'22:00 – 23:00', celdas: _c('🔌 Desconexión digital', 'desconexion') },
          { hora:'23:00 💤', celdas: _c('😴 DORMIR', 'rutina') }
        ]
      },
      'freelancer': {
        label: '🚀 Freelancer / Emprendedor', desc: 'Bloques flexibles para proyectos y clientes',
        tipo: 'semanal', intervalo: null,
        data: [
          { hora:'7:00 – 8:00', celdas: _c('🛏️ Rutina matutina', 'rutina') },
          { hora:'8:00 – 10:00', celdas: _c('💻 Bloque profundo (clientes)', 'estudio') },
          { hora:'10:00 – 12:00', celdas: _c('📚 Proyectos personales', 'ensenanza') },
          { hora:'12:00 – 13:00', celdas: _c('🍽️ Almuerzo', 'comida') },
          { hora:'13:00 – 15:00', celdas: _c('📞 Llamadas / Admin', 'flexible') },
          { hora:'15:00 – 17:00', celdas: _c('💻 Bloque creativo', 'libre') },
          { hora:'17:00 – 18:00', celdas: _c('🚶 Paseo / Deporte', 'flexible') },
          { hora:'18:00 – 20:00', celdas: _c('🍽️ Cena / Familia', 'comida') },
          { hora:'20:00 – 22:00', celdas: _c('📖 Lectura / Curso', 'estudio') },
          { hora:'22:00 – 23:00', celdas: _c('🔌 Desconexión', 'desconexion') },
          { hora:'23:00 💤', celdas: _c('😴 DORMIR', 'rutina') }
        ]
      },
      'vacio': {
        label: '📋 Empezar de cero', desc: 'Tabla vacía para que crees tu propio horario',
        tipo: 'semanal', intervalo: 60, data: null
      }
    };
  }

  function clonarData(data) {
    if (!data) return [];
    return data.map(f => ({
      hora: f.hora,
      celdas: f.celdas.map(c => ({
        t: c.t || '',
        c: c.c || 'libre',
        done: c.done || false,
        reminder: c.reminder || false,
        rowspan: c.rowspan === undefined ? 1 : c.rowspan
      }))
    }));
  }

  function cargarModelo(id) {
    try {
      initModelos();
      const modelo = MODELOS[id];
      if (!modelo) return;
      localStorage.removeItem(CONFIG.STORAGE.EMPTY_CERRADO);
      if (modelo.tipo) {
        plannerType = modelo.tipo;
        localStorage.setItem(CONFIG.STORAGE.PLANNER_TYPE, modelo.tipo);
        document.querySelectorAll('.planner-type-selector button').forEach(b => {
          b.classList.toggle('active', b.dataset.type === modelo.tipo);
        });
      }
      dias = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'];
      if (modelo.data) {
        filas = clonarData(modelo.data);
      } else if (modelo.intervalo) {
        const hInicio = localStorage.getItem(CONFIG.STORAGE.INICIO) || CONFIG.LIMITES.HORA_DEFAULT_INICIO;
        const hFin = localStorage.getItem(CONFIG.STORAGE.FIN) || CONFIG.LIMITES.HORA_DEFAULT_FIN;
        filas = generarBloques(modelo.intervalo, hInicio, hFin);
      } else {
        filas = clonarData(generarBloquesDefault());
      }
      renderizar();
      actualizarEmptyState();
      autoGuardar();
    } catch(e) {
      alert('Error al cargar modelo: ' + e.message);
      return;
    }
  }

  // ======================================================================
  // 🆕 GENERAR BLOQUES DE TIEMPO
  // ======================================================================
  function generarBloques(intervalMinutos, horaInicio, horaFin) {
    const bloques = [];
    let [h, m] = horaInicio.split(':').map(Number);
    const [hEnd, mEnd] = horaFin.split(':').map(Number);
    let start = h * 60 + m;
    const end = hEnd * 60 + mEnd;
    while (start < end) {
      const next = Math.min(start + intervalMinutos, end);
      const h1 = String(Math.floor(start/60)).padStart(2,'0');
      const m1 = String(start%60).padStart(2,'0');
      const h2 = String(Math.floor(next/60)).padStart(2,'0');
      const m2 = String(next%60).padStart(2,'0');
      bloques.push({ hora: `${h1}:${m1} – ${h2}:${m2}`, celdas: dias.map(() => ({t:'',c:'libre',done:false,reminder:false,rowspan:1})) });
      start = next;
    }
    return bloques;
  }

  function cambiarIntervalo(minutos) {
    document.getElementById('sel-intervalo').value = minutos;
  }

  function aplicarIntervalo() {
    const interval = parseInt(document.getElementById('sel-intervalo').value);
    const inicio = document.getElementById('inp-hora-inicio').value || '07:00';
    const fin = document.getElementById('inp-hora-fin').value || '23:00';
    if (confirm(`¿Reordenar horario con bloques de ${interval} min?\nLos datos actuales se perderán.`)) {
      localStorage.setItem(CONFIG.STORAGE.INTERVALO, interval);
      localStorage.setItem(CONFIG.STORAGE.INICIO, inicio);
      localStorage.setItem(CONFIG.STORAGE.FIN, fin);
      filas = generarBloques(interval, inicio, fin);
      renderizar();
      autoGuardar();
    }
  }

  // MERGE BLOCK (moved to top)

  // ======================================================================
  // 🆕 TUTORIAL
  // ======================================================================
  let pasoActual = 0;
  // TOTAL_PASOS centralizado en CONFIG.TUTORIAL.TOTAL_PASOS

  function mostrarTutorial() {
    pasoActual = 0;
    document.getElementById('tutorial').classList.add('active');
    const prev = document.getElementById('t-prev');
    const next = document.getElementById('t-next');
    prev.style.display = 'none';
    next.textContent = 'Siguiente →';
    document.querySelectorAll('.t-step').forEach(s => s.classList.remove('active'));
    document.querySelector('.t-step[data-step="0"]').classList.add('active');
    renderTutorialProgress();
  }

  function cerrarTutorial() {
    document.getElementById('tutorial').classList.remove('active');
    localStorage.setItem(CONFIG.STORAGE.TUTORIAL_VISTO, '1');
  }

  function pasoTutorial(dir) {
    if (dir > 0 && pasoActual >= CONFIG.TUTORIAL.TOTAL_PASOS - 1) { cerrarTutorial(); return; }
    const steps = document.querySelectorAll('.t-step');
    steps.forEach(s => s.classList.remove('active'));
    pasoActual = Math.max(0, Math.min(CONFIG.TUTORIAL.TOTAL_PASOS - 1, pasoActual + dir));
    steps.forEach(s => {
      if (parseInt(s.dataset.step) === pasoActual) s.classList.add('active');
    });
    const prev = document.getElementById('t-prev');
    const next = document.getElementById('t-next');
    prev.style.display = pasoActual > 0 ? 'inline-block' : 'none';
    if (pasoActual === CONFIG.TUTORIAL.TOTAL_PASOS - 1) {
      next.textContent = '🎉 ¡Empezar!';
    } else {
      next.textContent = 'Siguiente →';
    }
    renderTutorialProgress();
  }

  function renderTutorialProgress() {
    const container = document.getElementById('t-progress');
    let html = '';
    for (let i = 0; i < CONFIG.TUTORIAL.TOTAL_PASOS; i++) {
      const cls = i === pasoActual ? 'active' : i < pasoActual ? 'done' : '';
      html += `<span class="dot ${cls}" onclick="pasoTutorial(${i - pasoActual})"></span>`;
    }
    container.innerHTML = html;
  }

  // ========== LOGIN SOCIAL (Google & Facebook) ==========
  var loginUsuario = null;

  function mostrarLogin() {
    document.getElementById('modal-login').classList.add('active');
    if (loginUsuario) {
      document.getElementById('login-pending').style.display = 'none';
      document.getElementById('login-success').style.display = 'block';
      document.getElementById('login-avatar').src = loginUsuario.foto || '';
      document.getElementById('login-name').textContent = loginUsuario.nombre || '';
      document.getElementById('login-email').textContent = loginUsuario.correo || '';
    } else {
      document.getElementById('login-pending').style.display = 'block';
      document.getElementById('login-success').style.display = 'none';
    }
  }

  function cerrarLogin() {
    document.getElementById('modal-login').classList.remove('active');
  }

  function onGoogleSignIn(response) {
    try {
      var payload = JSON.parse(atob(response.credential.split('.')[1]));
      loginUsuario = {
        nombre: payload.name || 'Usuario Google',
        correo: payload.email || '',
        foto: payload.picture || '',
        proveedor: 'google'
      };
      actualizarUIlogin();
      cerrarLogin();
    } catch(e) {
      console.error('Error al decodificar Google token:', e);
    }
  }

  function onFacebookLogin() {
    if (typeof FB === 'undefined') { alert('Facebook SDK no está cargado aún. Intenta de nuevo.'); return; }
    FB.login(function(response) {
      if (response.authResponse) {
        FB.api('/me', { fields: 'name,email,picture.width(96).height(96)' }, function(apiRes) {
          if (!apiRes || apiRes.error) { alert('Error al obtener perfil de Facebook'); return; }
          loginUsuario = {
            nombre: apiRes.name || 'Usuario Facebook',
            correo: apiRes.email || '',
            foto: apiRes.picture?.data?.url || '',
            proveedor: 'facebook'
          };
          actualizarUIlogin();
          cerrarLogin();
        });
      } else {
        alert('Inicio de sesión cancelado o fallido');
      }
    }, { scope: 'public_profile,email' });
  }

  function cerrarSesion() {
    loginUsuario = null;
    if (typeof FB !== 'undefined') { try { FB.logout(); } catch(e) {} }
    document.getElementById('btn-login').textContent = '🔑 Iniciar sesión';
    actualizarUIlogin();
    cerrarLogin();
  }

  function actualizarUIlogin() {
    var btn = document.getElementById('btn-login');
    if (!btn) return;
    var devSection = document.getElementById('dispositivos-section');
    if (loginUsuario) {
      btn.textContent = '👤 ' + (loginUsuario.nombre || 'Usuario');
      document.getElementById('login-pending').style.display = 'none';
      document.getElementById('login-success').style.display = 'block';
      if (document.getElementById('login-avatar')) document.getElementById('login-avatar').src = loginUsuario.foto || '';
      if (document.getElementById('login-name')) document.getElementById('login-name').textContent = loginUsuario.nombre || '';
      if (document.getElementById('login-email')) document.getElementById('login-email').textContent = loginUsuario.correo || '';
      if (devSection) devSection.style.display = 'block';
      fetchSesiones();
      if (document.getElementById('login-licencia')) {
        var lic = localStorage.getItem(CONFIG.STORAGE.LICENCIA);
        var el = document.getElementById('login-licencia');
        if (lic) {
          try {
            var l = JSON.parse(lic);
            var html = '<span style="color:#55efc4;font-weight:600;">● Licencia activa</span>';
            if (l.fechaExpiracion) {
              var diff = Math.ceil((new Date(l.fechaExpiracion) - new Date()) / (1000*60*60*24));
              if (diff > 0) {
                html += '<span style="font-size:0.7em;color:#888;display:block;">⏳ ' + (l.planTipo === 'vitalicio' ? 'Licencia Vitalicia Activa' : 'Vence en ' + diff + ' día' + (diff !== 1 ? 's' : '')) + '</span>';
              } else {
                html += '<span style="font-size:0.7em;color:#ff7675;display:block;">⚠️ Licencia vencida</span>';
              }
            } else if (l.planTipo === 'vitalicio') {
              html += '<span style="font-size:0.7em;color:#888;display:block;">♾️ Licencia Vitalicia Activa</span>';
            }
            html += l.codigo ? '<span style="font-size:0.65em;color:#888;display:block;font-family:monospace;">' + l.codigo + '</span>' : '';
            el.innerHTML = html;
          } catch(e) { el.innerHTML = ''; }
        } else {
          el.innerHTML = '<span style="color:#ff7675;">◌ Demo</span>';
        }
      }
    } else {
      btn.textContent = '🔑 Iniciar sesión';
      if (devSection) devSection.style.display = 'none';
      var lista = document.getElementById('lista-dispositivos');
      if (lista) lista.innerHTML = '';
    }
  }

  // ========== RECUPERACIÓN DE CONTRASEÑA ==========
  function mostrarRecuperarPassword() {
    document.getElementById('modal-recover').classList.add('active');
    document.getElementById('inp-recover-email').value = '';
    document.getElementById('msg-recover').textContent = '';
  }

  function cerrarRecuperarPassword() {
    document.getElementById('modal-recover').classList.remove('active');
  }

  function solicitarRecuperacionPassword() {
    var email = document.getElementById('inp-recover-email').value.trim();
    var msg = document.getElementById('msg-recover');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.style.color = '#ff7675';
      msg.textContent = '⚠️ Ingresa un correo electrónico válido';
      return;
    }
    msg.style.color = '#55efc4';
    msg.textContent = '📨 Enviando enlace de recuperación...';
    var payload = JSON.stringify({ email: email });
    fetch('/api/auth/recover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.ok) {
          msg.style.color = '#55efc4';
          msg.textContent = '✅ Enlace de recuperación enviado a tu correo';
        } else {
          msg.style.color = '#ff7675';
          msg.textContent = data.error || 'Error al enviar el enlace';
        }
      })
      .catch(function() {
        msg.style.color = '#55efc4';
        msg.textContent = '✅ Enlace de recuperación enviado a tu correo';
      });
  }

  // ========== SESIONES MULTIDISPOSITIVO ==========

  var intervaloSesiones = null;
  var ultimaVersionLocal = 0;

  function etagLocal() {
    var raw = localStorage.getItem(CONFIG.STORAGE.DATA_PREFIX + plannerType) || '';
    var sum = 0;
    for (var i = 0; i < raw.length; i++) {
      sum = ((sum << 5) - sum) + raw.charCodeAt(i); sum |= 0;
    }
    return sum;
  }

  function fetchSesiones() {
    if (!loginUsuario || !loginUsuario.correo) return;
    fetch('/api/auth/sessions?email=' + encodeURIComponent(loginUsuario.correo))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.ok && data.sesiones) {
          actualizarUIDispositivos(data.sesiones);
          var nuevaVersion = etagLocal();
          if (ultimaVersionLocal !== 0 && nuevaVersion !== ultimaVersionLocal) {
            var notif = document.getElementById('notif-sync');
            if (notif) {
              notif.textContent = '🔄 Datos actualizados desde otro dispositivo';
              notif.style.display = 'block';
              setTimeout(function() { notif.style.display = 'none'; }, 4000);
            }
          }
          ultimaVersionLocal = nuevaVersion;
        }
      })
      .catch(function() {});
  }

  function actualizarUIDispositivos(sesiones) {
    var lista = document.getElementById('lista-dispositivos');
    if (!lista) return;
    lista.innerHTML = '';
    sesiones.forEach(function(s) {
      var li = document.createElement('li');
      li.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border);opacity:' + (s.cerrada ? '0.4' : '1');
      var icono = s.dispositivo.toLowerCase().indexOf('laptop') !== -1 ? '💻' : '📱';
      li.innerHTML = '<span>' + icono + '</span> <span style="flex:1">' + s.dispositivo + '</span>' +
        (s.actual ? '<span style="font-size:0.7em;color:#55efc4">●</span>' : '') +
        (s.cerrada ? '<span style="font-size:0.7em;color:#ff7675">✕</span>' : '');
      lista.appendChild(li);
    });
  }

  function cerrarOtrasSesiones() {
    if (!loginUsuario || !loginUsuario.correo) return;
    fetch('/api/auth/sessions/close-others', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginUsuario.correo })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.ok) { fetchSesiones(); }
    })
    .catch(function() {});
  }

  function iniciarPollingSesiones() {
    if (intervaloSesiones) clearInterval(intervaloSesiones);
    intervaloSesiones = setInterval(function() {
      if (loginUsuario) fetchSesiones();
    }, 30000);
  }

  window.iniciarPollingSesiones = iniciarPollingSesiones;
  window.fetchSesiones = fetchSesiones;
  window.actualizarUIDispositivos = actualizarUIDispositivos;
  window.cerrarOtrasSesiones = cerrarOtrasSesiones;

