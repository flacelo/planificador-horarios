// PLANIFY v7.50 - Override Definitivo Fondo Oscuro y Texto Blanco Banner Resumen (App + PDF)
(function() {
  // Orden cronológico estricto: Diaria -> Semanal -> Mensual -> Anual
  var OPCIONES = [
    { id: 'vista-diaria', sel: '#vista-diaria, #view-diario', label: 'Vista Diaria', def: false },
    { id: 'vista-semanal', sel: '#vista-semanal, #view-semanal', label: 'Vista Semanal', def: true },
    { id: 'vista-mensual', sel: '#vista-mensual, #view-mensual', label: 'Vista Mensual', def: true },
    { id: 'vista-anual', sel: '#vista-anual-metas', label: 'Vista Anual', def: false }
  ];
  var MODALES_UI = [
    '.modal-overlay', '.sidebar-overlay', '.side-overlay', '#side-overlay',
    '.sidebar-panel', '.side-panel', '#side-panel', '.panel-control', '#panel-control',
    '#modal-ajustes', '#modal-settings', '.modal'
  ];

  function detectarVistaActiva() {
    var activa = null;
    OPCIONES.forEach(function(o) {
      if (activa) return;
      var el = document.querySelector(o.sel);
      if (el && el.style && el.style.display !== 'none') activa = el;
    });
    if (!activa) {
      document.querySelectorAll('.view-content.active, .tab-content.active, [data-tab-content].active, .vista-container.active, .view-container.active, #vista-semanal.active, #vista-mensual.active, #vista-diario.active, #view-semanal.active, #view-mensual.active, #view-diario.active').forEach(function(el) {
        if (activa) return;
        var id = el.id || '';
        if (id.indexOf('tab-') === 0) return;
        if (MODALES_UI.some(function(s) { return s.indexOf('#') === 0 && el.id === s.slice(1); })) return;
        activa = el;
      });
    }
    if (!activa) activa = document.querySelector('.view-content, [data-tab-content]');
    if (!activa) activa = document.querySelector('main, #main-container');
    if (!activa) activa = document.body;
    return activa;
  }
  window.detectarVistaActiva = detectarVistaActiva;

  function esColorOscuro(valor) {
    if (!valor) return false;
    var v = String(valor).trim();
    var m = v.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
    var lum = -1;
    if (m) {
      lum = 0.299 * Number(m[1]) + 0.587 * Number(m[2]) + 0.114 * Number(m[3]);
    } else {
      var hx = v.match(/#([0-9a-f]{6}|[0-9a-f]{3})/i);
      if (hx) {
        var h = hx[1];
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        lum = 0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16);
      }
    }
    if (lum !== -1) return lum < 128;
    return v.indexOf('gradient') !== -1;
  }

  // REDISEÑO v7.58: Vista Semanal PDF = grid 7 días + resumen semanal en 1 página A4 landscape
  function escHtmlPdf(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function textoLimpioPdf(td) {
    var tmp = td.cloneNode(true);
    if (tmp.querySelectorAll) {
      Array.prototype.forEach.call(tmp.querySelectorAll('span, input, .del-fila'), function(sp) {
        if (sp.remove) sp.remove();
        else if (sp.parentNode) sp.parentNode.removeChild(sp);
      });
    }
    return (tmp.textContent || '').trim();
  }
  function esVistaSemanalPDF(clon) {
    if (!clon || !clon.querySelectorAll) return false;
    return clon.querySelectorAll('td.hora-cell, .hora-cell').length > 0;
  }
  function construirGridSemanalPDF(dias, porDia, total, hechas) {
    var pct = total > 0 ? Math.round(hechas / total * 100) : 0;
    var hoy = new Date();
    var fecha = String(hoy.getDate()).padStart ? String(hoy.getDate()).padStart(2, '0') + '/' + String(hoy.getMonth() + 1).padStart(2, '0') + '/' + hoy.getFullYear() : (hoy.getDate() + '/' + (hoy.getMonth() + 1) + '/' + hoy.getFullYear());
    var h = '<div class="pdf-week-grid">';
    h += '<div class="pdf-week-cabecera">PLANIFY · Vista Semanal · ' + fecha + '</div>';
    h += '<div class="pdf-week-dias">';
    for (var d = 0; d < 7; d++) {
      h += '<div class="pdf-week-dia"><div class="pdf-week-dia-nombre">' + escHtmlPdf(dias[d]) + '</div><div class="pdf-week-tareas">';
      var tasks = porDia[d] || [];
      if (!tasks.length) {
        h += '<div class="pdf-task-vacio">—</div>';
      }
      tasks.forEach(function(t) {
        h += '<div class="pdf-tarea' + (t.done ? ' hecho' : '') + '">';
        h += '<span class="pdf-check">' + (t.done ? '✓' : '☐') + '</span>';
        if (t.hora) h += '<span class="pdf-hora">' + escHtmlPdf(t.hora) + '</span>';
        h += '<span class="pdf-tit">' + escHtmlPdf(t.titulo) + '</span></div>';
      });
      h += '</div></div>';
    }
    h += '</div>';
    h += '<div class="pdf-week-resumen">';
    h += '<div class="pdf-metricas">';
    h += '<div class="pdf-met"><span class="pdf-met-v">' + total + '</span><span class="pdf-met-l">Total</span></div>';
    h += '<div class="pdf-met"><span class="pdf-met-v">' + hechas + '</span><span class="pdf-met-l">Completadas</span></div>';
    h += '<div class="pdf-met"><span class="pdf-met-v">' + (total - hechas) + '</span><span class="pdf-met-l">Pendientes</span></div>';
    h += '<div class="pdf-met"><span class="pdf-met-v">' + pct + '%</span><span class="pdf-met-l">% Éxito</span></div>';
    h += '</div>';
    h += '<div class="pdf-notas"><strong>Notas y Prioridades de la Semana</strong><span class="pdf-notas-caja"></span></div>';
    h += '</div>';
    h += '<div class="pdf-licencia">🔒 Licencia personal · PLANIFY</div>';
    h += '</div>';
    return h;
  }
  function construirResumenSemanalPDF(clon) {
    var dias = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
    var porDia = [];
    for (var d = 0; d < 7; d++) porDia.push([]);
    var total = 0, hechas = 0;
    var tbody = clon.querySelector('#tabla tbody, .tabla-semanal tbody, table tbody');
    if (tbody && tbody.querySelectorAll) {
      Array.prototype.forEach.call(tbody.querySelectorAll('tr'), function(tr) {
        var horaInput = tr.querySelector('td.hora-cell input, .hora-cell input');
        var hora = horaInput ? String(horaInput.value || '').trim() : '';
        var doneAll = tr.classList && tr.classList.contains('done');
        Array.prototype.forEach.call(tr.querySelectorAll('td.celda'), function(td) {
          var ci = parseInt(td.getAttribute('data-ci'), 10);
          if (isNaN(ci) || ci < 0 || ci > 6) return;
          var done = (td.classList && td.classList.contains('done')) || doneAll;
          if (td.classList && td.classList.contains('merged-cell')) done = porDia[ci].length > 0 ? porDia[ci][porDia[ci].length - 1].done : done;
          var tit = textoLimpioPdf(td);
          if (!tit || tit === '—') return;
          total++;
          if (done) hechas++;
          porDia[ci].push({ hora: hora, titulo: tit, done: done });
        });
      });
    }
    return construirGridSemanalPDF(dias, porDia, total, hechas);
  }

  function clonarVistaVisible(el) {
    var clon = el.cloneNode ? el.cloneNode(true) : el;
    // v7.60: rediseño grid v7.58 DESACTIVADO (causaba Vista Semanal vacía en PDF si no se detectaba tbody).
    // La Vista Semanal se exporta clonando el nodo real del DOM visible (cabeceras, HORAS, celdas, leyenda intactos).
    var nodos = [clon];
    if (clon.querySelectorAll) {
      Array.prototype.push.apply(nodos, clon.querySelectorAll('*'));
    }
    nodos.forEach(function(n) {
      if (n.classList && n.classList.remove) {
        n.classList.remove('tema-estelar', 'tema-ejecutivo', 'dark', 'dark-mode', 'tema-oscuro', 'theme-dark');
      }
      if (n.style) {
        if (esColorOscuro(n.style.backgroundColor)) n.style.backgroundColor = '';
        if (esColorOscuro(n.style.background)) n.style.background = '';
      }
    });
    // Remoción física de nodos de eliminación ('X'), botones y svg dentro del clon (v7.30-v7.33)
    if (clon.querySelectorAll) {
      Array.prototype.forEach.call(clon.querySelectorAll('.btn-remove, .remove-btn, .btn-eliminar-fila, .btn-delete, .close-x, .day-header-delete, [data-action="delete"], .delete-icon, .btn-eliminar, .btn-agregar, [onclick*="eliminar"], [onclick*="remove"], [onclick*="agregar"], input.editar, input.edicion, [contenteditable="true"], button.close, .x-btn, .close-btn, button, svg'), function(n) {
        if (n.remove) n.remove();
        else if (n.parentNode) n.parentNode.removeChild(n);
      });
    }
    // Inyección in situ de estilos de alto contraste en cabeceras de días y columna de horas (v7.33)
    if (clon.querySelectorAll) {
      Array.prototype.forEach.call(clon.querySelectorAll('th, .day-header, .tabla-semanal th, upper-header, [class*="header"]'), function(th) {
        if (th.setAttribute) th.setAttribute('style', 'background-color:#f8fafc!important;color:#0f172a!important;font-weight:800!important;font-size:13px!important;text-align:center!important;padding:8px!important;border:1px solid #cbd5e1!important;text-transform:uppercase!important;');
      });
      Array.prototype.forEach.call(clon.querySelectorAll('td:first-child, .col-hora, .hora-cell'), function(td) {
        if (td.setAttribute) td.setAttribute('style', 'background-color:#f1f5f9!important;color:#0f172a!important;font-weight:700!important;font-size:11px!important;text-align:center!important;padding:6px!important;border:1px solid #cbd5e1!important;');
      });
    }
    // Acabado premium: respiración de tarjetas pastel y manejo multilínea (v7.34)
    if (clon.querySelectorAll) {
      Array.prototype.forEach.call(clon.querySelectorAll('.evento, .actividad, .tarjeta-semanal, [data-planify-event], .cal-evento, .evento-item, .pildora-actividad, [data-evento], .bloque-horario'), function(el) {
        if (el.setAttribute) el.setAttribute('style', 'padding:4px 6px!important;border-radius:6px!important;line-height:1.35!important;margin-bottom:2px!important;word-break:break-word!important;white-space:normal!important;font-size:11px!important;');
      });
      Array.prototype.forEach.call(clon.querySelectorAll('.tabla-semanal, table'), function(t) {
        if (t.setAttribute) t.setAttribute('style', 'height:100%!important;min-height:620px!important;');
      });
      Array.prototype.forEach.call(clon.querySelectorAll('td, tr'), function(c) {
        if (c.style) {
          c.style.padding = '3px 2px';
          c.style.fontSize = '9.5px';
          c.style.lineHeight = '1.2';
          c.style.verticalAlign = 'middle';
          c.style.wordBreak = 'break-word';
          c.style.whiteSpace = 'normal';
        }
      });
      Array.prototype.forEach.call(clon.querySelectorAll('.evento-card, .pildora-actividad, [class*="evento"]'), function(ec) {
        if (ec.style) {
          ec.style.fontSize = '9px';
          ec.style.padding = '2px 4px';
          ec.style.lineHeight = '1.1';
        }
      });
      // Corrección de la barra de resumen superior para que no trunque el texto (v7.36)
      Array.prototype.forEach.call(clon.querySelectorAll('.resumen-barra, [class*="resumen"]'), function(rb) {
        if (rb.style) {
          rb.style.whiteSpace = 'normal';
          rb.style.fontSize = '10px';
          rb.style.display = 'flex';
          rb.style.flexWrap = 'wrap';
          rb.style.overflow = 'visible';
        }
      });
      // Fix definitivo v7.37: contraste y visibilidad forzada de la barra Resumen de hoy en el clon
      Array.prototype.forEach.call(clon.querySelectorAll('.resumen-hoy-container, .resumen-barra, [class*="resumen-"]'), function(rb) {
        if (rb.style) {
          rb.style.display = 'flex';
          rb.style.visibility = 'visible';
          rb.style.opacity = '1';
          rb.style.color = '#0f172a';
          rb.style.alignItems = 'center';
          rb.style.flexWrap = 'wrap';
          rb.style.gap = '12px';
          rb.style.lineHeight = '1.4';
        }
      });
      // Sanitización forzada con important del banner de resumen en el clon (v7.39)
      if (clon.querySelectorAll) {
        Array.prototype.forEach.call(clon.querySelectorAll('.resumen-hoy-container, .resumen-barra, [class*="resumen-"]'), function(rb) {
          if (rb.style && rb.style.setProperty) {
            rb.style.setProperty('display', 'flex', 'important');
            rb.style.setProperty('visibility', 'visible', 'important');
            rb.style.setProperty('color', '#0f172a', 'important');
            rb.style.setProperty('background-color', '#ffffff', 'important');
            rb.style.setProperty('opacity', '1', 'important');
            Array.prototype.forEach.call(rb.querySelectorAll('*'), function(h) {
              if (h.style) {
                h.style.setProperty('color', '#0f172a', 'important');
                h.style.setProperty('opacity', '1', 'important');
                h.style.setProperty('visibility', 'visible', 'important');
              }
            });
          }
        });
      }
      // Sanitización bitemática v7.40: forzar versión CLARA de alto contraste en el clon PDF
      if (clon.querySelectorAll) {
        Array.prototype.forEach.call(clon.querySelectorAll('.resumen-hoy-container, .resumen-barra, [class*="resumen-"]'), function(rb) {
          if (rb.style && rb.style.setProperty) {
            rb.style.setProperty('display', 'flex', 'important');
            rb.style.setProperty('visibility', 'visible', 'important');
            rb.style.setProperty('background-color', '#ffffff', 'important');
            rb.style.setProperty('border', '1px solid #cbd5e1', 'important');
            rb.style.setProperty('color', '#0f172a', 'important');
            rb.style.setProperty('opacity', '1', 'important');
            Array.prototype.forEach.call(rb.querySelectorAll('*'), function(h) {
              if (h.style) {
                h.style.setProperty('color', '#1e293b', 'important');
                h.style.setProperty('opacity', '1', 'important');
                h.style.setProperty('visibility', 'visible', 'important');
              }
            });
          }
        });
      }
      // Remoción radical v7.41 de estilos inline tontos en el banner del clon PDF
      if (clon.querySelectorAll) {
        Array.prototype.forEach.call(clon.querySelectorAll('#resumenHoy, #resumen-hoy, .resumen-hoy-container, .resumen-barra, div[class*="resumen"]'), function(rb) {
          if (rb.style && rb.style.setProperty) {
            rb.style.setProperty('background-color', '#ffffff', 'important');
            rb.style.setProperty('border', '1px solid #cbd5e1', 'important');
            rb.style.setProperty('color', '#0f172a', 'important');
            Array.prototype.forEach.call(rb.querySelectorAll('*'), function(h) {
              if (h.style) {
                h.style.setProperty('color', '#0f172a', 'important');
                h.style.setProperty('opacity', '1', 'important');
                h.style.setProperty('visibility', 'visible', 'important');
              }
            });
          }
        });
      }
      // Anulación v7.42 de inline styles de color en hijos del banner del clon PDF
      if (clon.querySelectorAll) {
        Array.prototype.forEach.call(clon.querySelectorAll('#resumenHoy, #resumen-hoy, .resumen-hoy-container, .resumen-barra, div[class*="resumen"]'), function(rb) {
          if (rb.style && rb.style.setProperty) {
            rb.style.setProperty('background-color', '#ffffff', 'important');
            rb.style.setProperty('border', '1px solid #cbd5e1', 'important');
            rb.style.setProperty('color', '#0f172a', 'important');
            Array.prototype.forEach.call(rb.querySelectorAll('*'), function(h) {
              if (h.style) {
                h.style.setProperty('color', '#0f172a', 'important');
                h.style.setProperty('opacity', '1', 'important');
                h.style.setProperty('visibility', 'visible', 'important');
              }
              if (h.removeAttribute) h.removeAttribute('style');
            });
          }
        });
      }
      // Sanitización nuclear v7.43: estilos claros forzados en el banner del clon PDF
      if (clon.querySelectorAll) {
        Array.prototype.forEach.call(clon.querySelectorAll('.resumen-hoy, .resumen-barra, .summary-banner, [class*="resumen"], #resumen-hoy'), function(rb) {
          if (rb.style && rb.style.setProperty) {
            rb.style.setProperty('background-color', '#ffffff', 'important');
            rb.style.setProperty('border', '1px solid #cbd5e1', 'important');
            Array.prototype.forEach.call(rb.querySelectorAll('*'), function(h) {
              if (h.style) {
                h.style.setProperty('color', '#0f172a', 'important');
                h.style.setProperty('opacity', '1', 'important');
              }
            });
          }
        });
      }
      // Sanitización nuclear v7.44: forzado absoluto de estilos claros en el banner del clon PDF
      if (clon.querySelectorAll) {
        Array.prototype.forEach.call(clon.querySelectorAll('.resumen-hoy, .resumen-barra, .summary-banner, [class*="resumen"], #resumen-hoy'), function(rb) {
          if (rb.style && rb.style.setProperty) {
            rb.style.setProperty('background-color', '#ffffff', 'important');
            rb.style.setProperty('border', '1px solid #cbd5e1', 'important');
            Array.prototype.forEach.call(rb.querySelectorAll('*'), function(h) {
              if (h.style) {
                h.style.setProperty('color', '#0f172a', 'important');
                h.style.setProperty('opacity', '1', 'important');
              }
            });
          }
        });
      }
      // Sanitización override v7.46: incluye .resumen-card en la limpieza del clon PDF
      if (clon.querySelectorAll) {
        Array.prototype.forEach.call(clon.querySelectorAll('.resumen-hoy, .resumen-barra, .summary-banner, [class*="resumen"], #resumen-hoy, .resumen-card'), function(rb) {
          if (rb.style && rb.style.setProperty) {
            rb.style.setProperty('background-color', '#ffffff', 'important');
            rb.style.setProperty('border', '1px solid #cbd5e1', 'important');
            Array.prototype.forEach.call(rb.querySelectorAll('*'), function(h) {
              if (h.style) {
                h.style.setProperty('color', '#0f172a', 'important');
                h.style.setProperty('opacity', '1', 'important');
              }
            });
          }
        });
      }
      // Fix v7.50: banner y botones en versión impresa blanca pura dentro del clon PDF
      if (clon.querySelectorAll) {
        Array.prototype.forEach.call(clon.querySelectorAll('#day-summary, .summary-banner, .resumen-barra, [class*="resumen"]'), function(rb) {
          if (rb.style) {
            rb.style.backgroundColor = '#ffffff';
            rb.style.border = '1px solid #e2e8f0';
            Array.prototype.forEach.call(rb.querySelectorAll('*'), function(h) {
              if (h.style) {
                h.style.color = '#0f172a';
                h.style.opacity = '1';
              }
            });
          }
        });
      }
      // Sanitización v7.53: banner blanco limpio con borde definido en la clonación PDF
      if (clon.querySelectorAll) {
        Array.prototype.forEach.call(clon.querySelectorAll('#day-summary, .summary-banner, .resumen-barra, [class*="resumen"]'), function(rb) {
          if (rb.style) {
            rb.style.backgroundColor = '#ffffff';
            rb.style.color = '#0f172a';
            rb.style.border = '1px solid #cbd5e1';
          }
        });
      }
      Array.prototype.forEach.call(clon.querySelectorAll('.leyenda-categorias, .leyenda-etiquetas, .leyenda-contenedor, .leyenda'), function(l) {
        if (l.setAttribute) l.setAttribute('style', 'display:flex!important;flex-wrap:wrap!important;gap:4px!important;margin-top:4px!important;padding:2px 0!important;max-height:28px!important;overflow:hidden!important;');
      });
      Array.prototype.forEach.call(clon.querySelectorAll('.leyenda-categorias span, .leyenda-etiquetas span, .leyenda span, .legend-item'), function(i) {
        if (i.setAttribute) i.setAttribute('style', 'font-size:8.5px!important;padding:1px 4px!important;height:auto!important;line-height:1!important;');
      });
      Array.prototype.forEach.call(clon.querySelectorAll('.footer-licencia, .licencia-texto, [data-licencia]'), function(f) {
        if (f.setAttribute) f.setAttribute('style', 'margin-top:2px!important;font-size:8px!important;padding:0!important;line-height:1!important;');
      });
      // Densidad vertical v7.54: cuadrícula completa 7:00-23:00, leyenda y licencia sin recortes
      Array.prototype.forEach.call(clon.querySelectorAll('td, th'), function(c) {
        if (c.setAttribute) c.setAttribute('style', 'padding:2px 3px!important;height:auto!important;max-height:none!important;line-height:1.1!important;vertical-align:middle!important;word-break:break-word!important;white-space:normal!important;');
      });
      Array.prototype.forEach.call(clon.querySelectorAll('.evento, .cal-evento, .evento-item, .bloque-horario, [data-evento], .pildora-actividad, [data-planify-event]'), function(ev) {
        if (ev.style) {
          ev.style.fontSize = '8.5px';
          ev.style.lineHeight = '1.1';
        }
      });
      Array.prototype.forEach.call(clon.querySelectorAll('.col-hora, td:first-child, .hora-cell'), function(ch) {
        if (ch.style) {
          ch.style.fontSize = '8px';
          ch.style.padding = '2px';
        }
      });
      Array.prototype.forEach.call(clon.querySelectorAll('.leyenda-categorias, .leyenda-etiquetas, .leyenda-contenedor, .leyenda'), function(l) {
        if (l.style) {
          l.style.display = 'flex';
          l.style.flexWrap = 'wrap';
          l.style.gap = '4px';
          l.style.marginTop = '4px';
        }
      });
      Array.prototype.forEach.call(clon.querySelectorAll('.leyenda-categorias span, .leyenda-etiquetas span, .leyenda span, .legend-item'), function(lb) {
        if (lb.style) {
          lb.style.fontSize = '8px';
          lb.style.lineHeight = '1.1';
        }
      });
      // Refuerzo v7.55: encabezados thead y leyenda inferior contiguos en el clon PDF
      Array.prototype.forEach.call(clon.querySelectorAll('table.tabla-semanal thead, .tabla-semanal thead, #vista-semanal thead'), function(th) {
        if (th.style) {
          th.style.display = 'table-header-group';
          th.style.visibility = 'visible';
          th.style.opacity = '1';
        }
      });
      Array.prototype.forEach.call(clon.querySelectorAll('.seccion-leyenda-inferior, .leyenda-categorias, .leyenda-contenedor, .leyenda'), function(l) {
        if (l.style) {
          l.style.display = 'flex';
          l.style.flexWrap = 'wrap';
          l.style.visibility = 'visible';
          l.style.opacity = '1';
        }
      });
      // Distribución proporcional v7.56: celdas y columnas de horas legibles, leyenda/licencia contiguas
      Array.prototype.forEach.call(clon.querySelectorAll('td, th, .col-hora, .hora-cell, .celda-header'), function(c) {
        if (c.style) {
          c.style.fontSize = '10px';
          c.style.padding = '4px';
          c.style.boxSizing = 'border-box';
        }
      });
      Array.prototype.forEach.call(clon.querySelectorAll('.leyenda-categorias, .leyenda-etiquetas, .leyenda-contenedor, .seccion-leyenda-inferior, .footer-licencia, .licencia-texto, [data-licencia]'), function(l) {
        if (l.style) {
          l.style.pageBreakInside = 'avoid';
          l.style.marginTop = '6px';
        }
      });
    }
    clon.style.pageBreakAfter = 'avoid';
    clon.style.breakAfter = 'avoid';
    clon.style.pageBreakInside = 'avoid';
    clon.style.breakInside = 'avoid';
    clon.style.height = 'auto';
    clon.style.maxHeight = 'none';
    clon.style.overflow = 'visible';
    clon.style.width = '100%';
    clon.style.backgroundColor = '#ffffff';
    clon.style.color = '#0f172a';
    clon.style.display = 'block';
    clon.style.visibility = 'visible';
    clon.style.opacity = '1';
    if (clon.classList && clon.classList.add) clon.classList.add('active');
    return clon.outerHTML;
  }

  function cerrarModal() {
    var m = document.getElementById('modal-export-pdf');
    if (m) {
      if (m.parentNode) m.parentNode.removeChild(m);
      var ov = document.getElementById('modal-export-pdf-overlay');
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    }
  }

  function abrirModal() {
    cerrarModal();
    var overlay = document.createElement('div');
    overlay.id = 'modal-export-pdf-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.55);z-index:99998;display:flex;align-items:center;justify-content:center;';

    var panel = document.createElement('div');
    panel.id = 'modal-export-pdf';
    panel.style.cssText = 'background:#fff;border-radius:16px;padding:24px 26px;width:min(420px,92vw);box-shadow:0 20px 60px rgba(15,23,42,.35);font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;';

    var titulo = document.createElement('div');
    titulo.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
    titulo.innerHTML = '<strong style="font-size:17px;">📄 Exportar a PDF</strong><button type="button" style="border:none;background:none;font-size:20px;cursor:pointer;line-height:1;color:#64748b;" data-planify-cerrar="1" aria-label="Cerrar">✕</button>';
    panel.appendChild(titulo);

    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:12.5px;color:#64748b;margin-bottom:14px;';
    sub.textContent = 'Selecciona las vistas a incluir (cada una será una página, en orden cronológico):';
    panel.appendChild(sub);

    OPCIONES.forEach(function(o) {
      var fila = document.createElement('label');
      fila.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 12px;margin-bottom:8px;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;font-size:14px;';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = o.def;
      cb.style.cssText = 'width:17px;height:17px;accent-color:#6a1b9a;cursor:pointer;';
      cb.setAttribute('data-planify-vista', o.id);
      fila.appendChild(cb);
      var span = document.createElement('span');
      span.textContent = o.label;
      fila.appendChild(span);
      panel.appendChild(fila);
    });

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-generar-pdf';
    btn.textContent = 'Generar y Descargar PDF';
    btn.style.cssText = 'width:100%;margin-top:12px;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#7b1fa2,#4a148c);color:#fff;font-size:14.5px;font-weight:600;cursor:pointer;';
    panel.appendChild(btn);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(ev) {
      if (ev.target === overlay) cerrarModal();
    });
    panel.addEventListener('click', function(ev) {
      if (ev.target.closest && ev.target.closest('[data-planify-cerrar]')) cerrarModal();
    });
  }

  function imprimirVistas(nodosHTML, clasesPrint) {
    var previo = document.getElementById('pdf-print-iframe');
    if (previo && previo.parentNode) previo.parentNode.removeChild(previo);
    var iframe = document.createElement('iframe');
    iframe.id = 'pdf-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    var doc = iframe.contentWindow.document;
    var estilosHTML = '';
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(function(style) {
      estilosHTML += style.outerHTML;
    });

    doc.open();
    doc.write('<!DOCTYPE html><html><head><title>PLANIFY - Exportación PDF</title>' +
      estilosHTML +
      '<style>' +
      'body { background: #ffffff !important; color: #0f172a !important; padding: 0 !important; margin: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '.sidebar, #panel-control, #side-panel, .side-panel, .sidebar-panel, .modal-overlay, .side-overlay, .sidebar-overlay, .modal, button, .btn, #modal-export-pdf-overlay { display: none !important; }' +
      '.no-print, input[type="button"], input[type="submit"], .editar, .edit, .controls, .acciones, .actions, .empty-state, #empty-state, #horario-vacio-banner { display: none !important; }' +
      '.tab-content, .view-content, [data-tab-content] { display: none !important; }' +
      '[data-planify-print] { display: block !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; background: #ffffff !important; color: #0f172a !important; overflow: visible !important; }' +
      '[data-planify-print] * { box-shadow: none !important; }' +
      '[data-planify-print] .pdf-seccion { display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; background: #ffffff !important; color: #0f172a !important; overflow: visible !important; page-break-after: always; break-after: page; page-break-inside: avoid; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] .pdf-seccion:last-child { page-break-after: auto; break-after: auto; }' +
      '[data-planify-print] .tab-content, [data-planify-print] .view-content, [data-planify-print] [data-tab-content] { display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; overflow: visible !important; }' +
      '[data-planify-print] .card, [data-planify-print] .section-card, [data-planify-print] .dash-card, [data-planify-print] .main-card-container, [data-planify-print] .tarjeta-resumen, [data-planify-print] .month-cell { background: #ffffff !important; color: #0f172a !important; }' +
      '[data-planify-print] #view-diario, [data-planify-print] #vista-diario { background: #ffffff !important; color: #0f172a !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; border: 1px solid #cbd5e1 !important; }' +
      '[data-planify-print] #view-diario .notebook-header, [data-planify-print] #vista-diario .notebook-header { background: none !important; border-bottom: 1px solid #e2e8f0 !important; }' +
      '[data-planify-print] #view-diario .notebook-header h2, [data-planify-print] #vista-diario .notebook-header h2 { color: #0f172a !important; }' +
      '[data-planify-print] #view-diario .card-section, [data-planify-print] #vista-diario .card-section { background: #ffffff !important; border: 1px solid #cbd5e1 !important; box-shadow: none !important; color: #0f172a !important; }' +
      '[data-planify-print] #view-diario .section-title, [data-planify-print] #vista-diario .section-title { color: #334155 !important; }' +
      '[data-planify-print] #view-diario .goals-section, [data-planify-print] #view-diario .grateful-section, [data-planify-print] #view-diario .affirmations-section, [data-planify-print] #view-diario .morning-section, [data-planify-print] #vista-diario .goals-section, [data-planify-print] #vista-diario .grateful-section, [data-planify-print] #vista-diario .affirmations-section, [data-planify-print] #vista-diario .morning-section { background: #ffffff !important; border-color: #e2e8f0 !important; }' +
      '[data-planify-print] #view-diario .aesthetic-input, [data-planify-print] #view-diario .aesthetic-textarea, [data-planify-print] #vista-diario .aesthetic-input, [data-planify-print] #vista-diario .aesthetic-textarea { background: #ffffff !important; border: 1px solid #cbd5e1 !important; color: #1e293b !important; }' +
      '[data-planify-print] #view-diario .day-summary, [data-planify-print] #vista-diario .day-summary { background: #ffffff !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; color: #0f172a !important; }' +
      '[data-planify-print] .notebook-container, [data-planify-print] .planner-notebook, [data-planify-print] .notebook-grid, [data-planify-print] .notebook-col { background: #ffffff !important; border: 1px solid #cbd5e1 !important; box-shadow: none !important; color: #0f172a !important; }' +
      '[data-planify-print] #view-diario .mood-btn, [data-planify-print] #view-diario .cloud-btn, [data-planify-print] #view-diario .sleep-clouds, [data-planify-print] #view-diario .aesthetic-btn, [data-planify-print] #vista-diario .mood-btn, [data-planify-print] #vista-diario .cloud-btn, [data-planify-print] #vista-diario .sleep-clouds, [data-planify-print] #vista-diario .aesthetic-btn { background: #ffffff !important; color: #0f172a !important; border: 1px solid #cbd5e1 !important; box-shadow: none !important; }' +
      '[data-planify-print] #view-diario .routine-checkboxes, [data-planify-print] #vista-diario .routine-checkboxes { color: #1e293b !important; }' +
      '[data-planify-print] #view-semanal table, [data-planify-print] #view-table table, [data-planify-print] #vista-semanal table, [data-planify-print] #tabla { table-layout: fixed !important; width: 100% !important; background: #ffffff !important; border-collapse: collapse !important; box-shadow: none !important; }' +
      '[data-planify-print] #view-semanal tr, [data-planify-print] #view-table tr, [data-planify-print] #vista-semanal tr, [data-planify-print] #tabla tr { background: #ffffff !important; }' +
      '[data-planify-print] #view-semanal thead th, [data-planify-print] #view-table thead th, [data-planify-print] #vista-semanal thead th, [data-planify-print] #tabla thead th { background: #f8fafc !important; border: 1px solid #cbd5e1 !important; color: #0f172a !important; font-weight: 700 !important; text-align: center !important; vertical-align: middle !important; padding: 8px 4px !important; }' +
      '[data-planify-print] #view-semanal td, [data-planify-print] #view-table td, [data-planify-print] #vista-semanal td, [data-planify-print] #tabla td, [data-planify-print] #view-semanal .celda, [data-planify-print] #view-table .celda { border: 1px solid #cbd5e1 !important; background: #ffffff !important; color: #0f172a !important; text-align: center !important; vertical-align: middle !important; padding: 6px 4px !important; }' +
      '[data-planify-print] #view-semanal .hora-col, [data-planify-print] #view-table .hora-col, [data-planify-print] #vista-semanal .hora-col, [data-planify-print] #view-semanal .hora-cell, [data-planify-print] #view-table .hora-cell, [data-planify-print] #view-semanal .celda-header, [data-planify-print] #view-table .celda-header { width: 85px !important; text-align: center !important; vertical-align: middle !important; font-weight: 600 !important; color: #334155 !important; }' +
      '[data-planify-print] #view-semanal .cal-evento, [data-planify-print] #view-table .cal-evento, [data-planify-print] #vista-semanal .cal-evento, [data-planify-print] #view-semanal .evento, [data-planify-print] #view-table .evento { display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; font-weight: 500 !important; font-size: 0.85rem !important; color: #0f172a !important; border-radius: 6px !important; }' +
      '[data-planify-print] .leyenda { justify-content: center !important; }' +
      '[data-planify-print] .leyenda span { color: #0f172a !important; background: #f8fafc !important; border: 1px solid #e2e8f0 !important; }' +
      '[data-planify-print] { background: #ffffff !important; box-shadow: none !important; border: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }' +
      '.print-container, .info-banner, .indicacion-horarios, [class*="info-banner"], [class*="indicacion"] { background: #ffffff !important; color: #0f172a !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; }' +
      '[data-planify-print] #view-semanal thead th, [data-planify-print] #view-table thead th, [data-planify-print] #vista-semanal thead th, [data-planify-print] #tabla thead th { background: #f8fafc !important; color: #0f172a !important; font-weight: 600 !important; border: 1px solid #cbd5e1 !important; text-align: center !important; vertical-align: middle !important; padding: 10px 4px !important; }' +
      '[data-planify-print] #view-semanal .cal-evento, [data-planify-print] #view-table .cal-evento, [data-planify-print] #vista-semanal .cal-evento, [data-planify-print] #view-semanal .evento, [data-planify-print] #view-table .evento, [data-planify-print] #view-semanal .evento-item, [data-planify-print] #view-table .evento-item, [data-planify-print] #view-semanal .bloque-horario, [data-planify-print] #view-table .bloque-horario { display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; width: 100% !important; min-height: 100% !important; box-sizing: border-box !important; margin: 0 auto !important; padding: 4px 6px !important; color: #0f172a !important; border-radius: 6px !important; border: 1px solid #cbd5e1 !important; font-size: 0.82rem !important; font-weight: 500 !important; }' +
      '[data-planify-print] #view-semanal .week-header, [data-planify-print] #view-table .week-header, [data-planify-print] #vista-semanal .week-header, [data-planify-print] #view-semanal .week-header-day, [data-planify-print] #view-table .week-header-day, [data-planify-print] #view-semanal .resumen-header, [data-planify-print] #view-table .resumen-header, [data-planify-print] #view-semanal .tarjeta-resumen, [data-planify-print] #view-table .tarjeta-resumen, [data-planify-print] #view-semanal #resumen-hoy, [data-planify-print] #view-table #resumen-hoy, [data-planify-print] #view-semanal [class*="week-title"], [data-planify-print] #view-semanal [class*="semana-"], [data-planify-print] #view-semanal [class*="resumen"], [data-planify-print] #view-table [class*="resumen"], [data-planify-print] #view-semanal .day-summary { background: #ffffff !important; color: #0f172a !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; }' +
      '[data-planify-print] #view-semanal thead th, [data-planify-print] #view-table thead th, [data-planify-print] #vista-semanal thead th, [data-planify-print] #tabla thead th { background: #f8fafc !important; color: #0f172a !important; font-weight: 700 !important; border: 1px solid #cbd5e1 !important; text-align: center !important; vertical-align: middle !important; padding: 10px 4px !important; }' +
      '[data-planify-print] #view-semanal [data-evento], [data-planify-print] #view-table [data-evento], [data-planify-print] #vista-semanal [data-evento] { display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; width: 100% !important; margin: 0 auto !important; padding: 4px 6px !important; box-sizing: border-box !important; border-radius: 6px !important; border: 1px solid #cbd5e1 !important; color: #0f172a !important; font-size: 0.82rem !important; font-weight: 600 !important; }' +
      '[data-planify-print] .leyenda { justify-content: center !important; background: #ffffff !important; }' +
      '[data-planify-print] .leyenda span { color: #0f172a !important; background: #ffffff !important; border: 1px solid #e2e8f0 !important; }' +
      '[data-planify-print] table th, [data-planify-print] td:first-child, [data-planify-print] .hora-cell, [data-planify-print] .hora-col, [data-planify-print] .col-hora, [data-planify-print] .celda-header, [data-planify-print] .pdf-export-container td:first-child { background-color: #f1f5f9 !important; color: #0f172a !important; font-weight: 700 !important; border: 1px solid #cbd5e1 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] th *, [data-planify-print] td:first-child * { color: #0f172a !important; }' +
      '[data-planify-print] table th, [data-planify-print] thead th { background-color: #1e293b !important; color: #ffffff !important; font-weight: 800 !important; font-size: 13px !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; border: 1px solid #0f172a !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] th * { color: #ffffff !important; }' +
      '[data-planify-print] td:first-child { background-color: #f1f5f9 !important; color: #0f172a !important; font-weight: 700 !important; font-size: 11px !important; border: 1px solid #cbd5e1 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] .actividad-pill, [data-planify-print] .evento-item, [data-planify-print] .pildora-actividad, [data-planify-print] .cal-evento, [data-planify-print] .evento, [data-planify-print] [data-evento], [data-planify-print] .bloque-horario { border-radius: 6px !important; padding: 4px 6px !important; font-weight: 600 !important; color: #0f172a !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] table th, [data-planify-print] th, [data-planify-print] th * { background-color: #0f172a !important; color: #ffffff !important; font-weight: 800 !important; font-size: 12px !important; text-transform: uppercase !important; text-shadow: none !important; opacity: 1 !important; visibility: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] td:first-child, [data-planify-print] td:first-child *, [data-planify-print] .col-hora, [data-planify-print] .col-hora *, [data-planify-print] .hora-cell, [data-planify-print] .hora-cell *, [data-planify-print] .hora-col { background-color: #e2e8f0 !important; color: #0f172a !important; font-weight: 700 !important; font-size: 11px !important; text-shadow: none !important; opacity: 1 !important; visibility: visible !important; border: 1px solid #cbd5e1 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] table { width: 100% !important; border-collapse: collapse !important; }' +
      '[data-planify-print] table th, [data-planify-print] th, [data-planify-print] th * { background-color: #0f172a !important; color: #ffffff !important; font-weight: 800 !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; opacity: 1 !important; visibility: visible !important; border: 1px solid #1e293b !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] .actividad-pill, [data-planify-print] .evento-item, [data-planify-print] .pildora-actividad, [data-planify-print] [data-evento], [data-planify-print] .cal-evento, [data-planify-print] .evento, [data-planify-print] .bloque-horario { border-radius: 6px !important; padding: 4px 6px !important; font-weight: 600 !important; color: #0f172a !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] #view-semanal table th, [data-planify-print] #view-table table th, [data-planify-print] #tabla th, [data-planify-print] th, [data-planify-print] th * { background-color: #0f172a !important; color: #ffffff !important; font-weight: 800 !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; opacity: 1 !important; visibility: visible !important; border: 1px solid #1e293b !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] #view-semanal td:first-child, [data-planify-print] #view-table td:first-child, [data-planify-print] #tabla td:first-child, [data-planify-print] td:first-child, [data-planify-print] td:first-child *, [data-planify-print] .hora-cell, [data-planify-print] .hora-col, [data-planify-print] .col-hora { background-color: #e2e8f0 !important; color: #0f172a !important; font-weight: 700 !important; font-size: 11px !important; opacity: 1 !important; visibility: visible !important; border: 1px solid #cbd5e1 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] table { width: 100% !important; border-collapse: collapse !important; }' +
      '[data-planify-print] .tabla-semanal .btn-remove, [data-planify-print] .tabla-semanal .remove-btn, [data-planify-print] .tabla-semanal .btn-eliminar-fila, [data-planify-print] .tabla-semanal td .btn-delete, [data-planify-print] .tabla-semanal th .btn-delete, [data-planify-print] #vista-semanal .btn-remove, [data-planify-print] #vista-semanal .btn-eliminar, [data-planify-print] span.btn-remove, [data-planify-print] button.btn-remove, [data-planify-print] [data-action="delete"], [data-planify-print] .close-x, [data-planify-print] .day-header-delete { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }' +
      '[data-planify-print] table th, [data-planify-print] th, [data-planify-print] th[class*="header"], [data-planify-print] th * { background-color: #0f172a !important; color: #ffffff !important; font-weight: 800 !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; opacity: 1 !important; visibility: visible !important; border: 1px solid #1e293b !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] #view-semanal, [data-planify-print] #view-table, [data-planify-print] #view-mensual, [data-planify-print] #view-diario, [data-planify-print] #view-dashboard, [data-planify-print] #vista-anual-metas { display: none !important; }' +
      '[data-planify-print] #view-semanal.active, [data-planify-print] #view-table.active, [data-planify-print] #view-mensual.active, [data-planify-print] #view-diario.active, [data-planify-print] #view-dashboard.active, [data-planify-print] #vista-anual-metas.active { display: block !important; width: 100% !important; }' +
      'table, .main-grid-container, .cal-container { border-collapse: collapse !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; box-shadow: none !important; }' +
      'table, th, td, tr, .cal-dia, .cell, .week-grid { background: #ffffff !important; color: #0f172a !important; }' +
      '.card, .section-card, .dash-card, .main-card-container, .vista-container, .main-container, .cal-container, .grid-container, .month-grid, .tab-content, .view-content, .modal, .modal-content, .modal-box, input, select, textarea, .tarjeta, [class*="tarjeta"] { background: #ffffff !important; color: #0f172a !important; }' +
      '[class*="tarjeta"] { border: 1px solid #e2e8f0 !important; }' +
      'table, th, td, .celda, .grid-cell, .month-cell { border: 1px solid #cbd5e1 !important; }' +
      'thead th, .cal-dia-nombre, .week-header-day, .day-header, .hora-col, .celda-header, .month-header, .cal-titulo, [class*="month-title"], [class*="cal-title"] { background: #f1f5f9 !important; color: #334155 !important; font-weight: 600 !important; }' +
      'th, td, .celda, .grid-cell, .month-cell, .cell-content { padding: 8px 10px !important; border-radius: 6px !important; }' +
      '.cal-evento, .evento, .event-item, .card, .dash-card, .tour-card { border-radius: 6px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '@page { size: A4 landscape; margin: 5mm !important; }' +
      '[data-planify-print] .btn-remove, [data-planify-print] .remove-btn, [data-planify-print] .btn-eliminar-fila, [data-planify-print] .btn-delete, [data-planify-print] .close-x, [data-planify-print] .day-header-delete, [data-planify-print] [data-action="delete"], [data-planify-print] .delete-icon, [data-planify-print] .btn-eliminar, [data-planify-print] button.close, [data-planify-print] .x-btn, [data-planify-print] .close-btn, [data-planify-print] button { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }' +
      '[data-planify-print] th, [data-planify-print] .day-header, [data-planify-print] .tabla-semanal th, [data-planify-print] th[class*="header"], [data-planify-print] th * { background-color: #0f172a !important; color: #ffffff !important; font-weight: 700 !important; text-align: center !important; padding: 6px !important; font-size: 11px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] .col-hora, [data-planify-print] td:first-child, [data-planify-print] .hora-cell { background-color: #f1f5f9 !important; color: #0f172a !important; font-weight: 700 !important; text-align: center !important; }' +
      '[data-planify-print] button, [data-planify-print] svg { display: none !important; }' +
      '[data-planify-print] table { height: auto !important; min-height: 0 !important; }' +
      '[data-planify-print] td, [data-planify-print] th { vertical-align: middle !important; }' +
      '[data-planify-print] .evento-item, [data-planify-print] .pildora-actividad, [data-planify-print] [data-planify-event], [data-planify-print] [data-evento] { padding: 4px 6px !important; font-size: 10.5px !important; line-height: 1.3 !important; border-radius: 5px !important; }' +
      '[data-planify-print] td, [data-planify-print] tr { padding: 3px 2px !important; line-height: 1.2 !important; font-size: 9.5px !important; }' +
      '[data-planify-print] .evento-card, [data-planify-print] .pildora-actividad, [data-planify-print] [class*="evento"] { font-size: 9px !important; padding: 2px 4px !important; line-height: 1.1 !important; }' +
      '[data-planify-print] .resumen-barra, [data-planify-print] [class*="resumen"] { white-space: normal !important; overflow: visible !important; font-size: 10px !important; }' +
      '[data-planify-print] .resumen-hoy-container, [data-planify-print] .resumen-barra, [data-planify-print] [class*="resumen-"] { display: flex !important; align-items: center !important; flex-wrap: wrap !important; gap: 12px !important; background-color: #f8fafc !important; border: 1px solid #e2e8f0 !important; border-radius: 8px !important; margin-bottom: 12px !important; padding: 8px 12px !important; font-size: 11px !important; font-weight: 600 !important; line-height: 1.4 !important; color: #0f172a !important; visibility: visible !important; opacity: 1 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] .resumen-hoy-container *, [data-planify-print] .resumen-barra * { color: #0f172a !important; opacity: 1 !important; visibility: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      '[data-planify-print] .resumen-hoy-container, [data-planify-print] .resumen-barra, [data-planify-print] [class*="resumen-"] { min-height: 48px !important; padding: 8px 16px !important; display: flex !important; align-items: center !important; flex-wrap: wrap !important; gap: 12px !important; background-color: #ffffff !important; color: #0f172a !important; opacity: 1 !important; visibility: visible !important; }' +
      '[data-planify-print] .resumen-hoy-container *, [data-planify-print] .resumen-barra *, [data-planify-print] [class*="resumen-"] span, [data-planify-print] [class*="resumen-"] p, [data-planify-print] [class*="resumen-"] div { color: #0f172a !important; font-weight: 600 !important; opacity: 1 !important; visibility: visible !important; white-space: normal !important; }' +
      '[data-planify-print] .resumen-titulo, [data-planify-print] [class*="resumen-"] strong { color: #0f172a !important; font-size: 14px !important; font-weight: 700 !important; }' +
      '[data-planify-print] [class*="resumen-"] .text-muted, [data-planify-print] [class*="resumen-"] .subtext, [data-planify-print] [class*="resumen-"] span[class*="pendiente"], [data-planify-print] [class*="resumen-"] span[class*="rutina"], [data-planify-print] [class*="resumen-"] span[class*="clase"] { color: #334155 !important; font-size: 12px !important; }' +
      '[data-planify-print] .resumen-hoy-container, [data-planify-print] .resumen-barra, [data-planify-print] [class*="resumen-"] { border: 1px solid #cbd5e1 !important; border-radius: 12px !important; }' +
      '[data-planify-print] body.light-theme .resumen-hoy-container, [data-planify-print] body.light-theme .resumen-barra, [data-planify-print] body.light-theme [class*="resumen-"], [data-planify-print] body:not(.light-theme) .resumen-hoy-container, [data-planify-print] body:not(.light-theme) .resumen-barra, [data-planify-print] body:not(.light-theme) [class*="resumen-"], [data-planify-print] .dark-mode .resumen-hoy-container, [data-planify-print] .dark-mode .resumen-barra { background-color: #ffffff !important; border: 1px solid #cbd5e1 !important; color: #0f172a !important; }' +
      '[data-planify-print] #resumenHoy, [data-planify-print] #resumen-hoy, [data-planify-print] .resumen-hoy-container, [data-planify-print] .resumen-barra, [data-planify-print] div[class*="resumen"] { background-color: #ffffff !important; border: 1px solid #cbd5e1 !important; border-radius: 12px !important; padding: 10px 16px !important; color: #0f172a !important; }' +
      '[data-planify-print] #resumenHoy *, [data-planify-print] #resumen-hoy *, [data-planify-print] .resumen-hoy-container *, [data-planify-print] .resumen-barra *, [data-planify-print] div[class*="resumen"] * { color: #0f172a !important; opacity: 1 !important; visibility: visible !important; text-shadow: none !important; font-weight: 600 !important; }' +
      '[data-planify-print] #resumenHoy *[style], [data-planify-print] #resumen-hoy *[style], [data-planify-print] .resumen-hoy-container *[style], [data-planify-print] .resumen-barra *[style], [data-planify-print] div[class*="resumen"] *[style], [data-planify-print] #resumenHoy span[style], [data-planify-print] .resumen-hoy-container span[style], [data-planify-print] div[class*="resumen"] span[style] { color: #0f172a !important; opacity: 1 !important; visibility: visible !important; text-shadow: none !important; font-weight: 600 !important; }' +
      '[data-planify-print] .resumen-hoy, [data-planify-print] .resumen-barra, [data-planify-print] .summary-banner, [data-planify-print] [class*="resumen"], [data-planify-print] #resumen-hoy { background-color: #ffffff !important; border: 1px solid #cbd5e1 !important; border-radius: 12px !important; padding: 10px 16px !important; box-shadow: none !important; backdrop-filter: none !important; }' +
      '[data-planify-print] .resumen-hoy, [data-planify-print] .resumen-barra, [data-planify-print] .summary-banner, [data-planify-print] [class*="resumen"], [data-planify-print] #resumen-hoy, [data-planify-print] .resumen-card { background: #ffffff !important; background-color: #ffffff !important; border: 1px solid #cbd5e1 !important; border-radius: 12px !important; padding: 10px 16px !important; box-shadow: none !important; }' +
      '[data-planify-print] .resumen-hoy *, [data-planify-print] .resumen-barra *, [data-planify-print] .summary-banner *, [data-planify-print] [class*="resumen"] *, [data-planify-print] #resumen-hoy *, [data-planify-print] .resumen-card * { color: #0f172a !important; opacity: 1 !important; font-weight: 600 !important; text-shadow: none !important; }' +
      '[data-planify-print] .resumen-hoy *, [data-planify-print] .resumen-barra *, [data-planify-print] .summary-banner *, [data-planify-print] [class*="resumen"] *, [data-planify-print] #resumen-hoy * { color: #0f172a !important; opacity: 1 !important; text-shadow: none !important; font-weight: 500 !important; }' +
      '[data-planify-print] .resumen-hoy strong, [data-planify-print] .resumen-barra strong, [data-planify-print] [class*="resumen"] strong { color: #0f172a !important; font-weight: 700 !important; }' +
      '[data-planify-print] .resumen-hoy span[style*="color"], [data-planify-print] .resumen-barra span[style*="color"], [data-planify-print] [class*="resumen"] span[style*="color"] { font-weight: 700 !important; color: #0f172a !important; }' +
      '[data-planify-print] .leyenda-categorias, [data-planify-print] .leyenda-etiquetas, [data-planify-print] .leyenda-contenedor, [data-planify-print] .leyenda { display: flex !important; flex-wrap: wrap !important; gap: 4px !important; margin-top: 4px !important; padding: 2px 0 !important; max-height: 28px !important; overflow: hidden !important; }' +
      '[data-planify-print] .leyenda span, [data-planify-print] .legend-item { font-size: 8.5px !important; padding: 1px 4px !important; height: auto !important; line-height: 1 !important; }' +
      '[data-planify-print] .footer-licencia, [data-planify-print] .licencia-texto, [data-planify-print] [data-licencia] { margin-top: 2px !important; font-size: 8px !important; padding: 0 !important; line-height: 1 !important; }' +
      '[data-planify-print] { page-break-inside: avoid !important; height: auto !important; max-height: none !important; overflow: visible !important; }' +
      '[data-planify-print] .planify-pdf-page { width: 100% !important; box-sizing: border-box !important; page-break-inside: avoid !important; }' +
      '[data-planify-print] .planify-pdf-page:not(:last-child) { break-after: page !important; page-break-after: always !important; }' +
      '[data-planify-print] .planify-pdf-page { page-break-after: always !important; break-after: page !important; page-break-inside: avoid !important; break-inside: avoid !important; width: 100% !important; display: block !important; margin: 0 !important; padding: 2mm 0 !important; box-sizing: border-box !important; }' +
      '[data-planify-print] .planify-pdf-page:last-child { page-break-after: auto !important; break-after: auto !important; }' +
      '[data-planify-print] .planify-pdf-page #vista-semanal, [data-planify-print] .planify-pdf-page #view-semanal, [data-planify-print] .planify-pdf-page #view-table, [data-planify-print] .planify-pdf-page [data-vista="semanal"] { display: flex !important; flex-direction: column !important; height: 100% !important; }' +
      '[data-planify-print] .planify-pdf-page table { font-size: 9.5px !important; border-collapse: collapse !important; }' +
      '[data-planify-print] .planify-pdf-page td, [data-planify-print] .planify-pdf-page th { padding: 2px 4px !important; line-height: 1.2 !important; }' +
      '[data-planify-print] .planify-pdf-page .leyenda-categorias, [data-planify-print] .planify-pdf-page .footer-licencia { margin-top: 4px !important; padding: 2px 0 !important; font-size: 8.5px !important; }' +
      '[data-planify-print] .planify-pdf-page #view-semanal .leyenda-categorias, [data-planify-print] .planify-pdf-page #view-table .leyenda-categorias, [data-planify-print] .planify-pdf-page #view-semanal .leyenda, [data-planify-print] .planify-pdf-page #view-table .leyenda, [data-planify-print] .planify-pdf-page #view-semanal .footer-licencia, [data-planify-print] .planify-pdf-page #view-table .footer-licencia, [data-planify-print] .planify-pdf-page #view-semanal [data-licencia], [data-planify-print] .planify-pdf-page #view-table [data-licencia] { margin-top: auto !important; }' +
      '</style></head>' +
      '<body class="' + (clasesPrint || '') + '">' +
      '<div data-planify-print="1">' + nodosHTML + '</div>' +
      '</body></html>');
    doc.close();

    setTimeout(function() {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(function() {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1000);
    }, 350);
  }

  function generarPDF() {
    var checks = document.querySelectorAll('#modal-export-pdf-overlay input[data-planify-vista]');
    var seleccionadas = [];
    checks.forEach(function(cb) {
      if (cb.checked) seleccionadas.push(cb.getAttribute('data-planify-vista'));
    });
    if (seleccionadas.length === 0) {
      var activa = detectarVistaActiva();
      var idA = activa.id || '';
      OPCIONES.forEach(function(o) {
        if (o.sel.split(',').some(function(s) { return s.trim() === '#' + idA; })) seleccionadas.push(o.id);
      });
      if (seleccionadas.length === 0) seleccionadas.push('vista-semanal');
    }

    // Orden cronológico estricto: las secciones se concatenan iterando OPCIONES, no el orden de selección
    var partes = [];
    var clasesPrint = [];
    OPCIONES.forEach(function(o) {
      if (seleccionadas.indexOf(o.id) === -1) return;
      var el = document.querySelector(o.sel);
      if (!el) return;
      var idReal = el.id ? String(el.id) : 'vista-' + o.id;
      var sufijo = String(idReal).replace(/^#?view-|^#?vista-/, '');
      clasesPrint.push('printing-' + sufijo);
      clasesPrint.push('printing-' + idReal);
      partes.push('<section class="pdf-seccion planify-pdf-page" style="display:block;visibility:visible;opacity:1;">' + clonarVistaVisible(el) + '</section>');
    });
    if (partes.length === 0) partes.push('<div>No hay vistas disponibles para exportar.</div>');

    cerrarModal();
    imprimirVistas(partes.join(''), clasesPrint.join(' '));
  }

  window.exportarVistaAPDF = function() {
    var vistaActiva = document.querySelector('#view-semanal.active, #vista-semanal.active')
      || document.querySelector('#view-mensual.active, #vista-mensual.active')
      || document.querySelector('#view-diario.active, #vista-diario.active')
      || document.querySelector('.vista-container.active');
    if (!vistaActiva && typeof window.detectarVistaActiva === 'function') vistaActiva = window.detectarVistaActiva();
    if (!vistaActiva) {
      console.error('[PLANIFY PDF] No se detectó ninguna vista activa.');
      return;
    }
    var clon = clonarVistaVisible(vistaActiva);
    clon.id = 'pdf-clone-isolated';
    var idReal = vistaActiva.id ? String(vistaActiva.id) : 'vista-activa';
    imprimirVistas('<section class="pdf-seccion planify-pdf-page" style="display:block;visibility:visible;opacity:1;">' + clon.outerHTML + '</section>', 'printing-' + idReal);
  };

  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      var btnPdf = e.target.closest('#btn-export-pdf');
      if (btnPdf) {
        e.preventDefault();
        abrirModal();
        return;
      }
      var btnGen = e.target.closest('#btn-generar-pdf');
      if (btnGen) {
        e.preventDefault();
        generarPDF();
      }
    });
  });
})();
