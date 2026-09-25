/**
 * Name Helper utility for extracting and formatting Cardholder/Candidate names
 * from PDF document metadata, document text streams, and file names,
 * and generating standardized JPEG filenames (_F for Front, _B for Back).
 */

/**
 * Parses candidate name from PDF metadata dictionary and XMP fields
 */
export function parseCandidateNameFromPdfMetadata(
  info?: Record<string, unknown> | null,
  xmpMetadata?: unknown
): string | null {
  if (!info && !xmpMetadata) return null;

  const candidateFields: string[] = [];

  // Check specific metadata fields
  if (info && typeof info === 'object') {
    const directKeys = [
      'CandidateName', 'Candidate_Name', 'Candidate',
      'CardHolderName', 'CardHolder', 'Card_Holder',
      'ApplicantName', 'Applicant',
      'StudentName', 'Student',
      'ElectorName', 'BeneficiaryName',
      'Title', 'Author', 'Subject', 'Keywords'
    ];

    for (const key of directKeys) {
      if (key in info) {
        const val = info[key];
        if (typeof val === 'string' && val.trim().length > 0) {
          candidateFields.push(val.trim());
        }
      }
    }
  }

  // Check XMP Metadata string if available
  if (xmpMetadata) {
    try {
      const xmpStr = typeof xmpMetadata === 'string' 
        ? xmpMetadata 
        : (typeof (xmpMetadata as { getRaw?: () => string }).getRaw === 'function' 
            ? (xmpMetadata as { getRaw: () => string }).getRaw() 
            : JSON.stringify(xmpMetadata));

      // Extract dc:title, dc:creator, dc:description, pdf:Keywords
      const titleMatch = xmpStr.match(/<dc:title[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i) ||
                         xmpStr.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
      if (titleMatch && titleMatch[1]) candidateFields.push(titleMatch[1].trim());

      const creatorMatch = xmpStr.match(/<dc:creator[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i) ||
                           xmpStr.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
      if (creatorMatch && creatorMatch[1]) candidateFields.push(creatorMatch[1].trim());
    } catch {
      // non-blocking
    }
  }

  // Evaluate candidate fields for a valid candidate name
  for (const rawField of candidateFields) {
    // Clean document wrappers e.g. "e-Aadhaar - Rahul Sharma" or "Admit Card of Anita Roy"
    const cleaned = extractNameFromMetadataString(rawField);
    if (cleaned && isValidNameCandidate(cleaned)) {
      return formatNameToTitleOrUpper(cleaned);
    }
  }

  return null;
}

/**
 * Cleans metadata string by removing document type wrappers, labels, and suffixes
 */
export function extractNameFromMetadataString(raw: string): string | null {
  if (!raw || raw.trim().length === 0) return null;

  let str = raw.trim();

  // Remove common document labels and preambles
  const preambles = [
    /^(?:e-?aadhaar|aadhaar|eaadhaar|uidai)[_\-\s:]+/i,
    /^(?:e-?epic|epic|voter\s*id|voter|election\s*commission)[_\-\s:]+/i,
    /^(?:e-?pan|pan\s*card|pan|income\s*tax|nsdl|uti|utitsl)[_\-\s:]+/i,
    /^(?:wb\s*ration|digital\s*ration|ration\s*card|wbpds|khadya\s*sathi)[_\-\s:]+/i,
    /^(?:ayushman|pmjay|ab-?pmjay|abha)[_\-\s:]+/i,
    /^(?:driving\s*licence|driving\s*license|dl|sarathi|parivahan)[_\-\s:]+/i,
    /^(?:admit\s*card|hall\s*ticket|registration\s*certificate|student\s*id|identity\s*card)[_\-\s:]+/i,
    /^(?:candidate\s*name|name\s*of\s*candidate|applicant\s*name|elector(?:'s)?\s*name|card\s*holder\s*name|beneficiary\s*name|student\s*name)\s*[:：\-]\s*/i,
    /^(?:card\s*of|document\s*of|admit\s*for|certificate\s*for)\s+/i,
  ];

  for (const rx of preambles) {
    str = str.replace(rx, '').trim();
  }

  // Remove trailing tags like " - PVC Card", "_front", "_merged", etc.
  str = str.replace(/[_\-\s]+(pvc|card|merged|front|back|copy|print|final|new|scan|download|pdf)$/i, '').trim();

  // If separated by hyphen/dash, take candidate portion if one side is a document descriptor
  if (str.includes(' - ') || str.includes(' – ') || str.includes(' — ')) {
    const parts = str.split(/\s*[-–—]\s*/);
    for (const part of parts) {
      const pClean = part.trim();
      if (isValidNameCandidate(pClean)) {
        return pClean;
      }
    }
  }

  return isValidNameCandidate(str) ? str : null;
}

/**
 * Cleans a filename to derive a readable Cardholder/Candidate name
 */
export function cleanFileNameToCardholderName(fileName: string): string {
  if (!fileName) return 'Candidate';

  // 1. Remove file extension
  let clean = fileName.replace(/\.[^/.]+$/, '').trim();

  // 2. Remove leading serial numbers / index numbering e.g. "01_", "1.", "01 - "
  clean = clean.replace(/^\d+[\s_.-]+/, '');

  // 3. Remove common document prefixes and tags (case-insensitive)
  const prefixRegex = /^(eaadhaar|e-aadhaar|aadhaar|uidai|eepic|e-epic|epic|voter|pan|e-pan|epan|nsdl|uti|utitsl|ration|wb_ration|wbpds|ayushman|pmjay|dl|driving_licence|driving_license|sarathi|student_id|employee_id|sample|scan|scanned|doc|document|pdf|img|image|card|admit|hallticket|certificate)[_\-\s]+/i;
  
  while (prefixRegex.test(clean)) {
    clean = clean.replace(prefixRegex, '');
  }

  // 4. Remove trailing document suffixes (e.g. "_merged", "_pvc", "_front", "_back", "_card", "_crop", etc.)
  clean = clean.replace(/[_\-\s]+(merged|pvc|front|back|dual|single|card|crop|doc|pdf|copy|print|final|new|scan)$/i, '');

  // 5. Remove leading/trailing timestamps or long numeric strings (e.g., phone numbers, ID numbers, random hashes)
  clean = clean.replace(/^[0-9]{8,}[_\-\s]*/, '');
  clean = clean.replace(/[_\-\s]*[0-9]{8,}$/, '');

  // 6. Replace separators (underscores, dashes, dots, multiple spaces) with single space
  clean = clean.replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();

  // 7. If result is empty or just numbers/symbols, return fallback
  if (!clean || /^[\d\W_]+$/.test(clean)) {
    const rawBase = fileName.replace(/\.[^/.]+$/, '').trim();
    return rawBase ? sanitizeCardholderName(rawBase) : 'Candidate';
  }

  return sanitizeCardholderName(formatNameToTitleOrUpper(clean));
}

/**
 * Sanitizes a cardholder name string so it is safe for filesystem saving
 */
export function sanitizeCardholderName(name: string): string {
  if (!name || !name.trim()) return 'Candidate';

  // Replace invalid filename characters (/ \ : * ? " < > |) with underscore
  let safe = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  // Collapse multiple spaces/underscores
  safe = safe.replace(/\s+/g, ' ').replace(/_+/g, '_');
  
  return safe || 'Candidate';
}

/**
 * Formats standard JPEG filename strictly as [Serial]_[Side].jpg
 * Example: "01_F.jpg", "01_B.jpg", "02_F.jpg", "02_B.jpg"
 */
export function formatCardJpegFileName(
  cardHolderNameOrSerial: string | number = 1,
  side: 'F' | 'B' | 'f' | 'b' = 'F',
  serialNumber?: number | string
): string {
  // Determine the serial number
  let serial: number | string = 1;
  if (serialNumber !== undefined && serialNumber !== null && String(serialNumber).trim() !== '') {
    serial = serialNumber;
  } else if (typeof cardHolderNameOrSerial === 'number') {
    serial = cardHolderNameOrSerial;
  } else if (typeof cardHolderNameOrSerial === 'string' && /^\d+$/.test(cardHolderNameOrSerial.trim())) {
    serial = cardHolderNameOrSerial.trim();
  }

  // Format serial number with 2-digit minimum padding (e.g. 01, 02, 10)
  let serialStr = '01';
  if (typeof serial === 'number') {
    serialStr = serial < 10 ? `0${serial}` : String(serial);
  } else {
    const parsed = parseInt(String(serial), 10);
    if (!isNaN(parsed)) {
      serialStr = parsed < 10 ? `0${parsed}` : String(parsed);
    } else {
      serialStr = String(serial).trim() || '01';
    }
  }

  const sideUpper = (side || 'F').toUpperCase();
  return `${serialStr}_${sideUpper}.jpg`;
}

/**
 * Formats candidate name into Title Case or clean Uppercase
 */
export function formatNameToTitleOrUpper(name: string): string {
  if (!name) return 'Candidate';
  const trimmed = name.trim();
  
  // If already mixed case (e.g. "Rahul Sharma"), preserve it
  const isAllUpper = trimmed === trimmed.toUpperCase();
  const isAllLower = trimmed === trimmed.toLowerCase();

  if (isAllUpper || isAllLower) {
    return trimmed
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  return trimmed;
}

/**
 * Heuristically parses candidate name extracted from government ID PDFs & documents
 * (Aadhaar, Voter ID, PAN, Ration, Ayushman, DL, University Admit Cards, etc.)
 */
export function parseCardholderNameFromText(fullText: string): string | null {
  if (!fullText || typeof fullText !== 'string' || fullText.trim().length === 0) return null;

  const normalized = fullText.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n').map((l) => (l || '').trim()).filter((l) => l && l.length > 0);

  // 1. UIDAI / Aadhaar Card pattern: "To <Name>" or before Father's Name / DOB / Address
  const toIndex = lines.findIndex((l) => /^To\b/i.test(l));
  if (toIndex !== -1 && toIndex + 1 < lines.length) {
    const candidate = lines[toIndex + 1].trim();
    if (isValidNameCandidate(candidate)) {
      return formatNameToTitleOrUpper(candidate);
    }
  }

  // 2. Explicit Multilingual & English Name Patterns
  const namePatterns = [
    /(?:Name of Candidate|Candidate(?:'s)? Name|Candidate Name)\s*[:：\-]?\s*([A-Za-z\s.]+)/i,
    /(?:Name of Elector|Elector(?:'s)? Name|Elector Name)\s*[:：\-]?\s*([A-Za-z\s.]+)/i,
    /(?:Card\s*holder Name|Cardholder Name|Beneficiary Name|Applicant Name|Student Name)\s*[:：\-]?\s*([A-Za-z\s.]+)/i,
    /(?:Name\s*\/\s*নাম|Name\s*\/\s*नाम|নাম\s*\/\s*Name|नाम\s*\/\s*Name)\s*[:：\-]?\s*([A-Za-z\s.]+)/i,
    /(?:নাম|नाम)\s*[:：\-]?\s*([A-Za-z\s.]+)/i,
    /(?:^|\n)\s*Name\s*[:：\-]\s*([A-Za-z\s.]+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (isValidNameCandidate(candidate)) {
        return formatNameToTitleOrUpper(candidate);
      }
    }
  }

  // 3. Look for lines right above "DOB:", "Date of Birth:", "Father's Name:", "S/O", "W/O", "D/O", "C/O"
  for (let i = 0; i < lines.length; i++) {
    if (/^(DOB|Date of Birth|Father's Name|Father Name|Husband's Name|S\/O|W\/O|D\/O|C\/O|Year of Birth|Gender|Male|Female)/i.test(lines[i])) {
      if (i > 0) {
        const candidate = lines[i - 1].trim();
        if (isValidNameCandidate(candidate)) {
          return formatNameToTitleOrUpper(candidate);
        }
      }
    }
  }

  // 4. Look for lines right below "INCOME TAX DEPARTMENT" or "GOVERNMENT OF INDIA" on PAN / National IDs
  for (let i = 0; i < lines.length; i++) {
    if (/^(INCOME TAX DEPARTMENT|GOVT OF INDIA|GOVERNMENT OF INDIA|ELECTION COMMISSION OF INDIA)/i.test(lines[i])) {
      for (let j = i + 1; j <= Math.min(i + 4, lines.length - 1); j++) {
        const candidate = lines[j].trim();
        if (isValidNameCandidate(candidate)) {
          return formatNameToTitleOrUpper(candidate);
        }
      }
    }
  }

  return null;
}

/**
 * Validates whether a candidate string looks like a legitimate person's name
 */
export function isValidNameCandidate(str: string): boolean {
  if (!str || typeof str !== 'string' || str.length < 3 || str.length > 50) return false;

  // Should not contain typical non-name keywords or system strings
  const blockedKeywords = [
    'government', 'india', 'uidai', 'unique', 'authority', 'income tax', 'election',
    'commission', 'department', 'download', 'enrolment', 'helpdesk', 'signature',
    'valid', 'digitally', 'electronic', 'republic', 'date', 'birth', 'address',
    'female', 'male', 'transgender', 'ration', 'khadya', 'sathi', 'department',
    'permanent', 'account', 'number', 'elector', 'photo', 'identity', 'card',
    'roll', 'registration', 'examination', 'centre', 'center', 'controller',
    'director', 'officer', 'signature', 'official', 'format', 'standard',
    'pvc', 'print', 'utility', 'sayonika', 'xerox', 'sample', 'template'
  ];

  const lower = str.toLowerCase();
  for (const word of blockedKeywords) {
    if (lower.includes(word)) return false;
  }

  // Check if string contains at least one letter and no invalid filename characters
  return /^[A-Za-z\s.]{3,50}$/.test(str) && /[A-Za-z]/.test(str);
}

/**
 * Automatically extracts candidate PDF passwords from the filename in CAPITAL LETTERS (UPPERCASE).
 * Handles Indian Govt Document patterns (e-Aadhaar, e-PAN, Voter, Admit Cards, CSC files):
 * - 4 letters of name + 4 digit birth year (e.g. "rahul_1994.pdf" -> "RAHU1994")
 * - Explicit password token e.g. "pwd_SAMI1994", "[SAMI1994]", "(SAMI1994)", "pass_ANIT1998"
 * - 8-character token (4 letters + 4 digits) -> "SAMI1994"
 * - 8-digit DOB (DDMMYYYY) -> e.g. "01011990"
 */
export function extractPasswordCandidateFromFileName(fileName: string): string | null {
  const candidates = extractAllPasswordCandidatesFromFileName(fileName);
  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Extracts all possible password candidate permutations in CAPITAL LETTERS from filename
 */
export function extractAllPasswordCandidatesFromFileName(fileName: string): string[] {
  if (!fileName || typeof fileName !== 'string') return [];

  const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
  const candidates: string[] = [];

  const addCandidate = (pwd: string) => {
    if (!pwd) return;
    const cleanUpper = pwd.trim().toUpperCase();
    if (cleanUpper.length >= 4 && cleanUpper.length <= 25 && !candidates.includes(cleanUpper)) {
      candidates.push(cleanUpper);
    }
  };

  // 1. Explicit Password pattern: pwd_..., pass_..., password_..., code_..., pin_...
  const explicitRx = /(?:pwd|pass|password|pin|code)[_\-\s:=]+([A-Za-z0-9@#$*!]{4,20})/gi;
  let match: RegExpExecArray | null;
  while ((match = explicitRx.exec(baseName)) !== null) {
    if (match[1]) addCandidate(match[1]);
  }

  // 2. Bracketed or Parenthesized token: [SAMI1994], (SAMI1994), {SAMI1994}
  const bracketRx = /[[({]([A-Za-z0-9@#$*!]{4,16})[\])}]/g;
  while ((match = bracketRx.exec(baseName)) !== null) {
    if (match[1]) addCandidate(match[1]);
  }

  // 3. Exact 8-character Indian Aadhaar pattern anywhere in filename: 4 letters + 4 digits
  // e.g. SAMI1994, RAHU1990, anit1998, bisw1985
  const aadhaarDirectRx = /\b([A-Za-z]{4}\d{4})\b/g;
  while ((match = aadhaarDirectRx.exec(baseName)) !== null) {
    if (match[1]) addCandidate(match[1]);
  }

  // 4. Person Name + 4-digit Year (1920-2026) in filename
  // e.g. "Rahul_Sharma_1994.pdf", "Amit_2001.pdf", "eAadhaar_Samiul_1994.pdf", "Pooja_1998_pvc.pdf"
  const yearMatch = baseName.match(/\b(19\d{2}|20[0-2]\d)\b/);
  if (yearMatch) {
    const yearStr = yearMatch[1];
    
    // Remove doc prefixes and digits to extract first name
    let namePart = baseName
      .replace(/\b(19\d{2}|20[0-2]\d)\b/g, '')
      .replace(/^(?:eaadhaar|e-aadhaar|aadhaar|uidai|epan|pan|eepic|voter|ration|wb_ration|doc|pdf|sample|scan|scanned|new|print|pvc)[_\-\s:]+/gi, '')
      .replace(/[_\-\s]+(?:pvc|card|merged|front|back|copy|print|final|new|scan|pdf)$/gi, '')
      .replace(/[^A-Za-z\s]/g, ' ')
      .trim();

    const nameTokens = namePart ? namePart.split(/\s+/).filter((w) => w && typeof w === 'string' && w.length >= 2) : [];
    if (nameTokens.length > 0) {
      const firstName = nameTokens[0];
      if (firstName.length >= 4) {
        // Aadhaar rule: First 4 characters of name in CAPITAL + 4 digit Year of Birth
        addCandidate(firstName.substring(0, 4) + yearStr);
      } else if (firstName.length === 3 && nameTokens.length > 1) {
        // If first name is 3 letters (e.g. "RAJ"), try adding first letter of last name
        addCandidate(firstName + nameTokens[1].charAt(0) + yearStr);
      }
    }
  }

  // 5. 8-digit Date of Birth format (DDMMYYYY)
  // e.g. "01011990", "15081995", "25121988"
  const dobRx = /\b(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(19\d{2}|20[0-2]\d)\b/g;
  while ((match = dobRx.exec(baseName)) !== null) {
    if (match[0]) addCandidate(match[0]);
  }

  // 6. 6-digit PIN/DOB or alphanumeric token at the end of filename
  const trailingTokenRx = /[_\-\s]+([A-Za-z0-9]{4,10})$/;
  const trailingMatch = baseName.match(trailingTokenRx);
  if (trailingMatch && trailingMatch[1]) {
    const token = trailingMatch[1];
    if (!/^(pdf|pvc|card|scan|print|doc|merged|front|back)$/i.test(token)) {
      addCandidate(token);
    }
  }

  return candidates;
}

