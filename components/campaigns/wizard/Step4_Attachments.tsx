'use client'

import { useRef, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { toast } from 'sonner'
import type { CampaignType } from '@/lib/validation/campaign'

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]
const ACCEPTED_EXTS = '.pdf,.doc,.docx,.png,.jpg,.jpeg'
const MAX_SIZE_MB = 10
const MAX_FILES = 3

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function headingForType(
  type: CampaignType,
  resumeAttached: boolean,
  deckAttached: boolean
): string {
  if (type === 'recruitment_outreach' && resumeAttached) return 'Upload Your Resume'
  if (type === 'investor_outreach' && deckAttached) return 'Upload Your Pitch Deck'
  return 'Upload Attachments'
}

interface Props {
  campaignType: CampaignType
  contextFields: Record<string, unknown>
  files: File[]
  onChange: (files: File[]) => void
  onSkip: () => void
}

export function Step4_Attachments({
  campaignType,
  contextFields,
  files,
  onChange,
  onSkip,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const resumeAttached = contextFields.resume_attached === true
  const deckAttached = contextFields.deck_attached === true
  const hasExpectedAttachment = resumeAttached || deckAttached

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return
    const added: File[] = []
    Array.from(incoming).forEach((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: unsupported file type`)
        return
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name}: exceeds ${MAX_SIZE_MB} MB limit`)
        return
      }
      if (files.length + added.length >= MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed`)
        return
      }
      added.push(file)
    })
    if (added.length) onChange([...files, ...added])
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          {headingForType(campaignType, resumeAttached, deckAttached)}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Files are attached to the initial email only. Max {MAX_SIZE_MB} MB
          each, up to {MAX_FILES} files.
        </p>
      </div>

      {!hasExpectedAttachment ? (
        <div className="rounded-xl border border-border bg-muted/20 px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No attachments are required for this campaign type.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            You can still upload optional attachments below, or skip this step.
          </p>
          <button
            type="button"
            onClick={onSkip}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Skip
          </button>
        </div>
      ) : null}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors duration-150 ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-accent/20'
        }`}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm text-foreground">
            Drag &amp; drop files, or{' '}
            <span className="text-primary underline-offset-2 hover:underline">
              click to browse
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {ACCEPTED_EXTS} — max {MAX_SIZE_MB} MB each
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTS}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
