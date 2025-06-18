document.addEventListener('DOMContentLoaded', function () {
  const calendarEl = document.getElementById('calendar');
  const form = document.getElementById('agendaForm');
  let citas = JSON.parse(localStorage.getItem('citasNutri')) || [];

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    selectable: true,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: citas.map(cita => ({
      id: cita.id,
      title: `${cita.nombre} ${cita.pagado ? '✅' : '❌'}`,
      start: `${cita.fecha}T${cita.hora}`,
      extendedProps: {
        correo: cita.correo,
        telefono: cita.telefono,
        metodoPago: cita.metodoPago,
        pagado: cita.pagado,
        captura: cita.captura
      }
    })),
    eventClick: function (info) {
      const c = info.event.extendedProps;
      Swal.fire({
        title: `Cita de ${info.event.title}`,
        html: `
          <b>Correo:</b> ${c.correo} <br/>
          <b>Teléfono:</b> ${c.telefono} <br/>
          <b>Método de pago:</b> ${c.metodoPago} <br/>
          <b>Pago realizado:</b> ${c.pagado ? 'Sí ✅' : 'No ❌'} <br/>
          ${c.captura ? `<img src="${c.captura}" alt="Captura" style="max-width:200px; margin-top:10px; border-radius:8px;"/>` : ''}
          <hr/>
          ¿Qué deseas hacer con esta cita?
        `,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Editar',
        denyButtonText: 'Cancelar cita',
        cancelButtonText: 'Cerrar'
      }).then((result) => {
        if (result.isConfirmed) {
          abrirEditar(info.event.id);
        } else if (result.isDenied) {
          citas = citas.filter(cita => cita.id !== info.event.id);
          localStorage.setItem('citasNutri', JSON.stringify(citas));
          info.event.remove();
          Swal.fire('Cancelada', 'La cita ha sido cancelada.', 'success');
          form.reset();
        }
      });
    }
  });

  calendar.render();

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;
    const metodoPago = document.getElementById('metodoPago').value;
    const pagado = document.getElementById('pagado').checked;
    const capturaInput = document.getElementById('captura');
    const file = capturaInput.files[0];
    const editId = document.getElementById('editId').value;

    if (!fecha || !hora) {
      Swal.fire('Error', 'Debe seleccionar una fecha y una hora.', 'error');
      return;
    }

    // Validar rango de hora permitido
    if (hora < "14:30" || hora > "16:30") {
      Swal.fire('Hora inválida', 'Por favor selecciona una hora entre 2:30 PM y 4:30 PM.', 'error');
      return;
    }

    const enviarWhatsApp = (cita) => {
      const mensaje = `*Nueva cita agendada:*\n\n` +
        `👤 *Nombre:* ${cita.nombre}\n` +
        `📧 *Correo:* ${cita.correo}\n` +
        `📱 *Teléfono:* ${cita.telefono}\n` +
        `📅 *Fecha:* ${cita.fecha} ${cita.hora}\n` +
        `💳 *Método de pago:* ${cita.metodoPago}\n` +
        `💰 *¿Pagado?:* ${cita.pagado ? "Sí" : "No"}`;

      const numeroWhatsApp = "584142674367";
      const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

      Swal.fire("Cita registrada", "Se abrirá WhatsApp para notificar.", "success").then(() => {
        window.open(url, "_blank");
      });
    };

    if (editId) {
      const index = citas.findIndex(c => c.id === editId);
      if (index === -1) return;

      const actualizarCita = (capturaBase64) => {
        const citaEditada = {
          id: editId,
          nombre,
          correo,
          telefono,
          fecha,
          hora,
          metodoPago,
          pagado,
          captura: capturaBase64 || citas[index].captura
        };

        citas[index] = citaEditada;
        localStorage.setItem('citasNutri', JSON.stringify(citas));

        calendar.getEventById(editId).remove();
        calendar.addEvent({
          id: citaEditada.id,
          title: `${nombre} ${pagado ? '✅' : '❌'}`,
          start: `${fecha}T${hora}`,
          extendedProps: {
            correo,
            telefono,
            metodoPago,
            pagado,
            captura: citaEditada.captura
          }
        });

        Swal.fire('Actualizada', 'La cita ha sido actualizada.', 'success');
        form.reset();
        document.getElementById('editId').value = '';
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = function (ev) {
          actualizarCita(ev.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        actualizarCita(null);
      }
    } else {
      if (citas.some(cita => cita.fecha === fecha && cita.hora === hora)) {
        Swal.fire('Error', 'Ya hay una cita para esta fecha y hora.', 'error');
        return;
      }

      const guardarCita = (capturaBase64) => {
        const nuevaCita = {
          id: String(Date.now()),
          nombre,
          correo,
          telefono,
          fecha,
          hora,
          metodoPago,
          pagado,
          captura: capturaBase64
        };

        citas.push(nuevaCita);
        localStorage.setItem('citasNutri', JSON.stringify(citas));

        calendar.addEvent({
          id: nuevaCita.id,
          title: `${nombre} ${pagado ? '✅' : '❌'}`,
          start: `${fecha}T${hora}`,
          extendedProps: {
            correo,
            telefono,
            metodoPago,
            pagado,
            captura: capturaBase64
          }
        });

        enviarWhatsApp(nuevaCita);
        form.reset();
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = function (ev) {
          guardarCita(ev.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        guardarCita(null);
      }
    }
  });

  window.abrirEditar = function (id) {
    const cita = citas.find(c => c.id === id);
    if (!cita) return;

    document.getElementById('editId').value = cita.id;
    document.getElementById('nombre').value = cita.nombre;
    document.getElementById('correo').value = cita.correo;
    document.getElementById('telefono').value = cita.telefono;
    document.getElementById('fecha').value = cita.fecha;
    document.getElementById('hora').value = cita.hora;
    document.getElementById('metodoPago').value = cita.metodoPago;
    document.getElementById('pagado').checked = cita.pagado;

    window.scrollTo({ top: form.offsetTop, behavior: 'smooth' });
  };
});
