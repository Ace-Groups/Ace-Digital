import { renderIdCardPair } from './src/lib/id-card/render-svg';
import fs from 'fs';

const data = {
  employeeCode: 'EMP-001',
  fullName: 'John Doe',
  dob: '1990-01-01',
  bloodGroup: 'O+',
  teamName: 'Engineering',
  jobTitle: 'Senior Engineer',
  expirationLabel: 'DEC 2026',
  qrSvg: '<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="black"/></svg>',
  photoDataUrl: undefined,
  variant: 'employee'
};

const pair = renderIdCardPair(data as any);
fs.writeFileSync('/Users/kavin/Downloads/test_id_card_front.svg', pair.frontSvg);
console.log('Done SVG generation');
