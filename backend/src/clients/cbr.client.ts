interface CbrValute {
  CharCode: string;
  Nominal: number;
  Value: number;
}

export interface CbrResponse {
  date: Date;
  valutes: Record<string, CbrValute>;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function formatCbrDate(date: Date): string {
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const year = `${date.getUTCFullYear()}`;
  return `${day}/${month}/${year}`;
}

function parseCbrXml(xml: string): CbrResponse {
  const dateMatch = xml.match(/Date="(\d{2})\.(\d{2})\.(\d{4})"/);
  if (!dateMatch) {
    throw new Error('CBR response missing date attribute');
  }
  const [, day, month, year] = dateMatch;
  const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  const valutes: Record<string, CbrValute> = {};
  const valuteRegex = /<Valute[^>]*>(.*?)<\/Valute>/gms;
  let match: RegExpExecArray | null;
  while ((match = valuteRegex.exec(xml))) {
    const block = match[1];
    const codeMatch = block.match(/<CharCode>([A-Z]{3})<\/CharCode>/);
    const nominalMatch = block.match(/<Nominal>(\d+)<\/Nominal>/);
    const valueMatch = block.match(/<Value>([\d,\.]+)<\/Value>/);
    if (!codeMatch || !nominalMatch || !valueMatch) {
      continue;
    }
    const code = codeMatch[1];
    const nominal = Number(nominalMatch[1]);
    const rawValue = valueMatch[1].replace(',', '.');
    const value = Number(rawValue);
    if (Number.isNaN(value) || Number.isNaN(nominal)) {
      continue;
    }
    valutes[code] = { CharCode: code, Nominal: nominal, Value: value };
  }

  return { date: parsedDate, valutes };
}

export async function fetchCbrRates(targetDate: Date): Promise<CbrResponse> {
  let requestDate = addDays(targetDate, 1);
  const maxAttempts = 7;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const url = `https://cbr.ru/scripts/XML_daily.asp?date_req=${formatCbrDate(requestDate)}`;
    const response = await fetch(url);

    if (response.ok) {
      const payload = parseCbrXml(await response.text());
      return payload;
    }

    requestDate = addDays(requestDate, 1);
  }

  throw new Error('No CBR rates found for requested period');
}
