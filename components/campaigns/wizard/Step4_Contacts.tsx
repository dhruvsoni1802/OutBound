'use client'

import { useRef, useState } from 'react'
import { Upload, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { parseContactsFromExcel, generateSampleTemplate } from '@/lib/excel/parseContacts'
import type { ContactRow } from '@/lib/validation/campaign'

interface Props {
  contacts: ContactRow[]
  onChange: (contacts: ContactRow[]) => void
}

export function Step4_Contacts({ contacts, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)

  async function handleFile(file: File) {
    setParsing(true)
    try {
      const buffer = await file.arrayBuffer()
      const { contacts: parsed, errors } = parseContactsFromExcel(buffer)

      if (errors.length > 0) {
        const first = errors.slice(0, 3)
        toast.warning(
          `Imported ${parsed.length} contacts with ${errors.length} error${errors.length !== 1 ? 's' : ''}. First issues: ${first.map((e) => `Row ${e.row}: ${e.message}`).join('; ')}`
        )
      } else {
        toast.success(`Imported ${parsed.length} contacts`)
      }

      onChange(parsed)
    } catch {
      toast.error('Failed to parse file. Please use the template format.')
    } finally {
      setParsing(false)
    }
  }

  function downloadTemplate() {
    const blob = generateSampleTemplate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contacts_template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Upload contacts
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload an Excel file (.xlsx) with your contacts. Max 1,000 rows.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
        >
          <Download className="h-4 w-4" />
          Download template
        </button>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background py-10 transition-colors duration-150 hover:border-primary/50 hover:bg-accent/30"
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          {parsing ? 'Parsing…' : 'Click or drag-and-drop your .xlsx file'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Columns: first_name, email (required) · last_name, company, role,
          context (optional)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {contacts.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''} ready
            </p>
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>

          {/* Preview table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['First name', 'Last name', 'Email', 'Company', 'Role'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {contacts.slice(0, 5).map((c, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-accent/30"
                  >
                    <td className="px-3 py-2 text-foreground">{c.firstName}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {c.lastName ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-foreground">{c.email}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {c.company ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {c.role ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {contacts.length > 5 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                …and {contacts.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
