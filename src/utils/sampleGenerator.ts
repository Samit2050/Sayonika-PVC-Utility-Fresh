import { DocumentType } from '../types';

/**
 * Creates realistic, high-fidelity sample documents on canvas (A4 standard 1654 x 2338 px @ 200 DPI)
 * mimicking Government of India & West Bengal PDF forms with the exact layout coordinates.
 */
export function generateSampleDocumentCanvas(type: DocumentType): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  // High resolution True 300 DPI A4 canvas (2480 x 3508 px)
  canvas.width = 2480;
  canvas.height = 3508;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background white page
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  // Scale 2x for sub-pixel vector and typography sharpness
  ctx.scale(2, 2);

  const baseW = 1240;
  const baseH = 1754;

  if (type === 'aadhaar') {
    renderSampleAadhaar(ctx, baseW, baseH);
  } else if (type === 'voter') {
    renderSampleVoter(ctx, baseW, baseH);
  } else if (type === 'wb_ration') {
    renderSampleWbRation(ctx, baseW, baseH);
  } else if (type === 'pan') {
    renderSamplePan(ctx, baseW, baseH);
  } else if (type === 'driving_license') {
    renderSampleDrivingLicense(ctx, baseW, baseH);
  } else if (type === 'student_id') {
    renderSampleStudentId(ctx, baseW, baseH);
  } else {
    renderSampleAyushman(ctx, baseW, baseH);
  }

  ctx.restore();
  return canvas;
}

function renderSampleAadhaar(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Top letterhead
  ctx.fillStyle = '#C8232C';
  ctx.fillRect(40, 40, w - 80, 8);
  ctx.fillStyle = '#FF9933';
  ctx.fillRect(40, 52, w - 80, 4);

  // UIDAI Header Text
  ctx.fillStyle = '#222222';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Unique Identification Authority of India', 120, 100);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#555555';
  ctx.fillText('Government of India / e-Aadhaar Document', 120, 125);

  // Address block & Demographics in upper letter
  ctx.fillStyle = '#F8F9FA';
  ctx.fillRect(60, 160, w - 120, 280);
  ctx.strokeStyle = '#E5E7EB';
  ctx.strokeRect(60, 160, w - 120, 280);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('To,', 90, 200);
  ctx.fillText('Samit Biswas', 90, 230);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#4B5563';
  ctx.fillText('S/O: Robin Biswas, Biswas Xerox Point', 90, 260);
  ctx.fillText('Bangaon Road, North 24 Parganas, West Bengal - 743235', 90, 285);
  ctx.fillText('Mobile: 98XXXXXX40', 90, 310);

  // Middle instructions banner
  ctx.fillStyle = '#FEF3C7';
  ctx.fillRect(60, 460, w - 120, 260);
  ctx.strokeStyle = '#FDE68A';
  ctx.strokeRect(60, 460, w - 120, 260);

  ctx.fillStyle = '#92400E';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('INFORMATION & VALIDITY INSTRUCTIONS / তথ্য ও নির্দেশাবলী', 90, 495);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#451A03';
  ctx.fillText('1. Aadhaar is a proof of identity, not of citizenship.', 90, 530);
  ctx.fillText('2. Physical printout of downloaded e-Aadhaar is legally valid throughout India.', 90, 560);
  ctx.fillText('3. Keep your mobile number updated in Aadhaar for OTP authentication services.', 90, 590);

  // Bottom Cut Line
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(40, h * 0.69);
  ctx.lineTo(w - 40, h * 0.69);
  ctx.stroke();
  ctx.setLineDash([]);

  // Scissors icon text
  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('✂ Cut from here for PVC / Laminated Card', 80, (h * 0.69) - 8);

  // PVC Card Bottom Strip (Matches Preset coordinates: x: 5.4%, y: 70.8%, w: 43.6%, h: 26.2%)
  const cardY = h * 0.708;
  const cardH = h * 0.262;
  const cardW = w * 0.436;
  const frontX = w * 0.054;
  const backX = w * 0.510;

  // FRONT CARD
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(frontX, cardY, cardW, cardH);
  ctx.strokeStyle = '#1E3A8A';
  ctx.lineWidth = 2;
  ctx.strokeRect(frontX, cardY, cardW, cardH);

  // Front Tricolor band
  ctx.fillStyle = '#FF9933';
  ctx.fillRect(frontX + 2, cardY + 2, cardW - 4, 6);
  ctx.fillStyle = '#138808';
  ctx.fillRect(frontX + 2, cardY + cardH - 8, cardW - 4, 6);

  // Front Header
  ctx.fillStyle = '#1E3A8A';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('ভারত সরকার / Govt. of India', frontX + 16, cardY + 32);

  // Photo Box
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(frontX + 18, cardY + 48, 100, 125);
  ctx.strokeStyle = '#94A3B8';
  ctx.strokeRect(frontX + 18, cardY + 48, 100, 125);
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('PHOTO', frontX + 45, cardY + 115);

  // Details
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Samit Biswas', frontX + 130, cardY + 70);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('DOB: 15/08/1994', frontX + 130, cardY + 98);
  ctx.fillText('Gender: Male / পুরুষ', frontX + 130, cardY + 124);

  // Aadhaar Number Big (12 digits)
  ctx.fillStyle = '#DC2626';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('XXXX  XXXX  4589', frontX + 40, cardY + cardH - 30);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#1E3A8A';
  ctx.fillText('আমার আধার, আমার পরিচয়', frontX + 160, cardY + cardH - 12);

  // BACK CARD
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(backX, cardY, cardW, cardH);
  ctx.strokeStyle = '#1E3A8A';
  ctx.lineWidth = 2;
  ctx.strokeRect(backX, cardY, cardW, cardH);

  // Back Tricolor band
  ctx.fillStyle = '#FF9933';
  ctx.fillRect(backX + 2, cardY + 2, cardW - 4, 6);
  ctx.fillStyle = '#138808';
  ctx.fillRect(backX + 2, cardY + cardH - 8, cardW - 4, 6);

  ctx.fillStyle = '#1E3A8A';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Unique Identification Authority of India', backX + 16, cardY + 32);

  // Address
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('Address / ঠিকানা:', backX + 18, cardY + 60);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('S/O: Robin Biswas, Biswas Xerox & Cyber,', backX + 18, cardY + 82);
  ctx.fillText('Vill: Bangaon, PO: Bangaon, Dist: North 24 Parganas,', backX + 18, cardY + 102);
  ctx.fillText('West Bengal, PIN - 743235, India', backX + 18, cardY + 122);

  // QR Code Box
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(backX + cardW - 130, cardY + 140, 110, 110);
  ctx.strokeStyle = '#64748B';
  ctx.strokeRect(backX + cardW - 130, cardY + 140, 110, 110);
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('SECURE QR', backX + cardW - 110, cardY + 200);

  // Helpline
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#DC2626';
  ctx.fillText('Toll Free: 1947 | help@uidai.gov.in', backX + 18, cardY + cardH - 24);
}

function renderSampleVoter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // ECI Header
  ctx.fillStyle = '#1E3A8A';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('ELECTION COMMISSION OF INDIA', 80, 80);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#4B5563';
  ctx.fillText('ভরত নির্বাচন কমিশন / e-EPIC Digital Download', 80, 110);

  // Form Details
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(80, 150, w - 160, 240);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Electoral Identification Slip / ভোটার তথ্য বিবরণী', 110, 190);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#4B5563';
  ctx.fillText('EPIC Number: WBF2948192', 110, 225);
  ctx.fillText('Assembly Constituency No. & Name: 95 - Bangaon Uttar', 110, 255);
  ctx.fillText('Part No: 142 | Serial No: 485', 110, 285);

  // Scissor line
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(50, h * 0.55);
  ctx.lineTo(w - 50, h * 0.55);
  ctx.stroke();
  ctx.setLineDash([]);

  // Voter Card Boxes (Matches Preset: x: 7.2%, y: 57.0%, w: 41.5%, h: 38.5%)
  const cardY = h * 0.570;
  const cardH = h * 0.385;
  const cardW = w * 0.415;
  const frontX = w * 0.072;
  const backX = w * 0.513;

  // Front Voter Card
  ctx.fillStyle = '#EFF6FF';
  ctx.fillRect(frontX, cardY, cardW, cardH);
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 3;
  ctx.strokeRect(frontX, cardY, cardW, cardH);

  // Header band
  ctx.fillStyle = '#1E40AF';
  ctx.fillRect(frontX, cardY, cardW, 42);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('ELECTION COMMISSION OF INDIA', frontX + 16, cardY + 28);

  // Voter Photo
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(frontX + 24, cardY + 60, 110, 140);
  ctx.strokeStyle = '#64748B';
  ctx.strokeRect(frontX + 24, cardY + 60, 110, 140);
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('ELECTOR PHOTO', frontX + 30, cardY + 135);

  // EPIC No
  ctx.fillStyle = '#DC2626';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('WBF2948192', frontX + 155, cardY + 90);

  // Name & details
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Samit Biswas', frontX + 155, cardY + 125);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('Father: Robin Biswas', frontX + 155, cardY + 150);
  ctx.fillText('Gender: Male / পুরুষ', frontX + 155, cardY + 175);
  ctx.fillText('DOB: 15/08/1994', frontX + 155, cardY + 200);

  // Back Voter Card
  ctx.fillStyle = '#EFF6FF';
  ctx.fillRect(backX, cardY, cardW, cardH);
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 3;
  ctx.strokeRect(backX, cardY, cardW, cardH);

  ctx.fillStyle = '#1E40AF';
  ctx.fillRect(backX, cardY, cardW, 42);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('ELECTORAL DETAILS / ঠিকানা', backX + 16, cardY + 28);

  // Back Details
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('Address / ঠিকানা:', backX + 20, cardY + 70);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('House No: 42, Biswas Para, Bangaon', backX + 20, cardY + 95);
  ctx.fillText('PO: Bangaon, Dist: North 24 Parganas', backX + 20, cardY + 118);
  ctx.fillText('Pin: 743235, West Bengal', backX + 20, cardY + 140);
  ctx.fillText('Electoral Registration Officer Signature', backX + 20, cardY + 220);

  // QR box
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(backX + cardW - 130, cardY + 140, 110, 110);
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('ECI QR CODE', backX + cardW - 115, cardY + 200);
}

function renderSampleWbRation(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // West Bengal Govt Logo & Header
  ctx.fillStyle = '#047857';
  ctx.fillRect(40, 40, w - 80, 12);
  ctx.fillStyle = '#065F46';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('GOVERNMENT OF WEST BENGAL', 80, 95);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#047857';
  ctx.fillText('Food & Supplies Department / খাদ্য ও সরবরাহ দপ্তর (WBPDS)', 80, 125);

  // Voucher Information
  ctx.fillStyle = '#ECFDF5';
  ctx.fillRect(60, 160, w - 120, 260);
  ctx.strokeStyle = '#A7F3D0';
  ctx.strokeRect(60, 160, w - 120, 260);

  ctx.fillStyle = '#064E3B';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Digital e-Ration Card Certificate / ই-রেশন কার্ড', 90, 200);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#065F46';
  ctx.fillText('Beneficiary: Samit Biswas', 90, 240);
  ctx.fillText('Card Category: RKSY-I (Rajya Khadya Suraksha Yojana)', 90, 270);
  ctx.fillText('Ration Card No: 0928374619 | FPS Code: 1948271', 90, 300);
  ctx.fillText('FPS Name: Bangaon Central Co-operative Store', 90, 330);

  // Scissor cutting line
  ctx.strokeStyle = '#6EE7B7';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(40, h * 0.59);
  ctx.lineTo(w - 40, h * 0.59);
  ctx.stroke();
  ctx.setLineDash([]);

  // Ration Card Boxes (Matches: x: 6.8%, y: 60.5%, w: 42.2%, h: 34.8%)
  const cardY = h * 0.605;
  const cardH = h * 0.348;
  const cardW = w * 0.422;
  const frontX = w * 0.068;
  const backX = w * 0.510;

  // Front WB Ration Card
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(frontX, cardY, cardW, cardH);
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 3;
  ctx.strokeRect(frontX, cardY, cardW, cardH);

  // Header band Green
  ctx.fillStyle = '#059669';
  ctx.fillRect(frontX, cardY, cardW, 40);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('খাদ্য ও সরবরাহ দপ্তর, পশ্চিমবঙ্গ', frontX + 16, cardY + 26);

  // Photo
  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(frontX + 18, cardY + 55, 95, 120);
  ctx.fillStyle = '#4B5563';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('PHOTO', frontX + 45, cardY + 118);

  // Category Tag
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(frontX + 125, cardY + 55, 100, 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('RKSY-I', frontX + 155, cardY + 72);

  // Details
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Samit Biswas', frontX + 125, cardY + 105);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#374151';
  ctx.fillText('Father: Robin Biswas', frontX + 125, cardY + 130);
  ctx.fillText('RC No: 0928374619', frontX + 125, cardY + 155);

  // Back WB Ration Card
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(backX, cardY, cardW, cardH);
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 3;
  ctx.strokeRect(backX, cardY, cardW, cardH);

  ctx.fillStyle = '#059669';
  ctx.fillRect(backX, cardY, cardW, 40);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('WBPDS DETAILS / ডিলার বিবরণ', backX + 16, cardY + 26);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('FPS / Dealer Name:', backX + 18, cardY + 68);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#374151';
  ctx.fillText('Bangaon Central Co-operative Store (1948271)', backX + 18, cardY + 90);
  ctx.fillText('Address: North 24 Parganas, WB', backX + 18, cardY + 112);
  ctx.fillText('Toll Free Helpline: 1967 / 1800 345 5505', backX + 18, cardY + 140);

  // QR code
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(backX + cardW - 120, cardY + 130, 100, 100);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('WBPDS QR', backX + cardW - 105, cardY + 185);
}

function renderSamplePan(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Income Tax Header
  ctx.fillStyle = '#1E3A8A';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('INCOME TAX DEPARTMENT / आयकर विभाग', 80, 80);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#4B5563';
  ctx.fillText('GOVERNMENT OF INDIA (NSDL e-PAN Letter)', 80, 110);

  // Letter contents
  ctx.fillStyle = '#F9FAFB';
  ctx.fillRect(60, 140, w - 120, 360);
  ctx.strokeStyle = '#E5E7EB';
  ctx.strokeRect(60, 140, w - 120, 360);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Dear Taxpayer,', 90, 180);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#374151';
  ctx.fillText('We are pleased to issue your Permanent Account Number (PAN) Card.', 90, 215);
  ctx.fillText('PAN allotted to you: ABCPB1234F', 90, 245);
  ctx.fillText('Please cut the lower portion of this letter to use as your PVC Card.', 90, 275);

  // Scissor line
  ctx.strokeStyle = '#9CA3AF';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(40, h * 0.665);
  ctx.lineTo(w - 40, h * 0.665);
  ctx.stroke();
  ctx.setLineDash([]);

  // PAN Card bottom section (Matches: x: 7.0%, y: 67.8%, w: 42.0%, h: 27.5%)
  const cardY = h * 0.678;
  const cardH = h * 0.275;
  const cardW = w * 0.420;
  const frontX = w * 0.070;
  const backX = w * 0.510;

  // Front PAN Card
  ctx.fillStyle = '#EFF6FF';
  ctx.fillRect(frontX, cardY, cardW, cardH);
  ctx.strokeStyle = '#1E3A8A';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(frontX, cardY, cardW, cardH);

  // Header band
  ctx.fillStyle = '#1E3A8A';
  ctx.fillRect(frontX, cardY, cardW, 36);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('INCOME TAX DEPARTMENT, GOVT. OF INDIA', frontX + 12, cardY + 24);

  // Photo
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(frontX + 16, cardY + 46, 85, 105);
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('PHOTO', frontX + 36, cardY + 105);

  // PAN Number
  ctx.fillStyle = '#DC2626';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('ABCPB1234F', frontX + 115, cardY + 70);

  // Name & Father
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('SAMIT BISWAS', frontX + 115, cardY + 100);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText("Father: ROBIN BISWAS", frontX + 115, cardY + 124);
  ctx.fillText("DOB: 15/08/1994", frontX + 115, cardY + 145);

  // Back PAN Card
  ctx.fillStyle = '#EFF6FF';
  ctx.fillRect(backX, cardY, cardW, cardH);
  ctx.strokeStyle = '#1E3A8A';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(backX, cardY, cardW, cardH);

  ctx.fillStyle = '#1E3A8A';
  ctx.fillRect(backX, cardY, cardW, 36);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('NATIONAL SECURITIES DEPOSITORY LIMITED', backX + 12, cardY + 24);

  ctx.fillStyle = '#0F172A';
  ctx.font = '12px sans-serif';
  ctx.fillText('This card is the property of Govt. of India.', backX + 18, cardY + 65);
  ctx.fillText('If found, please return to nearest Income Tax office.', backX + 18, cardY + 90);
  ctx.fillText('NSDL Helpline: 020-27218080', backX + 18, cardY + 115);

  // Hologram box
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(backX + cardW - 100, cardY + 120, 80, 80);
  ctx.fillStyle = '#854D0E';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('SECURITY QR', backX + cardW - 95, cardY + 165);
}

function renderSampleAyushman(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // PM-JAY Header
  ctx.fillStyle = '#EA580C';
  ctx.fillRect(40, 40, w - 80, 10);
  ctx.fillStyle = '#9A3412';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('AYUSHMAN BHARAT PRADHAN MANTRI JAN AROGYA YOJANA', 80, 95);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#4B5563';
  ctx.fillText('National Health Authority / স্বাস্থ্য সাথী ও আয়ুষ্মান ভারত কার্ড', 80, 125);

  // PVC Card Bottom Strip
  const cardY = h * 0.520;
  const cardH = h * 0.380;
  const cardW = w * 0.430;
  const frontX = w * 0.060;
  const backX = w * 0.510;

  // Front Ayushman
  ctx.fillStyle = '#FFFBEB';
  ctx.fillRect(frontX, cardY, cardW, cardH);
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 3;
  ctx.strokeRect(frontX, cardY, cardW, cardH);

  ctx.fillStyle = '#D97706';
  ctx.fillRect(frontX, cardY, cardW, 40);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('PM-JAY GOLDEN CARD', frontX + 16, cardY + 26);

  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(frontX + 20, cardY + 60, 100, 130);
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('PHOTO', frontX + 50, cardY + 130);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Samit Biswas', frontX + 135, cardY + 90);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#4B5563';
  ctx.fillText('ABHA / PMJAY ID:', frontX + 135, cardY + 120);
  ctx.fillStyle = '#DC2626';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('91-4928-1948-2819', frontX + 135, cardY + 145);

  // Back Ayushman
  ctx.fillStyle = '#FFFBEB';
  ctx.fillRect(backX, cardY, cardW, cardH);
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 3;
  ctx.strokeRect(backX, cardY, cardW, cardH);

  ctx.fillStyle = '#D97706';
  ctx.fillRect(backX, cardY, cardW, 40);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('HOSPITAL BENEFITS / সুবিধা বিবরণ', backX + 16, cardY + 26);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('Health Coverage: Rs. 5,00,000 / Year', backX + 20, cardY + 75);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#4B5563';
  ctx.fillText('Toll Free: 14555 | National Health Authority', backX + 20, cardY + 105);
}

function renderSampleDrivingLicense(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // MoRTH Parivahan Header
  ctx.fillStyle = '#1E3A8A';
  ctx.fillRect(40, 40, w - 80, 10);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('MINISTRY OF ROAD TRANSPORT & HIGHWAYS', 80, 90);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#4B5563';
  ctx.fillText('Government of West Bengal / Transport Department (Parivahan Sarathi)', 80, 118);

  // Form Details
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(60, 150, w - 120, 240);
  ctx.strokeStyle = '#E2E8F0';
  ctx.strokeRect(60, 150, w - 120, 240);

  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Driving Licence Acknowledgement Slip & Smart Card', 90, 190);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('DL No: WB-24 20180019284 | RTO: WB-24 (Barasat / Bangaon)', 90, 225);
  ctx.fillText('Name: Samit Biswas | Validity: 14/08/2038 (Non-Transport)', 90, 255);
  ctx.fillText('Vehicle Class: LMV (Light Motor Vehicle) & MCWG (Motorcycle With Gear)', 90, 285);

  // Scissor line
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(40, h * 0.56);
  ctx.lineTo(w - 40, h * 0.56);
  ctx.stroke();
  ctx.setLineDash([]);

  // DL Card Bottom section (Matches: x: 6.5%, y: 58.0%, w: 42.5%, h: 36.0%)
  const cardY = h * 0.580;
  const cardH = h * 0.360;
  const cardW = w * 0.425;
  const frontX = w * 0.065;
  const backX = w * 0.510;

  // Front DL
  ctx.fillStyle = '#F0FDF4';
  ctx.fillRect(frontX, cardY, cardW, cardH);
  ctx.strokeStyle = '#15803D';
  ctx.lineWidth = 3;
  ctx.strokeRect(frontX, cardY, cardW, cardH);

  // Header band
  ctx.fillStyle = '#15803D';
  ctx.fillRect(frontX, cardY, cardW, 36);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('UNION OF INDIA DRIVING LICENCE (WB)', frontX + 12, cardY + 24);

  // Photo
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(frontX + 16, cardY + 48, 90, 115);
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('PHOTO', frontX + 40, cardY + 110);

  // Chip
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(frontX + 120, cardY + 48, 45, 35);
  ctx.strokeStyle = '#D97706';
  ctx.strokeRect(frontX + 120, cardY + 48, 45, 35);

  // Details
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Samit Biswas', frontX + 175, cardY + 65);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('DL: WB-24 20180019284', frontX + 120, cardY + 105);
  ctx.fillText('DOB: 15/08/1994 | BG: B+ve', frontX + 120, cardY + 128);
  ctx.fillText('COV: MCWG, LMV', frontX + 120, cardY + 150);

  // Back DL
  ctx.fillStyle = '#F0FDF4';
  ctx.fillRect(backX, cardY, cardW, cardH);
  ctx.strokeStyle = '#15803D';
  ctx.lineWidth = 3;
  ctx.strokeRect(backX, cardY, cardW, cardH);

  ctx.fillStyle = '#15803D';
  ctx.fillRect(backX, cardY, cardW, 36);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('LICENSING AUTHORITY & DETAILS', backX + 12, cardY + 24);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('Permanent Address:', backX + 18, cardY + 60);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('Vill+PO: Bangaon, North 24 Parganas, WB', backX + 18, cardY + 80);
  ctx.fillText('Issuing Authority: RTO Barasat (WB-24)', backX + 18, cardY + 105);
  ctx.fillText('Valid Upto: 14/08/2038 (NT)', backX + 18, cardY + 130);

  // QR
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(backX + cardW - 105, cardY + 120, 85, 85);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('SARATHI QR', backX + cardW - 95, cardY + 165);
}

function renderSampleStudentId(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Header
  ctx.fillStyle = '#4338CA';
  ctx.fillRect(40, 40, w - 80, 10);
  ctx.fillStyle = '#312E81';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('BANGAON HIGH SCHOOL (H.S.)', 80, 90);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#4B5563';
  ctx.fillText('Recognized Govt. Sponsored Institution / Student Identity Voucher', 80, 118);

  // Form
  ctx.fillStyle = '#EEF2FF';
  ctx.fillRect(60, 150, w - 120, 200);
  ctx.fillStyle = '#1E1B4B';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Annual Academic Student ID Card Cut-Out', 90, 190);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#4338CA';
  ctx.fillText('Student: Samit Biswas | Class: XII (Science) | Roll: 04', 90, 220);
  ctx.fillText('Academic Year: 2026-2027 | Student ID: BHS-2026-849', 90, 245);

  // Scissor
  ctx.strokeStyle = '#A5B4FC';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(40, h * 0.52);
  ctx.lineTo(w - 40, h * 0.52);
  ctx.stroke();
  ctx.setLineDash([]);

  // Card
  const cardY = h * 0.540;
  const cardH = h * 0.400;
  const cardW = w * 0.425;
  const frontX = w * 0.065;
  const backX = w * 0.510;

  // Front
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(frontX, cardY, cardW, cardH);
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 3;
  ctx.strokeRect(frontX, cardY, cardW, cardH);

  ctx.fillStyle = '#4F46E5';
  ctx.fillRect(frontX, cardY, cardW, 44);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('BANGAON HIGH SCHOOL (H.S.)', frontX + 16, cardY + 28);

  // Photo
  ctx.fillStyle = '#E0E7FF';
  ctx.fillRect(frontX + 16, cardY + 58, 95, 120);
  ctx.fillStyle = '#3730A3';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('PHOTO', frontX + 42, cardY + 120);

  // Details
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('Samit Biswas', frontX + 125, cardY + 80);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('Class: XII (Science)', frontX + 125, cardY + 105);
  ctx.fillText('Roll No: 04', frontX + 125, cardY + 128);
  ctx.fillText('ID: BHS-2026-849', frontX + 125, cardY + 150);

  // Back
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(backX, cardY, cardW, cardH);
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 3;
  ctx.strokeRect(backX, cardY, cardW, cardH);

  ctx.fillStyle = '#4F46E5';
  ctx.fillRect(backX, cardY, cardW, 44);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('EMERGENCY & SCHOOL CONTACT', backX + 16, cardY + 28);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('Guardian: Robin Biswas', backX + 18, cardY + 70);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('Phone: 98XXXXXX40', backX + 18, cardY + 95);
  ctx.fillText('Address: Bangaon, North 24 Parganas', backX + 18, cardY + 120);
  ctx.fillText('Principal Signature / Seal', backX + 18, cardY + 180);
}

