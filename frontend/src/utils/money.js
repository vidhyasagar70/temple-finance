/**
 * Converts integer paise to decimal rupees.
 * @param {number} paise 
 * @returns {number}
 */
export function paiseToRupees(paise) {
  if (paise === null || paise === undefined || isNaN(paise)) return 0;
  return Number(paise) / 100;
}

/**
 * Formats integer paise into Indian Rupee currency string (₹1,23,456.50).
 * @param {number} paise 
 * @returns {string}
 */
export function formatINR(paise) {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(rupees);
}

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertUnderThousand(n) {
  let str = '';
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
  } else if (n > 0) {
    str += ones[n];
  }
  return str.trim();
}

/**
 * Converts rupee numeric value to Indian numbering system words representation.
 * e.g., 588420 -> "Five Lakh Eighty-Eight Thousand Four Hundred Twenty Rupees Only"
 */
export function rupeesInWords(rupeeAmount) {
  const amount = Math.floor(Math.abs(Number(rupeeAmount) || 0));
  const paise = Math.round((Math.abs(Number(rupeeAmount) || 0) - amount) * 100);

  if (amount === 0 && paise === 0) return 'Zero Rupees Only';

  let crore = Math.floor(amount / 10000000);
  let remainder = amount % 10000000;

  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;

  let thousand = Math.floor(remainder / 1000);
  remainder %= 1000;

  let hundred = remainder;

  let result = '';

  if (crore > 0) {
    result += convertUnderThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertUnderThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertUnderThousand(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    result += convertUnderThousand(hundred) + ' ';
  }

  result = result.trim() + ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertUnderThousand(paise) + ' Paise';
  }

  return result + ' Only';
}

/**
 * Converts integer paise to Indian numbering system words representation.
 */
export function paiseToWords(paise) {
  const rupees = paiseToRupees(paise);
  return rupeesInWords(rupees);
}
