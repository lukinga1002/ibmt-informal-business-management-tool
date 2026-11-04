import { jsPDF } from 'jspdf';
import { formatAmount } from '@/lib/format';

const qrImage = (data) => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;

function qrDataUrl(data) {
  return fetch(qrImage(data))
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }),
    );
}

/**
 * The printable receipt carries only figures the backend confirmed at the
 * moment of confirmation. Nothing is recalculated here.
 */
export async function downloadReceiptPdf(receipt) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('IBMT Rent - Risiti ya kodi ya nyumba', 48, 62);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Rekodi ya kodi - si risiti ya kodi ya serikali (EFD/VFD).', 48, 80);

  const rows = [
    ['Namba ya risiti', receipt.receipt_reference],
    ['Namba ya rekodi', receipt.record_reference],
    ['Nyumba', receipt.unit_ref],
    ['Kata', receipt.ward || '-'],
    ['Kipindi', receipt.period_month],
    ['Kodi', formatAmount(receipt.amount, 'TZS', 'sw')],
    ['Amana', formatAmount(receipt.deposit_amount || 0, 'TZS', 'sw')],
    ['Njia ya malipo', receipt.method || '-'],
    ['Kumbukumbu ya malipo', receipt.mobile_money_ref || '-'],
    ['Ilipwa tarehe', receipt.paid_on || '-'],
    ['Iliandikwa na', `${receipt.entered_by_role || '-'} - ${receipt.entered_by_name || '-'}`],
    ['Ilithibitishwa na', receipt.confirmed_by_name || '-'],
    ['Mkataba', receipt.lease_ref || '-'],
  ];

  let y = 116;
  rows.forEach(([label, value]) => {
    doc.setTextColor(110);
    doc.text(String(label), 48, y);
    doc.setTextColor(20);
    doc.text(String(value || '-'), 220, y);
    y += 20;
  });

  try {
    doc.addImage(await qrDataUrl(receipt.qr_url || receipt.receipt_reference), 'PNG', 400, 104, 120, 120);
  } catch {
    // The receipt stays valid without the code image.
  }

  doc.setTextColor(120);
  doc.setFontSize(8);
  doc.text('IBMT Rent - rekodi ya kodi iliyothibitishwa, si risiti ya kodi ya serikali.', 48, y + 24);
  doc.save(`${receipt.receipt_reference}.pdf`);
}