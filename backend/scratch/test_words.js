const testValues = [
  45800000,  // ₹4,58,000
  26800000,  // ₹2,68,000
  72600000,  // ₹7,26,000
  58842000,  // ₹5,88,420
  14058000,  // ₹1,40,580
];

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertUnderThousand(n) {
  let str = '';
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  } else if (n > 0) {
    str += ones[n];
  }
  return str.trim();
}

function rupeesInWords(rupeeAmount) {
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

console.log('Words Test:');
testValues.forEach((paise) => {
  const rupees = paise / 100;
  console.log(`₹${rupees.toLocaleString('en-IN')} => ${rupeesInWords(rupees)}`);
});
