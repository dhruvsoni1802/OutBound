import * as XLSX from 'xlsx'
import { ContactRowSchema, type ContactRow } from '@/lib/validation/campaign'

const HEADER_MAP: Record<string, keyof ContactRow> = {
  'first name': 'firstName',
  'first_name': 'firstName',
  'firstname': 'firstName',
  'last name': 'lastName',
  'last_name': 'lastName',
  'lastname': 'lastName',
  'email': 'email',
  'email address': 'email',
  'company': 'company',
  'organization': 'company',
  'role': 'role',
  'job title': 'role',
  'title': 'role',
  'context': 'context',
  'notes': 'context',
}

export interface ParseResult {
  contacts: ContactRow[]
  errors: { row: number; message: string }[]
}

export function parseContactsFromExcel(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  })

  const contacts: ContactRow[] = []
  const errors: { row: number; message: string }[] = []

  rows.forEach((raw, index) => {
    const normalised: Partial<Record<keyof ContactRow, unknown>> = {}
    for (const [key, value] of Object.entries(raw)) {
      const mapped = HEADER_MAP[key.toLowerCase().trim()]
      if (mapped) normalised[mapped] = value
    }

    const result = ContactRowSchema.safeParse(normalised)
    if (result.success) {
      contacts.push(result.data)
    } else {
      errors.push({
        row: index + 2,
        message: result.error.issues.map((e) => e.message).join(', '),
      })
    }
  })

  return { contacts, errors }
}

export function generateSampleTemplate(): Blob {
  const ws = XLSX.utils.aoa_to_sheet([
    ['first_name', 'last_name', 'email', 'company', 'role', 'context'],
    ['Jane', 'Smith', 'jane@acme.com', 'Acme Corp', 'VP Engineering', ''],
    ['John', 'Doe', 'john@example.com', 'Example Inc', 'CTO', ''],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Contacts')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
