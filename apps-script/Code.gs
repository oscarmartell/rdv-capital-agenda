/**
 * Agenda RDV Capital - servicio de lectura independiente.
 * Proyecto Apps Script AUTÓNOMO (no vinculado a la planilla).
 * Solo devuelve roles, nombres y estados de los meses permitidos.
 */
const SPREADSHEET_ID = '1R6EQWKFzXlNKZ4KNwNWMCCeY-DYbrw3E0NrLTZogWgk';
const ZONE = 'America/Argentina/Buenos_Aires';
const ROLES = ['Dirige', 'Predica', 'Santa Cena', 'Ofrendas', 'Anuncios'];
function doGet(e) {
  try {
    const now = new Date();
    const current = Number(Utilities.formatDate(now, ZONE, 'yyyy')) * 12 + Number(Utilities.formatDate(now, ZONE, 'MM')) - 1;
    const requested = String((e && e.parameter && e.parameter.mes) || '');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(requested)) return json_({error:'Mes inválido'});
    const [year, month] = requested.split('-').map(Number);
    const target = year * 12 + month - 1;
    if (Math.abs(target - current) > 1) return json_({error:'Mes no disponible'});
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(String(month).padStart(2,'0')+'-'+year);
    if (!sheet) return json_({dias:[]});
    const values = sheet.getDataRange().getDisplayValues();
    const days = [];
    // Estructura mensual: siete días, dos columnas por día, semana de 10 filas aprox.
    for (let r = 0; r < values.length; r++) {
      const row = values[r] || [];
      for (let day = 0; day < 7; day++) {
        const col = 1 + day * 2;
        const cell = String(row[col] || '').trim();
        if (!/^\d{1,2}$/.test(cell)) continue;
        const dateNumber = Number(cell);
        const date = new Date(year, month - 1, dateNumber);
        if (date.getMonth() !== month - 1) continue;
        const assignments = [];
        for (let offset = 1; offset <= 5; offset++) {
          const data = values[r + offset] || [];
          const name = String(data[col] || '').trim();
          const status = String(data[col + 1] || '').trim();
          if (!name || /^pendiente$/i.test(name)) continue;
          assignments.push({rol:ROLES[offset - 1],nombre:name,estado:['Confirmado','Informado','Pendiente'].includes(status)?status:'Pendiente'});
        }
        if (assignments.length) days.push({fecha:Utilities.formatDate(date,ZONE,'EEEE d/MM/yyyy'),orden:date.getTime(),asignaciones:assignments});
      }
    }
    days.sort((a,b)=>a.orden-b.orden);
    return json_({dias:days.map(({fecha,asignaciones})=>({fecha,asignaciones}))});
  } catch (error) {
    console.error(error);
    return json_({error:'No se pudo consultar la agenda'});
  }
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
