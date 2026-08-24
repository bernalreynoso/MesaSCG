import { ColumnMapping, Ticket, ConversacionRow } from '../types';

export function buscarColumnaFlexible(candidatos: string[], columnas: string[]): string | null {
  for (const cand of candidatos) {
    const candNorm = cand.toLowerCase().trim();
    // 1. Coincidencia exacta primero
    for (const col of columnas) {
      const colNorm = String(col).toLowerCase().trim();
      if (colNorm === candNorm) {
        return col;
      }
    }
    // 2. Coincidencia por subcadena
    for (const col of columnas) {
      const colNorm = String(col).toLowerCase().trim();
      if (colNorm.includes(candNorm)) {
        return col;
      }
    }
  }
  return null;
}

export function autoDetectMapping(columns: string[]): ColumnMapping {
  return {
    col_id: buscarColumnaFlexible(['id original', 'request id', 'id ticket', 'ticket id', 'folio', 'numero', 'id'], columns),
    col_estado: buscarColumnaFlexible(['estado', 'status', 'estatus', 'state'], columns),
    col_fecha: buscarColumnaFlexible(['fecha de creación', 'fecha de creacion', 'created time', 'fecha creacion', 'fecha'], columns),
    col_tecnico_atencion: buscarColumnaFlexible(
      [
        'técnico en atención',
        'tecnico en atencion',
        'técnico atención',
        'tecnico atencion',
        'assigned technician',
        'technician in charge',
        'técnico en atencion',
        'tecnico en atención',
        'tecnico de atencion',
        'técnico de atención',
        'tecnico atiende',
      ],
      columns
    ),
    col_tecnico: buscarColumnaFlexible(['técnico asignado', 'tecnico asignado', 'grupo asignado', 'grupo', 'owner', 'tecnico', 'técnico', 'asignado'], columns),
    col_categoria: buscarColumnaFlexible(['categoría', 'categoria', 'category'], columns),
    col_subcategoria: buscarColumnaFlexible(['subcategoría', 'subcategoria', 'subcategory'], columns),
    col_articulo: buscarColumnaFlexible(['artículo', 'articulo', 'item'], columns),
    col_tipo: buscarColumnaFlexible(['tipo de solicitud', 'tipo solicitud', 'request type', 'tipo'], columns),
    col_solicitante: buscarColumnaFlexible(['nombre del solicitante', 'solicitante', 'requester', 'usuario solicitante'], columns),
    col_correo_dest: buscarColumnaFlexible(
      ['correo electrónico del destinatario de la conversación', 'correo electronico del destinatario', 'destinatario de la conversacion', 'correo destinatario', 'destinatario correo', 'correo'],
      columns
    ),
    col_participantes: buscarColumnaFlexible(['participantes del equipo', 'participantes equipo', 'equipo', 'participantes'], columns),
    col_mesa_ayuda: buscarColumnaFlexible(
      ['participantes de mesa de ayuda', 'participantes mesa de ayuda', 'mesa de ayuda', 'helpdesk'],
      columns
    ),
    col_asunto: buscarColumnaFlexible(
      ['asunto de la conversación', 'asunto de la conversacion', 'asunto de la solicitud', 'asunto', 'subject', 'título', 'titulo'],
      columns
    ),
    col_descripcion: buscarColumnaFlexible(
      ['descripción de la solicitud', 'descripcion de la solicitud', 'descripción', 'descripcion', 'description', 'detalle', 'solicitud', 'cuerpo de la solicitud', 'observaciones'],
      columns
    ),
    col_resolucion: buscarColumnaFlexible(
      ['resolución', 'resolucion', 'resolution', 'solución', 'solucion', 'conclusion'],
      columns
    ),
    col_remitente_correo: buscarColumnaFlexible(
      ['correo electrónico del remitente', 'correo electronico del remitente', 'correo remitente', 'remitente correo', 'de (correo)', 'from email', 'from', 'remitente'],
      columns
    ),
    col_remitente_nombre: buscarColumnaFlexible(
      ['nombre del remitente', 'nombre remitente', 'remitente nombre', 'sender name', 'from name'],
      columns
    ),
    col_destinatario: buscarColumnaFlexible(
      ['destinatario de la conversación', 'destinatario', 'para', 'to', 'recipient'],
      columns
    ),
    col_cc: buscarColumnaFlexible(
      ['en copia (cc)', 'con copia', 'en copia', 'copia (cc)', 'copiados', 'cc'],
      columns
    ),
    col_cco: buscarColumnaFlexible(
      ['en copia oculta (cco)', 'copia oculta', 'con copia oculta', 'cco', 'bcc'],
      columns
    ),
    col_fecha_conversacion: buscarColumnaFlexible(
      ['fecha de la conversación', 'fecha de la conversacion', 'fecha de conversacion', 'fecha de mensaje', 'conversation time', 'message date', 'fecha conversación'],
      columns
    ),
    col_cuerpo_conversacion: buscarColumnaFlexible(
      ['cuerpo de la conversación', 'cuerpo de la conversacion', 'contenido del mensaje', 'mensaje', 'cuerpo', 'contenido', 'conversacion', 'conversación'],
      columns
    ),
  };
}

export function parseRowsToTickets(rows: Record<string, any>[], mapping: ColumnMapping): Ticket[] {
  const ticketMap = new Map<string, Ticket>();

  rows.forEach((row, index) => {
    const getVal = (colName: string | null) => {
      if (!colName || row[colName] === undefined || row[colName] === null) return '';
      return String(row[colName]).trim();
    };

    const rawId = getVal(mapping.col_id);
    if (!rawId) {
      // Verificar si la fila está vacía en su totalidad
      const hasContent = Object.values(row).some((v) => v !== null && v !== undefined && String(v).trim() !== '');
      if (!hasContent) return;
    }

    const id = rawId ? rawId.replace(/\.0$/, '').trim() : `TICK-${index + 1}`;
    if (!id) return;

    const correoDest = getVal(mapping.col_correo_dest) || getVal(mapping.col_destinatario);
    const participantes = getVal(mapping.col_participantes);
    const mesaAyuda = getVal(mapping.col_mesa_ayuda);
    const asunto = getVal(mapping.col_asunto);
    const descripcion = getVal(mapping.col_descripcion);
    const resolucion = getVal(mapping.col_resolucion);
    const remitenteCorreo = getVal(mapping.col_remitente_correo);
    const remitenteNombre = getVal(mapping.col_remitente_nombre);
    const cc = getVal(mapping.col_cc);
    const cco = getVal(mapping.col_cco);
    const tecAtencion = getVal(mapping.col_tecnico_atencion);
    const fechaConv = getVal(mapping.col_fecha_conversacion) || getVal(mapping.col_fecha);
    const cuerpoConv = getVal(mapping.col_cuerpo_conversacion) || descripcion;
    const estado = getVal(mapping.col_estado);

    const conversacionRow: ConversacionRow = {
      index: index + 1,
      fecha: fechaConv,
      asunto: asunto,
      descripcion: descripcion,
      cuerpo: cuerpoConv,
      remitenteCorreo: remitenteCorreo,
      remitenteNombre: remitenteNombre,
      destinatarioCorreo: correoDest,
      participantes: participantes,
      cc: cc,
      cco: cco,
      resolucion: resolucion,
      estado: estado,
      raw: row,
    };

    if (ticketMap.has(id)) {
      const existing = ticketMap.get(id)!;

      // 1. Conservar íntegramente todas las filas y conversaciones
      existing.rawRows.push(row);
      existing.conversaciones.push(conversacionRow);

      // 2. Concatenar correos de destinatarios únicos (para compatibilidad con dashboards existentes)
      if (correoDest) {
        const existingEmails = existing.correoDestinatario
          ? existing.correoDestinatario.split(',').map((e) => e.trim()).filter(Boolean)
          : [];
        const newEmails = correoDest.split(',').map((e) => e.trim()).filter(Boolean);

        for (const email of newEmails) {
          if (!existingEmails.includes(email)) {
            existingEmails.push(email);
          }
        }
        existing.correoDestinatario = existingEmails.join(', ');
      }

      // 3. Concatenar Participantes del Equipo únicos
      if (participantes) {
        const existingPart = existing.participantesEquipo
          ? existing.participantesEquipo.split(',').map((p) => p.trim()).filter(Boolean)
          : [];
        const newPart = participantes.split(',').map((p) => p.trim()).filter(Boolean);

        for (const p of newPart) {
          if (!existingPart.includes(p)) {
            existingPart.push(p);
          }
        }
        existing.participantesEquipo = existingPart.join(', ');
      }

      // 4. Concatenar Participantes de Mesa de Ayuda únicos
      if (mesaAyuda) {
        const existingMesa = existing.participantesMesaAyuda
          ? existing.participantesMesaAyuda.split(',').map((m) => m.trim()).filter(Boolean)
          : [];
        const newMesa = mesaAyuda.split(',').map((m) => m.trim()).filter(Boolean);

        for (const m of newMesa) {
          if (!existingMesa.includes(m)) {
            existingMesa.push(m);
          }
        }
        existing.participantesMesaAyuda = existingMesa.join(', ');
      }

      // 5. Rellenar campos de cabecera y Técnico en Atención
      if (tecAtencion && tecAtencion.toLowerCase() !== 'no asignado' && tecAtencion.toLowerCase() !== 'sin asignar') {
        if (!existing.tecnicoEnAtencion || existing.tecnicoEnAtencion.toLowerCase() === 'no asignado' || existing.tecnicoEnAtencion.toLowerCase() === 'sin asignar') {
          existing.tecnicoEnAtencion = tecAtencion;
          existing.tecnicoAtencion = tecAtencion;
        } else {
          // Si aparece en diferentes filas, conservar los valores únicos
          const existingList = existing.tecnicoEnAtencion.split(',').map((s) => s.trim()).filter(Boolean);
          if (!existingList.some((s) => s.toLowerCase() === tecAtencion.toLowerCase())) {
            existingList.push(tecAtencion);
            existing.tecnicoEnAtencion = existingList.join(', ');
            existing.tecnicoAtencion = existing.tecnicoEnAtencion;
          }
        }
      }
      if ((!existing.tecnicoAsignado || existing.tecnicoAsignado === 'Sin Asignar') && getVal(mapping.col_tecnico)) {
        existing.tecnicoAsignado = getVal(mapping.col_tecnico);
      }
      if ((!existing.estado || existing.estado === 'Sin Estado') && estado) {
        existing.estado = estado;
      }
      if ((!existing.categoria || existing.categoria === 'Sin Categoría') && getVal(mapping.col_categoria)) {
        existing.categoria = getVal(mapping.col_categoria);
      }
      if ((!existing.subcategoria || existing.subcategoria === 'Sin Subcategoría') && getVal(mapping.col_subcategoria)) {
        existing.subcategoria = getVal(mapping.col_subcategoria);
      }
      if ((!existing.articulo || existing.articulo === 'Sin Artículo') && getVal(mapping.col_articulo)) {
        existing.articulo = getVal(mapping.col_articulo);
      }
      if ((!existing.solicitante || existing.solicitante === 'Sin Solicitante') && getVal(mapping.col_solicitante)) {
        existing.solicitante = getVal(mapping.col_solicitante);
      }
      if (!existing.fechaCreacion && getVal(mapping.col_fecha)) {
        existing.fechaCreacion = getVal(mapping.col_fecha);
      }
      if (!existing.tipoSolicitud && getVal(mapping.col_tipo)) {
        existing.tipoSolicitud = getVal(mapping.col_tipo);
      }
      if (!existing.asunto && asunto) {
        existing.asunto = asunto;
      }
      if (!existing.descripcion && descripcion) {
        existing.descripcion = descripcion;
      }
      if (!existing.resolucion && resolucion) {
        existing.resolucion = resolucion;
      }
    } else {
      ticketMap.set(id, {
        id,
        estado: estado || 'Sin Estado',
        fechaCreacion: getVal(mapping.col_fecha),
        tecnicoAsignado: getVal(mapping.col_tecnico) || 'Sin Asignar',
        tecnicoEnAtencion: tecAtencion || undefined,
        tecnicoAtencion: tecAtencion || undefined,
        categoria: getVal(mapping.col_categoria) || 'Sin Categoría',
        subcategoria: getVal(mapping.col_subcategoria) || 'Sin Subcategoría',
        articulo: getVal(mapping.col_articulo) || 'Sin Artículo',
        tipoSolicitud: getVal(mapping.col_tipo) || 'Sin Tipo',
        solicitante: getVal(mapping.col_solicitante) || 'Sin Solicitante',
        correoDestinatario: correoDest,
        participantesEquipo: participantes,
        participantesMesaAyuda: mesaAyuda,
        asunto: asunto,
        descripcion: descripcion,
        resolucion: resolucion,
        conversaciones: [conversacionRow],
        rawRows: [row],
        raw: row,
      });
    }
  });

  // Ordenar conversaciones cronológicamente si hay fechas analizables, conservando el orden de fila original como respaldo
  for (const ticket of ticketMap.values()) {
    if (ticket.conversaciones.length > 1) {
      ticket.conversaciones.sort((a, b) => {
        const timeA = a.fecha ? Date.parse(a.fecha) : NaN;
        const timeB = b.fecha ? Date.parse(b.fecha) : NaN;
        if (!isNaN(timeA) && !isNaN(timeB)) {
          return timeA - timeB;
        }
        return a.index - b.index;
      });
    }
  }

  return Array.from(ticketMap.values());
}
